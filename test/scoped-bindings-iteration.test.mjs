import assert from 'node:assert/strict';
import test from 'node:test';
import { DataFactory as df } from 'n3';
import { LINKED_SCIENCE_API_SCHEMA, setupLinkedScience } from '../lib/linked-science-runtime.mjs';
import { ResultSpoolRegistry } from '../packages/cleanroom-node-repl/src/result-spool.mjs';

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const values = Array.from({ length: 257 }, (_, i) => `(${i} ${['<urn:value>', '"bonjour"@fr', '"007"^^<http://www.w3.org/2001/XMLSchema#integer>'][i % 3]} ${i % 2 ? 'UNDEF' : '"bound"'})`).join(' ');
const select = `SELECT ?s ?value ?optional WHERE { ?s <urn:p> ?o . VALUES (?i ?value ?optional) { ${values} } } ORDER BY ?i`;

async function fixture(t, stored, override) {
  const spool = new ResultSpoolRegistry();
  let ws;
  t.after(async () => { try { await ws?.dispose(); } finally { spool.close(); } });
  const owner = { token: 'bindings-iteration-test', epoch: 1 };
  const calls = [];
  const storage = {
    capabilities: () => ({ ...spool.capabilities(), maxPageItems: 64 }),
    begin: options => spool.begin(options, owner),
    append: (storageId, items) => spool.append({ storageId, items }, owner),
    commit: (storageId, options = {}) => spool.commit({ storageId, ...options }, owner),
    page: (storageId, options) => {
      calls.push(options);
      assert.ok(options.limit <= 64);
      return spool.page({ storageId, ...options }, owner);
    },
    match: (storageId, options) => spool.match({ storageId, ...options }, owner),
    count: (storageId, options) => spool.count({ storageId, ...options }, owner),
    abort: storageId => spool.abort({ storageId }, owner),
  };
  override?.(storage);
  const ls = await setupLinkedScience({ nodeRepl: {}, ...(stored ? { resultStorage: storage } : {}), budgets: { maxResultItems: stored ? 1 : 1000, maxRows: 1, maxCells: 1 } });
  ws = ls.open({ contextKey: 'bindings-iteration' });
  const graph = await ws.graphs.load({ name: 'fixture', kind: 'instance-data', quads: [df.quad(df.blankNode('subject'), df.namedNode('urn:p'), df.literal('object'))] });
  const query = sparql => ws.query.run({ sources: [graph], sparql });
  return { ls, ws, graph, query, calls, spool };
}

async function collect(iterable) {
  const rows = [];
  for await (const row of iterable) rows.push(row);
  return rows;
}

