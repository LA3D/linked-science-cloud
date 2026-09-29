import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { KernelBroker } from '../src/cleanroom-mcp.mjs';
import { startScientificSessionService } from '../src/scientific-session-service.mjs';
import { ScientificSessionMcpAdapter } from '../src/scientific-session-mcp.mjs';

async function read(broker,code) {
 const r=await broker.execute(`nodeRepl.write(JSON.stringify(await (${code})))`);
 assert.equal(r.isError,undefined,JSON.stringify(r));
 const parsed=JSON.parse(r.content[0].text);assert.equal(parsed?.error,undefined,JSON.stringify(parsed));return parsed;
}
async function exec(broker,code,options) {const r=await broker.execute(code,options);assert.equal(r.isError,undefined,JSON.stringify(r));return r;}
const registration=`
var h=nodeRepl.rlm.handoff;
await h.register({name:'select',version:'1'},async ({state,inputs})=>({type:'yield',state:{count:state.count},continuation:{name:'compose',version:'1'},request:{context:{selectedCount:state.count,evidence:inputs},contract:{type:'object',required:['text'],properties:{text:'string'},maxBytes:1024}}}));
await h.register({name:'compose',version:'1'},async ({state,result})=>({type:'done',value:{kind:'model-synthesis',text:result.text,selectedCount:state.count}}));
`;
async function setup(t) {
 const root=await mkdtemp(join(tmpdir(),'handoff-runtime-'));
 let broker=new KernelBroker({handoffRoot:root});
 t.after(async()=>{await broker.close();await rm(root,{recursive:true,force:true});});
 return {root,get broker(){return broker;},async restart(){await broker.close();broker=new KernelBroker({handoffRoot:root});return broker;}};
}

test('full RDF/JSON selection, nested synthesis, completed eval boundaries, restart and composition',async t=>{
 const f=await setup(t);let b=f.broker;
 await exec(b,registration+`
 var a=await h.open({label:'vertical'});
 var ws=linkedScience.open({contextKey:'vertical-test'});
 var graph=await ws.graphs.load({name:'input',text:'<urn:s> <urn:p> "hello"@en . <urn:s> <urn:p> "hello"@en .',kind:'instance-data'});
 var rdfRef=await h.save(a,ws,graph);
 var jsonRef=await h.saveJson(a,{threshold:1,notes:['prior-unverified']});
 var selected=await ws.query.run({sources:[graph],sparql:'SELECT ?s ?o WHERE { ?s <urn:p> ?o }'});
 var count=ws.results.profile(selected).count;
 var computation=await h.start(a,{step:{name:'select',version:'1'},state:{count},inputs:[rdfRef,jsonRef]});
 var yielded=await h.run(a,computation.id);
 `);
 const ids=await read(b,'({activity:a.id,computation:computation.id,request:yielded.request,rdfRef,jsonRef,oldEpoch:graph.epoch})');
 assert.equal(b.pending.size,0,'parent evaluation has ended before dispatch');
 const dispatch=await read(b,'h.dispatch(a,yielded.request)');assert.equal(dispatch.status,'dispatch-intent');
 await exec(b,`var nested=await h.start(a,{step:{name:'select',version:'1'},state:{count:1},inputs:[jsonRef],parentRequest:yielded.request});var ny=await h.run(a,nested.id);`);
 assert.equal(b.pending.size,0);
 await read(b,'h.dispatch(a,ny.request)');
 await read(b,"h.accept(a,ny.request,[jsonRef],{text:'nested synthetic synthesis'})");
 await read(b,'h.run(a,nested.id)');
 await exec(b,'await ws.release(graph);');
 const before=await read(b,'h.map(a)');assert.ok(before.items.every(x=>x.status==='saved'));
 b=await f.restart();
 await exec(b,registration+`var a=await h.open({id:${JSON.stringify(ids.activity)}});var ws=linkedScience.open({contextKey:'restored-test'});`);
 assert.equal((await read(b,`h.status(a,${JSON.stringify(ids.request)})`)).status,'dispatch-uncertain');
 await exec(b,`var rdfRef=${JSON.stringify(ids.rdfRef)},jsonRef=${JSON.stringify(ids.jsonRef)};var restored=await h.load(a,rdfRef,ws);var restoredJson=await h.load(a,jsonRef,ws);`);
 const restored=await read(b,'({epoch:restored.epoch,count:ws.results.profile(restored).count,json:h.readJson(ws,restoredJson),provenance:ws.results.profile(restored).provenance})');
 assert.notEqual(restored.epoch,ids.oldEpoch);assert.equal(restored.count,2,'source duplicate sequence preserved');assert.equal(restored.json.threshold,1);assert.ok(restored.provenance.recovery.savedProvenance);
 assert.ok((await read(b,'h.map(a)')).items.every(x=>x.status==='loaded'));
 await read(b,`h.reconcile(a,${JSON.stringify(ids.request)},'child-reported','synthetic-native-child')`);
 const acceptance=`h.accept(a,${JSON.stringify(ids.request)},[rdfRef,jsonRef],{text:'parent composed nested synthetic synthesis'})`;
 const receipt=await read(b,acceptance);assert.deepEqual(await read(b,acceptance),receipt);
 await read(b,`h.run(a,${JSON.stringify(ids.computation)})`);
 const final=await read(b,`h.read(a,${JSON.stringify(ids.computation)})`);assert.deepEqual(final.value,{kind:'model-synthesis',text:'parent composed nested synthetic synthesis',selectedCount:1});
});

