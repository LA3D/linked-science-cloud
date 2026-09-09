import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const hash = value => createHash('sha256').update(value).digest('hex');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const [mode, runId, number] = process.argv.slice(2);
if (!/^[a-zA-Z0-9_-]+$/.test(runId ?? '')) throw Error('run ID required');
const dir = resolve(root, 'artifacts/scoped-data-bridge', runId);
const parentCode = n => `var sbE1_${n} = { marker: (await import('node:crypto')).randomBytes(32).toString('hex'), ws: linkedScience.open({contextKey:'${runId}'}) };\nsbE1_${n}.graph = await sbE1_${n}.ws.graphs.load({name:'identity-fixture',kind:'ontology',text:'<urn:bridge:A> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <urn:bridge:B> .'});\nnodeRepl.write(JSON.stringify({observedAt:new Date().toISOString(),cwd:nodeRepl.cwd,environment:linkedScience.capabilities().environment,markerSha256:(await import('node:crypto')).createHash('sha256').update(sbE1_${n}.marker).digest('hex'),count:await sbE1_${n}.ws.rdf.source(sbE1_${n}.graph).countQuads(null,null,null,null),handleEpoch:sbE1_${n}.graph.epoch}));`;
const workerCode = n => `var sbProbe = {observedAt:new Date().toISOString(),cwd:nodeRepl.cwd,environment:linkedScience.capabilities().environment,present:typeof sbE1_${n} !== 'undefined'};\nif(sbProbe.present){sbProbe.markerSha256=(await import('node:crypto')).createHash('sha256').update(sbE1_${n}.marker).digest('hex');sbProbe.count=await sbE1_${n}.ws.rdf.source(sbE1_${n}.graph).countQuads(null,null,null,null);sbProbe.handleEpoch=sbE1_${n}.graph.epoch;try{sbE1_${n}.ws.rdf.source(JSON.parse(JSON.stringify(sbE1_${n}.graph)));sbProbe.copiedHandle='accepted';}catch(e){sbProbe.copiedHandle=e.code;}sbE1_${n}.workerDeposit={probe:'${runId}',count:sbProbe.count};sbProbe.deposit=true;}\nnodeRepl.write(JSON.stringify(sbProbe));`;
if (mode === 'prepare') {
  const n=Number(number); if(![1,2,3].includes(n))throw Error('attempt 1–3 required');
  mkdirSync(dir);
  writeFileSync(resolve(dir,'parent-code.js'),parentCode(n),{flag:'wx'});
  writeFileSync(resolve(dir,'worker-code.js'),workerCode(n),{flag:'wx'});
  write(resolve(dir,'plan.json'),{format:'scoped-data-bridge-plan/v1',protocol:'scoped-data-bridge/v1',experiment:'E1',runId,attempt:n,arm:'fresh-codex-worker',frozenAt:new Date().toISOString(),authorization:'User requested execution of the designed experiment suite in this task.',source:{commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),dirty:true,diffSha256:hash(execFileSync('git',['diff','HEAD'],{cwd:root})),harnessSha256:hash(readFileSync(new URL(import.meta.url)))},budgets:{workersConcurrent:1,wallTimeMs:600000,parentObservationBytes:8192,childReadBytes:8192},expectedChecks:['parent native graph count is 1','worker observes or explicitly cannot observe parent marker','if visible, marker digests and epoch agree','if visible, copied descriptor is rejected','if visible, worker deposit is visible to parent'],limitations:['No assumption of cross-worker kernel sharing','Worker model usage may not be exposed','Same namespace access is not enforced scope']});
  write(resolve(dir,'fixture-manifest.json'),{kind:'synthetic-rdf-identity-fixture',quadCount:1,textSha256:hash('<urn:bridge:A> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <urn:bridge:B> .'),marker:'generated in owning kernel; only digest observed',parentCodeSha256:hash(parentCode(n)),workerCodeSha256:hash(workerCode(n))});
  console.log(JSON.stringify({dir,parentCode:parentCode(n),workerCode:workerCode(n)}));
} else if(mode === 'validate') {
  const p=json(resolve(dir,'plan.json'));
  if(p.protocol!=='scoped-data-bridge/v1'||p.experiment!=='E1')throw Error('invalid plan');
  for(const name of ['parent-code.js','worker-code.js']){
    const key=name==='parent-code.js'?'parentCodeSha256':'workerCodeSha256';
    if(hash(readFileSync(resolve(dir,name)))!==json(resolve(dir,'fixture-manifest.json'))[key])throw Error('code changed after freeze');
  }
  if(existsSync(resolve(dir,'receipt.json'))){
    const r=json(resolve(dir,'receipt.json'));const c=json(resolve(dir,'checks.json'));
    if(r.runId!==runId||!['passed','failed','partial','inconclusive'].includes(r.outcome))throw Error('invalid receipt');
    if(!Array.isArray(r.missingEvidence))throw Error('missing evidence field');
    if(r.outcome==='passed'&&c.some(x=>x.required&&x.status!=='passed'))throw Error('unsupported passing claim');
    for(const [path,digest] of Object.entries(r.finalization.evidenceSha256)){if(hash(readFileSync(resolve(dir,path)))!==digest)throw Error('evidence changed');}
  }
  console.log('E1 plan/receipt validation passed');
} else if(mode === 'finalize') {
  const p=json(resolve(dir,'plan.json'));
  const unpack = result => {const t=result.content?.filter(x=>x.type==='text').map(x=>x.text).join('\n');try{return JSON.parse(t);}catch{return {unparsed:t};}};
  const parent=unpack(json(resolve(dir,'parent-tool.json')));
  const worker=existsSync(resolve(dir,'worker-tool.json'))?unpack(json(resolve(dir,'worker-tool.json'))):null;
  const after=existsSync(resolve(dir,'parent-after-tool.json'))?unpack(json(resolve(dir,'parent-after-tool.json'))):null;
  const setupFailed=parent.ok===false||parent.count!==1;
  const checks=[{id:'parent-fixture',required:true,expected:1,observed:parent.count??null,status:setupFailed?'failed':'passed',eventSequences:[1]}];
  let topology='unestablished';
  if(!setupFailed && worker){
    topology=worker.present===true?'same-kernel-namespace':worker.present===false?'separate-or-inaccessible-namespace':'unavailable';
    checks.push({id:'worker-access-classified',required:true,expected:'observed present boolean',observed:worker.present??null,status:typeof worker.present==='boolean'?'passed':'not-measured',eventSequences:[2]});
    if(worker.present){
      for(const [id,expected,observed] of [['marker-match',parent.markerSha256,worker.markerSha256],['graph-count',1,worker.count],['epoch-match',parent.handleEpoch,worker.handleEpoch],['copied-handle-rejected','LS_INVALID_HANDLE',worker.copiedHandle],['deposit-visible',p.runId,after?.deposit?.probe]]) checks.push({id,required:true,expected,observed:observed??null,status:observed===expected?'passed':'failed',eventSequences:[1,2,3]});
    }
  }
  const outcome=setupFailed?'failed':checks.some(x=>x.status==='failed')?'failed':worker&&checks.every(x=>x.status==='passed')?'passed':'inconclusive';
  const files=['plan.json','fixture-manifest.json','parent-code.js','worker-code.js','parent-tool.json',...(worker?['worker-tool.json']:[]),...(after?['parent-after-tool.json']:[])];
  const events=files.filter(f=>f.endsWith('tool.json')).map((f,i)=>({seq:i+1,observedAt:unpack(json(resolve(dir,f))).observedAt??null,actor:f.startsWith('worker')?'worker':'parent',operation:f,objectRef:p.runId,status:json(resolve(dir,f)).isError?'failed':'returned',inputBytes:null,outputBytes:Buffer.byteLength(JSON.stringify(json(resolve(dir,f)))),parentVisibleBytes:f.startsWith('worker')?null:Buffer.byteLength(JSON.stringify(json(resolve(dir,f)))),childVisibleBytes:null,evidencePath:f,error:unpack(json(resolve(dir,f))).error??null}));
  writeFileSync(resolve(dir,'events.jsonl'),events.map(e=>JSON.stringify(e)).join('\n')+'\n',{flag:'wx'});
  write(resolve(dir,'checks.json'),checks);
  files.push('events.jsonl','checks.json');
  const missing=['Exact per-model token usage and complete observation-byte accounting are unavailable.'];
  if(!worker)missing.push('Worker probe was not executed because parent fixture preparation failed.');
  if(worker?.present===false)missing.push('Broker identity is not independently exposed; distinct namespace does not establish distinct broker.');
  if(worker?.present && !after)missing.push('Parent post-worker recheck absent.');
  const receipt={format:'linked-science-scoped-data-bridge-receipt/v1',recordState:'finalized',runId,experiment:'E1',arm:p.arm,attempt:p.attempt,protocol:p.protocol,startedAt:p.frozenAt,finishedAt:new Date().toISOString(),authorization:p.authorization,source:p.source,environment:{topology},planPath:'plan.json',eventsPath:'events.jsonl',checksPath:'checks.json',budgets:p.budgets,outcome,evidenceLevel:'machine-receipt',durability:'partial',observedSummary:setupFailed?'Parent fixture setup failed before worker dispatch.':`Worker access classified as ${topology}.`,interpretation:topology==='same-kernel-namespace'?'Native access and deposit establish connectivity, not scoped enforcement.':'No shared object access is inferred without a matching marker.',missingEvidence:missing,limitations:p.limitations,nextDecision:setupFailed?'Repair invalid fixture context key and record a separate attempt.':'Select bridge topology using all E1 repetitions.',relatedRunIds:[],finalization:{capturedBeforeStateLoss:true,evidenceSha256:Object.fromEntries(files.map(f=>[f,hash(readFileSync(resolve(dir,f)))])),finalizedAt:new Date().toISOString()}};
  write(resolve(dir,'receipt.json'),receipt);
  console.log(JSON.stringify({runId,outcome,topology,checks}));
} else if(mode === 'register') {
  const r=json(resolve(dir,'receipt.json'));
  const registryPath=resolve(root,'artifacts/experiment-results/registry.json');
  const registry=json(registryPath);
  if(registry.runs.some(x=>x.id===runId))throw Error('already registered');
  const entry={id:runId,date:r.finishedAt.slice(0,10),title:`Scoped data bridge E1 ${runId}`,outcome:r.outcome,evidenceLevel:r.evidenceLevel,durability:r.durability,recordPaths:[`artifacts/scoped-data-bridge/${runId}/receipt.json`,`artifacts/scoped-data-bridge/${runId}/checks.json`],documentationPaths:['docs/experiments/scoped-data-bridge.md','docs/tasks/scoped-data-bridge.md'],missingEvidence:r.missingEvidence};
  const raw=readFileSync(registryPath,'utf8');
  writeFileSync(registryPath,raw.replace('"runs": [','"runs": [\n    '+JSON.stringify(entry)+','));
  console.log('Registered '+runId);
} else throw Error('prepare, validate, finalize or register required');
