import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { KernelBroker } from '../src/cleanroom-mcp.mjs';
import { startScientificSessionService } from '../src/scientific-session-service.mjs';
import { ScientificSessionMcpAdapter } from '../src/scientific-session-mcp.mjs';
import { validateReasoningArgs } from '../src/scientific-session-runtime.mjs';
const cwd=resolve(new URL('../../..',import.meta.url).pathname);
const options={rules:{id:'hypothesis',version:'1',text:'{?s <urn:p> ?o} => {?s <urn:q> ?o}.'},graphPolicy:'default-graph-only',proof:true};
const read=async(client,code)=>{const r=await client.execute(code);assert.notEqual(r.isError,true,JSON.stringify(r));return JSON.parse(r.content[0].text);};
async function fixture(t,{operations=['reason','explain','describe','query','bindings','deposit','result'],maxGrantObjects=1024,named=false}={}) {
  const dir=await realpath(await mkdtemp(join(tmpdir(),'scoped-reasoning-'))),socketPath=join(dir,'s.sock');
  const service=await startScientificSessionService({socketPath,maxGrantObjects,brokerFactory:()=>new KernelBroker({cwd})});
  const owner=new ScientificSessionMcpAdapter({cwd}),worker=new ScientificSessionMcpAdapter({cwd});
  t.after(async()=>{await worker.close();await owner.close();await service.close();await rm(dir,{recursive:true,force:true});});
  const session=await owner.control({operation:'create',args:{socketPath}});
  // A deliberately synthetic parent adapter: tests the bridge contract, not an engine.
  const source=await read(owner,`var base=linkedScience.open({contextKey:'reason-test'});var calls=0;var lastRun;
    var ws={...base,reasoning:{
      async run(input){calls++;if(input.sources.length!==1||input.sources[0]!==g)throw Error('wrong native source');
        var derived=await base.graphs.load({name:'derived-'+calls,kind:'instance-data',text:'<urn:a> <urn:q> <urn:b> .'});
        var proof=input.proof?await base.evidence.load({name:'proof-'+calls,document:{raw:'synthetic proof'}}):null;
        lastRun=Object.freeze({derived,proof,report:{complete:true,rules:{id:input.rules.id,version:input.rules.version}}});return lastRun;},
      async explain(run,{maxBytes=4096}){if(run!==lastRun)throw Error('lost run identity');return {text:'synthetic raw proof'.slice(0,maxBytes),verified:false};},
      describe(run){return run.report;}
    }};
    var f=base.rdf.DataFactory;var g=await base.rdf.retain({name:'source',quads:[f.quad(f.namedNode('urn:a'),f.namedNode('urn:p'),f.namedNode('urn:b'),${named?"f.namedNode('urn:named')":"f.defaultGraph()"})]});
    var ref=nodeRepl.scientificSession.publish(ws,g);nodeRepl.write(JSON.stringify(ref));`);
  const grant=await owner.client.grant({objects:[source.object],operations,outputSlot:'finding'});
  await worker.control({operation:'attach',args:{socketPath,sessionId:session.sessionId,capability:grant.capability}});
  return {owner,worker,source,grant,socketPath};
}

test('reasoning references survive worker departure for owner queries and raw proof inspection',async t=>{
  const {owner,worker,source}=await fixture(t);
  const result=await read(worker,`var result=await nodeRepl.scientificSession.reason(${JSON.stringify(source.object)},${JSON.stringify(options)});nodeRepl.write(JSON.stringify(result));`);
  assert.equal(result.derived.kind,'instance-data');assert.equal(result.proof.kind,'evidence');
  assert.equal(result.report.scopedReasoning.ruleStatus,'worker-supplied-hypotheses');
  assert.equal(result.derived.id,undefined);assert.equal(result.proof.id,undefined);
  const excerpt=await read(worker,"nodeRepl.write(JSON.stringify(await nodeRepl.scientificSession.explain(result.derived.object,{maxBytes:256})))");
  assert.deepEqual(excerpt,{text:'synthetic raw proof',verified:false});
  assert.deepEqual((await worker.client.request('describe',{object:result.derived.object})).report,result.report);
  await worker.client.request('deposit',{slot:'finding',value:result});await worker.close();
  const observed=await read(owner,`var deposited=await nodeRepl.scientificSession.result('finding');var selected=await nodeRepl.scientificSession.query(deposited.value.derived.object,'SELECT ?o WHERE { <urn:a> <urn:q> ?o }');var values=[];for await(var row of nodeRepl.scientificSession.bindings(selected.object))values.push(row.get('o').value);nodeRepl.write(JSON.stringify({values,proof:await nodeRepl.scientificSession.explain(deposited.value.derived.object)}));`);
  assert.deepEqual(observed.values,['urn:b']);assert.equal(observed.proof.verified,false);
});

