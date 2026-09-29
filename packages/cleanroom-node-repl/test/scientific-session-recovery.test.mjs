import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {startScientificSessionService} from '../src/scientific-session-service.mjs';
import {ScientificSessionMcpAdapter} from '../src/scientific-session-mcp.mjs';
import {connectScientificSession} from '../src/scientific-session-client.mjs';
import {KernelBroker,createRequestHandler} from '../src/cleanroom-mcp.mjs';
const cwd=resolve(new URL('../../..',import.meta.url).pathname);
const read=r=>{assert.notEqual(r.isError,true,JSON.stringify(r));return JSON.parse(r.content[0].text);};
const evaluate=(adapter,code)=>adapter.execute(`nodeRepl.write(JSON.stringify(await (${code})))`).then(read);
async function fixture(t,options={}) {
  const root=await realpath(await mkdtemp(join(tmpdir(),'sleep-recovery-'))),socketPath=join(root,'s.sock');
  const brokers=[];
  const brokerFactory=({sessionId})=>{const b=new KernelBroker({cwd,handoffRoot:join(root,'saved',createHash('sha256').update(sessionId).digest('hex'))});brokers.push(b);return b;};
  let service=await startScientificSessionService({socketPath,brokerFactory,...options});
  const adapter=new ScientificSessionMcpAdapter({cwd});
  t.after(async()=>{await adapter.close();await service.close();await rm(root,{recursive:true,force:true});});
  return {adapter,socketPath,brokers,stop:()=>service.close(),restart:async()=>{service=await startScientificSessionService({socketPath,brokerFactory,...options});}};
}

test('attached owner survives idle intervals; grace begins only after disconnect',async t=>{
  const f=await fixture(t,{idleTtlMs:50});
  await f.adapter.sessionCommand({action:'create',socketPath:f.socketPath,sessionId:'sleep'});
  await f.adapter.execute('var preserved=42');
  await delay(180); // Multiple cleanup sweeps: equivalent to a long wall-clock sleep.
  assert.equal(await evaluate(f.adapter,'preserved'),42);
  await f.adapter.sessionCommand({action:'detach'});
  const result=await f.adapter.sessionCommand({action:'reconnect'});
  assert.equal(result.bindings,'preserved');
  await f.adapter.sessionCommand({action:'detach'});
  await delay(160);
  await assert.rejects(f.adapter.sessionCommand({action:'reconnect'}),{code:'UNAUTHORIZED'});
  const recovered=await f.adapter.sessionCommand({action:'recover'});
  assert.equal(recovered.recreated,true);
  assert.equal(recovered.bindings,'lost');
  assert.equal(await evaluate(f.adapter,'typeof preserved'),'undefined');
});

test('same MCP host recovers selected snapshots and computation records after service restart',async t=>{
  const f=await fixture(t);
  const before=await f.adapter.sessionCommand({action:'create',socketPath:f.socketPath,sessionId:'durable-sleep'});
  assert.equal('capability' in before,false);
  await f.adapter.execute("var h=nodeRepl.rlm.handoff;var a=await h.open({label:'selected'});var ref=await h.saveJson(a,{answer:42});var other=await h.open({label:'other'});await h.saveJson(other,{secret:'not selected'});await h.register({name:'done',version:'1'},async()=>({type:'done',value:'finished'}));var computation=await h.start(a,{step:{name:'done',version:'1'}});await h.run(a,computation.id);");
  const selection=await evaluate(f.adapter,"({activityId:a.id,snapshots:[{name:'evidence',ref}]})");
  await f.adapter.sessionCommand({action:'bookmark',selection});
  await f.stop();await f.restart();
  await assert.rejects(f.adapter.execute('throw Error("must not execute")'),{code:'SESSION_RECOVERY_REQUIRED'});
  assert.equal((await f.adapter.sessionCommand({action:'status'})).state,'disconnected');
  await assert.rejects(f.adapter.reset(),{code:'SESSION_RECOVERY_REQUIRED'});
  const recovered=await f.adapter.sessionCommand({action:'recover'});
  assert.equal(recovered.recreated,true);
  assert.notEqual(recovered.instanceId,before.instanceId);
  assert.deepEqual(recovered.selection,selection);
  assert.equal(recovered.interruptedCode,'not-replayed');
  const restored=await f.adapter.sessionCommand({action:'restore'});
  assert.equal(restored.restored,true);
  const observation=read(restored.result);
  assert.deepEqual(observation.loaded,['evidence']);
  assert.equal(observation.pending.total,0);
  assert.equal(observation.computations.items[0].status,'complete');
  assert.deepEqual(await evaluate(f.adapter,`nodeRepl.rlm.handoff.readJson(${restored.binding}.workspace,${restored.binding}.handles.evidence)`),{answer:42});
  assert.equal(await evaluate(f.adapter,`${restored.binding}.workspace.inventory().total`),1);
});

test('lost reply does not repeat execution or silently switch into scratch',async t=>{
  let executions=0,attaches=0;
  const fake={create:async()=>({sessionId:'s',role:'owner',instanceId:'i',epoch:1,capability:'a'.repeat(64)}),status:async()=>({sessionId:'s',instanceId:'i',epoch:1,role:'owner'}),attach:async()=>{attaches++;return {sessionId:'s',instanceId:'i',epoch:1,role:'owner'};},execute:async()=>{executions++;throw Object.assign(new Error('reply lost'),{code:'CONNECTION_CLOSED'});},close(){}};
  const adapter=new ScientificSessionMcpAdapter({cwd,connect:async()=>fake});t.after(()=>adapter.close());
  await adapter.sessionCommand({action:'create',socketPath:'/unused'});
  await assert.rejects(adapter.execute('nonrepeatable()'),e=>e.code==='SESSION_RECOVERY_REQUIRED'&&e.repair.outcome==='unknown');
  await assert.rejects(adapter.execute('nonrepeatable()'),{code:'SESSION_RECOVERY_REQUIRED'});
  assert.equal(adapter.scratch.child,null);
  assert.equal(executions,1);
  const recovered=await adapter.sessionCommand({action:'reconnect'});
  assert.equal(recovered.bindings,'preserved');assert.equal(executions,1);assert.equal(attaches,1);
  assert.equal(recovered.lastFailure.outcome,'unknown');
});

