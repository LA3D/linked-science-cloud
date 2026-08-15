import assert from 'node:assert/strict';
import test from 'node:test';
import { QueryEngine } from '@comunica/query-sparql';
import { createGuardedFetch, getEndpointProfile, queryBindingsGuarded, validateReadQuery } from '../lib/guarded-sparql-transport.mjs';

const profile = getEndpointProfile();
const liveTableProfile = getEndpointProfile('identifiersOrgLiveTable');
const federationProfile = getEndpointProfile('uniprotRheaWikidataFederation');
const readQuery = 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1';

function response() {
  return new Response(JSON.stringify({ head: { vars: [ 's' ] }, results: { bindings: [] } }), {
    status: 200,
    headers: { 'content-type': 'application/sparql-results+json' },
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
