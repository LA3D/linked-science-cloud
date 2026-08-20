import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateExperimentResultRepository } from '../lib/experiment-result-registry.mjs';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const registry = JSON.parse(await readFile(resolve(projectRoot, 'artifacts/experiment-results/registry.json'), 'utf8'));
const result = await validateExperimentResultRepository({ projectRoot, registry });
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
