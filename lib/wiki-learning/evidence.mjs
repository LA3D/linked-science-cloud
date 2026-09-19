import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { assertRelativePath, validateEpisode } from './contracts.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export async function readConfinedFile(root, path, maxBytes = 2 * 1024 * 1024) {
  assertRelativePath(path);
  let absolute = await realpath(root);
  for (const part of path.split('/')) {
    absolute = join(absolute, part);
    const info = await lstat(absolute);
    if (info.isSymbolicLink()) throw new Error(`Symlink not allowed in evidence path: ${path}`);
  }
  const info = await lstat(absolute);
  if (!info.isFile() || info.size > maxBytes) throw new Error(`Evidence file bound/type: ${path}`);
  const bytes = await readFile(absolute);
  if (bytes.length > maxBytes) throw new Error(`Evidence file bound: ${path}`);
  return bytes;
}

function select(value, pointer) {
  if (!pointer) return value;
  if (!pointer.startsWith('/')) throw new Error('Invalid evidence JSON pointer');
  for (const encoded of pointer.slice(1).split('/')) {
    if (/~(?![01])/u.test(encoded)) throw new Error('Invalid evidence JSON pointer escape');
    const key = encoded.replace(/~1/gu, '/').replace(/~0/gu, '~');
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) throw new Error(`Missing evidence selector ${pointer}`);
    value = value[key];
  }
  return value;
}

export async function readEvidenceArtifact(root, descriptor) {
  let bytes;
  try { bytes = await readConfinedFile(root, descriptor.path); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (sha256(bytes) !== descriptor.sha256) throw new Error(`Evidence hash mismatch: ${descriptor.path}`);
  return { bytes, selected: descriptor.pointer ? select(JSON.parse(bytes.toString('utf8')), descriptor.pointer) : null };
}

// Project runtime results.profile(handle), preserved as JSON without changing
// its format. This is a narrow projection, not a competing receipt contract.
function profileOperation(profile) {
  if (profile?.handle?.kind !== 'linked-science-handle' || typeof profile.provenance?.operationId !== 'string' || profile.lineage?.operationId !== profile.provenance.operationId) throw new Error('Expected existing Linked Science result profile with matching operation lineage');
  const completion = profile.provenance.completion;
  if (completion?.kind !== 'linked-science-result-completion' || typeof completion.complete !== 'boolean' || completion.scope !== 'submitted-query') throw new Error('Expected existing query completion receipt');
  return { operationId: profile.provenance.operationId, traversalId: profile.provenance.attempt?.traversalId ?? null, completion };
}

/** Check selected saved evidence without any REPL/session or host connection.
 * Missing bytes stay explicit in the report; corruption and false joins fail.
 * This does not establish biological truth, host capture coverage, or authority.
 */
export async function inspectEpisodeEvidence(input, { root } = {}) {
  const episode = validateEpisode(input);
  const missing = [];
  const hostArtifact = await readEvidenceArtifact(root, episode.host.observableEvents);
  let hostItems = null;
  if (!hostArtifact) missing.push('observable-events-artifact');
  else {
    const view = hostArtifact.selected ?? JSON.parse(hostArtifact.bytes.toString('utf8'));
    if (view.thread?.id !== episode.host.taskId || !Array.isArray(view.thread.turns)) throw new Error('Observable task identity/turns mismatch');
    hostItems = new Map();
    for (const turn of view.thread.turns) for (const item of turn.items ?? []) {
      if (!['userMessage', 'agentMessage', 'mcpToolCall'].includes(item.type)) throw new Error('Unsupported observable item; reasoning is not imported');
      const key = `${turn.id}/${item.id}`;
      if (hostItems.has(key)) throw new Error('Duplicate observable host item');
      hostItems.set(key, item);
    }
    for (const event of episode.events) {
      if (hostItems.get(`${event.turnId}/${event.itemId}`)?.type !== event.kind) throw new Error('Event reference does not match observable item');
    }
  }
  const stored = new Map();
  const evidence = [];
  for (const entry of episode.evidence) {
    const content = entry.artifact ? await readEvidenceArtifact(root, entry.artifact) : null;
    if (entry.artifact && !content) missing.push(entry.id);
    if (content) stored.set(entry.id, content);
    evidence.push({ id: entry.id, kind: entry.kind, artifactAvailable: Boolean(content), sourcePayloadAvailable: entry.kind === 'durable-artifact' && Boolean(content), liveHandle: false, missingEvidence: [...entry.missingEvidence, ...(entry.artifact && !content ? ['Saved artifact is now unavailable'] : [])] });
  }
  const joins = episode.joins.map(link => {
    if (!['explicit', 'verified-content'].includes(link.basis)) return { id: link.id, status: link.basis };
    const content = stored.get(link.evidenceId);
    if (!content || !hostItems) return { id: link.id, status: 'unavailable' };
    const receipt = profileOperation(content.selected ?? JSON.parse(content.bytes.toString('utf8')));
    if (receipt.operationId !== link.operationId || receipt.traversalId !== link.traversalId) throw new Error('Join operation/traversal does not match saved receipt');
    const entry = episode.evidence.find(item => item.id === link.evidenceId);
    if (entry.completion === 'scoped-complete' && (!receipt.completion.complete || receipt.completion.truncated)) throw new Error('Evidence overclaims receipt completeness');
    // Explicit bridge correlation is only claimed when the host tool's retained
    // bounded result actually contains the same operation ID. No clock guessing.
    const event = episode.events.find(item => item.id === link.eventId);
    const item = hostItems.get(`${event.turnId}/${event.itemId}`);
    let correlation = item.result?.structuredContent;
    if (!correlation && item.result?.content?.length === 1 && item.result.content[0].type === 'text') {
      try { correlation = JSON.parse(item.result.content[0].text); } catch { /* not a structured correlation */ }
    }
    if (correlation?.operationId !== link.operationId) throw new Error('Verified join lacks observable tool-result correlation');
    return { id: link.id, status: 'verified', operationId: receipt.operationId };
  });
  return { kind: 'linked-science-episode-evidence-check', schemaVersion: '1.0.0', episodeId: episode.id, status: missing.length ? 'partial' : 'passed', scope: 'reference-integrity-only', sessionRequired: false, memory: episode.host.memory, missingArtifacts: missing, evidence, joins };
}
