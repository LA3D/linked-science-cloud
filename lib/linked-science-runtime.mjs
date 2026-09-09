import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { getHeapStatistics, setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { QueryEngine } from '@comunica/query-sparql';
import { DataFactory, Parser as RdfParser, Store } from 'n3';
import { translate as translateSparql } from 'sparqlalgebrajs';
import { Generator as SparqlGenerator, Parser as SparqlParser } from 'sparqljs';
import {
  assertSymbolicValue,
  compactOrientationMap,
  deleteOrientation,
  createOrientationMap,
  recordOrientation,
  recoverOrientationMap,
} from './orientation-map.mjs';
import { createTableDisplay, initializeLinkedDataSession } from './repl-linked-data-session.mjs';
import { LINKED_SCIENCE_PROJECT_IDENTITY } from './linked-science-project-identity.mjs';

const RUNTIME_VERSION = '6.4.0';
const FACADE_BRAND = Symbol('linked-science-facade');
const HANDLE_BRAND = Symbol('linked-science-handle');
const SETUPS = new WeakMap();
const GRAPH_KINDS = new Set([ 'ontology', 'schema', 'shacl', 'instance-data', 'inferred-graph' ]);
const RESULT_KINDS = new Set([ 'bindings', 'boolean', 'quads', 'rows' ]);
const EVIDENCE_KINDS = new Set([ 'evidence' ]);
const RESOURCE_KINDS = new Set([ 'resource' ]);
const QUERY_TYPES = new Set([ 'SELECT', 'ASK', 'CONSTRUCT', 'DESCRIBE' ]);
const GRAPH_NAME_PATTERN = '^[a-z][a-z0-9-]{1,63}$';
const RDF_PARSE_FORMATS = Object.freeze([ 'text/turtle', 'N-Triples', 'N-Quads', 'TriG' ]);
const ATTEMPT_HISTORY_LIMIT = 100;
const DESCRIBE_POLICY = Object.freeze({
  id: 'outgoing-subject-triples',
  version: '1.0.0',
  graphScope: 'active-default-graph',
  wildcard: 'all-in-scope-query-variables',
});
// Resident-graph accounting. A retained graph costs the copied RDF/JS quad
// array plus the N3 store index; measured at roughly 2.2 KiB per quad for
// IRI-heavy synthetic data on Node 26, rounded up for longer terms.
const RESIDENT_QUAD_BYTES_ESTIMATE = 2_560;
// Parsing RDF text materializes term objects well beyond the byte length of
// the text itself; the factor is a coarse admission estimate, not a bound.
const TEXT_PARSE_EXPANSION = 24;
const HEAP_BASELINE_RESERVE_BYTES = 96 * 1024 * 1024;
const HEAP_RESIDENCY_FRACTION = 0.6;
const HEAP_HEADROOM_SAFETY = 1.5;
const RESULT_SPOOL_VERSION = '1.1.0';

const HEAP = (() => {
  let collector;
  try {
    setFlagsFromString('--expose-gc');
    collector = runInNewContext('gc');
  } catch {
    collector = undefined;
  }
  return Object.freeze({
    statistics() {
      try {
        const stats = getHeapStatistics();
        return { limitBytes: stats.heap_size_limit, usedBytes: stats.used_heap_size };
      } catch {
        return undefined;
      }
    },
    collect() {
      try { collector?.(); } catch { /* garbage collection is best effort */ }
    },
  });
})();

function heapResidency() {
  const stats = HEAP.statistics();
  if (!stats) return undefined;
  const availableBytes = Math.max(0, stats.limitBytes - HEAP_BASELINE_RESERVE_BYTES);
  return Object.freeze({
    heapLimitBytes: stats.limitBytes,
    reserveBytes: HEAP_BASELINE_RESERVE_BYTES,
    residencyFraction: HEAP_RESIDENCY_FRACTION,
    estimatedBytesPerQuad: RESIDENT_QUAD_BYTES_ESTIMATE,
    derivedMaxQuads: Math.floor((availableBytes * HEAP_RESIDENCY_FRACTION) / RESIDENT_QUAD_BYTES_ESTIMATE),
  });
}

function applyHeapResidency(budgets) {
  const heap = heapResidency();
  const configured = { maxResidentGraphQuads: budgets.maxResidentGraphQuads, maxWorkspaceGraphQuads: budgets.maxWorkspaceGraphQuads };
  if (!heap) {
    return { budgets, basis: Object.freeze({ kind: 'linked-science-residency-basis', source: 'configured', capped: false, configured, heap: null }) };
  }
  const ceiling = Math.max(1, heap.derivedMaxQuads);
  const capped = configured.maxResidentGraphQuads > ceiling || configured.maxWorkspaceGraphQuads > ceiling;
  const effective = Object.freeze({
    ...budgets,
    maxResidentGraphQuads: Math.min(configured.maxResidentGraphQuads, ceiling),
    maxWorkspaceGraphQuads: Math.min(configured.maxWorkspaceGraphQuads, ceiling),
  });
  return {
    budgets: effective,
    basis: Object.freeze({
      kind: 'linked-science-residency-basis',
      source: capped ? 'heap-derived' : 'configured',
      capped,
      configured,
      heap,
      note: 'Resident-graph quotas use a heap-derived estimate and live headroom checks; query operators, long terms and arbitrary JavaScript may still exhaust the kernel.',
    }),
  };
}

function ensureHeapHeadroom(estimatedBytes, { stage, operation }) {
  if (!Number.isFinite(estimatedBytes) || estimatedBytes <= 0) return;
  const required = Math.ceil(estimatedBytes * HEAP_HEADROOM_SAFETY);
  let stats = HEAP.statistics();
  if (!stats) return;
  if (stats.limitBytes - stats.usedBytes >= required) return;
  HEAP.collect();
  stats = HEAP.statistics();
  if (!stats || stats.limitBytes - stats.usedBytes >= required) return;
  const freeBytes = Math.max(0, stats.limitBytes - stats.usedBytes);
  const repair = {
    kind: 'linked-science-residency-repair',
    scope: 'kernel-heap',
    allowed: true,
    sameCall: false,
    estimatedBytes,
    requiredBytes: required,
    freeBytes,
    heapLimitBytes: stats.limitBytes,
    preservesOriginalAnswer: false,
    action: 'Query the resident graph symbolically instead of copying it, release or reset unneeded epoch state, or run under a larger kernel heap; no partial state was created.',
  };
  throw runtimeError('LS_KERNEL_HEAP_BOUND', stage, `Insufficient kernel heap headroom for ${operation}: estimated ${estimatedBytes} bytes, free ${freeBytes} bytes`, {
    receipt: { status: 'failed', stage, code: 'LS_KERNEL_HEAP_BOUND', repair },
    recoveryDocument: 'budgets',
    retryable: true,
    repair,
  });
}

const DEFAULT_BUDGETS = Object.freeze({
  maxResidentGraphQuads: 250_000,
  maxWorkspaceGraphQuads: 500_000,
  maxResidentResourceBytes: 4_000_000,
  maxResultItems: 500,
  maxRows: 10,
  maxCells: 100,
  maxNodes: 50,
  maxEdges: 50,
  maxBytes: 32_768,
  maxSchemaResults: 20,
  maxQueryChars: 16_384,
});

const METHOD_DOCS = Object.freeze({
  bootstrap: {
    summary: 'The project broker initializes linkedScience/ls automatically. Use this explicit bootstrap for diagnostics or older brokers.',
    usage: "var { bootstrapLinkedScience } = await import('file:///Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl/lib/cleanroom-linked-science-bootstrap.mjs'); await bootstrapLinkedScience({ host: globalThis, cleanroom: nodeRepl, projectRoot: '/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl', moduleRoot: '/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl/node_modules' })",
    next: [ 'linkedScience.documentation()', "linkedScience.open({ contextKey: 'goal-key' })" ],
  },
  discovery: {
    summary: 'Start from generated documentation, capabilities, examples, and exact conditional lookup.',
    usage: "linkedScience.documentation.get('schema.search')",
    related: [ 'capabilities', 'examples', 'recovery' ],
  },
  'graphs.load': {
    summary: 'Retain local RDF/JS quads or local RDF text as a typed graph handle.',
    signature: 'await workspace.graphs.load({ name, kind, quads?, text?, format?, source? }) -> handle',
    kinds: [ ...GRAPH_KINDS ],
    constraints: [ 'local/synthetic input only', `name matches ${GRAPH_NAME_PATTERN}`, 'RDF/JS source order and duplicates retained for provenance', 'a private indexed DatasetCore is created once for repeated symbolic queries', 'resident quads and source bytes use operational residency quotas, not projection bounds', 'resident-graph quotas are derived from the kernel heap and a live headroom check refuses a retention that would exhaust it' ],
  },
  'schema.search': {
    summary: 'Search one ontology, schema, or SHACL graph without exposing the full graph.',
    signature: 'workspace.schema.search(handle, { text, limit?, maxBytes? }) -> bounded observation',
    constraints: [ 'limit <= capability maxSchemaResults', 'orientation only; not the ontology itself' ],
  },
  'query.select': {
    summary: 'Run local-only SELECT through Communica over typed graph handles and retain complete RDF/JS bindings.',
    signature: 'await workspace.query.select({ sparql, sources, role? }) -> result handle',
    constraints: [ 'sources accept graph handles and quad-result handles', 'broker-stored quad results are indexed sources for later local queries', 'SPARQL LIMIT is optional caller semantics and is never imposed by the harness', 'large solution sequences spill to broker storage with bag semantics; successful handles are complete', 'storage exhaustion fails without a partial handle', 'SERVICE rejected', 'no network sources' ],
  },
  'query.run': {
    summary: 'Run complete-or-fail local SELECT, ASK, CONSTRUCT, or DESCRIBE through Communica; the clean-room broker spools large bindings and graph results out of core.',
    signature: 'await workspace.query.run({ sparql, sources, role? }) -> result handle',
    resultTypes: { SELECT: 'bindings', ASK: 'boolean', CONSTRUCT: 'quads', DESCRIBE: 'quads' },
    constraints: [ 'SPARQL solution modifiers remain query semantics', 'DESCRIBE uses the declared outgoing-subject-triples policy', 'model-visible projection bounds do not change resident results', 'broker-backed SELECT/CONSTRUCT/DESCRIBE results are bounded by storage bytes rather than result-item or prompt limits', 'multiple sources are queried as an RDF merge over lazy indexed sources; no per-query merged copy is built' ],
  },
  'traversal.query': {
    summary: 'Run one explicit complete-or-fail read through consumer-owned Communica and retain the native RDF/JS result.',
    signature: 'await workspace.traversal.query({ sparql, sources, evidence?, negotiation?, role?, budgets? }) -> handle',
    sourceShapes: [ '"https://example.org/data.ttl"', "{ value: 'https://example.org/data.ttl', negotiation? }", "{ type: 'sparql', value: 'https://example.org/sparql' }" ],
    constraints: [ 'each call is one visible agent attempt with its own effective mediator budgets and final receipt', 'evidence is an optional array of resident evidence/graph/result handles recorded as lineage', 'read-only SELECT/ASK/CONSTRUCT/DESCRIBE', 'successful handles are complete; operational exhaustion fails without a partial handle', 'DESCRIBE uses the declared outgoing-subject-triples policy', 'credential-free HTTP/HTTPS sources', 'bounded identity-free content negotiation', 'no raw Fetch/Response authority', 'no hidden transport retries' ],
  },
  'resources.get': {
    summary: 'Retrieve one bounded public HTTP resource through the private broker and retain a response-like resource object.',
    signature: "await workspace.resources.get(url, { method?: 'GET'|'HEAD', headers?, budgets?, role? }) -> ResourceResponse",
    constraints: [ 'anonymous GET or HEAD only in this slice', 'HTTP/HTTPS without URL credentials', 'resource body remains resident behind its handle', 'automatic exchange and aggregate provenance', 'no ambient Fetch, Request, or Response' ],
  },
  'resources.inspect': {
    summary: 'Inspect a retained resource through a bounded representation-aware projection.',
    signature: "workspace.resources.inspect(resourceOrHandle, { as?: 'metadata'|'text'|'json'|'csv'|'xml'|'binary', maxBytes? }) -> bounded observation",
    constraints: [ 'metadata and previews are prompt-bounded', 'JSON/text/XML/CSV/binary are first-class representations', 'use resource.json(), resource.text(), or resource.arrayBuffer() for in-kernel composition' ],
  },
  'resources.parseRdf': {
    summary: 'Parse a retained RDF representation into a native RDF/JS graph handle without a CONSTRUCT wrapper.',
    signature: 'await workspace.resources.parseRdf(resourceOrHandle, { name, kind?, format?, role? }) -> graph handle; ResourceResponse.rdf(options) is the equivalent response-object method',
    constraints: [ `name matches ${GRAPH_NAME_PATTERN}`, 'only resource bytes already acquired through the broker are parsed', `format is one of ${RDF_PARSE_FORMATS.join(', ')} and may be inferred from media type`, 'the graph is indexed once and reused by local query operations without reacquisition', 'provenance retains the source resource handle' ],
  },
  'rdf.dataset': {
    summary: 'Compatibility alias for rdf.clone: copy a resident graph into a mutable N3 dataset. Prefer rdf.source for streaming read access.',
    signature: 'workspace.rdf.dataset(graphOrQuadResultHandle) -> DatasetCore',
  },
  'rdf.source': {
    summary: 'Return an immutable RDF/JS Source view over a resident graph or stored quad result without cloning the dataset.',
    signature: 'workspace.rdf.source(graphOrQuadResultHandle) -> Source { match, countQuads }',
    constraints: [ 'native RDF/JS quads stream inside the REPL', 'stored patterns and counts use the broker indexes', 'new reads fail after release or workspace disposal', 'no mutable store or transport authority is exposed' ],
  },
  'rdf.clone': {
    summary: 'Explicitly copy a kernel-resident graph into a mutable N3 DatasetCore.',
    signature: 'workspace.rdf.clone(graphOrQuadResultHandle) -> DatasetCore',
    constraints: [ 'copying is subject to heap headroom', 'stored results require rdf.source or a symbolic subquery' ],
  },
  'rdf.retain': {
    summary: 'Retain an RDF/JS DatasetCore or quad array for native reads and local Communica queries, using resident storage by default or explicit broker storage.',
    signature: "await workspace.rdf.retain({ name, dataset?, quads?, kind?, role?, storage?: 'resident' | 'broker' }) -> graph handle (resident) or quads result handle (broker)",
    defaults: { storage: 'resident' },
    constraints: [ `name matches ${GRAPH_NAME_PATTERN}`, 'resident storage copies native RDF/JS terms and creates a private indexed DatasetCore', 'explicit broker storage requires result storage and commits even empty input as a quads result handle; no resident fallback', 'broker storage preserves subject, predicate, object and graph with RDF set semantics; the source fingerprint preserves input order and duplicates', 'broker handles support rdf.source, local queries and results.page, but not rdf.clone or graph-kind-only operations; requested kind is recorded in provenance', 'local JavaScript derivation is recorded automatically; release and disposal reclaim broker storage' ],
  },
  'evidence.load': {
    summary: 'Retain one bounded declarative evidence object as an opaque workspace handle for later inspection or query lineage.',
    signature: 'await workspace.evidence.load({ name, document, source? }) -> handle',
    defaults: { embeddedEvidenceSource: "Omit source to use { kind: 'declarative-resource-manifest', id: name }" },
    sourceShapes: [ "'<local provenance label>'", "{ kind: 'declarative-resource-manifest' | 'local-documentation', id: '<non-empty string>' }" ],
    constraints: [ 'validation failures expose structured repair metadata', 'loading is local and consumes no live request budget', 'resource-specific facts remain data in the handle' ],
  },
  'traversal.history': {
    summary: 'Inspect bounded receipts for explicit mediated attempts made by this persistent workspace.',
    signature: 'workspace.traversal.history({ limit? }) -> { attempts, truncated }',
    constraints: [ 'query hashes, sources, evidence handles, status, timing, budgets, usage, and failure codes only', 'no raw query text or response payloads' ],
  },
  'results.derive': {
    summary: 'Run one model-written JavaScript callback over a kernel-resident result and retain its bounded typed output; broker-stored quad results require bounded pages or a later SPARQL query.',
    signature: "await workspace.results.derive(handle, callback, { role? }) -> result handle",
    callbackResult: [ "{ kind: 'bindings', rows }", "{ kind: 'quads', quads }", "{ kind: 'boolean', value }", "{ kind: 'rows', rows }" ],
  },
  'results.profile': {
    summary: 'Inspect handle type, count, completion, lineage, fingerprints, and operation provenance without bulk values.',
    signature: 'workspace.results.profile(handle) -> bounded metadata',
  },
  'results.page': {
    summary: 'Project a bounded page by rows, cells, and bytes while retaining provenance.',
    signature: 'await workspace.results.page(handle, { offset?, limit?, columns?, maxCells?, maxBytes? })',
    constraints: [ 'projection bounds are independent of resident graph/result size', 'invalid bounds expose structured zero-request repair', 'await the call: broker-stored bindings and quad results page asynchronously' ],
  },
  'results.table': {
    summary: 'Return a bounded table display model from a retained bindings/rows handle.',
    signature: 'await workspace.results.table(handle, { title?, offset?, limit?, columns?, maxCells?, maxBytes? })',
  },
  'results.iterate': {
    summary: 'Iterate complete resident or broker-stored SELECT bindings as individual native RDF/JS Maps, independently of display paging.',
    signature: 'workspace.results.iterate(handle, { batchSize? } = {}) -> AsyncIterable<Map<string, RDF.Term>>',
    constraints: [ 'bindings handles only; Map keys are variable names without ?', 'unbound variables are absent; RDF terms, duplicate rows and sequence are preserved', 'batchSize is a positive safe integer (default 128); broker reads are capped by batchSize and maxPageItems', 'no display limits or whole-result clone; lifetime is checked between rows and before/after asynchronous reads', 'invalid options throw LS_ITERATION_OPTIONS; invalid batchSize throws LS_ITERATION_BATCH_SIZE; wrong kinds throw LS_HANDLE_KIND' ],
  },
  'graph.neighbors': {
    summary: 'Inspect a bounded RDF neighborhood by nodes, edges, and bytes.',
    signature: "workspace.graph.neighbors(handle, { term, direction?, maxNodes?, maxEdges?, maxBytes? })",
  },
  orientation: {
    summary: 'Inspect reusable source context; query-result inventory stays in the workspace registry. Pass orientationContext: { id, version } to open for recurring-context reuse.',
    methods: [ 'await workspace.orientation.bootstrap({ maxBytes? })', 'await current()', 'await update({ edits })', 'await commit()', 'await status()' ],
    constraints: [ 'experimental automatic source bookkeeping and agent-proposed native quad evidence', 'bootstrap returns a bounded tool-result view; open remains synchronous and does not inject prompts', 'update accepts at most four edits and eight native quads per entry; reference validation is not semantic truth', 'empty/unavailable/rejected orientation does not block ordinary scientific work' ],
  },
  reset: {
    summary: 'Dispose one workspace, reclaim its broker storage and advance its epoch while retaining source orientation.',
    usage: "await linkedScience.reset({ contextKey: 'goal-key' })",
    recovery: [ 'open the context again', 'inspect orientation.status()', 'rematerialize only from an authorized source', 'never reuse old handles' ],
  },
  inventory: {
    summary: 'List a bounded page of currently retained handles and graph accounting without querying the orientation map.',
    signature: 'workspace.inventory({ limit?, maxBytes? }) -> bounded inventory',
  },
  release: {
    summary: 'Invalidate one handle immediately and reclaim its registry ownership and any broker storage.',
    signature: 'await workspace.release(handleOrResourceResponse) -> release receipt',
    constraints: [ 'dependent results keep compact provenance but do not keep their source alive', 'released handles and their Source views cannot start new reads', 'already copied JavaScript values are caller-owned' ],
  },
  dispose: {
    summary: 'Invalidate a workspace immediately, reclaim its storage including allocations in flight, and allow open to create a fresh workspace.',
    signature: 'await workspace.dispose() -> disposal receipt',
    constraints: [ 'idempotent after successful cleanup', 'late asynchronous work cannot publish a result', 'await cleanup before relying on reclaimed storage', 'orientation survives as advisory source context' ],
  },
  recovery: {
    summary: 'Errors expose code, stage, receipt, recoveryDocument, retryable, and structured repair fields. Correct malformed local calls in place; reset only for actual runtime invalidation.',
    staleHandle: [ "linkedScience.documentation.get('reset')", 're-open the context', 'use orientation.status()', 'rematerialize explicitly if allowed' ],
    localValidation: [ 'inspect error.repair.field and error.repair.expected', 'correct the call in the same workspace', 'local validation consumes no live request budget' ],
  },
  security: {
    summary: 'The facade is local-only unless the parent injects the traversal mediator; JavaScript remains a compatibility boundary, not a security sandbox.',
    brokerRule: 'The child has no raw transport. Public resource reads and consumer-owned Communica calls use the same private token-bound mediator sessions with behavior and aggregate resource controls.',
    effects: { 'anonymous-public-read': 'enabled when broker-mediated traversal is present', 'authenticated-read': 'disabled in this slice', mutation: 'disabled in this slice; denied before transport' },
  },
  budgets: {
    summary: 'Keep execution, residency, and model-visible projection budgets separate.',
    planes: {
      execution: [ 'query characters', 'mediated requests, response bytes, time, fan-out, and concurrency' ],
      residency: [ 'resource body bytes', 'per-graph quads', 'workspace graph quads', 'kernel heap headroom', 'kernel-resident result items', 'broker-stored bindings and quad-result bytes' ],
      projection: [ 'rows', 'cells', 'nodes', 'edges', 'schema hits', 'preview bytes' ],
    },
    guidance: [ 'large RDF remains symbolic behind a graph handle', 'resident-graph quotas are derived from the kernel heap; read budgetPlanes.residency.basis', 'query LIMIT is never a residency or projection control', 'a successful query handle is complete and an operational ceiling is a failed attempt', 'HEAD and Content-Length are advisory only', 'use direct remote subgraph queries for one-off slices', 'acquire and index once for repeated local queries', 'a stored result is an indexed source: query it rather than copying it back into the kernel' ],
  },
  compatibility: {
    summary: 'Legacy local retained-session and table helpers remain reachable under linkedScience.compatibility.',
    warning: 'Raw guarded transport helpers are intentionally not exposed on the clean-room facade; import-based compatibility remains repository code, not broker enforcement.',
  },
});

const DOCUMENT_ALIASES = Object.freeze({
  ontology: 'schema.search',
  neighbors: 'graph.neighbors',
  page: 'results.page',
  table: 'results.table',
  'stale-handle': 'reset',
});

export const LINKED_SCIENCE_API_SCHEMA = Object.freeze({
  schemaVersion: 1,
  runtime: 'linked-science',
  version: RUNTIME_VERSION,
  globalBindings: [ 'linkedScience', 'ls' ],
  bootstrap: METHOD_DOCS.bootstrap.usage,
  bootstrapEnvironment: {
    mcp: 'cleanroom_node_repl',
    project: {
      id: LINKED_SCIENCE_PROJECT_IDENTITY.packageName,
      role: LINKED_SCIENCE_PROJECT_IDENTITY.repositoryRole,
      bootstrapEntrypoint: LINKED_SCIENCE_PROJECT_IDENTITY.bootstrapEntrypoint,
    },
    broker: LINKED_SCIENCE_PROJECT_IDENTITY.broker,
    projectRoot: '/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl',
    moduleRoot: '/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl/node_modules',
    rlmContext: 'linked-science:runtime',
    orientationOwner: 'cleanroom-broker',
    resultStorage: {
      owner: 'cleanroom-broker',
      lifetime: 'kernel-epoch',
      resultKinds: [ 'quads', 'bindings' ],
      publication: 'complete-only',
      indexed: true,
    },
  },
  discovery: [ 'documentation', 'documentation.all', 'documentation.get', 'capabilities', 'examples', 'open' ],
  workspace: {
    lifecycle: [ 'inventory', 'release', 'dispose' ],
    graphs: [ 'load' ],
    schema: [ 'search' ],
    query: [ 'run', 'select' ],
    evidence: [ 'load' ],
    resources: [ 'get', 'inspect', 'parseRdf', 'history' ],
    rdf: [ 'DataFactory', 'source', 'clone', 'dataset', 'retain' ],
    traversal: [ 'query', 'history' ],
    results: [ 'derive', 'profile', 'page', 'table', 'iterate' ],
    graph: [ 'neighbors' ],
    orientation: [ 'bootstrap', 'current', 'update', 'commit', 'status' ],
  },
  compatibility: [ 'initializeSession', 'createTableDisplay' ],
  documentationRoutes: Object.keys(METHOD_DOCS),
});

const EXAMPLES = Object.freeze({
  bootstrap: METHOD_DOCS.bootstrap.usage,
  ontology: "const ws = linkedScience.open({ contextKey: 'local-goal' });\nawait ws.orientation.bootstrap();\nconst ontology = await ws.graphs.load({ name: 'ontology', kind: 'ontology', text: ontologyTurtle, source: { kind: 'local-synthetic', id: 'ontology-fixture' } });\nws.schema.search(ontology, { text: 'measurement', limit: 5 });",
  query: "const hits = await ws.query.select({ sources: [ontology, sourceA, sourceB], sparql: 'SELECT ?sample ?value WHERE { GRAPH ?g { ?sample <https://example.test/science/hasValue> ?value } } ORDER BY ?sample LIMIT 10', role: 'measurements' });\nawait ws.results.table(hits, { limit: 5 });",
  evidence: "const evidence = await ws.evidence.load({ name: 'resource-notes', document: resourceNotes });",
  traversal: "const result = await ws.traversal.query({ sources: [{ type: 'sparql', value: 'https://example.test/sparql' }], sparql, evidence: [evidence], budgets: { maxRequests: 4, maxResultItems: 100 } });\nws.results.profile(result);\nws.traversal.history({ limit: 5 });",
  resources: "const resource = await ws.resources.get('https://example.test/data.json', { headers: { accept: 'application/json' }, role: 'source-metadata' });\nconst metadata = ws.resources.inspect(resource, { as: 'json' });\nconst json = await resource.json(); // ordinary in-kernel JavaScript value\nconst rdf = await ws.resources.parseRdf(resource, { name: 'source-graph' });",
  derive: "const numeric = await ws.results.derive(hits, ({ rows }) => ({ kind: 'bindings', rows: rows.filter(row => Number(row.get('value').value) > 5) }), { role: 'high-values' });",
  reset: "const saved = await ws.orientation.commit();\nawait linkedScience.reset({ contextKey: 'local-goal' });\nconst recovered = linkedScience.open({ contextKey: 'local-goal' });\nawait recovered.orientation.status(); // broker map usable; old handles stale",
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [ key, stable(value[key]) ]));
  return value;
}

function jsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function compactHash(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(stable(value))).digest('hex');
}

function boundedInteger(value, fallback, maximum, name, minimum = 0) {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < minimum || resolved > maximum) {
    throw runtimeError('LS_BOUND_EXCEEDED', 'bounds', `${name} must be an integer from ${minimum} to ${maximum}`, { retryable: true });
  }
  return resolved;
}

function byteLength(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function freezeJson(value) {
  if (Array.isArray(value)) {
    value.forEach(freezeJson);
    return Object.freeze(value);
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeJson);
    return Object.freeze(value);
  }
  return value;
}

function isRdfTerm(value) {
  return value && typeof value.termType === 'string' && typeof value.value === 'string';
}

function isQuad(value) {
  return isRdfTerm(value?.subject) && isRdfTerm(value?.predicate) && isRdfTerm(value?.object) && isRdfTerm(value?.graph);
}

function isStoredResult(value) {
  return value?.kind === 'linked-science-stored-result'
    && (value.resultType === 'quads' || (value.resultType === 'bindings' && Array.isArray(value.columns)))
    && value.complete === true
    && typeof value.storageId === 'string'
    && value.storageId.length > 0
    && Number.isInteger(value.count)
    && value.count >= 0
    && Number.isInteger(value.bytes)
    && value.bytes >= 0
    && typeof value.sha256 === 'string'
    && /^[0-9a-f]{64}$/u.test(value.sha256)
    && typeof value.backend === 'string'
    && value.durability === 'kernel-epoch';
}

function serializeTerm(term) {
  if (!isRdfTerm(term)) throw runtimeError('LS_INVALID_RDF_TERM', 'result-storage', 'Expected an RDF/JS term');
  if (term.termType === 'Quad') {
    return {
      termType: 'Quad',
      subject: serializeTerm(term.subject),
      predicate: serializeTerm(term.predicate),
      object: serializeTerm(term.object),
      graph: serializeTerm(term.graph),
    };
  }
  return {
    termType: term.termType,
    value: term.value,
    ...(term.termType === 'Literal' ? {
      language: term.language ?? '',
      datatype: typeof term.datatype === 'string' ? term.datatype : term.datatype?.value ?? 'http://www.w3.org/2001/XMLSchema#string',
    } : {}),
  };
}

function serializeBindingRow(row) {
  return row.map(({ variable, term }) => [ variable.value, serializeTerm(term) ]);
}