test('kernel loss is explicit and recovery never preserves old worker grants',async t=>{
  const f=await fixture(t);
  await f.adapter.sessionCommand({action:'create',socketPath:f.socketPath,sessionId:'kernel-loss'});
  const grant=await evaluate(f.adapter,"nodeRepl.scientificSession.grant({objects:[],operations:['describe'],ttlMs:10000})");
  const worker=await connectScientificSession({socketPath:f.socketPath});t.after(()=>worker.close());
  await worker.attach({sessionId:'kernel-loss',capability:grant.capability});
  f.adapter.restoreBinding='obsolete_binding';
  await f.brokers[0]._terminate();
  await assert.rejects(f.adapter.execute('var unintended=1'),{code:'SESSION_KERNEL_LOST'});
  assert.equal(f.adapter.restoreBinding,null);
  const recovered=await f.adapter.sessionCommand({action:'recover'});
  assert.equal(recovered.bindings,'lost');
  assert.equal(recovered.workerGrants,'not-restored');
  assert.equal(await evaluate(f.adapter,'typeof unintended'),'undefined');
  await assert.rejects(worker.request('describe',{object:'anything'}),{code:'GRANT_EXPIRED'});
});

test('expired workers cannot recreate sessions and former owners cannot replace an occupied ID',async t=>{
  const f=await fixture(t);
  await f.adapter.sessionCommand({action:'create',socketPath:f.socketPath,sessionId:'occupied'});
  const grant=await evaluate(f.adapter,"nodeRepl.scientificSession.grant({objects:[],operations:['describe'],ttlMs:20})");
  const worker=new ScientificSessionMcpAdapter({cwd});t.after(()=>worker.close());
  await worker.sessionCommand({action:'attach',socketPath:f.socketPath,sessionId:'occupied',capability:grant.capability});
  await delay(30);
  await assert.rejects(worker.sessionCommand({action:'recover'}),{code:'FORBIDDEN'});
  await assert.rejects(worker.sessionCommand({action:'reconnect'}),{code:'UNAUTHORIZED'});
  await f.stop();await f.restart();
  const replacement=await connectScientificSession({socketPath:f.socketPath});t.after(()=>replacement.close());
  const newOwner=await replacement.create({sessionId:'occupied'});
  await assert.rejects(f.adapter.sessionCommand({action:'recover'}),{code:'SESSION_EXISTS'});
  assert.equal((await replacement.status()).instanceId,newOwner.instanceId);
});

test('MCP session controls work without a kernel and reject mixed code and malformed bookmarks',async t=>{
  const f=await fixture(t);const handler=createRequestHandler({broker:f.adapter});
  const call=arguments_=>handler({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'js',arguments:arguments_}});
  assert.equal(read((await call({code:'',session:{action:'status'}})).result).state,'scratch');
  assert.equal(f.adapter.scratch.child,null);
  for(const args of [{code:'',session:{action:'__proto__'}},{code:'execute()',session:{action:'detach'}},{code:'',session:{action:'recover',capability:'injected'}},{code:'',session:{action:'bookmark',selection:{activityId:'a',snapshots:[{name:'x',ref:{id:'r',version:'bad'}}]}}}]) {
    assert.equal(JSON.parse((await call(args)).result.content[0].text).error.code,'INVALID_ARGUMENT');
  }
  const created=read((await call({code:'',session:{action:'create',socketPath:f.socketPath,sessionId:'rpc'}})).result);
  assert.equal(created.state,'attached');assert.equal(JSON.stringify(created).includes('capability'),false);
  const small=(await call({code:'',session:{action:'status'},max_output_bytes:256})).result;
  assert.ok(Buffer.byteLength(small.content[0].text)<=256);
  assert.equal(read(small).outputOmitted,true);
});


test('kernel epoch change fences the next evaluation and idle grace does not extend worker TTL',async t=>{
  const f=await fixture(t);
  await f.adapter.sessionCommand({action:'create',socketPath:f.socketPath,sessionId:'epochs'});
  await assert.rejects(evaluate(f.adapter,"nodeRepl.scientificSession.grant({objects:[],operations:['describe'],ttlMs:86400000})"),{code:'INVALID_ARGUMENT'});
  f.adapter.restoreBinding='obsolete_binding';
  await f.brokers[0].reset();
  await assert.rejects(f.adapter.execute('var shouldNotRun=1'),{code:'SESSION_EPOCH_CHANGED'});
  assert.equal(await evaluate(f.adapter,'typeof shouldNotRun'),'undefined');
  const state=await f.adapter.sessionCommand({action:'status'});
  assert.equal(state.lastFailure.code,'SESSION_EPOCH_CHANGED');
  assert.equal(state.restoreBinding,null);
  f.adapter.restoreBinding='obsolete_after_reset';
  await f.adapter.reset();
  assert.equal((await f.adapter.sessionCommand({action:'status'})).restoreBinding,null);
});
