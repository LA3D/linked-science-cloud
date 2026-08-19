import { createHash } from 'node:crypto';

const STEP_ID = 'uniprot-namespace-identity';
const RAW_QUERY_MARKERS = /\b(?:SELECT|ASK|CONSTRUCT|DESCRIBE|INSERT|DELETE|SERVICE)\b/i;
const PERSISTENT_REPL_TOOL = 'mcp__node_repl__js';
const REPL_BINDING_STATES = new Set([ 'present', 'absent' ]);
const STATEFUL_OPERATION_KINDS = new Set([ 'materialize', 'handle-inspection', 'recover', 'rematerialize' ]);
const ORIENTATION_SECTIONS = Object.freeze([
  'context-roadmap',
  'context-understanding',
  'domain-constants',
  'parsing-schema',
  'reusable-results',
]);
const ORIENTATION_EVENT_KINDS = new Set([
  'source',
  'failure',
  'relation',
  'constant',
  'parsing-rule',
  'result-handle',
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [ key, stable(value[key]) ]));
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function orientationId(section, key) {
  return `cm-${createHash('sha256').update(`${section}\0${key}`).digest('hex').slice(0, 12)}`;
}

function assertSymbolicValue(value, depth = 0) {
  if (depth > 4) throw new Error('Orientation values may nest at most four levels');
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return true;
  if (typeof value === 'string') {
    if (value.length === 0 || value.length > 1_024 || RAW_QUERY_MARKERS.test(value)) throw new Error('Orientation strings must be compact and exclude raw query text');
    return true;
  }
  if (Array.isArray(value)) {
    if (value.length > 20) throw new Error('Orientation arrays may contain at most 20 values');
    value.forEach(item => assertSymbolicValue(item, depth + 1));
    return true;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length > 20) throw new Error('Orientation objects may contain at most 20 fields');
    for (const [ key, item ] of entries) {
      if (!/^[a-z][a-z0-9-]{0,63}$/u.test(key)) throw new Error(`Invalid symbolic field: ${key}`);
      assertSymbolicValue(item, depth + 1);
    }
    return true;
  }
  throw new Error('Orientation values must be JSON-compatible symbolic data');
}

export function createOrientationMap({ contextId, maxItems = 30 } = {}) {
  if (typeof contextId !== 'string' || contextId.length === 0 || contextId.length > 256) throw new Error('A compact contextId is required');
  if (!Number.isInteger(maxItems) || maxItems < 5 || maxItems > 100) throw new Error('maxItems must be 5-100');
  return Object.freeze({
    version: 1,
    kind: 'peek-orientation-cache',
    contextId,
    budget: { maxItems },
    sequence: 0,
    sections: Object.fromEntries(ORIENTATION_SECTIONS.map(section => [ section, [] ])),
  });
}

export function recordOrientation(contextMap, { section, key, kind, value, evidenceHandles = [], priority = 50 } = {}) {
  const map = clone(contextMap);
  assertOrientationMap(map);
  if (!ORIENTATION_SECTIONS.includes(section)) throw new Error(`Unknown orientation section: ${section}`);
  if (typeof key !== 'string' || key.length === 0 || key.length > 160) throw new Error('Orientation entries require a compact key');
  if (!ORIENTATION_EVENT_KINDS.has(kind)) throw new Error(`Unknown orientation kind: ${kind}`);
  assertSymbolicValue(value);
  if (!Array.isArray(evidenceHandles) || evidenceHandles.length > 10 || evidenceHandles.some(handle => !/^[a-z][a-z0-9-]{1,63}$/u.test(handle))) {
    throw new Error('Orientation evidenceHandles must be bounded symbolic handles');
  }
  if (!Number.isInteger(priority) || priority < 0 || priority > 100) throw new Error('priority must be 0-100');
  const id = orientationId(section, key);
  for (const name of ORIENTATION_SECTIONS) map.sections[name] = map.sections[name].filter(item => item.id !== id);
  map.sequence += 1;
  map.sections[section].push({ id, key, kind, value: clone(value), evidenceHandles: [ ...new Set(evidenceHandles) ], priority, sequence: map.sequence });
  const entries = ORIENTATION_SECTIONS.flatMap(name => map.sections[name].map(item => ({ section: name, item })));
  if (entries.length > map.budget.maxItems) {
    entries.sort((left, right) => left.item.priority - right.item.priority || left.item.sequence - right.item.sequence || left.item.id.localeCompare(right.item.id));
    const evicted = entries[0];
    map.sections[evicted.section] = map.sections[evicted.section].filter(item => item.id !== evicted.item.id);
  }
  assertOrientationMap(map);
  return Object.freeze(map);
}

