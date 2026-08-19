import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONTEXT_MAP_STEP_ID,
  PERSISTENT_REPL_RECEIPT_TOOL,
  assertPersistentReplReceipt,
  assertMapSafety,
  assertStatefulClaimEvidence,
  buildReceipt,
  compactContextMap,
  compactOrientationMap,
  createContextMap,
  createOrientationMap,
  recordAcquisitionOrientation,
  recordOrientation,
  recordResultOrientation,
  recordWorkerOutcome,
  recoverContextMap,
  selectFrontierCandidate,
} from '../lib/context-map-recovery.mjs';

const goal = 'Evaluate compact-map recovery for one guarded namespace check.';

function replReceipt(overrides = {}) {
  return {
    tool: PERSISTENT_REPL_RECEIPT_TOOL,
    capability: 'persistent-js-repl',
    executionMode: 'persistent-js-repl',
    moduleResolution: { '@comunica/query-sparql': 'file:///project/node_modules/@comunica/query-sparql/...' },
    bindings: { session: { state: 'present', name: 'replSession' }, map: { state: 'present', name: 'contextMap' } },
    operations: [{ id: 'inspect-items', kind: 'handle-inspection', handle: 'items', actual: true }],
    ...overrides,
  };
}

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

test('stateful claims require an actual persistent-REPL receipt and cited operation', () => {
  const receipt = replReceipt();
  assert.equal(assertPersistentReplReceipt(receipt), true);
  assert.equal(assertStatefulClaimEvidence({ kind: 'reused', handle: 'items', replOperationId: 'inspect-items' }, receipt), true);
  assert.throws(() => assertPersistentReplReceipt(replReceipt({ executionMode: 'cli-fixture' })));
  assert.throws(() => assertStatefulClaimEvidence({ kind: 'reused', handle: 'items', replOperationId: 'missing' }, receipt));
  assert.throws(() => assertStatefulClaimEvidence({ kind: 'reused', handle: 'other', replOperationId: 'inspect-items' }, receipt));
});

test('the PEEK-aligned orientation cache stores bounded symbolic navigation state', () => {
  const receipt = {
    kind: 'guarded-evidence-acquisition', handle: 'wp-ontology', profile: 'wikipathways-ontology',
    source: 'https://vocabularies.wikipathways.org/wp.owl', status: 'retrieved', stage: 'complete',
    declaredContentType: 'application/rdf+xml', detectedFormat: 'turtle', metadataMismatch: true, sha256: 'a'.repeat(64),
  };
  let map = createOrientationMap({ contextId: 'wikipathways-demo', maxItems: 5 });
  map = recordAcquisitionOrientation(map, { handle: 'wp-ontology', receipt });
  map = recordResultOrientation(map, { profile: { handle: 'pathway-hits', kind: 'bindings', count: 12 }, role: 'candidate-pathways' });
  const compact = compactOrientationMap(map);
  assert.match(compact, /metadata-mismatch/);
  assert.match(compact, /pathway-hits/);
  assert.doesNotMatch(compact, /SELECT|CONSTRUCT|SERVICE/i);
});

test('failed acquisition remains an orientation event and does not imply absence', () => {
  const receipt = {
    kind: 'guarded-evidence-acquisition', handle: 'wp-attempt', profile: 'wikipathways-ontology',
    source: 'https://vocabularies.wikipathways.org/wp.owl', status: 'failed', stage: 'acquisition',
  };
  const map = recordAcquisitionOrientation(createOrientationMap({ contextId: 'recovery' }), { handle: 'wp-attempt', receipt });
  const failure = map.sections['context-understanding'][0];
  assert.equal(failure.kind, 'failure');
  assert.equal(failure.value.status, 'failed');
  assert.equal(failure.value.source, receipt.source);
});

test('orientation entries upsert stably, evict by priority, and reject raw query text', () => {
  let map = createOrientationMap({ contextId: 'bounded', maxItems: 5 });
  for (let index = 0; index < 5; index += 1) {
    map = recordOrientation(map, { section: 'domain-constants', key: `constant-${index}`, kind: 'constant', value: { iri: `https://example.test/${index}` }, priority: index });
  }
  map = recordOrientation(map, { section: 'domain-constants', key: 'retained', kind: 'constant', value: { iri: 'https://example.test/retained' }, priority: 100 });
  assert.equal(map.sections['domain-constants'].length, 5);
  assert.equal(map.sections['domain-constants'].some(entry => entry.key === 'constant-0'), false);
  assert.throws(() => recordOrientation(map, { section: 'context-understanding', key: 'unsafe', kind: 'relation', value: { text: 'SELECT * WHERE { ?s ?p ?o }' } }));
});