for(const mutation of ['await base.release(g)','nodeRepl.scientificSession.unpublish(ref)'])test(`source invalidation propagates through run, proof, queries and saved deposits: ${mutation}`,async t=>{
  const {owner,worker,source}=await fixture(t);
  const result=await worker.client.request('reason',{object:source.object,...options});
  const query=await worker.client.request('query',{object:result.derived.object,sparql:'SELECT * WHERE {?s ?p ?o}'});
  await worker.client.request('deposit',{slot:'finding',value:result});
  await owner.execute(mutation);
  for(const ref of [result.derived,result.proof,query])await assert.rejects(worker.client.request('describe',{object:ref.object}));
  await assert.rejects(worker.client.request('explain',{object:result.derived.object}));
  await assert.rejects(worker.client.request('result',{slot:'finding'}));
  const invalid=await read(owner,"try{await nodeRepl.scientificSession.result('finding');nodeRepl.write('false')}catch{nodeRepl.write('true')}");assert.equal(invalid,true);
});

test('reason and explain are independent capabilities; scope cannot select another source or evaluate owner code',async t=>{
  const {worker,source,owner}=await fixture(t,{operations:['reason','deposit']});
  await assert.rejects(worker.client.request('reason',{object:'other',...options}),{code:'FORBIDDEN'});
  await assert.rejects(worker.client.request('reason',{object:source.object,...options,sources:['other']}),{code:'INVALID_ARGUMENT'});
  await assert.rejects(worker.client.execute('calls=100'),{code:'FORBIDDEN'});
  const result=await worker.client.request('reason',{object:source.object,...options,proof:false});assert.equal(result.proof,null);
  await assert.rejects(worker.client.request('explain',{object:result.derived.object}),{code:'FORBIDDEN'});
  await owner.execute('nodeRepl.scientificSession.unpublish(ref)');
  await assert.rejects(worker.client.request('deposit',{slot:'finding',value:result}));
});

test('explain grant alone never authorizes reasoning',async t=>{
  const {worker,source}=await fixture(t,{operations:['explain']});
  await assert.rejects(worker.client.request('reason',{object:source.object,...options}),{code:'FORBIDDEN'});
  await assert.rejects(worker.client.request('explain',{object:source.object}));
});

test('capacity reserves both derived and proof before running parent reasoning',async t=>{
  const {owner,worker,source}=await fixture(t,{maxGrantObjects:2});
  await assert.rejects(worker.client.request('reason',{object:source.object,...options}),{code:'CAPACITY'});
  assert.equal(await read(owner,'nodeRepl.write(JSON.stringify(calls))'),0);
  await worker.client.request('reason',{object:source.object,...options,proof:false});
  await assert.rejects(worker.client.request('reason',{object:source.object,...options,proof:false}),{code:'CAPACITY'});
});

test('runtime rejects named graphs before calling parent reasoning',async t=>{
  const {owner,worker,source}=await fixture(t,{named:true});
  await assert.rejects(worker.client.request('reason',{object:source.object,...options}));
  assert.equal(await read(owner,'nodeRepl.write(JSON.stringify(calls))'),0);
});

test('strict reasoning payload validation counts UTF-8 bytes and rejects widening options',()=>{
  validateReasoningArgs('reason',options);
  validateReasoningArgs('reason',{...options,limits:{timeoutMs:1000,maxInputBytes:1024,maxRulesBytes:1024,maxRules:10,maxOutputBytes:1024,maxProofBytes:1024,wasmMemoryMiB:128,workerHeapMiB:64}});
  for(const change of [{sources:[]},{graphPolicy:'union'},{proof:'yes'},{limits:[]},{limits:{timeoutMs:0}},{limits:{timeoutMs:Infinity}},{limits:{other:1}},{rules:{...options.rules,trust:true}},{rules:{...options.rules,text:'é'.repeat(32768)}}])assert.throws(()=>validateReasoningArgs('reason',{...options,...change}));
  validateReasoningArgs('explain',{object:'a',maxBytes:256});
  for(const maxBytes of [0,-1,9,255,65537,1.5,'10'])assert.throws(()=>validateReasoningArgs('explain',{object:'a',maxBytes}));
});

