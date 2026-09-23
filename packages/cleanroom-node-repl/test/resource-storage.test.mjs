import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, readdir, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { MediatedTraversalBroker } from '../src/mediated-traversal.mjs';
import { ResourceStorage } from '../src/resource-storage.mjs';

const owner = { token: 'resource-test', epoch: 1 };
async function fixture(t, fetchImpl, options = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'resource-test-')));
  const resources = new ResourceStorage({ tempRoot: root, artifactRoot: join(root, 'artifacts'), reserveBytes: 0, ...options });
  const broker = new MediatedTraversalBroker({ fetchImpl, resourceStorage: resources });
  t.after(async () => { broker.abortOwner(owner); await resources.releaseOwner(owner); await rm(root, { recursive: true, force: true }); });
  return { root, resources, broker };
}
const start = async broker => broker.beginResource({ maxBytes: 10_000_000, timeoutMs: 10000 }, owner);
const request = (broker, begun) => broker.request({ traversalId: begun.traversalId, request: { url: 'https://example.test/data', headers: { cookie: 'secret', authorization: 'secret' } } }, owner);

test('streams >2MB, checksums, reads bounded ranges and publishes independent artifacts', async t => {
  let calls = 0;
  const chunk = Buffer.alloc(64 * 1024, 37);
  const hash = createHash('sha256');
  for (let i = 0; i < 80; i++) hash.update(chunk);
  const expected = hash.digest('hex');
  const { broker, resources } = await fixture(t, async (url, init) => {
    calls++;
    assert.equal(init.credentials, 'omit');
    assert.equal(init.headers.has('cookie'), false);
    assert.equal(init.headers.has('authorization'), false);
    let n = 0;
    return new Response(new ReadableStream({ pull(controller) { if (n++ < 80) controller.enqueue(chunk); else controller.close(); } }));
  });
  const begun = await start(broker);
  const result = await request(broker, begun);
  assert.equal(calls, 1); // no HEAD probe
  assert.equal(result.bodyBase64, undefined);
  assert.equal(result.stored.bytes, 80 * chunk.length);
  assert.equal(result.stored.sha256, expected);
  assert.equal(result.exchange.responseSha256, expected);
  assert.equal(broker.finishTraversal({ traversalId: begun.traversalId }, owner).usage.bytes, result.stored.bytes);
  const storageId = result.stored.storageId;
  const page = await resources.read({ storageId, offset: 65530, length: 20 }, owner);
  assert.deepEqual(Buffer.from(page.base64, 'base64'), Buffer.alloc(20, 37));
  await assert.rejects(resources.read({ storageId, length: 2 ** 21 }, owner), { code: 'RESOURCE_LIMIT_INVALID' });
  await assert.rejects(resources.read({ storageId }, { ...owner, epoch: 2 }), { code: 'RESOURCE_OWNER_DENIED' });
  await assert.rejects(resources.materialize({ storageId, name: 'data.xtc' }, owner), { code: 'RESOURCE_EXPORT_AUTHORITY' });
  await assert.rejects(resources.materialize({ storageId, name: '../data.xtc', authorized: true }, owner), { code: 'RESOURCE_ARTIFACT_NAME' });
  const first = await resources.materialize({ storageId, name: 'data.xtc', authorized: true }, owner);
  const second = await resources.materialize({ storageId, name: 'data.xtc', authorized: true }, owner);
  assert.notEqual(first.path, second.path);
  await Promise.all([resources.release({storageId},owner),resources.releaseOwner(owner)]);
  assert.equal(resources.totalBytes, 0);
  assert.equal(createHash('sha256').update(await readFile(first.path)).digest('hex'), expected);
  assert.equal(JSON.parse(await readFile(first.receiptPath)).source.exchange.requestedUrl, 'https://example.test/data');
});

test('unknown-length over-limit streams fail without a successful resource or partial file', async t => {
  const { broker, resources } = await fixture(t, async () => new Response(Buffer.alloc(5000)));
  const begun = await broker.beginResource({ maxBytes: 4000 }, owner);
  await assert.rejects(request(broker, begun), { code: 'RESOURCE_BYTE_LIMIT' });
  assert.equal(resources.records.size, 0);
  assert.equal(resources.totalBytes, 0);
  assert.deepEqual(await readdir(await resources.root), []);
  const receipt = broker.abortTraversal({ traversalId: begun.traversalId }, owner);
  assert.equal(receipt.usage.bytes, 5000);
  assert.equal(receipt.exchanges[0].status, 'failure');
});

test('cancellation interrupts a stalled body read and cleans partial storage', async t => {
  let streamed;
  const ready = new Promise(resolve => { streamed = resolve; });
  const { broker, resources } = await fixture(t, async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(Buffer.alloc(10)); streamed(); } })));
  const begun = await start(broker);
  const pending = request(broker, begun);
  const failure = assert.rejects(pending, { code: 'MEDIATOR_ABORTED' });
  await ready;
  await new Promise(resolve => setTimeout(resolve, 25));
  const progress = broker.snapshotTraversal({ traversalId: begun.traversalId }, owner);
  assert.equal(progress.progress.bytes, 10);
  broker.abortTraversal({ traversalId: begun.traversalId }, owner);
  await failure;
  assert.equal(resources.records.size, 0);
  assert.equal(resources.totalBytes, 0);
});

test('capacity admission and shared storage quota are independent of projection and memory bounds', async t => {
  const { broker, resources } = await fixture(t, async () => new Response(Buffer.alloc(600)), { maxStorageBytes: 1000 });
  await assert.rejects(start(broker), { code: 'RESOURCE_CAPACITY' });
  const begun = await broker.beginResource({ maxBytes: 700 }, owner);
  await request(broker, begun);
  const capacity = await resources.capacity();
  assert.equal(capacity.availableBytes, 400);
  await assert.rejects(broker.beginResource({ maxBytes: 500 }, owner), { code: 'RESOURCE_CAPACITY' });
});

test('explicit tighter budgets and Content-Length are enforced without HEAD or partial success', async t => {
  let cancelled = false;
  const { broker, resources } = await fixture(t, async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), {headers:{'content-length':'900'}}));
  const begun = await broker.beginResource({maxBytes:1000,budgets:{maxTotalBytes:800}}, owner);
  await assert.rejects(request(broker,begun), {code:'RESOURCE_BYTE_LIMIT'});
  assert.equal(cancelled,true);
  assert.equal(resources.records.size,0);
  assert.equal(broker.snapshotTraversal({traversalId:begun.traversalId},owner).budgets.maxTotalBytes,800);
});

test('deadline cancels stalled bodies and reports exact failure without retained data', async t => {
  const { broker, resources } = await fixture(t, async () => new Response(new ReadableStream({start(c){c.enqueue(Buffer.alloc(20));}})));
  const begun = await broker.beginResource({maxBytes:1000,timeoutMs:50},owner);
  await assert.rejects(request(broker,begun),{code:'MEDIATOR_REQUEST_TIMEOUT'});
  assert.equal(resources.totalBytes,0);
  assert.equal(resources.records.size,0);
});