function deserializeBindingRow(item) {
  if (!Array.isArray(item) || item.some(pair => !Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string')) {
    throw runtimeError('LS_STORED_RESULT_INVALID', 'result-storage', 'Stored binding row is malformed');
  }
  return Object.freeze(item.map(([ name, term ]) => Object.freeze({ variable: DataFactory.variable(name), term: deserializeTerm(term) })));
}

function termIdentityKey(term) {
  if (term.termType === 'Quad') {
    return `<<${termIdentityKey(term.subject)} ${termIdentityKey(term.predicate)} ${termIdentityKey(term.object)} ${termIdentityKey(term.graph)}>>`;
  }
  return termFingerprintPart(term);
}

function quadIdentityKey(quad) {
  return `${termIdentityKey(quad.subject)}\0${termIdentityKey(quad.predicate)}\0${termIdentityKey(quad.object)}\0${termIdentityKey(quad.graph)}`;
}

// Wraps an N3 store as a lazy RDF/JS source. N3's own `match()` builds a
// filtered copy of the store's index and pushes every matched quad at once,
// which doubles resident memory during a full scan; `readQuads` yields lazily
// and `countQuads` gives Comunica exact cardinalities without a second scan.
function createIndexedStoreSource(store) {
  return Object.freeze({
    match(subject, predicate, object, graph) {
      return Readable.from(store.readQuads(subject ?? null, predicate ?? null, object ?? null, graph ?? null), { objectMode: true });
    },
    countQuads(subject, predicate, object, graph) {
      return store.countQuads(subject ?? null, predicate ?? null, object ?? null, graph ?? null);
    },
  });
}

// Set-union of several sources. Duplicate quads across sources collapse so a
// multi-source query keeps RDF merge semantics instead of Comunica's bag
// federation; memory grows with the matched output, not the source size.
function createUnionQuadSource(sources) {
  return Object.freeze({
    match(subject, predicate, object, graph) {
      return Readable.from((async function* () {
        const seen = new Set();
        for (const source of sources) {
          for await (const quad of source.match(subject, predicate, object, graph)) {
            const key = quadIdentityKey(quad);
            if (seen.has(key)) continue;
            seen.add(key);
            yield quad;
          }
        }
      })(), { objectMode: true });
    },
    async countQuads(subject, predicate, object, graph) {
      let total = 0;
      for (const source of sources) total += await source.countQuads(subject, predicate, object, graph);
      return total;
    },
  });
}

function combinedQuerySource(sources) {
  return sources.length === 1 ? sources[0] : createUnionQuadSource(sources);
}

function deserializeTerm(term) {
  if (!term || typeof term !== 'object' || typeof term.termType !== 'string') throw runtimeError('LS_STORED_RESULT_INVALID', 'result-storage', 'Stored RDF term is malformed');
  if (term.termType === 'Quad') return DataFactory.quad(deserializeTerm(term.subject), deserializeTerm(term.predicate), deserializeTerm(term.object), deserializeTerm(term.graph));
  if (term.termType === 'NamedNode') return DataFactory.namedNode(term.value);
  if (term.termType === 'BlankNode') return DataFactory.blankNode(term.value);
  if (term.termType === 'Variable') return DataFactory.variable(term.value);
  if (term.termType === 'DefaultGraph') return DataFactory.defaultGraph();
  if (term.termType === 'Literal') return term.language
    ? DataFactory.literal(term.value, term.language)
    : DataFactory.literal(term.value, DataFactory.namedNode(term.datatype));
  throw runtimeError('LS_STORED_RESULT_INVALID', 'result-storage', `Stored RDF term type is unsupported: ${term.termType}`);
}

function serializeQuad(quad) {
  if (!isQuad(quad)) throw runtimeError('LS_INVALID_RDF_TERM', 'result-storage', 'Expected an RDF/JS quad');
  return {
    subject: serializeTerm(quad.subject),
    predicate: serializeTerm(quad.predicate),
    object: serializeTerm(quad.object),
    graph: serializeTerm(quad.graph),
  };
}

function deserializeQuad(quad) {
  return DataFactory.quad(deserializeTerm(quad.subject), deserializeTerm(quad.predicate), deserializeTerm(quad.object), deserializeTerm(quad.graph));
}

function storedPattern(subject, predicate, object, graph) {
  const pattern = {};
  for (const [ position, term ] of [ [ 'subject', subject ], [ 'predicate', predicate ], [ 'object', object ], [ 'graph', graph ] ]) {
    if (term && term.termType !== 'Variable') pattern[position] = serializeTerm(term);
  }
  return pattern;
}

// A broker-stored quad result behaves as an indexed RDF/JS source: each
// triple-pattern lookup is pushed to the broker's SQLite indexes and streamed
// back through bounded keyset pages, and `countQuads` is an exact SQL count.
function createStoredQuadSource(stored, resultStorage, pageSize) {
  return Object.freeze({
    match(subject, predicate, object, graph) {
      const pattern = storedPattern(subject, predicate, object, graph);
      return Readable.from((async function* () {
        let after;
        for (;;) {
          const page = await resultStorage.match(stored.storageId, { pattern, ...(after ? { after } : {}), limit: pageSize });
          if (!Array.isArray(page?.items)) throw runtimeError('LS_STORED_RESULT_INVALID', 'result-storage', 'Broker result storage returned an invalid match page');
          for (const serialized of page.items) yield deserializeQuad(serialized);
          if (page.done || !page.cursor) return;
          after = page.cursor;
        }
      })(), { objectMode: true });
    },
    async countQuads(subject, predicate, object, graph) {
      const counted = await resultStorage.count(stored.storageId, { pattern: storedPattern(subject, predicate, object, graph) });
      if (!Number.isInteger(counted?.count) || counted.count < 0) throw runtimeError('LS_STORED_RESULT_INVALID', 'result-storage', 'Broker result storage returned an invalid pattern count');
      return counted.count;
    },
  });
}

function copyTerm(term) {
  if (!isRdfTerm(term)) throw runtimeError('LS_INVALID_RDF_TERM', 'retention', 'Expected an RDF/JS term');
  if (term.termType === 'NamedNode') return DataFactory.namedNode(term.value);
  if (term.termType === 'BlankNode') return DataFactory.blankNode(term.value);
  if (term.termType === 'Variable') return DataFactory.variable(term.value);
  if (term.termType === 'DefaultGraph') return DataFactory.defaultGraph();
  if (term.termType === 'Literal') return term.language
    ? DataFactory.literal(term.value, term.language)
    : DataFactory.literal(term.value, DataFactory.namedNode(
      typeof term.datatype === 'string' ? term.datatype : term.datatype?.value ?? 'http://www.w3.org/2001/XMLSchema#string',
    ));
  if (term.termType === 'Quad') return copyQuad(term);
  throw runtimeError('LS_INVALID_RDF_TERM', 'retention', `Unsupported RDF/JS term type: ${term.termType}`);
}

async function traversalCapabilities(traversal) {
  if (traversal === undefined) return undefined;
  for (const method of [ 'capabilities', 'beginTraversal', 'snapshotTraversal', 'finishTraversal', 'abortTraversal', 'createFetch' ]) {
    if (typeof traversal?.[method] !== 'function') throw runtimeError('LS_TRAVERSAL_REQUIRED', 'bootstrap', `Traversal mediator is missing ${method}`);
  }
  const capabilities = await traversal.capabilities();
  if (!capabilities || capabilities.kind !== 'linked-science-anonymous-read-mediator' || capabilities.version !== '3.2.0' ||
    capabilities.authority?.class !== 'anonymous-linked-data-read' || capabilities.authority?.version !== '1.0.0' ||
    capabilities.transport?.implementation !== 'standard-fetch' || !capabilities.hardBudgets || capabilities.retries !== 0) {
    throw runtimeError('LS_TRAVERSAL_CAPABILITIES', 'bootstrap', 'Traversal mediator returned an invalid capability receipt');
  }
  if (!Array.isArray(capabilities.authority.methods) || !Array.isArray(capabilities.authority.queryTypes) ||
    capabilities.authority.methods.some(method => ![ 'GET', 'HEAD', 'SPARQL_POST' ].includes(method)) ||
    capabilities.authority.queryTypes.some(type => !QUERY_TYPES.has(type))) {
    throw runtimeError('LS_TRAVERSAL_CAPABILITIES', 'bootstrap', 'Traversal mediator exposes a mutation-capable operation');
  }
  return freezeJson(jsonClone(capabilities));
}

async function resultStorageCapabilities(resultStorage) {
  if (resultStorage === undefined) return undefined;
  for (const method of [ 'capabilities', 'begin', 'append', 'commit', 'page', 'match', 'count', 'abort' ]) {
    if (typeof resultStorage?.[method] !== 'function') throw runtimeError('LS_RESULT_STORAGE_REQUIRED', 'bootstrap', `Result storage is missing ${method}`);
  }
  const capabilities = await resultStorage.capabilities();
  if (!capabilities || capabilities.kind !== 'linked-science-result-spool' || capabilities.version !== RESULT_SPOOL_VERSION || capabilities.owner !== 'cleanroom-broker' ||
    capabilities.completeBeforePublication !== true || capabilities.patternPushdown !== true ||
    !Array.isArray(capabilities.resultKinds) || !capabilities.resultKinds.includes('quads') || !capabilities.resultKinds.includes('bindings') ||
    capabilities.durability !== 'kernel-epoch' || typeof capabilities.backend !== 'string' ||
    !Number.isInteger(capabilities.maxResultBytes) || !Number.isInteger(capabilities.maxTotalBytes) || capabilities.maxTotalBytes < capabilities.maxResultBytes ||
    !Number.isInteger(capabilities.maxAppendBytes) || !Number.isInteger(capabilities.maxAppendItems) || !Number.isInteger(capabilities.maxPageItems)) {
    throw runtimeError('LS_RESULT_STORAGE_CAPABILITIES', 'bootstrap', 'Result storage returned an invalid capability receipt');
  }
  return freezeJson(jsonClone(capabilities));
}

async function collectBounded(stream, maximum, code, stage) {
  const items = [];
  for await (const item of stream) {
    if (items.length >= maximum) {
      stream.destroy?.();
      throw resultResidencyError(code, stage, maximum, items.length + 1);
    }
    items.push(item);
  }
  return items;
}

async function collectQuadStore(stream, maximum, code, stage) {
  const store = new Store();
  for await (const item of stream) {
    store.addQuad(copyQuad(item));
    if (store.size > maximum) {
      stream.destroy?.();
      throw resultResidencyError(code, stage, maximum, store.size);
    }
  }
  return store;
}

// Batches serialized items into bounded broker appends for one provisional
// stored result. The result handle is published only after commit.
class SpoolWriter {
  constructor(resultStorage, begun, itemName) {
    this.resultStorage = resultStorage;
    this.begun = begun;
    this.itemName = itemName;
    this.batch = [];
    this.batchBytes = 2;
  }

  async queue(serialized) {
    const itemBytes = byteLength(serialized) + 1;
    if (itemBytes + 2 > this.begun.maxAppendBytes) {
      throw runtimeError('LS_RESULT_STORAGE_ITEM_LIMIT', 'result-storage', `One ${this.itemName} exceeds the broker append ceiling of ${this.begun.maxAppendBytes} bytes`, {
        receipt: { status: 'failed', stage: 'result-storage', code: 'LS_RESULT_STORAGE_ITEM_LIMIT', maxAppendBytes: this.begun.maxAppendBytes },
        recoveryDocument: 'budgets',
      });
    }
    if (this.batch.length > 0 && (this.batchBytes + itemBytes > this.begun.maxAppendBytes || this.batch.length >= this.begun.maxAppendItems)) await this.flush();
    this.batch.push(serialized);
    this.batchBytes += itemBytes;
  }

  async flush() {
    if (this.batch.length === 0) return;
    await this.resultStorage.append(this.begun.storageId, this.batch);
    this.batch = [];
    this.batchBytes = 2;
  }
}

function translateSpoolError(error, begun) {
  if (error?.code !== 'RESULT_SPOOL_RESULT_LIMIT' && error?.code !== 'RESULT_SPOOL_TOTAL_LIMIT') return error;
  const perResult = error.code === 'RESULT_SPOOL_RESULT_LIMIT';
  const repair = {
    kind: 'linked-science-residency-repair',
    scope: 'broker-result-storage',
    allowed: true,
    sameCall: false,
    preservesOriginalAnswer: false,
    ...(perResult && begun ? { maximumBytes: begun.maxBytes } : {}),
    action: perResult
      ? 'Choose a semantically narrower query or run under a separately configured larger broker storage quota; do not treat a limited query as the original result.'
      : 'Release/reset unneeded epoch state, choose a semantically narrower query, or run under a separately configured larger broker storage quota.',
  };
  const code = perResult ? 'LS_QUERY_RESULT_STORAGE_BOUND' : 'LS_RESULT_STORAGE_EXHAUSTED';
  return runtimeError(code, 'result-storage', `${error.message}; no partial result handle was retained`, {
    receipt: { status: 'failed', stage: 'result-storage', code, repair },
    recoveryDocument: 'budgets',
    retryable: true,
    repair,
    cause: error,
  });
}

async function collectQuadResult(stream, { resultStorage, inMemoryMaximum, fallbackMaximum, code, stage, forceBroker = false }) {
  if (!resultStorage) return collectQuadStore(stream, fallbackMaximum, code, stage);
  let memory = new Store();
  let begun;
  let writer;
  try {
    if (forceBroker) {
      begun = await resultStorage.begin({ kind: 'quads' });
      writer = new SpoolWriter(resultStorage, begun, 'RDF quad');
      memory = undefined;
    }
    for await (const item of stream) {
      if (!begun) {
        memory.addQuad(copyQuad(item));
        if (memory.size <= inMemoryMaximum) continue;
        begun = await resultStorage.begin({ kind: 'quads' });
        writer = new SpoolWriter(resultStorage, begun, 'RDF quad');
        for (const retained of memory) await writer.queue(serializeQuad(retained));
        memory = undefined;
        continue;
      }
      await writer.queue(serializeQuad(item));
    }
    if (!begun) return memory;
    await writer.flush();
    const committed = await resultStorage.commit(begun.storageId);
    if (!isStoredResult(committed) || committed.resultType !== 'quads') throw runtimeError('LS_RESULT_STORAGE_COMMIT', 'result-storage', 'Broker result storage returned an invalid completion descriptor');
    return freezeJson(committed);
  } catch (error) {
    stream.destroy?.();
    if (begun) try { await resultStorage.abort(begun.storageId); } catch {}
    throw translateSpoolError(error, begun);
  }
}

// SELECT solutions keep bag semantics: every row is retained in order, and
// large solution sequences spill to the broker exactly like graph results.
async function collectBindingsResult(stream, { resultStorage, inMemoryMaximum, fallbackMaximum, code, stage }) {
  if (!resultStorage) return normalizeBindings(await collectBounded(stream, fallbackMaximum, code, stage));
  const columns = new Set();
  let memory = [];
  let begun;
  let writer;
  try {
    for await (const item of stream) {
      const row = normalizeBindings([ item ])[0];
      for (const entry of row) columns.add(entry.variable.value);
      if (!begun) {
        memory.push(row);
        if (memory.length <= inMemoryMaximum) continue;
        begun = await resultStorage.begin({ kind: 'bindings' });
        writer = new SpoolWriter(resultStorage, begun, 'SPARQL solution');
        for (const retained of memory) await writer.queue(serializeBindingRow(retained));
        memory = undefined;
        continue;
      }
      await writer.queue(serializeBindingRow(row));
    }
    if (!begun) return memory;
    await writer.flush();
    const committed = await resultStorage.commit(begun.storageId, { columns: [ ...columns ] });
    if (!isStoredResult(committed) || committed.resultType !== 'bindings') throw runtimeError('LS_RESULT_STORAGE_COMMIT', 'result-storage', 'Broker result storage returned an invalid completion descriptor');
    return freezeJson(committed);
  } catch (error) {
    stream.destroy?.();
    if (begun) try { await resultStorage.abort(begun.storageId); } catch {}
    throw translateSpoolError(error, begun);
  }
}

function resultResidencyError(code, stage, maximum, observedAtLeast) {
  const repair = {
    kind: 'linked-science-residency-repair',
    scope: 'operational-residency',
    allowed: true,
    sameCall: false,
    maximum,
    observedAtLeast,
    preservesOriginalAnswer: false,
    action: 'Choose a semantically narrower query or a separately authorized durable/bulk result route; do not add a LIMIT and treat that answer as the original result.',
  };
  return runtimeError(code, stage, `Result exceeds the operational resident-item quota of ${maximum}; no partial result handle was retained`, {
    receipt: { status: 'failed', stage, code, repair },
    recoveryDocument: 'budgets',
    retryable: true,
    repair,
  });
}

function findAlgebraOperation(root, type) {
  const seen = new Set();
  const visit = value => {
    if (!value || typeof value !== 'object' || seen.has(value)) return undefined;
    seen.add(value);
    if (value.type === type) return value;
    for (const nested of Object.values(value)) {
      if (Array.isArray(nested)) {
        for (const item of nested) {
          const found = visit(item);
          if (found) return found;
        }
      } else {
        const found = visit(nested);
        if (found) return found;
      }
    }
    return undefined;
  };
  return visit(root);
}

function collectVariableNames(value, names = new Set(), seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return names;
  seen.add(value);
  if (value.termType === 'Variable' && typeof value.value === 'string') names.add(value.value);
  for (const nested of Object.values(value)) {
    if (Array.isArray(nested)) nested.forEach(item => collectVariableNames(item, names, seen));
    else collectVariableNames(nested, names, seen);
  }
  return names;
}

function normalizeDescribeQuery(parsed) {
  const algebra = translateSparql(parsed, { quads: true, dataFactory: DataFactory });
  const describe = findAlgebraOperation(algebra, 'describe');
  if (!describe || !Array.isArray(describe.terms)) throw runtimeError('LS_DESCRIBE_NORMALIZATION', 'query-preflight', 'Unable to identify the DESCRIBE operation');

  const seenTerms = new Set();
  const terms = describe.terms.filter(term => {
    if (!isRdfTerm(term) || ![ 'NamedNode', 'Variable' ].includes(term.termType)) return false;
    const key = `${term.termType}\0${term.value}`;
    if (seenTerms.has(key)) return false;
    seenTerms.add(key);
    return true;
  });
  const variables = terms.filter(term => term.termType === 'Variable');
  const explicit = terms.filter(term => term.termType === 'NamedNode');
  const usedNames = collectVariableNames(parsed);
  let helperSequence = 0;
  const helper = stem => {
    let name;
    do name = `__linkedScienceDescribe${stem}${helperSequence++}`; while (usedNames.has(name));
    usedNames.add(name);
    return DataFactory.variable(name);
  };
  const patterns = terms.map(term => ({
    subject: term,
    predicate: helper('Predicate'),
    object: helper('Object'),
  }));
  const patternForTerm = term => patterns[terms.indexOf(term)];
  const branch = pattern => ({ type: 'bgp', triples: [ pattern ] });
  const outerBranches = explicit.map(term => branch(patternForTerm(term)));

  if (variables.length > 0) {
    const selection = { ...parsed, queryType: 'SELECT', variables };
    delete selection.prefixes;
    delete selection.base;
    delete selection.from;
    const variableBranches = variables.map(term => branch(patternForTerm(term)));
    outerBranches.push({
      type: 'group',
      patterns: [
        { type: 'group', patterns: [ selection ] },
        variableBranches.length === 1
          ? variableBranches[0]
          : { type: 'group', patterns: [ { type: 'union', patterns: variableBranches } ] },
      ],
    });
  }

  const normalized = {
    type: 'query',
    queryType: 'CONSTRUCT',
    template: patterns,
    where: outerBranches.length === 0
      ? []
      : outerBranches.length === 1
        ? [ outerBranches[0] ]
        : [ { type: 'union', patterns: outerBranches } ],
    prefixes: parsed.prefixes ?? {},
  };
  if (parsed.base !== undefined) normalized.base = parsed.base;
  if (parsed.from !== undefined) normalized.from = parsed.from;
  const sparql = new SparqlGenerator().stringify(normalized);
  return Object.freeze({
    sparql,
    executionQueryType: 'CONSTRUCT',
    executionQuerySha256: compactHash(sparql),
    descriptionPolicy: DESCRIBE_POLICY,
    describedTerms: terms.length,
    explicitTerms: explicit.length,
    variableTerms: variables.length,
  });
}

function prepareQueryExecution(sparql, parsed) {
  if (parsed.queryType !== 'DESCRIBE') return Object.freeze({ sparql, executionQueryType: parsed.queryType });
  return normalizeDescribeQuery(parsed);
}

function queryCompletion(queryType, execution) {
  return Object.freeze({
    kind: 'linked-science-result-completion',
    status: 'complete',
    complete: true,
    truncated: false,
    scope: 'submitted-query',
    materialization: 'atomic-before-handle-publication',
    ...(queryType === 'DESCRIBE' ? { descriptionPolicy: execution.descriptionPolicy } : {}),
  });
}

function copyQuad(item) {
  if (!isQuad(item)) throw runtimeError('LS_INVALID_RDF_TERM', 'retention', 'Expected an RDF/JS quad');
  return DataFactory.quad(copyTerm(item.subject), copyTerm(item.predicate), copyTerm(item.object), copyTerm(item.graph));
}

function termDescriptor(term) {
  if (!isRdfTerm(term)) throw runtimeError('LS_INVALID_RDF_TERM', 'projection', 'Expected an RDF/JS term');
  const output = { termType: term.termType, value: term.value };
  if (term.termType === 'Literal') {
    output.language = term.language ?? '';
    output.datatype = term.datatype?.value ?? '';
  }
  return output;
}

function termFingerprintPart(term) {
  const descriptor = termDescriptor(term);
  return JSON.stringify(descriptor);
}

function updateQuadFingerprint(hash, item) {
  hash.update(termFingerprintPart(item.subject));
  hash.update('\0');
  hash.update(termFingerprintPart(item.predicate));
  hash.update('\0');
  hash.update(termFingerprintPart(item.object));
  hash.update('\0');
  hash.update(termFingerprintPart(item.graph));
  hash.update('\n');
}

function quadFingerprint(quads) {
  const hash = createHash('sha256');
  for (const item of quads) updateQuadFingerprint(hash, item);
  return hash.digest('hex');
}

function bindingEntries(binding) {
  if (binding instanceof Map || typeof binding?.[Symbol.iterator] === 'function') {
    return [ ...binding ].map(([ variable, term ]) => ({
      variable: typeof variable === 'string' ? DataFactory.variable(variable.replace(/^\?/u, '')) : variable,
      term,
    }));
  }
  if (binding && typeof binding === 'object') {
    return Object.entries(binding).map(([ variable, term ]) => ({ variable: DataFactory.variable(variable.replace(/^\?/u, '')), term }));
  }
  throw runtimeError('LS_INVALID_BINDING', 'retention', 'A binding row must be iterable variable/term pairs or an object');
}

function normalizeBindings(rows) {
  if (!Array.isArray(rows)) throw runtimeError('LS_INVALID_DERIVATION', 'derivation', 'Bindings output requires a rows array');
  return rows.map(row => bindingEntries(row).map(({ variable, term }) => {
    if (!isRdfTerm(variable) || variable.termType !== 'Variable' || !isRdfTerm(term)) {
      throw runtimeError('LS_INVALID_BINDING', 'retention', 'Bindings must preserve RDF/JS variable and value terms');
    }
    return Object.freeze({ variable: copyTerm(variable), term: copyTerm(term) });
  }));
}

function bindingMap(row) {
  return new Map(row.map(({ variable, term }) => [ variable.value, term ]));
}

function columnsFor(record) {
  if (record.kind === 'bindings') {
    return isStoredResult(record.value) ? [ ...record.value.columns ] : [ ...new Set(record.value.flatMap(row => row.map(entry => entry.variable.value))) ];
  }
  if (record.kind === 'rows') return [ ...new Set(record.value.flatMap(row => Object.keys(row))) ];
  if (record.kind === 'boolean') return [ 'value' ];
  return [ 'subject', 'predicate', 'object', 'graph' ];
}

function retainedItems(record) {
  if (isStoredResult(record.value)) throw runtimeError('LS_STORED_RESULT_ASYNC', 'result-storage', 'Use the awaitable results.page operation for a broker-stored result', { recoveryDocument: 'results.page', retryable: true });
  return record.kind === 'quads' && typeof record.value?.match === 'function' ? [ ...record.value ] : record.value;
}

function resultCount(record) {
  if (record.kind === 'boolean') return 1;
  if (isStoredResult(record.value)) return record.value.count;
  if (record.kind === 'quads' && Number.isInteger(record.value?.size)) return record.value.size;
  return record.value.length;
}

function projectCell(value) {
  if (isRdfTerm(value)) return termDescriptor(value);
  if (value === null || typeof value === 'boolean' || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) return value;
  throw runtimeError('LS_UNPROJECTABLE_VALUE', 'projection', 'Bounded views support RDF terms and JSON scalar cells only');
}

function rowProjection(record, row, columns) {
  if (record.kind === 'bindings') {
    const map = bindingMap(row);
    return Object.fromEntries(columns.map(column => [ column, map.has(column) ? termDescriptor(map.get(column)) : null ]));
  }
  if (record.kind === 'rows') return Object.fromEntries(columns.map(column => [ column, projectCell(row[column] ?? null) ]));
  if (record.kind === 'boolean') return { value: record.value };
  const projected = {
    subject: termDescriptor(row.subject),
    predicate: termDescriptor(row.predicate),
    object: termDescriptor(row.object),
    graph: termDescriptor(row.graph),
  };
  return Object.fromEntries(columns.map(column => [ column, projected[column] ]));
}

function fitItems(items, build, maxBytes) {
  for (let count = items.length; count >= 0; count -= 1) {
    const output = build(items.slice(0, count), count < items.length);
    const bounded = withByteBounds(output, maxBytes);
    if (bounded.bounds.bytes <= maxBytes) return bounded;
  }
  throw runtimeError('LS_BYTE_BOUND_TOO_SMALL', 'bounds', 'The byte bound cannot contain observation metadata', { retryable: true });
}

function withByteBounds(output, maxBytes) {
  let bytes = 0;
  let bounded;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    bounded = { ...output, bounds: { ...output.bounds, bytes, maxBytes } };
    const observed = byteLength(bounded);
    if (observed === bytes) break;
    bytes = observed;
  }
  bounded = { ...output, bounds: { ...output.bounds, bytes, maxBytes } };
  return freezeJson(bounded);
}

function operationReceipt({ operationId, stage, status = 'ready', ...fields }) {
  return Object.freeze({ kind: 'linked-science-runtime-operation', operationId, stage, status, ...fields });
}

export class LinkedScienceRuntimeError extends Error {
  constructor(message, { code, stage, receipt, recoveryDocument = 'recovery', retryable = false, repair, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'LinkedScienceRuntimeError';
    this.code = code;
    this.stage = stage;
    this.repair = repair === undefined ? undefined : freezeJson(jsonClone(repair));
    this.receipt = freezeJson(jsonClone({ ...(receipt ?? { status: 'failed', stage, code }), ...(this.repair ? { repair: this.repair } : {}) }));
    this.recoveryDocument = recoveryDocument;
    this.retryable = retryable;
  }
}

function runtimeError(code, stage, message, options = {}) {
  return new LinkedScienceRuntimeError(message, { code, stage, ...options });
}

function wrapError(error, code, stage, receipt = {}) {
  if (error instanceof LinkedScienceRuntimeError) {
    if (Object.keys(receipt).length === 0) return error;
    return runtimeError(error.code ?? code, error.stage ?? stage, error.message, {
      cause: error,
      receipt: { ...error.receipt, ...receipt },
      recoveryDocument: error.recoveryDocument,
      retryable: error.retryable,
      repair: error.repair,
    });
  }
  return runtimeError(code, stage, error.message, {
    cause: error,
    receipt: { status: 'failed', stage, code, ...receipt, cause: `${error.name}: ${error.message}` },
    retryable: false,
  });
}

const NAVIGATION_RELATION_PRIORITY = new Set([
  'profile', 'describedby', 'alternate', 'http://www.w3.org/ns/json-ld#context', 'service-desc', 'canonical',
]);

function navigationEvidence(receipt) {
  const exchanges = Array.isArray(receipt?.exchanges) ? receipt.exchanges : [];
  const candidates = exchanges.flatMap(exchange => (exchange.navigation?.links ?? []).map(link => ({
    exchangeIndex: exchange.index,
    responseUrl: exchange.navigation.responseUrl,
    evidenceStatus: 'advertised-untried',
    executionAuthority: false,
    ...link,
  })));
  const preferred = candidates.filter(candidate => candidate.relations.some(relation => NAVIGATION_RELATION_PRIORITY.has(relation)));
  const remaining = candidates.filter(candidate => !preferred.includes(candidate));
  const selectedPreferred = preferred.slice(0, 24);
  const selected = [ ...selectedPreferred, ...remaining.slice(0, 24 - selectedPreferred.length) ];
  const profileDeclarations = exchanges.flatMap(exchange => (exchange.navigation?.profileDeclarations ?? []).map(declaration => ({
    exchangeIndex: exchange.index,
    responseUrl: exchange.navigation.responseUrl,
    ...declaration,
  })));
  return freezeJson({
    kind: 'linked-data-navigation-evidence',
    evidenceStatus: 'observed-advertisements',
    instructionAuthority: false,
    candidates: selected,
    profileDeclarations: profileDeclarations.slice(0, 24),
    truncated: candidates.length > selected.length || profileDeclarations.length > 24 || exchanges.some(exchange => exchange.navigation?.truncated),
    use: 'Use relation and declaration evidence to choose a relevant subsequent mediated action; advertised targets remain untried until retrieved.',
  });
}

function normalizeNegotiation(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => ![ 'accept', 'acceptProfile', 'prefer' ].includes(key))) {
    throw new Error('Negotiation may contain only accept, acceptProfile, and prefer');
  }
  const headers = new Headers();
  for (const [ key, header ] of [ [ 'accept', 'accept' ], [ 'acceptProfile', 'accept-profile' ], [ 'prefer', 'prefer' ] ]) {
    if (value[key] === undefined) continue;
    if (typeof value[key] !== 'string' || value[key].length < 1 || value[key].length > 8_192 || /[\r\n]/u.test(value[key])) {
      throw new Error(`Negotiation field ${key} must be a bounded HTTP header value`);
    }
    headers.set(header, value[key]);
  }
  return headers;
}

