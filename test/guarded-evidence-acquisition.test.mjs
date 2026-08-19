import assert from 'node:assert/strict';
import test from 'node:test';
import { QueryEngine } from '@comunica/query-sparql';
import { acquireEvidenceToHandleGuarded, detectEvidenceFormat } from '../lib/guarded-evidence-acquisition.mjs';
import { initializeLinkedDataSession } from '../lib/repl-linked-data-session.mjs';

const source = 'https://example.test/wp.owl';
const profile = Object.freeze({
  name: 'test-ontology',
  sources: [source],
  accept: 'application/rdf+xml, text/turtle',
  allowedFormats: ['rdfxml', 'turtle'],
  timeoutMs: 1_000,
  maxBytes: 4_096,
});

function session() {
  return initializeLinkedDataSession({ engine: new QueryEngine(), sources: [], maxRows: 10 });
}

test('content-sniffs misleading ontology metadata and retains evidence behind a handle', async () => {
  const body = '@prefix wp: <https://vocabularies.wikipathways.org/wp#> .\nwp:Pathway a wp:OntologyClass .';
  const retained = session();
  const fetchImpl = async () => new Response(body, { status: 200, headers: { 'content-type': 'application/rdf+xml' } });
  const result = await acquireEvidenceToHandleGuarded({ session: retained, handle: 'wp-ontology', source, profile, fetchImpl });
  assert.equal(result.receipt.detectedFormat, 'turtle');
  assert.equal(result.receipt.metadataMismatch, true);
  assert.match(retained.inspectEvidence('wp-ontology', { length: 80 }).text, /@prefix wp/);
  const checkpoint = JSON.stringify(retained.checkpoint());
  assert.doesNotMatch(checkpoint, /@prefix wp/);
  assert.match(checkpoint, /metadataMismatch/);
});

test('a failed live acquisition becomes a retained symbolic attempt', async () => {
  const retained = session();
  const fetchImpl = async () => new Response('temporarily unavailable', { status: 503 });
  await assert.rejects(
    acquireEvidenceToHandleGuarded({ session: retained, handle: 'wp-attempt', source, profile, fetchImpl }),
    error => error.name === 'GuardedEvidenceAcquisitionError' && error.receipt.status === 'failed',
  );
  const attempt = retained.profile('wp-attempt', { sampleSize: 0 });
  assert.equal(attempt.kind, 'attempt');
  assert.equal(attempt.lineage.outcome, 'failed');
  assert.throws(() => retained.page('wp-attempt'));
});

test('unapproved sources fail before fetch and create no retained handle', async () => {
  const retained = session();
  let called = false;
  const fetchImpl = async () => { called = true; return new Response('x'); };
  await assert.rejects(acquireEvidenceToHandleGuarded({
    session: retained,
    handle: 'blocked-source',
    source: 'https://other.example/ontology.owl',
    profile,
    fetchImpl,
  }), error => error.receipt.stage === 'preflight');
  assert.equal(called, false);
  assert.throws(() => retained.profile('blocked-source'));
});

test('the acquisition byte ceiling stops the stream and retains the failed attempt', async () => {
  const retained = session();
  const smallProfile = { ...profile, maxBytes: 8 };
  const fetchImpl = async () => new Response('@prefix wp: <https://example.test/wp#> .');
  await assert.rejects(
    acquireEvidenceToHandleGuarded({ session: retained, handle: 'oversized-attempt', source, profile: smallProfile, fetchImpl }),
    error => error.receipt.stage === 'acquisition' && /exceeds 8 bytes/.test(error.cause.message),
  );
  assert.equal(retained.profile('oversized-attempt').kind, 'attempt');
});

test('format detection handles RDF XML and JSON without trusting a suffix', () => {
  assert.equal(detectEvidenceFormat(Buffer.from('<?xml version="1.0"?><rdf:RDF/>'), 'text/plain'), 'rdfxml');
  assert.equal(detectEvidenceFormat(Buffer.from('{"ok":true}'), 'text/plain'), 'json');
});
