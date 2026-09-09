import {mkdir,readFile,writeFile,mkdtemp,realpath,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {KernelBroker} from '../packages/cleanroom-node-repl/src/cleanroom-mcp.mjs';
import {startScientificSessionService} from '../packages/cleanroom-node-repl/src/scientific-session-service.mjs';
import {connectScientificSession} from '../packages/cleanroom-node-repl/src/scientific-session-client.mjs';
const root=resolve(new URL('..',import.meta.url).pathname),runId=process.argv[2];
if(!runId||!/^e3-[a-z0-9-]+$/.test(runId))throw Error('Provide unique e3- run id');
const dir=join(root,'artifacts/scoped-data-bridge',runId);await mkdir(dir);
const sha=x=>createHash('sha256').update(x).digest('hex');
const save=(name,data)=>writeFile(join(dir,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const startedAt=new Date().toISOString(),source={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:true,diffSha256:sha(execFileSync('git',['diff'])),harnessSha256:sha(await readFile(new URL(import.meta.url)))};
const fixture=(key,tier)=>`var ws=scopedFacade.open({contextKey:${JSON.stringify(key)}});var f=ws.rdf.DataFactory;var graph=await ws.rdf.retain({name:'fixture',storage:${JSON.stringify(tier)},quads:[f.quad(f.namedNode('urn:a'),f.namedNode('urn:p'),f.literal('one'),f.namedNode('urn:g'))]});var bindings=await ws.query.run({sources:[graph],sparql:'SELECT ?o WHERE { GRAPH <urn:g> {?s ?p ?o} VALUES ?i {1 2} }'});var json=nodeRepl.scientificSession.publishJson(ws,{allowed:[1,null,true],private:'not-granted'});var graphRef=nodeRepl.scientificSession.publish(ws,graph);var bindingRef=nodeRepl.scientificSession.publish(ws,bindings);nodeRepl.write(JSON.stringify({graph:graphRef.object,bindings:bindingRef.object,json:json.object}));`;
await save('plan.json',{runId,experiment:'E3',protocol:'scoped-data-bridge/shared-session-v2',startedAt,source,arms:['resident graph','broker graph'],workers:'two mechanical scoped clients concurrently; no semantic model',scope:'local synthetic only; isolated owner kernel; no working-session reset',requiredCheckCount:74,bounds:{requestTimeoutMs:30000,outputBytes:8192,graphQuads:1},checks:['authorized reads','foreign objects','JSON widened path','external query source','mutation','wrong slot','malformed output','duplicate completion','concurrent deposits','release per kind','workspace disposal with other workspace survival','expiry','in-flight release with no response payload','reset and late deposit','child-local copy mutation'],interpretation:'Whole published-object grants for RDF/bindings and JSON path-prefix grants. Generic JSON deposit shape only, not application-specific schema. Cooperative same-user protocol boundary, not OS isolation.'});
await save('fixture-manifest.json',{recipe:fixture('example','resident'),inputKinds:['RDF named graph','SELECT bindings','JSON'],inFlightFixture:'Test-only workspace source wrapper waits asynchronously, releases its underlying graph, then yields; dispatcher must revalidate before delivering that quad.'});
await writeFile(join(dir,'harness-source.txt'),await readFile(new URL(import.meta.url)),{flag:'wx'});
const checks=[],events=[];let seq=0;
async function record(id,fn,expected){
 let observed,status;
 try{observed=await fn();status=expected(observed)?'passed':'failed';}catch(e){observed={unexpectedError:e.code??e.name,message:e.message};status='failed';}
 const check={id,status,observed};checks.push(check);const event={seq:++seq,observedAt:new Date().toISOString(),operation:id,status,outputBytes:null,parentVisibleBytes:null,childVisibleBytes:null,observed};events.push(event);
 await writeFile(join(dir,'events.jsonl'),JSON.stringify(event)+'\n',{flag:'a'});
 await save(`check-${seq}.json`,check);
}
const deny=async fn=>{try{await fn();return {denied:false};}catch(e){return {denied:true,code:e.code??e.name};}};
const evalJson=async(owner,code)=>{const r=await owner.execute(code,{maxOutputBytes:8192});if(r.isError)throw Error(JSON.stringify(r));return JSON.parse(r.content[0].text);};
const tmp=await realpath(await mkdtemp(join(tmpdir(),'bridge-e3-'))),socketPath=join(tmp,'s.sock');
const service=await startScientificSessionService({socketPath,brokerFactory:()=>new KernelBroker({cwd:root}),idleTtlMs:600000});
let owner;const clients=[];
try{
for(const tier of ['resident','broker']){
 owner=await connectScientificSession({socketPath});clients.push(owner);const session=await owner.create();
 const attach=async(refs,slot,extra={})=>{const grant=await owner.grant({objects:Object.values(refs),operations:['describe','match','bindings','query','jsonRead','deposit','result'],...(refs.json?{jsonPaths:{[refs.json]:[['allowed']]}}:{}),outputSlot:slot,ttlMs:300000,...extra});const client=await connectScientificSession({socketPath});clients.push(client);await client.attach({sessionId:session.sessionId,capability:grant.capability});return client;};
 await owner.execute(`var {setupLinkedScienceWithPrivateTraversal}=await import(${JSON.stringify(new URL('../packages/cleanroom-node-repl/src/private-linked-science-traversal.mjs',import.meta.url).href)});var scopedFacade=await setupLinkedScienceWithPrivateTraversal({cleanroom:nodeRepl,nodeRepl:{},budgets:{maxResultItems:${tier==='broker'?1:1000}}});`);
 const a=await evalJson(owner,fixture('scope-a',tier));
 await record(`${tier}-storage-tiers`,()=>evalJson(owner,`nodeRepl.write(JSON.stringify({graph:ws.results.profile(graph).residency?.kind??'resident',bindings:ws.results.profile(bindings).residency?.kind??'resident'}));`),r=>r.graph===(tier==='broker'?'broker-stored-result':'resident-rdf-dataset')&&r.bindings===(tier==='broker'?'broker-stored-result':'resident'));await owner.execute('var wsA=ws;var graphA=graph;var bindingsA=bindings;var jsonA=json');
 const b=await evalJson(owner,fixture('scope-b',tier));await owner.execute('var wsB=ws;var graphB=graph');
 const A=await attach(a,'a'),B=await attach(b,'b');
 await record(`${tier}-authorized-graph`,()=>A.request('match',{object:a.graph,limit:1}),r=>r.quads.length===1);
 await record(`${tier}-authorized-bindings`,()=>A.request('bindings',{object:a.bindings,limit:1}),r=>r.rows.length===1&&r.complete===false);
 await record(`${tier}-authorized-json`,()=>A.request('jsonRead',{object:a.json,path:['allowed'],version:1}),r=>JSON.stringify(r.value)==='[1,null,true]');
 for(const [kind,operation,args] of [['graph','match',{limit:1}],['bindings','bindings',{limit:1}],['json','jsonRead',{path:['allowed'],version:1}]])await record(`${tier}-foreign-${kind}`,()=>deny(()=>A.request(operation,{object:b[kind],...args})),r=>r.denied&&r.code==='FORBIDDEN');
 for(const [id,fn] of [
 ['widen-json',()=>A.request('jsonRead',{object:a.json,path:[],version:1})],
 ['external-source',()=>A.request('query',{object:a.graph,sparql:'SELECT * WHERE {SERVICE <https://example.invalid/> {?s ?p ?o}}'})],
 ['mutation-query',()=>A.request('query',{object:a.graph,sparql:'INSERT DATA {<urn:x> <urn:p> <urn:y>}'})],
 ['arbitrary-code',()=>A.execute('globalThis.unpermitted=1')],['worker-reset',()=>A.reset()],['worker-close',()=>A.closeSession()],
 ['wrong-slot',()=>A.request('deposit',{slot:'b',value:{ok:true}})]])await record(`${tier}-${id}`,()=>deny(fn),r=>r.denied&&r.code==='FORBIDDEN');
 await record(`${tier}-malformed-deposit`,()=>deny(()=>A.request('deposit',{slot:'a',value:'scalar'})),r=>r.denied&&r.code==='INVALID_ARGUMENT');
 await record(`${tier}-concurrent-return`,()=>Promise.all([A.request('deposit',{slot:'a',value:{count:1}}),B.request('deposit',{slot:'b',value:{count:1}})]),r=>r.every(x=>x.status==='deposited'));
 await record(`${tier}-duplicate`,()=>deny(()=>A.request('deposit',{slot:'a',value:{count:999}})),r=>r.denied&&r.code==='SESSION_DUPLICATE_DEPOSIT');
 await record(`${tier}-aggregate`,()=>evalJson(owner,"nodeRepl.write(JSON.stringify({a:(await nodeRepl.scientificSession.result('a')).value,b:(await nodeRepl.scientificSession.result('b')).value}));"),r=>r.a.count===1&&r.b.count===1);
 await record(`${tier}-local-copy-mutation`,async()=>{const q=await A.request('match',{object:a.graph,limit:1});q.quads[0][2].value='changed';return A.request('match',{object:a.graph,limit:1});},r=>r.quads[0][2].value==='one');
 for(const [kind,code,operation,args] of [
 ['graph','await wsA.release(graphA)','match',{limit:1}],
 ['bindings','await wsA.release(bindingsA)','bindings',{limit:1}],
 ['json','nodeRepl.scientificSession.unpublish(jsonA)','jsonRead',{path:['allowed'],version:1}]]){
  const C=await attach({[kind]:a[kind]},`release-${kind}`);await owner.execute(code);
  await record(`${tier}-released-${kind}-read`,()=>deny(()=>C.request(operation,{object:a[kind],...args})),r=>r.denied&&r.code===(kind==='json'?'SESSION_OBJECT_UNKNOWN':'LS_RELEASED_HANDLE'));
  await record(`${tier}-released-${kind}-deposit`,()=>deny(()=>C.request('deposit',{slot:`release-${kind}`,value:{late:true}})),r=>r.denied&&r.code===(kind==='json'?'SESSION_OBJECT_UNKNOWN':'LS_RELEASED_HANDLE'));C.close();
 }
 await owner.execute('await wsA.dispose()');
 await record(`${tier}-unrelated-workspace-survives`,()=>B.request('match',{object:b.graph,limit:1}),r=>r.quads.length===1);
 const D=await attach(b,'disposal');await owner.execute('await wsB.dispose()');
 for(const [kind,op,args] of [['graph','match',{limit:1}],['bindings','bindings',{limit:1}],['json','jsonRead',{path:['allowed'],version:1}]])await record(`${tier}-disposed-${kind}`,()=>deny(()=>D.request(op,{object:b[kind],...args})),r=>r.denied&&r.code==='LS_STALE_WORKSPACE');
 await record(`${tier}-disposed-deposit`,()=>deny(()=>D.request('deposit',{slot:'disposal',value:{late:true}})),r=>r.denied&&r.code==='LS_STALE_WORKSPACE');D.close();
 const live=await evalJson(owner,fixture('lifetime',tier));
 const expiring=await attach(live,'expiry',{ttlMs:100});await delay(150);
 await record(`${tier}-expiry`,()=>deny(()=>expiring.request('describe',{object:live.graph})),r=>r.denied&&r.code==='GRANT_EXPIRED');
 await record(`${tier}-expired-deposit`,()=>deny(()=>expiring.request('deposit',{slot:'expiry',value:{late:true}})),r=>r.denied&&r.code==='GRANT_EXPIRED');expiring.close();
 const delayed=await evalJson(owner,`var delayedWs=ws;var delayedGraph=graph;var wrapped={results:ws.results,rdf:{source:()=>({match:async function*(){for await(var quad of delayedWs.rdf.source(delayedGraph).match()){await new Promise(done=>setTimeout(done,20));await delayedWs.release(delayedGraph);yield quad;}}})}};nodeRepl.write(JSON.stringify({graph:nodeRepl.scientificSession.publish(wrapped,graph).object}));`);
 const slow=await attach(delayed,'in-flight');
 await record(`${tier}-in-flight-release`,()=>deny(()=>slow.request('match',{object:delayed.graph,limit:1})),r=>r.denied&&r.code==='LS_RELEASED_HANDLE');
 await record(`${tier}-in-flight-deposit`,()=>deny(()=>slow.request('deposit',{slot:'in-flight',value:{late:true}})),r=>r.denied&&r.code==='LS_RELEASED_HANDLE');slow.close();
 const resetRefs=await evalJson(owner,fixture('reset',tier)),old=await attach(resetRefs,'old-epoch');
 const before=await owner.status();await owner.reset();const after=await owner.status();
 await record(`${tier}-epoch-changed`,async()=>({before:before.epoch,after:after.epoch}),r=>r.before!==r.after);
 await record(`${tier}-old-epoch-read`,()=>deny(()=>old.request('describe',{object:resetRefs.graph})),r=>r.denied&&r.code==='GRANT_EXPIRED');
 await record(`${tier}-old-epoch-deposit`,()=>deny(()=>old.request('deposit',{slot:'old-epoch',value:{late:true}})),r=>r.denied&&r.code==='GRANT_EXPIRED');
 await save(`${tier}-checkpoint.json`,{checks:checks.filter(c=>c.id.startsWith(tier))});
 old.close();A.close();B.close();await owner.closeSession();owner.close();
}
}catch(e){await record('unexpected-harness-error',async()=>({error:e.code??e.name,message:e.message}),()=>false);}
finally{await save('checks.json',{checks});for(const c of clients)c.close();await service.close();await rm(tmp,{recursive:true,force:true});}
const receipt=JSON.parse(await readFile(join(root,'docs/experiments/scoped-data-bridge/receipt.template.json')));
Object.assign(receipt,{recordState:'finalized',runId,experiment:'E3',arm:'isolated-real-session-mechanical-clients',attempt:1,protocol:'scoped-data-bridge/shared-session-v2',startedAt,finishedAt:new Date().toISOString(),source,authorization:{scope:'Synthetic isolated scope/lifetime experiment',source:'User authorized proceeding after restart'},outcome:checks.length===74&&checks.every(c=>c.status==='passed')?'passed':'partial',evidenceLevel:'machine-receipt',durability:'partial',observedSummary:'Recorded authorized and denied operations through real scientific session service, including concurrent return and invalidation.',missingEvidence:['Total transport and model-token accounting unavailable.'],limitations:['Mechanical clients, no semantic model task.','Same-user application protocol boundary only.','RDF scope is a whole published object; general RDF selector grants are not implemented.','Generic JSON output shape tested, not application-specific result schemas.','In-flight release uses an explicitly injected source wrapper; JSON reads are synchronous and serialized.'],nextDecision:'Advance only if all frozen required checks pass; E4 requires its own schema/rubric and repetitions.'});receipt.finalization={capturedBeforeStateLoss:true,evidenceSha256:{'checks.json':sha(await readFile(join(dir,'checks.json')))},finalizedAt:new Date().toISOString()};await save('receipt.json',receipt);console.log(JSON.stringify({runId,outcome:receipt.outcome,count:checks.length,failed:checks.filter(c=>c.status!=='passed')},null,2));
