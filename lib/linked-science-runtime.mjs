import { createHash, randomUUID } from 'node:crypto';
import { QueryEngine } from '@comunica/query-sparql';
import { DataFactory, Parser as RdfParser, Store } from 'n3';
import { Parser as SparqlParser } from 'sparqljs';
import {
  compactOrientationMap,
  createOrientationMap,
  recordOrientation,
  recoverOrientationMap,
} from './orientation-map.mjs';
import { createTableDisplay, initializeLinkedDataSession } from './repl-linked-data-session.mjs';

const RUNTIME_VERSION = '1.2.0';
const FACADE_BRAND = Symbol('linked-science-facade');
const HANDLE_BRAND = Symbol('linked-science-handle');
const SETUPS = new WeakMap();
const GRAPH_KINDS = new Set([ 'ontology', 'schema', 'shacl', 'instance-data', 'inferred-graph' ]);
const RESULT_KINDS = new Set([ 'bindings', 'boolean', 'quads', 'rows' ]);
const EVIDENCE_KINDS = new Set([ 'evidence' ]);
const QUERY_TYPES = new Set([ 'SELECT', 'ASK', 'CONSTRUCT', 'DESCRIBE' ]);

const DEFAULT_BUDGETS = Object.freeze({
  maxGraphQuads: 10_000,
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
    constraints: [ 'local/synthetic input only', 'RDF/JS terms retained internally', 'bounded quads and source bytes' ],
  },
  'graphs.fromEvidence': {
    summary: 'Parse one broker-acquired RDF evidence handle into a typed graph handle without re-fetching.',
    signature: 'await workspace.graphs.fromEvidence(evidenceHandle, { name, kind, format }) -> graph handle',
    constraints: [ 'current-epoch evidence handle', 'RDF format supported by N3', 'bounded quads and bytes' ],
  },
  'schema.search': {
    summary: 'Search one ontology, schema, or SHACL graph without exposing the full graph.',
    signature: 'workspace.schema.search(handle, { text, limit?, maxBytes? }) -> bounded observation',
    constraints: [ 'limit <= capability maxSchemaResults', 'orientation only; not the ontology itself' ],
  },
  'query.select': {
    summary: 'Run bounded, local-only SELECT through Communica over typed graph handles and retain RDF/JS bindings.',
    signature: 'await workspace.query.select({ sparql, sources, role? }) -> result handle',
    constraints: [ 'explicit LIMIT required', 'SERVICE rejected', 'no network sources' ],
  },
  'query.run': {
    summary: 'Run bounded local SELECT, ASK, CONSTRUCT, or DESCRIBE through Communica.',
    signature: 'await workspace.query.run({ sparql, sources, role? }) -> result handle',
  },
  'live.acquire': {
    summary: 'Ask the injected clean-room broker to acquire one immutable named profile and retain the bounded response behind a native evidence handle.',
    signature: "await workspace.live.acquire({ profile: 'profile-id', source?, role? }) -> evidence handle",
    constraints: [ 'broker profile ID only', 'no caller-supplied endpoint, profile object, or fetch', 'current explicit approval remains external to this API' ],
  },
  'live.query': {
    summary: 'Ask the injected clean-room broker to execute one named guarded profile and retain typed results behind a native handle.',
    signature: "await workspace.live.query({ profile: 'profile-id', sparql, role? }) -> result handle",
    constraints: [ 'broker profile ID only', 'no caller-supplied endpoint, profile object, engine, or fetch', 'broker receipt and bounds required' ],
  },
  'evidence.inspect': {
    summary: 'Inspect a bounded byte window of one native evidence handle.',
    signature: 'workspace.evidence.inspect(handle, { offset?, length?, maxBytes? }) -> bounded observation',
  },
  'evidence.search': {
    summary: 'Search one native evidence handle for bounded textual orientation hits.',
    signature: 'workspace.evidence.search(handle, { text, limit?, contextChars?, maxBytes? }) -> bounded observation',
  },
  'results.derive': {
    summary: 'Run one model-written JavaScript callback over a retained result and retain its bounded typed output.',
    signature: "await workspace.results.derive(handle, callback, { role? }) -> result handle",
    callbackResult: [ "{ kind: 'bindings', rows }", "{ kind: 'quads', quads }", "{ kind: 'boolean', value }", "{ kind: 'rows', rows }" ],
  },
  'results.profile': {
    summary: 'Inspect handle type, count, lineage, fingerprints, and operation provenance without bulk values.',
    signature: 'workspace.results.profile(handle) -> bounded metadata',
  },
  'results.page': {
    summary: 'Project a bounded page by rows, cells, and bytes while retaining provenance.',
    signature: 'workspace.results.page(handle, { offset?, limit?, columns?, maxCells?, maxBytes? })',
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
    summary: 'Errors expose code, stage, receipt, recoveryDocument, and retryable fields.',
    staleHandle: [ "linkedScience.documentation.get('reset')", 're-open the context', 'use orientation.status()', 'rematerialize explicitly if allowed' ],
  },
  security: {
    summary: 'The facade is local-only unless an external clean-room broker injects a named-profile capability; JavaScript remains a compatibility boundary, not a security sandbox.',
    brokerRule: 'The child receives only named acquire/query methods. The broker retains endpoints, immutable profiles, network-capable engines, fetch, credentials, transport policy, and filesystem authority.',
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
    projectRoot: '/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl',
    moduleRoot: '/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl/node_modules',
    rlmContext: 'linked-science:runtime',
    orientationOwner: 'cleanroom-broker',
  },
  discovery: [ 'documentation', 'documentation.get', 'capabilities', 'examples', 'open' ],
  workspace: {
    graphs: [ 'load', 'fromEvidence' ],
    schema: [ 'search' ],
    query: [ 'run', 'select' ],
    live: [ 'acquire', 'query' ],
    evidence: [ 'inspect', 'search' ],
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

function normalizeBrokerBindings(rows) {
  if (!Array.isArray(rows)) throw runtimeError('LS_BROKER_RESULT', 'broker-result', 'Broker bindings must be an array');
  return rows.map((row, rowIndex) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw runtimeError('LS_BROKER_RESULT', 'broker-result', `Broker binding row ${rowIndex} must be an object`);
    return Object.entries(row).map(([ variable, term ]) => {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(variable) || !isRdfTerm(term)) {
        throw runtimeError('LS_BROKER_RESULT', 'broker-result', `Broker binding row ${rowIndex} contains an invalid variable or RDF term`);
      }
      return Object.freeze({ variable: DataFactory.variable(variable), term: copyTerm(term) });
    });
  });
}

