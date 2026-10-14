import { readFile, mkdir, writeFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { assertRelativePath } from './contracts.mjs';
import { sha256 } from './evidence.mjs';

const check = (ok, message) => { if (!ok) throw new Error(`Trajectory import: ${message}`); };
const encode = value => JSON.stringify(value, null, 2) + '\n';
const secret = /Bearer\s+\S+|sk-[a-zA-Z0-9_-]{12,}|(?:password|secret|token)\s*[=:]\s*["']?[^\s"',}]{8,}/iu;
const text = blocks => (blocks ?? []).filter(b => ['text', 'input_text', 'output_text'].includes(b.type)).map(b => b.text).join('\n');

// Only caller-selected response items are retained. No reasoning, system or
// developer messages, filesystem scan, memory-file inference, or code execution.
export function projectTrajectory(records, { taskId, selections }) {
  check(typeof taskId === 'string' && taskId.length > 0, 'task identity');
  check(Array.isArray(selections) && selections.length > 0 && selections.length <= 48, 'selection bound');
  check(records[0]?.type === 'session_meta' && records[0].payload?.id === taskId, 'wrong task');
  const sources = [], choices = [], seen = new Set();
  const add = (index, fields) => {
    const row = records[index], p = row.payload;
    const turnId = p.internal_chat_message_metadata_passthrough?.turn_id;
    check(typeof turnId === 'string' && turnId.length > 0, 'missing original turn identity');
    const source = { line: index + 1, turnId, record: fields, originalLineHash: sha256(JSON.stringify(row)) };
    sources.push(source); return sources.length - 1;
  };
  for (const selection of selections) {
    check(Object.keys(selection).every(k => ['itemId', 'callId', 'excerpt'].includes(k)), 'unknown selector');
    check(Boolean(selection.itemId) !== Boolean(selection.callId), 'select one message or exchange');
    const key = selection.itemId ?? selection.callId;
    check(!seen.has(key), 'duplicate selection'); seen.add(key);
    if (selection.itemId) {
      const matches = records.flatMap((r, i) => r.type === 'response_item' && r.payload?.id === selection.itemId ? [i] : []);
      check(matches.length === 1, 'missing or duplicate message');
      const i = matches[0], p = records[i].payload;
      check(p.type === 'message' && ['user', 'assistant'].includes(p.role) && p.channel !== 'analysis', 'unsupported message role/type or private reasoning');
      const body = text(p.content);
      check(typeof selection.excerpt === 'string' && selection.excerpt.length > 0 && selection.excerpt.length <= 1000 && body.includes(selection.excerpt), 'excerpt must match message');
      check(Buffer.byteLength(body) <= 16000 && !secret.test(body), 'message size or possible secret');
      const index = add(i, { type: p.type, id: p.id, role: p.role, text: body });
      choices.push({ source: index, excerpt: selection.excerpt });
    } else {
      check(!selection.excerpt, 'tool excerpts cannot stand in for complete selected outputs');
      const calls = [], outputs = [];
      records.forEach((r, i) => {
        if (r.type !== 'response_item' || r.payload?.call_id !== selection.callId) return;
        if (['custom_tool_call', 'function_call'].includes(r.payload.type)) calls.push(i);
        if (['custom_tool_call_output', 'function_call_output'].includes(r.payload.type)) outputs.push(i);
      });
      check(calls.length === 1 && outputs.length === 1 && calls[0] < outputs[0], 'missing, duplicate or unordered call/output');
      const p = records[calls[0]].payload, out = records[outputs[0]].payload;
      const input = p.input ?? p.arguments;
      const output = typeof out.output === 'string' ? out.output : text(out.output);
      check(typeof input === 'string' && typeof output === 'string', 'unsupported tool payload');
      check(Buffer.byteLength(input) <= 16000 && Buffer.byteLength(output) <= 64000 && !secret.test(input + '\n' + output), 'tool size or possible secret');
      const source = add(calls[0], { type: p.type, id: p.id ?? p.call_id, callId: p.call_id, name: p.name, input });
      const response = add(outputs[0], { type: out.type, id: out.id ?? `${p.call_id}-output`, callId: out.call_id, output });
      check(sources[source].turnId === sources[response].turnId, 'cross-turn exchange requires a separate adapter');
      choices.push({ source, response });
    }
  }
  const result = { format: 'linked-science-codex-trajectory/v1', taskId, sources, selections: choices,
    coverage: { completeness: 'selected-only', originalHistoryRetained: false, reasoningRetained: false, memoryIndexInspected: false,
      gaps: ['Unselected history omitted', 'Voice messages are quoted frontend transcripts, not original audio', 'Tool text may be producer-truncated; no result completeness inferred', 'Host assertions and saved hashes are not cryptographic attestation'] } };
  result.thread = trajectoryView(result);
  check(Buffer.byteLength(encode(result)) <= 512 * 1024, 'capture byte bound');
  return result;
}

// Reconstruct the observable view from selected source records, not an authored
// summary. Claims remain typed: a reported success never becomes a machine pass.
export function trajectoryView(capture) {
  check(capture.format === 'linked-science-codex-trajectory/v1', 'unknown capture format');
  check(Array.isArray(capture.sources) && capture.sources.length <= 96 && Array.isArray(capture.selections) && capture.selections.length > 0 && capture.selections.length <= 48, 'capture bounds');
  const entries = [], used = new Set();
  for (const selection of capture.selections) {
    const source = capture.sources[selection.source], p = source?.record;
    check(p && Number.isSafeInteger(source.line) && source.line > 0 && /^[a-f0-9]{64}$/u.test(source.originalLineHash), 'invalid source reference');
    check(!used.has(selection.source), 'duplicate source'); used.add(selection.source);
    let item;
    if (p.type === 'message') {
      check(['user', 'assistant'].includes(p.role) && typeof p.text === 'string' && typeof selection.excerpt === 'string' && selection.excerpt.length > 0 && selection.excerpt.length <= 1000 && p.text.includes(selection.excerpt), 'invalid message witness');
      item = { id: p.id, type: p.role === 'user' ? 'userMessage' : 'agentMessage', text: selection.excerpt,
        evidenceClass: p.role === 'assistant' ? 'reported-claim' : /<realtime_delegation>/u.test(p.text) ? 'quoted-transcript' : 'user-request' };
    } else {
      const response = capture.sources[selection.response], o = response?.record;
      check(['custom_tool_call', 'function_call'].includes(p.type) && ['custom_tool_call_output', 'function_call_output'].includes(o?.type), 'invalid exchange types');
      check(typeof p.callId === 'string' && p.callId === o.callId && source.line < response.line && source.turnId === response.turnId, 'exchange correlation mismatch');
      check(typeof p.input === 'string' && typeof o.output === 'string', 'invalid exchange payload');
      check(!used.has(selection.response), 'duplicate output'); used.add(selection.response);
      item = { id: p.callId, type: 'toolCall', tool: p.name, argumentsText: p.input, outputText: o.output, evidenceClass: 'observed-tool-exchange',
        scientificCompletion: 'not-inferred' };
    }
    entries.push({ line: source.line, turnId: source.turnId, item });
  }
  check(used.size === capture.sources.length, 'unselected sources in capture');
  entries.sort((a,b) => a.line - b.line);
  const turns = [];
  for (const entry of entries) {
    let turn = turns.find(t => t.id === entry.turnId);
    if (!turn) { turn = { id: entry.turnId, items: [] }; turns.push(turn); }
    check(!turn.items.some(i => i.id === entry.item.id), 'duplicate event identity');
    turn.items.push(entry.item);
  }
  return { id: capture.taskId, turns };
}

export async function importTrajectory({ sourcePath, taskId, selections, root, destination }) {
  assertRelativePath(destination);
  check(destination.startsWith('artifacts/wiki-learning/episodes/'), 'controlled destination required');
  const sourceInfo = await lstat(sourcePath);
  check(sourceInfo.isFile() && !sourceInfo.isSymbolicLink() && sourceInfo.size <= 32 * 1024 * 1024, 'history file bound/type');
  const bytes = await readFile(sourcePath);
  check(bytes.length <= 32 * 1024 * 1024, 'history byte bound');
  const rows = bytes.toString('utf8').split('\n');
  if (rows.at(-1) === '') rows.pop();
  // An actively appended partial line is not silently discarded.
  const records = rows.map(line => JSON.parse(line));
  const capture = projectTrajectory(records, { taskId, selections });
  let directory = root;
  for (const part of destination.split('/')) {
    directory = join(directory, part);
    try { await mkdir(directory); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    const info = await lstat(directory);
    check(info.isDirectory() && !info.isSymbolicLink(), 'unsafe destination');
  }
  const path = `${destination}/trajectory.json`;
  await writeFile(join(root, path), encode(capture), { flag: 'wx', mode: 0o600 });
  return { path, sha256: sha256(encode(capture)), hashDomain: 'file-bytes', pointer: '' };
}
