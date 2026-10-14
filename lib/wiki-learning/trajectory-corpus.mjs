import { readEvidenceArtifact, inspectEpisodeEvidence } from './evidence.mjs';
import { trajectoryView } from './trajectory-import.mjs';

const check = (ok, message) => { if (!ok) throw new Error(`Trajectory corpus: ${message}`); };
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);

// Conversation is evidence of guidance, decisions and reported outcomes, not
// scientific truth. Existing direct-runtime eligibility remains independent.
export async function inspectTrajectoryUnits(record, episode, { root }) {
  check(record.schemaVersion === '1.1.0', 'trajectory corpus requires version 1.1.0');
  const scientific = new Set(record.review.scientificObjectiveIds), excluded = new Set(record.review.excludedObjectiveIds);
  check(episode.objectives.every(o => scientific.has(o.id) !== excluded.has(o.id)), 'every objective needs one classification');
  check([...scientific,...excluded].every(id => episode.objectives.some(o => o.id === id)), 'unknown classified objective');
  check(record.review.classification !== 'scientific' || excluded.size === 0, 'mixed objectives require mixed classification');
  const raw = await readEvidenceArtifact(root, episode.host.observableEvents);
  if (!raw) return { id: record.id, eligible: false, reason: 'missing-selected-trajectory', units: [] };
  const capture = raw.selected ?? JSON.parse(raw.bytes);
  const view = trajectoryView(capture);
  check(same(view, capture.thread) && view.id === episode.host.taskId, 'altered trajectory projection');
  const inspection = await inspectEpisodeEvidence(episode, { root });
  const itemFor = event => view.turns.find(t => t.id === event.turnId)?.items.find(i => i.id === event.itemId);
  const ids = new Set(), units = [];
  for (const unit of record.units) {
    check(!ids.has(unit.id), 'duplicate unit'); ids.add(unit.id);
    check(unit.evidenceBasis === 'trajectory-procedure' && unit.lessonKind === 'procedure', 'trajectory cannot establish a scientific finding');
    check(scientific.has(unit.objectiveId) && !excluded.has(unit.objectiveId), 'non-scientific objective');
    check(unit.anchors.length > 0 && unit.anchors.every(a => /^https?:\/\//u.test(a)), 'source anchors required');
    check(unit.actionWitnesses.length > 0 && unit.sourceEvidenceIds.length > 0, 'selected action chain and source evidence required');
    const items = [], gaps = [...inspection.missingArtifacts];
    for (const witness of [...unit.actionWitnesses, unit.outcomeWitness]) {
      check(['user-guidance','agent-report','tool-exchange'].includes(witness.kind), 'runtime claims require runtime evidence');
      check(witness.key === '' && witness.outputIndex === 0 && same(witness.exchange, episode.host.observableEvents), 'witness must cite the selected trajectory');
      const event = episode.events.find(e => e.id === witness.eventId);
      check(event?.objectiveIds.includes(unit.objectiveId), 'event objective mismatch');
      const item = itemFor(event);
      const expected = { 'user-guidance':'userMessage', 'agent-report':'agentMessage', 'tool-exchange':'toolCall' }[witness.kind];
      check(item?.type === expected && event.kind === expected, 'evidence type laundering');
      items.push({ witness, event, item });
    }
    check(items.some(x => x.item.type === 'toolCall'), 'scientific actions must be observed, not just discussed');
    check(items.some(x => x.item.type === 'userMessage'), 'trajectory procedure requires selected user context');
    const actions = items.slice(0,-1), outcome = items.at(-1);
    check(actions.every(x => x.event.sequence <= outcome.event.sequence), 'outcome precedes actions');
    check(unit.anchors.every(a => actions.some(x => JSON.stringify(x.item).includes(a))), 'unsupported scientific anchors');
    for (const id of unit.sourceEvidenceIds) {
      const evidence = episode.evidence.find(e => e.id === id);
      check(evidence?.artifact, 'missing source evidence reference');
      if (!await readEvidenceArtifact(root, evidence.artifact)) gaps.push(`Missing source evidence ${id}`);
    }
    // Procedural completion is explicitly a curator interpretation of the trace.
    // A source count or independent success may not be certified via this route.
    check(episode.outcomes.filter(o => o.objectiveId === unit.objectiveId).every(o => o.kind !== 'machine-check'), 'trajectory outcomes cannot assert machine checks');
    units.push({ id: unit.id, lessonKind: unit.lessonKind, eligible: true,
      evidenceStatus: gaps.length ? 'incomplete' : 'observed-within-scope',
      evidenceBasis: 'trajectory-procedure', outcome: unit.outcome, validation: unit.validation,
      gaps, limitations: unit.missingEvidence, scope: 'observed-process-not-scientific-truth' });
  }
  return { id:record.id, eligible:units.some(u=>u.eligible), reason:'selected-scientific-trajectory', units };
}