function hasOnlyKeys(value, allowed) {
  return Object.keys(value).every(key => allowed.has(key));
}

async function brokerCapabilities(broker) {
  if (broker === undefined) return undefined;
  if (!broker || typeof broker !== 'object' || typeof broker.capabilities !== 'function' || typeof broker.acquire !== 'function' || typeof broker.query !== 'function') {
    throw runtimeError('LS_BROKER_REQUIRED', 'bootstrap', 'The Linked Science broker must expose capabilities, acquire, and query');
  }
  const capabilities = await broker.capabilities();
  if (!capabilities || capabilities.kind !== 'linked-science-network-broker' || typeof capabilities.version !== 'string' || !Array.isArray(capabilities.profiles) ||
    !hasOnlyKeys(capabilities, new Set([ 'kind', 'version', 'profiles' ]))) {
    throw runtimeError('LS_BROKER_CAPABILITIES', 'bootstrap', 'The Linked Science broker returned an invalid capability receipt');
  }
  const ids = new Set();
  const profiles = capabilities.profiles.map((profile, index) => {
    if (!profile || typeof profile !== 'object' || !hasOnlyKeys(profile, new Set([ 'id', 'operation', 'sha256', 'limits' ])) ||
      typeof profile.id !== 'string' || !/^[a-z][a-zA-Z0-9.-]{1,127}$/u.test(profile.id) ||
      !['acquire', 'query'].includes(profile.operation) || typeof profile.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(profile.sha256)) {
      throw runtimeError('LS_BROKER_CAPABILITIES', 'bootstrap', `Broker profile ${index} is invalid`);
    }
    if (!profile.limits || !hasOnlyKeys(profile.limits, new Set([ 'maxBytes', 'maxItems', 'maxTransports', 'maxQueryChars' ])) ||
      !Number.isInteger(profile.limits.maxBytes) || profile.limits.maxBytes < 1 || profile.limits.maxBytes > 10_000_000 ||
      !Number.isInteger(profile.limits.maxItems) || profile.limits.maxItems < 1 || profile.limits.maxItems > 5_000 ||
      !Number.isInteger(profile.limits.maxTransports) || profile.limits.maxTransports < 1 || profile.limits.maxTransports > 3) {
      throw runtimeError('LS_BROKER_CAPABILITIES', 'bootstrap', `Broker profile ${index} has invalid limits`);
    }
    if (profile.operation === 'query' && (!Number.isInteger(profile.limits.maxQueryChars) || profile.limits.maxQueryChars < 1 || profile.limits.maxQueryChars > 100_000)) {
      throw runtimeError('LS_BROKER_CAPABILITIES', 'bootstrap', `Broker query profile ${index} has an invalid query limit`);
    }
    if (ids.has(profile.id)) throw runtimeError('LS_BROKER_CAPABILITIES', 'bootstrap', `Duplicate broker profile: ${profile.id}`);
    ids.add(profile.id);
    return freezeJson(jsonClone(profile));
  });
  return Object.freeze({ kind: capabilities.kind, version: capabilities.version, profiles: Object.freeze(profiles) });
}

