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
    '/resource.json': JSON.stringify({ title: 'Synthetic metadata', items: [ 1, 2 ] }),
    '/resource.csv': 'id,label\n1,Alpha\n2,Beta\n',
    '/resource.xml': '<resource><title>Synthetic metadata</title></resource>',
    '/resource.bin': Buffer.from([ 0, 1, 2, 3, 255 ]),
  };
  return async (input, init = {}) => {
    const url = new URL(input);
    const headers = Object.fromEntries(new Headers(init.headers));
    calls.push({ url: url.href, method: init.method, headers, body: init.body });
    if (documents[url.pathname]) return new Response(documents[url.pathname], { status: 200, headers: url.pathname === '/landing' ? {
      'content-type': 'text/html', link: '<./schema>; rel="alternate describedby"; type="text/turtle"',
    } : url.pathname === '/broken' ? {
      'content-type': 'text/turtle', link: '<./schema>; rel="alternate describedby"; type="text/turtle"',
    } : url.pathname === '/resource.json' ? {
      'content-type': 'application/json',
    } : url.pathname === '/resource.csv' ? {
      'content-type': 'text/csv',
    } : url.pathname === '/resource.xml' ? {
      'content-type': 'application/xml',
    } : url.pathname === '/resource.bin' ? {
      'content-type': 'application/octet-stream',
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

async function loadSyntheticEvidence(workspace, name = 'synthetic-resource-manifest') {
  return workspace.evidence.load({
    name,
    document: {
      kind: 'EvidencePack',
      resources: [
        { role: 'schema', uri: 'https://data.example/schema' },
        { role: 'vocabulary', uri: 'https://example.test/vocabulary' },
        { role: 'dataset', uri: 'https://data.example/' },
      ],
    },
  });
}

async function runMediatedQuery(workspace, query, { budgets, evidence } = {}) {
  const supportingEvidence = evidence ?? [ await loadSyntheticEvidence(workspace) ];
  return workspace.traversal.query({ ...query, evidence: supportingEvidence, budgets });
}

test('persistent workspace retains evidence and starts mediated transport only for a direct query', async () => {
  const events = [];
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const base = traversalAdapter(broker);
  const traversal = { ...base, beginTraversal: budgets => { events.push('mediator-begin'); return base.beginTraversal(budgets); } };
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal })).open({ contextKey: 'direct-mediated-query' });

  const query = { sources: [ 'https://data.example/source-a.ttl' ], sparql: 'ASK { ?s <https://example.test/kind> <https://example.test/Protein> }' };
  const evidence = await loadSyntheticEvidence(workspace);
  assert.equal(workspace.results.profile(evidence).type, 'evidence');
  assert.deepEqual(events, []);
  const result = await workspace.traversal.query({ ...query, evidence: [ evidence ] });
  const profile = workspace.results.profile(result);
  assert.deepEqual(events, [ 'mediator-begin' ]);
  assert.equal(profile.provenance.traversalReceipt.status, 'complete');
  assert.deepEqual(profile.provenance.evidenceHandles, [ evidence.id ]);
  assert.deepEqual(workspace.traversal.history({ limit: 5 }).attempts.map(item => item.status), [ 'success' ]);
});

test('general resource responses compose across calls with non-RDF inspection, RDF/JS parsing, and Communica without a re-fetch', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'resource-composition' });

  const metadata = await workspace.resources.get('https://data.example/resource.json', { headers: { accept: 'application/json' }, role: 'metadata' });
  assert.equal(metadata.ok, true);
  assert.equal(metadata.status, 200);
  assert.equal(metadata.headers.get('content-type'), 'application/json');
  assert.deepEqual(await metadata.json(), { title: 'Synthetic metadata', items: [ 1, 2 ] });
  assert.deepEqual(workspace.resources.inspect(metadata, { as: 'json', maxBytes: 4_096 }).json, { type: 'object', keys: [ 'title', 'items' ], totalKeys: 2 });
  assert.deepEqual(workspace.resources.inspect(await workspace.resources.get('https://data.example/resource.csv'), { as: 'csv', maxBytes: 4_096 }).csv.columns, [ 'id', 'label' ]);
  assert.equal(workspace.resources.inspect(await workspace.resources.get('https://data.example/resource.xml'), { as: 'xml', maxBytes: 4_096 }).xml.root, 'resource');
  assert.equal(workspace.resources.inspect(await workspace.resources.get('https://data.example/resource.bin'), { as: 'binary', maxBytes: 4_096 }).bytes, 5);

  const rdfResource = await workspace.resources.get('https://data.example/source-a.ttl', { role: 'source-a-document' });
  const graph = await rdfResource.rdf({ name: 'source-a-graph' });
  const dataset = workspace.rdf.dataset(graph);
  dataset.add(workspace.rdf.DataFactory.quad(
    workspace.rdf.DataFactory.namedNode('https://example.test/item2'),
    workspace.rdf.DataFactory.namedNode('https://example.test/kind'),
    workspace.rdf.DataFactory.namedNode('https://example.test/Protein'),
  ));
  const enriched = await workspace.rdf.retain({ name: 'enriched-source-a', dataset, role: 'in-kernel-enrichment' });
  const selected = await workspace.query.select({
    sources: [ enriched ],
    sparql: 'SELECT ?item WHERE { ?item <https://example.test/kind> <https://example.test/Protein> } ORDER BY ?item LIMIT 10',
  });
  assert.deepEqual(workspace.results.page(selected, { limit: 10 }).rows.map(row => row.item.value), [ 'https://example.test/item1', 'https://example.test/item2' ]);
  assert.equal(calls.filter(call => call.url === 'https://data.example/source-a.ttl').length, 1, 'resident RDF is queried locally after parsing');
  const profile = workspace.results.profile(graph);
  assert.equal(profile.provenance.sourceResource, rdfResource.handle.id);
  assert.equal(workspace.resources.history().attempts.filter(item => item.kind === 'linked-science-resource-attempt').length, 5);
});

