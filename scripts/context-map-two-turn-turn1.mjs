import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { QueryEngine } from '@comunica/query-sparql';
import {
  CONTEXT_MAP_STEP_ID,
  buildReceipt,
  createContextMap,
  recordWorkerOutcome,
  recoverContextMap,
} from '../lib/context-map-recovery.mjs';
import { queryBindingsGuarded } from '../lib/guarded-sparql-transport.mjs';

const assignedGoal = 'Orient to how Identifiers.org represents the UniProt namespace and identify the most useful next safe registry question.';
const frontier = [
  {
    id: 'inspect-uniprot-resource-relationship',
    question: 'Which declared registry resources are linked to the confirmed UniProt namespace?',
    stepLabel: 'inspect linked registry resources',
  },
  {
    id: 'inspect-uniprot-provider-pattern',
    question: 'Which provider-code and URL-pattern metadata are declared for UniProt resources?',
    stepLabel: 'inspect provider-pattern metadata',
  },
];
const query = `
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX idot: <http://identifiers.org/idot/>
SELECT ?namespace ?mirid WHERE {
  ?namespace a dcat:Dataset, idot:Namespace ;
    idot:prefix "uniprot" ;
    idot:mirid ?mirid .
}
LIMIT 1`;

const initialMap = createContextMap({ goal: assignedGoal, maxLiveQueries: 2, frontier });
const result = await queryBindingsGuarded({ engine: new QueryEngine(), query });
const resultBindings = result.rows.map(row => Object.fromEntries([ ...row ].map(([ key, value ]) => [ key.value, value.value ])));
const finalMap = recordWorkerOutcome(initialMap, {
  stepId: CONTEXT_MAP_STEP_ID,
  outcome: 'success',
  query,
  rows: resultBindings,
  provenance: result.provenance,
});
const recovery = recoverContextMap(finalMap);
const workerReport = {
  stepId: CONTEXT_MAP_STEP_ID,
  status: 'stopped-after-turn-1',
  resultBindings,
  rowsObserved: resultBindings.length,
  frontier: recovery.frontier ?? [],
  interpretation: resultBindings.length === 0 ? 'No binding was returned by this bounded orientation query; no absence claim is made.' : 'The namespace identity binding is observed; the frontier is for coordinator selection only.',
};
const receipt = buildReceipt({ assignedGoal, contextMap: finalMap, workerReport, provenance: result.provenance });
const timestampToken = receipt.timestamp.replace(/[:.]/g, '-');
const outputDir = join(process.cwd(), 'artifacts', 'context-map-runs');
const outputPath = join(outputDir, `two-turn-turn-1-${timestampToken}.json`);
await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ receiptPath: outputPath, mapState: recovery.status, workerReport, provenance: result.provenance }, null, 2));
