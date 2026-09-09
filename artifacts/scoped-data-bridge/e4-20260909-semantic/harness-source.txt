import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fixture,contract,answerKey,score,structuralOnly} from './scoped-bridge-e4-evaluator.mjs';
import {connectScientificSession} from '../packages/cleanroom-node-repl/src/scientific-session-client.mjs';
const root=resolve(new URL('..',import.meta.url).pathname);
const base=join(root,'artifacts/scoped-data-bridge/e4-20260909-semantic');
const privateDir='/private/tmp/linked-science-e4-20260909';
const socketPath=join(privateDir,'session.sock');
const [command,run]=process.argv.slice(2);
const hash=x=>createHash('sha256').update(x).digest('hex');
const save=(p,x)=>writeFile(p,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const evaluatorPath=new URL('./scoped-bridge-e4-evaluator.mjs',import.meta.url);
if(command==='freeze'){
 await mkdir(base);await mkdir(privateDir,{recursive:true,mode:0o700});
 let seed=20260909;const order=['A1','A2','A3','B1','B2','B3','C1','C2','C3'];
 for(let i=order.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[order[i],order[j]]=[order[j],order[i]];}
 const plan={protocol:'scoped-data-bridge/e4-semantic-v1',frozenAt:new Date().toISOString(),seed:20260909,order,source:{commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:true,diffSha256:hash(execFileSync('git',['diff'])),harnessSha256:hash(await readFile(new URL(import.meta.url))),evaluatorSha256:hash(await readFile(evaluatorPath))},bounds:{annotations:12,graphQuads:2,concurrency:1,workerDeadlineMs:300000,grantTtlMs:300000,ownerOutputBytes:8192},model:'Inherited model and reasoning; actual backend settings/token usage unavailable',arms:{A:'Fresh evaluator with explicit complete bounded fixture prompt, output file relayed by code into owner findings variable. Proxy for root-only access, not literal coordinating root.',B:'Fresh evaluator receives only scoped JSON and native RDF references; reads via mounted project MCP; deposits directly; owner validates and aggregates.',C:'Deterministic transitive graph reachability; annotation prose deliberately uninterpreted; unresolved annotations reported unknown.'},rubric:'Each row correct iff exact target, verdict, uncertainty and required existing references match frozen key. Schema validity/coverage/references reported separately. Six structural-baseline rows expected correct by construction; not a competitive optimized rules engine.',limitations:['Synthetic, descriptive, unblinded; coordinator authored fixture and key.','Fresh evaluator baseline is a declared change from literal root-only processing.','No enforced filesystem separation of answer key; workers instructed to use only supplied evidence.','No complete parent/worker transcript audit; strict no-relay remains unestablished.','No complete token/transport accounting; measured payload bytes are not total costs.'],authorization:'User authorized semantic experiment with 3 arms and 3 repetitions after E3.'};
 await save(join(base,'plan.json'),plan);await save(join(base,'fixture.json'),fixture);await save(join(base,'contract.json'),contract);await save(join(base,'answer-key.json'),answerKey);
 await writeFile(join(base,'harness-source.txt'),await readFile(new URL(import.meta.url)),{flag:'wx'});await writeFile(join(base,'evaluator-source.txt'),await readFile(evaluatorPath),{flag:'wx'});
 for(const r of order){await mkdir(join(base,r));await save(join(base,r,'plan.json'),{...plan,run:r});}
 console.log(JSON.stringify({order,fixtureBytes:Buffer.byteLength(JSON.stringify(fixture))}));
}else{
 if(!/^[ABC][123]$/.test(run??''))throw Error('Expected run A1..C3');
 const dir=join(base,run),plan=await read(join(dir,'plan.json'));
 if(plan.source.harnessSha256!==hash(await readFile(new URL(import.meta.url)))||plan.source.evaluatorSha256!==hash(await readFile(evaluatorPath)))throw Error('Frozen source changed');
 const client=await connectScientificSession({socketPath});
 try{
 if(command==='prepare'){
  const connection=await client.create();
  await writeFile(join(privateDir,`${run}.json`),JSON.stringify(connection),{flag:'wx',mode:0o600});
  const output=await client.execute(`var e4ws=linkedScience.open({contextKey:'semantic-${run.toLowerCase()}'});var e4input=${JSON.stringify(fixture)};var e4f=e4ws.rdf.DataFactory;var e4graph=await e4ws.rdf.retain({name:'subclass',storage:'broker',quads:e4input.graph.map(e=>e4f.quad(e4f.namedNode('urn:e4:'+e.subject),e4f.namedNode(e.predicate),e4f.namedNode('urn:e4:'+e.object)))});var e4json=nodeRepl.scientificSession.publishJson(e4ws,{annotations:e4input.annotations,edgeIds:e4input.graph.map(e=>({id:e.id,subject:'urn:e4:'+e.subject,object:'urn:e4:'+e.object}))});var e4ref=nodeRepl.scientificSession.publish(e4ws,e4graph);nodeRepl.write(JSON.stringify({json:e4json.object,graph:e4ref.object}));`,{maxOutputBytes:8192});
  if(output.isError)throw Error(JSON.stringify(output));const refs=JSON.parse(output.content[0].text);
  const grant=await client.grant({objects:Object.values(refs),operations:['jsonRead','match','deposit'],outputSlot:'findings',ttlMs:300000});
  await save(join(dir,'started.json'),{startedAt:new Date().toISOString(),refs,grantFingerprint:hash(grant.capability),role:'owner',fixtureSha256:hash(JSON.stringify(fixture))});
  console.log(JSON.stringify({socketPath,sessionId:connection.sessionId,capability:grant.capability,refs,run}));
 }else if(command==='collect'){
  const connection=await read(join(privateDir,`${run}.json`));await client.attach(connection);
  let value;
  if(run[0]==='B'){
   const result=await client.execute("var e4findings=(await nodeRepl.scientificSession.result('findings')).value;nodeRepl.write(JSON.stringify(e4findings));",{maxOutputBytes:16384});
   if(result.isError)throw Error(JSON.stringify(result));value=JSON.parse(result.content[0].text);
  }else{
   value=run[0]==='C'?structuralOnly():await read(join(dir,'response.json'));
   const result=await client.execute(`var e4findings=${JSON.stringify(value)};nodeRepl.write({stored:true});`,{maxOutputBytes:1000});if(result.isError)throw Error(JSON.stringify(result));
  }
  const checked=score(value);
  const aggregated=await client.execute("nodeRepl.write(JSON.stringify({count:e4findings.findings.length,ids:e4findings.findings.map(x=>x.id),verdicts:e4findings.findings.reduce((a,x)=>(a[x.claim.verdict]=(a[x.claim.verdict]||0)+1,a),{})}));",{maxOutputBytes:8192});
  if(aggregated.isError)throw Error(JSON.stringify(aggregated));const aggregate=JSON.parse(aggregated.content[0].text);
  await save(join(dir,'findings.json'),value);await save(join(dir,'checks.json'),{...checked,aggregate,aggregateConsistent:aggregate.count===value.findings.length&&aggregate.ids.join('|')===value.findings.map(x=>x.id).join('|')});
  const started=await read(join(dir,'started.json')),finishedAt=new Date().toISOString();
  const receipt=await read(join(root,'docs/experiments/scoped-data-bridge/receipt.template.json'));
  Object.assign(receipt,{recordState:'finalized',runId:`e4-20260909-semantic-${run.toLowerCase()}`,experiment:'E4',arm:run[0],attempt:Number(run[1]),protocol:plan.protocol,startedAt:started.startedAt,finishedAt,authorization:{scope:'Synthetic semantic processing 3 arms x 3 repetitions',source:plan.authorization},source:plan.source,environment:{codexVersion:null,modelSettings:plan.model,parentRuntime:'scientific-session owner through repository external client',workerRuntimes:run[0]==='C'?[]:['fresh Codex evaluator'],topology:plan.arms[run[0]]},inputs:{fixtureManifest:'../fixture.json',objectKinds:['json','rdf-quads'],storageTiers:['resident-json','broker-quads'],grantFingerprints:[started.grantFingerprint]},budgets:plan.bounds,outcome:checked.schemaValid&&checked.completed===12&&checked.validReferences===12?'passed':'partial',evidenceLevel:'machine-receipt',durability:'partial',observedSummary:`${checked.correct}/12 exact semantic rows; ${checked.completed}/12 coverage; ${checked.validReferences}/12 references.`,interpretation:run[0]==='C'?'Structural-only negative control; partial semantic correctness expected.':'Small synthetic feasibility result, not model-quality improvement.',limitations:plan.limitations,missingEvidence:['Exact total transport bytes, model tokens and complete transcript audit unavailable.'],nextDecision:'Compare all nine attempts before advancing E5.'});
  receipt.measurements={...receipt.measurements,elapsedMs:Date.parse(finishedAt)-Date.parse(started.startedAt),assignedItems:12,completedItems:checked.completed,failedItems:12-checked.completed,semanticScore:checked.correct/12,serializedInputBytes:Buffer.byteLength(JSON.stringify(fixture)),serializedFindingBytes:Buffer.byteLength(JSON.stringify(value)),ownerAggregateBytes:Buffer.byteLength(aggregated.content[0].text)};
  await writeFile(join(dir,'events.jsonl'),JSON.stringify({observedAt:finishedAt,event:'owner-variable-captured-before-close',aggregate,checked})+'\n',{flag:'wx'});
  receipt.finalization={capturedBeforeStateLoss:true,evidenceSha256:Object.fromEntries(await Promise.all(['plan.json','started.json','findings.json','checks.json','events.jsonl'].map(async f=>[f,hash(await readFile(join(dir,f)))]))),finalizedAt:finishedAt};
  await save(join(dir,'receipt.json'),receipt);
  await client.closeSession();console.log(JSON.stringify({run,correct:checked.correct,coverage:checked.completed,references:checked.validReferences,schema:checked.schemaValid,aggregate}));
 }else throw Error('Unknown command');
 }finally{client.close();}
}