function normalizedMediaType(headers = {}) {
  return String(headers['content-type'] ?? headers['Content-Type'] ?? '').split(';', 1)[0].trim().toLowerCase();
}

function rdfFormatForMediaType(mediaType) {
  return {
    'text/turtle': 'text/turtle',
    'application/x-turtle': 'text/turtle',
    'application/n-triples': 'N-Triples',
    'application/n-quads': 'N-Quads',
    'application/trig': 'TriG',
  }[mediaType];
}

function normalizeRdfFormat(format) {
  if (typeof format !== 'string') return undefined;
  return {
    'text/turtle': 'text/turtle',
    turtle: 'text/turtle',
    'application/n-triples': 'N-Triples',
    'n-triples': 'N-Triples',
    'application/n-quads': 'N-Quads',
    'n-quads': 'N-Quads',
    'application/trig': 'TriG',
    trig: 'TriG',
  }[format.toLowerCase()];
}

function boundedUtf8Prefix(bytes, maxBytes) {
  const prefix = Buffer.from(bytes).subarray(0, maxBytes).toString('utf8');
  return prefix.endsWith('\uFFFD') ? prefix.slice(0, -1) : prefix;
}

function validateBudgets(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw runtimeError('LS_BUDGETS', 'bootstrap', 'Runtime budgets must be an object');
  const ceilings = {
    maxResidentGraphQuads: 1_000_000,
    maxWorkspaceGraphQuads: 2_000_000,
    maxResidentResourceBytes: 16_000_000,
    maxResultItems: 5_000,
    maxRows: 100,
    maxCells: 1_000,
    maxNodes: 500,
    maxEdges: 500,
    maxBytes: 1_000_000,
    maxSchemaResults: 100,
    maxQueryChars: 100_000,
  };
  const accepted = new Set([ ...Object.keys(DEFAULT_BUDGETS), 'maxGraphQuads' ]);
  const unknown = Object.keys(input).filter(key => !accepted.has(key));
  if (unknown.length > 0) throw runtimeError('LS_BUDGETS', 'bootstrap', `Unknown runtime budget fields: ${unknown.join(', ')}`);
  if (input.maxGraphQuads !== undefined && input.maxResidentGraphQuads !== undefined) {
    throw runtimeError('LS_BUDGETS', 'bootstrap', 'Use maxResidentGraphQuads; do not supply it together with the deprecated maxGraphQuads alias');
  }
  const normalized = { ...input, maxResidentGraphQuads: input.maxResidentGraphQuads ?? input.maxGraphQuads };
  delete normalized.maxGraphQuads;
  return Object.freeze(Object.fromEntries(Object.entries(DEFAULT_BUDGETS).map(([ key, fallback ]) => [
    key,
    boundedInteger(normalized[key], fallback, ceilings[key], key, 1),
  ])));
}

function budgetPlanes(budgets, traversal, resultStorage, residencyBasis) {
  return freezeJson({
    execution: {
      maxQueryChars: budgets.maxQueryChars,
      mediatedTraversal: traversal ? {
        defaultBudgets: traversal.defaultBudgets,
        hardBudgets: traversal.hardBudgets,
      } : { available: false },
    },
    residency: {
      maxResidentResourceBytes: budgets.maxResidentResourceBytes,
      maxResidentGraphQuads: budgets.maxResidentGraphQuads,
      maxResidentLocalQuadResultQuads: budgets.maxWorkspaceGraphQuads,
      maxWorkspaceGraphQuads: budgets.maxWorkspaceGraphQuads,
      maxResultItems: budgets.maxResultItems,
      basis: residencyBasis,
      kernelHeap: {
        headroomCheck: 'live',
        safetyFactor: HEAP_HEADROOM_SAFETY,
        estimatedBytesPerQuad: RESIDENT_QUAD_BYTES_ESTIMATE,
        failureCode: 'LS_KERNEL_HEAP_BOUND',
      },
      brokerStoredResults: resultStorage ? {
        available: true,
        backend: resultStorage.backend,
        resultKinds: resultStorage.resultKinds,
        indexed: resultStorage.patternPushdown === true,
        maxResultBytes: resultStorage.maxResultBytes,
        maxTotalBytes: resultStorage.maxTotalBytes,
        semantics: 'out-of-core bindings and graph-result capacity; never a SPARQL solution modifier or prompt bound',
      } : { available: false },
      semantics: 'operational in-memory safety and atomic admission; not query semantics or a prompt/display limit',
    },
    projection: {
      maxRows: budgets.maxRows,
      maxCells: budgets.maxCells,
      maxNodes: budgets.maxNodes,
      maxEdges: budgets.maxEdges,
      maxBytes: budgets.maxBytes,
      maxSchemaResults: budgets.maxSchemaResults,
      semantics: 'model-visible observation only; never graph admission',
    },
  });
}

function publicHandle({ id, type, epoch, label }) {
  const handle = { kind: 'linked-science-handle', id, type, epoch, label };
  Object.defineProperty(handle, HANDLE_BRAND, { value: true });
  return Object.freeze(handle);
}

function countOrientationEntries(map) {
  return Object.values(map.sections).reduce((count, entries) => count + entries.length, 0);
}

function docsFunction() {
  const fn = () => Object.freeze({
    runtime: 'linked-science',
    version: RUNTIME_VERSION,
    summary: 'Persistent scientific JavaScript REPL with native RDF/JS sources, Comunica queries and bounded observations.',
    start: [ 'bootstrap', 'discovery' ],
    routes: Object.keys(METHOD_DOCS),
    machineSchema: 'docs/runtime/linked-science-api.schema.json',
  });
  Object.defineProperty(fn, 'get', {
    value(name) {
      if (typeof name !== 'string' || name.length === 0) throw runtimeError('LS_DOCUMENT_REQUIRED', 'documentation', 'A documentation route name is required');
      const route = DOCUMENT_ALIASES[name] ?? name;
      const exact = METHOD_DOCS[route];
      if (exact) return Object.freeze(jsonClone({ name: route, requestedAs: route === name ? undefined : name, ...exact }));
      const matches = Object.keys(METHOD_DOCS).filter(route => route.includes(name) || name.includes(route));
      throw runtimeError('LS_DOCUMENT_NOT_FOUND', 'documentation', `Unknown documentation route: ${name}`, {
        receipt: { status: 'failed', stage: 'documentation', requested: name, matches },
        retryable: true,
      });
    },
  });
  Object.defineProperty(fn, 'all', {
    value() {
      return freezeJson(Object.fromEntries(Object.entries(METHOD_DOCS).map(([ name, contract ]) => [ name, { name, ...jsonClone(contract) } ])));
    },
  });
  return Object.freeze(fn);
}