test('pending discovery survives failed eval and truncated output; same-evaluation dispatch rejected',async t=>{
 const {broker:b}=await setup(t);
 await assert.rejects(b.execute(registration+`var a=await h.open({label:'lost-output'});var c=await h.start(a,{step:{name:'select',version:'1'},state:{count:0}});var y=await h.run(a,c.id);await h.dispatch(a,y.request);`),{code:'HANDOFF_EVALUATION_OPEN'});
 assert.equal((await read(b,'h.pending(a)')).total,1);
 await assert.rejects(b.execute(`nodeRepl.write('x'.repeat(50000));throw Error('after durable prepare');`,{maxOutputBytes:128}));
 assert.equal((await read(b,'h.pending(a)')).items[0].status,'prepared');
 assert.equal((await read(b,'h.activities()')).items[0].label,'lost-output');
});

test('named graph terms, bindings bags, source release, workspace reset, stale handles and code mismatch',async t=>{
 const {broker:b}=await setup(t);
 await exec(b,registration+`var a=await h.open({label:'data-fidelity'});var ws=linkedScience.open({contextKey:'fidelity-test'});var d=ws.rdf.DataFactory;
 var q=d.quad(d.blankNode('b1'),d.namedNode('urn:p'),d.literal('bonjour','fr'),d.namedNode('urn:named'));
 var graph=await ws.rdf.retain({name:'named',quads:[q,q]});var ref=await h.save(a,ws,graph);
 var bindings=await ws.query.run({sources:[graph],sparql:'SELECT ?s WHERE { VALUES ?s { <urn:a> <urn:a> } }'});var br=await h.save(a,ws,bindings);
 var set=await ws.rdf.retain({name:'set',quads:[q,q],storage:'broker'});var sr=await h.save(a,ws,set);
 var old=graph;await linkedScience.reset({contextKey:'fidelity-test'});ws=linkedScience.open({contextKey:'fidelity-test'});var restored=await h.load(a,ref,ws),rows=await h.load(a,br,ws),setAgain=await h.load(a,sr,ws);`);
 const fidelity=await read(b,`(async()=>({count:ws.results.profile(restored).count,setCount:ws.results.profile(setAgain).count,rows:ws.results.profile(rows).count,quads:await Array.fromAsync(ws.rdf.source(restored).match())}))()`);
 assert.equal(fidelity.count,2);assert.equal(fidelity.setCount,1);assert.equal(fidelity.rows,2);assert.equal(fidelity.quads[0].graph.value,'urn:named');
 await assert.rejects(b.execute('ws.results.profile(old)'),{code:'LS_STALE_HANDLE'});
 await exec(b,'await ws.release(restored);');
 assert.equal((await read(b,'h.map(a)')).items.find(x=>x.ref.id).status,'saved');
 await assert.rejects(b.execute("await h.register({name:'compose',version:'1'},async()=>({type:'done',value:'changed'}))"),{code:'HANDOFF_CODE_MISMATCH'});
});

