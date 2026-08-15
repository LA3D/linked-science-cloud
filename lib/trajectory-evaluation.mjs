const ARMS = new Set([ 'baseline', 'grounding-method', 'grounding-method-plus-pack' ]);
const CLAIM_STATUSES = new Set([ 'unverified', 'confirmed', 'corrected', 'rejected', 'unresolved' ]);
const DIAGNOSIS_KINDS = new Set([ 'tool-surface', 'methodology', 'environment', 'source', 'mixed' ]);
const READ_OPERATIONS = new Set([ 'ASK', 'SELECT', 'CONSTRUCT', 'DESCRIBE', 'none' ]);

function requiredString(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} is required`);
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Validate a compact, evidence-oriented trajectory receipt.  It deliberately
 * records claims and tool friction separately, so a poor trajectory is not
 * automatically blamed on either the model or the REPL API.
 */
export function assertTrajectoryReceipt(receipt) {
  if (!ARMS.has(receipt?.arm)) throw new Error('Receipt needs a supported evaluation arm');
  requiredString(receipt?.scenario, 'Scenario');
  requiredString(receipt?.goal, 'Goal');
  if (!Array.isArray(receipt.priorClaims) || !Array.isArray(receipt.sourceEvidence) || !Array.isArray(receipt.reconciliations)) {
    throw new Error('Receipt needs priorClaims, sourceEvidence, and reconciliations arrays');
  }

  const evidenceIds = new Set();
  for (const evidence of receipt.sourceEvidence) {
    requiredString(evidence?.id, 'Source evidence id');
    requiredString(evidence?.source, 'Source evidence source');
    requiredString(evidence?.locator, 'Source evidence locator');
    if (evidenceIds.has(evidence.id)) throw new Error('Source evidence ids must be unique');
    evidenceIds.add(evidence.id);
  }

  const claimIds = new Set();
  for (const claim of receipt.priorClaims) {
    requiredString(claim?.id, 'Prior claim id');
    requiredString(claim?.statement, 'Prior claim statement');
    if (!['low', 'medium', 'high'].includes(claim.confidence)) throw new Error('Prior claim confidence must be low, medium, or high');
    if (claimIds.has(claim.id)) throw new Error('Prior claim ids must be unique');
    claimIds.add(claim.id);
  }

  const reconciled = new Map();
  for (const entry of receipt.reconciliations) {
    if (!claimIds.has(entry?.claimId) || !CLAIM_STATUSES.has(entry?.status)) throw new Error('Reconciliation needs a known claim and supported status');
    if (!Array.isArray(entry.evidenceIds) || entry.evidenceIds.some(id => !evidenceIds.has(id))) throw new Error('Reconciliation must cite known source evidence');
    if (['confirmed', 'corrected'].includes(entry.status) && entry.evidenceIds.length === 0) {
      throw new Error('Confirmed or corrected claims require source evidence');
    }
    reconciled.set(entry.claimId, entry.status);
  }

  const operation = receipt.plan?.operation;
  if (!READ_OPERATIONS.has(operation)) throw new Error('Plan needs a supported read operation or none');
  const planClaimIds = receipt.plan?.claimIds ?? [];
  if (!Array.isArray(planClaimIds) || planClaimIds.some(id => !claimIds.has(id))) throw new Error('Plan claim ids must refer to prior claims');
  if (operation !== 'none' && planClaimIds.some(id => !['confirmed', 'corrected'].includes(reconciled.get(id)))) {
    throw new Error('Executable plans may use only confirmed or corrected claims');
  }

  requiredString(receipt.outcome?.status, 'Outcome status');
  if (!['completed', 'planned-not-executed', 'honest-stop'].includes(receipt.outcome.status)) {
    throw new Error('Outcome status is unsupported');
  }
  if (receipt.outcome.status === 'completed' && operation === 'none') {
    throw new Error('Completed outcomes require an executed read operation');
  }

  if (!Array.isArray(receipt.toolEvents) || !Array.isArray(receipt.diagnoses)) throw new Error('Receipt needs toolEvents and diagnoses arrays');
  for (const diagnosis of receipt.diagnoses) {
    if (!DIAGNOSIS_KINDS.has(diagnosis?.kind)) throw new Error('Diagnosis kind is unsupported');
    requiredString(diagnosis?.summary, 'Diagnosis summary');
    if (diagnosis.kind === 'tool-surface') {
      requiredString(diagnosis?.desiredOperation, 'Tool-surface desired operation');
      requiredString(diagnosis?.exposedTool, 'Tool-surface exposed tool');
      requiredString(diagnosis?.obstacle, 'Tool-surface obstacle');
    }
  }
  return true;
}

export function createTrajectoryReceipt(input) {
  const receipt = clone({ version: 1, ...input });
  assertTrajectoryReceipt(receipt);
  return Object.freeze(receipt);
}

export const TRAJECTORY_EVALUATION_ARMS = Object.freeze([ ...ARMS ]);
export const TRAJECTORY_DIAGNOSIS_KINDS = Object.freeze([ ...DIAGNOSIS_KINDS ]);
