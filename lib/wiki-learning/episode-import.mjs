import { mkdir, readFile, readdir, lstat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertRelativePath, validateEpisode } from './contracts.mjs';
import { sha256, inspectEpisodeEvidence, readEvidenceArtifact } from './evidence.mjs';

const encode = value => JSON.stringify(value, null, 2) + '\n';
const id = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(value);
const requireValue = (condition, message) => { if (!condition) throw new Error(`History import: ${message}`); };
const sensitive = /(?:Bearer\s+\S+|sk-[a-zA-Z0-9_-]{12,}|(?:token|secret|password|capability)\s*[:=]\s*\S+)/iu;

/** Selected read_thread pages supplied by the caller, never a host connection.
 * Exact excerpts are checked against observed text before retention. Everything
 * else (arguments, output bodies, reasoning, summaries) is omitted by default.
 */
export function projectHistory(pages, selections, { taskId, includeOutputs = false, maxOutputCharsPerItem = 1800 } = {}) {
  requireValue(id(taskId), 'task identity');
  requireValue(Array.isArray(pages) && pages.length > 0 && pages.length <= 8, 'page bound');
  requireValue(Buffer.byteLength(JSON.stringify(pages)) <= 1024 * 1024, 'input byte bound');
  requireValue(Array.isArray(selections) && selections.length > 0 && selections.length <= 32, 'selection bound');
  requireValue(typeof includeOutputs === 'boolean' && Number.isSafeInteger(maxOutputCharsPerItem) && maxOutputCharsPerItem > 0 && maxOutputCharsPerItem <= 4096, 'read options');
  const items = new Map(), turns = new Map(), coverage = [];
  for (const page of pages) {
    requireValue(page.schemaVersion === 1 && page.thread?.id === taskId, 'unsupported schema or unrelated task');
    requireValue(page.page?.order === 'newest_first' && typeof page.page.hasMore === 'boolean' && Array.isArray(page.turns) && page.turns.length <= 32, 'page shape');
    coverage.push({ returnedTurns: page.turns.length, hasMore: page.page.hasMore, nextCursorAvailable: Boolean(page.page.nextCursor) });
    for (const turn of page.turns) {
      requireValue(id(turn.id) && Number.isFinite(turn.startedAt) && Array.isArray(turn.items) && turn.items.length <= 512, 'turn shape/bound');
      if (turns.has(turn.id)) requireValue(turns.get(turn.id) === turn.startedAt, 'conflicting turn');
      turns.set(turn.id, turn.startedAt);
      for (const [position, item] of turn.items.entries()) {
        requireValue(id(item.id), 'item identity');
        const key = `${turn.id}/${item.id}`;
        const entry = { turnId: turn.id, startedAt: turn.startedAt, position, item };
        if (items.has(key)) requireValue(JSON.stringify(items.get(key)) === JSON.stringify(entry), 'conflicting duplicate item');
        else items.set(key, entry);
      }
    }
  }
  requireValue(turns.size <= 32 && items.size <= 1024, 'aggregate history bound');
  const seen = new Set();
  let excerptBytes = 0;
  const selected = selections.map(selection => {
    requireValue(Object.keys(selection).every(key => ['turnId', 'itemId', 'excerpt'].includes(key)), 'unknown selection field');
    const key = `${selection.turnId}/${selection.itemId}`;
    requireValue(!seen.has(key), 'duplicate selection'); seen.add(key);
    const found = items.get(key);
    requireValue(found, 'missing selected item');
    const { item } = found;
    requireValue(['userMessage', 'agentMessage', 'mcpToolCall'].includes(item.type), 'unsupported selected item; no reasoning or untyped outputs');
    const retained = { id: item.id, type: item.type };
    if (item.type === 'mcpToolCall') {
      requireValue(!selection.excerpt && typeof item.server === 'string' && typeof item.tool === 'string', 'tool metadata');
      requireValue(['completed', 'failed', 'inProgress'].includes(item.status), 'tool status');
      retained.server = item.server; retained.tool = item.tool; retained.status = item.status;
      retained.evidenceClass = 'observed-tool-metadata';
      retained.output = 'not-retained';
      // Never promote delegation arguments or a quoted receipt into a result.
    } else {
      const text = item.type === 'agentMessage' ? item.text : (item.content ?? []).filter(value => value.type === 'text').map(value => value.text).join('\n');
      const excerpt = selection.excerpt;
      requireValue(typeof excerpt === 'string' && excerpt.length > 0 && excerpt.length <= 400 && typeof text === 'string' && text.includes(excerpt), 'excerpt must match observed text within bounds');
      requireValue(!sensitive.test(excerpt), 'possible secret; choose a smaller safe excerpt');
      excerptBytes += Buffer.byteLength(excerpt);
      retained.text = excerpt;
      retained.evidenceClass = item.type === 'agentMessage' ? 'reported-claim' : /<realtime_delegation>|<transcript_delta>/u.test(text) ? 'quoted-transcript' : 'user-request';
      retained.excerptOnly = true;
      retained.sourceTruncation = 'unknown';
    }
    return { ...found, item: retained };
  }).sort((a, b) => a.startedAt - b.startedAt || a.turnId.localeCompare(b.turnId) || a.position - b.position);
  requireValue(excerptBytes <= 2400, 'total excerpt byte bound');
  const retainedTurns = [];
  for (const entry of selected) {
    let turn = retainedTurns.find(value => value.id === entry.turnId);
    if (!turn) { turn = { id: entry.turnId, items: [] }; retainedTurns.push(turn); }
    turn.items.push(entry.item);
  }
  return { format: 'linked-science-selected-history/v1', thread: { id: taskId, turns: retainedTurns }, coverage: {
    interface: 'codex_app.read_thread', schemaVersion: 1, readOptions: { includeOutputs, maxOutputCharsPerItem }, pages: coverage,
    suppliedTurns: turns.size, suppliedItems: items.size, retainedItems: selected.length, excerptBytes,
    completeness: 'partial', sourceTruncation: 'unknown', hostSummaries: 'lossy; not retained',
    gaps: ['Only explicitly selected items retained; no whole-history completeness claim', 'Outputs and arguments not retained; tool metadata is not runtime proof', 'Earlier pathway events and original voice-session operations not selected or established', 'Source item truncation is not attested by this interface; context display may truncate separately', 'Host memory use/generation and skill loading not observed'],
  } };
}

