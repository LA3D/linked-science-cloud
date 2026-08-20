import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  auditWorkerExport,
  computeEvaluatorSelectionSha256,
  materializeWorkerExport,
  validateEvaluatorBundle,
  validateWorkerExportPolicy,
  validateWorkerManifest,
} from '../lib/competency-evaluation-manifest.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const workerManifest = JSON.parse(await readFile(new URL('../evaluation/uniprot/worker-manifest.draft.json', import.meta.url), 'utf8'));
const exportPolicy = JSON.parse(await readFile(new URL('../evaluation/uniprot/worker-export-policy.json', import.meta.url), 'utf8'));

function privateBundle() {
  const officialQuery = 'SELECT ?release WHERE { <https://private.invalid/service> <https://private.invalid/release> ?release } LIMIT 1';
  const cases = workerManifest.cases.map((item, index) => ({
    id: item.id,
    officialExampleId: `private-example-${index + 1}`,
    officialLocator: `https://evaluator.invalid/examples/${index + 1}`,
    officialQuestion: item.question,
    officialQuery,
    querySha256: sha256(officialQuery),
    operation: 'SELECT',
    semanticInvariants: {
      graphScope: 'synthetic evaluator graph only',
      variableRoles: 'release is the requested scalar role',
      optionalValues: 'no optional values',
      cardinality: 'at most one bounded row',
      setBag: 'set semantics are sufficient',
      aggregates: 'no aggregate',
      ordering: 'row order is not semantically relevant'
    },
    rubricApplicability: Array.from({ length: 10 }, (_, dimension) => ({ dimension: dimension + 1, applicable: true })),
    leakageMarkers: [
      { kind: 'official-example-id', value: `private-example-${index + 1}` },
      { kind: 'query-fragment', value: '<https://private.invalid/release>' },
      { kind: 'honeytoken', value: `HONEYTOKEN-EVALUATOR-${index + 1}` }
    ]
  }));
  const bundle = {
    format: 'linked-science-competency-evaluator/v1',
    version: 'synthetic-test-v1',
    corpus: {
      source: 'https://evaluator.invalid/catalog', retrievedAt: '2026-08-20T00:00:00Z', sha256: sha256('synthetic-corpus'),
      httpStatus: 200, contentType: 'text/html', byteLength: 16, redirects: 0, etag: 'synthetic-v1', sourceRelease: 'test-release',
    },
    selectionSha256: '0'.repeat(64),
    cases
  };
  bundle.selectionSha256 = computeEvaluatorSelectionSha256(bundle);
  return bundle;
}

test('draft worker manifest contains only opaque public cases and cannot be dispatched', () => {
  const validated = validateWorkerManifest(workerManifest);
  assert.equal(validated.status, 'draft');
  assert.deepEqual(validated.cases.map(item => item.tier), [0, 1, 2]);
  assert.throws(() => validateWorkerManifest(workerManifest, { requireDispatchable: true }), /not dispatchable/);
  assert.throws(() => validateWorkerManifest({ ...workerManifest, officialQuery: 'SELECT * WHERE {}' }), /evaluator-private fields/);
  assert.throws(
    () => validateWorkerManifest({ ...workerManifest, status: 'ready', corpusSnapshotDigest: '0'.repeat(64) }),
    /pending or unreviewed profile names/,
  );
});

test('private evaluator schema verifies hashes, semantic invariants, applicability, and honeytokens', () => {
  const bundle = privateBundle();
  assert.equal(validateEvaluatorBundle(bundle).cases.length, 3);
  const corrupted = structuredClone(bundle);
  corrupted.cases[0].officialQuery += ' ';
  assert.throws(() => validateEvaluatorBundle(corrupted), /querySha256/);
  const redirected = structuredClone(bundle);
  redirected.corpus.redirects = 1;
  redirected.selectionSha256 = computeEvaluatorSelectionSha256(redirected);
  assert.throws(() => validateEvaluatorBundle(redirected), /corpus.redirects/);
});

test('worker export policy excludes evaluator, traces, legacy affordances, tests, and repository metadata', () => {
  const policy = validateWorkerExportPolicy(exportPolicy);
  for (const denied of ['.git', '.codex', 'artifacts', 'docs/experiments', 'docs/tasks', 'lib/linked-data-affordances.mjs', 'test']) {
    assert.equal(policy.deny.includes(denied), true);
  }
});

test('materialized worker export passes a broker-attested leakage audit and detects a copied honeytoken', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'linked-science-eval-'));
  const source = resolve(root, 'source');
  const worker = resolve(root, 'worker');
  const evaluator = resolve(root, 'evaluator-private');
  await mkdir(resolve(source, 'evaluation/uniprot'), { recursive: true });
  await writeFile(resolve(source, 'AGENTS.md'), 'synthetic worker guide\n');
  await writeFile(resolve(source, 'evaluation/uniprot/worker-manifest.draft.json'), `${JSON.stringify(workerManifest, null, 2)}\n`);
  const policy = {
    format: 'linked-science-worker-export-policy/v1', version: 'synthetic-v1',
    include: ['AGENTS.md', 'evaluation/uniprot/worker-manifest.draft.json'], deny: ['evaluator-private', 'test', '.git']
  };
  await materializeWorkerExport({ sourceRoot: source, destinationRoot: worker, policy });
  await mkdir(evaluator, { recursive: true });
  const bundle = privateBundle();
  await writeFile(resolve(evaluator, 'bundle.json'), `${JSON.stringify(bundle, null, 2)}\n`);
  const boundaryAttestation = {
    kind: 'cleanroom-filesystem-boundary', enforcer: 'cleanroom-broker', privateReadProbe: 'denied',
    workerRoot: worker, evaluatorRoot: evaluator
  };
  const passed = await auditWorkerExport({
    workerRoot: worker,
    workerManifestPath: resolve(worker, 'evaluation/uniprot/worker-manifest.draft.json'),
    evaluatorBundle: bundle,
    boundaryAttestation
  });
  assert.equal(passed.status, 'passed', JSON.stringify(passed));
  assert.equal(passed.boundary.authorityAttested, true);

  await writeFile(resolve(worker, 'accidental-note.txt'), 'HONEYTOKEN-EVALUATOR-1\n');
  const failed = await auditWorkerExport({
    workerRoot: worker,
    workerManifestPath: resolve(worker, 'evaluation/uniprot/worker-manifest.draft.json'),
    evaluatorBundle: bundle,
    boundaryAttestation
  });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.findings.some(item => item.markerKind === 'honeytoken'), true);
});

test('a distinct directory without broker read-denial evidence is not treated as isolation', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'linked-science-boundary-'));
  const worker = resolve(root, 'worker');
  const evaluator = resolve(root, 'evaluator');
  await mkdir(resolve(worker, 'evaluation/uniprot'), { recursive: true });
  await mkdir(evaluator, { recursive: true });
  await writeFile(resolve(worker, 'evaluation/uniprot/worker-manifest.draft.json'), `${JSON.stringify(workerManifest)}\n`);
  const result = await auditWorkerExport({
    workerRoot: worker,
    workerManifestPath: resolve(worker, 'evaluation/uniprot/worker-manifest.draft.json'),
    evaluatorBundle: privateBundle(),
    boundaryAttestation: { evaluatorRoot: evaluator }
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.findings.some(item => item.kind === 'boundary'), true);
});
