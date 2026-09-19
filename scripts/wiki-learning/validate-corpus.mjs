import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { filterCorpus } from '../../lib/wiki-learning/corpus.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
// Explicit curated index; never scan historical conversations or every artifact.
const records = await Promise.all(['planning-engineering', 'ontology-membership'].map(name => readFile(new URL(`../../artifacts/wiki-learning/corpus/${name}.json`, import.meta.url), 'utf8').then(JSON.parse)));
console.log(JSON.stringify(await filterCorpus(records, { root }), null, 2));
