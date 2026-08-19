import { createHash } from 'node:crypto';
export {
  assertOrientationMap,
  compactOrientationMap,
  createOrientationMap,
  recordAcquisitionOrientation,
  recordOrientation,
  recordResultOrientation,
  recoverOrientationMap,
} from './orientation-map.mjs';

const STEP_ID = 'uniprot-namespace-identity';
const RAW_QUERY_MARKERS = /\b(?:SELECT|ASK|CONSTRUCT|DESCRIBE|INSERT|DELETE|SERVICE)\b/i;
const PERSISTENT_REPL_TOOL = 'mcp__node_repl__js';
const REPL_BINDING_STATES = new Set([ 'present', 'absent' ]);
const STATEFUL_OPERATION_KINDS = new Set([ 'materialize', 'handle-inspection', 'recover', 'rematerialize' ]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [ key, stable(value[key]) ]));
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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
