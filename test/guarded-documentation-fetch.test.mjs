import assert from 'node:assert/strict';
import test from 'node:test';
import { createDocumentationClient, createGuardedDocumentationFetch, getDocumentationProfile } from '../lib/guarded-documentation-fetch.mjs';

const profile = getDocumentationProfile();

function htmlResponse(body = '<html><body>schema</body></html>') {
  return new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

test('retrieves only the pinned UniProt schema document with provenance', async() => {
  let received;
  const guard = createGuardedDocumentationFetch({ fetchImpl: async(url, init) => { received = { url: String(url), init }; return htmlResponse(); } });
  const { response, receipt } = await guard.fetchDocument(profile.sources[0]);
  assert.equal(await response.text(), '<html><body>schema</body></html>');
  assert.equal(received.init.method, 'GET');
  assert.equal(received.init.redirect, 'error');
  assert.equal(receipt.source, profile.sources[0]);
  assert.equal(receipt.contentType, 'text/html');
  assert.match(receipt.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(guard.provenance(), [receipt]);
});

test('convenience client selects the named profile and returns response with receipt', async() => {
  const client = createDocumentationClient({ fetchImpl: async() => htmlResponse() });
  const { response, receipt } = await client.fetch('uniprotRdfSchema');
  assert.equal(await response.text(), '<html><body>schema</body></html>');
  assert.equal(receipt.source, profile.sources[0]);
  assert.equal(receipt.status, 200);
});

test('rejects redirects by policy, other sources, wrong types, and oversized documents', async() => {
  const guard = createGuardedDocumentationFetch({ fetchImpl: async() => htmlResponse() });
  await assert.rejects(() => guard.fetchDocument('https://example.test/schema'));
  const jsonGuard = createGuardedDocumentationFetch({ fetchImpl: async() => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }) });
  await assert.rejects(() => jsonGuard.fetchDocument(profile.sources[0]));
  const smallProfile = { ...profile, maxBytes: 1 };
  const oversizedGuard = createGuardedDocumentationFetch({ profile: smallProfile, fetchImpl: async() => htmlResponse() });
  await assert.rejects(() => oversizedGuard.fetchDocument(profile.sources[0]));
});