test('wire preflight rejects malformed rules and options without invoking the parent',async t=>{
  const {owner,worker,source,socketPath}=await fixture(t);
  for(const change of [{graphPolicy:'union'},{rules:{...options.rules,text:'é'.repeat(32768)}},{limits:{timeoutMs:-1}},{limits:{unknown:1}},{proof:1}]) {
    await assert.rejects(worker.client.request('reason',{object:source.object,...options,...change}));
  }
  assert.equal(await read(owner,'nodeRepl.write(JSON.stringify(calls))'),0);
  const result=await worker.client.request('reason',{object:source.object,...options});
  for(const maxBytes of [255,65537])await assert.rejects(worker.client.request('explain',{object:result.derived.object,maxBytes}));
  // A separately scoped recipient can inspect the retained run without reason authority.
  const inspector=new ScientificSessionMcpAdapter({cwd});t.after(()=>inspector.close());
  const grant=await owner.client.grant({objects:[result.derived.object],operations:['explain']});
  await inspector.control({operation:'attach',args:{socketPath,sessionId:grant.sessionId,capability:grant.capability}});
  assert.equal((await inspector.client.request('explain',{object:result.derived.object,maxBytes:256})).text,'synthetic raw proof');
});

for(const fault of ['source-invalidation','oversized-report'])test(`failed publication reclaims native reasoning outputs: ${fault}`,async t=>{
  const {owner,worker,source}=await fixture(t);
  await owner.execute(`var originalRun=ws.reasoning.run;ws.reasoning.run=async function(input){var run=await originalRun(input);${fault==='source-invalidation'?"nodeRepl.scientificSession.unpublish(ref);return run;":"return {...run,report:{text:'x'.repeat(128*1024)}};"}};`);
  await assert.rejects(worker.client.request('reason',{object:source.object,...options}));
  const released=await read(owner,"var released=[];for(var h of [lastRun.derived,lastRun.proof]){try{base.results.profile(h);released.push(false)}catch{released.push(true)}}nodeRepl.write(JSON.stringify(released))");
  assert.deepEqual(released,[true,true]);
});

test('bridge composes with the actual workspace reasoning facade using a synthetic host response',async t=>{
  const {setupLinkedScience}=await import('../../../lib/linked-science-runtime.mjs');
  const {createScientificSessionRuntime}=await import('../src/scientific-session-runtime.mjs');
  const facade=await setupLinkedScience({nodeRepl:{},budgets:{maxBytes:2048},reasoning:{
    capabilities:()=>({available:true,defaults:{maxInputBytes:1024,maxOutputBytes:20000},ceilings:{maxInputBytes:1024,maxOutputBytes:20000}}),
    run:async()=>({complete:true,derived:'<urn:a> <urn:q> <urn:b> .',proof:'raw N3 proof '.repeat(500),engine:{name:'synthetic',version:'1'},elapsedMs:1,limits:{}})
  }});
  const ws=facade.open({contextKey:'bridge-facade'});t.after(()=>ws.dispose());
  const runtime=createScientificSessionRuntime({control:()=>{throw Error('Unexpected remote control');}});
  const source=await ws.graphs.load({name:'source',kind:'instance-data',text:'<urn:a> <urn:p> <urn:b> .'});
  const ref=runtime.publish(ws,source),result=await runtime.reason(ref.object,options);
  assert.equal(result.derived.kind,'inferred-graph');assert.equal(result.proof.kind,'evidence');
  assert.equal(result.report.rules.authority,'caller-supplied-premises');
  const proof=await runtime.explain(result.derived.object,{maxBytes:300});
  assert.equal(proof.verified,false);assert.equal(proof.selectedConclusion,false);assert.equal(proof.truncated,true);
  assert.ok(Buffer.byteLength(JSON.stringify(proof))<=300);
  const defaultProof=await runtime.explain(result.derived.object);
  assert.ok(Buffer.byteLength(JSON.stringify(defaultProof))<=2048);
  await assert.rejects(runtime.explain(result.derived.object,{maxBytes:2049}),{code:'LS_REASONING_EXPLANATION_BOUND'});
  const query=await runtime.query(result.derived.object,'SELECT ?o WHERE {<urn:a> <urn:q> ?o}');
  const rows=[];for await(const row of runtime.bindings(query.object))rows.push(row.get('o').value);
  assert.deepEqual(rows,['urn:b']);
  await ws.release(source);
  await assert.rejects(runtime.explain(result.derived.object));
  await assert.rejects(runtime.describe(result.proof.object));
});

