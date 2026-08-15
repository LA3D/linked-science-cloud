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
} from '../lib/context-map-recovery.mjs';

const goal = 'Evaluate compact-map recovery for one guarded namespace check.';

test('scope and budgets are evaluated without a live transport', () => {
  const map = createContextMap({ goal, maxLiveQueries: 1 });
  assert.equal(assertMapSafety(map), true);
  assert.equal(recoverContextMap(compactContextMap(map)).status, 'ready');
  assert.throws(() => createContextMap({ goal, maxLiveQueries: 2 }));
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
