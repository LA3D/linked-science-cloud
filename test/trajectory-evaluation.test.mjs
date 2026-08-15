import assert from 'node:assert/strict';
import test from 'node:test';
import { assertTrajectoryReceipt, createTrajectoryReceipt } from '../lib/trajectory-evaluation.mjs';

function receipt(overrides = {}) {
  return {
    arm: 'grounding-method',
    scenario: 'schema-operation-choice',
    goal: 'Determine a bounded read operation from source-grounded terms.',
    priorClaims: [{ id: 'protein-class', statement: 'up:Protein may identify protein resources.', confidence: 'medium' }],
    sourceEvidence: [{ id: 'schema-protein', source: 'pinned-schema', locator: '#Protein' }],
    reconciliations: [{ claimId: 'protein-class', status: 'confirmed', evidenceIds: ['schema-protein'] }],
    plan: { operation: 'ASK', claimIds: ['protein-class'], bounded: true },
    toolEvents: [{ id: 'repl-preflight', kind: 'persistent-js-repl', actual: true }],
    diagnoses: [],
    outcome: { status: 'planned-not-executed' },
    ...overrides,
  };
}

test('a source-grounded prior can enter a bounded operation plan', () => {
  const value = createTrajectoryReceipt(receipt());
  assert.equal(value.plan.operation, 'ASK');
});

test('an ungrounded prior cannot enter an executable plan', () => {
  assert.throws(() => assertTrajectoryReceipt(receipt({
    reconciliations: [{ claimId: 'protein-class', status: 'unverified', evidenceIds: [] }],
  })), /confirmed or corrected/);
});

test('tool-surface diagnoses name the missing affordance rather than blaming the worker', () => {
  const value = createTrajectoryReceipt(receipt({
    plan: { operation: 'none', claimIds: [], bounded: true },
    diagnoses: [{
      kind: 'tool-surface',
      summary: 'The session lacks a bounded graph-handle operation.',
      desiredOperation: 'CONSTRUCT into a graph handle',
      exposedTool: 'bindings-only session',
      obstacle: 'No graph materialization affordance is available.',
    }],
  }));
  assert.equal(value.diagnoses[0].kind, 'tool-surface');
});

test('confirmed claims cite real source evidence', () => {
  assert.throws(() => assertTrajectoryReceipt(receipt({
    reconciliations: [{ claimId: 'protein-class', status: 'confirmed', evidenceIds: [] }],
  })), /require source evidence/);
});

test('a receipt must make its terminal state explicit', () => {
  const { outcome, ...missingOutcome } = receipt();
  assert.throws(() => assertTrajectoryReceipt(missingOutcome), /Outcome status/);
  assert.throws(() => assertTrajectoryReceipt(receipt({ outcome: { status: 'completed' }, plan: { operation: 'none', claimIds: [], bounded: true } })), /Completed outcomes/);
});
