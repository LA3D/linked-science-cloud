import test from 'node:test';
import assert from 'node:assert/strict';
import { DepthOneGate } from '../scripts/experiments/depth-one-gate.mjs';
test('registered identity enforces depth, forgery rejection, independent total and concurrency limits', () => {
 const g=new DepthOneGate(); const root=g.rootIdentity();
 const leaf=g.acquire(root); assert.equal(leaf.depth,1);
 assert.throws(()=>g.acquire(leaf.identity),{code:'DEPTH_LIMIT'});
 for(const forged of [{depth:0},{depth:1},{parentId:'root'},{depth:0,parentId:'root'}]) assert.throws(()=>g.acquire(leaf.identity,forged),{code:'CALLER_IDENTITY_OVERRIDE'});
 assert.throws(()=>g.acquire('root'),{code:'UNKNOWN_PARENT'});
 assert.throws(()=>g.acquire(root),{code:'CONCURRENCY_LIMIT'});
 leaf.release(); leaf.release(); assert.equal(g.active,0);
 assert.throws(()=>g.acquire(root),{code:'TOTAL_CALL_LIMIT'});
 assert.equal(g.total,1);
});

test('existing broker timeout rejects waiting but does not cancel the provider', async () => {
 const { KernelBroker }=await import('../packages/cleanroom-node-repl/src/cleanroom-mcp.mjs');
 let providerCompleted=false;
 const broker=new KernelBroker({provider:async()=>{await new Promise(r=>setTimeout(r,180));providerCompleted=true;return 'late';}});
 try {
  await assert.rejects(broker._recursiveQuery({prompt:'fixture',context:'fixture',options:{depth:1,timeoutMs:100}}),{code:'RLM_TIMEOUT'});
  assert.equal(providerCompleted,false);
  await new Promise(r=>setTimeout(r,120));
  assert.equal(providerCompleted,true);
 } finally {await broker.close();}
});
