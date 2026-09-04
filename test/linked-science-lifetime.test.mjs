import assert from 'node:assert/strict';
import test from 'node:test';
import { QueryEngine } from '@comunica/query-sparql';
import { setupLinkedScience } from '../lib/linked-science-runtime.mjs';
import { ResultSpoolRegistry } from '../packages/cleanroom-node-repl/src/result-spool.mjs';

const turtle = '<urn:s1> <urn:p> "a" . <urn:s2> <urn:p> "b" . <urn:s3> <urn:p> "c" .';
const select = 'SELECT * WHERE { ?s ?p ?o }';
const construct = 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }';
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

async function fixture(t, { storageOverride, budgets = {} } = {}) {
  const spool = new ResultSpoolRegistry();
  t.after(() => spool.close());
  const owner = { token: 'lifetime-test', epoch: 1 };
  const storage = {
    capabilities: () => spool.capabilities(),
    begin: options => spool.begin(options, owner),
    append: (storageId, items) => spool.append({ storageId, items }, owner),
    commit: (storageId, options = {}) => spool.commit({ storageId, ...options }, owner),
    page: (storageId, options = {}) => spool.page({ storageId, ...options }, owner),
    match: (storageId, options = {}) => spool.match({ storageId, ...options }, owner),
    count: (storageId, options = {}) => spool.count({ storageId, ...options }, owner),
    abort: storageId => spool.abort({ storageId }, owner),
  };
  storageOverride?.(storage);
  const ls = await setupLinkedScience({ nodeRepl: {}, resultStorage: storage, budgets: { maxResultItems: 1, ...budgets } });
  const open = contextKey => ls.open({ contextKey });
  const graph = ws => ws.graphs.load({ name: 'fixture', kind: 'instance-data', text: turtle });
  return { ls, spool, open, graph };
}

test('release invalidates access immediately and returns workspace graph capacity', async t => {
  const { open, graph } = await fixture(t, { budgets: { maxResidentGraphQuads: 3, maxWorkspaceGraphQuads: 3 } });
  const ws = open('release-graph');
  const first = await graph(ws);
  const view = ws.rdf.source(first);
  await assert.rejects(graph(ws), { code: 'LS_WORKSPACE_GRAPH_RESIDENCY_BOUND' });
  const release = ws.release(first);
  assert.throws(() => ws.results.profile(first), { code: 'LS_RELEASED_HANDLE' });
  assert.throws(() => view.countQuads(), { code: 'LS_RELEASED_HANDLE' });
  assert.deepEqual(ws.inventory().handles, []);
  assert.equal(ws.inventory().residentGraphQuads, 0);
  assert.equal((await release).status, 'released');
  const second = await graph(ws);
  assert.equal(ws.results.profile(second).count, 3);
  assert.notEqual(second.id, first.id);
});

test('native sources avoid whole-dataset copies and clones cannot mutate retained evidence', async t => {
  const { open, graph, spool } = await fixture(t);
  const ws = open('native-rdf');
  const original = await graph(ws);
  const source = ws.rdf.source(original);
  assert.equal(source.add, undefined);
  assert.equal(source.countQuads(), 3);
  const clone = ws.rdf.clone(original);
  clone.delete([...clone][0]);
  assert.equal(clone.size, 2);
  assert.equal(source.countQuads(), 3);
  assert.equal(ws.rdf.dataset(original).size, 3, 'legacy dataset remains an explicit copy');
  const engine = new QueryEngine();
  assert.equal(await engine.queryBoolean('ASK { <urn:s2> <urn:p> "b" }', { sources: [source] }), true);

  const stored = await ws.query.run({ sources: [original], sparql: construct });
  assert.equal(spool.records.size, 1);
  const storedSource = ws.rdf.source(stored);
  assert.equal(await storedSource.countQuads(), 3);
  assert.equal(await engine.queryBoolean('ASK { <urn:s3> <urn:p> "c" }', { sources: [storedSource] }), true);
  assert.throws(() => ws.rdf.clone(stored), { code: 'LS_STORED_RESULT_DATASET' });
  await ws.release(stored);
  assert.equal(spool.records.size, 0);
  assert.throws(() => storedSource.match(), { code: 'LS_RELEASED_HANDLE' });
});

