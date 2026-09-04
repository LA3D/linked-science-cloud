import { createHash, randomUUID } from 'node:crypto';
import { QueryEngine } from '@comunica/query-sparql';
import { DataFactory, Parser as RdfParser, Store } from 'n3';
import { translate as translateSparql } from 'sparqlalgebrajs';
import { Generator as SparqlGenerator, Parser as SparqlParser } from 'sparqljs';
import {
  compactOrientationMap,
  createOrientationMap,
  recordOrientation,
  recoverOrientationMap,
} from './orientation-map.mjs';
import { createTableDisplay, initializeLinkedDataSession } from './repl-linked-data-session.mjs';
import { LINKED_SCIENCE_PROJECT_IDENTITY } from './linked-science-project-identity.mjs';

const RUNTIME_VERSION = '6.0.0';
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
    summary: 'Install one stable linkedScience/ls facade in the persistent JavaScript global object.',
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
    constraints: [ 'local/synthetic input only', `name matches ${GRAPH_NAME_PATTERN}`, 'RDF/JS source order and duplicates retained for provenance', 'a private indexed DatasetCore is created once for repeated symbolic queries', 'resident quads and source bytes use operational residency quotas, not projection bounds' ],
  },
  'schema.search': {
    summary: 'Search one ontology, schema, or SHACL graph without exposing the full graph.',
    signature: 'workspace.schema.search(handle, { text, limit?, maxBytes? }) -> bounded observation',
    constraints: [ 'limit <= capability maxSchemaResults', 'orientation only; not the ontology itself' ],
  },
  'query.select': {
    summary: 'Run local-only SELECT through Communica over typed graph handles and retain complete RDF/JS bindings.',
    signature: 'await workspace.query.select({ sparql, sources, role? }) -> result handle',
    constraints: [ 'SPARQL LIMIT is optional caller semantics and is never imposed by the harness', 'successful handles are complete; residency exhaustion fails without a partial handle', 'SERVICE rejected', 'no network sources' ],
  },
  'query.run': {
    summary: 'Run complete-or-fail local SELECT, ASK, CONSTRUCT, or DESCRIBE through Communica.',
    signature: 'await workspace.query.run({ sparql, sources, role? }) -> result handle',
    resultTypes: { SELECT: 'bindings', ASK: 'boolean', CONSTRUCT: 'quads', DESCRIBE: 'quads' },
    constraints: [ 'SPARQL solution modifiers remain query semantics', 'DESCRIBE uses the declared outgoing-subject-triples policy', 'model-visible projection bounds do not change resident results' ],
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
    summary: 'Return a cloned native N3 RDF/JS DatasetCore for ordinary JavaScript or installed-library composition inside the REPL.',
    signature: 'workspace.rdf.dataset(graphOrQuadResultHandle) -> DatasetCore',
  },
  'rdf.retain': {
    summary: 'Retain an RDF/JS DatasetCore or quad array created in the REPL as a graph handle suitable for Communica queries.',
    signature: 'await workspace.rdf.retain({ name, dataset?, quads?, kind?, role? }) -> graph handle',
    constraints: [ `name matches ${GRAPH_NAME_PATTERN}`, 'native RDF/JS terms are copied into the retained registry', 'a private indexed DatasetCore is created once for repeated symbolic queries', 'local JavaScript derivation is recorded automatically' ],
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
    summary: 'Run one model-written JavaScript callback over a retained result and retain its bounded typed output.',
    signature: "await workspace.results.derive(handle, callback, { role? }) -> result handle",
    callbackResult: [ "{ kind: 'bindings', rows }", "{ kind: 'quads', quads }", "{ kind: 'boolean', value }", "{ kind: 'rows', rows }" ],
  },
  'results.profile': {
    summary: 'Inspect handle type, count, completion, lineage, fingerprints, and operation provenance without bulk values.',
    signature: 'workspace.results.profile(handle) -> bounded metadata',
  },
  'results.page': {
    summary: 'Project a bounded page by rows, cells, and bytes while retaining provenance.',
    signature: 'workspace.results.page(handle, { offset?, limit?, columns?, maxCells?, maxBytes? })',
    constraints: [ 'projection bounds are independent of resident graph/result size', 'invalid bounds expose structured zero-request repair' ],
  },
  'results.table': {
    summary: 'Return a bounded table display model from a retained bindings/rows handle.',
    signature: 'workspace.results.table(handle, { title?, offset?, limit?, columns?, maxCells?, maxBytes? })',
  },
  'graph.neighbors': {
    summary: 'Inspect a bounded RDF neighborhood by nodes, edges, and bytes.',
    signature: "workspace.graph.neighbors(handle, { term, direction?, maxNodes?, maxEdges?, maxBytes? })",
  },
  orientation: {
    summary: 'Use the clean-room broker-owned PEEK map for compact orientation, never as the ontology or result store.',
    methods: [ 'await workspace.orientation.bootstrap()', 'await current()', 'await commit()', 'await status()' ],
  },
  reset: {
    summary: 'Reset one context to a new epoch while retaining its compact orientation map.',
    usage: "linkedScience.reset({ contextKey: 'goal-key' })",
    recovery: [ 'open the context again', 'inspect orientation.status()', 'rematerialize only from an authorized source', 'never reuse old handles' ],
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
      residency: [ 'resource body bytes', 'per-graph quads', 'workspace graph quads', 'retained result items' ],
      projection: [ 'rows', 'cells', 'nodes', 'edges', 'schema hits', 'preview bytes' ],
    },
    guidance: [ 'large RDF remains symbolic behind a graph handle', 'query LIMIT is never a residency or projection control', 'a successful query handle is complete and an operational ceiling is a failed attempt', 'HEAD and Content-Length are advisory only', 'use direct remote subgraph queries for one-off slices', 'acquire and index once for repeated local queries' ],
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
  },
  discovery: [ 'documentation', 'documentation.all', 'documentation.get', 'capabilities', 'examples', 'open' ],
  workspace: {
    graphs: [ 'load' ],
    schema: [ 'search' ],
    query: [ 'run', 'select' ],
    evidence: [ 'load' ],
    resources: [ 'get', 'inspect', 'parseRdf', 'history' ],
    rdf: [ 'DataFactory', 'dataset', 'retain' ],
    traversal: [ 'query', 'history' ],
    results: [ 'derive', 'profile', 'page', 'table' ],
    graph: [ 'neighbors' ],
    orientation: [ 'bootstrap', 'current', 'commit', 'status' ],
  },
  compatibility: [ 'initializeSession', 'createTableDisplay' ],
  documentationRoutes: Object.keys(METHOD_DOCS),
});

