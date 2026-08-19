import assert from 'node:assert/strict';
import test from 'node:test';
import { QueryEngine } from '@comunica/query-sparql';
import { acquireEvidenceToHandleGuarded } from '../lib/guarded-evidence-acquisition.mjs';
import { createChebiCompoundEvidenceProfile } from '../lib/linked-data-source-profiles.mjs';
import { initializeLinkedDataSession } from '../lib/repl-linked-data-session.mjs';

test('creates an exact bounded official ChEBI compound profile', async () => {
  const profile = createChebiCompoundEvidenceProfile('CHEBI:15377');
  assert.deepEqual(profile.sources, ['https://www.ebi.ac.uk/chebi/backend/api/public/compound/CHEBI:15377/']);
  assert.deepEqual(profile.allowedFormats, ['json']);
  const session = initializeLinkedDataSession({ engine: new QueryEngine(), sources: [] });
  const result = await acquireEvidenceToHandleGuarded({
    session,
    handle: 'chebi-water',
    source: profile.sources[0],
    profile,
    fetchImpl: async () => new Response(JSON.stringify({ chebi_accession: 'CHEBI:15377', name: 'water' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  });
  assert.equal(result.receipt.detectedFormat, 'json');
  assert.match(session.inspectEvidence('chebi-water').text, /CHEBI:15377/);
});

test('refuses ambiguous ChEBI identifiers and substituted API paths', async () => {
  assert.throws(() => createChebiCompoundEvidenceProfile('15377'));
  assert.throws(() => createChebiCompoundEvidenceProfile('CHEBBI:15377'));
  assert.throws(() => createChebiCompoundEvidenceProfile('CHEBI:0'));
  const profile = createChebiCompoundEvidenceProfile('CHEBI:15377');
  const session = initializeLinkedDataSession({ engine: new QueryEngine(), sources: [] });
  await assert.rejects(acquireEvidenceToHandleGuarded({
    session,
    handle: 'blocked-chebi',
    source: 'https://www.ebi.ac.uk/chebi/backend/api/public/compound/CHEBI:15378/',
    profile,
    fetchImpl: async () => { throw new Error('must not fetch'); },
  }), error => error.receipt.stage === 'preflight');
});