test('existing scratch-worker scientificSession bridge reads saved copies and revokes request grant',async t=>{
 const root=await mkdtemp(join(tmpdir(),'handoff-session-'));
 const service=await startScientificSessionService({socketPath:join(root,'s.sock'),brokerFactory:()=>new KernelBroker({handoffRoot:join(root,'durable')})});
 const owner=new ScientificSessionMcpAdapter(),worker=new ScientificSessionMcpAdapter();
 t.after(async()=>{await worker.close();await owner.close();await service.close();await rm(root,{recursive:true,force:true});});
 await read(owner,`nodeRepl.scientificSession.create({socketPath:${JSON.stringify(join(root,'s.sock'))},sessionId:'handoff-test'})`);
 await exec(owner,registration+`var a=await h.open({label:'grant-test'});var ws=linkedScience.open({contextKey:'grant-test'});var graph=await ws.graphs.load({name:'input',kind:'instance-data',text:'<urn:s> <urn:p> 7.'});var ref=await h.save(a,ws,graph);var jr=await h.saveJson(a,{allowed:7});var c=await h.start(a,{step:{name:'select',version:'1'},state:{count:1},inputs:[ref,jr]});var y=await h.run(a,c.id);`);
 await read(owner,'h.dispatch(a,y.request)');
 const lease=await read(owner,'h.grant(a,y.request,ws)');
 await exec(owner,'await ws.release(graph);');
 await read(worker,`nodeRepl.scientificSession.attach({socketPath:${JSON.stringify(join(root,'s.sock'))},sessionId:'handoff-test',capability:${JSON.stringify(lease.grant.capability)}})`);
 assert.equal((await read(worker,`nodeRepl.scientificSession.describe(${JSON.stringify(lease.inputs[0].publication.object)})`)).count,1);
 assert.equal((await read(worker,`nodeRepl.scientificSession.readJson(${JSON.stringify(lease.inputs[1].publication.object)})`)).value.allowed,7);
 await read(worker,`nodeRepl.scientificSession.deposit(${JSON.stringify(lease.grant.outputSlot)},{text:'synthetic worker synthesis'})`);
 await exec(owner,'var result=await nodeRepl.scientificSession.result(y.request);var acceptance=await h.accept(a,y.request,[ref,jr],result.value);');
 assert.equal((await read(owner,'acceptance')).cleanup,'complete');
 await assert.rejects(worker.execute(`nodeRepl.write(await nodeRepl.scientificSession.describe(${JSON.stringify(lease.inputs[0].publication.object)}))`),{code:'GRANT_EXPIRED'});
 assert.equal((await read(owner,'h.pending(a)')).total,0);
});

test('restored JSON uses fresh epoch-bound handles and bounded projections',async t=>{
 const {broker:b}=await setup(t);
 await exec(b,`var h=nodeRepl.rlm.handoff;var a=await h.open({label:'json-lifetime'});var ws=linkedScience.open({contextKey:'json-lifetime'});var ref=await h.saveJson(a,{rows:[1,2,2],large:'x'.repeat(20000)});var j=await h.load(a,ref,ws);var old=j;`);
 assert.deepEqual(await read(b,"h.readJson(ws,j,{path:['rows'],offset:1,limit:2})"),[2,2]);
 await assert.rejects(b.execute("h.readJson(ws,j,{path:['large']})"),{code:'HANDOFF_BYTES'});
 await exec(b,"await linkedScience.reset({contextKey:'json-lifetime'});ws=linkedScience.open({contextKey:'json-lifetime'});j=await h.load(a,ref,ws);");
 await assert.rejects(b.execute('h.readJson(ws,old)'),{code:'LS_STALE_HANDLE'});
 await exec(b,'await ws.release(j);');
 await assert.rejects(b.execute('h.readJson(ws,j)'),{code:'LS_RELEASED_HANDLE'});
 assert.equal((await read(b,'nodeRepl.peek.durable(a)')).items[0].status,'saved');
});
