import { readFile } from 'node:fs/promises';
import { validateEpisode, validateRecord } from './contracts.mjs';
import { readEvidenceArtifact, inspectEpisodeEvidence } from './evidence.mjs';

const requireValue = (condition, message) => { if (!condition) throw new Error(`Scientific corpus: ${message}`); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
async function jsonArtifact(root, reference) {
  const artifact = await readEvidenceArtifact(root, reference);
  return artifact ? artifact.selected ?? JSON.parse(artifact.bytes.toString('utf8')) : null;
}

/** Eligibility is a conservative evidence gate, not automatic semantic review,
 * proof of causal learning, or authorization to inject a lesson into a skill.
 * Unregistered records are excluded by filterCorpus; v1 checks direct broker
 * exchanges, not assistant summaries or self-assigned scientific labels.
 */
export async function inspectCorpusRecord(input, { root }) {
  const record = validateRecord('corpus', input);
  const episodeInput = await jsonArtifact(root, record.episode);
  if (!episodeInput) return { id: record.id, eligible: false, reason: 'missing-episode', units: [] };
  const episode = validateEpisode(episodeInput);
  const exclusions = JSON.parse(await readFile(new URL('../../artifacts/wiki-learning/corpus/exclusions.json', import.meta.url), 'utf8'));
  requireValue(exclusions.format === 'linked-science-corpus-exclusions/v1', 'exclusions version');
  if (exclusions.episodes.some(entry => entry.sha256 === record.episode.sha256 || entry.id === episode.id) || record.review.classification === 'engineering') return { id: record.id, eligible: false, reason: 'engineering-evidence-only', units: [] };
  if (episode.capture.kind !== 'direct-runtime') return { id: record.id, eligible: false, reason: 'no-direct-scientific-runtime-witness', units: [] };
  requireValue(record.units.length > 0, 'scientific record needs learning units');
  const scientific = new Set(record.review.scientificObjectiveIds), excluded = new Set(record.review.excludedObjectiveIds);
  requireValue(episode.objectives.every(o => scientific.has(o.id) !== excluded.has(o.id)), 'every objective must have exactly one scope classification');
  requireValue([...scientific, ...excluded].every(id => episode.objectives.some(o => o.id === id)), 'unknown classified objective');
  if (record.review.classification === 'scientific') requireValue(excluded.size === 0, 'mixed objectives require mixed classification');
  const inspection = await inspectEpisodeEvidence(episode, { root });
  const host = await jsonArtifact(root, episode.host.observableEvents);
  const units = [];
  const ids = new Set();
  for (const unit of record.units) {
    requireValue(!ids.has(unit.id), 'duplicate unit'); ids.add(unit.id);
    requireValue(scientific.has(unit.objectiveId) && !excluded.has(unit.objectiveId), 'unit is not a reviewed scientific objective');
    requireValue(unit.anchors.length > 0 && unit.anchors.every(anchor => /^https?:\/\//u.test(anchor)), 'scientific source/entity anchors required');
    const gaps = [...unit.missingEvidence];
    const results = [];
    for (const witness of [...unit.actionWitnesses, unit.outcomeWitness]) {
      const event = episode.events.find(e => e.id === witness.eventId);
      requireValue(event?.objectiveIds.includes(unit.objectiveId) && event.kind === 'mcpToolCall', 'witness must belong to this scientific objective');
      const exchange = await jsonArtifact(root, witness.exchange);
      if (!exchange || !host) { gaps.push(`Unavailable witness ${witness.eventId}`); continue; }
      requireValue(exchange.format === 'linked-science-observed-mcp-exchange/v1' && exchange.tool === 'js' && exchange.eventId === event.itemId, 'not an observed project tool exchange');
      requireValue(exchange.server === 'repository-stdio-cleanroom_node_repl' && typeof exchange.arguments?.code === 'string', 'wrong runtime witness');
      const block = exchange.response?.result?.content?.[witness.outputIndex];
      requireValue(block?.type === 'text', 'missing structured tool output');
      const observed = JSON.parse(block.text);
      const item = host.thread.turns.find(t => t.id === event.turnId)?.items.find(i => i.id === event.itemId);
      requireValue(same(item?.result?.structuredContent?.observed, observed), 'host projection differs from raw exchange');
      const value = witness.key ? observed[witness.key] : observed;
      requireValue(value && typeof value === 'object', 'witness selector');
      if (witness.kind === 'retrieval') requireValue(value.kind === 'linked-science-resource-inspection' && value.provenance?.mediatedTraversal === true && value.ok === true && value.sha256 && value.provenance.operationId, 'no mediated retrieval evidence');
      if (witness.kind === 'query') {
        requireValue(value.lineage?.kind === 'communica-query' && value.lineage.operationId === value.provenance?.operationId && value.provenance?.completion?.complete === true && value.provenance.completion.truncated === false && value.provenance.completion.scope === 'submitted-query', 'no complete query lineage');
        const link = episode.joins.find(j => j.eventId === event.id && j.operationId === value.provenance.operationId);
        requireValue(link && inspection.joins.find(j => j.id === link.id)?.status === 'verified', 'query witness requires verified episode join');
        const receipt = await jsonArtifact(root, episode.evidence.find(e => e.id === link.evidenceId).artifact);
        requireValue(same(receipt, value), 'query receipt differs from tool observation');
      }
      if (witness.kind === 'failure') requireValue(observed.ok === false && observed.error?.code && observed.error?.receipt?.status === 'failed' && observed.error.receipt.code === observed.error.code, 'no observed runtime failure');
      if (witness.kind === 'retained-state') {
        requireValue(Object.values(value).some(v => typeof v === 'boolean') && Object.values(value).filter(v => typeof v === 'boolean').every(v => v === true), 'outcome checks did not pass');
        requireValue(episode.joins.some(j => j.objectiveId === unit.objectiveId && j.operationId === value.retainedQueryOperation && inspection.joins.find(observed => observed.id === j.id)?.status === 'verified'), 'retained-state check lacks verified query correlation');
      }
      results.push({ witness, observed, value, code: exchange.arguments.code });
    }
    const actions = results.filter(r => unit.actionWitnesses.includes(r.witness));
    requireValue(unit.actionWitnesses.length > 0, 'scientific action chain required');
    if (!gaps.length) {
      requireValue(actions.some(r => ['retrieval', 'query', 'failure'].includes(r.witness.kind)), 'engineering-only actions do not qualify');
      requireValue(unit.anchors.every(anchor => actions.some(r => (r.code + JSON.stringify(r.observed)).includes(anchor))), 'scientific anchors unsupported by actions');
      const outcome = results.at(-1);
      if (unit.outcome === 'success') requireValue(outcome.witness.kind === 'retained-state', 'success requires observed outcome checks');
      if (unit.outcome === 'failure') requireValue(outcome.witness.kind === 'failure', 'failure requires observed failed action');
    }
    if (unit.outcome === 'partial') requireValue(gaps.length > 0, 'partial unit must identify gaps');
    requireValue(unit.sourceEvidenceIds.length > 0, 'source evidence required for both procedural and factual scope');
    for (const id of unit.sourceEvidenceIds) {
      const entry = episode.evidence.find(e => e.id === id);
      requireValue(entry?.artifact, 'source reference must name saved evidence');
      const source = await jsonArtifact(root, entry.artifact);
      if (!source) gaps.push(`Missing source evidence ${id}`);
      if (unit.lessonKind === 'scientific-finding') {
        requireValue(entry.source.revision !== null, 'scientific finding needs source revision/hash');
        if (source) requireValue(source.fingerprints?.includes(entry.source.revision) || source.sha256 === entry.source.revision, 'scientific source revision is not witnessed');
      }
    }
    if (unit.lessonKind === 'scientific-finding') requireValue(Number.isFinite(Date.parse(unit.freshness.asOf)), 'scientific finding needs observation date');
    units.push({ id: unit.id, lessonKind: unit.lessonKind, eligible: true, evidenceStatus: gaps.length ? 'incomplete' : 'observed-within-scope', outcome: unit.outcome, validation: unit.validation, gaps });
  }
  return { id: record.id, eligible: units.some(u => u.eligible), reason: 'reviewed-scientific-actions-and-outcomes', units };
}

export async function filterCorpus(records, options) {
  const results = [];
  for (const record of records) results.push(await inspectCorpusRecord(record, options));
  return { results, candidates: results.flatMap(r => r.units.filter(u => u.eligible && u.evidenceStatus === 'observed-within-scope').map(u => ({ recordId: r.id, ...u }))) };
}
