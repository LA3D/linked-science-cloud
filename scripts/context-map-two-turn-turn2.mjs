import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { QueryEngine } from '@comunica/query-sparql';
import {
  buildReceipt,
  recordWorkerOutcome,
  recoverContextMap,
  selectFrontierCandidate,
} from '../lib/context-map-recovery.mjs';
import { queryBindingsGuarded } from '../lib/guarded-sparql-transport.mjs';

const priorReceipt = 'artifacts/context-map-runs/two-turn-turn-1-2026-08-15T11-53-16-471Z.json';
const candidateId = 'inspect-uniprot-resource-relationship';
const coordinatorDecision = {
  candidateId,
  rationale: 'Establish declared registry resources before inspecting resource-level provider metadata.',
};
const query = `
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX idot: <http://identifiers.org/idot/>
SELECT ?resource WHERE {
  <http://identifiers.org/uniprot> a dcat:Dataset, idot:Namespace .
  ?resource a dcat:DataService, idot:Resource ;
    dcat:servesDataset <http://identifiers.org/uniprot> .
}
LIMIT 1`;

const prior = JSON.parse(await readFile(join(process.cwd(), priorReceipt), 'utf8'));
const selectedMap = selectFrontierCandidate(prior.synthesized.compactContextMap, candidateId);
if (recoverContextMap(selectedMap).status !== 'ready') throw new Error('Selected map is not ready for turn two');
const result = await queryBindingsGuarded({ engine: new QueryEngine(), query });
const resultBindings = result.rows.map(row => Object.fromEntries([ ...row ].map(([ key, value ]) => [ key.value, value.value ])));
const finalMap = recordWorkerOutcome(selectedMap, {
  stepId: candidateId,
  outcome: 'success',
  query,
  rows: resultBindings,
  provenance: result.provenance,
});
const workerReport = {
  stepId: candidateId,
  status: 'stopped-after-turn-2',
  resultBindings,
  rowsObserved: resultBindings.length,
  interpretation: resultBindings.length === 0 ? 'No resource binding was returned by this exact relationship query; no absence claim is made.' : 'A declared resource relationship is observed for this exact bounded query.',
};
const receipt = buildReceipt({
  assignedGoal: prior.observed.assignedGoal,
  contextMap: finalMap,
  workerReport,
  provenance: result.provenance,
  coordinatorDecision,
  priorReceipt,
});
const timestampToken = receipt.timestamp.replace(/[:.]/g, '-');
const outputDir = join(process.cwd(), 'artifacts', 'context-map-runs');
const outputPath = join(outputDir, `two-turn-turn-2-${timestampToken}.json`);
await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ receiptPath: outputPath, mapState: recoverContextMap(finalMap).status, workerReport, provenance: result.provenance }, null, 2));
