import assert from 'node:assert/strict';
import test from 'node:test';
import { Parser as SparqlParser } from 'sparqljs';

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

function collectQueryChoices(node, terms = { predicates: new Set(), graphs: new Set(), services: new Set() }) {
  if (Array.isArray(node)) { node.forEach(item => collectQueryChoices(item, terms)); return terms; }
  if (!node || typeof node !== 'object') return terms;
  if (node.type === 'bgp') for (const triple of node.triples ?? []) if (triple.predicate?.termType === 'NamedNode') terms.predicates.add(triple.predicate.value);
  if (node.type === 'graph' && node.name?.termType === 'NamedNode') terms.graphs.add(node.name.value);
  if (node.type === 'service' && node.name?.termType === 'NamedNode') terms.services.add(node.name.value);
  Object.values(node).forEach(value => collectQueryChoices(value, terms));
  return terms;
}

async function prepareGroundedPlans(workspace, queries, { discoveryBudgets, contextRegistry } = {}) {
  await workspace.grounding.begin({ target: 'synthetic linked-data resource', budgets: discoveryBudgets });
  const manifest = await workspace.grounding.load({
    name: 'synthetic-resource-manifest',
    document: {
      kind: 'EvidencePack',
      resources: [
        { role: 'schema', uri: 'https://data.example/schema' },
        { role: 'vocabulary', uri: 'https://example.test/vocabulary' },
        { role: 'dataset', uri: 'https://data.example/' },
      ],
    },
  });
  await workspace.grounding.finish();
  const choices = queries.map(query => collectQueryChoices(new SparqlParser().parse(query.sparql)));
  const predicateTerms = [ ...new Set(choices.flatMap(item => [ ...item.predicates ])) ];
  const graphTerms = [ ...new Set(choices.flatMap(item => [ ...item.graphs ])) ];
  const sourceTerms = [ ...new Set([
    ...queries.flatMap(query => (query.sources ?? []).map(source => typeof source === 'string' ? source : source.value)),
    ...choices.flatMap(item => [ ...item.services ]),
  ]) ];
  workspace.grounding.attest({
    evidence: [ { handle: manifest, supports: [ 'schema', 'vocabulary', 'dataset' ], locator: 'synthetic manifest resource declarations' } ],
    sourceChoices: sourceTerms.map(term => ({ term, evidenceHandles: [ manifest ] })),
    graphChoices: [ 'default', ...graphTerms ].map(term => ({ term, evidenceHandles: [ manifest ] })),
    predicateChoices: (predicateTerms.length ? predicateTerms : [ 'variable-predicate' ]).map(term => ({ term, evidenceHandles: [ manifest ] })),
  });
  if (contextRegistry) assert.equal(contextRegistry.has(workspace.grounding.status().contextId), true);
  return queries.map(query => workspace.grounding.plan(query));
}

async function runGroundedQuery(workspace, query, { discoveryBudgets, scoredBudgets } = {}) {
  const [ plan ] = await prepareGroundedPlans(workspace, [ query ], { discoveryBudgets });
  await workspace.traversal.begin({ plans: [ plan ], budgets: scoredBudgets });
  const handle = await workspace.traversal.query(plan);
  await workspace.traversal.finish();
  return handle;
}

