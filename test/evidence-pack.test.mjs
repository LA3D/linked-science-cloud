import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createEvidenceManifest, validateEvidencePack } from '../lib/evidence-pack.mjs';

const pack = JSON.parse(await readFile(new URL('../resources/uniprot.evidence-pack.json', import.meta.url), 'utf8'));
test('exposes only authoritative resource locations and access policy', () => {
  const manifest = createEvidenceManifest(pack);
  assert.equal(manifest.identity.id, 'uniprot');
  assert.equal(manifest.resources.length, 3);
  assert.equal(manifest.declarations.namedGraphs[0].iri, 'http://sparql.uniprot.org/uniprot');
  assert.match(manifest.note, /not schema evidence/);
});
test('rejects planner-shaped fields', () => {
  assert.throws(() => validateEvidencePack({ ...pack, motifs: [] }), /may not contain motifs/);
});
