import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectEpisodeEvidence } from '../../lib/wiki-learning/evidence.mjs';
import { verifySkillBaseline } from '../../lib/wiki-learning/baseline.mjs';

// Validates the public checked-in software fixture only. No host history access,
// hook registration, active-skill mutation, learning or evaluation is performed.
const root = fileURLToPath(new URL('../../', import.meta.url));
const fixtureRoot = fileURLToPath(new URL('../../test/fixtures/wiki-learning/development/scope-change/', import.meta.url));
const episode = JSON.parse(await readFile(new URL('../../test/fixtures/wiki-learning/development/scope-change/episode.json', import.meta.url), 'utf8'));
const evidence = await inspectEpisodeEvidence(episode, { root: fixtureRoot });
const baseline = await verifySkillBaseline({ root, destination: dirname(episode.skillBaseline.manifestPath) });
if (baseline.digest !== episode.skillBaseline.digest) throw new Error('Episode baseline digest does not match snapshot');
console.log(JSON.stringify({ status: evidence.status, scope: 'offline-phase0-contract-fixture', baseline, evidence }, null, 2));
