import { fileURLToPath } from 'node:url';
import { snapshotSkillBaseline, verifySkillBaseline } from '../../lib/wiki-learning/baseline.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const [mode, destination] = process.argv.slice(2);
if (!['create', 'verify'].includes(mode) || !destination || process.argv.length !== 4) throw new Error('Usage: node scripts/wiki-learning/snapshot-baseline.mjs create|verify artifacts/wiki-learning/baselines/<name>');
const result = mode === 'create'
  ? await snapshotSkillBaseline({ root, destination })
  : await verifySkillBaseline({ root, destination });
console.log(JSON.stringify({ status: 'passed', digest: result.digest, files: Array.isArray(result.files) ? result.files.length : result.files, discovery: result.discovery, loading: result.loading }, null, 2));
