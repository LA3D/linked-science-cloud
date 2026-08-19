import assert from 'node:assert/strict';
import test from 'node:test';
import { QueryEngine } from '@comunica/query-sparql';
import { createGuardedFetch, getEndpointProfile, queryBindingsGuarded, queryBindingsToHandleGuarded, queryToHandleGuarded, validateReadQuery } from '../lib/guarded-sparql-transport.mjs';
import { initializeLinkedDataSession } from '../lib/repl-linked-data-session.mjs';

const profile = getEndpointProfile();
const liveTableProfile = getEndpointProfile('identifiersOrgLiveTable');
const uniprotReadProfile = getEndpointProfile('uniprotRead');
const wikiPathwaysReadProfile = getEndpointProfile('wikiPathwaysRead');
const federationProfile = getEndpointProfile('uniprotRheaWikidataFederation');
const readQuery = 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1';

function response() {
  return new Response(JSON.stringify({ head: { vars: [ 's' ] }, results: { bindings: [] } }), {
    status: 200,
    headers: { 'content-type': 'application/sparql-results+json' },
  });
}

function responseWithBinding() {
  return new Response(JSON.stringify({
    head: { vars: [ 's' ] },
    results: { bindings: [{ s: { type: 'uri', value: 'https://example.test/result' } }] },
  }), {
    status: 200,
    headers: { 'content-type': 'application/sparql-results+json' },
  });
}

function booleanResponse(value = true) {
  return new Response(JSON.stringify({ head: {}, boolean: value }), {
    status: 200,
    headers: { 'content-type': 'application/sparql-results+json' },
  });
}

function quadResponse() {
  return new Response('<https://example.test/s> <https://example.test/p> "value" .\n', {
    status: 200,
    headers: { 'content-type': 'application/n-triples' },
  });
}

test('accepts a bounded GET read query and records provenance', async() => {
  let init;
  const guard = createGuardedFetch({ fetchImpl: async(_url, receivedInit) => { init = receivedInit; return response(); } });
  await guard.fetch(`${profile.endpoint}?query=${encodeURIComponent(readQuery)}`, { method: 'GET' });
  assert.equal(init.method, 'GET');
  assert.equal(init.redirect, 'error');
  assert.equal(guard.provenance()[0].queryType, 'SELECT');
});

test('accepts a bounded POST read query and preserves no-redirect policy', async() => {
  let init;
  const guard = createGuardedFetch({ fetchImpl: async(_url, receivedInit) => { init = receivedInit; return response(); } });
  await guard.fetch(profile.endpoint, { method: 'POST', headers: { 'content-type': 'application/sparql-query' }, body: readQuery });
  assert.equal(init.method, 'POST');
  assert.equal(init.body, readQuery);
  assert.equal(init.redirect, 'error');
});

test('caps response bytes at the guarded transport boundary', async() => {
  const smallProfile = { ...profile, maxResponseBytes: 4 };
  const guard = createGuardedFetch({
    profile: smallProfile,
    fetchImpl: async() => new Response('12345', { status: 200, headers: { 'content-type': 'text/plain' } }),
  });
  const boundedResponse = await guard.fetch(`${profile.endpoint}?query=${encodeURIComponent(readQuery)}`, { method: 'GET' });
  await assert.rejects(() => boundedResponse.text(), /exceeds 4 bytes/u);
  assert.equal(guard.provenance()[0].responseByteLimit, 4);
});

test('rejects updates, SERVICE delegation, malformed syntax, and other endpoints before fetch', () => {
  const guard = createGuardedFetch({ fetchImpl: async() => { throw new Error('must not fetch'); } });
  assert.throws(() => validateReadQuery('INSERT DATA { <https://example.test/s> <https://example.test/p> <https://example.test/o> }'));
  assert.throws(() => validateReadQuery('SELECT * WHERE { SERVICE <https://example.test/sparql> { ?s ?p ?o } } LIMIT 1'));
  assert.throws(() => validateReadQuery('SELECT WHERE {'));
  return assert.rejects(() => guard.fetch('https://example.test/sparql?query=' + encodeURIComponent(readQuery), { method: 'GET' }));
});

test('live-table profile permits only bounded SELECT queries with a 20-row cap', () => {
  assert.equal(validateReadQuery('SELECT ?s WHERE { ?s ?p ?o } LIMIT 20', liveTableProfile).queryType, 'SELECT');
  assert.throws(() => validateReadQuery('ASK { ?s ?p ?o }', liveTableProfile));
  assert.throws(() => validateReadQuery('SELECT ?s WHERE { ?s ?p ?o } LIMIT 21', liveTableProfile));
});