export function compactOrientationMap(contextMap) {
  const map = clone(contextMap);
  assertOrientationMap(map);
  return JSON.stringify(stable(map));
}

export function assertOrientationMap(map) {
  if (map?.version !== 1 || map.kind !== 'peek-orientation-cache' || typeof map.contextId !== 'string' || !Number.isInteger(map.sequence)) {
    throw new Error('Invalid symbolic orientation map');
  }
  if (!Number.isInteger(map.budget?.maxItems) || map.budget.maxItems < 5 || map.budget.maxItems > 100) throw new Error('Invalid orientation-map budget');
  if (!map.sections || Object.keys(map.sections).sort().join('|') !== [ ...ORIENTATION_SECTIONS ].sort().join('|')) {
    throw new Error('Invalid orientation-map sections');
  }
  const entries = ORIENTATION_SECTIONS.flatMap(section => map.sections[section]);
  if (entries.length > map.budget.maxItems) throw new Error('Orientation map exceeds its item budget');
  const ids = new Set();
  for (const section of ORIENTATION_SECTIONS) {
    if (!Array.isArray(map.sections[section])) throw new Error('Invalid orientation-map section');
    for (const item of map.sections[section]) {
      if (ids.has(item.id) || item.id !== orientationId(section, item.key)) throw new Error('Invalid or duplicate orientation entry ID');
      ids.add(item.id);
      if (!ORIENTATION_EVENT_KINDS.has(item.kind)) throw new Error('Invalid orientation entry kind');
      if (!Number.isInteger(item.priority) || item.priority < 0 || item.priority > 100 || !Number.isInteger(item.sequence)) {
        throw new Error('Invalid orientation entry priority or sequence');
      }
      if (!Array.isArray(item.evidenceHandles) || item.evidenceHandles.length > 10) throw new Error('Invalid orientation evidence handles');
      assertSymbolicValue(item.value);
    }
  }
  return true;
}

export function recordAcquisitionOrientation(contextMap, { handle, receipt, priority = 70 } = {}) {
  if (!receipt || receipt.kind !== 'guarded-evidence-acquisition' || receipt.handle !== handle) {
    throw new Error('A matching guarded acquisition receipt is required');
  }
  const sourceKey = `source:${receipt.source}`;
  if (receipt.status === 'retrieved') {
    let map = recordOrientation(contextMap, {
      section: 'context-roadmap',
      key: sourceKey,
      kind: 'source',
      value: { source: receipt.source, status: 'retrieved', profile: receipt.profile, 'sha256': receipt.sha256 },
      evidenceHandles: [handle],
      priority,
    });
    map = recordOrientation(map, {
      section: 'parsing-schema',
      key: `parse:${receipt.source}`,
      kind: 'parsing-rule',
      value: {
        source: receipt.source,
        'declared-content-type': receipt.declaredContentType || 'unknown',
        'detected-format': receipt.detectedFormat,
        'metadata-mismatch': receipt.metadataMismatch === true,
      },
      evidenceHandles: [handle],
      priority,
    });
    return map;
  }
  return recordOrientation(contextMap, {
    section: 'context-understanding',
    key: `failure:${receipt.source}:${receipt.stage}`,
    kind: 'failure',
    value: { source: receipt.source, status: 'failed', stage: receipt.stage, profile: receipt.profile || 'unknown' },
    evidenceHandles: receipt.stage === 'acquisition' ? [handle] : [],
    priority,
  });
}

