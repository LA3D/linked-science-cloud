import assert from 'node:assert/strict';
import test from 'node:test';

import { setupLinkedScience } from '../lib/linked-science-runtime.mjs';
import { MediatedTraversalBroker } from '../packages/cleanroom-node-repl/src/mediated-traversal.mjs';

const owner = { token: 'b'.repeat(64), epoch: 1 };
const publicDns = async hostname => [ { address: hostname.endsWith('.example') ? '93.184.216.34' : '1.1.1.1', family: 4 } ];

function traversalAdapter(broker) {
  return {
    capabilities: () => broker.capabilities(),
    beginTraversal: budgets => broker.beginTraversal(budgets, owner),
    request: (traversalId, request) => broker.request({ traversalId, request }, owner),
    finishTraversal: traversalId => broker.finishTraversal({ traversalId }, owner),
    abortTraversal: (traversalId, reason) => broker.abortTraversal({ traversalId, reason }, owner),
    createFetch(traversalId) {
      return async (input, init = {}) => {
        const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
        const headers = Object.fromEntries(new Headers(init.headers ?? input?.headers ?? {}).entries());
        const body = init.body === undefined ? undefined : String(init.body);
        const result = await broker.request({ traversalId, request: { url, method: init.method ?? input?.method ?? 'GET', headers, ...(body === undefined ? {} : { body }) } }, owner);
        return new Response(Buffer.from(result.bodyBase64, 'base64'), { status: result.status, headers: result.headers });
      };
    },
  };
}

function rdfTransport(calls) {
  const documents = {
    '/source-a.ttl': '@prefix ex: <https://example.test/> . ex:item1 ex:kind ex:Protein .',
    '/source-b.ttl': '@prefix ex: <https://example.test/> . ex:item1 ex:label "Alpha" .',
    '/empty.ttl': '@prefix ex: <https://example.test/> .',
    '/many.ttl': '@prefix ex: <https://example.test/> . ex:a ex:p ex:o . ex:b ex:p ex:o .',
  };
  return async options => {
    calls.push({ url: options.url.href, method: options.method, headers: options.headers, body: options.body });
    if (documents[options.url.pathname]) return { status: 200, headers: { 'content-type': 'text/turtle' }, body: Buffer.from(documents[options.url.pathname]) };
    if (options.url.hostname === 'service-a.example') {
      return { status: 200, headers: { 'content-type': 'application/sparql-results+json' }, body: Buffer.from(JSON.stringify({
        head: { vars: [ 'item' ] }, results: { bindings: [ { item: { type: 'uri', value: 'https://example.test/item1' } } ] },
      })) };
    }
    if (options.url.hostname === 'service-b.example') {
      return { status: 200, headers: { 'content-type': 'application/sparql-results+json' }, body: Buffer.from(JSON.stringify({
        head: { vars: [ 'item', 'label' ] }, results: { bindings: [ {
          item: { type: 'uri', value: 'https://example.test/item1' },
          label: { type: 'literal', value: 'Alpha' },
        } ] },
      })) };
    }
    throw new Error(`Unexpected synthetic request: ${options.url.href}`);
  };
}

test('local Communica dereferences two RDF sources through the mediator and retains complete lineage', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ resolveAddresses: publicDns, transport: rdfTransport(calls) });
  const linkedScience = await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) });
  assert.equal(linkedScience.capabilities().mediatedTraversal, true);
  assert.equal(linkedScience.capabilities().brokerOwnedLive, false);
  assert.equal(linkedScience.capabilities().traversal.networkPolicy, 'public-https-dns-pinned');
  const workspace = linkedScience.open({ contextKey: 'two-source-traversal' });
  const handle = await workspace.traversal.query({
    sources: [ 'https://data.example/source-a.ttl', 'https://data.example/source-b.ttl' ],
    sparql: 'PREFIX ex: <https://example.test/> SELECT ?item ?label WHERE { ?item ex:kind ex:Protein; ex:label ?label } LIMIT 10',
    role: 'two-source-result',
  });
  assert.equal(workspace.results.page(handle, { limit: 2 }).rows[0].label.value, 'Alpha');
  const profile = workspace.results.profile(handle);
  assert.equal(profile.lineage.kind, 'communica-mediated-traversal');
  assert.equal(profile.provenance.traversalReceipt.status, 'complete');
  assert.equal(profile.provenance.traversalReceipt.hops.length >= 2, true);
  assert.equal(calls.every(call => call.headers.authorization === undefined && call.headers.cookie === undefined), true);
});