test('resource effects are broker-gated by class rather than endpoint identity', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const linkedScience = await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) });
  const workspace = linkedScience.open({ contextKey: 'resource-effects' });
  assert.equal(linkedScience.capabilities().effects['anonymous-public-read'], true);
  assert.equal(linkedScience.capabilities().effects.mutation, false);
  await assert.rejects(
    workspace.resources.get('https://another-public.example/anything', { method: 'POST' }),
    error => error.code === 'LS_EFFECT_DENIED' && error.receipt.effect === 'mutation-or-arbitrary-post',
  );
  assert.equal(calls.length, 0);
  assert.equal(broker.sessions.size, 0);
});

test('resource response bodies are stale after workspace reset while broker sessions remain closed', async () => {
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch([]) });
  const linkedScience = await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) });
  const workspace = linkedScience.open({ contextKey: 'resource-reset' });
  const resource = await workspace.resources.get('https://data.example/resource.json');
  linkedScience.reset({ contextKey: 'resource-reset' });
  await assert.rejects(resource.text(), error => error.code === 'LS_STALE_WORKSPACE');
  assert.throws(() => workspace.resources.inspect(resource), error => error.code === 'LS_STALE_WORKSPACE');
  assert.equal(broker.sessions.size, 0);
});

test('malformed local evidence exposes repair metadata and correction consumes no live request', async () => {
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch([]) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'evidence-local-repair' });
  await assert.rejects(
    workspace.evidence.load({ name: 'resource-manifest', document: { kind: 'EvidencePack' }, source: { kind: 'remote', id: 'https://example.test/' } }),
    error => {
      assert.equal(error.code, 'LS_EVIDENCE');
      assert.equal(error.stage, 'evidence-load');
      assert.equal(error.retryable, true);
      assert.equal(error.repair.field, 'source');
      assert.equal(error.repair.scope, 'local-call');
      assert.deepEqual(error.repair.expected.omittedDefault, { kind: 'declarative-resource-manifest', id: '<name>' });
      assert.deepEqual(error.repair.budgetImpact, { liveRequests: 0 });
      assert.deepEqual(error.receipt.repair, error.repair);
      return true;
    },
  );
  assert.equal(broker.sessions.size, 0);
  assert.equal(workspace.traversal.history().total, 0);
  const evidence = await workspace.evidence.load({ name: 'resource-manifest', document: { kind: 'EvidencePack' }, source: 'embedded-pack' });
  assert.deepEqual(workspace.results.profile(evidence).provenance.source, { kind: 'local-documentation', id: 'embedded-pack' });
});

