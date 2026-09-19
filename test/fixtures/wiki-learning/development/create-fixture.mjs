import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setupLinkedScience } from '../../../../lib/linked-science-runtime.mjs';
import { sha256 } from '../../../../lib/wiki-learning/evidence.mjs';

// Local software fixture, not a historical task reconstruction or model run.
// Query profiles come from the real runtime; observable host items are synthetic.
export async function createFixture(root, baselineDigest) {
  await mkdir(root, { recursive: true });
  async function save(path, value, json = true) {
    const bytes = Buffer.from(json ? JSON.stringify(value, null, 2) + '\n' : value);
    await writeFile(join(root, path), bytes);
    return { path, sha256: sha256(bytes), hashDomain: 'file-bytes', pointer: '' };
  }
  const turtle = '<urn:a> <urn:activates> <urn:b> .\n<urn:b> <urn:inhibits> <urn:c> .\n';
  const source = await save('pathway.ttl', turtle, false);
  const runtime = await setupLinkedScience({ nodeRepl: {} });
  const workspace = runtime.open({ contextKey: 'wiki-phase0-fixture' });
  const graph = await workspace.graphs.load({ name: 'pathway', kind: 'instance-data', text: turtle });
  const result = await workspace.query.run({ sources: [graph], sparql: 'SELECT ?target WHERE { <urn:a> <urn:activates> ?target }' });
  const profile = workspace.results.profile(result);
  const receipt = await save('query-profile.json', profile);
  await runtime.reset({ contextKey: 'wiki-phase0-fixture' });
  let lossCode = null;
  try { workspace.results.profile(result); } catch (error) { lossCode = error.code; }
  if (!lossCode) throw new Error('Fixture expected old handle/workspace to be stale after reset');
  const host = await save('observable-events.json', {
    fixture: 'synthetic-observable-items-not-a-Codex-export',
    thread: { id: 'synthetic-task', turns: [
      { id: 'turn-1', items: [
        { id: 'message-1', type: 'userMessage', content: [{ type: 'text', text: 'Check that a query can read the local pathway fixture.' }] },
        { id: 'tool-1', type: 'mcpToolCall', server: 'cleanroom_node_repl', tool: 'js', status: 'completed', arguments: { code: '/* synthetic observable projection of the local query */' }, result: { content: [{ type: 'text', text: JSON.stringify({ operationId: profile.provenance.operationId, count: profile.count }) }] } },
      ] },
      { id: 'turn-2', items: [
        { id: 'message-2', type: 'userMessage', content: [{ type: 'text', text: 'Now show the whole pathway with interaction directions.' }] },
        { id: 'tool-2', type: 'mcpToolCall', server: 'cleanroom_node_repl', tool: 'js', status: 'completed', arguments: { code: '/* selected operation not retained in this fixture */' }, result: { content: [{ type: 'text', text: 'No operation identifier captured' }] } },
        { id: 'answer-2', type: 'agentMessage', text: 'The earlier query was a smoke check; no complete diagram is retained.' },
      ] },
    ] },
  });
  const reconstructed = await save('reconstruction.txt', 'Synthetic reconstruction: a later action may have attempted presentation. Exact action/result evidence is missing. This is not an observed historical episode.\n', false);
  const sourceIdentity = { identity: 'urn:synthetic:pathway', revision: 'fixture-v1', representation: 'text/turtle' };
  const historicalHandle = { sessionId: null, workspace: 'wiki-phase0-fixture', handleId: profile.handle.id, epoch: profile.handle.epoch, state: 'historical' };
  const ev = (id, kind, artifact, description, missingEvidence, completion = 'unknown') => ({ schemaVersion: '1.0.0', id, kind, artifact, historicalHandle: kind === 'historical-handle' || kind === 'receipt-only' ? historicalHandle : null, source: sourceIdentity, description, completion, missingEvidence });
  const episode = {
    schemaVersion: '1.0.0', id: 'synthetic-scope-change',
    host: { hostId: 'synthetic-host', taskId: 'synthetic-task', version: 'not-observed', observableEvents: host, memory: { use: 'unknown', generation: 'unknown', basis: 'not-observed; synthetic fixture, no host memory access' } },
    capture: { kind: 'synthetic', completeness: 'partial', gaps: ['Synthetic observable projection, not live Codex capture', 'Second action has no retained scientific operation correlation', 'No visualization artifact retained'] },
    runtime: { projectId: '@linked-science/runtime', version: runtime.version ?? 'not-observed', sessionState: 'lost' },
    skillBaseline: { manifestPath: 'artifacts/wiki-learning/baselines/repl-20260919-phase0/manifest.json', digest: baselineDigest, discovery: 'not-observed', loading: 'not-observed' },
    events: [
      { id: 'event-1', turnId: 'turn-1', itemId: 'message-1', kind: 'userMessage', sequence: 1, objectiveIds: ['objective-1'] },
      { id: 'event-2', turnId: 'turn-1', itemId: 'tool-1', kind: 'mcpToolCall', sequence: 2, objectiveIds: ['objective-1'] },
      { id: 'event-3', turnId: 'turn-2', itemId: 'message-2', kind: 'userMessage', sequence: 3, objectiveIds: ['objective-2'] },
      { id: 'event-4', turnId: 'turn-2', itemId: 'tool-2', kind: 'mcpToolCall', sequence: 4, objectiveIds: ['objective-2'] },
      { id: 'event-5', turnId: 'turn-2', itemId: 'answer-2', kind: 'agentMessage', sequence: 5, objectiveIds: ['objective-2'] },
    ],
    objectives: [
      { schemaVersion: '1.0.0', id: 'objective-1', previousId: null, eventId: 'event-1', statement: 'Check local query operation', acceptance: ['Query completes over local fixture'] },
      { schemaVersion: '1.0.0', id: 'objective-2', previousId: 'objective-1', eventId: 'event-3', statement: 'Show complete pathway structure', acceptance: ['Deliver a visual of both directed typed interactions'] },
    ],
    evidence: [
      ev('source', 'durable-artifact', source, 'Saved complete two-edge synthetic source', [], 'scoped-complete'),
      ev('query-receipt', 'receipt-only', receipt, 'Existing results.profile receipt from the local runtime', ['Full query bindings were not saved'], 'scoped-complete'),
      ev('old-result', 'historical-handle', null, 'Old result reference after runtime reset', ['Native result is unavailable after reset']),
      ev('reconstruction', 'reconstructed', reconstructed, 'Labeled synthetic reconstruction, not a machine observation', ['Exact second action and result missing']),
      ev('diagram', 'missing', null, 'Requested visualization was not retained', ['No diagram artifact available']),
    ],
    joins: [
      { id: 'join-1', eventId: 'event-2', objectiveId: 'objective-1', evidenceId: 'query-receipt', operationId: profile.provenance.operationId, traversalId: null, basis: 'explicit', note: 'Bounded tool result and saved profile share the operation identifier' },
      { id: 'join-2', eventId: 'event-4', objectiveId: 'objective-2', evidenceId: null, operationId: null, traversalId: null, basis: 'unresolved', note: 'Selected host action omitted scientific correlation; timestamps do not establish a join' },
    ],
    outcomes: [
      { schemaVersion: '1.0.0', id: 'outcome-1', objectiveId: 'objective-1', kind: 'machine-check', status: 'passed', claim: 'Local query produced one result', evidenceIds: ['query-receipt'], missingEvidence: [] },
      { schemaVersion: '1.0.0', id: 'outcome-2', objectiveId: 'objective-2', kind: 'agent-judgment', status: 'partial', claim: 'Smoke query does not establish delivery of a full pathway diagram', evidenceIds: ['diagram', 'reconstruction'], missingEvidence: ['No visualization or second-action receipt'] },
    ],
  };
  await save('episode.json', episode);
  return { episode, lossCode, count: profile.count };
}
