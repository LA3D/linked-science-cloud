import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { validateExperimentResultRegistry, validateExperimentResultRepository } from '../lib/experiment-result-registry.mjs';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const registryPath = resolve(projectRoot, 'artifacts/experiment-results/registry.json');

async function registry() {
  return JSON.parse(await readFile(registryPath, 'utf8'));
}

test('experiment result registry grades every run and every dossier', async () => {
  const result = await validateExperimentResultRepository({ projectRoot, registry: await registry() });
  assert.equal(result.status, 'passed');
  assert.equal(result.runs, 19);
  assert.equal(result.complete, 6);
  assert.equal(result.partial, 2);
  assert.equal(result.summaryOnly, 11);
  assert.equal(result.experimentDocuments, 10);
});

test('partial or summary-only evidence must identify what is missing', async () => {
  const invalid = await registry();
  invalid.runs.find(run => run.durability === 'summary-only').missingEvidence = [];
  assert.throws(() => validateExperimentResultRegistry(invalid), /must identify missing evidence/);
});

test('result records must stay in the controlled artifact tree', async () => {
  const invalid = await registry();
  invalid.runs[0].recordPaths = [ '/private/tmp/result.json' ];
  assert.throws(() => validateExperimentResultRegistry(invalid), /repository-relative path under artifacts/);
});
