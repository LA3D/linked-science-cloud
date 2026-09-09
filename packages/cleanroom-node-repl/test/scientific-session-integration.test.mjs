import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { mkdtemp, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { startScientificSessionService } from '../src/scientific-session-service.mjs';
import { connectScientificSession } from '../src/scientific-session-client.mjs';
import { ScientificSessionMcpAdapter } from '../src/scientific-session-mcp.mjs';
import { KernelBroker,createRequestHandler } from '../src/cleanroom-mcp.mjs';
const cwd=resolve(new URL('../../..',import.meta.url).pathname);
const extract=r=>{assert.notEqual(r.isError,true,JSON.stringify(r));return JSON.parse(r.content[0].text);};
const rpc=(id,code)=>({jsonrpc:'2.0',id,method:'tools/call',params:{name:'js',arguments:{code}}});

test('independent MCP adapters share native scientific objects and survive detach',async t=>{
  const dir=await realpath(await mkdtemp(join(tmpdir(),'science-session-')));
  const socketPath=join(dir,'service.sock');
  const service=await startScientificSessionService({socketPath,brokerFactory:()=>new KernelBroker({cwd}),idleTtlMs:120000});
  const owner=new ScientificSessionMcpAdapter({cwd}),worker=new ScientificSessionMcpAdapter({cwd});
  let reconnect;
  t.after(async()=>{await worker.close();await owner.close();if(reconnect)await reconnect.close();await service.close();await rm(dir,{recursive:true,force:true});});
  const ownerMcp=createRequestHandler({broker:owner}),workerMcp=createRequestHandler({broker:worker});
  const created=extract((await ownerMcp(rpc(1,`nodeRepl.write(JSON.stringify(await nodeRepl.scientificSession.create(${JSON.stringify({socketPath,sessionId:'integration-session'})})))`))).result);
  assert.equal(created.role,'owner');
  const graph=extract((await ownerMcp(rpc(2,`var ws=linkedScience.open({contextKey:'shared-data'});var g=await ws.graphs.load({name:'ontology',kind:'ontology',text:'<urn:a> <http://www.w3.org/2000/01/rdf-schema#label> "bonjour"@fr . <urn:a> <urn:value> 7 .'});var shared=nodeRepl.scientificSession.publish(ws,g);nodeRepl.write(JSON.stringify(shared));`))).result);
  const grant=extract((await ownerMcp(rpc(3,`nodeRepl.write(JSON.stringify(await nodeRepl.scientificSession.grant(${JSON.stringify({objects:[graph.object],operations:['describe','match','query','bindings','deposit','result'],outputSlot:'finding',ttlMs:60000})})))`))).result);
  extract((await workerMcp(rpc(4,`nodeRepl.write(JSON.stringify(await nodeRepl.scientificSession.attach(${JSON.stringify({socketPath,sessionId:created.sessionId,capability:grant.capability})})))`))).result);
  const observed=extract((await workerMcp(rpc(5,`var qs=[];for await(var q of nodeRepl.scientificSession.source(${JSON.stringify(graph.object)}).match())qs.push(q);nodeRepl.write(JSON.stringify({count:qs.length,language:qs.find(q=>q.object.language).object.language,parentVariable:typeof ws}));`))).result);
  assert.deepEqual(observed,{count:2,language:'fr',parentVariable:'undefined'});
  const selected=extract((await workerMcp(rpc(6,`var answer=await nodeRepl.scientificSession.query(${JSON.stringify(graph.object)},'SELECT ?o WHERE { <urn:a> <urn:value> ?o }');var rows=[];for await(var row of nodeRepl.scientificSession.bindings(answer.object))rows.push(row.get('o').value);nodeRepl.write(JSON.stringify({rows}));`))).result);
  assert.deepEqual(selected.rows,['7']);
  extract((await workerMcp(rpc(7,`nodeRepl.write(JSON.stringify(await nodeRepl.scientificSession.deposit('finding',{count:qs.length})))`))).result);
  await worker.close();
  const aggregated=extract((await ownerMcp(rpc(8,`var finding=await nodeRepl.scientificSession.result('finding');nodeRepl.write(JSON.stringify({nativeCount:await ws.rdf.source(g).countQuads(),finding:finding.value}));`))).result);
  assert.deepEqual(aggregated,{nativeCount:2,finding:{count:2}});
  await owner.close();
  reconnect=await connectScientificSession({socketPath});await reconnect.attach({sessionId:created.sessionId,capability:created.capability});
  assert.equal(extract(await reconnect.execute('nodeRepl.write(JSON.stringify(await ws.rdf.source(g).countQuads()))')),2);
  await reconnect.closeSession();
});

test('worker grants cannot read other objects, widen query sources, replay deposits or survive owner reset',async t=>{
  const dir=await realpath(await mkdtemp(join(tmpdir(),'science-scope-'))),socketPath=join(dir,'service.sock');
  const service=await startScientificSessionService({socketPath,brokerFactory:()=>new KernelBroker({cwd})});
  const owner=await connectScientificSession({socketPath}),worker=await connectScientificSession({socketPath});
  t.after(async()=>{await worker.close();await owner.close();await service.close();await rm(dir,{recursive:true,force:true});});
  const created=await owner.create();
  const ref=extract(await owner.execute(`var ws=linkedScience.open({contextKey:'scope-data'});var g=await ws.graphs.load({name:'graph',kind:'ontology',text:'<urn:a> <urn:b> <urn:c> .'});nodeRepl.write(JSON.stringify(nodeRepl.scientificSession.publish(ws,g)));`));
  const grant=await owner.grant({objects:[ref.object],operations:['describe','query','deposit','result'],outputSlot:'slot',ttlMs:60000});
  await worker.attach({sessionId:created.sessionId,capability:grant.capability});
  await assert.rejects(worker.execute('1'),{code:'FORBIDDEN'});
  await assert.rejects(worker.reset(),{code:'FORBIDDEN'});
  await assert.rejects(worker.request('describe',{object:'different'}),{code:'FORBIDDEN'});
  await assert.rejects(worker.request('query',{object:ref.object,sparql:'SELECT * WHERE { SERVICE <https://example.invalid> { ?s ?p ?o } }'}),{code:'FORBIDDEN'});
  await assert.rejects(worker.request('deposit',{slot:'wrong',value:{}}),{code:'FORBIDDEN'});
  await worker.request('deposit',{slot:'slot',value:{ok:true}});
  await assert.rejects(worker.request('deposit',{slot:'slot',value:{ok:true}}));
  await owner.reset();
  await assert.rejects(worker.request('describe',{object:ref.object}),{code:'GRANT_EXPIRED'});
});

test('paged graph and binding access preserves RDF terms and rejects released source dependencies',async t=>{
  const dir=await realpath(await mkdtemp(join(tmpdir(),'science-pages-'))),socketPath=join(dir,'service.sock');
  const service=await startScientificSessionService({socketPath,brokerFactory:()=>new KernelBroker({cwd})});
  const owner=await connectScientificSession({socketPath});
  const worker=new ScientificSessionMcpAdapter({cwd});
  t.after(async()=>{await worker.close();await owner.close();await service.close();await rm(dir,{recursive:true,force:true});});
  const created=await owner.create();
  const ref=extract(await owner.execute(`var ws=linkedScience.open({contextKey:'paged-data'});var f=ws.rdf.DataFactory;var quads=Array.from({length:70},(_,i)=>f.quad(f.blankNode('item'+i),f.namedNode('urn:value'),f.literal(String(i),f.namedNode('http://www.w3.org/2001/XMLSchema#integer')),f.namedNode('urn:graph')));var g=await ws.rdf.retain({name:'paged',quads});nodeRepl.write(JSON.stringify(nodeRepl.scientificSession.publish(ws,g)));`));
  const grant=await owner.grant({objects:[ref.object],operations:['match','query','bindings','deposit'],outputSlot:'page-result',ttlMs:60000});
  extract(await worker.execute(`nodeRepl.write(JSON.stringify(await nodeRepl.scientificSession.attach(${JSON.stringify({socketPath,sessionId:created.sessionId,capability:grant.capability})})))`));
  const observed=extract(await worker.execute(`var count=0;var terms=true;for await(var q of nodeRepl.scientificSession.source(${JSON.stringify(ref.object)}).match()){count++;terms&&=q.subject.termType==='BlankNode'&&q.graph.value==='urn:graph'&&q.object.datatype.value==='http://www.w3.org/2001/XMLSchema#integer';}var result=await nodeRepl.scientificSession.query(${JSON.stringify(ref.object)},'SELECT ?value WHERE { GRAPH <urn:graph> { ?s <urn:value> ?value } }');var values=[];for await(var row of nodeRepl.scientificSession.bindings(result.object))values.push(Number(row.get('value').value));nodeRepl.write(JSON.stringify({count,terms,rows:values.length,sum:values.reduce((a,b)=>a+b,0)}));`));
  assert.deepEqual(observed,{count:70,terms:true,rows:70,sum:2415});
  await owner.execute('await ws.release(g)');
  assert.equal(extract(await owner.execute(`nodeRepl.write(JSON.stringify(nodeRepl.scientificSession.unpublish(${JSON.stringify(ref.object)})))`)).status,'unpublished');
  await assert.rejects(worker.execute("for await(var row of nodeRepl.scientificSession.bindings(result.object)){}"));
  await assert.rejects(worker.execute("await nodeRepl.scientificSession.deposit('page-result',{count:70})"));
});

test('adapter close rejects late attachment and cannot restart a scratch kernel',async()=>{
  let finishConnect,closes=0;
  const adapter=new ScientificSessionMcpAdapter({cwd,connect:()=>new Promise(done=>{finishConnect=done;})});
  const attaching=adapter.control({operation:'create',args:{socketPath:'/unused'}});
  const rejected=assert.rejects(attaching,{code:'SESSION_ADAPTER_CLOSED'});
  await assert.rejects(adapter.control({operation:'create'}),{code:'SESSION_ALREADY_ATTACHED'});
  await adapter.close();
  finishConnect({close(){closes++;},create(){throw Error('must not authenticate after closure');}});
  await rejected;
  assert.equal(closes,1);
  await assert.rejects(adapter.reset(),{code:'SESSION_ADAPTER_CLOSED'});
  await assert.rejects(adapter.addModuleDir('/unused'),{code:'SESSION_ADAPTER_CLOSED'});
  assert.equal(adapter.scratch.child,null);
});


test('standalone launcher owns a session independently of client lifetime',async t=>{
  const dir=await realpath(await mkdtemp(join(tmpdir(),'science-launch-'))),socketPath=join(dir,'service.sock');
  const child=spawn(process.execPath,[resolve(cwd,'packages/cleanroom-node-repl/src/scientific-session-server.mjs'),socketPath],{stdio:['ignore','pipe','pipe']});
  let client;
  const exit=once(child,'exit');
  t.after(async()=>{client?.close();child.kill('SIGTERM');await exit;await rm(dir,{recursive:true,force:true});});
  const lines=createInterface({input:child.stdout});
  let timer;
  try {
    const ready=await Promise.race([once(lines,'line'),exit.then(()=>{throw Error('Launcher exited before readiness');}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Launcher readiness timed out')),5000);})]);
    assert.equal(JSON.parse(ready[0]).status,'ready');
  }finally{clearTimeout(timer);lines.close();}
  client=await connectScientificSession({socketPath});
  const session=await client.create();
  await client.execute('var launcherState=17');client.close();
  client=await connectScientificSession({socketPath});
  await client.attach({sessionId:session.sessionId,capability:session.capability});
  assert.equal(extract(await client.execute('nodeRepl.write(JSON.stringify(launcherState))')),17);
});