test('repeated local corrections do not exhaust the workspace or create transport attempts', async () => {
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch([]) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'unbounded-local-repair' });
  for (let index = 0; index < 3; index += 1) await assert.rejects(
    workspace.evidence.load({ name: 'Resource Manifest', document: { kind: 'EvidencePack' } }),
    error => error.repair.allowed === true && error.repair.budgetImpact.liveRequests === 0,
  );
  const evidence = await workspace.evidence.load({ name: 'resource-manifest', document: { kind: 'EvidencePack' } });
  assert.equal(workspace.results.profile(evidence).type, 'evidence');
  assert.equal(broker.sessions.size, 0);
  assert.equal(workspace.traversal.history().total, 0);
});

test('malformed direct query is locally repairable before any mediated request', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'query-local-repair' });
  await assert.rejects(
    workspace.traversal.query({ sources: [ 'file:///not-live' ], sparql: 'ASK { ?s ?p ?o }' }),
    error => error.code === 'LS_TRAVERSAL_PREFLIGHT' && error.stage === 'traversal-preflight' && error.repair.field === 'sources[]',
  );
  assert.equal(calls.length, 0);
  assert.equal(broker.sessions.size, 0);
  const result = await workspace.traversal.query({ sources: [ 'https://data.example/source-a.ttl' ], sparql: 'ASK { ?s ?p ?o }' });
  assert.equal(workspace.results.page(result, { limit: 1 }).rows[0].value, true);
  assert.equal(workspace.traversal.history().total, 1);
});

test('resident evidence and result handles compose into a later direct query', async () => {
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch([]) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'composable-handles' });
  const firstEvidence = await loadSyntheticEvidence(workspace, 'first-resource-manifest');
  const first = await workspace.traversal.query({ sources: [ 'https://data.example/source-a.ttl' ], sparql: 'ASK { ?s ?p ?o }', evidence: [ firstEvidence ] });
  const secondEvidence = await workspace.evidence.load({ name: 'second-resource-manifest', document: { kind: 'EvidencePack', resources: [ { role: 'schema' } ] } });
  const second = await workspace.traversal.query({ sources: [ 'https://data.example/source-b.ttl' ], sparql: 'ASK { ?s ?p ?o }', evidence: [ secondEvidence, first ] });
  assert.deepEqual(workspace.results.profile(second).provenance.evidenceHandles, [ secondEvidence.id, first.id ]);
  assert.deepEqual(workspace.traversal.history().attempts.map(item => item.evidenceHandles), [ [ firstEvidence.id ], [ secondEvidence.id, first.id ] ]);
});