test('resource-neutral grounding gate loads evidence context and starts scored time only after planning', async () => {
  const events = [];
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const base = traversalAdapter(broker);
  const traversal = { ...base, beginTraversal: budgets => { events.push('mediator-begin'); return base.beginTraversal(budgets); } };
  const contexts = new Map();
  const contextRegistry = { registerContext(id, value) { events.push('context-registered'); contexts.set(id, value); return { contextId: id, registered: true }; } };
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal, contextRegistry })).open({ contextKey: 'neutral-grounding-gate' });

  await assert.rejects(workspace.traversal.query({ sparql: 'ASK { ?s ?p ?o }' }), error => error.code === 'LS_EXPLORATION_INACTIVE');
  await assert.rejects(workspace.traversal.begin({ plans: [] }), error => error.code === 'LS_GROUNDING_REQUIRED');

  const query = { sources: [ 'https://data.example/source-a.ttl' ], sparql: 'ASK { ?s <https://example.test/kind> <https://example.test/Protein> }' };
  const [ plan ] = await prepareGroundedPlans(workspace, [ query ]);
  events.push('plan-created');
  const groundingStatus = workspace.grounding.status();
  assert.equal(groundingStatus.status, 'attested');
  assert.equal(contexts.get(groundingStatus.contextId).kind, 'linked-science-grounding-context');
  assert.deepEqual(contexts.get(groundingStatus.contextId).evidence[0].supports, [ 'schema', 'vocabulary', 'dataset' ]);
  assert.deepEqual(contexts.get(groundingStatus.contextId).plans.map(item => item.id), [ plan.id ]);
  assert.equal(events.filter(event => event === 'mediator-begin').length, 1, 'only the separate discovery timer has started');

  await workspace.traversal.begin({ plans: [ plan ] });
  events.push('scored-begun');
  assert.deepEqual(events.slice(-2), [ 'mediator-begin', 'scored-begun' ]);
  assert.equal(events.indexOf('context-registered') < events.lastIndexOf('mediator-begin'), true);
  assert.equal(events.indexOf('plan-created') < events.lastIndexOf('mediator-begin'), true);
  const result = await workspace.traversal.query(plan);
  assert.equal(workspace.results.profile(result).provenance.protocolPhase, 'scored-scientific-query');
  await workspace.traversal.finish();
});

test('grounded result handles compose into the same evidence contract for a later resource', async () => {
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch([]) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'composable-grounding' });
  const first = await runGroundedQuery(workspace, { sources: [ 'https://data.example/source-a.ttl' ], sparql: 'ASK { ?s ?p ?o }' });

  await workspace.grounding.begin({ target: 'a second synthetic linked-data resource' });
  const reused = workspace.grounding.use(first);
  assert.equal(reused.type, 'boolean');
  const secondManifest = await workspace.grounding.load({ name: 'second-resource-manifest', document: { kind: 'EvidencePack', resources: [ { role: 'schema' }, { role: 'vocabulary' } ] } });
  await workspace.grounding.finish();
  workspace.grounding.attest({
    evidence: [
      { handle: secondManifest, supports: [ 'schema', 'vocabulary' ], locator: 'second resource declarations' },
      { handle: first, supports: [ 'dataset' ], locator: 'typed result from prior grounded resource' },
    ],
    sourceChoices: [ { term: 'https://data.example/second', evidenceHandles: [ secondManifest ] } ],
    graphChoices: [ { term: 'default', evidenceHandles: [ first ] } ],
    predicateChoices: [ { term: 'variable-predicate', evidenceHandles: [ secondManifest ] } ],
  });
  assert.equal(workspace.grounding.status().status, 'attested');
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
  const handle = await runGroundedQuery(workspace, {
    sources: [ 'https://data.example/source-a.ttl', 'https://data.example/source-b.ttl' ],
    sparql: 'PREFIX ex: <https://example.test/> SELECT ?item ?label WHERE { ?item ex:kind ex:Protein; ex:label ?label } LIMIT 10',
    role: 'two-source-result',
  });
  assert.equal(workspace.results.page(handle, { limit: 2 }).rows[0].label.value, 'Alpha');
  const profile = workspace.results.profile(handle);
  assert.equal(profile.lineage.kind, 'communica-mediated-traversal');
  assert.equal(profile.provenance.traversalReceipt.status, 'active');
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
  assert.deepEqual(Object.keys(workspace).sort(), [ 'contextKey', 'epoch', 'graph', 'graphs', 'grounding', 'orientation', 'query', 'results', 'schema', 'traversal' ]);
  const handle = await runGroundedQuery(workspace, {
    sources: [ { value: 'http://data.example/many.ttl', negotiation: {
      accept: 'text/turtle; profile="https://example.test/profile/request"',
      acceptProfile: 'https://example.test/profile/request',
      prefer: 'return=representation',
    } } ],
    sparql: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',
    role: 'complete-ontology-document',
  }, { scoredBudgets: { maxResultItems: 10 } });
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
  const [ askPlan, describePlan ] = await prepareGroundedPlans(workspace, [ {
    sources: [ 'https://data.example/source-a.ttl' ],
    sparql: 'PREFIX ex: <https://example.test/> ASK { ex:item1 ex:kind ex:Protein }',
  }, {
    sources: [ 'https://data.example/source-a.ttl', 'https://data.example/source-b.ttl' ],
    sparql: 'PREFIX ex: <https://example.test/> DESCRIBE ex:item1',
  } ]);
  await workspace.traversal.begin({ plans: [ askPlan, describePlan ], budgets: { maxResultItems: 10 } });
  const asked = await workspace.traversal.query(askPlan);
  assert.equal(workspace.results.profile(asked).type, 'boolean');
  assert.equal(workspace.results.page(asked, { limit: 1 }).rows[0].value, true);
  const described = await workspace.traversal.query(describePlan);
  await workspace.traversal.finish();
  assert.equal(workspace.results.profile(described).type, 'quads');
  assert.equal(workspace.results.profile(described).count, 2);
});