test('local Communica governs two SERVICE targets through the same traversal mediator', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ resolveAddresses: publicDns, transport: rdfTransport(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'two-service-traversal' });
  const handle = await workspace.traversal.query({
    sources: [ 'https://data.example/empty.ttl' ],
    sparql: `SELECT ?item ?label WHERE {
      SERVICE <https://service-a.example/sparql> { ?item <https://example.test/kind> <https://example.test/Protein> }
      SERVICE <https://service-b.example/sparql> { ?item <https://example.test/label> ?label }
    } LIMIT 10`,
    role: 'two-service-result',
    budgets: { maxFanOut: 4, maxHops: 12 },
  });
  assert.equal(workspace.results.page(handle, { limit: 2 }).rows[0].label.value, 'Alpha');
  const receipt = workspace.results.profile(handle).provenance.traversalReceipt;
  assert.equal(receipt.hops.some(hop => hop.url.startsWith('https://service-a.example/')), true);
  assert.equal(receipt.hops.some(hop => hop.url.startsWith('https://service-b.example/')), true);
  assert.equal(calls.filter(call => call.url.includes('service-')).length >= 2, true);
});

test('a dynamically selected SPARQL source descriptor remains mediator-governed', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ resolveAddresses: publicDns, transport: rdfTransport(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'typed-service-source' });
  const handle = await workspace.traversal.query({
    sources: [ { type: 'sparql', value: 'https://service-a.example/sparql' } ],
    sparql: 'SELECT ?item WHERE { ?item <https://example.test/kind> <https://example.test/Protein> } LIMIT 2',
  });
  assert.equal(workspace.results.page(handle, { limit: 2 }).rows[0].item.value, 'https://example.test/item1');
  assert.equal(calls.every(call => call.url.startsWith('https://service-a.example/')), true);
});

test('traversal stays unavailable without the parent mediator and rejects unsafe source IRIs before transport', async () => {
  const workspace = (await setupLinkedScience({ nodeRepl: {} })).open({ contextKey: 'no-traversal' });
  await assert.rejects(
    workspace.traversal.query({ sources: [ 'https://data.example/a.ttl' ], sparql: 'ASK { ?s ?p ?o }' }),
    error => error.code === 'LS_TRAVERSAL_UNAVAILABLE' && error.retryable === true,
  );
  const calls = [];
  const broker = new MediatedTraversalBroker({ resolveAddresses: publicDns, transport: rdfTransport(calls) });
  const guarded = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'unsafe-source' });
  await assert.rejects(
    guarded.traversal.query({ sources: [ 'http://127.0.0.1/private' ], sparql: 'ASK { ?s ?p ?o }' }),
    error => error.code === 'LS_TRAVERSAL_PREFLIGHT',
  );
  assert.equal(calls.length, 0);
});

test('traversal aborts and retains no handle when the result item budget is exceeded', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ resolveAddresses: publicDns, transport: rdfTransport(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'result-item-bound' });
  await assert.rejects(
    workspace.traversal.query({
      sources: [ 'https://data.example/many.ttl' ],
      sparql: 'SELECT ?s WHERE { ?s <https://example.test/p> <https://example.test/o> } LIMIT 2',
      budgets: { maxResultItems: 1 },
    }),
    error => error.code === 'LS_TRAVERSAL_RESULT_BOUND',
  );
  assert.equal(calls.length, 1);
});