function profileCapability(runtime, profile, operation) {
  if (!runtime.broker || !runtime.brokerCapabilities) {
    throw runtimeError('LS_BROKER_UNAVAILABLE', 'broker-preflight', 'No clean-room network broker is available', { retryable: true, recoveryDocument: 'security' });
  }
  if (typeof profile !== 'string') throw runtimeError('LS_BROKER_PROFILE', 'broker-preflight', 'profile must be an immutable broker profile ID, not a profile object');
  const capability = runtime.brokerCapabilities.profiles.find(item => item.id === profile && item.operation === operation);
  if (!capability) throw runtimeError('LS_BROKER_PROFILE', 'broker-preflight', `Broker profile is unavailable for ${operation}: ${profile}`);
  return capability;
}

function validateBrokerReceipt(receipt, { operation, profile, profileSha256, payloadSha256, inputSha256, maxTransports }) {
  if (!receipt || typeof receipt !== 'object' || receipt.kind !== 'linked-science-broker-operation' || receipt.status !== 'ready' ||
    receipt.operation !== operation || receipt.profile !== profile || receipt.profileSha256 !== profileSha256 ||
    typeof receipt.operationId !== 'string' || !Array.isArray(receipt.attempts) || receipt.attempts.length > maxTransports) {
    throw runtimeError('LS_BROKER_RECEIPT', 'broker-result', 'Broker returned an invalid operation receipt');
  }
  if (payloadSha256 && receipt.payloadSha256 !== payloadSha256) {
    throw runtimeError('LS_BROKER_RECEIPT', 'broker-result', 'Broker payload hash does not match the retained payload');
  }
  if (inputSha256 && receipt.inputSha256 !== inputSha256) throw runtimeError('LS_BROKER_RECEIPT', 'broker-result', 'Broker input hash does not match the requested operation');
  return freezeJson(jsonClone(receipt));
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

function resultCount(record) {
  return record.kind === 'boolean' ? 1 : record.value.length;
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
  constructor(message, { code, stage, receipt, recoveryDocument = 'recovery', retryable = false, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'LinkedScienceRuntimeError';
    this.code = code;
    this.stage = stage;
    this.receipt = Object.freeze(receipt ?? { status: 'failed', stage, code });
    this.recoveryDocument = recoveryDocument;
    this.retryable = retryable;
  }
}

function runtimeError(code, stage, message, options = {}) {
  return new LinkedScienceRuntimeError(message, { code, stage, ...options });
}

function wrapError(error, code, stage, receipt = {}) {
  if (error instanceof LinkedScienceRuntimeError) return error;
  return runtimeError(code, stage, error.message, {
    cause: error,
    receipt: { status: 'failed', stage, code, ...receipt, cause: `${error.name}: ${error.message}` },
    retryable: false,
  });
}

function validateBudgets(input = {}) {
  const ceilings = {
    maxGraphQuads: 100_000,
    maxResultItems: 5_000,
    maxRows: 100,
    maxCells: 1_000,
    maxNodes: 500,
    maxEdges: 500,
    maxBytes: 1_000_000,
    maxSchemaResults: 100,
    maxQueryChars: 100_000,
  };
  return Object.freeze(Object.fromEntries(Object.entries(DEFAULT_BUDGETS).map(([ key, fallback ]) => [
    key,
    boundedInteger(input[key], fallback, ceilings[key], key, 1),
  ])));
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
    summary: 'Persistent model-written JavaScript facade for bounded local Linked Science work.',
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
  return Object.freeze(fn);
}

function createWorkspace(runtime, context) {
  const epoch = context.epoch;
  const registry = new Map();
  const engine = new QueryEngine();
  let active = true;
  let handleSequence = 0;
  let operationSequence = 0;

  const nextOperation = () => `op-${String(++operationSequence).padStart(6, '0')}`;

  function ensureActive() {
    if (!active || context.epoch !== epoch) {
      throw runtimeError('LS_STALE_WORKSPACE', 'validation', 'Workspace belongs to a prior runtime epoch', {
        receipt: { status: 'failed', stage: 'validation', workspaceEpoch: epoch, currentEpoch: context.epoch },
        recoveryDocument: 'reset',
      });
    }
  }

  function retain(type, label, value, { provenance, lineage, fingerprints = [] } = {}) {
    ensureActive();
    const id = `h-${String(++handleSequence).padStart(6, '0')}`;
    const handle = publicHandle({ id, type, epoch, label: label ?? id });
    registry.set(id, Object.freeze({
      handle,
      kind: type,
      value,
      provenance: freezeJson(jsonClone(provenance)),
      lineage: freezeJson(jsonClone(lineage)),
      fingerprints: Object.freeze([ ...fingerprints ]),
    }));
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
      const text = JSON.stringify({
        kind: 'linked-science-handle-reference',
        handle: handle.id,
        handleEpoch: handle.epoch,
        role: role ?? handle.label,
        type: record.kind,
        count: Array.isArray(record.value) ? record.value.length : 1,
      });
      await runtime.peek.edit(context.key, [ {
        action: 'ADD',
        entry: {
          id: `ls-handle:${compactHash(`${handle.epoch}\0${handle.id}`).slice(0, 16)}`,
          section: schemaKind ? 'parsing-schema' : 'reusable-results',
          text,
          score: 0.7,
        },
      } ]);
      return;
    }
    if (!context.orientationMap) return;
    context.orientationMap = recordOrientation(context.orientationMap, {
      section: record.kind === 'ontology' || record.kind === 'schema' || record.kind === 'shacl' ? 'parsing-schema' : 'reusable-results',
      key: `${record.kind}:${role ?? handle.label}`,
      kind: record.kind === 'ontology' || record.kind === 'schema' || record.kind === 'shacl' ? 'parsing-rule' : 'result-handle',
      value: { handle: handle.id, role: role ?? handle.label, kind: record.kind, count: Array.isArray(record.value) ? record.value.length : 1 },
      evidenceHandles: [ handle.id ],
      priority: 70,
    });
  }

  async function loadGraph({ name, kind, quads, text, format = 'text/turtle', source = { kind: 'local-synthetic', id: name } } = {}) {
    ensureActive();
    if (typeof name !== 'string' || !/^[a-z][a-z0-9-]{1,63}$/u.test(name)) throw runtimeError('LS_GRAPH_NAME', 'graph-load', 'Graph name must be a lowercase symbolic identifier');
    if (!GRAPH_KINDS.has(kind)) throw runtimeError('LS_GRAPH_KIND', 'graph-load', `Unknown graph kind: ${kind}`);
    if (!source || source.kind !== 'local-synthetic' || typeof source.id !== 'string' || source.id.length === 0) {
      throw runtimeError('LS_LOCAL_ONLY', 'graph-load', 'Runtime v1 accepts only explicit local-synthetic sources');
    }
    if ((quads === undefined) === (text === undefined)) throw runtimeError('LS_GRAPH_INPUT', 'graph-load', 'Supply exactly one of quads or text');
    let materialized;
    try {
      if (text !== undefined) {
        if (typeof text !== 'string' || Buffer.byteLength(text) > runtime.budgets.maxBytes * 32) throw new Error('RDF text exceeds the local graph byte ceiling');
        materialized = new RdfParser({ format }).parse(text);
      } else {
        if (!Array.isArray(quads) || quads.some(item => !isQuad(item))) throw new Error('quads must be an array of RDF/JS quads');
        materialized = quads.map(copyQuad);
      }
    } catch (error) {
      throw wrapError(error, 'LS_GRAPH_PARSE', 'graph-load');
    }
    if (materialized.length > runtime.budgets.maxGraphQuads) throw runtimeError('LS_GRAPH_BOUND', 'graph-load', `Graph exceeds ${runtime.budgets.maxGraphQuads} quads`);
    const operationId = nextOperation();
    const fingerprint = quadFingerprint(materialized);
    const provenance = { operationId, source: { ...source }, sourceFingerprint: fingerprint, localOnly: true };
    const handle = retain(kind, name, Object.freeze(materialized), {
      provenance,
      lineage: { kind: 'materialized-local-graph', operationId },
      fingerprints: [ fingerprint ],
    });
    await updateOrientationForHandle(handle, resolve(handle), name);
    return handle;
  }

  async function graphFromEvidence(evidenceHandle, { name, kind, format = 'text/turtle' } = {}) {
    ensureActive();
    if (typeof name !== 'string' || !/^[a-z][a-z0-9-]{1,63}$/u.test(name)) throw runtimeError('LS_GRAPH_NAME', 'graph-load', 'Graph name must be a lowercase symbolic identifier');
    if (!GRAPH_KINDS.has(kind)) throw runtimeError('LS_GRAPH_KIND', 'graph-load', `Unknown graph kind: ${kind}`);
    const evidence = resolve(evidenceHandle, EVIDENCE_KINDS);
    let materialized;
    try {
      materialized = new RdfParser({ format }).parse(evidence.value.content);
    } catch (error) {
      throw wrapError(error, 'LS_GRAPH_PARSE', 'graph-load', { sourceHandle: evidenceHandle.id });
    }
    if (materialized.length > runtime.budgets.maxGraphQuads) throw runtimeError('LS_GRAPH_BOUND', 'graph-load', `Graph exceeds ${runtime.budgets.maxGraphQuads} quads`);
    const operationId = nextOperation();
    const fingerprint = quadFingerprint(materialized);
    const provenance = {
      ...evidence.provenance,
      operationId,
      sourceHandle: evidenceHandle.id,
      sourceFingerprint: fingerprint,
      brokerOwnedTransport: true,
    };
    const handle = retain(kind, name, Object.freeze(materialized.map(copyQuad)), {
      provenance,
      lineage: { kind: 'parsed-broker-evidence', operationId, sourceHandle: evidenceHandle.id, format },
      fingerprints: [ fingerprint ],
    });
    await updateOrientationForHandle(handle, resolve(handle), name);
    return handle;
  }

  async function runQuery({ sparql, sources, role } = {}, expectedType) {
    ensureActive();
    const operationId = nextOperation();
    let parsed;
    try {
      if (typeof sparql !== 'string' || sparql.length === 0 || sparql.length > runtime.budgets.maxQueryChars) throw new Error('SPARQL is missing or exceeds the query character bound');
      parsed = new SparqlParser().parse(sparql);
      if (parsed.type !== 'query' || !QUERY_TYPES.has(parsed.queryType)) throw new Error('Only read query forms are supported');
      if (expectedType && parsed.queryType !== expectedType) throw new Error(`Expected ${expectedType}, received ${parsed.queryType}`);
      if (JSON.stringify(parsed).toLowerCase().includes('"type":"service"')) throw new Error('SERVICE is not available in the local-only runtime');
      if (parsed.queryType !== 'ASK' && (!Number.isInteger(parsed.limit) || parsed.limit < 1 || parsed.limit > runtime.budgets.maxResultItems)) {
        throw new Error(`Queries must include LIMIT 1-${runtime.budgets.maxResultItems}`);
      }
      if (!Array.isArray(sources) || sources.length === 0 || sources.length > 20) throw new Error('One to twenty graph handles are required');
    } catch (error) {
      throw wrapError(error, 'LS_QUERY_PREFLIGHT', 'query-preflight', { operationId });
    }
    const graphRecords = sources.map(handle => resolve(handle, GRAPH_KINDS));
    const combined = new Store(graphRecords.flatMap(record => record.value));
    let kind;
    let value;
    try {
      if (parsed.queryType === 'SELECT') {
        kind = 'bindings';
        value = normalizeBindings(await (await engine.queryBindings(sparql, { sources: [ combined ] })).toArray());
      } else if (parsed.queryType === 'ASK') {
        kind = 'boolean';
        value = await engine.queryBoolean(sparql, { sources: [ combined ] });
      } else {
        kind = 'quads';
        value = await (await engine.queryQuads(sparql, { sources: [ combined ] })).toArray();
      }
      if ((Array.isArray(value) ? value.length : 1) > runtime.budgets.maxResultItems) throw new Error('Communica result exceeds the retained-item bound');
    } catch (error) {
      throw wrapError(error, 'LS_QUERY_EXECUTION', 'query-execution', { operationId });
    }
    const querySha256 = compactHash(sparql);
    const fingerprints = graphRecords.flatMap(record => record.fingerprints);
    const provenance = {
      operationId,
      localOnly: true,
      queryType: parsed.queryType,
      querySha256,
      sourceHandles: sources.map(handle => handle.id),
      sourceFingerprints: fingerprints,
    };
    const handle = retain(kind, role ?? `${parsed.queryType.toLowerCase()}-result`, value, {
      provenance,
      lineage: { kind: 'communica-query', operationId, sourceHandles: sources.map(item => item.id), querySha256 },
      fingerprints,
    });
    await updateOrientationForHandle(handle, resolve(handle), role);
    return handle;
  }

  async function acquireLive({ profile, source, role } = {}) {
    ensureActive();
    const capability = profileCapability(runtime, profile, 'acquire');
    if (source !== undefined && (typeof source !== 'string' || source.length === 0 || source.length > 2_048)) {
      throw runtimeError('LS_BROKER_SOURCE', 'broker-preflight', 'source must be an exact bounded source identifier when the broker profile requires one');
    }
    const operationId = nextOperation();
    let response;
    try {
      response = await runtime.broker.acquire(Object.freeze({ profile, source }));
    } catch (error) {
      throw wrapError(error, 'LS_BROKER_ACQUIRE', 'broker-acquisition', { operationId, profile });
    }
    if (!response || typeof response.content !== 'string') throw runtimeError('LS_BROKER_RESULT', 'broker-result', 'Broker acquisition must return string content');
    const byteLength = Buffer.byteLength(response.content, 'utf8');
    if (byteLength < 1 || byteLength > capability.limits.maxBytes || byteLength > runtime.budgets.maxBytes * 32) {
      throw runtimeError('LS_BROKER_RESULT_BOUND', 'broker-result', 'Broker evidence exceeds the retained byte bound');
    }
    const payloadSha256 = compactHash(response.content);
    const inputSha256 = compactHash({ profile, source });
    const receipt = validateBrokerReceipt(response.receipt, {
      operation: 'acquire', profile, profileSha256: capability.sha256, payloadSha256, inputSha256,
      maxTransports: capability.limits.maxTransports,
    });
    const provenance = {
      operationId,
      localOnly: false,
      brokerOwnedTransport: true,
      profile,
      profileSha256: capability.sha256,
      source: receipt.source,
      payloadSha256,
      brokerReceipt: receipt,
    };
    const handle = retain('evidence', role ?? `${profile}-evidence`, Object.freeze({ content: response.content, byteLength }), {
      provenance,
      lineage: { kind: 'broker-acquisition', operationId, brokerOperationId: receipt.operationId, payloadSha256 },
      fingerprints: [ payloadSha256 ],
    });
    await updateOrientationForHandle(handle, resolve(handle), role ?? profile);
    return handle;
  }

  async function queryLive({ profile, sparql, role } = {}) {
    ensureActive();
    const capability = profileCapability(runtime, profile, 'query');
    let parsed;
    try {
      if (typeof sparql !== 'string' || sparql.length === 0 || sparql.length > Math.min(runtime.budgets.maxQueryChars, capability.limits.maxQueryChars)) {
        throw new Error('SPARQL is missing or exceeds the broker query character bound');
      }
      parsed = new SparqlParser().parse(sparql);
      if (parsed.type !== 'query' || !QUERY_TYPES.has(parsed.queryType)) throw new Error('Only read query forms are supported');
      if (parsed.queryType !== 'ASK' && (!Number.isInteger(parsed.limit) || parsed.limit < 1 || parsed.limit > Math.min(runtime.budgets.maxResultItems, capability.limits.maxItems))) {
        throw new Error(`Queries must include LIMIT 1-${Math.min(runtime.budgets.maxResultItems, capability.limits.maxItems)}`);
      }
    } catch (error) {
      throw wrapError(error, 'LS_BROKER_QUERY_PREFLIGHT', 'broker-preflight', { profile });
    }
    const operationId = nextOperation();
    const inputSha256 = compactHash(sparql);
    let response;
    try {
      response = await runtime.broker.query(Object.freeze({ profile, sparql }));
    } catch (error) {
      throw wrapError(error, 'LS_BROKER_QUERY', 'broker-query', { operationId, profile, inputSha256 });
    }
    if (!response || !response.result || typeof response.result !== 'object') throw runtimeError('LS_BROKER_RESULT', 'broker-result', 'Broker query must return a typed result');
    const payloadSha256 = compactHash(response.result);
    const receipt = validateBrokerReceipt(response.receipt, {
      operation: 'query', profile, profileSha256: capability.sha256, payloadSha256, inputSha256,
      maxTransports: capability.limits.maxTransports,
    });
    let kind;
    let value;
    if (response.result.kind === 'bindings') {
      kind = 'bindings';
      value = normalizeBrokerBindings(response.result.rows);
    } else if (response.result.kind === 'boolean') {
      if (typeof response.result.value !== 'boolean') throw runtimeError('LS_BROKER_RESULT', 'broker-result', 'Broker boolean result is invalid');
      kind = 'boolean';
      value = response.result.value;
    } else if (response.result.kind === 'quads') {
      if (!Array.isArray(response.result.quads) || response.result.quads.some(item => !isQuad(item))) throw runtimeError('LS_BROKER_RESULT', 'broker-result', 'Broker quad result is invalid');
      kind = 'quads';
      value = response.result.quads.map(copyQuad);
    } else {
      throw runtimeError('LS_BROKER_RESULT', 'broker-result', `Unknown broker result kind: ${response.result.kind}`);
    }
    if ((Array.isArray(value) ? value.length : 1) > Math.min(runtime.budgets.maxResultItems, capability.limits.maxItems)) {
      throw runtimeError('LS_BROKER_RESULT_BOUND', 'broker-result', 'Broker result exceeds the retained item bound');
    }
    const provenance = {
      operationId,
      localOnly: false,
      brokerOwnedTransport: true,
      profile,
      profileSha256: capability.sha256,
      queryType: parsed.queryType,
      querySha256: inputSha256,
      brokerReceipt: receipt,
    };
    const handle = retain(kind, role ?? `${profile}-result`, value, {
      provenance,
      lineage: { kind: 'broker-query', operationId, brokerOperationId: receipt.operationId, querySha256: inputSha256 },
      fingerprints: [ payloadSha256 ],
    });
    await updateOrientationForHandle(handle, resolve(handle), role ?? profile);
    return handle;
  }

  function resultProfile(handle) {
    const record = resolve(handle, new Set([ ...RESULT_KINDS, ...GRAPH_KINDS, ...EVIDENCE_KINDS ]));
    const count = GRAPH_KINDS.has(record.kind) ? record.value.length : EVIDENCE_KINDS.has(record.kind) ? 1 : resultCount(record);
    const profile = {
      handle,
      type: record.kind,
      count,
      columns: RESULT_KINDS.has(record.kind) ? columnsFor(record) : undefined,
      byteLength: EVIDENCE_KINDS.has(record.kind) ? record.value.byteLength : undefined,
      fingerprints: [ ...record.fingerprints ],
      lineage: record.lineage,
      provenance: record.provenance,
    };
    const bounded = withByteBounds(profile, runtime.budgets.maxBytes);
    if (bounded.bounds.bytes > runtime.budgets.maxBytes) throw runtimeError('LS_PROFILE_BYTE_BOUND', 'projection', 'Profile metadata exceeds the runtime byte bound');
    return bounded;
  }

  function evidenceInspect(handle, { offset = 0, length = 512, maxBytes } = {}) {
    const record = resolve(handle, EVIDENCE_KINDS);
    const byteLimit = boundedInteger(maxBytes, runtime.budgets.maxBytes, runtime.budgets.maxBytes, 'maxBytes', 256);
    const boundedOffset = boundedInteger(offset, 0, record.value.content.length, 'offset');
    const boundedLength = boundedInteger(length, 512, 2_048, 'length');
    const operationId = nextOperation();
    const base = {
      kind: 'linked-science-evidence-window', operationId, source: handle, offset: boundedOffset,
      totalLength: record.value.content.length, provenance: record.provenance,
    };
    return fitItems([ record.value.content.slice(boundedOffset, boundedOffset + boundedLength) ], (items, byteTruncated) => ({
      ...base,
      text: items[0] ?? '',
      truncated: byteTruncated || boundedOffset + boundedLength < record.value.content.length,
      bounds: { rows: items.length, maxRows: 1, cells: items.length, maxCells: 1 },
    }), byteLimit);
  }

  function evidenceSearch(handle, { text, limit = 5, contextChars = 120, maxBytes } = {}) {
    const record = resolve(handle, EVIDENCE_KINDS);
    if (typeof text !== 'string' || text.trim().length < 2 || text.length > 160) throw runtimeError('LS_EVIDENCE_SEARCH_TEXT', 'evidence-search', 'Search text must be 2-160 characters');
    const boundedLimit = boundedInteger(limit, 5, runtime.budgets.maxSchemaResults, 'limit', 1);
    const boundedContext = boundedInteger(contextChars, 120, 500, 'contextChars', 20);
    const byteLimit = boundedInteger(maxBytes, runtime.budgets.maxBytes, runtime.budgets.maxBytes, 'maxBytes', 256);
    const haystack = record.value.content;
    const lower = haystack.toLocaleLowerCase();
    const needle = text.toLocaleLowerCase();
    const hits = [];
    let cursor = 0;
    while (hits.length < boundedLimit) {
      const index = lower.indexOf(needle, cursor);
      if (index === -1) break;
      const start = Math.max(0, index - boundedContext);
      const end = Math.min(haystack.length, index + needle.length + boundedContext);
      hits.push({ offset: index, text: haystack.slice(start, end) });
      cursor = index + Math.max(1, needle.length);
    }
    const operationId = nextOperation();
    return fitItems(hits, (items, byteTruncated) => ({
      kind: 'linked-science-evidence-search', operationId, source: handle, query: text, hits: items,
      truncated: byteTruncated || items.length === boundedLimit,
      provenance: record.provenance,
      bounds: { rows: items.length, maxRows: boundedLimit, cells: items.length, maxCells: boundedLimit },
    }), byteLimit);
  }

  function resultPage(handle, { offset = 0, limit, columns, maxCells, maxBytes } = {}) {
    const record = resolve(handle, RESULT_KINDS);
    const allColumns = columnsFor(record);
    const selected = columns ?? allColumns;
    if (!Array.isArray(selected) || selected.length === 0 || selected.some(column => !allColumns.includes(column)) || new Set(selected).size !== selected.length) {
      throw runtimeError('LS_COLUMNS', 'projection', 'Columns must be distinct known result columns');
    }
    const count = resultCount(record);
    const boundedOffset = boundedInteger(offset, 0, count, 'offset');
    const boundedLimit = boundedInteger(limit, runtime.budgets.maxRows, runtime.budgets.maxRows, 'limit');
    const cellLimit = boundedInteger(maxCells, runtime.budgets.maxCells, runtime.budgets.maxCells, 'maxCells', 1);
    const byteLimit = boundedInteger(maxBytes, runtime.budgets.maxBytes, runtime.budgets.maxBytes, 'maxBytes', 256);
    const rowLimit = Math.min(boundedLimit, Math.floor(cellLimit / selected.length));
    const values = record.kind === 'boolean' ? [ record.value ].slice(boundedOffset, boundedOffset + rowLimit) : record.value.slice(boundedOffset, boundedOffset + rowLimit);
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
    if (typeof title !== 'string' || title.length === 0 || title.length > 160) throw runtimeError('LS_TABLE_TITLE', 'projection', 'Table title must be 1-160 characters');
    const page = resultPage(handle, options);
    return Object.freeze({ ...page, kind: 'table', title });
  }

  function derivationInput(record) {
    if (record.kind === 'bindings') return Object.freeze({ kind: 'bindings', rows: Object.freeze(record.value.map(row => new Map(row.map(({ variable, term }) => [ variable.value, copyTerm(term) ])))) });
    if (record.kind === 'quads') return Object.freeze({ kind: 'quads', quads: Object.freeze(record.value.map(copyQuad)) });
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
      value = output.quads.map(copyQuad);
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
    if ((Array.isArray(value) ? value.length : 1) > runtime.budgets.maxResultItems) throw runtimeError('LS_DERIVATION_BOUND', 'derivation', 'Derived result exceeds the retained-item bound');
    const callbackSha256 = compactHash(callback.toString());
    const provenance = { ...source.provenance, operationId, derivedFrom: handle.id, callbackSha256 };
    const derivedHandle = retain(output.kind, role ?? 'derived-result', value, {
      provenance,
      lineage: { kind: 'javascript-derivation', operationId, sourceHandle: handle.id, callbackSha256 },
      fingerprints: source.fingerprints,
    });
    await updateOrientationForHandle(derivedHandle, resolve(derivedHandle), role);
    return derivedHandle;
  }

  function schemaSearch(handle, { text, limit, maxBytes } = {}) {
    const record = resolve(handle, new Set([ 'ontology', 'schema', 'shacl' ]));
    if (typeof text !== 'string' || text.trim().length < 2 || text.length > 160) throw runtimeError('LS_SCHEMA_SEARCH_TEXT', 'schema-search', 'Search text must be 2-160 characters');
    const boundedLimit = boundedInteger(limit, 10, runtime.budgets.maxSchemaResults, 'limit', 1);
    const byteLimit = boundedInteger(maxBytes, runtime.budgets.maxBytes, runtime.budgets.maxBytes, 'maxBytes', 256);
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
      throw runtimeError('LS_NEIGHBOR_INPUT', 'graph-neighbors', 'Neighbors require an RDF resource term and direction in/out/both');
    }
    const nodeLimit = boundedInteger(maxNodes, runtime.budgets.maxNodes, runtime.budgets.maxNodes, 'maxNodes', 1);
    const edgeLimit = boundedInteger(maxEdges, runtime.budgets.maxEdges, runtime.budgets.maxEdges, 'maxEdges', 1);
    const byteLimit = boundedInteger(maxBytes, runtime.budgets.maxBytes, runtime.budgets.maxBytes, 'maxBytes', 256);
    const same = candidate => candidate.termType === focus.termType && candidate.value === focus.value;
    const matching = record.value.filter(quad => (direction !== 'in' && same(quad.subject)) || (direction !== 'out' && same(quad.object)));
    const seenNodes = new Map();
    const edges = [];
    for (const quad of matching) {
      const edge = { subject: termDescriptor(quad.subject), predicate: termDescriptor(quad.predicate), object: termDescriptor(quad.object), graph: termDescriptor(quad.graph) };
      const candidates = [ quad.subject, quad.object ];
      for (const candidate of candidates) seenNodes.set(termFingerprintPart(candidate), termDescriptor(candidate));
      if (seenNodes.size > nodeLimit || edges.length >= edgeLimit) break;
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
        truncated: byteTruncated || items.length < matching.length,
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
    graphs: Object.freeze({ load: loadGraph, fromEvidence: graphFromEvidence }),
    schema: Object.freeze({ search: schemaSearch }),
    query: Object.freeze({ run: options => runQuery(options), select: options => runQuery(options, 'SELECT') }),
    live: Object.freeze({ acquire: acquireLive, query: queryLive }),
    evidence: Object.freeze({ inspect: evidenceInspect, search: evidenceSearch }),
    results: Object.freeze({ derive, profile: resultProfile, page: resultPage, table: resultTable }),
    graph: Object.freeze({ neighbors }),
    orientation: Object.freeze({ bootstrap: orientationBootstrap, current: orientationCurrent, commit: orientationCommit, status: orientationStatus }),
  };
  Object.defineProperty(workspace, '_invalidate', { value() { active = false; registry.clear(); } });
  return Object.freeze(workspace);
}

function createFacade({ nodeRepl, budgets, orientationCheckpoints = {}, peek, environment, broker, brokerCapabilityReceipt }) {
  const runtimeId = randomUUID();
  const contexts = new Map();
  const documentation = docsFunction();
  const runtime = { runtimeId, budgets: validateBudgets(budgets), peek, broker, brokerCapabilities: brokerCapabilityReceipt };

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
        runtime: 'linked-science', version: RUNTIME_VERSION, actionSpace: 'persistent-model-written-javascript', queryKernel: 'Communica',
        localOnly: !runtime.broker, brokerOwnedLive: Boolean(runtime.broker), recursion: false, rawEngineExposed: false, currentJsGuardIsSecuritySandbox: false,
        graphKinds: [ ...GRAPH_KINDS ], resultKinds: [ ...RESULT_KINDS ], budgets: runtime.budgets,
        stableBindings: [ 'linkedScience', 'ls' ], compatibility: [ ...LINKED_SCIENCE_API_SCHEMA.compatibility ],
        broker: runtime.brokerCapabilities,
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

export async function setupLinkedScience({ nodeRepl, budgets, orientationCheckpoints, peek, environment, broker } = {}) {
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
  const brokerCapabilityReceipt = await brokerCapabilities(broker);
  const facade = createFacade({ nodeRepl, budgets, orientationCheckpoints, peek, environment, broker, brokerCapabilityReceipt });
  installStableBinding(nodeRepl, 'linkedScience', facade);
  installStableBinding(nodeRepl, 'ls', facade);
  SETUPS.set(nodeRepl, facade);
  return facade;
}
