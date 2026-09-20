import test from 'node:test';
import assert from 'node:assert/strict';
import { setupLinkedScience } from '../lib/linked-science-runtime.mjs';

const rules = { id: 'subclass', version: '1', text: '@prefix : <urn:t:>. { ?s a :Neuron } => { ?s a :Cell }.' };
const opts = h => ({ sources: [h], rules, graphPolicy: 'default-graph-only', proof: true });
const response = { derived: '<urn:t:s> a <urn:t:Cell>.', proof: 'proof '.repeat(2000), complete: true, engine: { name: 'fixture', version: '1', sha256: 'fixture' }, elapsedMs: 1, limits: {} };
async function fixture(run = async () => response) {
  const facade = await setupLinkedScience({ nodeRepl: {}, reasoning: { capabilities: () => ({ available: true, limits: { maxInputBytes: 1024, maxOutputBytes: 20000 } }), run } });
  const ws = facade.open({ contextKey: 'reasoning-test' });
  const source = await ws.graphs.load({ kind: 'instance-data', name: 'facts', text: '<urn:t:s> a <urn:t:Neuron>.' });
  return { facade, ws, source };
}

test('reasoning retains separate derived facts, provenance and bounded unverified proof', async () => {
  const { ws, source } = await fixture();
  const run = await ws.reasoning.run(opts(source));
  assert.equal(ws.results.profile(source).count, 1);
  assert.equal(ws.results.profile(run.derived).type, 'inferred-graph');
  assert.equal(ws.reasoning.describe(run).complete, true);
  assert.equal(run.report.rules.authority, 'caller-supplied-premises');
  const answer = await ws.query.run({ sources: [source, run.derived], sparql: 'SELECT ?t WHERE { <urn:t:s> a ?t }' });
  assert.equal(ws.results.profile(answer).count, 2);
  const explanation = ws.reasoning.explain(run, { maxBytes: 300 });
  assert.equal(explanation.verified, false); assert.equal(explanation.truncated, true);
  assert.ok(Buffer.byteLength(JSON.stringify(explanation)) <= 300);
  const map = await ws.orientation.bootstrap({ maxBytes: 8000 });
  assert.ok(map.entries.some(e => e.reasoning?.validity === 'valid'));
  assert.ok(!JSON.stringify(map).includes(rules.text));
  await ws.release(source);
  const stale = await ws.orientation.bootstrap({ maxBytes: 8000 });
  assert.ok(stale.entries.some(e => e.reasoning?.validity === 'stale-or-released'));
  assert.throws(() => ws.reasoning.describe(run), { code: 'LS_RELEASED_HANDLE' });
  assert.throws(() => ws.rdf.source(run.derived), { code: 'LS_RELEASED_HANDLE' });
  await ws.release(run.proof); await ws.release(run.derived); await ws.dispose();
});

test('reasoning rejects named graphs and oversized complete inputs before host execution', async () => {
  let calls = 0;
  const { ws, source } = await fixture(async () => { calls++; return response; });
  await assert.rejects(ws.reasoning.run({ ...opts(source), limits: { maxInputBytes: 1 } }), { code: 'LS_REASONING_INPUT_LIMIT' });
  const named = await ws.graphs.load({ kind: 'instance-data', name: 'named', format: 'TriG', text: '<urn:g> { <urn:s> <urn:p> <urn:o> }' });
  await assert.rejects(ws.reasoning.run(opts(named)), { code: 'LS_REASONING_NAMED_GRAPH' });
  await assert.rejects(ws.reasoning.run({ ...opts(source), graphPolicy: 'union' }), { code: 'LS_REASONING_GRAPH_POLICY' });
  assert.equal(calls, 0); await ws.dispose();
});

test('incomplete and malformed outputs publish no partial handles', async () => {
  for (const value of [{ ...response, complete: false }, { ...response, derived: 'invalid turtle' }]) {
    const { ws, source } = await fixture(async () => value);
    await assert.rejects(ws.reasoning.run(opts(source)));
    assert.equal(ws.inventory().total, 1); await ws.dispose();
  }
});

test('release and disposal while host reasoning runs prevent late publication', async () => {
  for (const action of ['release', 'dispose']) {
    let done, started;
    const ready = new Promise(r => { started = r; });
    const { ws, source } = await fixture(() => { started(); return new Promise(r => { done = r; }); });
    const pending = ws.reasoning.run(opts(source));
    await ready;
    if (action === 'release') await ws.release(source); else await ws.dispose();
    done(response); await assert.rejects(pending, e => ['LS_RELEASED_HANDLE','LS_STALE_WORKSPACE'].includes(e.code));
    if (action === 'release') { assert.equal(ws.inventory().total, 0); await ws.dispose(); }
  }
});

test('blank node identity in derived output rejoins the original single input dataset', async () => {
  let data;
  const { ws } = await fixture(async request => { data = request.data; return { ...response, derived: '_:s0b0 <urn:inferred> <urn:yes> .' }; });
  const source = await ws.graphs.load({ kind: 'instance-data', name: 'blank', text: '_:x <urn:asserted> <urn:yes> .' });
  const run = await ws.reasoning.run(opts(source));
  assert.match(data, /_:s0b0/);
  const joined = await ws.query.run({ sources: [source, run.derived], sparql: 'SELECT ?s WHERE { ?s <urn:asserted> <urn:yes>; <urn:inferred> <urn:yes> }' });
  assert.equal(ws.results.profile(joined).count, 1); await ws.dispose();
});

test('missing adapter is explicit; foreign run and proof-less run cannot be inspected as proofs', async () => {
  const facade = await setupLinkedScience({ nodeRepl: {} });
  const ws = facade.open({ contextKey: 'unavailable-test' });
  const source = await ws.graphs.load({ kind: 'instance-data', name: 'facts', text: '<urn:s> <urn:p> <urn:o> .' });
  assert.equal(ws.reasoning.capabilities().available, false);
  await assert.rejects(ws.reasoning.run(opts(source)), { code: 'LS_REASONING_UNAVAILABLE' });
  const f = await fixture(); const run = await f.ws.reasoning.run({ ...opts(f.source), proof: false });
  assert.throws(() => f.ws.reasoning.explain(run), { code: 'LS_REASONING_PROOF_UNAVAILABLE' });
  assert.throws(() => ws.reasoning.describe(run), { code: 'LS_REASONING_RUN' });
  await f.ws.dispose(); await ws.dispose();
});

test('a reasoning run snapshots caller rules and sources before asynchronous work', async () => {
  let done, started, request;
  const ready = new Promise(r => { started = r; });
  const { ws, source } = await fixture(input => { request = input; started(); return new Promise(r => { done = r; }); });
  const input = { ...opts(source), rules: { ...rules }, limits: { maxInputBytes: 1024 } };
  const pending = ws.reasoning.run(input);
  await ready;
  input.rules.text = 'mutated'; input.rules.version = 'wrong'; input.sources.length = 0; input.limits.maxInputBytes = 1;
  done(response);
  const run = await pending;
  assert.equal(request.rules, rules.text); assert.equal(request.limits.maxInputBytes, 1024);
  assert.equal(run.report.rules.version, '1'); assert.equal(run.report.inputs.length, 1);
  await ws.dispose();
});
