import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { QueryEngine } from '@comunica/query-sparql';
import {
  CONTEXT_MAP_STEP_ID,
  buildReceipt,
  createContextMap,
  recordWorkerOutcome,
} from '../lib/context-map-recovery.mjs';
import { queryBindingsGuarded } from '../lib/guarded-sparql-transport.mjs';

const assignedGoal = 'Evaluate compact-map recovery for one guarded UniProt namespace identity check.';
const query = `
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX idot: <http://identifiers.org/idot/>
SELECT ?namespace ?mirid WHERE {
  ?namespace a dcat:Dataset, idot:Namespace ;
    idot:prefix "uniprot" ;
    idot:mirid ?mirid .
}
LIMIT 1`;

const initialMap = createContextMap({ goal: assignedGoal });
const result = await queryBindingsGuarded({ engine: new QueryEngine(), query });
const rows = result.rows.map(row => Object.fromEntries([ ...row ].map(([ key, value ]) => [ key.value, value.value ])));
const finalMap = recordWorkerOutcome(initialMap, {
  stepId: CONTEXT_MAP_STEP_ID,
  outcome: 'success',
  query,
  rows,
  provenance: result.provenance,
});
const workerReport = {
  stepId: CONTEXT_MAP_STEP_ID,
  status: 'completed',
  rowsObserved: rows.length,
  interpretation: rows.length === 0 ? 'No binding was returned by this bounded query; no absence claim is made.' : 'Bounded namespace evidence was returned.',
};
const receipt = buildReceipt({ assignedGoal, contextMap: finalMap, workerReport, provenance: result.provenance });
const timestampToken = receipt.timestamp.replace(/[:.]/g, '-');
const outputDir = join(process.cwd(), 'artifacts', 'context-map-runs');
const outputPath = join(outputDir, `context-map-${timestampToken}.json`);
await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ receiptPath: outputPath, workerReport, provenance: result.provenance }, null, 2));