const EXAMPLES = Object.freeze({
  bootstrap: METHOD_DOCS.bootstrap.usage,
  ontology: "const ws = linkedScience.open({ contextKey: 'local-goal' });\nawait ws.orientation.bootstrap();\nconst ontology = await ws.graphs.load({ name: 'ontology', kind: 'ontology', text: ontologyTurtle, source: { kind: 'local-synthetic', id: 'ontology-fixture' } });\nws.schema.search(ontology, { text: 'measurement', limit: 5 });",
  query: "const hits = await ws.query.select({ sources: [ontology, sourceA, sourceB], sparql: 'SELECT ?sample ?value WHERE { GRAPH ?g { ?sample <https://example.test/science/hasValue> ?value } } ORDER BY ?sample LIMIT 10', role: 'measurements' });\nws.results.table(hits, { limit: 5 });",
  evidence: "const evidence = await ws.evidence.load({ name: 'resource-notes', document: resourceNotes });",
  traversal: "const result = await ws.traversal.query({ sources: [{ type: 'sparql', value: 'https://example.test/sparql' }], sparql, evidence: [evidence], budgets: { maxRequests: 4, maxResultItems: 100 } });\nws.results.profile(result);\nws.traversal.history({ limit: 5 });",
  resources: "const resource = await ws.resources.get('https://example.test/data.json', { headers: { accept: 'application/json' }, role: 'source-metadata' });\nconst metadata = ws.resources.inspect(resource, { as: 'json' });\nconst json = await resource.json(); // ordinary in-kernel JavaScript value\nconst rdf = await ws.resources.parseRdf(resource, { name: 'source-graph' });",
  derive: "const numeric = await ws.results.derive(hits, ({ rows }) => ({ kind: 'bindings', rows: rows.filter(row => Number(row.get('value').value) > 5) }), { role: 'high-values' });",
  reset: "const saved = await ws.orientation.commit();\nlinkedScience.reset({ contextKey: 'local-goal' });\nconst recovered = linkedScience.open({ contextKey: 'local-goal' });\nawait recovered.orientation.status(); // broker map usable; old handles stale",
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

function quadFingerprint(quads) {
  const hash = createHash('sha256');
  for (const item of quads) {
    hash.update(termFingerprintPart(item.subject));
    hash.update('\0');
    hash.update(termFingerprintPart(item.predicate));
    hash.update('\0');
    hash.update(termFingerprintPart(item.object));
    hash.update('\0');
    hash.update(termFingerprintPart(item.graph));
    hash.update('\n');
  }
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
  if (record.kind === 'bindings') return [ ...new Set(record.value.flatMap(row => row.map(entry => entry.variable.value))) ];
  if (record.kind === 'rows') return [ ...new Set(record.value.flatMap(row => Object.keys(row))) ];
  if (record.kind === 'boolean') return [ 'value' ];
  return [ 'subject', 'predicate', 'object', 'graph' ];
}

function retainedItems(record) {
  return record.kind === 'quads' && typeof record.value?.match === 'function' ? [ ...record.value ] : record.value;
}

function resultCount(record) {
  if (record.kind === 'boolean') return 1;
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

function budgetPlanes(budgets, traversal) {
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
    summary: 'RDF-specialized RLM control environment with persistent symbolic state and bounded local or mediated Linked Science work.',
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
    const record = registry.get(handle.id);
    if (!record || record.handle !== handle) throw runtimeError('LS_UNKNOWN_HANDLE', 'validation', `Handle is not resident: ${handle.id}`, { recoveryDocument: 'reset' });
    if (allowedKinds && !allowedKinds.has(record.kind)) throw runtimeError('LS_HANDLE_KIND', 'validation', `Handle kind ${record.kind} is not valid for this operation`);
    return record;
  }

  async function updateOrientationForHandle(handle, record, role) {
    if (runtime.peek) {
      const schemaKind = record.kind === 'ontology' || record.kind === 'schema' || record.kind === 'shacl';
      const section = schemaKind ? 'parsing-schema' : EVIDENCE_KINDS.has(record.kind) ? 'context-roadmap' : 'reusable-results';
      const text = JSON.stringify({
        kind: 'linked-science-handle-reference',
        handle: handle.id,
        handleEpoch: handle.epoch,
        role: role ?? handle.label,
        type: record.kind,
        count: record.kind === 'quads' ? resultCount(record) : Array.isArray(record.value) ? record.value.length : 1,
      });
      await runtime.peek.edit(context.key, [ {
        action: 'ADD',
        entry: {
          id: `ls-handle:${compactHash(`${handle.epoch}\0${handle.id}`).slice(0, 16)}`,
          section,
          text,
          score: 0.7,
        },
      } ]);
      return;
    }
    if (!context.orientationMap) return;
    const schemaKind = record.kind === 'ontology' || record.kind === 'schema' || record.kind === 'shacl';
    context.orientationMap = recordOrientation(context.orientationMap, {
      section: schemaKind ? 'parsing-schema' : EVIDENCE_KINDS.has(record.kind) ? 'context-roadmap' : 'reusable-results',
      key: `${record.kind}:${role ?? handle.label}`,
      kind: schemaKind ? 'parsing-rule' : EVIDENCE_KINDS.has(record.kind) ? 'source' : 'result-handle',
      value: { handle: handle.id, role: role ?? handle.label, kind: record.kind, count: record.kind === 'quads' ? resultCount(record) : Array.isArray(record.value) ? record.value.length : 1 },
      evidenceHandles: [ handle.id ],
      priority: 70,
    });
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
    let materialized;
    try {
      if (text !== undefined) {
        if (typeof text !== 'string' || Buffer.byteLength(text) > runtime.budgets.maxResidentResourceBytes) throw new Error(`RDF text exceeds the ${runtime.budgets.maxResidentResourceBytes}-byte operational residency ceiling`);
        materialized = new RdfParser({ format }).parse(text).map(copyQuad);
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
    if (JSON.stringify(parsed).toLowerCase().includes('"type":"service"')) {
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
    const graphRecords = sources.map(handle => resolve(handle, GRAPH_KINDS));
    const combined = graphRecords.length === 1
      ? graphRecords[0].querySource
      : new Store(graphRecords.flatMap(record => record.value));
    let kind;
    let value;
    let execution;
    try {
      execution = prepareQueryExecution(sparql, parsed);
      if (parsed.queryType === 'SELECT') {
        kind = 'bindings';
        value = normalizeBindings(await collectBounded(await engine.queryBindings(execution.sparql, { sources: [ combined ] }), runtime.budgets.maxResultItems, 'LS_QUERY_RESULT_RESIDENCY_BOUND', 'query-residency'));
      } else if (parsed.queryType === 'ASK') {
        kind = 'boolean';
        value = await engine.queryBoolean(execution.sparql, { sources: [ combined ] });
      } else {
        kind = 'quads';
        value = await collectQuadStore(await engine.queryQuads(execution.sparql, { sources: [ combined ] }), runtime.budgets.maxWorkspaceGraphQuads, 'LS_QUERY_RESULT_RESIDENCY_BOUND', 'query-residency');
      }
    } catch (error) {
      throw wrapError(error, 'LS_QUERY_EXECUTION', 'query-execution', { operationId });
    }
    const querySha256 = compactHash(sparql);
    const completion = queryCompletion(parsed.queryType, execution);
    const fingerprints = graphRecords.flatMap(record => record.fingerprints);
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
    const handle = retain(kind, role ?? 'query-result', value, {
      provenance,
      lineage: { kind: 'communica-query', operationId, sourceHandles: sources.map(item => item.id), querySha256, completion, ...(execution.executionQuerySha256 ? { executionQuerySha256: execution.executionQuerySha256 } : {}) },
      fingerprints,
    });
    await updateOrientationForHandle(handle, resolve(handle), role);
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
    const attemptIndex = ++attemptSequence;
    const querySha256 = compactHash(sparql);
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    try {
      let begun;
      try {
        begun = await runtime.traversal.beginTraversal({ ...budgets, maxQueryChars: Math.min(budgets.maxQueryChars ?? runtime.budgets.maxQueryChars, runtime.budgets.maxQueryChars), maxResultItems: Math.min(budgets.maxResultItems ?? runtime.budgets.maxResultItems, runtime.budgets.maxResultItems) });
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
        value = normalizeBindings(await collectBounded(await engine.queryBindings(execution.sparql, queryContext), effectiveBudgets.maxResultItems, 'LS_TRAVERSAL_RESULT_BOUND', 'traversal-result'));
      } else if (parsed.queryType === 'ASK') {
        kind = 'boolean';
        value = await engine.queryBoolean(execution.sparql, queryContext);
      } else {
        kind = 'quads';
        value = await collectQuadStore(await engine.queryQuads(execution.sparql, queryContext), effectiveBudgets.maxResultItems, 'LS_TRAVERSAL_RESULT_BOUND', 'traversal-result');
      }
      const resultItems = kind === 'quads' ? value.size : kind === 'boolean' ? 1 : value.length;
      const activeReceipt = await runtime.traversal.snapshotTraversal(traversalId);
      if (activeReceipt?.kind !== 'linked-science-traversal-receipt' || activeReceipt.status !== 'active' || activeReceipt.traversalId !== traversalId) {
        throw runtimeError('LS_TRAVERSAL_RECEIPT', 'traversal-result', 'Traversal mediator returned an invalid aggregate receipt');
      }
      const receipt = await runtime.traversal.finishTraversal(traversalId);
      const payloadSha256 = kind === 'quads' ? quadFingerprint([ ...value ]) : compactHash(value);
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
      });
      await updateOrientationForHandle(handle, resolve(handle), role);
      return handle;
    } catch (error) {
      if (error instanceof LinkedScienceRuntimeError && error.stage === 'traversal-preflight') throw error;
      let traversalReceipt = error.receipt;
      if (traversalId) {
        try { traversalReceipt = await runtime.traversal.snapshotTraversal(traversalId); } catch {}
        try { traversalReceipt = await runtime.traversal.abortTraversal(traversalId, 'query-failed'); } catch {}
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
    let quads;
    try { quads = new RdfParser({ format: selectedFormat }).parse(Buffer.from(resource.value.body).toString('utf8')).map(copyQuad); }
    catch (error) { throw wrapError(error, 'LS_RESOURCE_RDF_PARSE', 'resource-rdf-parse', { resource: resource.handle.id, format: selectedFormat }); }
    const operationId = nextOperation();
    const fingerprint = quadFingerprint(quads);
    const handle = retainGraph(kind, name, quads, {
      provenance: { operationId, localOnly: false, sourceResource: resource.handle.id, format: selectedFormat, sourceFingerprint: fingerprint, resourceProvenance: resource.provenance },
      lineage: { kind: 'resource-rdf-parse', operationId, sourceResource: resource.handle.id, format: selectedFormat },
      fingerprints: [ ...resource.fingerprints, fingerprint ],
    });
    await updateOrientationForHandle(handle, resolve(handle), role ?? name);
    return handle;
  }

  async function retainRdf({ name, dataset, quads, kind = 'instance-data', role } = {}) {
    ensureActive();
    validateGraphIdentity(name, kind, 'rdf-retain', 'Correct the option and call rdf.retain again; no live request is involved.');
    if ((dataset === undefined) === (quads === undefined)) throw localValidationError('LS_RDF_RETAIN_INPUT', 'rdf-retain', 'Supply exactly one DatasetCore or quad array', {
      field: 'dataset|quads', expected: { exactlyOneOf: [ 'dataset', 'quads' ] }, action: 'Supply exactly one native RDF/JS input and call rdf.retain again.',
    });
    const values = dataset === undefined ? quads : [ ...dataset ];
    if (!Array.isArray(values) || values.some(item => !isQuad(item))) throw localValidationError('LS_RDF_RETAIN_INPUT', 'rdf-retain', 'DatasetCore or quads must contain RDF/JS quads', {
      field: dataset === undefined ? 'quads' : 'dataset', expected: { rdfjs: 'DatasetCore or quad array' }, action: 'Correct the native RDF/JS input and call rdf.retain again.',
    });
    const materialized = values.map(copyQuad);
    const operationId = nextOperation();
    const fingerprint = quadFingerprint(materialized);
    const handle = retainGraph(kind, name, materialized, {
      provenance: { operationId, localOnly: true, source: { kind: 'in-kernel-rdfjs', id: role ?? name }, sourceFingerprint: fingerprint },
      lineage: { kind: 'rdfjs-retain', operationId, role: role ?? name }, fingerprints: [ fingerprint ],
    });
    await updateOrientationForHandle(handle, resolve(handle), role ?? name);
    return handle;
  }

  function rdfDataset(handle) {
    const record = resolve(handle, new Set([ ...GRAPH_KINDS, 'quads' ]));
    return new Store((GRAPH_KINDS.has(record.kind) ? [ ...record.querySource ] : [ ...record.value ]).map(copyQuad));
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
      const begun = await runtime.traversal.beginTraversal({ ...budgets, maxQueryChars: Math.min(budgets.maxQueryChars ?? runtime.budgets.maxQueryChars, runtime.budgets.maxQueryChars), maxResultItems: Math.min(budgets.maxResultItems ?? runtime.budgets.maxResultItems, runtime.budgets.maxResultItems) });
      traversalId = begun.traversalId;
      effectiveBudgets = begun.effectiveBudgets;
      const result = await runtime.traversal.request(traversalId, { url: requestUrl.href, method: requestedMethod, headers: Object.fromEntries(requestHeaders), body: '' });
      const receipt = await runtime.traversal.finishTraversal(traversalId);
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
        try { receipt = await runtime.traversal.abortTraversal(traversalId, 'resource-failed'); } catch {}
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
    const values = record.kind === 'boolean' ? [ record.value ].slice(boundedOffset, boundedOffset + rowLimit) : retainedItems(record).slice(boundedOffset, boundedOffset + rowLimit);
    const projected = values.map(value => rowProjection(record, value, selected));
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
    return fitItems(projected, (rows, byteTruncated) => ({
      ...base,
      rows,
      truncated: byteTruncated || boundedOffset + rows.length < count,
      bounds: { rows: rows.length, maxRows: boundedLimit, cells: rows.length * selected.length, maxCells: cellLimit },
    }), byteLimit);
  }

  function resultTable(handle, { title = handle?.label ?? 'Linked Science result', ...options } = {}) {
    if (typeof title !== 'string' || title.length === 0 || title.length > 160) throw localValidationError('LS_TABLE_TITLE', 'projection', 'Table title must be 1-160 characters', {
      field: 'title', expected: { type: 'string', minLength: 1, maxLength: 160 }, action: 'Use a shorter title and render the resident result again.',
    });
    const page = resultPage(handle, options);
    return Object.freeze({ ...page, kind: 'table', title });
  }

  function derivationInput(record) {
    if (record.kind === 'bindings') return Object.freeze({ kind: 'bindings', rows: Object.freeze(record.value.map(row => new Map(row.map(({ variable, term }) => [ variable.value, copyTerm(term) ])))) });
    if (record.kind === 'quads') {
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

  async function orientationBootstrap({ checkpoint, maxItems = 30 } = {}) {
    ensureActive();
    if (runtime.peek) {
      if (checkpoint !== undefined) throw runtimeError('LS_BROKER_OWNS_ORIENTATION', 'orientation', 'Restore broker-owned PEEK state through the clean-room broker, not a Linked Science checkpoint');
      const map = await runtime.peek.begin(context.key, { tokenBudget: Math.max(64, Math.min(32_000, maxItems * 64)) });
      return orientationStatusFromMap(map);
    }
    if (checkpoint !== undefined) context.orientationMap = recoverOrientationMap(checkpoint);
    else if (!context.orientationMap) context.orientationMap = createOrientationMap({ contextId: context.key, maxItems });
    return orientationStatus();
  }

  async function orientationCurrent({ maxBytes } = {}) {
    ensureActive();
    if (runtime.peek) {
      const byteLimit = boundedInteger(maxBytes, runtime.budgets.maxBytes, runtime.budgets.maxBytes, 'maxBytes', 256);
      const current = await runtime.peek.current(context.key);
      if (byteLength(current) > byteLimit) throw runtimeError('LS_ORIENTATION_BYTE_BOUND', 'orientation', 'Broker PEEK map exceeds the requested byte bound', { retryable: true });
      return freezeJson(jsonClone(current));
    }
    if (!context.orientationMap) throw runtimeError('LS_ORIENTATION_UNINITIALIZED', 'orientation', 'Call orientation.bootstrap() first', { retryable: true });
    const byteLimit = boundedInteger(maxBytes, runtime.budgets.maxBytes, runtime.budgets.maxBytes, 'maxBytes', 256);
    const current = jsonClone(context.orientationMap);
    if (byteLength(current) > byteLimit) throw runtimeError('LS_ORIENTATION_BYTE_BOUND', 'orientation', 'Orientation map exceeds the requested byte bound', { retryable: true });
    return Object.freeze(current);
  }

  async function orientationCommit() {
    ensureActive();
    if (runtime.peek) {
      const map = await runtime.peek.commit(context.key, { event: 'linked-science-orientation-checkpoint', epoch });
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
    if (!context.orientationMap) throw runtimeError('LS_ORIENTATION_UNINITIALIZED', 'orientation', 'Call orientation.bootstrap() first', { retryable: true });
    const checkpoint = compactOrientationMap(context.orientationMap);
    if (Buffer.byteLength(checkpoint) > runtime.budgets.maxBytes) throw runtimeError('LS_ORIENTATION_BYTE_BOUND', 'orientation', 'Orientation checkpoint exceeds the runtime byte bound', { retryable: true });
    return Object.freeze({ kind: 'orientation-checkpoint', contextKey: context.key, epoch, checkpoint, sha256: compactHash(checkpoint), entries: countOrientationEntries(context.orientationMap) });
  }

  function orientationStatusFromMap(map) {
    const references = (map.entries ?? []).flatMap(entry => {
      if (typeof entry?.id !== 'string' || !entry.id.startsWith('ls-handle:') || typeof entry.text !== 'string') return [];
      try {
        const reference = JSON.parse(entry.text);
        return reference?.kind === 'linked-science-handle-reference' ? [ reference ] : [];
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
        status: reference.handleEpoch === epoch && registry.has(reference.handle) ? 'resident' : 'stale',
      })),
      note: 'PEEK orientation remains usable; stale references are not resident evidence.',
    });
  }

  async function orientationStatus() {
    ensureActive();
    if (runtime.peek) return orientationStatusFromMap(await runtime.peek.current(context.key));
    if (!context.orientationMap) return Object.freeze({ status: 'uninitialized', contextKey: context.key, epoch, entries: 0, handles: [] });
    const map = context.orientationMap;
    const referenced = [ ...new Set(Object.values(map.sections).flatMap(entries => entries.flatMap(entry => entry.evidenceHandles))) ];
    return Object.freeze({ status: 'ready', owner: 'linked-science-runtime', contextKey: context.key, epoch, entries: countOrientationEntries(map), handles: referenced.map(id => ({ id, status: registry.has(id) ? 'resident' : 'stale' })), note: 'PEEK orientation remains usable; stale references are not resident evidence.' });
  }

  const workspace = {
    contextKey: context.key,
    epoch,
    graphs: Object.freeze({ load: loadGraph }),
    schema: Object.freeze({ search: schemaSearch }),
    query: Object.freeze({ run: options => runQuery(options), select: options => runQuery(options, 'SELECT') }),
    evidence: Object.freeze({ load: loadEvidence }),
    resources: Object.freeze({ get: getResource, inspect: resourceInspect, parseRdf: retainParsedResourceGraph, history: traversalHistory }),
    rdf: Object.freeze({ DataFactory, dataset: rdfDataset, retain: retainRdf }),
    traversal: Object.freeze({ query: traverseQuery, history: traversalHistory }),
    results: Object.freeze({ derive, profile: resultProfile, page: resultPage, table: resultTable }),
    graph: Object.freeze({ neighbors }),
    orientation: Object.freeze({ bootstrap: orientationBootstrap, current: orientationCurrent, commit: orientationCommit, status: orientationStatus }),
  };
  Object.defineProperty(workspace, '_invalidate', { value() {
    active = false;
    registry.clear();
  } });
  return Object.freeze(workspace);
}

function createFacade({ budgets, orientationCheckpoints = {}, peek, environment, traversal, traversalCapabilityReceipt }) {
  const runtimeId = randomUUID();
  const contexts = new Map();
  const documentation = docsFunction();
  const validatedBudgets = validateBudgets(budgets);
  const runtime = {
    runtimeId,
    budgets: validatedBudgets,
    budgetPlanes: budgetPlanes(validatedBudgets, traversalCapabilityReceipt),
    peek,
    traversal,
    traversalCapabilities: traversalCapabilityReceipt,
  };

  function contextFor(contextKey) {
    if (typeof contextKey !== 'string' || !/^[a-z][a-z0-9-]{1,127}$/u.test(contextKey)) throw runtimeError('LS_CONTEXT_KEY', 'open', 'contextKey must be a lowercase symbolic identifier');
    let context = contexts.get(contextKey);
    if (!context) {
      const checkpoint = orientationCheckpoints[contextKey]?.checkpoint ?? orientationCheckpoints[contextKey];
      context = {
        key: contextKey,
        generation: 1,
        epoch: `${runtimeId}:1`,
        orientationMap: checkpoint ? recoverOrientationMap(checkpoint) : undefined,
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
        localOnly: !runtime.traversal, mediatedTraversal: Boolean(runtime.traversal), brokerOwnedLive: false, recursion: Boolean(environment?.rlm?.recursion?.available), rawEngineExposed: false, currentJsGuardIsSecuritySandbox: false,
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
        environment: environment ? freezeJson(jsonClone(environment)) : Object.freeze({ runtime: 'standalone-node', orientationOwner: 'linked-science-runtime' }),
      });
    },
    examples(topic) {
      if (topic === undefined) return Object.freeze({ topics: Object.keys(EXAMPLES) });
      if (!EXAMPLES[topic]) throw runtimeError('LS_EXAMPLE_NOT_FOUND', 'documentation', `Unknown example topic: ${topic}`, { retryable: true });
      return Object.freeze({ topic, code: EXAMPLES[topic] });
    },
    open({ contextKey } = {}) {
      const context = contextFor(contextKey);
      if (!context.workspace) context.workspace = createWorkspace(runtime, context);
      return context.workspace;
    },
    reset({ contextKey } = {}) {
      const context = contextFor(contextKey);
      context.workspace?._invalidate();
      context.generation += 1;
      context.epoch = `${runtimeId}:${context.generation}`;
      context.workspace = undefined;
      return Object.freeze({ status: 'reset', contextKey, epoch: context.epoch, orientationRetained: Boolean(runtime.peek || context.orientationMap), orientationOwner: runtime.peek ? 'cleanroom-broker' : 'linked-science-runtime', recoveryDocument: 'reset' });
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

export async function setupLinkedScience({ nodeRepl, budgets, orientationCheckpoints, peek, environment, traversal } = {}) {
  if ((!nodeRepl || (typeof nodeRepl !== 'object' && typeof nodeRepl !== 'function')) || !Object.isExtensible(nodeRepl)) {
    throw runtimeError('LS_NODE_REPL_REQUIRED', 'bootstrap', 'setupLinkedScience requires an extensible persistent JavaScript global object');
  }
  const existing = SETUPS.get(nodeRepl);
  if (existing) return existing;
  if ((nodeRepl.linkedScience && nodeRepl.linkedScience[FACADE_BRAND] !== true) || (nodeRepl.ls && nodeRepl.ls[FACADE_BRAND] !== true)) {
    throw runtimeError('LS_GLOBAL_CONFLICT', 'bootstrap', 'linkedScience or ls is already occupied');
  }
  if (peek !== undefined && [ 'begin', 'current', 'edit', 'commit' ].some(name => typeof peek?.[name] !== 'function')) {
    throw runtimeError('LS_PEEK_REQUIRED', 'bootstrap', 'The clean-room PEEK adapter must expose begin, current, edit, and commit');
  }
  const traversalCapabilityReceipt = await traversalCapabilities(traversal);
  const facade = createFacade({ budgets, orientationCheckpoints, peek, environment, traversal, traversalCapabilityReceipt });
  installStableBinding(nodeRepl, 'linkedScience', facade);
  installStableBinding(nodeRepl, 'ls', facade);
  SETUPS.set(nodeRepl, facade);
  return facade;
}
