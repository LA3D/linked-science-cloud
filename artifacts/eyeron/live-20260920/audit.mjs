import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = new URL('./', import.meta.url);
const load = async name => JSON.parse(await readFile(new URL(name,base),'utf8'));
const exchange = async name => JSON.parse((await load(name)).response.content[0].text);
const protocol = await load('protocol.json');
const source = await exchange('source.json');
const owner = await exchange('owner-audit.json');
const same = (a,b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const checks = {
  runtime:source.version==='6.5.0', engineAvailable:source.reasoning.available===true,
  ownerSession:source.session.role==='owner', sourceCount:source.profile.count===protocol.expected.sourceQuads,
  cells:same(owner.cells,protocol.expected.Cells), neurons:same(owner.neurons,protocol.expected.Neurons),
  workerCells:same(owner.deposit.value.cells,owner.cells),workerNeurons:same(owner.deposit.value.neurons,owner.neurons),
  complete:owner.deposit.value.report.complete===true,
  derivedCount:owner.deposit.value.report.count===protocol.expected.derivedQuads,
  assertionsUnchanged:owner.sourceCount===protocol.expected.sourceQuads,
  directCells:owner.directCellAssertions===protocol.expected.directCellAssertions,
  workerDirectCells:owner.deposit.value.directCellAssertions===protocol.expected.directCellAssertions,
  proofUnverified:owner.proof.verified===false,
};
for(const name of ['post-worker.json','release-check.json']) {
  try { const result=await exchange(name); if(name==='post-worker.json')checks.ownerAfterWorkerClosure=same(result.cells,protocol.expected.Cells);else checks.sourceReleaseInvalidates=result.invalidated===true; }
  catch(e) { if(e.code!=='ENOENT')throw e; }
}
const files=['protocol.json','protocol-amendment.json','grant-rejected.json','grant.json','create.json','source.json','owner-control.json','worker-prompt.txt','owner-audit.json'];
for(const name of ['post-worker.json','release-check.json','worker-report.json','worker-closed.json','pre-cleanup-receipt.json','cleanup.json']) {try {await readFile(new URL(name,base));files.push(name);}catch(e){if(e.code!=='ENOENT')throw e;}}
const {readdir}=await import('node:fs/promises');
files.push(...(await readdir(base)).filter(n=>/^worker-\d+\.json$/.test(n)));
const evidence=await Promise.all(files.map(async name=>({path:`artifacts/eyeron/live-20260920/${name}`,sha256:createHash('sha256').update(await readFile(new URL(name,base))).digest('hex')})));
const passed=Object.values(checks).every(Boolean);
const receipt={id:protocol.id,format:'linked-science-live-reasoning-receipt/v1',date:'2026-09-20',outcome:passed?'passed':'failed',stage:checks.sourceReleaseInvalidates?'lifecycle-complete':'before-worker-closure',checks,evidence,limitations:protocol.limitations,worker:'Fresh Codex subagent; actual saved MCP exchanges, owner independently checked deposit against native queries',wikiPromotion:false};
await writeFile(new URL('receipt.json',base),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({outcome:receipt.outcome,stage:receipt.stage,checks},null,2));
if(!passed)process.exitCode=1;
