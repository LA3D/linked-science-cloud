import assert from 'node:assert/strict';
import test from 'node:test';
import { setupLinkedScience } from '../lib/linked-science-runtime.mjs';
import { ResultSpoolRegistry } from '../packages/cleanroom-node-repl/src/result-spool.mjs';
import { MediatedTraversalBroker } from '../packages/cleanroom-node-repl/src/mediated-traversal.mjs';

const owner = { token: 'e'.repeat(64), epoch: 1 };
function adapter(broker) {
  return {
    capabilities: () => broker.capabilities(),
    beginTraversal: budgets => broker.beginTraversal(budgets, owner),
    snapshotTraversal: traversalId => broker.snapshotTraversal({ traversalId }, owner),
    finishTraversal: traversalId => broker.finishTraversal({ traversalId }, owner),
    abortTraversal: (traversalId, reason) => broker.abortTraversal({ traversalId, reason }, owner),
    createFetch: traversalId => async (input, init = {}) => {
      const response = await broker.request({ traversalId, request: {
        url: String(input), method: init.method ?? 'GET',
        headers: Object.fromEntries(new Headers(init.headers).entries()),
        ...(init.body === undefined ? {} : { body: String(init.body) }),
      } }, owner);
      return new Response(Buffer.from(response.bodyBase64, 'base64'), {
        status: response.status, headers: response.headers,
      });
    },
  };
}

for (const mediated of [false, true]) test(`empty SELECT preserves projected columns and completion (${mediated ? 'broker' : 'local'})`, async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ head: { vars: ['protein', 'sequence'] }, results: { bindings: [] } }), {
      headers: { 'content-type': 'application/sparql-results+json' },
    });
  } });
  const ws = (await setupLinkedScience({ nodeRepl: {}, ...(mediated ? { traversal: adapter(broker) } : {}) })).open({ contextKey: `empty-${mediated}` });
  try {
    const sparql = 'SELECT ?protein ?sequence WHERE { ?protein <urn:sequence> ?sequence }';
    const result = mediated
      ? await ws.traversal.query({ sources: [{ type: 'sparql', value: 'https://example.test/sparql' }], sparql })
      : await ws.query.run({ sources: [await ws.graphs.load({ name: 'empty', text: '', kind: 'instance-data' })], sparql });
    const profile = ws.results.profile(result);
    assert.deepEqual(profile.columns, ['protein', 'sequence']);
    assert.equal(profile.count, 0);
    assert.equal(profile.provenance.completion.complete, true);
    const requestsBeforePaging = calls.length;
    const page = await ws.results.page(result);
    assert.deepEqual(page.columns, ['protein', 'sequence']);
    assert.deepEqual(page.rows, []);
    assert.equal(page.total, 0);
    assert.equal(page.truncated, false);
    assert.deepEqual(page.provenance, profile.provenance);
    assert.deepEqual((await ws.results.page(result, { columns: ['sequence'] })).rows, []);
    for (const columns of [[], ['unknown'], ['protein', 'protein']]) {
      assert.throws(() => ws.results.page(result, { columns }), { code: 'LS_COLUMNS' });
    }
    assert.equal(calls.length, requestsBeforePaging);
    if (mediated) {
      assert.ok(calls.length > 0);
      assert.equal(profile.provenance.traversalReceipt.status, 'complete');
    }
  } finally { await ws.dispose(); }
});

test('default paging supports a SELECT with no projected variables', async () => {
  const ws = (await setupLinkedScience({ nodeRepl: {} })).open({ contextKey: 'no-variables' });
  try {
    const graph = await ws.graphs.load({ name: 'empty', text: '', kind: 'instance-data' });
    for (const [pattern, rows] of [['FILTER(false)', []], ['', [{}]]]) {
      const result = await ws.query.run({ sources: [graph], sparql: `SELECT * WHERE { ${pattern} }` });
      const page = await ws.results.page(result);
      assert.deepEqual(page.columns, []);
      assert.deepEqual(page.rows, rows);
      assert.equal(page.truncated, false);
    }
  } finally { await ws.dispose(); }
});


test('storage-enabled SELECT retains declared unbound columns before and after spilling', async () => {
  const spool = new ResultSpoolRegistry();
  const storage = {
    capabilities: () => spool.capabilities(),
    begin: options => spool.begin(options, owner),
    append: (storageId, items) => spool.append({ storageId, items }, owner),
    commit: (storageId, options) => spool.commit({ storageId, ...options }, owner),
    page: (storageId, options) => spool.page({ storageId, ...options }, owner),
    match: (storageId, options) => spool.match({ storageId, ...options }, owner),
    count: (storageId, options) => spool.count({ storageId, ...options }, owner),
    abort: storageId => spool.abort({ storageId }, owner),
  };
  const ws = (await setupLinkedScience({ nodeRepl: {}, resultStorage: storage, budgets: { maxResultItems: 1 } })).open({ contextKey: 'stored-columns' });
  try {
    const graph = await ws.graphs.load({ name: 'empty', text: '', kind: 'instance-data' });
    for (const values of ['', '1 2']) {
      const result = await ws.query.run({ sources: [graph], sparql: `SELECT ?value ?unbound WHERE { VALUES ?value { ${values} } }` });
      const page = await ws.results.page(result);
      assert.deepEqual(page.columns, ['value', 'unbound']);
      assert.equal(page.total, values ? 2 : 0);
      assert.equal(page.truncated, false);
      if (values) assert.deepEqual(page.rows.map(row => row.unbound), [null, null]);
    }
    assert.equal(spool.records.size, 1, 'nonempty query exercised the spool');
  } finally { await ws.dispose(); spool.close(); }
});
