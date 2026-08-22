import assert from 'node:assert/strict';
import test from 'node:test';

import { setupLinkedScience } from '../lib/linked-science-runtime.mjs';
import { MediatedTraversalBroker } from '../packages/cleanroom-node-repl/src/mediated-traversal.mjs';

const owner = { token: 'b'.repeat(64), epoch: 1 };
function traversalAdapter(broker) {
  return {
    capabilities: () => broker.capabilities(),
    beginTraversal: budgets => broker.beginTraversal(budgets, owner),
    request: (traversalId, request) => broker.request({ traversalId, request }, owner),
    snapshotTraversal: traversalId => broker.snapshotTraversal({ traversalId }, owner),
    finishTraversal: traversalId => broker.finishTraversal({ traversalId }, owner),
    abortTraversal: (traversalId, reason) => broker.abortTraversal({ traversalId, reason }, owner),
    createFetch(traversalId) {
      return async (input, init = {}) => {
        const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
        const headers = Object.fromEntries(new Headers(init.headers ?? input?.headers ?? {}).entries());
        const body = init.body === undefined ? undefined : String(init.body);
        const result = await broker.request({ traversalId, request: { url, method: init.method ?? input?.method ?? 'GET', headers, ...(body === undefined ? {} : { body }) } }, owner);
        const response = new Response(Buffer.from(result.bodyBase64, 'base64'), { status: result.status, statusText: result.statusText, headers: result.headers });
        Object.defineProperties(response, { url: { value: result.url }, redirected: { value: result.redirected } });
        return response;
      };
    },
  };
}

function rdfFetch(calls) {
  const documents = {
    '/source-a.ttl': '@prefix ex: <https://example.test/> . ex:item1 ex:kind ex:Protein .',
    '/source-b.ttl': '@prefix ex: <https://example.test/> . ex:item1 ex:label "Alpha" .',
    '/empty.ttl': '@prefix ex: <https://example.test/> .',
    '/many.ttl': '@prefix ex: <https://example.test/> . ex:a ex:p ex:o . ex:b ex:p ex:o .',
    '/schema': '@prefix ex: <https://example.test/> . @prefix owl: <http://www.w3.org/2002/07/owl#> . ex:Term a owl:Class .',
    '/landing': '<html><title>Vocabulary</title></html>',
    '/broken': '@prefix ex: <https://example.test/> . ex:s ex:p [',
  };
  return async (input, init = {}) => {
    const url = new URL(input);
    const headers = Object.fromEntries(new Headers(init.headers));
    calls.push({ url: url.href, method: init.method, headers, body: init.body });
    if (documents[url.pathname]) return new Response(documents[url.pathname], { status: 200, headers: url.pathname === '/landing' ? {
      'content-type': 'text/html', link: '<./schema>; rel="alternate describedby"; type="text/turtle"',
    } : url.pathname === '/broken' ? {
      'content-type': 'text/turtle', link: '<./schema>; rel="alternate describedby"; type="text/turtle"',
    } : { 'content-type': 'text/turtle; profile="https://example.test/profile/core"', link: '<./schema>; rel="describedby", <https://example.test/profile/link>; rel="profile"' } });
    if (url.hostname === 'service-a.example') {
      return new Response(JSON.stringify({
        head: { vars: [ 'item' ] }, results: { bindings: [ { item: { type: 'uri', value: 'https://example.test/item1' } } ] },
      }), { status: 200, headers: { 'content-type': 'application/sparql-results+json' } });
    }
    if (url.hostname === 'service-b.example') {
      return new Response(JSON.stringify({
        head: { vars: [ 'item', 'label' ] }, results: { bindings: [ {
          item: { type: 'uri', value: 'https://example.test/item1' },
          label: { type: 'literal', value: 'Alpha' },
        } ] },
      }), { status: 200, headers: { 'content-type': 'application/sparql-results+json' } });
    }
    throw new Error(`Unexpected synthetic request: ${url.href}`);
  };
}

test('local Communica dereferences two RDF sources through the mediator and retains complete lineage', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const linkedScience = await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) });
  assert.equal(linkedScience.capabilities().mediatedTraversal, true);
  assert.equal(linkedScience.capabilities().brokerOwnedLive, false);
  assert.equal(linkedScience.capabilities().traversal.authority.class, 'anonymous-linked-data-read');
  assert.equal(linkedScience.capabilities().traversal.transport.implementation, 'standard-fetch');
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
  assert.equal(profile.provenance.traversalReceipt.exchanges.length >= 2, true);
  assert.equal(calls.every(call => call.headers.authorization === undefined && call.headers.cookie === undefined), true);
});

