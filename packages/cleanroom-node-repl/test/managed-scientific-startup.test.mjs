import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, chmod, rm, lstat, writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { managedConfiguration, ensureManagedService, withPrivateLock, chatKey } from '../src/managed-scientific-startup.mjs';
import { startManagedMcp } from '../src/managed-scientific-mcp.mjs';
import { connectScientificSession } from '../src/scientific-session-client.mjs';
import { startScientificSessionService } from '../src/scientific-session-service.mjs';
import { createRequestHandler } from '../src/cleanroom-mcp.mjs';

async function fixture(t) {
  const root = await mkdtemp('/private/tmp/ls-managed-test-'); await chmod(root, 0o700);
  const config = await managedConfiguration({ socketPath: join(root, 'session.sock'), handoffRoot: join(root, 'handoff'), connectionRoot: join(root, 'connections') });
  const adapters = [];
  t.after(async () => {
    for (const adapter of adapters) await adapter.close();
    let client;
    try { client = await connectScientificSession({socketPath:config.socketPath,requestTimeoutMs:300}); const info = await client.serviceInfo(); if(info.pid)process.kill(info.pid,'SIGTERM'); } catch {} finally { client?.close(); }
    for(let i=0;i<50;i++){try{await lstat(config.socketPath);await delay(20)}catch{break}}
    await rm(root,{recursive:true,force:true});
  });
  return { root, config, adapters, async adapter(){const a=await startManagedMcp(config);adapters.push(a);return a} };
}
const call=(handler,name,args,threadId)=>handler({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args,_meta:{threadId}}});
const output=result=>result.result.content.map(c=>c.text??'').join('');

test('cold startup, concurrent reuse, chat isolation, private reconnect and reset', async t => {
  const f=await fixture(t);const [a,b]=await Promise.all([f.adapter(),f.adapter()]);
  const thread=randomUUID(), other=randomUUID();const ah=createRequestHandler({broker:a}),bh=createRequestHandler({broker:b});
  assert.equal((await lstat(f.config.socketPath)).mode & 0o777,0o600);
  assert.match(output(await call(ah,'js',{code:'var retained=41;nodeRepl.write(retained)'},thread)),/41/);
  assert.match(output(await call(bh,'js',{code:'nodeRepl.write(typeof retained)'},other)),/undefined/);
  assert.notEqual(a.resume.sessionId,b.resume.sessionId);await a.close();
  const reconnect=await f.adapter();const rh=createRequestHandler({broker:reconnect});
  assert.match(output(await call(rh,'js',{code:'nodeRepl.write(++retained)'},thread)),/42/);
  const path=join(f.config.connectionRoot,`${chatKey(thread)}.json`);assert.equal((await lstat(path)).mode & 0o777,0o600);
  const status=output(await call(rh,'js',{code:'',session:{action:'status'}},thread));assert.ok(!status.includes(JSON.parse(await readFile(path,'utf8')).capability));
  assert.equal((await call(rh,'js',{code:'nodeRepl.write(1)'},other)).result.isError,true);
  await call(rh,'js_reset',{},thread);await reconnect.close();const afterReset=await f.adapter();
  assert.match(output(await call(createRequestHandler({broker:afterReset}),'js',{code:'nodeRepl.write(typeof retained)'},thread)),/undefined/);
  const missing=await f.adapter();assert.match(output(await call(createRequestHandler({broker:missing}),'js',{code:'throw new Error("must not execute")'},undefined)),/CHAT_IDENTITY_REQUIRED/);
});
test('same chat simultaneous attachment creates one session',async t=>{
  const f=await fixture(t);const [a,b]=await Promise.all([f.adapter(),f.adapter()]);const thread=randomUUID();
  await Promise.all([a.prepare({threadId:thread}),b.prepare({threadId:thread})]);assert.equal(a.resume.instanceId,b.resume.instanceId);assert.equal(a.resume.capability,b.resume.capability);assert.ok(!JSON.stringify(a.metadata()).includes(a.resume.capability));
});
test('occupied files, incompatible services and abandoned locks fail without replacement',async t=>{
  const f=await fixture(t);await writeFile(f.config.socketPath,'occupied');await assert.rejects(ensureManagedService(f.config),{code:'OCCUPIED_SOCKET'});assert.equal(await readFile(f.config.socketPath,'utf8'),'occupied');await rm(f.config.socketPath);
  const incompatible=await startScientificSessionService({socketPath:f.config.socketPath});try{await assert.rejects(ensureManagedService(f.config),{code:'INCOMPATIBLE_SERVICE'});assert.ok((await lstat(f.config.socketPath)).isSocket())}finally{await incompatible.close()}
  await mkdir(join(f.root,'startup.lock'),{mode:0o700});await assert.rejects(withPrivateLock(f.root,'startup.lock',()=>assert.fail(),{timeoutMs:80}),{code:'STARTUP_LOCK_TIMEOUT'});
});
test('runtime mismatch leaves service and scientific bindings intact',async t=>{
  const f=await fixture(t);const a=await f.adapter();await a.prepare({threadId:randomUUID()});await a.execute('var alive=7');await assert.rejects(ensureManagedService({...f.config,fingerprint:'different'}),{code:'INCOMPATIBLE_SERVICE'});assert.match((await a.execute('nodeRepl.write(alive)')).content[0].text,/7/);
});
test('worker grant preserves scratch namespace and cannot reset owner',async t=>{
  const f=await fixture(t);const a=await f.adapter();await a.prepare({threadId:randomUUID()});await a.execute('var ownerOnly=7');const grant=await a.control({operation:'grant',args:{objects:[],operations:['deposit'],outputSlot:'worker'}});
  const worker=await f.adapter();const thread=randomUUID();const h=createRequestHandler({broker:worker});const attached=await call(h,'js',{code:'',session:{action:'attach',socketPath:f.config.socketPath,sessionId:grant.sessionId,capability:grant.capability}},thread);
  assert.match(output(attached),/worker/);assert.equal(worker.role,'worker');assert.match(output(await call(h,'js',{code:'nodeRepl.write(typeof ownerOnly)'},thread)),/undefined/);await call(h,'js_reset',{},thread);assert.match((await a.execute('nodeRepl.write(ownerOnly)')).content[0].text,/7/);
});
test('stdio contains only MCP JSON; service and binding survive adapter EOF',async t=>{
  const f=await fixture(t);const child=spawn(process.execPath,[new URL('../src/managed-scientific-mcp.mjs',import.meta.url).pathname,JSON.stringify(f.config)],{stdio:['pipe','pipe','pipe']});t.after(()=>child.kill());let stderr='';child.stderr.on('data',c=>stderr+=c);
  const pending=new Map();const lines=[];createInterface({input:child.stdout}).on('line',s=>{lines.push(s);const r=JSON.parse(s);pending.get(r.id)?.(r)});
  let id=0;const request=(method,params)=>new Promise((done,reject)=>{const key=++id;const timer=setTimeout(()=>reject(new Error('stdio timed out '+stderr)),9000);pending.set(key,r=>{clearTimeout(timer);done(r)});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:key,method,params})+'\n')});
  const initialized=await request('initialize',{protocolVersion:'2024-11-05'});assert.ok(initialized.result.serverInfo);const thread=randomUUID();const r=await request('tools/call',{name:'js',arguments:{code:'var stdioBinding=9;nodeRepl.write(stdioBinding)'},_meta:{threadId:thread}});assert.match(r.result.content[0].text,/9/);
  child.stdin.end();await new Promise(done=>child.once('exit',done));assert.equal(stderr,'');assert.equal(lines.length,2);const a=await f.adapter();await a.prepare({threadId:thread});assert.match((await a.execute('nodeRepl.write(stdioBinding)')).content[0].text,/9/);
});