test('local Communica dereferences two RDF sources through the mediator and retains complete lineage', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const linkedScience = await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) });
  assert.equal(linkedScience.capabilities().mediatedTraversal, true);
  assert.equal(linkedScience.capabilities().brokerOwnedLive, false);
  assert.equal(linkedScience.capabilities().traversal.authority.class, 'anonymous-linked-data-read');
  assert.equal(linkedScience.capabilities().traversal.transport.implementation, 'standard-fetch');
  const workspace = linkedScience.open({ contextKey: 'two-source-traversal' });
  const handle = await runMediatedQuery(workspace, {
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

test('complete RDF document acquisition retains native quads and projects only safe handle references to PEEK', async () => {
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
  assert.deepEqual(Object.keys(workspace).sort(), [ 'contextKey', 'epoch', 'evidence', 'graph', 'graphs', 'orientation', 'query', 'rdf', 'resources', 'results', 'schema', 'traversal' ]);
  const handle = await runMediatedQuery(workspace, {
    sources: [ { value: 'http://data.example/many.ttl', negotiation: {
      accept: 'text/turtle; profile="https://example.test/profile/request"',
      acceptProfile: 'https://example.test/profile/request',
      prefer: 'return=representation',
    } } ],
    sparql: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',
    role: 'complete-ontology-document',
  }, { budgets: { maxResultItems: 10 } });
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
  assert.equal(edits.length, 2);
  assert.doesNotMatch(JSON.stringify(edits), /CONSTRUCT|ex:a|example\.test\/p/u);
  const nativeShape = await workspace.results.derive(handle, ({ dataset, quads }) => ({
    kind: 'rows', rows: [ { datasetCore: typeof dataset.match === 'function', size: dataset.size, termType: quads[0].subject.termType } ],
  }));
  assert.deepEqual(workspace.results.page(nativeShape, { limit: 1 }).rows[0], { datasetCore: true, size: 2, termType: 'NamedNode' });
});

test('the private Communica path preserves ASK booleans and DESCRIBE native quads', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'read-query-forms' });
  const evidence = await loadSyntheticEvidence(workspace);
  const asked = await workspace.traversal.query({
    sources: [ 'https://data.example/source-a.ttl' ],
    sparql: 'PREFIX ex: <https://example.test/> ASK { ex:item1 ex:kind ex:Protein }',
    evidence: [ evidence ],
    budgets: { maxResultItems: 10 },
  });
  assert.equal(workspace.results.profile(asked).type, 'boolean');
  assert.equal(workspace.results.page(asked, { limit: 1 }).rows[0].value, true);
  const described = await workspace.traversal.query({
    sources: [ 'https://data.example/source-a.ttl', 'https://data.example/source-b.ttl' ],
    sparql: 'PREFIX ex: <https://example.test/> DESCRIBE ex:item1',
    evidence: [ evidence ],
    budgets: { maxResultItems: 10 },
  });
  assert.equal(workspace.results.profile(described).type, 'quads');
  assert.equal(workspace.results.profile(described).count, 2);
  assert.deepEqual(workspace.traversal.history().attempts.map(item => item.queryType), [ 'ASK', 'DESCRIBE' ]);
});

test('a later agentic turn can select a relevant HTTP relation without automatic following', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'http-navigation' });
  const evidence = await loadSyntheticEvidence(workspace);
  const document = await workspace.traversal.query({
    sources: [ 'https://data.example/many.ttl' ],
    sparql: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',
    evidence: [ evidence ],
    budgets: { maxResultItems: 10 },
  });
  assert.equal(calls.length, 1);
  const candidate = workspace.results.profile(document).provenance.navigation.candidates
    .find(item => item.relations.includes('describedby'));
  assert.equal(candidate.target, 'https://data.example/schema');
  const schema = await workspace.traversal.query({
    sources: [ candidate.target ],
    sparql: 'ASK { <https://example.test/Term> a <http://www.w3.org/2002/07/owl#Class> }',
    evidence: [ evidence, document ],
    budgets: { maxResultItems: 10 },
  });
  assert.equal(workspace.results.page(schema, { limit: 1 }).rows[0].value, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, candidate.target);
});

test('failed RDF parsing exposes navigation and a later direct attempt remains possible', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'failure-navigation' });
  const evidence = await loadSyntheticEvidence(workspace);
  await assert.rejects(workspace.traversal.query({
    sources: [ 'https://data.example/broken' ],
    sparql: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',
    evidence: [ evidence ],
    budgets: { maxRequests: 4, maxResultItems: 4 },
  }), error => {
    assert.equal(error.receipt.navigation.candidates[0].target, 'https://data.example/schema');
    assert.equal(error.receipt.navigation.candidates[0].evidenceStatus, 'advertised-untried');
    assert.equal(error.receipt.navigation.candidates[0].executionAuthority, false);
    return true;
  });
  const schema = await workspace.traversal.query({
    sources: [ 'https://data.example/schema' ],
    sparql: 'ASK { <https://example.test/Term> a <http://www.w3.org/2002/07/owl#Class> }',
    evidence: [ evidence ],
    budgets: { maxRequests: 4, maxResultItems: 4 },
  });
  assert.equal(workspace.results.page(schema, { limit: 1 }).rows[0].value, true);
  const history = workspace.traversal.history();
  assert.deepEqual(history.attempts.map(item => item.status), [ 'failed', 'success' ]);
  assert.equal(history.attempts.every(item => item.hiddenRetries === 0), true);
  assert.equal(broker.sessions.size, 0);
});

