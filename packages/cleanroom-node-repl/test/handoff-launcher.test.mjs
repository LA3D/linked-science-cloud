import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connectScientificSession } from '../src/scientific-session-client.mjs';

async function query(client,expression) {
 const result=await client.execute(`nodeRepl.write(JSON.stringify(await (${expression})))`);
 return JSON.parse(result.content[0].text);
}
test('opt-in service launcher recovers a selected named session and isolates sibling durable stores',async t=>{
 const root=await mkdtemp(join(tmpdir(),'h-launch-')),socket=join(root,'s.sock'),durable=join(root,'durable');
 const children=[],clients=[];
 t.after(async()=>{
   for(const client of clients)client.close();
   for(const child of children)if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited;}
   await rm(root,{recursive:true,force:true});
 });
 async function launch() {
   const child=spawn(process.execPath,[new URL('../src/scientific-session-server.mjs',import.meta.url).pathname,socket,'--handoff-root',durable],{stdio:['ignore','pipe','pipe']});children.push(child);
   let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk;});
   const lines=createInterface({input:child.stdout});
   const ready=await Promise.race([once(lines,'line').then(([line])=>JSON.parse(line)),once(child,'exit').then(()=>{throw Error(stderr);})]);
   lines.close();assert.equal(ready.status,'ready');return child;
 }
 let server=await launch();
 const owner=await connectScientificSession({socketPath:socket});clients.push(owner);await owner.create({sessionId:'saved-session'});
 const capabilities=await query(owner,'nodeRepl.rlm.handoff.capabilities()');assert.equal(capabilities.available,true);
 await owner.execute("var h=nodeRepl.rlm.handoff,a=await h.open({label:'launcher-recovery'});await h.saveJson(a,{count:42});");
 const other=await connectScientificSession({socketPath:socket});clients.push(other);await other.create({sessionId:'other-session'});
 assert.equal((await query(other,'nodeRepl.rlm.handoff.activities()')).total,0);
 owner.close();other.close();const exited=once(server,'exit');server.kill('SIGTERM');await exited;
 server=await launch();
 const recovered=await connectScientificSession({socketPath:socket});clients.push(recovered);await recovered.create({sessionId:'saved-session'});
 await recovered.execute("var h=nodeRepl.rlm.handoff,a=await h.open({id:(await h.activities()).items[0].id});var ref=(await h.map(a)).items[0].ref;var ws=linkedScience.open({contextKey:'launcher-recovery'}),j=await h.load(a,ref,ws);");
 assert.deepEqual(await query(recovered,'h.readJson(ws,j)'),{count:42});
 assert.equal((await query(recovered,'h.pending(a)')).total,0);
 const fresh=await connectScientificSession({socketPath:socket});clients.push(fresh);await fresh.create({sessionId:'fresh-session'});
 assert.equal((await query(fresh,'nodeRepl.rlm.handoff.activities()')).total,0);
});
