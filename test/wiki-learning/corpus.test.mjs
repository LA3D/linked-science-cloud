import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectCorpusRecord, filterCorpus } from '../../lib/wiki-learning/corpus.mjs';
import { validateEpisode, validateRecord } from '../../lib/wiki-learning/contracts.mjs';
import { sha256 } from '../../lib/wiki-learning/evidence.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = 'artifacts/wiki-learning/scientific/ontology-membership-20260919';
const scientific = JSON.parse(await readFile(join(root, 'artifacts/wiki-learning/corpus/ontology-membership.json'), 'utf8'));
const engineering = JSON.parse(await readFile(join(root, 'artifacts/wiki-learning/corpus/planning-engineering.json'), 'utf8'));
const episode = JSON.parse(await readFile(join(root, scientific.episode.path), 'utf8'));
async function temporary(t) {
  const path = await mkdtemp(join(tmpdir(), 'corpus-test-')); t.after(() => rm(path, { recursive: true, force: true }));
  await mkdir(join(path, 'artifacts/wiki-learning/scientific'), { recursive: true });
  await cp(join(root, directory), join(path, directory), { recursive: true });
  return path;
}
async function replace(path, reference, value) { const text = JSON.stringify(value, null, 2) + '\n'; await writeFile(join(path, reference.path), text); reference.sha256 = sha256(text); }

test('engineering planning fixture stays excluded even if relabeled scientific', async () => {
  const renamed = structuredClone(engineering); renamed.review.classification = 'scientific'; renamed.review.scientificObjectiveIds = ['plan'];
  assert.equal((await inspectCorpusRecord(renamed, { root })).eligible, false);
  const result = await filterCorpus([engineering, scientific], { root });
  assert.equal(result.results[0].reason, 'engineering-evidence-only');
  assert.equal(result.candidates.length, 3);
  assert.ok(result.candidates.every(c => c.recordId === scientific.id && c.validation === 'candidate-not-generalized'));
});

test('actual scientific retrieval, query, failure and recovery have bounded observed witnesses', async () => {
  const result = await inspectCorpusRecord(scientific, { root });
  assert.deepEqual(result.units.map(u => [u.lessonKind, u.outcome, u.evidenceStatus]), [
    ['scientific-finding', 'success', 'observed-within-scope'], ['procedure', 'failure', 'observed-within-scope'], ['procedure', 'success', 'observed-within-scope'],
  ]);
  const answer = JSON.parse(await readFile(join(root, directory, 'answer.json'), 'utf8'));
  const alpha = new Set(answer.memberships.filter(([p]) => p.endsWith('P69905')).map(([,g]) => g));
  const beta = new Set(answer.memberships.filter(([p]) => p.endsWith('P68871')).map(([,g]) => g));
  assert.deepEqual([...alpha].filter(g => beta.has(g)).sort(), [...answer.sharedGoIris].sort());
  assert.equal(alpha.size, 20); assert.equal(beta.size, 25); assert.equal(answer.sharedGoIris.length, 18);
  const svg = await readFile(join(root, directory, 'membership.svg'), 'utf8');
  assert.equal((svg.match(/<circle /gu) ?? []).length, 45);
  assert.equal((svg.match(/GO:/gu) ?? []).length, 27);
  assert.match(svg, /no ontology closure, functional equivalence or pathway claim/u);
});

test('unsupported corpus versions and unqualified scientific freshness/validation reject', async () => {
  const version = structuredClone(scientific); version.schemaVersion = '9.0.0';
  assert.throws(() => validateRecord('corpus', version), /contract/u);
  const transfer = structuredClone(scientific); transfer.units[0].validation = 'generalized';
  assert.throws(() => validateRecord('corpus', transfer), /contract/u);
  const unknown = structuredClone(scientific); unknown.units[0].freshness.asOf = 'unknown';
  await assert.rejects(inspectCorpusRecord(unknown, { root }), /observation date/u);
  const mislabel = structuredClone(scientific); mislabel.units[0].lessonKind = 'source-free-truth';
  assert.throws(() => validateRecord('corpus', mislabel), /contract/u);
});

test('incomplete scientific evidence never enters ready candidates or becomes a verified result', async t => {
  const path = await temporary(t);
  await rm(join(path, directory, 'exchange-7.json'));
  const result = await filterCorpus([scientific], { root: path });
  assert.ok(result.results[0].units.filter(u => u.outcome === 'success').every(u => u.evidenceStatus === 'incomplete'));
  assert.ok(result.candidates.every(u => u.outcome === 'failure'));
  const partial = structuredClone(scientific); partial.units[0].outcome = 'partial'; partial.units[0].missingEvidence = ['Independent check unavailable'];
  const partialResult = await filterCorpus([partial], { root });
  assert.ok(!partialResult.candidates.some(u => u.id === partial.units[0].id));
});

test('mixed-scope records require explicit exclusions and cannot extract engineering objectives', async t => {
  const path = await temporary(t); const record = structuredClone(scientific); const mixed = structuredClone(episode);
  mixed.objectives.push({ ...mixed.objectives[0], id: 'engineering', previousId: 'shared-go', eventId: 'admin-event', statement: 'Plan software changes' });
  mixed.events.push({ id: 'admin-event', turnId: 'scientific-run', itemId: 'admin-metadata', kind: 'mcpToolCall', sequence: 8, objectiveIds: ['engineering'] });
  const host = JSON.parse(await readFile(join(path, mixed.host.observableEvents.path), 'utf8'));
  host.thread.turns[0].items.push({ id: 'admin-metadata', type: 'mcpToolCall', result: { structuredContent: { question: 'Plan software changes' } } });
  await replace(path, mixed.host.observableEvents, host); await replace(path, record.episode, mixed);
  record.review.classification = 'mixed'; record.review.excludedObjectiveIds = ['engineering'];
  assert.equal((await inspectCorpusRecord(record, { root: path })).units.length, 3);
  record.units[0].objectiveId = 'engineering';
  await assert.rejects(inspectCorpusRecord(record, { root: path }), /not a reviewed scientific objective/u);
});

test('reported or forged observations, unrelated anchors and failed checks cannot qualify', async t => {
  const unrelated = structuredClone(scientific); unrelated.units[0].anchors = ['https://example.org/unrelated'];
  await assert.rejects(inspectCorpusRecord(unrelated, { root }), /anchors unsupported/u);
  const path = await temporary(t); const record = structuredClone(scientific);
  const witness = record.units[0].outcomeWitness;
  const exchange = JSON.parse(await readFile(join(path, witness.exchange.path), 'utf8'));
  const output = JSON.parse(exchange.response.result.content[0].text); output.checks.exactSetEquality = false;
  exchange.response.result.content[0].text = JSON.stringify(output);
  await replace(path, witness.exchange, exchange);
  await assert.rejects(inspectCorpusRecord(record, { root: path }), /hash mismatch/u);
  const changedEpisode = structuredClone(episode);
  changedEpisode.evidence.find(e => e.id === 'outcome-check').artifact.sha256 = witness.exchange.sha256;
  await replace(path, record.episode, changedEpisode);
  await assert.rejects(inspectCorpusRecord(record, { root: path }), /differs from raw exchange/u);
  const legacy = structuredClone(episode); legacy.schemaVersion = '1.0.0';
  assert.throws(() => validateEpisode(legacy), /requires episode 1.1.0/u);
});