export function recordResultOrientation(contextMap, { profile, role, priority = 60 } = {}) {
  if (!profile || typeof profile.handle !== 'string' || typeof role !== 'string' || role.length === 0 || role.length > 160) {
    throw new Error('A retained handle profile and compact reusable role are required');
  }
  return recordOrientation(contextMap, {
    section: 'reusable-results',
    key: `result:${role}`,
    kind: 'result-handle',
    value: { role, handle: profile.handle, kind: profile.kind, count: profile.count },
    evidenceHandles: [profile.handle],
    priority,
  });
}

export function createContextMap({ goal, profile = 'identifiersOrg', maxLiveQueries = 1, frontier = [] } = {}) {
  if (typeof goal !== 'string' || goal.length === 0) throw new Error('A compact assigned goal is required');
  if (!Number.isInteger(maxLiveQueries) || maxLiveQueries < 0 || maxLiveQueries > 2) throw new Error('maxLiveQueries must be 0, 1, or 2');
  if (!Array.isArray(frontier) || frontier.some(candidate => !candidate?.id || !candidate?.question || !candidate?.stepLabel)) {
    throw new Error('Frontier candidates require id, question, and stepLabel');
  }
  return Object.freeze({
    version: 1,
    goal,
    scope: { profile, readOnly: true, sourceCount: 1 },
    budget: { maxLiveQueries, liveQueriesUsed: 0, maxRows: 1 },
    steps: [{ id: STEP_ID, status: 'pending' }],
    frontier,
    knownFailures: {},
    checkpoints: [],
  });
}

export function compactContextMap(contextMap) {
  const map = clone(contextMap);
  assertMapSafety(map);
  return JSON.stringify(stable(map));
}

export function recoverContextMap(compactMap) {
  const map = typeof compactMap === 'string' ? JSON.parse(compactMap) : clone(compactMap);
  assertMapSafety(map);
  const failedStep = map.steps.find(candidate => map.knownFailures[candidate.id]);
  if (failedStep) return Object.freeze({ status: 'blocked-known-failure', stepId: failedStep.id, map });
  const step = map.steps.find(candidate => candidate.status === 'pending');
  if (!step && map.frontier.length > 0 && map.budget.liveQueriesUsed < map.budget.maxLiveQueries) {
    return Object.freeze({ status: 'awaiting-coordinator', frontier: map.frontier, map });
  }
  if (!step) return Object.freeze({ status: 'complete', map });
  if (map.budget.liveQueriesUsed >= map.budget.maxLiveQueries) return Object.freeze({ status: 'blocked-budget', stepId: step.id, map });
  return Object.freeze({ status: 'ready', stepId: step.id, map });
}

export function selectFrontierCandidate(contextMap, candidateId) {
  const map = clone(contextMap);
  assertMapSafety(map);
  if (map.steps.some(step => step.status === 'pending')) throw new Error('Complete the current step before selecting a frontier candidate');
  if (map.budget.liveQueriesUsed >= map.budget.maxLiveQueries) throw new Error('Live-query budget exhausted');
  const candidate = map.frontier.find(item => item.id === candidateId);
  if (!candidate) throw new Error(`Unknown frontier candidate: ${candidateId}`);
  if (map.knownFailures[candidate.id]) throw new Error(`Known failure prevents candidate: ${candidateId}`);
  map.steps.push({ id: candidate.id, status: 'pending', label: candidate.stepLabel });
  map.frontier = map.frontier.filter(item => item.id !== candidateId);
  return Object.freeze(map);
}

export function recordWorkerOutcome(contextMap, { stepId, outcome, query, rows = [], provenance = [], failureCode } = {}) {
  const map = clone(contextMap);
  assertMapSafety(map);
  if (!['success', 'known-failure'].includes(outcome)) throw new Error('Outcome must be success or known-failure');
  if (outcome === 'known-failure' && !failureCode) throw new Error('Known failures require a failureCode');
  if (map.budget.liveQueriesUsed >= map.budget.maxLiveQueries) throw new Error('Live-query budget exhausted');
  if (!Array.isArray(rows) || rows.length > map.budget.maxRows) throw new Error('Result row budget exceeded');
  const step = map.steps.find(candidate => candidate.id === stepId);
  if (!step) throw new Error(`Unknown step: ${stepId}`);
  if (step.status !== 'pending') throw new Error(`Step is not pending: ${stepId}`);
  step.status = outcome;
  map.budget.liveQueriesUsed += 1;
  const fingerprint = createHash('sha256').update(query ?? '').digest('hex');
  map.checkpoints.push({ stepId, outcome, querySha256: fingerprint, rowsObserved: rows.length, transportCount: provenance.length });
  if (outcome === 'known-failure') map.knownFailures[stepId] = failureCode;
  return Object.freeze(map);
}