export function buildImportedEpisode(projection, draft, observablePath) {
  assertRelativePath(observablePath);
  requireValue(projection.format === 'linked-science-selected-history/v1', 'projection format');
  const actual = projection.thread.turns.flatMap(turn => turn.items.map(item => ({ turnId: turn.id, item })));
  requireValue(draft.events.length === actual.length, 'every retained item needs an event reference');
  for (const [index, event] of draft.events.entries()) {
    const source = actual[index];
    requireValue(event.turnId === source.turnId && event.itemId === source.item.id && event.kind === source.item.type, 'event ordering/identity mismatch');
  }
  const episode = validateEpisode({ ...draft,
    host: { ...draft.host, taskId: projection.thread.id, version: 'read_thread schemaVersion 1; host build not observed',
      observableEvents: { path: observablePath, sha256: sha256(encode(projection)), hashDomain: 'file-bytes', pointer: '' },
      memory: { use: 'unknown', generation: 'unknown', basis: 'not observed by selected history read' } },
    capture: { kind: 'selected-import', completeness: 'partial', gaps: [...projection.coverage.gaps, ...draft.capture.gaps] },
  });
  requireValue(episode.joins.every(link => ['inferred', 'unresolved'].includes(link.basis)), 'metadata-only history cannot verify scientific joins');
  requireValue(episode.outcomes.every(outcome => outcome.kind !== 'machine-check' || outcome.status !== 'passed'), 'metadata-only import cannot assert a machine pass');
  return episode;
}

/** Exclusive destination; identical completed imports are idempotent. Conflicts,
 * partial prior writes and concurrent writes are reported, never overwritten.
 */
export async function importEpisode({ root, destination, pages, selections, draft, readOptions }) {
  assertRelativePath(destination);
  requireValue(destination.startsWith('artifacts/wiki-learning/episodes/'), 'controlled episode destination required');
  const projection = projectHistory(pages, selections, { ...readOptions, taskId: draft.host.taskId });
  const episode = buildImportedEpisode(projection, draft, `${destination}/observable-events.json`);
  // Reject corrupt references before creating a durable import directory.
  for (const evidence of episode.evidence) if (evidence.artifact) await readEvidenceArtifact(root, evidence.artifact);
  const files = { 'observable-events.json': encode(projection), 'episode.json': encode(episode) };
  let current = root;
  const parts = destination.split('/');
  for (const part of parts.slice(0, -1)) {
    current = resolve(current, part);
    try { await mkdir(current); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    const info = await lstat(current); requireValue(info.isDirectory() && !info.isSymbolicLink(), 'unsafe destination ancestor');
  }
  const target = resolve(root, destination);
  let created = false;
  try { await mkdir(target); created = true; } catch (error) { if (error.code !== 'EEXIST') throw error; }
  requireValue(!(await lstat(target)).isSymbolicLink(), 'symlink destination');
  if (created) for (const [name, bytes] of Object.entries(files)) await writeFile(resolve(target, name), bytes, { flag: 'wx' });
  else {
    requireValue((await readdir(target)).sort().join() === Object.keys(files).sort().join(), 'conflicting/incomplete destination');
    for (const [name, bytes] of Object.entries(files)) {
      requireValue(!(await lstat(resolve(target, name))).isSymbolicLink(), 'symlink artifact');
      requireValue(await readFile(resolve(target, name), 'utf8') === bytes, 'conflicting import; choose a new destination');
    }
  }
  const report = await inspectEpisodeEvidence(episode, { root });
  return { status: report.status, created, episodePath: `${destination}/episode.json`, coverage: projection.coverage, joins: report.joins };
}
