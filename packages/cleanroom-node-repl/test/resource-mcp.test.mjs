import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequestHandler, KernelBroker } from '../src/cleanroom-mcp.mjs';

const cwd = fileURLToPath(new URL('../../..', import.meta.url));
test('whole-resource admission preserves heap headroom below the 100MB ceiling', async t => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'resource-heap-')));
  const chunk = Buffer.alloc(64 * 1024, 32);
  const broker = new KernelBroker({ cwd, maxOldSpaceMb: 256, traversalOptions: {
    resourceStorageOptions: { tempRoot: root, reserveBytes: 0 },
    fetchImpl: async () => {
      let n = 0;
      return new Response(new ReadableStream({ pull(c) { if (n++ < 160) c.enqueue(chunk); else c.close(); } }));
    },
  } });
  t.after(async () => { await broker.close(); await rm(root, { recursive: true, force: true }); });
  const handle = createRequestHandler({ broker });
  const response = await handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'js', arguments: {
    timeout_ms: 120000,
    code: `var ws=linkedScience.open({contextKey:'heap-resource'}); var r=await ws.resources.get('https://example.test/ontology',{storage:'disk',maxBytes:11000000}); var before=ws.inventory(); var failure; try { await r.rdf({name:'heap-ontology',format:'application/rdf+xml'}); } catch(e) { failure=e.code; } nodeRepl.write({failure, bytes:(await r.inspect()).bytes, ceiling:linkedScience.capabilities().budgets.maxResidentResourceBytes, unchanged:JSON.stringify(before)===JSON.stringify(ws.inventory())}); await ws.dispose();`,
  } } });
  const output = response.result.content.find(x => x.type === 'text')?.text;
  assert.equal(response.result.isError, undefined, output);
  assert.match(output, /failure: 'LS_KERNEL_HEAP_BOUND'/);
  assert.match(output, /bytes: 10485760/);
  assert.match(output, /ceiling: 100000000/);
  assert.match(output, /unchanged: true/);
  assert.notEqual(broker.child, null);
});

test('actual MCP retains disk resources across calls, streams analysis and exports beyond reset', async t => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'resource-mcp-')));
  const chunk = Buffer.alloc(64 * 1024, 23);
  const broker = new KernelBroker({ cwd, traversalOptions: {
    resourceStorageOptions: { tempRoot: root, artifactRoot: join(root, 'artifacts'), reserveBytes: 0 },
    fetchImpl: async url => {
      if (String(url).endsWith("/stalled")) return new Response(new ReadableStream({start(c){c.enqueue(chunk);}}));
      let n = 0;
      return new Response(new ReadableStream({ pull(c) { if (n++ < 65) c.enqueue(chunk); else c.close(); } }));
    },
  } });
  t.after(async () => { await broker.close(); await rm(root, {recursive:true,force:true}); });
  const handle = createRequestHandler({ broker });
  let id = 0;
  async function run(code) {
    const response = await handle({ jsonrpc:'2.0',id:++id,method:'tools/call',params:{name:'js',arguments:{code,timeout_ms:120000}} });
    const text = response.result.content.find(x => x.type === 'text')?.text;
    assert.equal(response.result.isError, undefined, text);
    return text;
  }
  assert.equal(await run(`var ws=linkedScience.open({contextKey:'large-resource'}); var task=ws.resources.start('https://example.test/large', {maxBytes:8000000}); var r=await task.done; nodeRepl.write((await r.inspect()).bytes)`), String(65*chunk.length));
  assert.equal(broker.traversal.resources.records.size, 1);
  const output = await run(`var total=0; for await (var part of r.chunks({chunkBytes:12345})) total+=part.length; nodeRepl.write({total, sample:[...(await r.read({offset:65530,length:6}))], preview:await r.inspect({as:'binary'}), profile:ws.results.profile(r.handle).residency})`);
  assert.match(output, /total: 4259840/);
  assert.match(output, /broker-stored-resource/);
  assert.match(output, /truncated: true/);
  assert.equal(await run(`nodeRepl.write((await r.text()).length)`), String(65*chunk.length));
  assert.equal(await run(`nodeRepl.write(linkedScience.capabilities().budgets.maxResidentResourceBytes)`), '100000000');
  const artifact = JSON.parse(await run(`var artifact=await r.materialize({name:'sample.bin',authorized:true}); nodeRepl.write(JSON.stringify(artifact))`));
  assert.equal(await run(`await ws.release(r); try { await r.read(); } catch(e) { nodeRepl.write(e.code); }`), 'LS_RELEASED_HANDLE');
  assert.equal(broker.traversal.resources.records.size, 0);
  await broker.reset();
  assert.equal((await readFile(artifact.path)).length, 65*chunk.length);
  assert.equal(JSON.parse(await readFile(artifact.receiptPath)).sha256, artifact.sha256);
  await run(`var ws=linkedScience.open({contextKey:'cleanup'}); var pending=ws.resources.get('https://example.test/large',{storage:'disk',maxBytes:8000000}); pending.catch(()=>{}); await ws.dispose(); await pending.catch(()=>{}); nodeRepl.write('disposed')`);
  assert.equal(broker.traversal.resources.records.size, 0);
  await run(`var ws2=linkedScience.open({contextKey:'cancel-transfer'});var stalled=ws2.resources.start('https://example.test/stalled',{maxBytes:8000000});nodeRepl.write('started')`);
  // Ensure an actual receive has begun before exercising disposal across calls.
  for(let i=0;i<100 && broker.traversal.resources.totalBytes===0;i++) await new Promise(resolve=>setTimeout(resolve,5));
  assert.ok(broker.traversal.resources.totalBytes>0);
  assert.match(await run(`nodeRepl.write(await stalled.status())`), /receiving/);
  await run(`await ws2.dispose();nodeRepl.write(await stalled.status())`);
  assert.equal(broker.traversal.resources.records.size,0);
  assert.equal(broker.traversal.resources.totalBytes,0);
  await run(`var ws3=linkedScience.open({contextKey:'reset-transfer'});var resetTransfer=ws3.resources.start('https://example.test/stalled',{maxBytes:8000000});nodeRepl.write('started')`);
  for(let i=0;i<100 && broker.traversal.resources.totalBytes===0;i++) await new Promise(resolve=>setTimeout(resolve,5));
  assert.ok(broker.traversal.resources.totalBytes>0);
  await broker.reset();
  assert.equal(broker.traversal.resources.records.size,0);
  assert.equal(broker.traversal.resources.totalBytes,0);
});
