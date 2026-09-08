import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { DataFactory as df } from 'n3';
import { setupLinkedScience } from '../lib/linked-science-runtime.mjs';
import { PeekRegistry } from '../packages/cleanroom-node-repl/src/peek-runtime.mjs';

const q = (s, p, o) => df.quad(df.namedNode(s), df.namedNode(p), df.namedNode(o));
const semantic = view => view.entries.find(entry => entry.id === 'ls-semantic:observed');
// Mechanical proposal construction from inspected data, not an agent trial or seeded map.
const proposal = (handle, quads, id = 'observed') => ({ action: 'ADD', id: `ls-semantic:${id}`, entry: {
  section: 'context-understanding', claimKind: 'observed-relationship',
  text: `Observed predicate ${quads[0].predicate.value} linking distinct RDF terms in this representation.`,
  evidence: [{ handle, quads }],
} });
const load = (ws, quads, name = 'data-source', source = 'fixture-source') => ws.graphs.load({ name, kind: 'instance-data', quads, source: { kind: 'local-synthetic', id: source } });

for (const broker of [false, true]) test(`empty-map evidence workflow, two contexts, owner=${broker ? 'broker' : 'local'}`, async () => {
  const ls = await setupLinkedScience({ nodeRepl: {}, ...(broker ? { peek: new PeekRegistry() } : {}) });
  const receipt = JSON.parse(await readFile(new URL('../artifacts/open-goal-runs/2026-08-15-p00533-construct.json', import.meta.url)));
  const historical = receipt.observed.graph.map(row => q(row.subject, row.predicate, row.object));
  const catalog = [q('urn:edition', 'urn:editionOf', 'urn:work'), df.quad(df.namedNode('urn:work'), df.namedNode('urn:label'), df.literal('Livre', 'fr'), df.namedNode('urn:catalog'))];
  for (const [index, data] of [historical, catalog].entries()) {
    const context = { id: `fixture-${index}`, version: 'v1' };
    const ws = ls.open({ contextKey: `question-${index}`, orientationContext: context });
    assert.equal((await ws.orientation.bootstrap()).status, 'empty');
    const handle = await load(ws, data, 'data-source', index === 0 ? 'historical-uniprot-reconstruction' : 'synthetic-library');
    assert.equal((await ws.orientation.bootstrap()).entryCount, 1);
    const observed = [];
    for await (const quad of ws.rdf.source(handle).match()) observed.push(quad);
    const applied = await ws.orientation.update({ edits: [proposal(handle, observed)] });
    assert.equal(applied.status, 'applied');
    const view = await ws.orientation.bootstrap();
    assert.equal(semantic(view).validation, 'references-checked');
    assert.equal(semantic(view).semanticStatus, 'agent-proposed');
    assert.equal(semantic(view).evidence[0].quadCount, data.length);
    assert.equal(semantic(view).evidence[0].quads, undefined, 'bootstrap is a compact presentation, not bulk evidence');
    assert.equal(Buffer.byteLength(JSON.stringify(view)) <= 4096, true);
    const followup = ls.open({ contextKey: `followup-${index}`, orientationContext: context });
    const reused = semantic(await followup.orientation.bootstrap());
    assert.equal(reused.text, semantic(view).text);
    assert.equal(reused.residency[0].status, 'external-workspace');
    assert.equal(reused.dependencyStatus, 'source-not-observed');
    assert.equal((await followup.orientation.update({ edits: [proposal(handle, observed, 'foreign')] })).status, 'rejected');
    const result = await ws.query.run({ sources: [handle], sparql: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }' });
    const resultQuads = [];
    for await (const quad of ws.rdf.source(result).match()) resultQuads.push(quad);
    assert.equal((await ws.orientation.update({ edits: [proposal(result, resultQuads, 'result')] })).status, 'applied');
    assert.equal((await ws.orientation.bootstrap({ maxBytes: 256 })).omittedCount > 0, true);
    const snapshot = JSON.stringify(await ws.orientation.current());
    const bad = proposal(handle, [q('urn:absent', 'urn:p', 'urn:o')], 'invalid');
    assert.equal((await ws.orientation.update({ edits: [proposal(handle, observed, 'new'), bad] })).status, 'rejected');
    assert.equal(JSON.stringify(await ws.orientation.current()), snapshot, 'mixed batch must not partially apply');
    const queryText = proposal(handle, observed, 'query-text');
    queryText.entry.text = 'SELECT * WHERE { ?s ?p ?o }';
    assert.equal((await ws.orientation.update({ edits: [queryText] })).status, 'rejected');
    await ls.reset({ contextKey: `question-${index}` });
    const resumed = ls.open({ contextKey: `question-${index}` });
    assert.equal(semantic(await resumed.orientation.bootstrap()).residency[0].status, 'stale');
    assert.equal((await resumed.orientation.update({ edits: [proposal(handle, observed)] })).status, 'rejected');
    assert.equal((await resumed.orientation.bootstrap()).status, 'ready');
    const fresh = ls.open({ contextKey: `fresh-${index}`, orientationContext: { ...context, version: 'v2' } });
    assert.equal((await fresh.orientation.bootstrap()).status, 'empty');
  }
});

test('version changes flag only dependent claims, replacement uses fresh evidence, and native RDF survives envelopes', async () => {
  const ls = await setupLinkedScience({ nodeRepl: {}, peek: new PeekRegistry() });
  const ws = ls.open({ contextKey: 'version-check' });
  const original = [df.quad(df.blankNode('scoped'), df.namedNode('urn:label'), df.literal('Livre', 'fr'), df.namedNode('urn:g'))];
  const handle = await load(ws, original);
  const other = await load(ws, [q('urn:x', 'urn:y', 'urn:z')], 'other-source', 'other');
  await ws.orientation.update({ edits: [proposal(handle, original), proposal(other, [q('urn:x', 'urn:y', 'urn:z')], 'other')] });
  const entries = (await ws.orientation.current()).entries.map(entry => JSON.parse(entry.text));
  const quad = entries.find(entry => entry.kind === 'linked-science-semantic-entry').evidence[0].quads[0];
  assert.equal(quad.object.language, 'fr');
  assert.equal(quad.graph.value, 'urn:g');
  assert.equal(quad.subject.termType, 'BlankNode');
  const changed = [q('urn:new', 'urn:label', 'urn:value')];
  const newer = await load(ws, changed, 'changed-source');
  let view = await ws.orientation.bootstrap();
  assert.equal(semantic(view).dependencyStatus, 'dependency-changed');
  assert.equal(view.entries.find(entry => entry.id === 'ls-semantic:other').dependencyStatus, 'observed-version');
  assert.equal((await ws.orientation.update({ edits: [{ ...proposal(handle, original), action: 'REPLACE' }] })).status, 'rejected');
  const mixedVersions = proposal(handle, original, 'mixed');
  mixedVersions.entry.evidence.push({ handle: newer, quads: changed });
  assert.equal((await ws.orientation.update({ edits: [mixedVersions] })).status, 'rejected');
  assert.equal((await ws.orientation.update({ edits: [{ ...proposal(newer, changed), action: 'REPLACE' }] })).status, 'applied');
  view = await ws.orientation.bootstrap();
  assert.equal(semantic(view).dependencyStatus, 'observed-version');
});

test('cache failures do not hide acquired data; missing maps and budget eviction remain explicit', async () => {
  const peek = new PeekRegistry();
  const ls = await setupLinkedScience({ nodeRepl: {}, peek });
  const ws = ls.open({ contextKey: 'failure-check' });
  const edit = peek.edit.bind(peek);
  peek.edit = () => { throw new Error('cache unavailable'); };
  const data = [q('urn:a', 'urn:b', 'urn:c')];
  const handle = await load(ws, data);
  assert.equal(await ws.rdf.source(handle).countQuads(), 1);
  assert.equal((await ws.orientation.bootstrap()).status, 'update-failed');
  const ask = await ws.query.run({ sources: [handle], sparql: 'ASK { ?s ?p ?o }' });
  assert.equal(ws.results.profile(ask).type, 'boolean');
  peek.edit = edit;
  const recovered = await load(ws, data, 'recovered-source');
  assert.equal((await ws.orientation.update({ edits: [proposal(recovered, data)] })).status, 'applied');
  const initialBudget = peek.current('failure-check').tokenBudget;
  await ws.orientation.bootstrap();
  assert.equal(peek.current('failure-check').tokenBudget, initialBudget);
  await ws.orientation.bootstrap({ maxItems: 5 }); // 320 estimated tokens; metadata fits, semantic entry does not
  const result = await ws.orientation.update({ edits: [proposal(recovered, data, 'eviction')] });
  assert.equal(result.status, 'applied');
  assert.equal(result.evictedCount > 0, true);
  assert.equal(peek.current('failure-check').estimatedTokens <= 320, true);
  peek.clear('failure-check');
  assert.equal((await ws.orientation.bootstrap()).status, 'empty');
  assert.equal(await ws.rdf.source(recovered).countQuads(), 1, 'map loss does not lose data');
});

test('broker batches are atomic before eviction, including a failed replacement', () => {
  const peek = new PeekRegistry();
  peek.edit('atomic', [{ action: 'ADD', entry: { id: 'old', section: 'context-roadmap', text: 'original' } }]);
  const before = peek.current('atomic');
  assert.throws(() => peek.edit('atomic', [{ action: 'DELETE', id: 'old' }, { action: 'REPLACE', id: 'absent', entry: { section: 'context-understanding', text: 'missing' } }]));
  assert.deepEqual(peek.current('atomic'), before);
});