for (const stored of [false, true]) {
  test(`${stored ? 'broker' : 'resident'} iteration preserves all 257 ordered rows and native terms beyond display limits`, async t => {
    const { ls, ws, query, calls, spool } = await fixture(t, stored);
    const handle = await query(select);
    assert.equal(spool.records.size, stored ? 1 : 0);
    assert.ok(LINKED_SCIENCE_API_SCHEMA.workspace.results.includes('iterate'));
    assert.match(ls.documentation.get('results.iterate').signature, /AsyncIterable<Map<string, RDF.Term>>/);
    const preview = await ws.results.page(handle, { columns: ['s'] });
    const subject = df.blankNode(preview.rows[0].s.value);
    for (const options of [undefined, { batchSize: 17 }, { batchSize: 1000 }]) {
      calls.length = 0;
      const iterable = ws.results.iterate(handle, options);
      assert.equal(calls.length, 0, 'creation must not prefetch');
      const rows = await collect(iterable);
      assert.equal(rows.length, 257);
      rows.forEach((row, i) => {
        assert.ok(row instanceof Map);
        assert.equal(row.get('s').termType, 'BlankNode');
        assert.ok(row.get('s').equals(subject));
        const value = [df.namedNode('urn:value'), df.literal('bonjour', 'fr'), df.literal('007', df.namedNode('http://www.w3.org/2001/XMLSchema#integer'))][i % 3];
        assert.ok(row.get('value').equals(value));
        assert.equal(row.has('optional'), i % 2 === 0);
        assert.equal(row.size, i % 2 ? 2 : 3);
        if (row.has('optional')) assert.ok(row.get('optional').equals(df.literal('bound')));
      });
      assert.deepEqual(rows[0], rows[6], 'duplicate solutions survive');
      assert.notEqual(rows[0], rows[6], 'each output is an individual Map');
      if (stored) {
        const size = Math.min(options?.batchSize ?? 128, 64);
        assert.deepEqual(calls, Array.from({ length: Math.ceil(257 / size) }, (_, i) => ({ offset: i * size, limit: Math.min(size, 257 - i * size) })));
      } else assert.deepEqual(calls, []);
      rows[0].clear();
      assert.equal((await ws.results.iterate(handle).next()).value.size, 3, 'output mutations do not change retained rows');
    }
    const empty = await query('SELECT ?s WHERE { ?s <urn:absent> ?o }');
    assert.deepEqual(await collect(ws.results.iterate(empty)), []);
    const unbound = await query('SELECT ?missing WHERE { VALUES ?i { 1 2 } OPTIONAL { ?s <urn:absent> ?missing } }');
    assert.deepEqual(await collect(ws.results.iterate(unbound)), [new Map(), new Map()]);
  });

  test(`${stored ? 'broker' : 'resident'} iteration checks release before starting and between buffered rows`, async t => {
    const { ws, query, calls } = await fixture(t, stored);
    const handle = await query(select);
    const unopened = ws.results.iterate(handle);
    const running = ws.results.iterate(handle, { batchSize: 17 });
    assert.equal((await running.next()).done, false);
    await ws.release(handle);
    const count = calls.length;
    await assert.rejects(running.next(), { code: 'LS_RELEASED_HANDLE' });
    await assert.rejects(unopened.next(), { code: 'LS_RELEASED_HANDLE' });
    assert.equal(calls.length, count);
  });

  test(`${stored ? 'broker' : 'resident'} iteration rejects wrong kinds and invalid options`, async t => {
    const { ws, graph, query, calls } = await fixture(t, stored);
    const handle = await query(select);
    const boolean = await query('ASK { ?s ?p ?o }');
    const quads = await query('CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }');
    const rows = await ws.results.derive(boolean, () => ({ kind: 'rows', rows: [{ x: 1 }] }));
    for (const wrong of [graph, boolean, quads, rows]) assert.throws(() => ws.results.iterate(wrong), { code: 'LS_HANDLE_KIND' });
    for (const batchSize of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '2', null, true]) {
      assert.throws(() => ws.results.iterate(handle, { batchSize }), { code: 'LS_ITERATION_BATCH_SIZE' });
    }
    for (const options of [null, [], 1, 'options', { limit: 2 }]) assert.throws(() => ws.results.iterate(handle, options), { code: 'LS_ITERATION_OPTIONS' });
    assert.deepEqual(calls, []);
  });
}

for (const invalidate of ['release', 'dispose', 'reset']) {
  test(`broker iteration rejects a page arriving after ${invalidate}`, async t => {
    const entered = deferred();
    const resume = deferred();
    const { ls, ws, query } = await fixture(t, true, storage => {
      const page = storage.page;
      storage.page = async (...args) => {
        const response = page(...args);
        entered.resolve();
        await resume.promise;
        return response;
      };
    });
    const handle = await query(select);
    const next = ws.results.iterate(handle).next();
    const rejected = assert.rejects(next, { code: invalidate === 'release' ? 'LS_RELEASED_HANDLE' : 'LS_STALE_WORKSPACE' });
    await entered.promise;
    if (invalidate === 'release') await ws.release(handle);
    else if (invalidate === 'dispose') await ws.dispose();
    else await ls.reset({ contextKey: ws.contextKey });
    resume.resolve();
    await rejected;
  });
}
