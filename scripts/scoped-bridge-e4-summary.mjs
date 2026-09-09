import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {score} from './scoped-bridge-e4-evaluator.mjs';
const base=new URL('../artifacts/scoped-data-bridge/e4-20260909-semantic/',import.meta.url);
const read=async p=>JSON.parse(await readFile(new URL(p,base),'utf8'));
const plan=await read('plan.json'),rows=[];
for(const run of plan.order){
 const receipt=await read(`${run}/receipt.json`),checks=await read(`${run}/checks.json`),findings=await read(`${run}/findings.json`);
 for(const [file,expected] of Object.entries(receipt.finalization.evidenceSha256))assert.equal(createHash('sha256').update(await readFile(new URL(`${run}/${file}`,base))).digest('hex'),expected,`${run}/${file}`);
 assert.equal(score(findings).correct,checks.correct);assert.equal(checks.aggregateConsistent,true);
 assert.equal(receipt.finalization.capturedBeforeStateLoss,true);
 rows.push({run,arm:receipt.arm,correct:checks.correct,assigned:12,completed:checks.completed,schemaValid:checks.schemaValid,validReferences:checks.validReferences,elapsedMs:receipt.measurements.elapsedMs,findingBytes:receipt.measurements.serializedFindingBytes,aggregateBytes:receipt.measurements.ownerAggregateBytes});
}
const summary={recordedAt:new Date().toISOString(),order:plan.order,rows,arms:Object.fromEntries(['A','B','C'].map(arm=>{const r=rows.filter(x=>x.arm===arm);return [arm,{attempts:r.length,correct:r.reduce((s,x)=>s+x.correct,0),assigned:36,completed:r.reduce((s,x)=>s+x.completed,0),validReferences:r.reduce((s,x)=>s+x.validReferences,0)}]})),interpretation:'Three scoped worker deposits were captured into owner variables and aggregated. Synthetic semantic feasibility established; neither semantic superiority nor fully audited no-relay/cost claims established.',limitations:plan.limitations};
await writeFile(new URL('summary.json',base),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(summary));