function createWorkspace(runtime, context) {
  const epoch = context.epoch;
  const registry = new Map();
  const engine = new QueryEngine();
  let active = true;
  let handleSequence = 0;
  let operationSequence = 0;
  let attemptSequence = 0;
  let residentGraphQuads = 0;
  const mediatedAttempts = [];
  const released = new WeakSet();
  const storageIds = new Set();
  const traversalIds = new Set();
  const pendingAllocations = new Set();
  const storageCleanup = new Map();
  let disposal;

  // An allocation started before disposal still belongs to this workspace.
  // Disposal waits for its ID before reclaiming it; no new allocation starts
  // after invalidation. This also covers a delayed broker response.
  function ownAllocation(begin, ids, key) {
    ensureActive();
    const pending = Promise.resolve().then(begin).then(value => {
      ids.add(value[key]);
      ensureActive();
      return value;
    });
    pendingAllocations.add(pending);
    pending.finally(() => pendingAllocations.delete(pending)).catch(() => {});
    return pending;
  }

  function abortStorage(storageId) {
    if (storageCleanup.has(storageId)) return storageCleanup.get(storageId);
    if (!storageIds.has(storageId)) return Promise.resolve();
    const pending = Promise.resolve().then(() => runtime.resultStorage.abort(storageId)).then(() => storageIds.delete(storageId));
    storageCleanup.set(storageId, pending);
    pending.finally(() => storageCleanup.delete(storageId)).catch(() => {});
    return pending;
  }

  const resultStorage = runtime.resultStorage && {
    ...Object.fromEntries([ 'append', 'commit', 'page', 'match', 'count' ].map(method => [ method, (...args) => runtime.resultStorage[method](...args) ])),
    begin: options => ownAllocation(() => runtime.resultStorage.begin(options), storageIds, 'storageId'),
    abort: abortStorage,
  };
  const beginTraversal = budgets => ownAllocation(() => runtime.traversal.beginTraversal(budgets), traversalIds, 'traversalId');

  const querySourceForQuads = value => isStoredResult(value)
    ? createStoredQuadSource(value, resultStorage, runtime.resultStorageCapabilities.maxMatchItems ?? runtime.resultStorageCapabilities.maxPageItems)
    : value;

  // Every local query runs over lazy indexed sources; in-kernel stores are
  // never copied into a per-query merged store.
  const engineSource = record => (isStoredResult(record.value)
    ? record.querySource
    : createIndexedStoreSource(GRAPH_KINDS.has(record.kind) ? record.querySource : record.value));

  const nextOperation = () => `op-${String(++operationSequence).padStart(6, '0')}`;

  function localValidationError(code, phase, message, { field, expected, action } = {}) {
    const repair = {
      kind: 'linked-science-local-validation-repair', scope: 'local-call', phase,
      allowed: true,
      ...(field ? { field } : {}), ...(expected ? { expected } : {}), ...(action ? { action } : {}),
      budgetImpact: { liveRequests: 0 },
    };
    return runtimeError(code, phase, message, {
      receipt: { status: 'failed', stage: phase, code, repair },
      recoveryDocument: 'recovery', retryable: true, repair,
    });
  }

  function projectionInteger(value, fallback, maximum, field, minimum = 0) {
    try {
      return boundedInteger(value, fallback, maximum, field, minimum);
    } catch (error) {
      if (error?.code !== 'LS_BOUND_EXCEEDED') throw error;
      throw localValidationError('LS_BOUND_EXCEEDED', 'projection', error.message, {
        field,
        expected: { type: 'integer', minimum, maximum },
        action: `Use ${field} between ${minimum} and ${maximum}; this changes only the bounded model-visible projection.`,
      });
    }
  }

  function validateGraphIdentity(name, kind, phase, retryAction) {
    if (typeof name !== 'string' || !new RegExp(GRAPH_NAME_PATTERN, 'u').test(name)) {
      throw localValidationError('LS_GRAPH_NAME', phase, 'Graph name must be a lowercase symbolic identifier', {
        field: 'name', expected: { type: 'string', pattern: GRAPH_NAME_PATTERN }, action: retryAction,
      });
    }
    if (!GRAPH_KINDS.has(kind)) {
      throw localValidationError('LS_GRAPH_KIND', phase, `Unknown graph kind: ${kind}`, {
        field: 'kind', expected: { enum: [ ...GRAPH_KINDS ] }, action: retryAction,
      });
    }
  }

  function validationIssue(field, message, expected) {
    return Object.assign(new Error(message), { field, expected });
  }

  function ensureActive() {
    if (!active || context.epoch !== epoch) {
      throw runtimeError('LS_STALE_WORKSPACE', 'validation', 'Workspace belongs to a prior runtime epoch', {
        receipt: { status: 'failed', stage: 'validation', workspaceEpoch: epoch, currentEpoch: context.epoch },
        recoveryDocument: 'reset',
      });
    }
  }

  function retain(type, label, value, { provenance, lineage, fingerprints = [], querySource } = {}) {
    ensureActive();
    const id = `h-${String(++handleSequence).padStart(6, '0')}`;
    const handle = publicHandle({ id, type, epoch, label: label ?? id });
    registry.set(id, Object.freeze({
      handle,
      kind: type,
      value,
      querySource,
      provenance: freezeJson(jsonClone(provenance)),
      lineage: freezeJson(jsonClone(lineage)),
      fingerprints: Object.freeze([ ...fingerprints ]),
    }));
    return handle;
  }

  function retainGraph(type, label, quads, options = {}) {
    const perGraphMaximum = runtime.budgets.maxResidentGraphQuads;
    const workspaceMaximum = runtime.budgets.maxWorkspaceGraphQuads;
    if (quads.length > perGraphMaximum || residentGraphQuads + quads.length > workspaceMaximum) {
      const code = quads.length > perGraphMaximum ? 'LS_GRAPH_RESIDENCY_BOUND' : 'LS_WORKSPACE_GRAPH_RESIDENCY_BOUND';
      const maximum = quads.length > perGraphMaximum ? perGraphMaximum : workspaceMaximum;
      const repair = {
        kind: 'linked-science-residency-repair',
        scope: 'operational-residency',
        allowed: true,
        sameCall: false,
        maximum,
        observed: quads.length,
        residentWorkspaceQuads: residentGraphQuads,
        action: 'Use a direct SPARQL subgraph query, choose a smaller source representation, or use a separately authorized durable/bulk route; do not enlarge a model-visible page.',
      };
      throw runtimeError(code, 'graph-residency', 'Graph exceeds the operational resident-state quota', {
        receipt: { status: 'failed', stage: 'graph-residency', code, repair },
        recoveryDocument: 'budgets', retryable: true, repair,
      });
    }
    ensureHeapHeadroom(quads.length * RESIDENT_QUAD_BYTES_ESTIMATE, { stage: 'graph-residency', operation: `indexing ${quads.length} resident quads` });
    const querySource = new Store(quads);
    const handle = retain(type, label, Object.freeze(quads), { ...options, querySource });
    residentGraphQuads += quads.length;
    return handle;
  }

  function resolve(handle, allowedKinds) {
    ensureActive();
    if (!handle || handle[HANDLE_BRAND] !== true || handle.kind !== 'linked-science-handle') {
      throw runtimeError('LS_INVALID_HANDLE', 'validation', 'An opaque Linked Science handle is required');
    }
    if (handle.epoch !== epoch) {
      throw runtimeError('LS_STALE_HANDLE', 'validation', `Handle ${handle.id} belongs to a stale epoch`, {
        receipt: { status: 'failed', stage: 'validation', handle: handle.id, handleEpoch: handle.epoch, currentEpoch: epoch },
        recoveryDocument: 'reset',
      });
    }
    if (released.has(handle)) throw runtimeError('LS_RELEASED_HANDLE', 'validation', `Handle ${handle.id} was released`, { recoveryDocument: 'release' });
    const record = registry.get(handle.id);
    if (!record || record.handle !== handle) throw runtimeError('LS_UNKNOWN_HANDLE', 'validation', `Handle is not resident: ${handle.id}`, { recoveryDocument: 'reset' });
    if (allowedKinds && !allowedKinds.has(record.kind)) throw runtimeError('LS_HANDLE_KIND', 'validation', `Handle kind ${record.kind} is not valid for this operation`);
    return record;
  }

  async function release(value) {
    const handle = value?.handle ?? value;
    const record = resolve(handle);
    registry.delete(handle.id);
    released.add(handle);
    if (GRAPH_KINDS.has(record.kind)) residentGraphQuads -= record.value.length;
    if (isStoredResult(record.value)) await abortStorage(record.value.storageId);
    return Object.freeze({ status: 'released', handle, sourceOperationId: record.provenance.operationId });
  }

  function inventory({ limit, maxBytes } = {}) {
    ensureActive();
    const maximum = projectionInteger(limit, 10, 100, 'limit', 1);
    const byteLimit = projectionInteger(maxBytes, runtime.budgets.maxBytes, runtime.budgets.maxBytes, 'maxBytes', 256);
    const handles = [];
    for (const record of registry.values()) {
      if (handles.length === maximum) break;
      handles.push(record.handle);
    }
    return fitItems(handles, (items, truncated) => ({
      kind: 'linked-science-inventory', contextKey: context.key, epoch,
      total: registry.size, residentGraphQuads, handles: items,
      truncated: truncated || items.length < registry.size,
    }), byteLimit);
  }

  function dispose() {
    if (disposal) return disposal;
    const count = registry.size;
    if (active) {
      active = false;
      registry.clear();
      residentGraphQuads = 0;
      context.generation += 1;
      context.epoch = `${runtime.runtimeId}:${context.key}:${context.generation}`;
      context.workspace = undefined;
    }
    disposal = (async () => {
      await Promise.allSettled([ ...pendingAllocations ]);
      const results = await Promise.allSettled([
        ...[ ...storageIds ].map(abortStorage),
        ...[ ...traversalIds ].map(async traversalId => {
          await runtime.traversal.abortTraversal(traversalId, 'workspace-disposed');
          traversalIds.delete(traversalId);
        }),
      ]);
      const failed = results.find(result => result.status === 'rejected');
      if (failed) throw wrapError(failed.reason, 'LS_WORKSPACE_CLEANUP', 'disposal');
      return Object.freeze({ status: 'disposed', contextKey: context.key, epoch, releasedHandles: count });
    })();
    disposal.catch(() => { disposal = undefined; }); // permit an explicit cleanup retry
    return disposal;
  }

  // Serialize only orientation mutations, not scientific work or transport.
  function orientationSerial(operation) {
    const next = (context.orientation.pending ?? Promise.resolve()).then(operation);
    context.orientation.pending = next.catch(() => {});
    return next;
  }

  function sourceReference(handle, record, role) {
    const resource = RESOURCE_KINDS.has(record.kind);
    const source = resource ? record.value.url : record.provenance.resourceProvenance?.resource?.requestedUrl
      ?? record.provenance.source?.id ?? handle.label;
    return {
      kind: 'linked-science-context-reference', source,
      sourceKey: `ls-context:${compactHash(`${record.kind}\0${source}`).slice(0, 24)}`,
      version: resource ? record.value.sha256 : record.fingerprints.at(-1) ?? compactHash(record.value),
      role: role ?? handle.label, type: record.kind,
      provenanceScope: record.provenance.source?.kind ?? (record.provenance.localOnly === false ? 'retrieved-representation' : 'local'),
      operationId: record.provenance.operationId,
      ...(resource ? { mediaType: record.value.mediaType } : {}),
      count: Array.isArray(record.value) ? record.value.length : 1,
      handle: handle.id, handleEpoch: epoch, contextKey: context.key,
    };
  }

  function envelope(entry) {
    try { return JSON.parse(entry.text); } catch { return {}; }
  }

  async function orientationEntries() {
    if (runtime.peek) return (await runtime.peek.current(context.orientation.key)).entries ?? [];
    if (!context.orientation.map) return [];
    return Object.entries(context.orientation.map.sections).flatMap(([section, items]) => items.map(item => {
      if (item.kind === 'context-envelope') return { id: item.key, section, text: item.value.json, score: item.priority / 100 };
      const value = item.value;
      const reference = { kind: 'linked-science-context-reference', ...value, handleEpoch: value['handle-epoch'], contextKey: value['context-key'] };
      return { id: item.id, section, text: JSON.stringify(reference), score: item.priority / 100 };
    }));
  }

  async function applyOrientationEdits(edits) {
    if (runtime.peek) return (await runtime.peek.edit(context.orientation.key, edits)).entries ?? [];
    let map = context.orientation.map ?? createOrientationMap({ contextId: context.orientation.key });
    for (const edit of edits) {
      if (edit.action === 'DELETE') map = deleteOrientation(map, edit.id);
      else map = recordOrientation(map, {
        section: edit.entry.section, key: edit.entry.id, kind: 'context-envelope',
        value: { json: edit.entry.text }, priority: Math.round(edit.entry.score * 100),
      });
    }
    context.orientation.map = map; // publish only after the entire batch validates
    return orientationEntries();
  }

  async function updateOrientationForHandle(handle, record, role) {
    if (RESULT_KINDS.has(record.kind)) return;
    try {
      await orientationSerial(async () => {
        resolve(handle);
        const reference = sourceReference(handle, record, role);
        const entries = await orientationEntries();
        const edits = [];
        for (const entry of entries) {
          const value = envelope(entry);
          if (value.kind === 'linked-science-semantic-entry' && value.dependencies.some(dep => dep.sourceKey === reference.sourceKey && dep.version !== reference.version)) {
            edits.push({ action: 'REPLACE', id: entry.id, entry: { ...entry, text: JSON.stringify({ ...value, dependencyStatus: 'dependency-changed' }) } });
          }
        }
        const schema = ['ontology', 'schema', 'shacl'].includes(record.kind);
        edits.push({ action: 'ADD', entry: { id: reference.sourceKey, section: schema ? 'parsing-schema' : 'context-roadmap', text: JSON.stringify(reference), score: schema ? 0.8 : 0.7 } });
        resolve(handle);
        await applyOrientationEdits(edits);
        context.orientation.failure = undefined;
      });
    } catch (error) {
      // An optional cache failure must not hide successfully retained evidence.
      context.orientation.failure = { status: 'update-failed', code: error.code ?? 'LS_ORIENTATION_UNAVAILABLE' };
    }
    resolve(handle); // lifetime failure remains an error even when the cache is optional
  }

  async function orientationUpdate(input = {}) {
    const edits = input?.edits;
    try {
      return await orientationSerial(async () => {
        ensureActive();
        if (!Array.isArray(edits) || !edits.length || edits.length > 4) throw validationIssue('edits', 'Supply one to four edits');
        if (context.orientation.failure) return { ...context.orientation.failure, status: 'unavailable' };
        const before = await orientationEntries();
        const targets = new Map(before.map(entry => [entry.id, entry]));
        const operations = [], evidenceHandles = [], dependencies = [];
        for (const edit of edits) {
          const id = edit?.id;
          if (typeof id !== 'string' || !/^ls-semantic:[a-z0-9-]{1,64}$/.test(id) || !['ADD','REPLACE','DELETE'].includes(edit.action)) throw validationIssue('edit', 'Use a semantic ID and ADD/REPLACE/DELETE');
          if (operations.some(op => (op.id ?? op.entry.id) === id)) throw validationIssue('id', 'One edit per ID per batch');
          if (edit.action !== 'ADD' && !targets.has(id)) throw validationIssue('id', 'Replacement/deletion target is absent');
          if (edit.action === 'ADD' && targets.has(id)) throw validationIssue('id', 'Use REPLACE for an existing entry');
          if (edit.action === 'DELETE') { operations.push({ action: 'DELETE', id }); continue; }
          const input = edit.entry;
          if (!input || typeof input.text !== 'string' || !input.text.trim() || Buffer.byteLength(input.text) > 1024 || input.section !== 'context-understanding' ||
              !['observed-relationship','documented-meaning','interpretation'].includes(input.claimKind) || !Array.isArray(input.evidence) || !input.evidence.length || input.evidence.length > 8) throw validationIssue('entry', 'Supply bounded understanding text, claim kind and native quad evidence');
          try { assertSymbolicValue(input.text); } catch { throw validationIssue('text', 'Keep orientation prose compact and exclude raw query text'); }
          const evidence = [], deps = new Map();
          let quadCount = 0;
          for (const cited of input.evidence) {
            if (!cited || typeof cited !== 'object') throw validationIssue('evidence', 'Supply a handle and native quads');
            const record = resolve(cited.handle, new Set([...GRAPH_KINDS, 'quads']));
            if (!Array.isArray(cited.quads) || !cited.quads.length || (quadCount += cited.quads.length) > 8 || cited.quads.some(quad => !isQuad(quad))) throw validationIssue('evidence', 'Cite one to eight native RDF/JS quads');
            const quads = cited.quads.map(copyQuad);
            const source = rdfSource(cited.handle);
            for (const quad of quads) if (!await source.countQuads(quad.subject, quad.predicate, quad.object, quad.graph)) throw validationIssue('evidence', 'Cited quad is absent from this handle');
            evidenceHandles.push(cited.handle);
            const sources = GRAPH_KINDS.has(record.kind) ? [record] : (record.provenance.sourceHandles ?? []).map(id => registry.get(id));
            if (!sources.length || sources.some(item => !item || !GRAPH_KINDS.has(item.kind))) throw validationIssue('evidence', 'Cite resident primary graphs; this result lineage is unsupported');
            for (const item of sources) {
              const dep = sourceReference(item.handle, item);
              evidenceHandles.push(item.handle);
              if (deps.has(dep.sourceKey) && deps.get(dep.sourceKey).version !== dep.version) throw validationIssue('evidence', 'Do not mix source versions in one entry');
              deps.set(dep.sourceKey, { sourceKey: dep.sourceKey, source: dep.source, version: dep.version, provenanceScope: dep.provenanceScope });
            }
            evidence.push({ handle: cited.handle.id, handleEpoch: epoch, contextKey: context.key, operationId: record.provenance.operationId, quads: quads.map(serializeQuad) });
          }
          if (deps.size > 8) throw validationIssue('evidence', 'At most eight source dependencies');
          dependencies.push(...deps.values());
          const value = { kind: 'linked-science-semantic-entry', text: input.text.trim(), claimKind: input.claimKind,
            validation: 'references-checked', semanticStatus: 'agent-proposed', dependencyStatus: 'observed-version',
            dependencies: [...deps.values()], evidence };
          const text = JSON.stringify(value);
          if (Buffer.byteLength(text) > 8192) throw validationIssue('entry', 'Serialized entry exceeds 8 KiB');
          operations.push({ action: edit.action, id, entry: { id, section: input.section, text, score: 0.5 } });
        }
        if (byteLength(operations) > Math.min(16384, runtime.budgets.maxBytes)) throw validationIssue('edits', 'Serialized edit batch exceeds its byte budget');
        // Recheck after asynchronous native membership reads, before publication.
        const latest = new Map((await orientationEntries()).map(entry => [entry.id, envelope(entry)]));
        evidenceHandles.forEach(handle => resolve(handle));
        for (const dep of dependencies) if (latest.get(dep.sourceKey)?.version !== dep.version) throw validationIssue('evidence', 'Source version is changed or no longer observed in the map');
        ensureActive();
        const after = await applyOrientationEdits(operations);
        const present = new Set(after.map(entry => entry.id));
        const deleted = new Set(operations.filter(op => op.action === 'DELETE').map(op => op.id));
        const evicted = [...new Set([...before.map(entry => entry.id), ...operations.filter(op => op.action !== 'DELETE').map(op => op.id)])].filter(id => !present.has(id) && !deleted.has(id));
        return freezeJson({ status: 'applied', accepted: operations.map(op => op.id), evicted: evicted.slice(0, 8), evictedCount: evicted.length });
      });
    } catch (error) {
      return Object.freeze({ status: error.field || error instanceof LinkedScienceRuntimeError ? 'rejected' : 'unavailable', code: error.code ?? 'LS_ORIENTATION_PROPOSAL', field: error.field ?? 'orientation' });
    }
  }

  async function loadGraph({ name, kind, quads, text, format = 'text/turtle', source = { kind: 'local-synthetic', id: name } } = {}) {
    ensureActive();
    validateGraphIdentity(name, kind, 'graph-load', 'Correct the graph name or kind and call graphs.load again; no live request is involved.');
    if (!source || source.kind !== 'local-synthetic' || typeof source.id !== 'string' || source.id.length === 0) {
      throw localValidationError('LS_LOCAL_ONLY', 'graph-load', 'Direct graph loading accepts only explicit local-synthetic sources', {
        field: 'source', expected: { kind: 'local-synthetic', id: '<non-empty string>' }, action: 'Use an explicit local-synthetic source or acquire a public resource through workspace.resources.get.',
      });
    }
    if ((quads === undefined) === (text === undefined)) throw localValidationError('LS_GRAPH_INPUT', 'graph-load', 'Supply exactly one of quads or text', {
      field: 'quads|text', expected: { exactlyOneOf: [ 'quads', 'text' ] }, action: 'Correct the local input and call graphs.load again.',
    });
    ensureHeapHeadroom(
      text !== undefined ? Buffer.byteLength(typeof text === 'string' ? text : '') * TEXT_PARSE_EXPANSION : (Array.isArray(quads) ? quads.length : 0) * RESIDENT_QUAD_BYTES_ESTIMATE,
      { stage: 'graph-load', operation: 'parsing and retaining the local graph' },
    );
    let materialized;
    try {
      if (text !== undefined) {
        if (typeof text !== 'string' || Buffer.byteLength(text) > runtime.budgets.maxResidentResourceBytes) throw new Error(`RDF text exceeds the ${runtime.budgets.maxResidentResourceBytes}-byte operational residency ceiling`);
        materialized = new RdfParser({ format }).parse(text);
      } else {
        if (!Array.isArray(quads) || quads.some(item => !isQuad(item))) throw new Error('quads must be an array of RDF/JS quads');
        materialized = quads.map(copyQuad);
      }
    } catch (error) {
      throw wrapError(error, 'LS_GRAPH_PARSE', 'graph-load');
    }
    const operationId = nextOperation();
    const fingerprint = quadFingerprint(materialized);
    const provenance = { operationId, source: { ...source }, sourceFingerprint: fingerprint, localOnly: true };
    const handle = retainGraph(kind, name, materialized, {
      provenance,
      lineage: { kind: 'materialized-local-graph', operationId },
      fingerprints: [ fingerprint ],
    });
    await updateOrientationForHandle(handle, resolve(handle), name);
    resolve(handle);
    return handle;
  }

  async function runQuery({ sparql, sources, role } = {}, expectedType) {
    ensureActive();
    const operationId = nextOperation();
    const queryValidationError = (message, { field, expected, action } = {}) => wrapError(
      localValidationError('LS_QUERY_PREFLIGHT', 'query-preflight', message, {
        field,
        expected,
        action: action ?? 'Correct the local query call and invoke it again; no live request was made.',
      }),
      'LS_QUERY_PREFLIGHT',
      'query-preflight',
      { operationId },
    );
    let parsed;
    if (typeof sparql !== 'string' || sparql.length === 0 || sparql.length > runtime.budgets.maxQueryChars) {
      throw queryValidationError('SPARQL is missing or exceeds the query character bound', {
        field: 'sparql',
        expected: { type: 'string', minLength: 1, maxLength: runtime.budgets.maxQueryChars },
      });
    }
    try {
      parsed = new SparqlParser().parse(sparql);
    } catch (error) {
      throw queryValidationError(error.message, {
        field: 'sparql',
        expected: { syntax: 'valid SPARQL 1.1 query' },
      });
    }
    if (parsed.type !== 'query' || !QUERY_TYPES.has(parsed.queryType)) {
      throw queryValidationError('Only read query forms are supported', {
        field: 'sparql',
        expected: { queryType: [ ...QUERY_TYPES ] },
      });
    }
    if (expectedType && parsed.queryType !== expectedType) {
      throw queryValidationError(`Expected ${expectedType}, received ${parsed.queryType}`, {
        field: 'sparql',
        expected: { queryType: expectedType },
      });
    }
    if (findAlgebraOperation(parsed, 'service')) {
      throw queryValidationError('SERVICE is not available in the local-only runtime', {
        field: 'sparql',
        expected: { serviceClauses: 0, sources: 'workspace graph handles' },
        action: 'Remove SERVICE and supply resident graph handles through sources; no live request was made.',
      });
    }
    if (!Array.isArray(sources) || sources.length === 0 || sources.length > 20) {
      throw queryValidationError('One to twenty graph handles are required', {
        field: 'sources',
        expected: { type: 'array', minItems: 1, maxItems: 20, items: 'resident graph handle' },
      });
    }
    const sourceRecords = sources.map(handle => resolve(handle, new Set([ ...GRAPH_KINDS, 'quads' ])));
    const querySources = [ combinedQuerySource(sourceRecords.map(engineSource)) ];
    let kind;
    let value;
    let execution;
    try {
      execution = prepareQueryExecution(sparql, parsed);
      if (parsed.queryType === 'SELECT') {
        kind = 'bindings';
        value = await collectBindingsResult(await engine.queryBindings(execution.sparql, { sources: querySources }), {
          resultStorage,
          inMemoryMaximum: runtime.budgets.maxResultItems,
          fallbackMaximum: runtime.budgets.maxResultItems,
          code: 'LS_QUERY_RESULT_RESIDENCY_BOUND',
          stage: 'query-residency',
        });
      } else if (parsed.queryType === 'ASK') {
        kind = 'boolean';
        value = await engine.queryBoolean(execution.sparql, { sources: querySources });
      } else {
        kind = 'quads';
        const stream = await engine.queryQuads(execution.sparql, { sources: querySources });
        value = await collectQuadResult(stream, {
          resultStorage,
          inMemoryMaximum: runtime.budgets.maxResultItems,
          fallbackMaximum: runtime.budgets.maxWorkspaceGraphQuads,
          code: 'LS_QUERY_RESULT_RESIDENCY_BOUND',
          stage: 'query-residency',
        });
      }
      ensureActive();
      sources.forEach(handle => resolve(handle));
    } catch (error) {
      if (isStoredResult(value)) await abortStorage(value.storageId);
      throw wrapError(error, 'LS_QUERY_EXECUTION', 'query-execution', { operationId });
    }
    const querySha256 = compactHash(sparql);
    const completion = queryCompletion(parsed.queryType, execution);
    const fingerprints = sourceRecords.flatMap(record => record.fingerprints);
    const provenance = {
      operationId,
      localOnly: true,
      queryType: parsed.queryType,
      querySha256,
      completion,
      ...(parsed.queryType === 'DESCRIBE' ? {
        executionQueryType: execution.executionQueryType,
        executionQuerySha256: execution.executionQuerySha256,
        descriptionPolicy: execution.descriptionPolicy,
      } : {}),
      sourceHandles: sources.map(handle => handle.id),
      sourceFingerprints: fingerprints,
    };
    const querySource = kind === 'quads' ? querySourceForQuads(value) : undefined;
    const handle = retain(kind, role ?? 'query-result', value, {
      provenance,
      lineage: { kind: 'communica-query', operationId, sourceHandles: sources.map(item => item.id), querySha256, completion, ...(execution.executionQuerySha256 ? { executionQuerySha256: execution.executionQuerySha256 } : {}) },
      fingerprints,
      querySource,
    });
    await updateOrientationForHandle(handle, resolve(handle), role);
    resolve(handle);
    return handle;
  }

  async function loadEvidence({ name, document, source = { kind: 'declarative-resource-manifest', id: name } } = {}) {
    ensureActive();
    if (typeof name !== 'string' || !/^[a-z][a-z0-9-]{1,63}$/u.test(name)) {
      throw localValidationError('LS_EVIDENCE', 'evidence-load', 'Evidence name must be a lowercase symbolic identifier', {
        field: 'name', expected: { type: 'string', pattern: '^[a-z][a-z0-9-]{1,63}$' }, action: 'Correct name and call evidence.load again.',
      });
    }
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      throw localValidationError('LS_EVIDENCE', 'evidence-load', 'Evidence document must be a declarative object', {
        field: 'document', expected: { type: 'object', array: false }, action: 'Supply the declarative object and call evidence.load again.',
      });
    }
    const normalizedSource = typeof source === 'string' ? { kind: 'local-documentation', id: source } : source;
    if (!normalizedSource || ![ 'declarative-resource-manifest', 'local-documentation' ].includes(normalizedSource.kind) || typeof normalizedSource.id !== 'string' || normalizedSource.id.length < 1 || normalizedSource.id.length > 2_048) {
      throw localValidationError('LS_EVIDENCE', 'evidence-load', 'The optional source field must be a local provenance label or supported { kind, id } object', {
        field: 'source',
        expected: {
          optional: true,
          string: '<local provenance label>',
          oneOf: [
            { kind: 'declarative-resource-manifest', id: '<non-empty string>' },
            { kind: 'local-documentation', id: '<non-empty string>' },
          ],
          omittedDefault: { kind: 'declarative-resource-manifest', id: '<name>' },
        },
        action: 'Normally omit source and call evidence.load({ name, document }); otherwise use a provenance label or one accepted { kind, id } object.',
      });
    }
    if (byteLength(document) > runtime.budgets.maxBytes) {
      throw localValidationError('LS_EVIDENCE_BOUND', 'evidence-load', 'Evidence document exceeds the runtime byte bound', {
        field: 'document', expected: { maxBytes: runtime.budgets.maxBytes }, action: 'Select a smaller declarative evidence document without removing required provenance.',
      });
    }
    const operationId = nextOperation();
    const evidenceSha256 = compactHash(document);
    const handle = retain('evidence', name, freezeJson(jsonClone(document)), {
      provenance: { operationId, source: { ...normalizedSource }, evidenceSha256, localOnly: true },
      lineage: { kind: 'declarative-evidence', operationId, evidenceSha256 },
      fingerprints: [ evidenceSha256 ],
    });
    await updateOrientationForHandle(handle, resolve(handle), name);
    resolve(handle);
    return handle;
  }

  function validateMediatedQueryOptions({ sparql, sources, negotiation = {} } = {}) {
    if (typeof sparql !== 'string' || sparql.length < 1 || sparql.length > runtime.budgets.maxQueryChars) {
      throw validationIssue('sparql', 'SPARQL is missing or exceeds the query character bound', { type: 'string', minLength: 1, maxLength: runtime.budgets.maxQueryChars });
    }
    let parsed;
    try { parsed = new SparqlParser().parse(sparql); } catch (error) {
      throw validationIssue('sparql', `SPARQL is malformed: ${error.message}`, { queryTypes: [ ...QUERY_TYPES ], readOnly: true });
    }
    if (parsed.type !== 'query' || !QUERY_TYPES.has(parsed.queryType)) throw validationIssue('sparql', 'Only SELECT, ASK, CONSTRUCT, and DESCRIBE are supported', { queryTypes: [ ...QUERY_TYPES ], readOnly: true });
    if (!Array.isArray(sources) || sources.length < 1 || sources.length > 20) throw validationIssue('sources', 'One to twenty anonymous HTTP/HTTPS source IRIs are required', { type: 'array', minItems: 1, maxItems: 20 });
    const defaultNegotiation = normalizeNegotiation(negotiation);
    const sourceNegotiations = new Map();
    const mediatedSources = sources.map(source => {
      const descriptor = typeof source === 'string' ? undefined : source;
      if (descriptor && (typeof descriptor.value !== 'string' || Object.keys(descriptor).some(key => ![ 'type', 'value', 'negotiation' ].includes(key)) || (descriptor.type !== undefined && descriptor.type !== 'sparql'))) {
        throw validationIssue('sources[]', "Traversal source descriptors may contain only { value, negotiation? } or { type: 'sparql', value }", { oneOf: [ '{ value, negotiation? }', "{ type: 'sparql', value }", 'HTTP/HTTPS IRI string' ] });
      }
      if (descriptor?.type === 'sparql' && descriptor.negotiation !== undefined) throw validationIssue('sources[].negotiation', 'Document profile negotiation cannot be applied to a SPARQL service source', { omittedForTypedSparqlSource: true });
      let url;
      try { url = new URL(descriptor?.value ?? source); } catch {
        throw validationIssue('sources[]', 'Traversal sources must be absolute credential-free HTTP or HTTPS IRIs', { schemes: [ 'http', 'https' ], credentials: false });
      }
      if (![ 'http:', 'https:' ].includes(url.protocol) || url.username || url.password) throw validationIssue('sources[]', 'Traversal sources must be credential-free HTTP or HTTPS IRIs', { schemes: [ 'http', 'https' ], credentials: false });
      if (descriptor?.type !== 'sparql') sourceNegotiations.set(url.href, descriptor?.negotiation === undefined ? defaultNegotiation : normalizeNegotiation(descriptor.negotiation));
      return descriptor?.type === 'sparql' ? Object.freeze({ type: 'sparql', value: url.href }) : url.href;
    });
    if ([ ...defaultNegotiation ].length > 0 && sourceNegotiations.size === 0) throw validationIssue('negotiation', 'Top-level document negotiation requires at least one document source; SPARQL services do not inherit document negotiation headers', { appliesTo: 'document sources only' });
    return { parsed, mediatedSources, sourceNegotiations };
  }

  function resolveEvidence(evidence = []) {
    if (!Array.isArray(evidence) || evidence.length > 20) {
      throw localValidationError('LS_EVIDENCE', 'traversal-preflight', 'evidence must be an array of at most twenty resident handles', { field: 'evidence', expected: { type: 'array', maxItems: 20 } });
    }
    return evidence.map(handle => resolve(handle, new Set([ ...EVIDENCE_KINDS, ...RESULT_KINDS, ...GRAPH_KINDS ])));
  }

  function recordMediatedAttempt(attempt) {
    mediatedAttempts.push(freezeJson(jsonClone(attempt)));
    if (mediatedAttempts.length > ATTEMPT_HISTORY_LIMIT) mediatedAttempts.shift();
  }

  function traversalHistory({ limit = 20 } = {}) {
    ensureActive();
    if (!Number.isInteger(limit) || limit < 1 || limit > ATTEMPT_HISTORY_LIMIT) {
      throw localValidationError('LS_HISTORY_LIMIT', 'traversal-history', 'history limit must be a bounded positive integer', { field: 'limit', expected: { minimum: 1, maximum: ATTEMPT_HISTORY_LIMIT } });
    }
    const start = Math.max(0, mediatedAttempts.length - limit);
    return freezeJson({ kind: 'linked-science-mediated-attempt-history', attempts: mediatedAttempts.slice(start), truncated: attemptSequence > mediatedAttempts.length || start > 0, retained: mediatedAttempts.length, total: attemptSequence, limit });
  }

  async function traverseQuery({ sparql, sources, negotiation = {}, role, evidence = [], budgets = {} } = {}) {
    ensureActive();
    if (!runtime.traversal || !runtime.traversalCapabilities) {
      throw runtimeError('LS_TRAVERSAL_UNAVAILABLE', 'traversal-preflight', 'No clean-room traversal mediator is available', { retryable: true, recoveryDocument: 'security' });
    }
    const operationId = nextOperation();
    let parsed;
    let mediatedSources;
    let sourceNegotiations;
    let evidenceRecords;
    try {
      ({ parsed, mediatedSources, sourceNegotiations } = validateMediatedQueryOptions({ sparql, sources, negotiation }));
      evidenceRecords = resolveEvidence(evidence);
    } catch (error) {
      if (error instanceof LinkedScienceRuntimeError) throw error;
      throw localValidationError('LS_TRAVERSAL_PREFLIGHT', 'traversal-preflight', error.message, { field: error.field ?? 'options', expected: error.expected, action: 'Correct the call and invoke traversal.query again; no live request was made.' });
    }
    let traversalId;
    let effectiveBudgets;
    let pendingStoredResult;
    const attemptIndex = ++attemptSequence;
    const querySha256 = compactHash(sparql);
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    try {
      let begun;
      try {
        begun = await beginTraversal({ ...budgets, maxQueryChars: Math.min(budgets.maxQueryChars ?? runtime.budgets.maxQueryChars, runtime.budgets.maxQueryChars), maxResultItems: Math.min(budgets.maxResultItems ?? runtime.budgets.maxResultItems, runtime.budgets.maxResultItems) });
      } catch (error) {
        if (error?.code !== 'MEDIATOR_BUDGET_INVALID') throw error;
        throw localValidationError('LS_TRAVERSAL_BUDGET', 'traversal-preflight', error.message, { field: 'budgets', expected: { boundedBy: runtime.traversalCapabilities.hardBudgets }, action: 'Correct budgets and invoke traversal.query again; no live request was made.' });
      }
      traversalId = begun.traversalId;
      effectiveBudgets = begun.effectiveBudgets;
      const mediatedFetch = runtime.traversal.createFetch(traversalId);
      const fetch = (input, init = {}) => {
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        for (const [ key, value ] of new Headers(init.headers).entries()) headers.set(key, value);
        const method = String(init.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
        const requestUrl = input instanceof Request ? input.url : new URL(input).href;
        const sourceHeaders = method === 'GET' || method === 'HEAD' ? sourceNegotiations.get(requestUrl) : undefined;
        if (sourceHeaders) for (const [ key, value ] of sourceHeaders.entries()) headers.set(key, value);
        return mediatedFetch(input, { ...init, headers });
      };
      const queryContext = {
        sources: mediatedSources,
        fetch,
        httpTimeout: effectiveBudgets.maxRequestMs,
        httpBodyTimeout: true,
        httpRetryCount: 0,
        httpRetryBodyCount: 0,
        httpCache: false,
        readOnly: true,
      };
      let kind;
      let value;
      const execution = prepareQueryExecution(sparql, parsed);
      if (parsed.queryType === 'SELECT') {
        kind = 'bindings';
        value = await collectBindingsResult(await engine.queryBindings(execution.sparql, queryContext), {
          resultStorage,
          inMemoryMaximum: effectiveBudgets.maxResultItems,
          fallbackMaximum: effectiveBudgets.maxResultItems,
          code: 'LS_TRAVERSAL_RESULT_BOUND',
          stage: 'traversal-result',
        });
      } else if (parsed.queryType === 'ASK') {
        kind = 'boolean';
        value = await engine.queryBoolean(execution.sparql, queryContext);
      } else {
        kind = 'quads';
        const stream = await engine.queryQuads(execution.sparql, queryContext);
        value = await collectQuadResult(stream, {
          resultStorage,
          inMemoryMaximum: effectiveBudgets.maxResultItems,
          fallbackMaximum: effectiveBudgets.maxResultItems,
          code: 'LS_TRAVERSAL_RESULT_BOUND',
          stage: 'traversal-result',
        });
      }
      if (isStoredResult(value)) pendingStoredResult = value;
      ensureActive();
      evidence.forEach(handle => resolve(handle));
      const resultItems = resultCount({ kind, value });
      const activeReceipt = await runtime.traversal.snapshotTraversal(traversalId);
      if (activeReceipt?.kind !== 'linked-science-traversal-receipt' || activeReceipt.status !== 'active' || activeReceipt.traversalId !== traversalId) {
        throw runtimeError('LS_TRAVERSAL_RECEIPT', 'traversal-result', 'Traversal mediator returned an invalid aggregate receipt');
      }
      const receipt = await runtime.traversal.finishTraversal(traversalId);
      traversalIds.delete(traversalId);
      const payloadSha256 = isStoredResult(value) ? value.sha256 : kind === 'quads' ? quadFingerprint([ ...value ]) : compactHash(value);
      const navigation = navigationEvidence(receipt);
      const completion = queryCompletion(parsed.queryType, execution);
      const completedAttempt = {
        kind: 'linked-science-mediated-attempt', index: attemptIndex, status: 'success', operationId, traversalId,
        queryType: parsed.queryType, querySha256, sources: mediatedSources, evidenceHandles: evidence.map(handle => handle.id),
        startedAt, endedAt: new Date().toISOString(), durationMs: Date.now() - startedMs,
        budgets: receipt.budgets ?? effectiveBudgets, usage: receipt.usage, resultItems, hiddenRetries: 0, completion,
        ...(execution.executionQuerySha256 ? { executionQueryType: execution.executionQueryType, executionQuerySha256: execution.executionQuerySha256 } : {}),
      };
      recordMediatedAttempt(completedAttempt);
      const provenance = {
        operationId, localOnly: false, mediatedTraversal: true, queryType: parsed.queryType, querySha256,
        completion,
        ...(parsed.queryType === 'DESCRIBE' ? {
          executionQueryType: execution.executionQueryType,
          executionQuerySha256: execution.executionQuerySha256,
          descriptionPolicy: execution.descriptionPolicy,
        } : {}),
        sources: mediatedSources,
        evidenceHandles: evidence.map(handle => handle.id),
        negotiation: Object.fromEntries([ ...sourceNegotiations ].map(([ source, headers ]) => [ source, Object.fromEntries(headers) ])),
        attempt: completedAttempt, traversalReceipt: receipt, navigation, payloadSha256,
      };
      const handle = retain(kind, role ?? 'traversal-result', value, {
        provenance,
        lineage: { kind: 'communica-mediated-traversal', operationId, traversalId, querySha256, evidenceHandles: evidence.map(handle => handle.id), payloadSha256, completion, ...(execution.executionQuerySha256 ? { executionQuerySha256: execution.executionQuerySha256 } : {}) },
        fingerprints: [ ...evidenceRecords.flatMap(record => record.fingerprints), payloadSha256 ],
        querySource: kind === 'quads' ? querySourceForQuads(value) : undefined,
      });
      await updateOrientationForHandle(handle, resolve(handle), role);
      resolve(handle);
      pendingStoredResult = undefined;
      return handle;
    } catch (error) {
      if (pendingStoredResult) {
        try { await abortStorage(pendingStoredResult.storageId); } catch {}
      }
      if (error instanceof LinkedScienceRuntimeError && error.stage === 'traversal-preflight') throw error;
      let traversalReceipt = error.receipt;
      if (traversalId) {
        try { traversalReceipt = await runtime.traversal.snapshotTraversal(traversalId); } catch {}
        try { traversalReceipt = await runtime.traversal.abortTraversal(traversalId, 'query-failed'); traversalIds.delete(traversalId); } catch {}
      }
      const navigation = navigationEvidence(traversalReceipt);
      const failedAttempt = {
        kind: 'linked-science-mediated-attempt', index: attemptIndex, status: 'failed', operationId, traversalId,
        queryType: parsed?.queryType, querySha256, sources: mediatedSources, evidenceHandles: evidence.map(handle => handle.id),
        startedAt, endedAt: new Date().toISOString(), durationMs: Date.now() - startedMs,
        budgets: traversalReceipt?.budgets ?? effectiveBudgets, usage: traversalReceipt?.usage,
        failureCode: error.code ?? 'LS_TRAVERSAL_QUERY', hiddenRetries: 0,
      };
      recordMediatedAttempt(failedAttempt);
      throw wrapError(error, 'LS_TRAVERSAL_QUERY', 'traversal-query', {
        operationId, traversalId, traversalReceipt, navigation, attempt: failedAttempt,
      });
    }
  }

  function resolveResource(value) {
    const handle = value?.handle ?? value;
    return resolve(handle, RESOURCE_KINDS);
  }

  function resourceMetadata(record) {
    const resource = record.value;
    return {
      handle: record.handle,
      ok: resource.status >= 200 && resource.status < 300,
      status: resource.status,
      statusText: resource.statusText,
      url: resource.url,
      redirected: resource.redirected,
      headers: { ...resource.headers },
      mediaType: resource.mediaType,
      bytes: resource.body.length,
      sha256: resource.sha256,
      provenance: record.provenance,
    };
  }

  function resourceResponse(handle) {
    const record = resolve(handle, RESOURCE_KINDS);
    const resource = record.value;
    const current = () => resolve(handle, RESOURCE_KINDS).value;
    return Object.freeze({
      handle,
      ok: resource.status >= 200 && resource.status < 300,
      status: resource.status,
      statusText: resource.statusText,
      url: resource.url,
      redirected: resource.redirected,
      headers: new Headers(resource.headers),
      mediaType: resource.mediaType,
      text: async () => Buffer.from(current().body).toString('utf8'),
      json: async () => {
        try { return JSON.parse(Buffer.from(current().body).toString('utf8')); }
        catch (error) { throw wrapError(error, 'LS_RESOURCE_JSON', 'resource-json', { resource: handle.id }); }
      },
      arrayBuffer: async () => {
        const copy = Buffer.from(current().body);
        return copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength);
      },
      inspect: options => resourceInspect(handle, options),
      rdf: options => retainParsedResourceGraph(handle, options),
    });
  }

  function resourceInspect(value, { as = 'metadata', maxBytes } = {}) {
    const record = resolveResource(value);
    const resource = record.value;
    const byteLimit = projectionInteger(maxBytes, runtime.budgets.maxBytes, runtime.budgets.maxBytes, 'maxBytes', 256);
    if (![ 'metadata', 'text', 'json', 'csv', 'xml', 'binary' ].includes(as)) throw localValidationError('LS_RESOURCE_INSPECT', 'resource-inspect', 'as must be metadata, text, json, csv, xml, or binary', {
      field: 'as', expected: { enum: [ 'metadata', 'text', 'json', 'csv', 'xml', 'binary' ] }, action: 'Select one documented bounded representation and inspect the resident resource again.',
    });
    const metadata = resourceMetadata(record);
    const base = {
      kind: 'linked-science-resource-inspection', representation: as,
      handle: metadata.handle, ok: metadata.ok, status: metadata.status, statusText: metadata.statusText,
      url: metadata.url, redirected: metadata.redirected, headers: metadata.headers, mediaType: metadata.mediaType,
      bytes: metadata.bytes, sha256: metadata.sha256,
      provenance: { operationId: record.provenance.operationId, payloadSha256: record.provenance.payloadSha256, mediatedTraversal: record.provenance.mediatedTraversal },
    };
    if (as === 'metadata') return withByteBounds(base, byteLimit);
    const previewBytes = Math.max(0, Math.min(resource.body.length, Math.max(0, byteLimit - Math.min(byteLimit, byteLength(base)) - 256)));
    const preview = boundedUtf8Prefix(resource.body, previewBytes);
    if (as === 'text') return withByteBounds({ ...base, text: preview, truncated: previewBytes < resource.body.length }, byteLimit);
    if (as === 'binary') return withByteBounds({ ...base, base64: resource.body.subarray(0, Math.min(resource.body.length, 96)).toString('base64'), truncated: resource.body.length > 96 }, byteLimit);
    if (as === 'json') {
      let parsed;
      try { parsed = JSON.parse(Buffer.from(resource.body).toString('utf8')); } catch { parsed = undefined; }
      const summary = Array.isArray(parsed) ? { type: 'array', length: parsed.length } : parsed && typeof parsed === 'object' ? { type: 'object', keys: Object.keys(parsed).slice(0, 32), totalKeys: Object.keys(parsed).length } : { type: typeof parsed };
      return withByteBounds({ ...base, json: summary, text: preview, truncated: previewBytes < resource.body.length }, byteLimit);
    }
    if (as === 'csv') {
      const lines = preview.split(/\r?\n/u).filter(Boolean);
      return withByteBounds({ ...base, csv: { columns: lines[0]?.split(',').map(value => value.trim()).slice(0, 32) ?? [], previewRows: Math.max(0, lines.length - 1) }, text: preview, truncated: previewBytes < resource.body.length }, byteLimit);
    }
    const root = /<\s*([A-Za-z_][\w:.-]*)\b/u.exec(preview)?.[1];
    return withByteBounds({ ...base, xml: { root: root ?? null }, text: preview, truncated: previewBytes < resource.body.length }, byteLimit);
  }

  async function retainParsedResourceGraph(resourceHandle, { name, kind = 'instance-data', format, role } = {}) {
    const resource = resolveResource(resourceHandle);
    validateGraphIdentity(name, kind, 'resource-rdf-parse', 'Correct the option and call resource.rdf or resources.parseRdf again; the resident resource will be reused with no live request.');
    const requestedFormat = format ?? rdfFormatForMediaType(resource.value.mediaType);
    const selectedFormat = normalizeRdfFormat(requestedFormat);
    if (typeof selectedFormat !== 'string') {
      throw localValidationError('LS_RESOURCE_RDF_FORMAT', 'resource-rdf-parse', `Cannot select a supported RDF parser from ${requestedFormat ?? resource.value.mediaType ?? 'the missing Content-Type'}`, {
        field: 'format', expected: { enum: RDF_PARSE_FORMATS, inferredMediaTypes: [ 'text/turtle', 'application/x-turtle', 'application/n-triples', 'application/n-quads', 'application/trig' ] }, action: 'Supply one supported format and retry against the resident resource; no live request is required.',
      });
    }
    ensureHeapHeadroom(resource.value.body.length * TEXT_PARSE_EXPANSION, { stage: 'resource-rdf-parse', operation: 'parsing and retaining the resident RDF representation' });
    let quads;
    try { quads = new RdfParser({ format: selectedFormat }).parse(resource.value.body.toString('utf8')); }
    catch (error) { throw wrapError(error, 'LS_RESOURCE_RDF_PARSE', 'resource-rdf-parse', { resource: resource.handle.id, format: selectedFormat }); }
    const operationId = nextOperation();
    const fingerprint = quadFingerprint(quads);
    const handle = retainGraph(kind, name, quads, {
      provenance: { operationId, localOnly: false, sourceResource: resource.handle.id, format: selectedFormat, sourceFingerprint: fingerprint, resourceProvenance: resource.provenance },
      lineage: { kind: 'resource-rdf-parse', operationId, sourceResource: resource.handle.id, format: selectedFormat },
      fingerprints: [ ...resource.fingerprints, fingerprint ],
    });
    await updateOrientationForHandle(handle, resolve(handle), role ?? name);
    resolve(handle);
    return handle;
  }

  async function retainRdf({ name, dataset, quads, kind = 'instance-data', role, storage = 'resident' } = {}) {
    ensureActive();
    validateGraphIdentity(name, kind, 'rdf-retain', 'Correct the option and call rdf.retain again; no live request is involved.');
    if (!['resident', 'broker'].includes(storage)) throw localValidationError('LS_RDF_RETAIN_STORAGE', 'rdf-retain', 'Storage must be resident or broker', {
      field: 'storage', expected: { enum: ['resident', 'broker'] }, action: 'Choose resident or broker storage and call rdf.retain again.',
    });
    if (storage === 'broker' && !resultStorage) throw runtimeError('LS_RESULT_STORAGE_REQUIRED', 'rdf-retain', 'Explicit broker retention requires broker result storage');
    if ((dataset === undefined) === (quads === undefined)) throw localValidationError('LS_RDF_RETAIN_INPUT', 'rdf-retain', 'Supply exactly one DatasetCore or quad array', {
      field: 'dataset|quads', expected: { exactlyOneOf: [ 'dataset', 'quads' ] }, action: 'Supply exactly one native RDF/JS input and call rdf.retain again.',
    });
    if ((dataset !== undefined && (!dataset || !Number.isInteger(dataset.size) || typeof dataset[Symbol.iterator] !== 'function')) ||
        (dataset === undefined && (!Array.isArray(quads) || quads.some(item => !isQuad(item))))) throw localValidationError('LS_RDF_RETAIN_INPUT', 'rdf-retain', 'DatasetCore or quads must contain RDF/JS quads', {
      field: dataset === undefined ? 'quads' : 'dataset', expected: { rdfjs: 'DatasetCore or quad array' }, action: 'Correct the native RDF/JS input and call rdf.retain again.',
    });
    if (storage === 'broker') {
      const operationId = nextOperation();
      const hash = createHash('sha256');
      // Copy and fingerprint one native quad at a time, including its graph.
      // The collector commits a set; the fingerprint describes the input sequence.
      const input = (function* () {
        for (const item of dataset ?? quads) {
          const quad = copyQuad(item);
          updateQuadFingerprint(hash, quad);
          yield quad;
        }
      })();
      let value;
      try {
        value = await collectQuadResult(input, { resultStorage, forceBroker: true });
        ensureActive();
        const fingerprint = hash.digest('hex');
        return retain('quads', name, value, {
          provenance: { operationId, localOnly: true, source: { kind: 'in-kernel-rdfjs', id: role ?? name }, sourceFingerprint: fingerprint, graphKind: kind, storage },
          lineage: { kind: 'rdfjs-retain', operationId, role: role ?? name },
          fingerprints: [ fingerprint ], querySource: querySourceForQuads(value),
        });
      } catch (error) {
        if (isStoredResult(value)) await abortStorage(value.storageId);
        throw error;
      }
    }
    const count = dataset === undefined ? quads.length : dataset.size;
    ensureHeapHeadroom(count * RESIDENT_QUAD_BYTES_ESTIMATE, { stage: 'rdf-retain', operation: `copying and indexing ${count} in-kernel quads` });
    const materialized = Array.from(dataset ?? quads, copyQuad);
    const operationId = nextOperation();
    const fingerprint = quadFingerprint(materialized);
    const handle = retainGraph(kind, name, materialized, {
      provenance: { operationId, localOnly: true, source: { kind: 'in-kernel-rdfjs', id: role ?? name }, sourceFingerprint: fingerprint },
      lineage: { kind: 'rdfjs-retain', operationId, role: role ?? name }, fingerprints: [ fingerprint ],
    });
    await updateOrientationForHandle(handle, resolve(handle), role ?? name);
    resolve(handle);
    return handle;
  }

  function rdfDataset(handle) {
    const record = resolve(handle, new Set([ ...GRAPH_KINDS, 'quads' ]));
    if (isStoredResult(record.value)) {
      throw runtimeError('LS_STORED_RESULT_DATASET', 'result-storage', 'A broker-stored graph result cannot be copied wholesale into the kernel; inspect it with await results.page()', {
        recoveryDocument: 'results.page', retryable: true,
      });
    }
    const count = GRAPH_KINDS.has(record.kind) ? record.value.length : record.value.size;
    ensureHeapHeadroom(count * RESIDENT_QUAD_BYTES_ESTIMATE, { stage: 'rdf-dataset', operation: `cloning ${count} quads into a native DatasetCore` });
    // N3 iterates its numeric index into fresh RDF/JS terms. No intermediate
    // quad arrays or second term copy are needed for this explicit clone.
    return new Store(GRAPH_KINDS.has(record.kind) ? record.querySource : record.value);
  }

  function rdfSource(handle) {
    const allowed = new Set([ ...GRAPH_KINDS, 'quads' ]);
    resolve(handle, allowed);
    // Capture only the handle. Holding this view does not keep a released
    // record alive or expose the mutable store behind immutable evidence.
    return Object.freeze({
      match(subject, predicate, object, graph) {
        resolve(handle, allowed);
        return Readable.from((async function* () {
          const source = engineSource(resolve(handle, allowed));
          for await (const quad of source.match(subject, predicate, object, graph)) {
            resolve(handle, allowed);
            yield quad;
          }
        })(), { objectMode: true });
      },
      countQuads(subject, predicate, object, graph) {
        const count = engineSource(resolve(handle, allowed)).countQuads(subject, predicate, object, graph);
        return typeof count?.then === 'function'
          ? count.then(value => { resolve(handle, allowed); return value; })
          : count;
      },
    });
  }

  async function getResource(url, { method = 'GET', headers = {}, budgets = {}, role } = {}) {
    ensureActive();
    if (!runtime.traversal || !runtime.traversalCapabilities) throw runtimeError('LS_TRAVERSAL_UNAVAILABLE', 'resource-preflight', 'No clean-room traversal mediator is available', { retryable: true, recoveryDocument: 'security' });
    const requestedMethod = String(method).toUpperCase();
    if (![ 'GET', 'HEAD' ].includes(requestedMethod)) throw runtimeError('LS_EFFECT_DENIED', 'resource-preflight', `Resource ${requestedMethod} is not authorized by the anonymous-public-read effect`, { receipt: { status: 'denied', effect: requestedMethod === 'POST' ? 'mutation-or-arbitrary-post' : 'mutation', method: requestedMethod }, recoveryDocument: 'security' });
    let requestUrl;
    let requestHeaders;
    try {
      requestUrl = new URL(url);
      if (![ 'http:', 'https:' ].includes(requestUrl.protocol) || requestUrl.username || requestUrl.password) throw new Error('Resource URL must be credential-free HTTP or HTTPS');
      requestHeaders = normalizeNegotiation(headers);
    } catch (error) {
      throw localValidationError('LS_RESOURCE_PREFLIGHT', 'resource-preflight', error.message, { field: error.message.includes('URL') ? 'url' : 'headers', action: 'Use a credential-free HTTP/HTTPS URL and only accept, acceptProfile, or prefer headers.' });
    }
    const operationId = nextOperation();
    const attemptIndex = ++attemptSequence;
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    let traversalId;
    let effectiveBudgets;
    try {
      const begun = await beginTraversal({ ...budgets, maxQueryChars: Math.min(budgets.maxQueryChars ?? runtime.budgets.maxQueryChars, runtime.budgets.maxQueryChars), maxResultItems: Math.min(budgets.maxResultItems ?? runtime.budgets.maxResultItems, runtime.budgets.maxResultItems) });
      traversalId = begun.traversalId;
      effectiveBudgets = begun.effectiveBudgets;
      const result = await runtime.traversal.request(traversalId, { url: requestUrl.href, method: requestedMethod, headers: Object.fromEntries(requestHeaders), body: '' });
      const receipt = await runtime.traversal.finishTraversal(traversalId);
      traversalIds.delete(traversalId);
      const body = Buffer.from(result.bodyBase64, 'base64');
      if (body.length > runtime.budgets.maxResidentResourceBytes) {
        const repair = {
          kind: 'linked-science-residency-repair', scope: 'operational-residency', allowed: true, sameCall: false,
          maximum: runtime.budgets.maxResidentResourceBytes, observed: body.length,
          action: 'Use a direct SPARQL subgraph query or request a smaller representation; model-visible projection limits do not change resource admission.',
        };
        throw runtimeError('LS_RESOURCE_RESIDENCY_BOUND', 'resource-residency', 'Resource exceeds the operational resident-byte quota', {
          receipt: { status: 'failed', stage: 'resource-residency', code: 'LS_RESOURCE_RESIDENCY_BOUND', repair }, recoveryDocument: 'budgets', retryable: true, repair,
        });
      }
      const sha256 = createHash('sha256').update(body).digest('hex');
      const completedAttempt = { kind: 'linked-science-resource-attempt', index: attemptIndex, status: 'success', operationId, traversalId, method: requestedMethod, url: requestUrl.href, startedAt, endedAt: new Date().toISOString(), durationMs: Date.now() - startedMs, budgets: receipt.budgets ?? effectiveBudgets, usage: receipt.usage, hiddenRetries: 0 };
      recordMediatedAttempt(completedAttempt);
      const handle = retain('resource', role ?? 'resource-response', Object.freeze({ status: result.status, statusText: result.statusText, url: result.url, redirected: result.redirected, headers: Object.freeze({ ...result.headers }), mediaType: normalizedMediaType(result.headers), body, sha256 }), {
        provenance: { operationId, localOnly: false, mediatedTraversal: true, resource: { requestedUrl: requestUrl.href, method: requestedMethod, headers: Object.fromEntries(requestHeaders) }, attempt: completedAttempt, traversalReceipt: receipt, exchange: result.exchange, navigation: navigationEvidence(receipt), payloadSha256: sha256 },
        lineage: { kind: 'broker-mediated-resource-read', operationId, traversalId, method: requestedMethod, payloadSha256: sha256 }, fingerprints: [ sha256 ],
      });
      await updateOrientationForHandle(handle, resolve(handle), role);
      return resourceResponse(handle);
    } catch (error) {
      let receipt = error.receipt;
      if (traversalId) {
        try { receipt = await runtime.traversal.abortTraversal(traversalId, 'resource-failed'); traversalIds.delete(traversalId); } catch {}
      }
      const failedAttempt = { kind: 'linked-science-resource-attempt', index: attemptIndex, status: 'failed', operationId, traversalId, method: requestedMethod, url: requestUrl?.href, startedAt, endedAt: new Date().toISOString(), durationMs: Date.now() - startedMs, budgets: receipt?.budgets ?? effectiveBudgets, usage: receipt?.usage, failureCode: error.code ?? 'LS_RESOURCE_READ', hiddenRetries: 0 };
      recordMediatedAttempt(failedAttempt);
      throw wrapError(error, 'LS_RESOURCE_READ', 'resource-read', { operationId, traversalId, traversalReceipt: receipt, attempt: failedAttempt, navigation: navigationEvidence(receipt) });
    }
  }

  function resultProfile(handle) {
    const record = resolve(handle, new Set([ ...RESULT_KINDS, ...GRAPH_KINDS, ...EVIDENCE_KINDS, ...RESOURCE_KINDS ]));
    const count = GRAPH_KINDS.has(record.kind) ? record.value.length : EVIDENCE_KINDS.has(record.kind) ? 1 : RESOURCE_KINDS.has(record.kind) ? record.value.body.length : resultCount(record);
    const profile = {
      handle,
      type: record.kind,
      count,
      columns: RESULT_KINDS.has(record.kind) ? columnsFor(record) : undefined,
      fingerprints: [ ...record.fingerprints ],
      lineage: record.lineage,
      provenance: record.provenance,
      completion: record.provenance?.completion,
      residency: GRAPH_KINDS.has(record.kind) ? {
        kind: 'resident-rdf-dataset',
        indexed: typeof record.querySource?.match === 'function',
        scope: 'workspace-epoch',
      } : isStoredResult(record.value) ? {
        kind: 'broker-stored-result',
        backend: record.value.backend,
        bytes: record.value.bytes,
        scope: record.value.durability,
      } : undefined,
    };
    const bounded = withByteBounds(profile, runtime.budgets.maxBytes);
    if (bounded.bounds.bytes > runtime.budgets.maxBytes) throw runtimeError('LS_PROFILE_BYTE_BOUND', 'projection', 'Profile metadata exceeds the runtime byte bound');
    return bounded;
  }

  function resultPage(handle, { offset = 0, limit, columns, maxCells, maxBytes } = {}) {
    const record = resolve(handle, RESULT_KINDS);
    const allColumns = columnsFor(record);
    const selected = columns ?? allColumns;
    if (!Array.isArray(selected) || selected.length === 0 || selected.some(column => !allColumns.includes(column)) || new Set(selected).size !== selected.length) {
      throw localValidationError('LS_COLUMNS', 'projection', 'Columns must be distinct known result columns', {
        field: 'columns', expected: { distinct: true, enum: allColumns }, action: 'Choose distinct columns from the result profile and page the resident result again.',
      });
    }
    const count = resultCount(record);
    const boundedOffset = projectionInteger(offset, 0, count, 'offset');
    const boundedLimit = projectionInteger(limit, runtime.budgets.maxRows, runtime.budgets.maxRows, 'limit');
    const cellLimit = projectionInteger(maxCells, runtime.budgets.maxCells, runtime.budgets.maxCells, 'maxCells', 1);
    const byteLimit = projectionInteger(maxBytes, runtime.budgets.maxBytes, runtime.budgets.maxBytes, 'maxBytes', 256);
    const rowLimit = Math.min(boundedLimit, Math.floor(cellLimit / selected.length));
    const operationId = nextOperation();
    const base = {
      kind: 'linked-science-page',
      operationId,
      source: handle,
      columns: selected,
      offset: boundedOffset,
      total: count,
      provenance: record.provenance,
    };
    const build = values => {
      const projected = values.map(value => rowProjection(record, value, selected));
      return fitItems(projected, (rows, byteTruncated) => ({
        ...base,
        rows,
        truncated: byteTruncated || boundedOffset + rows.length < count,
        bounds: { rows: rows.length, maxRows: boundedLimit, cells: rows.length * selected.length, maxCells: cellLimit },
      }), byteLimit);
    };
    if (isStoredResult(record.value)) {
      return Promise.resolve(resultStorage.page(record.value.storageId, { offset: boundedOffset, limit: rowLimit }))
        .then(page => { resolve(handle, RESULT_KINDS); return build(page.items.map(record.kind === 'bindings' ? deserializeBindingRow : deserializeQuad)); });
    }
    const values = record.kind === 'boolean' ? [ record.value ].slice(boundedOffset, boundedOffset + rowLimit) : retainedItems(record).slice(boundedOffset, boundedOffset + rowLimit);
    return build(values);
  }

  function resultIterate(handle, options = {}) {
    const kinds = new Set([ 'bindings' ]);
    resolve(handle, kinds);
    if (!options || typeof options !== 'object' || Array.isArray(options) || Reflect.ownKeys(options).some(key => key !== 'batchSize')) {
      throw runtimeError('LS_ITERATION_OPTIONS', 'iteration', 'results.iterate options must be an object containing only batchSize');
    }
    const { batchSize = 128 } = options;
    if (!Number.isSafeInteger(batchSize) || batchSize < 1) {
      throw runtimeError('LS_ITERATION_BATCH_SIZE', 'iteration', 'batchSize must be a positive safe integer');
    }
    return (async function* () {
      const record = resolve(handle, kinds);
      const count = resultCount(record);
      const stored = isStoredResult(record.value);
      const limit = stored ? Math.min(batchSize, runtime.resultStorageCapabilities.maxPageItems) : batchSize;
      let offset = 0;
      while (offset < count) {
        resolve(handle, kinds);
        let items;
        if (stored) {
          let page;
          try {
            page = await resultStorage.page(record.value.storageId, { offset, limit: Math.min(limit, count - offset) });
          } finally {
            resolve(handle, kinds);
          }
          if (!Array.isArray(page?.items) || page.items.length === 0 || page.items.length > Math.min(limit, count - offset)) {
            throw runtimeError('LS_STORED_RESULT_INVALID', 'result-storage', 'Stored bindings page did not make bounded progress');
          }
          items = page.items;
        }
        const length = stored ? items.length : Math.min(limit, count - offset);
        for (let index = 0; index < length; index++) {
          resolve(handle, kinds);
          const row = stored ? deserializeBindingRow(items[index]) : record.value[offset + index];
          yield new Map(row.map(({ variable, term }) => [ variable.value, copyTerm(term) ]));
        }
        offset += length;
      }
      resolve(handle, kinds);
    })();
  }

  function resultTable(handle, { title = handle?.label ?? 'Linked Science result', ...options } = {}) {
    if (typeof title !== 'string' || title.length === 0 || title.length > 160) throw localValidationError('LS_TABLE_TITLE', 'projection', 'Table title must be 1-160 characters', {
      field: 'title', expected: { type: 'string', minLength: 1, maxLength: 160 }, action: 'Use a shorter title and render the resident result again.',
    });
    const page = resultPage(handle, options);
    if (typeof page?.then === 'function') return page.then(value => Object.freeze({ ...value, kind: 'table', title }));
    return Object.freeze({ ...page, kind: 'table', title });
  }

  function derivationInput(record) {
    if (isStoredResult(record.value)) {
      throw runtimeError('LS_STORED_RESULT_DERIVATION', 'result-storage', 'Whole-result JavaScript derivation is unavailable for a broker-stored result; inspect bounded pages or issue a semantically narrower query', {
        recoveryDocument: 'results.page', retryable: true,
      });
    }
    if (record.kind === 'bindings') return Object.freeze({ kind: 'bindings', rows: Object.freeze(record.value.map(row => new Map(row.map(({ variable, term }) => [ variable.value, copyTerm(term) ])))) });
    if (record.kind === 'quads') {
      ensureHeapHeadroom(record.value.size * RESIDENT_QUAD_BYTES_ESTIMATE, { stage: 'derivation', operation: `copying ${record.value.size} quads for JavaScript derivation` });
      const quads = [ ...record.value ].map(copyQuad);
      return Object.freeze({ kind: 'quads', dataset: new Store(quads), quads: Object.freeze(quads) });
    }
    if (record.kind === 'boolean') return Object.freeze({ kind: 'boolean', value: record.value });
    return Object.freeze({ kind: 'rows', rows: Object.freeze(record.value.slice()) });
  }

  async function derive(handle, callback, { role } = {}) {
    const source = resolve(handle, RESULT_KINDS);
    if (typeof callback !== 'function') throw runtimeError('LS_DERIVE_CALLBACK', 'derivation', 'results.derive requires one JavaScript callback');
    const operationId = nextOperation();
    let output;
    try {
      output = await callback(derivationInput(source), Object.freeze({ DataFactory }));
    } catch (error) {
      throw wrapError(error, 'LS_DERIVATION_CALLBACK', 'derivation', { operationId, sourceHandle: handle.id });
    }
    resolve(handle, RESULT_KINDS);
    if (!output || !RESULT_KINDS.has(output.kind)) throw runtimeError('LS_INVALID_DERIVATION', 'derivation', 'Callback must return one documented typed result descriptor');
    let value;
    if (output.kind === 'bindings') value = normalizeBindings(output.rows);
    else if (output.kind === 'quads') {
      if (!Array.isArray(output.quads) || output.quads.some(item => !isQuad(item))) throw runtimeError('LS_INVALID_DERIVATION', 'derivation', 'Quad derivation requires RDF/JS quads');
      value = new Store(output.quads.map(copyQuad));
    } else if (output.kind === 'boolean') {
      if (typeof output.value !== 'boolean') throw runtimeError('LS_INVALID_DERIVATION', 'derivation', 'Boolean derivation requires a boolean value');
      value = output.value;
    } else {
      if (!Array.isArray(output.rows) || output.rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw runtimeError('LS_INVALID_DERIVATION', 'derivation', 'Rows derivation requires an array of row objects');
      for (const row of output.rows) {
        if (Object.keys(row).length > 100) throw runtimeError('LS_DERIVATION_BOUND', 'derivation', 'A derived row exceeds 100 cells');
        for (const item of Object.values(row)) projectCell(item);
      }
      value = output.rows.map(row => Object.freeze(Object.fromEntries(Object.entries(row).map(([ key, item ]) => [ key, isRdfTerm(item) ? copyTerm(item) : item ]))));
    }
    const maximum = output.kind === 'quads' ? runtime.budgets.maxWorkspaceGraphQuads : runtime.budgets.maxResultItems;
    const resultItems = output.kind === 'quads' ? value.size : Array.isArray(value) ? value.length : 1;
    if (resultItems > maximum) throw resultResidencyError('LS_DERIVATION_BOUND', 'derivation', maximum, resultItems);
    const callbackSha256 = compactHash(callback.toString());
    const completion = { kind: 'linked-science-result-completion', status: 'complete', complete: true, truncated: false, scope: 'declared-javascript-derivation', materialization: 'atomic-before-handle-publication' };
    const provenance = { ...source.provenance, operationId, derivedFrom: handle.id, callbackSha256, completion };
    const derivedHandle = retain(output.kind, role ?? 'derived-result', value, {
      provenance,
      lineage: { kind: 'javascript-derivation', operationId, sourceHandle: handle.id, callbackSha256, completion },
      fingerprints: source.fingerprints,
    });
    await updateOrientationForHandle(derivedHandle, resolve(derivedHandle), role);
    return derivedHandle;
  }

  function schemaSearch(handle, { text, limit, maxBytes } = {}) {
    const record = resolve(handle, new Set([ 'ontology', 'schema', 'shacl' ]));
    if (typeof text !== 'string' || text.trim().length < 2 || text.length > 160) throw localValidationError('LS_SCHEMA_SEARCH_TEXT', 'schema-search', 'Search text must be 2-160 characters', {
      field: 'text', expected: { type: 'string', minLength: 2, maxLength: 160 }, action: 'Use a bounded search term and search the resident schema again.',
    });
    const boundedLimit = projectionInteger(limit, 10, runtime.budgets.maxSchemaResults, 'limit', 1);
    const byteLimit = projectionInteger(maxBytes, runtime.budgets.maxBytes, runtime.budgets.maxBytes, 'maxBytes', 256);
    const needle = text.toLocaleLowerCase();
    const hits = [];
    for (const quad of record.value) {
      for (const [ position, term ] of [ [ 'subject', quad.subject ], [ 'predicate', quad.predicate ], [ 'object', quad.object ], [ 'graph', quad.graph ] ]) {
        if (term.value.toLocaleLowerCase().includes(needle)) hits.push({ position, term: termDescriptor(term), quad: {
          subject: termDescriptor(quad.subject), predicate: termDescriptor(quad.predicate), object: termDescriptor(quad.object), graph: termDescriptor(quad.graph),
        } });
        if (hits.length >= boundedLimit) break;
      }
      if (hits.length >= boundedLimit) break;
    }
    const operationId = nextOperation();
    return fitItems(hits, (items, byteTruncated) => ({
      kind: 'schema-search', operationId, source: handle, query: text, hits: items,
      truncated: byteTruncated || items.length === boundedLimit,
      provenance: record.provenance,
      bounds: { rows: items.length, maxRows: boundedLimit, cells: items.length, maxCells: boundedLimit },
    }), byteLimit);
  }

  function neighbors(handle, { term, direction = 'both', maxNodes, maxEdges, maxBytes } = {}) {
    const record = resolve(handle, GRAPH_KINDS);
    const focus = typeof term === 'string' ? DataFactory.namedNode(term) : term;
    if (!isRdfTerm(focus) || focus.termType === 'Literal' || ![ 'in', 'out', 'both' ].includes(direction)) {
      throw localValidationError('LS_NEIGHBOR_INPUT', 'graph-neighbors', 'Neighbors require an RDF resource term and direction in/out/both', {
        field: ![ 'in', 'out', 'both' ].includes(direction) ? 'direction' : 'term', expected: { term: 'NamedNode, BlankNode, or Quad term', direction: [ 'in', 'out', 'both' ] }, action: 'Correct the neighborhood selector and inspect the resident graph again.',
      });
    }
    const nodeLimit = projectionInteger(maxNodes, runtime.budgets.maxNodes, runtime.budgets.maxNodes, 'maxNodes', 1);
    const edgeLimit = projectionInteger(maxEdges, runtime.budgets.maxEdges, runtime.budgets.maxEdges, 'maxEdges', 1);
    const byteLimit = projectionInteger(maxBytes, runtime.budgets.maxBytes, runtime.budgets.maxBytes, 'maxBytes', 256);
    const same = candidate => candidate.termType === focus.termType && candidate.value === focus.value;
    const seenNodes = new Map();
    const edges = [];
    let truncatedByShape = false;
    for (const quad of record.value) {
      if (!((direction !== 'in' && same(quad.subject)) || (direction !== 'out' && same(quad.object)))) continue;
      const edge = { subject: termDescriptor(quad.subject), predicate: termDescriptor(quad.predicate), object: termDescriptor(quad.object), graph: termDescriptor(quad.graph) };
      const candidates = [ quad.subject, quad.object ];
      const candidateKeys = candidates.map(termFingerprintPart);
      const additionalNodes = new Set(candidateKeys.filter(key => !seenNodes.has(key))).size;
      if (seenNodes.size + additionalNodes > nodeLimit || edges.length >= edgeLimit) {
        truncatedByShape = true;
        break;
      }
      for (let index = 0; index < candidates.length; index += 1) seenNodes.set(candidateKeys[index], termDescriptor(candidates[index]));
      edges.push(edge);
    }
    const operationId = nextOperation();
    return fitItems(edges, (items, byteTruncated) => {
      const nodeMap = new Map();
      for (const edge of items) {
        nodeMap.set(JSON.stringify(edge.subject), edge.subject);
        nodeMap.set(JSON.stringify(edge.object), edge.object);
      }
      return {
        kind: 'graph-neighborhood', operationId, source: handle, focus: termDescriptor(focus), direction,
        nodes: [ ...nodeMap.values() ].slice(0, nodeLimit), edges: items,
        truncated: byteTruncated || truncatedByShape,
        provenance: record.provenance,
        bounds: { nodes: Math.min(nodeMap.size, nodeLimit), maxNodes: nodeLimit, edges: items.length, maxEdges: edgeLimit },
      };
    }, byteLimit);
  }

  async function orientationBootstrap({ checkpoint, maxItems, maxBytes = Math.min(4096, runtime.budgets.maxBytes) } = {}) {
    ensureActive();
    const byteLimit = projectionInteger(maxBytes, 4096, runtime.budgets.maxBytes, 'maxBytes', 256);
    try {
      return await orientationSerial(async () => {
        if (runtime.peek) {
          if (checkpoint !== undefined) throw runtimeError('LS_BROKER_OWNS_ORIENTATION', 'orientation', 'Broker owns checkpoint restoration');
          if (maxItems !== undefined) await runtime.peek.begin(context.orientation.key, { tokenBudget: Math.max(64, Math.min(32_000, projectionInteger(maxItems, 30, 100, 'maxItems', 1) * 64)) });
        } else if (checkpoint !== undefined) context.orientation.map = recoverOrientationMap(checkpoint);
        else if (!context.orientation.map) context.orientation.map = createOrientationMap({ contextId: context.orientation.key, maxItems: maxItems ?? 30 });
        const entries = await orientationEntries();
        const sources = new Map(entries.map(entry => [entry.id, envelope(entry)]));
        const displayed = entries.map(entry => {
          const value = envelope(entry);
          if (value.kind !== 'linked-science-semantic-entry') return { id: entry.id, section: entry.section, ...value };
          const dependencyStatus = value.dependencyStatus === 'dependency-changed' || value.dependencies.some(dep => sources.has(dep.sourceKey) && sources.get(dep.sourceKey).version !== dep.version)
            ? 'dependency-changed' : value.dependencies.some(dep => { const ref = sources.get(dep.sourceKey); return !ref || ref.contextKey !== context.key || ref.handleEpoch !== epoch || !registry.has(ref.handle); }) ? 'source-not-observed' : 'observed-version';
          return { id: entry.id, section: entry.section, ...value, dependencyStatus,
            evidence: value.evidence.map(item => ({ handle: item.handle, handleEpoch: item.handleEpoch, contextKey: item.contextKey, operationId: item.operationId, quadCount: item.quads.length })),
            residency: value.evidence.map(item => ({ handle: item.handle, status: item.contextKey !== context.key ? 'external-workspace' : item.handleEpoch === epoch && registry.has(item.handle) ? 'resident' : 'stale' })) };
        });
        ensureActive();
        return freezeJson(fitItems(displayed, items => ({ status: context.orientation.failure?.status ?? (entries.length ? 'ready' : 'empty'),
          ...(context.orientation.failure ? { code: context.orientation.failure.code } : {}),
          entries: items, entryCount: entries.length, omittedCount: entries.length - items.length,
          semanticValidation: 'references-only', presentation: 'explicit-tool-result' }), byteLimit));
      });
    } catch (error) {
      return Object.freeze({ status: 'unavailable', code: error.code ?? 'LS_ORIENTATION_UNAVAILABLE', entries: [], entryCount: 0, omittedCount: 0 });
    }
  }

  async function orientationCurrent({ maxBytes } = {}) {
    ensureActive();
    if (runtime.peek) {
      const byteLimit = boundedInteger(maxBytes, runtime.budgets.maxBytes, runtime.budgets.maxBytes, 'maxBytes', 256);
      const current = await runtime.peek.current(context.orientation.key);
      if (byteLength(current) > byteLimit) throw runtimeError('LS_ORIENTATION_BYTE_BOUND', 'orientation', 'Broker PEEK map exceeds the requested byte bound', { retryable: true });
      return freezeJson(jsonClone(current));
    }
    if (!context.orientation.map) throw runtimeError('LS_ORIENTATION_UNINITIALIZED', 'orientation', 'Call orientation.bootstrap() first', { retryable: true });
    const byteLimit = boundedInteger(maxBytes, runtime.budgets.maxBytes, runtime.budgets.maxBytes, 'maxBytes', 256);
    const current = jsonClone(context.orientation.map);
    if (byteLength(current) > byteLimit) throw runtimeError('LS_ORIENTATION_BYTE_BOUND', 'orientation', 'Orientation map exceeds the requested byte bound', { retryable: true });
    return Object.freeze(current);
  }

  async function orientationCommit() {
    ensureActive();
    if (runtime.peek) {
      const map = await runtime.peek.commit(context.orientation.key, { event: 'linked-science-orientation-checkpoint', epoch });
      if (byteLength(map) > runtime.budgets.maxBytes) throw runtimeError('LS_ORIENTATION_BYTE_BOUND', 'orientation', 'Broker PEEK map exceeds the runtime byte bound', { retryable: true });
      return Object.freeze({
        kind: 'orientation-checkpoint-receipt',
        contextKey: context.key,
        epoch,
        brokerOwned: true,
        sha256: compactHash(map),
        entries: Array.isArray(map.entries) ? map.entries.length : 0,
        queryCount: map.queryCount,
      });
    }
    if (!context.orientation.map) throw runtimeError('LS_ORIENTATION_UNINITIALIZED', 'orientation', 'Call orientation.bootstrap() first', { retryable: true });
    const checkpoint = compactOrientationMap(context.orientation.map);
    if (Buffer.byteLength(checkpoint) > runtime.budgets.maxBytes) throw runtimeError('LS_ORIENTATION_BYTE_BOUND', 'orientation', 'Orientation checkpoint exceeds the runtime byte bound', { retryable: true });
    return Object.freeze({ kind: 'orientation-checkpoint', contextKey: context.key, epoch, checkpoint, sha256: compactHash(checkpoint), entries: countOrientationEntries(context.orientation.map) });
  }

  function orientationStatusFromMap(map) {
    const references = (map.entries ?? []).flatMap(entry => {
      if (typeof entry?.id !== 'string' || !/^ls-(?:handle|context):/u.test(entry.id) || typeof entry.text !== 'string') return [];
      try {
        const reference = JSON.parse(entry.text);
        return [ 'linked-science-handle-reference', 'linked-science-context-reference' ].includes(reference?.kind) ? [ reference ] : [];
      } catch {
        return [];
      }
    });
    return Object.freeze({
      status: 'ready',
      owner: runtime.peek ? 'cleanroom-broker' : 'linked-science-runtime',
      contextKey: context.key,
      epoch,
      entries: Array.isArray(map.entries) ? map.entries.length : countOrientationEntries(map),
      handles: references.map(reference => ({
        id: reference.handle,
        epoch: reference.handleEpoch,
        status: reference.contextKey && reference.contextKey !== context.key ? 'external-workspace' : reference.handleEpoch === epoch && registry.has(reference.handle) ? 'resident' : 'stale',
      })),
      note: 'PEEK orientation remains usable; stale references are not resident evidence.',
    });
  }

  async function orientationStatus() {
    ensureActive();
    if (runtime.peek) return orientationStatusFromMap(await runtime.peek.current(context.orientation.key));
    if (!context.orientation.map) return Object.freeze({ status: 'uninitialized', contextKey: context.key, epoch, entries: 0, handles: [] });
    const map = context.orientation.map;
    const entries = Object.values(map.sections).flatMap(entries => entries.map(entry => ({
      id: 'ls-context:' + entry.id, text: entry.kind === 'context-envelope' ? entry.value.json : JSON.stringify({ kind: 'linked-science-context-reference',
        handle: entry.value.handle ?? entry.evidenceHandles[0], handleEpoch: entry.value['handle-epoch'], contextKey: entry.value['context-key'] }),
    })));
    return orientationStatusFromMap({ entries });
  }

  const workspace = {
    contextKey: context.key,
    epoch,
    inventory,
    release,
    dispose,
    graphs: Object.freeze({ load: loadGraph }),
    schema: Object.freeze({ search: schemaSearch }),
    query: Object.freeze({ run: options => runQuery(options), select: options => runQuery(options, 'SELECT') }),
    evidence: Object.freeze({ load: loadEvidence }),
    resources: Object.freeze({ get: getResource, inspect: resourceInspect, parseRdf: retainParsedResourceGraph, history: traversalHistory }),
    rdf: Object.freeze({ DataFactory, source: rdfSource, clone: rdfDataset, dataset: rdfDataset, retain: retainRdf }),
    traversal: Object.freeze({ query: traverseQuery, history: traversalHistory }),
    results: Object.freeze({ derive, profile: resultProfile, page: resultPage, table: resultTable, iterate: resultIterate }),
    graph: Object.freeze({ neighbors }),
    orientation: Object.freeze({ bootstrap: orientationBootstrap, current: orientationCurrent, update: orientationUpdate, commit: orientationCommit, status: orientationStatus }),
  };
  return Object.freeze(workspace);
}