test('fresh KernelBroker owner and worker use the pinned host engine and retain results after disconnect',async t=>{
  const dir=await realpath(await mkdtemp(join(tmpdir(),'scoped-reasoning-real-'))),socketPath=join(dir,'s.sock');
  const service=await startScientificSessionService({socketPath,brokerFactory:()=>new KernelBroker({cwd})});
  const owner=new ScientificSessionMcpAdapter({cwd}),worker=new ScientificSessionMcpAdapter({cwd});
  t.after(async()=>{await worker.close();await owner.close();await service.close();await rm(dir,{recursive:true,force:true});});
  const session=await owner.control({operation:'create',args:{socketPath}});
  const capability=await read(owner,"var ws=linkedScience.open({contextKey:'real-scoped-reasoning'});nodeRepl.write(JSON.stringify(ws.reasoning.capabilities()))");
  if(!capability.available){t.skip(`Pinned host engine unavailable: ${capability.code??capability.reason??'not installed'}`);return;}
  const source=await read(owner,"var g=await ws.graphs.load({name:'facts',kind:'instance-data',text:'<urn:a> a <urn:Neuron> . <urn:Neuron> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <urn:Cell> . <urn:Cell> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <urn:Entity> .'});var ref=nodeRepl.scientificSession.publish(ws,g);nodeRepl.write(JSON.stringify(ref))");
  const grant=await owner.client.grant({objects:[source.object],operations:['reason','explain','query','bindings','deposit'],outputSlot:'real-finding'});
  await worker.control({operation:'attach',args:{socketPath,sessionId:session.sessionId,capability:grant.capability}});
  const finding=await read(worker,`var run=await nodeRepl.scientificSession.reason(${JSON.stringify(source.object)},${JSON.stringify({...options,rules:{id:'instance-subclass',version:'1',text:'{?s a ?c. ?c <http://www.w3.org/2000/01/rdf-schema#subClassOf> ?d} => {?s a ?d}.'}})});
    var selected=await nodeRepl.scientificSession.query(run.derived.object,'SELECT ?o WHERE {<urn:a> a ?o} ORDER BY ?o');var values=[];for await(var row of nodeRepl.scientificSession.bindings(selected.object))values.push(row.get('o').value);
    var proof=await nodeRepl.scientificSession.explain(run.derived.object,{maxBytes:512});
    await nodeRepl.scientificSession.deposit('real-finding',{derived:run.derived,proof:run.proof,report:run.report});
    nodeRepl.write(JSON.stringify({values,proof,report:run.report}));`);
  assert.deepEqual(finding.values,['urn:Cell','urn:Entity']);assert.equal(finding.report.complete,true);assert.equal(finding.report.engine.name,'eyeron');
  assert.equal(finding.proof.verified,false);assert.equal(finding.proof.selectedConclusion,false);
  assert.ok(Buffer.byteLength(JSON.stringify(finding.proof))<=512);
  await worker.close();
  const parent=await read(owner,"var saved=await nodeRepl.scientificSession.result('real-finding');var selected=await nodeRepl.scientificSession.query(saved.value.derived.object,'SELECT ?o WHERE {<urn:a> a ?o} ORDER BY ?o');var values=[];for await(var row of nodeRepl.scientificSession.bindings(selected.object))values.push(row.get('o').value);nodeRepl.write(JSON.stringify({values,proof:await nodeRepl.scientificSession.explain(saved.value.derived.object,{maxBytes:512})}))");
  assert.deepEqual(parent.values,['urn:Cell','urn:Entity']);assert.equal(parent.proof.selectedConclusion,false);
  await owner.execute('await ws.release(g)');
  assert.equal(await read(owner,"try{await nodeRepl.scientificSession.result('real-finding');nodeRepl.write('false')}catch{nodeRepl.write('true')}"),true);
});
