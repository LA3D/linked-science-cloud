import { createHash } from 'node:crypto';

const STEP_ID = 'uniprot-namespace-identity';
const RAW_QUERY_MARKERS = /\b(?:SELECT|ASK|CONSTRUCT|DESCRIBE|INSERT|DELETE|SERVICE)\b/i;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [ key, stable(value[key]) ]));
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createContextMap({ goal, profile = 'identifiersOrg', maxLiveQueries = 1 } = {}) {
  if (typeof goal !== 'string' || goal.length === 0) throw new Error('A compact assigned goal is required');
  if (!Number.isInteger(maxLiveQueries) || maxLiveQueries < 0 || maxLiveQueries > 1) throw new Error('maxLiveQueries must be 0 or 1');
  return Object.freeze({
    version: 1,
    goal,
    scope: { profile, readOnly: true, sourceCount: 1 },
    budget: { maxLiveQueries, liveQueriesUsed: 0, maxRows: 1 },
    steps: [{ id: STEP_ID, status: 'pending' }],
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
  if (!step) return Object.freeze({ status: 'complete', map });
  if (map.budget.liveQueriesUsed >= map.budget.maxLiveQueries) return Object.freeze({ status: 'blocked-budget', stepId: step.id, map });
  return Object.freeze({ status: 'ready', stepId: step.id, map });
}

export function recordWorkerOutcome(contextMap, { stepId, outcome, query, rows = [], provenance = [], failureCode } = {}) {
  const map = clone(contextMap);
  assertMapSafety(map);
  if (stepId !== STEP_ID) throw new Error(`Unknown step: ${stepId}`);
  if (!['success', 'known-failure'].includes(outcome)) throw new Error('Outcome must be success or known-failure');
  if (outcome === 'known-failure' && !failureCode) throw new Error('Known failures require a failureCode');
  if (map.budget.liveQueriesUsed >= map.budget.maxLiveQueries) throw new Error('Live-query budget exhausted');
  if (!Array.isArray(rows) || rows.length > map.budget.maxRows) throw new Error('Result row budget exceeded');
  const step = map.steps.find(candidate => candidate.id === stepId);
  if (step.status !== 'pending') throw new Error(`Step is not pending: ${stepId}`);
  step.status = outcome;
  map.budget.liveQueriesUsed += 1;
  const fingerprint = createHash('sha256').update(query ?? '').digest('hex');
  map.checkpoints.push({ stepId, outcome, querySha256: fingerprint, rowsObserved: rows.length, transportCount: provenance.length });
  if (outcome === 'known-failure') map.knownFailures[stepId] = failureCode;
  return Object.freeze(map);
}

export function buildReceipt({ assignedGoal, contextMap, workerReport, provenance, timestamp = new Date().toISOString() } = {}) {
  const compactMap = compactContextMap(contextMap);
  return stable({
    version: 1,
    timestamp,
    observed: {
      assignedGoal,
      workerReport,
      transportProvenance: provenance,
    },
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

export function assertMapSafety(map) {
  if (map.version !== 1 || map.scope?.profile !== 'identifiersOrg' || map.scope?.readOnly !== true || map.scope?.sourceCount !== 1) {
    throw new Error('Context map is outside the guarded Identifiers.org-only scope');
  }
  if (!Number.isInteger(map.budget?.maxLiveQueries) || !Number.isInteger(map.budget?.liveQueriesUsed) || map.budget.liveQueriesUsed > map.budget.maxLiveQueries) {
    throw new Error('Invalid live-query budget');
  }
  const serialized = JSON.stringify(map);
  if (RAW_QUERY_MARKERS.test(serialized)) throw new Error('Context map must not retain raw SPARQL query history');
  return true;
}

export const CONTEXT_MAP_STEP_ID = STEP_ID;