test('complete RDF document acquisition uses Communica queryQuads and native retained quads without a new facade or automatic PEEK projection', async () => {
  const calls = [];
  const edits = [];
  const peek = {
    begin: async contextId => ({ contextId, entries: [] }),
    current: async contextId => ({ contextId, entries: [] }),
    edit: async (_contextId, value) => { edits.push(value); return { entries: [] }; },
    commit: async contextId => ({ contextId, entries: [] }),
  };
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker), peek })).open({ contextKey: 'ontology-document' });
  assert.deepEqual(Object.keys(workspace).sort(), [ 'contextKey', 'epoch', 'graph', 'graphs', 'orientation', 'query', 'results', 'schema', 'traversal' ]);
  const handle = await workspace.traversal.query({
    sources: [ { value: 'http://data.example/many.ttl', negotiation: {
      accept: 'text/turtle; profile="https://example.test/profile/request"',
      acceptProfile: 'https://example.test/profile/request',
      prefer: 'return=representation',
    } } ],
    sparql: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',
    role: 'complete-ontology-document',
    budgets: { maxResultItems: 10 },
  });
  const profile = workspace.results.profile(handle);
  assert.equal(profile.type, 'quads');
  assert.equal(profile.count, 2);
  assert.equal(profile.provenance.sources[0], 'http://data.example/many.ttl');
  assert.equal(profile.provenance.traversalReceipt.exchanges[0].mediaType, 'text/turtle');
  assert.equal(calls[0].headers['accept-profile'], 'https://example.test/profile/request');
  assert.equal(calls[0].headers.prefer, 'return=representation');
  assert.equal(profile.provenance.navigation.instructionAuthority, false);
  assert.equal(profile.provenance.navigation.candidates[0].target, 'http://data.example/schema');
  assert.deepEqual(profile.provenance.navigation.profileDeclarations.map(item => [ item.profile, item.mechanism ]), [
    [ 'https://example.test/profile/core', 'content-type' ],
    [ 'https://example.test/profile/link', 'link' ],
  ]);
  assert.match(profile.provenance.navigation.use, /subsequent mediated action/u);
  assert.equal(edits.length, 0);
  const nativeShape = await workspace.results.derive(handle, ({ dataset, quads }) => ({
    kind: 'rows', rows: [ { datasetCore: typeof dataset.match === 'function', size: dataset.size, termType: quads[0].subject.termType } ],
  }));
  assert.deepEqual(workspace.results.page(nativeShape, { limit: 1 }).rows[0], { datasetCore: true, size: 2, termType: 'NamedNode' });
});

test('the private Communica path preserves ASK booleans and DESCRIBE native quads', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'read-query-forms' });
  const asked = await workspace.traversal.query({
    sources: [ 'https://data.example/source-a.ttl' ],
    sparql: 'PREFIX ex: <https://example.test/> ASK { ex:item1 ex:kind ex:Protein }',
  });
  assert.equal(workspace.results.profile(asked).type, 'boolean');
  assert.equal(workspace.results.page(asked, { limit: 1 }).rows[0].value, true);
  const described = await workspace.traversal.query({
    sources: [ 'https://data.example/source-a.ttl', 'https://data.example/source-b.ttl' ],
    sparql: 'PREFIX ex: <https://example.test/> DESCRIBE ex:item1',
    budgets: { maxResultItems: 10 },
  });
  assert.equal(workspace.results.profile(described).type, 'quads');
  assert.equal(workspace.results.profile(described).count, 2);
});

test('a later agentic turn can select a relevant HTTP relation without automatic following', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'http-navigation' });
  const document = await workspace.traversal.query({
    sources: [ 'https://data.example/many.ttl' ],
    sparql: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',
    budgets: { maxResultItems: 10 },
  });
  assert.equal(calls.length, 1);
  const candidate = workspace.results.profile(document).provenance.navigation.candidates
    .find(item => item.relations.includes('describedby'));
  assert.equal(candidate.target, 'https://data.example/schema');
  const schema = await workspace.traversal.query({
    sources: [ candidate.target ],
    sparql: 'ASK { <https://example.test/Term> a <http://www.w3.org/2002/07/owl#Class> }',
  });
  assert.equal(workspace.results.page(schema, { limit: 1 }).rows[0].value, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, candidate.target);
});

test('failed RDF parsing exposes advertised navigation directly and remains recoverable inside one goal exploration', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'failure-navigation' });
  const begun = await workspace.traversal.begin({ budgets: { maxRequests: 4, maxResultItems: 4 } });
  await assert.rejects(workspace.traversal.query({
    sources: [ 'https://data.example/broken' ],
    sparql: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',
  }), error => {
    assert.equal(error.receipt.navigation.candidates[0].target, 'https://data.example/schema');
    assert.equal(error.receipt.navigation.candidates[0].evidenceStatus, 'advertised-untried');
    assert.equal(error.receipt.navigation.candidates[0].executionAuthority, false);
    return true;
  });
  const status = await workspace.traversal.status();
  assert.equal(status.status, 'active');
  assert.equal(status.traversalId, begun.traversalId);
  const schema = await workspace.traversal.query({
    sources: [ status.navigation.candidates[0].target ],
    sparql: 'ASK { <https://example.test/Term> a <http://www.w3.org/2002/07/owl#Class> }',
  });
  assert.equal(workspace.results.page(schema, { limit: 1 }).rows[0].value, true);
  const receipt = await workspace.traversal.finish();
  assert.equal(receipt.status, 'complete');
  assert.equal(receipt.traversalId, begun.traversalId);
  assert.equal(receipt.usage.requests, 2);
  assert.equal(receipt.operations, 1);
  assert.equal(receipt.resultItems, 1);
});

