import assert from 'node:assert/strict';
import test from 'node:test';
import { createGuardedDocumentationFetch, getDocumentationProfile } from '../lib/guarded-documentation-fetch.mjs';

const profile = getDocumentationProfile();

function htmlResponse(body = '<html><body>schema</body></html>') {
  return new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

test('retrieves only the pinned UniProt schema document with provenance', async() => {
  let received;
  const guard = createGuardedDocumentationFetch({ fetchImpl: async(url, init) => { received = { url: String(url), init }; return htmlResponse(); } });
  const response = await guard.fetchDocument(profile.sources[0]);
  assert.equal(await response.text(), '<html><body>schema</body></html>');
  assert.equal(received.init.method, 'GET');
  assert.equal(received.init.redirect, 'error');
  assert.equal(guard.provenance()[0].source, profile.sources[0]);
  assert.equal(guard.provenance()[0].contentType, 'text/html');
  assert.match(guard.provenance()[0].sha256, /^[a-f0-9]{64}$/);
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