function createFacade({ budgets, orientationCheckpoints = {}, peek, environment, traversal, traversalCapabilityReceipt, resultStorage, resultStorageCapabilityReceipt }) {
  const runtimeId = randomUUID();
  const contexts = new Map();
  const orientationStates = new Map();
  const documentation = docsFunction();
  const { budgets: validatedBudgets, basis: residencyBasis } = applyHeapResidency(validateBudgets(budgets));
  const runtime = {
    runtimeId,
    budgets: validatedBudgets,
    budgetPlanes: budgetPlanes(validatedBudgets, traversalCapabilityReceipt, resultStorageCapabilityReceipt, residencyBasis),
    peek,
    traversal,
    traversalCapabilities: traversalCapabilityReceipt,
    resultStorage,
    resultStorageCapabilities: resultStorageCapabilityReceipt,
  };

  function contextFor(contextKey, orientationContext) {
    if (orientationContext !== undefined && (!orientationContext || typeof orientationContext.id !== 'string' || !orientationContext.id || orientationContext.id.length > 1024 ||
        typeof orientationContext.version !== 'string' || !orientationContext.version || orientationContext.version.length > 160)) {
      throw runtimeError('LS_ORIENTATION_CONTEXT', 'open', 'orientationContext requires a bounded id and version');
    }
    const orientationKey = orientationContext === undefined ? contextKey : `ls-context:${compactHash([orientationContext.id, orientationContext.version]).slice(0, 32)}`;
    if (typeof contextKey !== 'string' || !/^[a-z][a-z0-9-]{1,127}$/u.test(contextKey)) throw runtimeError('LS_CONTEXT_KEY', 'open', 'contextKey must be a lowercase symbolic identifier');
    let context = contexts.get(contextKey);
    if (context && orientationContext !== undefined && context.orientation.key !== orientationKey) {
      throw runtimeError('LS_ORIENTATION_CONTEXT', 'open', 'Use a new workspace contextKey for a different orientation context/version');
    }
    if (!context) {
      const checkpoint = orientationCheckpoints[contextKey]?.checkpoint ?? orientationCheckpoints[contextKey];
      let orientation = orientationStates.get(orientationKey);
      if (!orientation) {
        orientation = { key: orientationKey, map: checkpoint ? recoverOrientationMap(checkpoint) : undefined };
        orientationStates.set(orientationKey, orientation);
      }
      context = {
        key: contextKey,
        generation: 1,
        epoch: `${runtimeId}:${contextKey}:1`,
        orientation,
        workspace: undefined,
      };
      contexts.set(contextKey, context);
    }
    return context;
  }

  const facade = {
    version: RUNTIME_VERSION,
    api: LINKED_SCIENCE_API_SCHEMA,
    documentation,
    capabilities() {
      return Object.freeze({
        runtime: 'linked-science', version: RUNTIME_VERSION, architecture: 'recursive-language-model', actionSpace: 'persistent-model-written-javascript', controlEnvironment: 'persistent-javascript', queryKernel: 'Communica',
        localOnly: !runtime.traversal, mediatedTraversal: Boolean(runtime.traversal), brokerOwnedLive: false, recursion: Boolean(environment?.rlm?.recursion?.available), brokerStoredGraphResults: Boolean(runtime.resultStorage), rawEngineExposed: false, currentJsGuardIsSecuritySandbox: false,
        graphKinds: [ ...GRAPH_KINDS ], resultKinds: [ ...RESULT_KINDS ], resourceKinds: [ ...RESOURCE_KINDS ], budgets: runtime.budgets, budgetPlanes: runtime.budgetPlanes,
        effects: Object.freeze({ 'anonymous-public-read': Boolean(runtime.traversal), 'authenticated-read': false, mutation: false }),
        attempts: Object.freeze({
          retainedHistoryLimit: ATTEMPT_HISTORY_LIMIT,
          explicitAgentAttempts: 'direct-and-receipted',
          budgets: 'per-call',
          hiddenTransportRetries: 0,
        }),
        stableBindings: [ 'linkedScience', 'ls' ], compatibility: [ ...LINKED_SCIENCE_API_SCHEMA.compatibility ],
        traversal: runtime.traversalCapabilities,
        resultStorage: runtime.resultStorageCapabilities,
        environment: environment ? freezeJson(jsonClone(environment)) : Object.freeze({ runtime: 'standalone-node', orientationOwner: 'linked-science-runtime' }),
      });
    },
    examples(topic) {
      if (topic === undefined) return Object.freeze({ topics: Object.keys(EXAMPLES) });
      if (!EXAMPLES[topic]) throw runtimeError('LS_EXAMPLE_NOT_FOUND', 'documentation', `Unknown example topic: ${topic}`, { retryable: true });
      return Object.freeze({ topic, code: EXAMPLES[topic] });
    },
    open({ contextKey, orientationContext } = {}) {
      const context = contextFor(contextKey, orientationContext);
      if (!context.workspace) context.workspace = createWorkspace(runtime, context);
      return context.workspace;
    },
    async reset({ contextKey } = {}) {
      const context = contextFor(contextKey);
      if (context.workspace) await context.workspace.dispose();
      else {
        context.generation += 1;
        context.epoch = `${runtimeId}:${contextKey}:${context.generation}`;
      }
      return Object.freeze({ status: 'reset', contextKey, epoch: context.epoch, orientationRetained: Boolean(runtime.peek || context.orientation.map), orientationOwner: runtime.peek ? 'cleanroom-broker' : 'linked-science-runtime', recoveryDocument: 'reset' });
    },
    compatibility: Object.freeze({
      initializeSession: initializeLinkedDataSession,
      createTableDisplay,
    }),
  };
  Object.defineProperty(facade, FACADE_BRAND, { value: true });
  return Object.freeze(facade);
}