test('service loss requires explicit recovery and selected durable restore',async t=>{
  const f=await fixture(t);const thread=randomUUID();const a=await f.adapter();await a.prepare({threadId:thread});
  await a.execute("var h=nodeRepl.rlm.handoff;var activity=await h.open({label:'managed'});var snapshot=await h.saveJson(activity,{answer:42});nodeRepl.write(JSON.stringify({activityId:activity.id,snapshots:[{name:'evidence',ref:snapshot}]}))").then(r=>{assert.ok(!r.isError);f.selection=JSON.parse(r.content[0].text)});
  await a.close();const c=await connectScientificSession({socketPath:f.config.socketPath});const info=await c.serviceInfo();c.close();process.kill(info.pid,'SIGTERM');
  for(let i=0;i<100;i++){try{await lstat(f.config.socketPath);await delay(20)}catch{break}}
  const b=await f.adapter();await assert.rejects(b.prepare({threadId:thread}),{code:'SESSION_RECOVERY_REQUIRED'});
  await assert.rejects(b.execute('throw Error("must not execute")'),{code:'SESSION_RECOVERY_REQUIRED'});
  const recovered=await b.sessionCommand({action:'recover'});assert.equal(recovered.recreated,true);assert.equal(recovered.bindings,'lost');
  await b.sessionCommand({action:'bookmark',selection:f.selection});const restored=await b.sessionCommand({action:'restore'});assert.equal(restored.restored,true);
  assert.match((await b.execute(`nodeRepl.write(nodeRepl.rlm.handoff.readJson(${restored.binding}.workspace,${restored.binding}.handles.evidence))`)).content[0].text,/42/);
});
