import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const indexUrl = new URL('../resources/index.md', import.meta.url);

test('source index remains an orientation directory rather than an execution plan', async () => {
  const sourceIndex = await readFile(indexUrl, 'utf8');

  for (const expected of [
    'not an allowlist',
    'not evidence of global absence',
    'UniProt',
    'Rhea',
    'ChEBI',
    'WikiPathways',
    'Identifiers.org',
    'SPARQL',
    'REST API',
  ]) {
    assert.match(sourceIndex, new RegExp(expected.replace('.', '\\.'), 'i'));
  }

  assert.doesNotMatch(sourceIndex, /\b(?:SELECT|CONSTRUCT|DESCRIBE|SERVICE)\s+[?<{]/i);
});
