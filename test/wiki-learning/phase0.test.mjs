import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateEpisode, validateRecord } from '../../lib/wiki-learning/contracts.mjs';
import { inspectEpisodeEvidence, sha256 } from '../../lib/wiki-learning/evidence.mjs';
import { describeSkillBaseline, snapshotSkillBaseline, verifySkillBaseline } from '../../lib/wiki-learning/baseline.mjs';
import { createFixture } from '../fixtures/wiki-learning/development/create-fixture.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixtureRoot = fileURLToPath(new URL('../fixtures/wiki-learning/development/scope-change/', import.meta.url));
const destination = 'artifacts/wiki-learning/baselines/repl-20260919-phase0';
const fixture = JSON.parse(await readFile(join(fixtureRoot, 'episode.json'), 'utf8'));
const clone = () => structuredClone(fixture);
async function temporary(t) {
  const directory = await mkdtemp(join(tmpdir(), 'wiki-phase0-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
async function writeJson(root, path, data) {
  const bytes = JSON.stringify(data, null, 2) + '\n';
  await writeFile(join(root, path), bytes);
  return sha256(bytes);
}

test('saved fixture preserves objective change, genuine profile format, unknown memory and limited evidence', async () => {
  const episode = validateEpisode(fixture);
  const report = await inspectEpisodeEvidence(episode, { root: fixtureRoot });
  assert.equal(report.status, 'passed');
  assert.equal(report.scope, 'reference-integrity-only');
  assert.equal(report.memory.use, 'unknown');
  assert.equal(report.memory.generation, 'unknown');
  assert.deepEqual(report.joins.map(join => join.status), ['verified', 'unresolved']);
  assert.deepEqual(episode.outcomes.map(value => [value.objectiveId, value.status]), [['objective-1', 'passed'], ['objective-2', 'partial']]);
  const receipt = report.evidence.find(value => value.id === 'query-receipt');
  assert.equal(receipt.artifactAvailable, true);
  assert.equal(receipt.sourcePayloadAvailable, false);
  assert.ok(report.evidence.every(value => value.liveHandle === false));
  assert.equal(report.evidence.find(value => value.id === 'source').sourcePayloadAvailable, true);
  assert.equal(report.evidence.find(value => value.id === 'diagram').artifactAvailable, false);
});

test('real local runtime reset loses handles while saved evidence remains interpretable without a session', async t => {
  const directory = await temporary(t);
  const { episode, lossCode, count } = await createFixture(directory, fixture.skillBaseline.digest);
  assert.equal(lossCode, 'LS_STALE_WORKSPACE');
  assert.equal(count, 1);
  const reloaded = JSON.parse(await readFile(join(directory, 'episode.json'), 'utf8'));
  const report = await inspectEpisodeEvidence(reloaded, { root: directory });
  assert.equal(report.sessionRequired, false);
  assert.equal(report.joins[0].status, 'verified');
  await rm(join(directory, 'query-profile.json'));
  const missing = await inspectEpisodeEvidence(episode, { root: directory });
  assert.equal(missing.status, 'partial');
  assert.deepEqual(missing.missingArtifacts, ['query-receipt']);
  assert.equal(missing.joins[0].status, 'unavailable');
  assert.ok(missing.evidence.find(value => value.id === 'query-receipt').missingEvidence.includes('Saved artifact is now unavailable'));
});

test('objective chains require ordered observable user messages and cannot relabel earlier actions', () => {
  for (const mutate of [
    e => { e.objectives[1].previousId = 'unknown'; },
    e => { e.objectives[1].eventId = 'event-5'; },
    e => { e.events[1].objectiveIds = ['objective-2']; },
    e => { e.joins[0].objectiveId = 'objective-2'; },
    e => { e.outcomes[1].objectiveId = 'unknown'; },
    e => { e.outcomes[0].objectiveId = 'objective-2'; },
    e => { e.events[1].itemId = 'message-1'; },
  ]) { const e = clone(); mutate(e); assert.throws(() => validateEpisode(e), /contract/u); }
});

test('incomplete, reconstructed and historical evidence cannot become an unqualified machine pass', () => {
  for (const mutate of [
    e => { e.evidence[2].historicalHandle.state = 'live'; },
    e => { e.evidence[3].completion = 'scoped-complete'; },
    e => { e.evidence[1].artifact = null; },
    e => { e.evidence[4].missingEvidence = []; },
    e => { e.joins[1].operationId = 'invented'; },
    e => { e.outcomes[0].evidenceIds = ['reconstruction']; },
    e => { e.outcomes[1].missingEvidence = []; },
  ]) { const e = clone(); mutate(e); assert.throws(() => validateEpisode(e), /contract/u); }
});

test('contracts reject unsupported versions/fields, secret containers and executable/non-JSON values', () => {
  for (const mutate of [
    e => { e.schemaVersion = '2.0.0'; },
    e => { e.host.capability = 'not-an-allowed-secret-field'; },
    e => { e.hiddenReasoning = 'not observable'; },
    e => { e.events[0].sequence = NaN; },
    e => { e.objectives[0].statement = undefined; },
    e => { e.events[0].sequence = 1.5; },
    e => { e.events.capability = 'extra-field'; },
    e => { e.host.memory.use = 'disabled'; },
  ]) { const e = clone(); mutate(e); assert.throws(() => validateEpisode(e), /contract/u); }
  let invoked = false;
  const malicious = {};
  Object.defineProperty(malicious, 'schemaVersion', { enumerable: true, get() { invoked = true; return '1.0.0'; } });
  assert.throws(() => validateRecord('episode', malicious), /accessors/u);
  assert.equal(invoked, false);
});

test('artifact integrity and JSON selectors fail closed, without a session or source re-fetch', async t => {
  const directory = await temporary(t);
  await cp(fixtureRoot, directory, { recursive: true });
  await writeFile(join(directory, 'pathway.ttl'), '<urn:changed> <urn:p> <urn:o> .');
  await assert.rejects(inspectEpisodeEvidence(fixture, { root: directory }), /hash mismatch/u);
  await cp(fixtureRoot, directory, { recursive: true });
  const e = clone(); e.evidence[1].artifact.pointer = '/no-such-field';
  await assert.rejects(inspectEpisodeEvidence(e, { root: directory }), /Missing evidence selector/u);
});

test('false operation correlation is rejected even when edited artifacts have valid new hashes', async t => {
  const directory = await temporary(t);
  await cp(fixtureRoot, directory, { recursive: true });
  const e = clone(); e.joins[0].operationId = 'wrong-operation';
  await assert.rejects(inspectEpisodeEvidence(e, { root: directory }), /does not match saved receipt/u);
  const host = JSON.parse(await readFile(join(directory, 'observable-events.json'), 'utf8'));
  host.thread.turns[0].items[1].result = { content: [{ type: 'text', text: 'missing correlation' }] };
  e.joins[0].operationId = fixture.joins[0].operationId;
  e.host.observableEvents.sha256 = await writeJson(directory, 'observable-events.json', host);
  for (const basis of ['explicit', 'verified-content']) {
    e.joins[0].basis = basis;
    await assert.rejects(inspectEpisodeEvidence(e, { root: directory }), /lacks observable/u);
  }
});

test('evidence paths reject traversal, absolute paths and symlink escape', async t => {
  for (const path of ['/tmp/a', '../outside', 'nested/../../outside', 'a\\b', 'file:/tmp/a']) {
    const e = clone(); e.evidence[0].artifact.path = path;
    assert.throws(() => validateEpisode(e), /relative path/u);
  }
  const directory = await temporary(t);
  await cp(fixtureRoot, directory, { recursive: true });
  await rm(join(directory, 'pathway.ttl'));
  await symlink(join(fixtureRoot, 'pathway.ttl'), join(directory, 'pathway.ttl'));
  await assert.rejects(inspectEpisodeEvidence(fixture, { root: directory }), /Symlink/u);
});

test('frozen baseline preserves historical skill files and references with reproducible hash, not activation', async () => {
  const described = await describeSkillBaseline(join(root, destination, 'files'));
  const verified = await verifySkillBaseline({ root, destination });
  assert.equal(described.digest, verified.digest);
  assert.equal(described.digest, fixture.skillBaseline.digest);
  assert.equal(described.files.filter(file => file.role === 'skill-file').length, 6);
  assert.ok(described.files.some(file => file.path.endsWith('agents/openai.yaml')));
  assert.ok(described.files.some(file => file.role === 'direct-repository-reference'));
  assert.equal(verified.discovery, 'not-observed');
  assert.equal(verified.loading, 'not-observed');
});

test('snapshot refuses overwrite and detects altered, added and executable files', async t => {
  const directory = await temporary(t);
  const manifest = JSON.parse(await readFile(join(root, destination, 'manifest.json'), 'utf8'));
  for (const file of manifest.files) {
    await mkdir(join(directory, file.path, '..'), { recursive: true });
    await cp(join(root, destination, 'files', file.path), join(directory, file.path));
  }
  const first = await snapshotSkillBaseline({ root: directory, destination });
  assert.equal(first.digest, manifest.digest);
  await assert.rejects(snapshotSkillBaseline({ root: directory, destination }), { code: 'EEXIST' });
  const target = join(directory, destination, 'files', '.agents/skills/linked-data-repl/SKILL.md');
  await chmod(target, 0o755);
  await assert.rejects(verifySkillBaseline({ root: directory, destination }), /file mismatch/u);
  await chmod(target, 0o644);
  await writeFile(join(directory, destination, 'files', 'unexpected.txt'), 'extra');
  await assert.rejects(verifySkillBaseline({ root: directory, destination }), /unmanifested/u);
  const reference = '.agents/skills/linked-data-repl/references/repl-environment.md';
  await writeFile(join(directory, reference), (await readFile(join(directory, reference), 'utf8')) + '\nChanged reference.\n');
  assert.notEqual((await describeSkillBaseline(directory)).digest, first.digest);
});
