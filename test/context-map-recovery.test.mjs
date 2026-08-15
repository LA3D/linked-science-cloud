import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONTEXT_MAP_STEP_ID,
  assertMapSafety,
  buildReceipt,
  compactContextMap,
  createContextMap,
  recordWorkerOutcome,
  recoverContextMap,
  selectFrontierCandidate,
} from '../lib/context-map-recovery.mjs';

const goal = 'Evaluate compact-map recovery for one guarded namespace check.';

test('scope and budgets are evaluated without a live transport', () => {
  const map = createContextMap({ goal, maxLiveQueries: 1 });
  assert.equal(assertMapSafety(map), true);
  assert.equal(recoverContextMap(compactContextMap(map)).status, 'ready');
  assert.throws(() => createContextMap({ goal, maxLiveQueries: 3 }));
});

test('a coordinator-selected frontier enables a second symbolic turn without precomputing a query', () => {
  const frontier = [{ id: 'inspect-resource-link', question: 'Which resource links are declared?', stepLabel: 'inspect resource links' }];
  const initial = createContextMap({ goal, maxLiveQueries: 2, frontier });
  const turnOne = recordWorkerOutcome(initial, {
    stepId: CONTEXT_MAP_STEP_ID,
    outcome: 'success',
    query: 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1',
    rows: [],
    provenance: [{ method: 'GET', status: 200 }],
  });
  const handoff = recoverContextMap(compactContextMap(turnOne));
  assert.equal(handoff.status, 'awaiting-coordinator');
  assert.equal(handoff.frontier[0].id, 'inspect-resource-link');
  const selected = selectFrontierCandidate(turnOne, 'inspect-resource-link');
  assert.equal(recoverContextMap(compactContextMap(selected)).status, 'ready');
  assert.doesNotMatch(compactContextMap(selected), /SELECT|SERVICE|INSERT/i);
});

test('compaction is deterministic and excludes raw query history', () => {
  const map = createContextMap({ goal });
  const first = compactContextMap(map);
  const second = compactContextMap(JSON.parse(first));
  assert.equal(first, second);
  assert.doesNotMatch(first, /SELECT|SERVICE|INSERT/i);
});

test('recovery completes from a compact checkpoint without network access', () => {
  const initial = createContextMap({ goal });
  const completed = recordWorkerOutcome(initial, {
    stepId: CONTEXT_MAP_STEP_ID,
    outcome: 'success',
    query: 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1',
    rows: [],
    provenance: [{ method: 'POST', status: 200 }],
  });
  assert.equal(recoverContextMap(compactContextMap(completed)).status, 'complete');
  const receipt = buildReceipt({ assignedGoal: goal, contextMap: completed, workerReport: { status: 'completed' }, provenance: [] , timestamp: '2026-08-15T00:00:00.000Z' });
  assert.equal(receipt.observed.assignedGoal, goal);
  assert.equal(receipt.synthesized.recovery, 'complete');
});

test('receipt separates a coordinator selection from observed worker evidence', () => {
  const map = createContextMap({ goal });
  const receipt = buildReceipt({
    assignedGoal: goal,
    contextMap: map,
    workerReport: { status: 'stopped' },
    provenance: [],
    priorReceipt: 'artifacts/context-map-runs/turn-1.json',
    coordinatorDecision: { candidateId: 'inspect-resource-link', rationale: 'Establish links first.' },
    timestamp: '2026-08-15T00:00:00.000Z',
  });
  assert.equal(receipt.coordinator.decision.candidateId, 'inspect-resource-link');
  assert.equal(receipt.coordinator.priorReceipt, 'artifacts/context-map-runs/turn-1.json');
});

test('a known failure blocks the same step instead of repeating it', () => {
  const initial = createContextMap({ goal });
  const failed = recordWorkerOutcome(initial, {
    stepId: CONTEXT_MAP_STEP_ID,
    outcome: 'known-failure',
    failureCode: 'schema-pattern-empty',
    query: 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1',
    rows: [],
    provenance: [{ method: 'POST', status: 200 }],
  });
  const recovered = recoverContextMap(compactContextMap(failed));
  assert.equal(recovered.status, 'blocked-known-failure');
  assert.equal(failed.knownFailures[CONTEXT_MAP_STEP_ID], 'schema-pattern-empty');
  assert.throws(() => recordWorkerOutcome(failed, {
    stepId: CONTEXT_MAP_STEP_ID,
    outcome: 'known-failure',
    failureCode: 'schema-pattern-empty',
    query: 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1',
  }));
});
