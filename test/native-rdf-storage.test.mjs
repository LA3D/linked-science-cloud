import assert from 'node:assert/strict';
import test from 'node:test';
import { DataFactory as rdf, Store } from 'n3';
import { setupLinkedScience, LINKED_SCIENCE_API_SCHEMA } from '../lib/linked-science-runtime.mjs';
import { ResultSpoolRegistry } from '../packages/cleanroom-node-repl/src/result-spool.mjs';

const { namedNode: nn, blankNode: bn, literal, quad } = rdf;
const predicate = nn('urn:p');
const graph = nn('urn:graph');
const first = quad(bn('subject'), predicate, literal('bonjour', 'fr'), graph);
const input = [first, first,
  quad(bn('subject'), predicate, literal('bonjour', 'fr')),
  quad(nn('urn:s'), predicate, literal('007', nn('http://www.w3.org/2001/XMLSchema#integer')), graph),
  quad(nn('urn:s'), predicate, bn('object'), bn('graph')),
  quad(nn('urn:s'), predicate, nn('urn:o'), graph),
];
const key = q => JSON.stringify(q.toJSON());
const keys = quads => quads.map(key).sort();
const collect = async stream => { const quads = []; for await (const q of stream) quads.push(q); return quads; };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

async function fixture(t, override) {
  const spool = new ResultSpoolRegistry();
  t.after(() => spool.close());
  const owner = { token: 'native-rdf-storage', epoch: 1 };
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
  override?.(storage);
  const ls = await setupLinkedScience({ nodeRepl: {}, resultStorage: storage });
  const ws = ls.open({ contextKey: 'native-retention' });
  t.after(() => ws.dispose());
  return { ls, ws, spool };
}

for (const datasetInput of [false, true]) {
  test(`native ${datasetInput ? 'DatasetCore' : 'quad array'} retention preserves resident/broker matching, counts, queries and provenance`, async t => {
    const { ws, spool } = await fixture(t);
    const options = { name: 'native-source', kind: 'inferred-graph', role: 'local-derivation', ...(datasetInput ? { dataset: new Store(input) } : { quads: input }) };
    const resident = await ws.rdf.retain(options);
    assert.equal(spool.records.size, 0, 'omitted storage remains resident');
    const broker = await ws.rdf.retain({ ...options, storage: 'broker' });
    assert.equal(spool.records.size, 1, 'explicit storage does not depend on spill threshold');
    const rp = ws.results.profile(resident);
    const bp = ws.results.profile(broker);
    assert.equal(rp.type, 'inferred-graph');
    assert.equal(bp.type, 'quads');
    assert.equal(bp.count, 5);
    assert.equal(bp.residency.kind, 'broker-stored-result');
    assert.deepEqual(bp.fingerprints, rp.fingerprints);
    assert.deepEqual(bp.provenance.source, rp.provenance.source);
    assert.equal(bp.provenance.sourceFingerprint, rp.provenance.sourceFingerprint);
    assert.equal(bp.provenance.graphKind, 'inferred-graph');
    assert.equal(bp.provenance.localOnly, true);
    assert.equal(bp.lineage.kind, 'rdfjs-retain');
    assert.equal(bp.lineage.role, 'local-derivation');
    for (const handle of [resident, broker]) {
      const source = ws.rdf.source(handle);
      assert.equal(await source.countQuads(), 5);
      assert.deepEqual(keys(await collect(source.match())), keys([...new Store(input)]));
      for (const q of new Store(input)) {
        assert.equal(await source.countQuads(q.subject, q.predicate, q.object, q.graph), 1);
        const matched = await collect(source.match(q.subject, q.predicate, q.object, q.graph));
        assert.equal(matched.length, 1);
        assert.ok(matched[0].equals(q));
      }
      const answer = await ws.query.run({ sources: [handle], sparql: 'ASK { GRAPH <urn:graph> { _:s <urn:p> "bonjour"@fr . <urn:s> <urn:p> "007"^^<http://www.w3.org/2001/XMLSchema#integer> } }' });
      assert.equal((await ws.results.page(answer)).rows[0].value, true);
      await ws.release(answer);
    }
    assert.throws(() => ws.rdf.clone(broker), { code: 'LS_STORED_RESULT_DATASET' });
    const view = ws.rdf.source(broker);
    await ws.release(broker);
    assert.equal(spool.records.size, 0);
    assert.equal(spool.totalBytes, 0);
    assert.throws(() => view.match(), { code: 'LS_RELEASED_HANDLE' });
    assert.throws(() => view.countQuads(), { code: 'LS_RELEASED_HANDLE' });
    await ws.release(resident);
    assert.equal(ws.inventory().residentGraphQuads, 0);
  });
}

test('empty broker retention is stored and disposal invalidates its source', async t => {
  const { ws, spool } = await fixture(t);
  const handle = await ws.rdf.retain({ name: 'empty-native', quads: [], storage: 'broker' });
  const source = ws.rdf.source(handle);
  assert.equal(ws.results.profile(handle).residency.kind, 'broker-stored-result');
  assert.equal(await source.countQuads(), 0);
  assert.deepEqual(await collect(source.match()), []);
  assert.equal(spool.records.size, 1);
  await ws.dispose();
  assert.equal(spool.records.size, 0);
  assert.equal(spool.totalBytes, 0);
  assert.throws(() => source.countQuads(), { code: 'LS_STALE_WORKSPACE' });
});

for (const method of ['begin', 'commit']) {
  test(`disposal during native broker ${method} reclaims allocation without publication`, async t => {
    const entered = deferred();
    const resume = deferred();
    const { ws, spool } = await fixture(t, storage => {
      const original = storage[method];
      storage[method] = async (...args) => { const result = original(...args); entered.resolve(); await resume.promise; return result; };
    });
    const retaining = ws.rdf.retain({ name: 'pending-native', quads: input, storage: 'broker' });
    const rejected = assert.rejects(retaining, { code: 'LS_STALE_WORKSPACE' });
    await entered.promise;
    const disposed = ws.dispose();
    resume.resolve();
    await Promise.all([disposed, rejected]);
    assert.equal(spool.records.size, 0);
    assert.equal(spool.totalBytes, 0);
  });
}

test('failed native input aborts provisional storage without a partial handle', async t => {
  const { ws, spool } = await fixture(t);
  const dataset = { size: 2, *[Symbol.iterator]() { yield first; yield {}; } };
  await assert.rejects(ws.rdf.retain({ name: 'invalid-native', dataset, storage: 'broker' }));
  assert.equal(spool.records.size, 0);
  assert.equal(spool.totalBytes, 0);
  assert.equal(ws.inventory().total, 0);
});

test('explicit broker storage requires a broker and rejects unknown storage values', async () => {
  const ls = await setupLinkedScience({ nodeRepl: {} });
  const ws = ls.open({ contextKey: 'no-broker' });
  await assert.rejects(ws.rdf.retain({ name: 'native-source', quads: input, storage: 'broker' }), { code: 'LS_RESULT_STORAGE_REQUIRED' });
  await assert.rejects(ws.rdf.retain({ name: 'native-source', quads: input, storage: 'disk' }), { code: 'LS_RDF_RETAIN_STORAGE' });
  const doc = ls.documentation.get('rdf.retain');
  assert.equal(doc.defaults.storage, 'resident');
  assert.match(doc.signature, /quads result handle \(broker\)/);
  assert.ok(LINKED_SCIENCE_API_SCHEMA.documentationRoutes.includes('rdf.retain'));
  await ws.dispose();
});