test('a later agentic turn can select a relevant HTTP relation without automatic following', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'http-navigation' });
  const [ documentPlan, schemaPlan ] = await prepareGroundedPlans(workspace, [ {
    sources: [ 'https://data.example/many.ttl' ],
    sparql: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',
  }, {
    sources: [ 'https://data.example/schema' ],
    sparql: 'ASK { <https://example.test/Term> a <http://www.w3.org/2002/07/owl#Class> }',
  } ]);
  await workspace.traversal.begin({ plans: [ documentPlan, schemaPlan ], budgets: { maxResultItems: 10 } });
  const document = await workspace.traversal.query(documentPlan);
  assert.equal(calls.length, 1);
  const candidate = workspace.results.profile(document).provenance.navigation.candidates
    .find(item => item.relations.includes('describedby'));
  assert.equal(candidate.target, 'https://data.example/schema');
  const schema = await workspace.traversal.query(schemaPlan);
  await workspace.traversal.finish();
  assert.equal(workspace.results.page(schema, { limit: 1 }).rows[0].value, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, candidate.target);
});

test('failed RDF parsing exposes advertised navigation directly and remains recoverable inside one goal exploration', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'failure-navigation' });
  const [ brokenPlan, schemaPlan ] = await prepareGroundedPlans(workspace, [ {
    sources: [ 'https://data.example/broken' ],
    sparql: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',
  }, {
    sources: [ 'https://data.example/schema' ],
    sparql: 'ASK { <https://example.test/Term> a <http://www.w3.org/2002/07/owl#Class> }',
  } ]);
  const begun = await workspace.traversal.begin({ plans: [ brokenPlan, schemaPlan ], budgets: { maxRequests: 4, maxResultItems: 4 } });
  await assert.rejects(workspace.traversal.query(brokenPlan), error => {
    assert.equal(error.receipt.navigation.candidates[0].target, 'https://data.example/schema');
    assert.equal(error.receipt.navigation.candidates[0].evidenceStatus, 'advertised-untried');
    assert.equal(error.receipt.navigation.candidates[0].executionAuthority, false);
    return true;
  });
  const status = await workspace.traversal.status();
  assert.equal(status.status, 'active');
  assert.equal(status.traversalId, begun.traversalId);
  const schema = await workspace.traversal.query(schemaPlan);
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
  const [ firstPlan, secondPlan ] = await prepareGroundedPlans(workspace, [
    { sources: [ 'https://data.example/source-a.ttl' ], sparql: 'ASK { ?s ?p ?o }' },
    { sources: [ 'https://data.example/source-b.ttl' ], sparql: 'ASK { ?s ?p ?o }' },
  ]);
  await workspace.traversal.begin({ plans: [ firstPlan, secondPlan ], budgets: { maxRequests: 1, maxResultItems: 2 } });
  await workspace.traversal.query(firstPlan);
  await assert.rejects(
    workspace.traversal.query(secondPlan),
    error => error.receipt.traversalReceipt.usage.requests === 1,
  );
  assert.equal((await workspace.traversal.status()).usage.requests, 1);
  await workspace.traversal.abort('budget-test-complete');
});

