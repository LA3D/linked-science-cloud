import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  auditWorkerExport,
  validateWorkerExportPolicy,
  validateWorkerManifest,
} from '../lib/competency-evaluation-manifest.mjs';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function json(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

const manifestPath = resolve(argument('--worker-manifest') ?? resolve(projectRoot, 'evaluation/uniprot/worker-manifest.draft.json'));
const policyPath = resolve(argument('--export-policy') ?? resolve(projectRoot, 'evaluation/uniprot/worker-export-policy.json'));
const manifest = validateWorkerManifest(await json(manifestPath));
const policy = validateWorkerExportPolicy(await json(policyPath));

const evaluatorBundlePath = argument('--evaluator-bundle');
const workerRoot = argument('--worker-root');
const boundaryAttestationPath = argument('--boundary-attestation');

if ([ evaluatorBundlePath, workerRoot, boundaryAttestationPath ].some(Boolean) &&
  ![ evaluatorBundlePath, workerRoot, boundaryAttestationPath ].every(Boolean)) {
  throw new Error('Leakage audit requires --evaluator-bundle, --worker-root, and --boundary-attestation together');
}

const output = {
  kind: 'uniprot-competency-manifest-validation',
  worker: { status: manifest.status, version: manifest.version, cases: manifest.cases.length },
  exportPolicy: { version: policy.version, includes: policy.include.length, deniedRoots: policy.deny.length },
};

if (evaluatorBundlePath) {
  output.leakageAudit = await auditWorkerExport({
    workerRoot: resolve(workerRoot),
    workerManifestPath: manifestPath,
    evaluatorBundle: await json(resolve(evaluatorBundlePath)),
    boundaryAttestation: await json(resolve(boundaryAttestationPath)),
  });
  if (output.leakageAudit.status !== 'passed') process.exitCode = 1;
}

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