test('workspace reset reclaims only its storage and preserves surviving result provenance', async t => {
  const { ls, open, graph, spool } = await fixture(t);
  const a = open('workspace-a');
  const b = open('workspace-b');
  const ga = await graph(a);
  const gb = await graph(b);
  const ra = await a.query.run({ sources: [ga], sparql: select });
  const rb = await b.query.run({ sources: [gb], sparql: select });
  assert.equal(spool.records.size, 2);
  await b.release(gb);
  assert.ok(b.results.profile(rb).provenance.sourceHandles.includes(gb.id));
  assert.equal((await b.results.page(rb)).total, 3);
  const resetting = ls.reset({ contextKey: 'workspace-a' });
  assert.throws(() => a.results.profile(ra), { code: 'LS_STALE_WORKSPACE' });
  await resetting;
  assert.equal(spool.records.size, 1);
  const fresh = open('workspace-a');
  assert.notEqual(fresh.epoch, a.epoch);
  assert.throws(() => fresh.results.profile(ra), { code: 'LS_STALE_HANDLE' });
  await b.dispose();
  await b.dispose();
  assert.equal(spool.records.size, 0);
  assert.equal(spool.totalBytes, 0);
  assert.notEqual(open('workspace-b'), b);
});

for (const method of ['begin', 'commit']) {
  test(`disposal reclaims a spool while its ${method} response is in flight`, async t => {
    const entered = deferred();
    const resume = deferred();
    const { open, graph, spool } = await fixture(t, { storageOverride(storage) {
      const original = storage[method];
      storage[method] = async (...args) => {
        const result = original(...args);
        entered.resolve();
        await resume.promise;
        return result;
      };
    } });
    const ws = open(`pending-${method}`);
    const g = await graph(ws);
    const query = ws.query.run({ sources: [g], sparql: select });
    const rejected = assert.rejects(query, error => error.code === 'LS_STALE_WORKSPACE' || error.code === 'LS_QUERY_EXECUTION');
    await entered.promise;
    assert.equal(spool.records.size, 1);
    const disposed = ws.dispose();
    resume.resolve();
    await disposed;
    await rejected;
    assert.equal(spool.records.size, 0);
    assert.equal(spool.totalBytes, 0);
  });
}

test('a delayed derivation cannot publish after its source is released', async t => {
  const { open, graph } = await fixture(t);
  const ws = open('pending-derive');
  const g = await graph(ws);
  const answer = await ws.query.run({ sources: [g], sparql: 'ASK { ?s ?p ?o }' });
  const resume = deferred();
  const derived = ws.results.derive(answer, async input => { await resume.promise; return input; });
  const rejected = assert.rejects(derived, { code: 'LS_RELEASED_HANDLE' });
  await ws.release(answer);
  resume.resolve();
  await rejected;
  assert.equal(ws.inventory().total, 1);
});

test('failed cleanup leaves handles invalid and disposal can retry without touching a reopened workspace', async t => {
  let failCleanup = true;
  const { open, graph, spool } = await fixture(t, { storageOverride(storage) {
    const abort = storage.abort;
    storage.abort = id => {
      if (failCleanup) throw new Error('cleanup temporarily unavailable');
      return abort(id);
    };
  } });
  const old = open('cleanup-retry');
  const original = await graph(old);
  const result = await old.query.run({ sources: [original], sparql: select });
  await assert.rejects(old.release(result), /cleanup temporarily unavailable/u);
  assert.throws(() => old.results.profile(result), { code: 'LS_RELEASED_HANDLE' });
  await assert.rejects(old.dispose(), { code: 'LS_WORKSPACE_CLEANUP' });
  const fresh = open('cleanup-retry');
  const freshGraph = await graph(fresh);
  const freshResult = await fresh.query.run({ sources: [freshGraph], sparql: select });
  assert.equal(spool.records.size, 2);
  failCleanup = false;
  await old.dispose();
  assert.equal(spool.records.size, 1);
  assert.equal((await fresh.results.page(freshResult)).total, 3);
  await fresh.dispose();
  assert.equal(spool.totalBytes, 0);
});

test('orientation shares versioned source context while inventory stays local', async t => {
  const { ls, graph } = await fixture(t);
  const orientationContext = { id: 'example-corpus', version: 'v1' };
  const first = ls.open({ contextKey: 'question-one', orientationContext });
  const second = ls.open({ contextKey: 'question-two', orientationContext });
  const g = await graph(first);
  const before = await first.orientation.commit();
  await first.query.run({ sources: [g], sparql: 'ASK { ?s ?p ?o }' });
  assert.equal((await first.orientation.commit()).entries, before.entries, 'query results do not fill the orientation cache');
  assert.equal((await second.orientation.status()).entries, before.entries);
  assert.equal((await second.orientation.status()).handles[0].status, 'external-workspace');
  assert.equal(second.inventory().total, 0);
  assert.equal(first.inventory().total, 2);
  await first.release(g);
  assert.equal((await first.orientation.status()).handles[0].status, 'stale');
  const third = ls.open({ contextKey: 'question-three', orientationContext: { ...orientationContext, version: 'v2' } });
  assert.equal((await third.orientation.status()).entries, 0);
  assert.throws(() => ls.open({ contextKey: 'question-one', orientationContext: { ...orientationContext, version: 'v2' } }), { code: 'LS_ORIENTATION_CONTEXT' });
});