test('federation profile permits only its named services and exact endpoints', async() => {
  const query = `SELECT ?protein ?reaction WHERE {
    SERVICE <https://sparql.rhea-db.org/sparql> { ?reaction ?predicate ?object }
  } LIMIT 1`;
  const parsed = validateReadQuery(query, federationProfile);
  assert.deepEqual(parsed.services, [ 'https://sparql.rhea-db.org/sparql' ]);
  const calls = [];
  const guard = createGuardedFetch({
    profile: federationProfile,
    fetchImpl: async(url, init) => {
      calls.push({ url: String(url), method: init.method, redirect: init.redirect });
      return response();
    },
  });
  await guard.fetch(`${federationProfile.allowedEndpoints[1]}?query=${encodeURIComponent(query)}`, { method: 'GET' });
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).origin + new URL(calls[0].url).pathname, federationProfile.allowedEndpoints[1]);
  assert.equal(calls[0].redirect, 'error');
});

test('federation profile rejects unapproved, silent, and unbounded service queries', () => {
  assert.throws(() => validateReadQuery(
    'SELECT ?s WHERE { SERVICE <https://example.test/sparql> { ?s ?p ?o } } LIMIT 1',
    federationProfile,
  ));
  assert.throws(() => validateReadQuery(
    'SELECT ?s WHERE { SERVICE SILENT <https://sparql.rhea-db.org/sparql> { ?s ?p ?o } } LIMIT 1',
    federationProfile,
  ));
  assert.throws(() => validateReadQuery(
    'SELECT ?s WHERE { SERVICE <https://sparql.rhea-db.org/sparql> { ?s ?p ?o } }',
    federationProfile,
  ));
});

test('single-endpoint UniProt read profile permits all bounded read query forms without SERVICE', () => {
  assert.equal(validateReadQuery('ASK WHERE { ?s ?p ?o }', uniprotReadProfile).queryType, 'ASK');
  assert.equal(validateReadQuery('CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o } LIMIT 1', uniprotReadProfile).queryType, 'CONSTRUCT');
  assert.equal(validateReadQuery('DESCRIBE <https://example.test/s> WHERE { <https://example.test/s> ?p ?o } LIMIT 1', uniprotReadProfile).queryType, 'DESCRIBE');
  assert.throws(() => validateReadQuery('ASK WHERE { SERVICE <https://sparql.rhea-db.org/sparql> { ?s ?p ?o } }', uniprotReadProfile));
  assert.throws(() => validateReadQuery('ASK WHERE { ?s ?p ?o }', federationProfile));
});

test('WikiPathways read profile permits bounded graph exploration but no federation', () => {
  assert.equal(wikiPathwaysReadProfile.endpoint, 'https://sparql.wikipathways.org/sparql');
  assert.equal(validateReadQuery('SELECT ?pathway ?chebi WHERE { ?node <http://vocabularies.wikipathways.org/wp#bdbChEBI> ?chebi ; <http://purl.org/dc/terms/isPartOf> ?pathway } LIMIT 20', wikiPathwaysReadProfile).queryType, 'SELECT');
  assert.equal(validateReadQuery('ASK WHERE { ?node <http://vocabularies.wikipathways.org/wp#bdbChEBI> ?chebi }', wikiPathwaysReadProfile).queryType, 'ASK');
  assert.throws(() => validateReadQuery('SELECT ?s WHERE { SERVICE <https://www.ebi.ac.uk/chebi/sparql> { ?s ?p ?o } } LIMIT 1', wikiPathwaysReadProfile));
  assert.throws(() => validateReadQuery('SELECT ?s WHERE { ?s ?p ?o } LIMIT 21', wikiPathwaysReadProfile));
});