export function buildReceipt({ assignedGoal, contextMap, workerReport, provenance, coordinatorDecision, priorReceipt, timestamp = new Date().toISOString() } = {}) {
  const compactMap = compactContextMap(contextMap);
  return stable({
    version: 1,
    timestamp,
    observed: {
      assignedGoal,
      workerReport,
      transportProvenance: provenance,
    },
    coordinator: coordinatorDecision ? { decision: coordinatorDecision, priorReceipt } : undefined,
    synthesized: {
      compactContextMap: JSON.parse(compactMap),
      recovery: recoverContextMap(compactMap).status,
    },
    limitations: [
      'The receipt records an assigned goal and worker report, not the parent coordinator conversation or decision process.',
      'The context map is a bounded checkpoint aid and does not establish semantic correctness from an empty result.',
    ],
  });
}

export function assertPersistentReplReceipt(receipt) {
  if (receipt?.tool !== PERSISTENT_REPL_TOOL || receipt.capability !== 'persistent-js-repl' || receipt.executionMode !== 'persistent-js-repl') {
    throw new Error('Stateful work requires an actual persistent JS REPL receipt');
  }
  if (typeof receipt.moduleResolution?.['@comunica/query-sparql'] !== 'string' || receipt.moduleResolution['@comunica/query-sparql'].length === 0) {
    throw new Error('Persistent REPL receipt requires Communica module resolution');
  }
  for (const name of [ 'session', 'map' ]) {
    const binding = receipt.bindings?.[name];
    if (!REPL_BINDING_STATES.has(binding?.state) || (binding.state === 'present' && (typeof binding.name !== 'string' || binding.name.length === 0))) {
      throw new Error(`Persistent REPL receipt requires ${name} binding state`);
    }
  }
  if (!Array.isArray(receipt.operations)) throw new Error('Persistent REPL receipt requires an operations array');
  return true;
}

export function assertStatefulClaimEvidence({ kind, handle, replOperationId } = {}, receipt) {
  assertPersistentReplReceipt(receipt);
  if (!['materialized', 'reused', 'recovered', 'resident'].includes(kind) || typeof handle !== 'string' || handle.length === 0 || typeof replOperationId !== 'string' || replOperationId.length === 0) {
    throw new Error('Stateful claims require kind, handle, and replOperationId');
  }
  const operation = receipt.operations.find(item => item?.id === replOperationId);
  if (!operation || operation.actual !== true || operation.handle !== handle || !STATEFUL_OPERATION_KINDS.has(operation.kind)) {
    throw new Error('Stateful claim must cite a prior actual persistent-REPL operation for its handle');
  }
  return true;
}

export function assertMapSafety(map) {
  if (map.version !== 1 || map.scope?.profile !== 'identifiersOrg' || map.scope?.readOnly !== true || map.scope?.sourceCount !== 1) {
    throw new Error('Context map is outside the guarded Identifiers.org-only scope');
  }
  if (!Number.isInteger(map.budget?.maxLiveQueries) || !Number.isInteger(map.budget?.liveQueriesUsed) || map.budget.liveQueriesUsed > map.budget.maxLiveQueries) {
    throw new Error('Invalid live-query budget');
  }
  if (!Array.isArray(map.steps) || map.steps.length === 0 || !Array.isArray(map.frontier)) throw new Error('Invalid steps or frontier');
  const serialized = JSON.stringify(map);
  if (RAW_QUERY_MARKERS.test(serialized)) throw new Error('Context map must not retain raw SPARQL query history');
  return true;
}

export const CONTEXT_MAP_STEP_ID = STEP_ID;
export const PERSISTENT_REPL_RECEIPT_TOOL = PERSISTENT_REPL_TOOL;
