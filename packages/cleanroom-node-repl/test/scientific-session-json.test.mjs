import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,realpath,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {KernelBroker} from '../src/cleanroom-mcp.mjs';
import {startScientificSessionService} from '../src/scientific-session-service.mjs';
import {ScientificSessionMcpAdapter} from '../src/scientific-session-mcp.mjs';
const cwd=resolve(new URL('../../..',import.meta.url).pathname);
const read=async(c,code)=>{const r=await c.execute(code);assert.notEqual(r.isError,true);return JSON.parse(r.content[0].text);};
async function fixture(t){
 const dir=await realpath(await mkdtemp(join(tmpdir(),'session-json-'))),socketPath=join(dir,'s.sock');
 const service=await startScientificSessionService({socketPath,brokerFactory:()=>new KernelBroker({cwd})});
 const owner=new ScientificSessionMcpAdapter({cwd}),worker=new ScientificSessionMcpAdapter({cwd});
 t.after(async()=>{await worker.close();await owner.close();await service.close();await rm(dir,{recursive:true,force:true});});
 const session=await owner.control({operation:'create',args:{socketPath}});
 return {owner,worker,session,socketPath};
}
test('JSON snapshots preserve nested types, constrain paths and reject reads/deposits after release',async t=>{
 const {owner,worker,session,socketPath}=await fixture(t);
 const ref=await read(owner,`var ws=linkedScience.open({contextKey:'json-input'});var original={allowed:[null,true,3,{text:'value'}],secret:'hidden'};var ref=nodeRepl.scientificSession.publishJson(ws,original);original.allowed[2]=99;nodeRepl.write(JSON.stringify(ref));`);
 const grant=await owner.client.grant({objects:[ref.object],operations:['jsonRead','deposit'],jsonPaths:{[ref.object]:[['allowed']]},outputSlot:'finding'});
 await worker.control({operation:'attach',args:{socketPath,sessionId:session.sessionId,capability:grant.capability}});
 const input=await read(worker,`var ref=${JSON.stringify(ref)};var input=await nodeRepl.scientificSession.readJson(ref.object,{path:['allowed'],offset:1,limit:3});nodeRepl.write(JSON.stringify(input));`);
 assert.deepEqual(input.value,[true,3,{text:'value'}]);assert.equal(input.complete,true);assert.equal(input.version,1);
 await assert.rejects(worker.client.request('jsonRead',{object:ref.object,path:[],version:1}),{code:'FORBIDDEN'});
 await assert.rejects(worker.client.request('jsonRead',{object:ref.object,path:['secret'],version:1}),{code:'FORBIDDEN'});
 await assert.rejects(worker.client.request('jsonRead',{object:ref.object,path:['allowed'],version:2}),{code:'INVALID_ARGUMENT'});
 const absent=await read(owner,`try{await nodeRepl.scientificSession.readJson(ref.object,{path:['toString']});nodeRepl.write(JSON.stringify({denied:false}));}catch(e){nodeRepl.write(JSON.stringify({denied:true,code:e.code}));}`);
 assert.equal(absent.code,'SESSION_JSON_PATH');
 await owner.execute('nodeRepl.scientificSession.unpublish(ref)');
 await assert.rejects(worker.execute("await nodeRepl.scientificSession.readJson(ref.object,{path:['allowed']})"));
 await assert.rejects(worker.execute("await nodeRepl.scientificSession.deposit('finding',{ok:true})"));
});
test('JSON input rejects lossy types, accessors, cycles, capacity overflow and disposed workspaces',async t=>{
 const {owner}=await fixture(t);
 const outcomes=await read(owner,`var ws=linkedScience.open({contextKey:'json-validation'});var cycle={};cycle.self=cycle;var getterCalls=0;var getter={get value(){getterCalls++;return 1;}};var errors=[];for(var value of [undefined,NaN,1n,new Date(),cycle,getter,[,1],{x:()=>1},'a'.repeat(2*1024*1024),{['k'.repeat(2*1024*1024+1)]:1}]){try{nodeRepl.scientificSession.publishJson(ws,value);errors.push(null);}catch(e){errors.push(e.code);}}var ref=nodeRepl.scientificSession.publishJson(ws,{value:null});await ws.dispose();var disposed;try{await nodeRepl.scientificSession.readJson(ref.object);disposed=false;}catch{disposed=true;}nodeRepl.write(JSON.stringify({errors,getterCalls,disposed}));`);
 assert.equal(outcomes.errors.length,10);assert.ok(outcomes.errors.every(Boolean));assert.equal(outcomes.getterCalls,0);assert.equal(outcomes.disposed,true);
});

test('shared-reference expansion is bounded while copying, before snapshot materialization',async t=>{
 const {owner}=await fixture(t);
 const result=await read(owner,`var ws=linkedScience.open({contextKey:'json-expansion'});var tree={leaf:1};for(var i=0;i<25;i++)tree={left:tree,right:tree};var code;try{nodeRepl.scientificSession.publishJson(ws,tree);}catch(e){code=e.code;}nodeRepl.write(JSON.stringify({code,stillUsable:nodeRepl.scientificSession.publishJson(ws,{ok:true}).kind}));`);
 assert.deepEqual(result,{code:'SESSION_JSON_CAPACITY',stillUsable:'json'});
});