test('agent can revise an unproductive query and evaluation can count both explicit attempts', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'agentic-query-revision' });
  const evidence = await loadSyntheticEvidence(workspace);
  const first = await workspace.traversal.query({
    sources: [ 'https://data.example/source-a.ttl' ],
    sparql: 'ASK { ?s <https://example.test/missing> ?o }',
    evidence: [ evidence ],
    budgets: { maxRequests: 2 },
  });
  assert.equal(workspace.results.page(first, { limit: 1 }).rows[0].value, false);
  const second = await workspace.traversal.query({
    sources: [ 'https://data.example/source-a.ttl' ],
    sparql: 'ASK { ?s ?p ?o }',
    evidence: [ evidence, first ],
    budgets: { maxRequests: 2 },
  });
  assert.equal(workspace.results.page(second, { limit: 1 }).rows[0].value, true);
  const history = workspace.traversal.history();
  assert.equal(history.total, 2);
  assert.deepEqual(history.attempts.map(item => item.index), [ 1, 2 ]);
  assert.deepEqual(history.attempts.map(item => item.status), [ 'success', 'success' ]);
  assert.equal(calls.length, 2);
});

test('workspace reset invalidates resident state while no mediated session remains active', async () => {
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch([]) });
  const linkedScience = await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) });
  const workspace = linkedScience.open({ contextKey: 'reset-direct-workspace' });
  const result = await workspace.traversal.query({ sources: [ 'https://data.example/source-a.ttl' ], sparql: 'ASK { ?s ?p ?o }' });
  assert.equal(broker.sessions.size, 0);
  linkedScience.reset({ contextKey: 'reset-direct-workspace' });
  assert.throws(() => workspace.traversal.history(), error => error.code === 'LS_STALE_WORKSPACE');
  assert.throws(() => workspace.results.profile(result), error => error.code === 'LS_STALE_WORKSPACE');
});

test('document negotiation is rejected when every initial source is a SPARQL service', async () => {
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch([]) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'service-negotiation' });
  await assert.rejects(workspace.traversal.query({
    sources: [ { type: 'sparql', value: 'https://service-a.example/sparql' } ],
    sparql: 'ASK { ?s ?p ?o }',
    negotiation: { acceptProfile: 'https://example.test/profile/document-only' },
  }), error => error.code === 'LS_TRAVERSAL_PREFLIGHT' && error.repair.field === 'negotiation' && /do not inherit/u.test(error.message));
  assert.equal(broker.sessions.size, 0);
});

test('local Communica governs two SERVICE targets through the same traversal mediator', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'two-service-traversal' });
  const handle = await runMediatedQuery(workspace, {
    sources: [ 'https://data.example/empty.ttl' ],
    sparql: `SELECT ?item ?label WHERE {
      SERVICE <https://service-a.example/sparql> { ?item <https://example.test/kind> <https://example.test/Protein> }
      SERVICE <https://service-b.example/sparql> { ?item <https://example.test/label> ?label }
    } LIMIT 10`,
    role: 'two-service-result',
    negotiation: { acceptProfile: 'https://example.test/profile/document-only' },
  }, { budgets: { maxFanOut: 4, maxRequests: 12 } });
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
  const handle = await runMediatedQuery(workspace, {
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
    error => error.code === 'LS_TRAVERSAL_PREFLIGHT' && error.repair.field === 'sources[]',
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
  assert.deepEqual(workspace.traversal.history().attempts.map(item => item.status), [ 'failed' ]);
});
