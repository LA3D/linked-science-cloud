import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { importEpisode } from '../../lib/wiki-learning/episode-import.mjs';

// The caller supplies selected authorized pages and a reviewed draft. This CLI
// never attaches to Desktop, opens rollouts, reads memory, or fetches sources.
const [inputPath, destination] = process.argv.slice(2);
if (!inputPath || !destination || process.argv.length !== 4) throw new Error('Usage: node scripts/wiki-learning/import-episode.mjs supplied-input.json artifacts/wiki-learning/episodes/<name>');
if ((await stat(inputPath)).size > 1024 * 1024) throw new Error('Input exceeds 1 MiB');
const input = JSON.parse(await readFile(inputPath, 'utf8'));
const root = fileURLToPath(new URL('../../', import.meta.url));
console.log(JSON.stringify(await importEpisode({ ...input, root, destination }), null, 2));