test('installed Communica uses the guarded top-level fetch option without bypass', async() => {
  const calls = [];
  const result = await queryBindingsGuarded({
    engine: new QueryEngine(),
    query: readQuery,
    fetchImpl: async(url, init) => {
      calls.push({ url: String(url), method: init.method, redirect: init.redirect });
      return response();
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).origin + new URL(calls[0].url).pathname, profile.endpoint);
  assert.match(calls[0].method, /^(GET|POST)$/);
  assert.equal(calls[0].redirect, 'error');
  assert.equal(result.provenance.length, 1);
});

test('guarded query-to-handle performs one request and returns one complete receipt', async() => {
  let calls = 0;
  const engine = new QueryEngine();
  const session = initializeLinkedDataSession({ engine, sources: [], maxRows: profile.maxResults });
  const result = await queryBindingsToHandleGuarded({
    session,
    handle: 'one-result',
    query: readQuery,
    profile,
    fetchImpl: async() => { calls += 1; return responseWithBinding(); },
  });
  assert.equal(calls, 1);
  assert.equal(result.handle.count, 1);
  assert.deepEqual(result.receipt.result, { kind: 'bindings', count: 1, columns: [ 's' ] });
  assert.equal(result.receipt.attempts.length, 1);
  assert.equal(result.receipt.status, 'ready');
  assert.equal(session.page('one-result', { limit: 1 }).rows[0].s, 'https://example.test/result');
  assert.doesNotMatch(JSON.stringify(result.receipt), /SELECT \?s/);
});

test('query-to-handle rejects an unusable handle before network access', async() => {
  let calls = 0;
  const engine = new QueryEngine();
  const session = initializeLinkedDataSession({ engine, sources: [], maxRows: profile.maxResults });
  await queryBindingsToHandleGuarded({
    session,
    handle: 'occupied',
    query: readQuery,
    profile,
    fetchImpl: async() => responseWithBinding(),
  });
  await assert.rejects(
    () => queryBindingsToHandleGuarded({
      session,
      handle: 'occupied',
      query: readQuery,
      profile,
      fetchImpl: async() => { calls += 1; return responseWithBinding(); },
    }),
    error => error.name === 'GuardedQueryToHandleError' && error.receipt.stage === 'preflight' && error.receipt.attempts.length === 0,
  );
  assert.equal(calls, 0);
});

test('query-to-handle reports transport attempts when a live query fails', async() => {
  const engine = new QueryEngine();
  const session = initializeLinkedDataSession({ engine, sources: [], maxRows: profile.maxResults });
  await assert.rejects(
    () => queryBindingsToHandleGuarded({
      session,
      handle: 'failed-query',
      query: readQuery,
      profile,
      fetchImpl: async() => { throw new Error('network unavailable'); },
    }),
    error => error.name === 'GuardedQueryToHandleError' && error.receipt.stage === 'query' &&
      error.receipt.attempts.length === 1 && /network unavailable/u.test(error.receipt.attempts[0].error),
  );
  assert.equal(session.recognize('failed-query').status, 'missing');
});

test('generic query-to-handle retains ASK as a typed boolean handle', async() => {
  const engine = new QueryEngine();
  const session = initializeLinkedDataSession({ engine, sources: [], maxRows: profile.maxResults });
  const result = await queryToHandleGuarded({
    session,
    handle: 'exists-result',
    query: 'ASK WHERE { ?s ?p ?o }',
    profile,
    fetchImpl: async() => booleanResponse(true),
  });
  assert.equal(result.handle.kind, 'boolean');
  assert.deepEqual(result.handle.sample, []);
  assert.equal(result.receipt.result.kind, 'boolean');
  assert.deepEqual(session.page('exists-result', { limit: 1 }).rows, [{ value: true }]);
  assert.equal(result.receipt.attempts.length, 1);
});

test('generic query-to-handle retains CONSTRUCT and DESCRIBE as bounded quad handles', async() => {
  for (const [queryType, query] of [
    ['CONSTRUCT', 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o } LIMIT 1'],
    ['DESCRIBE', 'DESCRIBE <https://example.test/s> WHERE { <https://example.test/s> ?p ?o } LIMIT 1'],
  ]) {
    const engine = new QueryEngine();
    const session = initializeLinkedDataSession({ engine, sources: [], maxRows: profile.maxResults });
    const result = await queryToHandleGuarded({
      session,
      handle: `${queryType.toLowerCase()}-result`,
      query,
      profile,
      fetchImpl: async() => quadResponse(),
    });
    assert.equal(result.handle.kind, 'quads');
    assert.deepEqual(result.handle.sample, []);
    assert.equal(result.receipt.queryType, queryType);
    assert.equal(result.receipt.result.kind, 'quads');
    assert.deepEqual(session.page(`${queryType.toLowerCase()}-result`, { limit: 1 }).rows[0], {
      subject: 'https://example.test/s',
      predicate: 'https://example.test/p',
      object: 'value',
      graph: '',
      objectType: 'Literal',
      objectLanguage: '',
      objectDatatype: 'http://www.w3.org/2001/XMLSchema#string',
    });
    assert.equal(result.receipt.attempts.length, 1);
  }
});