test('workspace reset aborts its active goal exploration and stale workspace state cannot continue it', async () => {
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch([]) });
  const linkedScience = await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) });
  const workspace = linkedScience.open({ contextKey: 'reset-exploration' });
  const [ plan ] = await prepareGroundedPlans(workspace, [ { sources: [ 'https://data.example/source-a.ttl' ], sparql: 'ASK { ?s ?p ?o }' } ]);
  await workspace.traversal.begin({ plans: [ plan ], budgets: { maxRequests: 2 } });
  assert.equal(broker.sessions.size, 1);
  linkedScience.reset({ contextKey: 'reset-exploration' });
  assert.equal(broker.sessions.size, 0);
  await assert.rejects(workspace.traversal.status(), error => error.code === 'LS_STALE_WORKSPACE');
});

test('document negotiation is rejected when every initial source is a SPARQL service', async () => {
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch([]) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'service-negotiation' });
  const [ plan ] = await prepareGroundedPlans(workspace, [ {
    sources: [ { type: 'sparql', value: 'https://service-a.example/sparql' } ],
    sparql: 'ASK { ?s ?p ?o }',
    negotiation: { acceptProfile: 'https://example.test/profile/document-only' },
  } ]);
  await workspace.traversal.begin({ plans: [ plan ] });
  await assert.rejects(workspace.traversal.query(plan), error => error.code === 'LS_TRAVERSAL_PREFLIGHT' && /do not inherit/u.test(error.message));
  await workspace.traversal.abort('expected-preflight-rejection');
  assert.equal(broker.sessions.size, 0);
});

test('local Communica governs two SERVICE targets through the same traversal mediator', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'two-service-traversal' });
  const handle = await runGroundedQuery(workspace, {
    sources: [ 'https://data.example/empty.ttl' ],
    sparql: `SELECT ?item ?label WHERE {
      SERVICE <https://service-a.example/sparql> { ?item <https://example.test/kind> <https://example.test/Protein> }
      SERVICE <https://service-b.example/sparql> { ?item <https://example.test/label> ?label }
    } LIMIT 10`,
    role: 'two-service-result',
    negotiation: { acceptProfile: 'https://example.test/profile/document-only' },
  }, { scoredBudgets: { maxFanOut: 4, maxRequests: 12 } });
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
  const handle = await runGroundedQuery(workspace, {
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
  const [ unsafePlan ] = await prepareGroundedPlans(guarded, [ { sources: [ 'file:///tmp/private' ], sparql: 'ASK { ?s ?p ?o }' } ]);
  await guarded.traversal.begin({ plans: [ unsafePlan ] });
  await assert.rejects(
    guarded.traversal.query(unsafePlan),
    error => error.code === 'LS_TRAVERSAL_PREFLIGHT',
  );
  assert.equal(calls.length, 0);
});

test('traversal aborts and retains no handle when the result item budget is exceeded', async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: rdfFetch(calls) });
  const workspace = (await setupLinkedScience({ nodeRepl: {}, traversal: traversalAdapter(broker) })).open({ contextKey: 'result-item-bound' });
  const [ plan ] = await prepareGroundedPlans(workspace, [ {
    sources: [ 'https://data.example/many.ttl' ],
    sparql: 'SELECT ?s WHERE { ?s <https://example.test/p> <https://example.test/o> } LIMIT 2',
  } ]);
  await workspace.traversal.begin({ plans: [ plan ], budgets: { maxResultItems: 1 } });
  await assert.rejects(
    workspace.traversal.query(plan),
    error => error.code === 'LS_TRAVERSAL_RESULT_BOUND',
  );
  assert.equal(calls.length, 1);
});
