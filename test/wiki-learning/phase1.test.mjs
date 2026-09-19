import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectHistory, buildImportedEpisode, importEpisode } from '../../lib/wiki-learning/episode-import.mjs';
import { inspectEpisodeEvidence } from '../../lib/wiki-learning/evidence.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const destination = 'artifacts/wiki-learning/episodes/wikiskill-planning-20260919';
const draft = JSON.parse(await readFile(join(root, destination, 'episode.json'), 'utf8'));
const observed = JSON.parse(await readFile(join(root, destination, 'observable-events.json'), 'utf8'));
// Synthetic supplied-export envelope around retained items. Artificial ordering
// timestamps here test the adapter; they are not added to the real episode.
function input() {
  const turns = observed.thread.turns.map((t, n) => ({ id: t.id, startedAt: n, items: t.items.map(i => i.type === 'userMessage' ? { ...i, content: [{ type: 'text', text: i.text }] } : { ...i }) }));
  return { pages: [{ schemaVersion: 1, thread: { id: observed.thread.id }, page: { order: 'newest_first', hasMore: true, nextCursor: 'opaque' }, turns: [...turns].reverse() }], selections: turns.flatMap(t => t.items.map(i => ({ turnId: t.id, itemId: i.id, ...(i.text ? { excerpt: i.text } : {}) }))), draft: structuredClone(draft) };
}
const project = value => projectHistory(value.pages, value.selections, { taskId: draft.host.taskId });

test('real selected episode retains objective correction, lossy coverage and no verified scientific join', async () => {
  const report = await inspectEpisodeEvidence(draft, { root });
  assert.equal(report.status, 'passed'); assert.equal(report.scope, 'reference-integrity-only');
  assert.deepEqual(report.joins.map(j => j.status), ['inferred', 'unresolved']);
  assert.equal(draft.capture.kind, 'selected-import'); assert.equal(draft.capture.completeness, 'partial');
  assert.match(draft.objectives[1].statement, /separate from Obsidian/u);
  assert.equal(observed.coverage.retainedItems, 10); assert.equal(observed.coverage.excerptBytes, 329);
  assert.ok(observed.coverage.pages.every(p => p.hasMore));
  assert.ok(observed.thread.turns.flatMap(t => t.items).filter(i => i.type === 'agentMessage').every(i => i.evidenceClass === 'reported-claim'));
  assert.ok(report.evidence.every(e => !e.liveHandle));
});

test('selection excludes arguments, result payload, reasoning and unrelated items; orders newest-first pages', () => {
  const value = input(); const turn = value.pages[0].turns[0];
  turn.items.push({ id: 'reasoning-1', type: 'reasoning', text: 'private' });
  const tool = turn.items.find(i => i.type === 'mcpToolCall');
  tool.arguments = { capability: 'private' }; tool.result = { operationId: 'invented' };
  const result = project(value);
  assert.equal(result.thread.turns[0].id, observed.thread.turns[0].id);
  assert.doesNotMatch(JSON.stringify(result), /private|invented/u);
  assert.equal(result.coverage.sourceTruncation, 'unknown');
  const episode = buildImportedEpisode(result, value.draft, `${destination}/observable-events.json`);
  assert.equal(episode.host.memory.use, 'unknown');
});

test('voice transcript and assistant assertions cannot be promoted to observed runtime results', () => {
  const value = input(); const turn = value.pages[0].turns.at(-1);
  turn.items[0].content[0].text = '<realtime_delegation><transcript_delta>' + turn.items[0].content[0].text + '</transcript_delta></realtime_delegation>';
  const projection = project(value);
  assert.equal(projection.thread.turns[0].items[0].evidenceClass, 'quoted-transcript');
  value.draft.joins[0].basis = 'explicit'; value.draft.joins[0].operationId = 'op-000002';
  assert.throws(() => buildImportedEpisode(projection, value.draft, 'observable.json'), /metadata-only/u);
});

test('unknown task/schema, fabricated excerpts, duplicate/missing selections and reasoning selections reject', () => {
  for (const mutate of [
    v => { v.pages[0].thread.id = 'other'; },
    v => { v.pages[0].schemaVersion = 99; },
    v => { v.selections[0].excerpt = 'not observed'; },
    v => { v.selections.push(v.selections[0]); },
    v => { v.selections[0].itemId = 'missing'; },
    v => { v.pages[0].turns.at(-1).items[0].type = 'reasoning'; },
    v => { v.selections[0].extra = 'not allowed'; },
  ]) { const value = input(); mutate(value); assert.throws(() => project(value), /History import/u); }
});

test('duplicate pages deduplicate; conflicting duplicates, oversized inputs and secret excerpts reject', () => {
  const value = input(); value.pages.push(structuredClone(value.pages[0]));
  assert.equal(project(value).coverage.retainedItems, 10);
  value.pages[1].turns[0].items[0].content[0].text = 'different';
  assert.throws(() => project(value), /conflicting/u);
  const oversized = input(); oversized.pages[0].extra = 'x'.repeat(1024 * 1024);
  assert.throws(() => project(oversized), /byte bound/u);
  const secret = input(); secret.selections[0].excerpt = 'token=private-value';
  secret.pages[0].turns.at(-1).items[0].content[0].text = secret.selections[0].excerpt;
  assert.throws(() => project(secret), /possible secret/u);
});

test('import is idempotent, refuses conflicts, preserves missing evidence and rejects corruption before writing', async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'wiki-phase1-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const value = input(); const receiptPath = draft.evidence[0].artifact.path;
  await mkdir(dirname(join(temporary, receiptPath)), { recursive: true });
  await writeFile(join(temporary, receiptPath), await readFile(join(root, receiptPath)));
  const args = { ...value, root: temporary, destination };
  assert.equal((await importEpisode(args)).created, true);
  assert.equal((await importEpisode(args)).created, false);
  const changed = structuredClone(value); changed.draft.outcomes[0].claim = 'Changed interpretation';
  await assert.rejects(importEpisode({ ...args, ...changed }), /conflicting import/u);
  await rm(join(temporary, receiptPath));
  assert.equal((await importEpisode(args)).status, 'partial');
  await writeFile(join(temporary, receiptPath), 'corrupt');
  const other = 'artifacts/wiki-learning/episodes/corrupt-input';
  await assert.rejects(importEpisode({ ...args, destination: other }), /hash mismatch/u);
  await assert.rejects(access(join(temporary, other)), /ENOENT/u);
});
