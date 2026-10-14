import { readFile } from 'node:fs/promises';
import { importTrajectory } from '../../lib/wiki-learning/trajectory-import.mjs';

const [selectionFile, destination] = process.argv.slice(2);
if (!selectionFile || !destination) throw new Error('Usage: import-trajectory.mjs <selection.json> <artifacts/wiki-learning/episodes/name>');
const input = JSON.parse(await readFile(selectionFile, 'utf8'));
if (Object.keys(input).some(k => !['sourcePath','taskId','selections'].includes(k))) throw new Error('Unknown trajectory input field');
console.log(JSON.stringify(await importTrajectory({ ...input, root:process.cwd(), destination }),null,2));
