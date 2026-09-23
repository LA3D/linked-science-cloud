// Offline scale fixture: no public transport or scientific claims.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { MediatedTraversalBroker } from '../packages/cleanroom-node-repl/src/mediated-traversal.mjs';

const bytes = Number(process.argv[2] ?? 1024 ** 3);
assert.ok(Number.isSafeInteger(bytes) && bytes > 0);
const root = await mkdtemp(join(tmpdir(), 'ls-resource-scale-'));
const owner = {token:'offline-scale-fixture',epoch:1};
const slab=Buffer.alloc(64*1024,19);
let produced=0;
let rssMax=process.memoryUsage().rss;
const rssStart=rssMax;
const expectedHash=createHash('sha256');
const broker=new MediatedTraversalBroker({resourceStorageOptions:{tempRoot:root},fetchImpl:async()=>new Response(new ReadableStream({pull(controller){
  rssMax=Math.max(rssMax,process.memoryUsage().rss);
  if(produced===bytes){controller.close();return;}
  const chunk=slab.subarray(0,Math.min(slab.length,bytes-produced));
  expectedHash.update(chunk);produced+=chunk.length;controller.enqueue(chunk);
}}))});
const started=Date.now();
try{
 const begun=await broker.beginResource({maxBytes:bytes,timeoutMs:300000},owner);
 const resource=await broker.request({traversalId:begun.traversalId,request:{url:'https://synthetic.invalid/scale'}},owner);
 const receipt=broker.finishTraversal({traversalId:begun.traversalId},owner);
 assert.equal(resource.stored.bytes,bytes);
 assert.equal(resource.stored.sha256,expectedHash.digest('hex'));
 assert.equal(receipt.usage.bytes,bytes);
 assert.equal(Buffer.from((await broker.resources.read({storageId:resource.stored.storageId,offset:bytes-1,length:1},owner)).base64,'base64')[0],19);
 const observation={kind:'offline-resource-scale-verification',bytes,sha256:resource.stored.sha256,elapsedMs:Date.now()-started,rssStart,rssMax,rssGrowth:rssMax-rssStart,chunkBytes:slab.length,network:'synthetic-injected-fetch',noWholeBodyIpc:resource.bodyBase64===undefined};
 assert.ok(observation.rssGrowth<128*1024**2,`RSS growth exceeded 128 MiB: ${observation.rssGrowth}`);
 await broker.resources.releaseOwner(owner);
 assert.equal(broker.resources.totalBytes,0);
 console.log(JSON.stringify({...observation,cleanup:true},null,2));
}finally{broker.abortOwner(owner);await broker.resources.releaseOwner(owner);await rm(root,{recursive:true,force:true});}