function installStableBinding(nodeRepl, name, value) {
  const existing = Object.getOwnPropertyDescriptor(nodeRepl, name);
  if (existing) {
    if (existing.value === value) return;
    throw runtimeError('LS_GLOBAL_CONFLICT', 'bootstrap', `Global binding already exists: ${name}`);
  }
  Object.defineProperty(nodeRepl, name, { value, enumerable: true, configurable: false, writable: false });
}

export async function setupLinkedScience({ nodeRepl, budgets, orientationCheckpoints, peek, environment, traversal, resultStorage } = {}) {
  if ((!nodeRepl || (typeof nodeRepl !== 'object' && typeof nodeRepl !== 'function')) || !Object.isExtensible(nodeRepl)) {
    throw runtimeError('LS_NODE_REPL_REQUIRED', 'bootstrap', 'setupLinkedScience requires an extensible persistent JavaScript global object');
  }
  const existing = SETUPS.get(nodeRepl);
  if (existing) return existing;
  // Node's REPL exposes a contextified global proxy to evaluated code. Host
  // bootstrap and an explicit in-REPL bootstrap may see different identities.
  if (nodeRepl.linkedScience?.[FACADE_BRAND] === true) return nodeRepl.linkedScience;
  if ((nodeRepl.linkedScience && nodeRepl.linkedScience[FACADE_BRAND] !== true) || (nodeRepl.ls && nodeRepl.ls[FACADE_BRAND] !== true)) {
    throw runtimeError('LS_GLOBAL_CONFLICT', 'bootstrap', 'linkedScience or ls is already occupied');
  }
  if (peek !== undefined && [ 'begin', 'current', 'edit', 'commit' ].some(name => typeof peek?.[name] !== 'function')) {
    throw runtimeError('LS_PEEK_REQUIRED', 'bootstrap', 'The clean-room PEEK adapter must expose begin, current, edit, and commit');
  }
  const traversalCapabilityReceipt = await traversalCapabilities(traversal);
  const resultStorageCapabilityReceipt = await resultStorageCapabilities(resultStorage);
  const facade = createFacade({ budgets, orientationCheckpoints, peek, environment, traversal, traversalCapabilityReceipt, resultStorage, resultStorageCapabilityReceipt });
  installStableBinding(nodeRepl, 'linkedScience', facade);
  installStableBinding(nodeRepl, 'ls', facade);
  SETUPS.set(nodeRepl, facade);
  return facade;
}
