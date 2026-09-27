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
  const input = await registry();
  const result = await validateExperimentResultRepository({ projectRoot, registry: input });
  assert.equal(result.status, 'passed');
  assert.equal(result.runs, input.runs.length);
  assert.equal(result.complete, input.runs.filter(run => run.durability === 'complete').length);
  assert.equal(result.partial, input.runs.filter(run => run.durability === 'partial').length);
  assert.equal(result.summaryOnly, input.runs.filter(run => run.durability === 'summary-only').length);
  assert.equal(result.experimentDocuments, input.documents.length);
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