test('goal exploration budgets accumulate across agent decisions instead of resetting per query', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'cumulative-budgets' });
  await workspace.traversal.begin({ budgets: { maxRequests: 1, maxResultItems: 2 } });
  await workspace.traversal.query({ sources: [ 'https://data.example/source-a.ttl' ], sparql: 'ASK { ?s ?p ?o }' });
  await assert.rejects(
    workspace.traversal.query({ sources: [ 'https://data.example/source-b.ttl' ], sparql: 'ASK { ?s ?p ?o }' }),
    error => error.receipt.traversalReceipt.usage.requests === 1,
  );
  assert.equal((await workspace.traversal.status()).usage.requests, 1);
  await workspace.traversal.abort('budget-test-complete');
});

test('workspace reset aborts its active goal exploration and stale workspace state cannot continue it', async () => {
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch([]) });
  const linkedScience = await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) });
  const workspace = linkedScience.open({ contextKey: 'reset-exploration' });
  await workspace.traversal.begin({ budgets: { maxRequests: 2 } });
  assert.equal(broker.sessions.size, 1);
  linkedScience.reset({ contextKey: 'reset-exploration' });
  assert.equal(broker.sessions.size, 0);
  await assert.rejects(workspace.traversal.status(), error => error.code === 'LS_STALE_WORKSPACE');
});

test('document negotiation is rejected when every initial source is a SPARQL service', async () => {
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch([]) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'service-negotiation' });
  await assert.rejects(workspace.traversal.query({
    sources: [ { type: 'sparql', value: 'https://service-a.example/sparql' } ],
    sparql: 'ASK { ?s ?p ?o }',
    negotiation: { acceptProfile: 'https://example.test/profile/document-only' },
  }), error => error.code === 'LS_TRAVERSAL_PREFLIGHT' && /do not inherit/u.test(error.message));
  assert.equal(broker.sessions.size, 0);
});

test('local Communica governs two SERVICE targets through the same traversal mediator', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'two-service-traversal' });
  const handle = await workspace.traversal.query({
    sources: [ 'https://data.example/empty.ttl' ],
    sparql: `SELECT ?item ?label WHERE {
      SERVICE <https://service-a.example/sparql> { ?item <https://example.test/kind> <https://example.test/Protein> }
      SERVICE <https://service-b.example/sparql> { ?item <https://example.test/label> ?label }
    } LIMIT 10`,
    role: 'two-service-result',
    budgets: { maxFanOut: 4, maxRequests: 12 },
    negotiation: { acceptProfile: 'https://example.test/profile/document-only' },
  });
  assert.equal(workspace.results.page(handle, { limit: 2 }).rows[0].label.value, 'Alpha');
  const receipt = workspace.results.profile(handle).provenance.traversalReceipt;
  assert.equal(receipt.exchanges.some(exchange => exchange.requestedUrl.startsWith('https://service-a.example/')), true);
  assert.equal(receipt.exchanges.some(exchange => exchange.requestedUrl.startsWith('https://service-b.example/')), true);
  assert.equal(calls.filter(call => call.url.includes('service-')).length >= 2, true);
  assert.equal(calls.filter(call => call.url.includes('service-')).every(call => call.headers['accept-profile'] === undefined), true);
  assert.equal(calls.find(call => call.url.includes('/empty.ttl')).headers['accept-profile'], 'https://example.test/profile/document-only');
});

test('a dynamically selected SPARQL source descriptor remains mediator-governed', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'typed-service-source' });
  const handle = await workspace.traversal.query({
    sources: [ { type: 'sparql', value: 'https://service-a.example/sparql' } ],
    sparql: 'SELECT ?item WHERE { ?item <https://example.test/kind> <https://example.test/Protein> } LIMIT 2',
  });
  assert.equal(workspace.results.page(handle, { limit: 2 }).rows[0].item.value, 'https://example.test/item1');
  assert.equal(calls.every(call => call.url.startsWith('https://service-a.example/')), true);
});

test('traversal stays unavailable without the parent mediator and rejects non-HTTP or credentialed source IRIs before transport', async () => {
  const workspace = (await setupLinkedScience({ nodeRepl: {} })).open({ contextKey: 'no-traversal' });
  await assert.rejects(
    workspace.traversal.query({ sources: [ 'https://data.example/a.ttl' ], sparql: 'ASK { ?s ?p ?o }' }),
    error => error.code === 'LS_TRAVERSAL_UNAVAILABLE' && error.retryable === true,
  );
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const guarded = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'unsafe-source' });
  await assert.rejects(
    guarded.traversal.query({ sources: [ 'file:///tmp/private' ], sparql: 'ASK { ?s ?p ?o }' }),
    error => error.code === 'LS_TRAVERSAL_PREFLIGHT',
  );
  assert.equal(calls.length, 0);
});

test('traversal aborts and retains no handle when the result item budget is exceeded', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
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
