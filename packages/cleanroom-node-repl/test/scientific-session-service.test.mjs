import assert from 'node:assert/strict';
import test from 'node:test';
import net from 'node:net';
import { mkdtemp, chmod, lstat, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { startScientificSessionService, MAX_FRAME_BYTES } from '../src/scientific-session-service.mjs';
import { connectScientificSession } from '../src/scientific-session-client.mjs';
import { KernelBroker } from '../src/cleanroom-mcp.mjs';

class FakeBroker {
  epoch = 0;
  child = null;
  queue = Promise.resolve();
  calls = [];
  released = new Set();
  outputs = new Map();
  closed = false;
  _enqueue(fn) { const next = this.queue.then(fn); this.queue = next.catch(() => {}); return next; }
  async execute(code) {
    if (!this.child) { this.child = {}; this.epoch++; }
    if (code === 'slow') await delay(100);
    return { content: [{ type: 'text', text: code }] };
  }
  async reset() { this.epoch++; this.child = {}; return { epoch: this.epoch }; }
  async addModuleDir() { return { ok: true }; }
  async close() { this.closed = true; this.child = null; }
  async _send(type, { code }) {
    assert.equal(type, 'eval');
    const marker = '.dispatch(JSON.parse(';
    const request = JSON.parse(JSON.parse(code.slice(code.indexOf(marker) + marker.length, -4)));
    this.calls.push(request);
    const { operation, args } = request;
    if (this.released.has(args.object)) throw Object.assign(new Error('Source released'), { code: 'LS_RELEASED_HANDLE' });
    let result = { object: args.object, kind: 'bindings', count: 257 };
    if (operation === 'query') result.object = 'derived-object';
    if (operation === 'deposit') { this.outputs.set(args.slot, args.value); result = { slot: args.slot, status: 'deposited' }; }
    if (operation === 'result') result = { slot: args.slot, value: this.outputs.get(args.slot) };
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
}

async function fixture(t, options = {}) {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'scientific-session-')));
  await chmod(directory, 0o700);
  const socketPath = join(directory, 'session.sock');
  const brokers = [];
  let service;
  const clients = [];
  t.after(async () => { for (const client of clients) client.close(); await service?.close(); await rm(directory, { recursive: true, force: true }); });
  try {
    service = await startScientificSessionService({ socketPath, brokerFactory: () => { const broker = new FakeBroker(); brokers.push(broker); return broker; }, ...options });
  } catch (error) {
    if (['EPERM', 'EACCES'].includes(error.code) && error.syscall === 'listen') { t.skip(`Sandbox denied Unix socket listen: ${error.code}`); return; }
    throw error;
  }
  const connect = async options => { const client = await connectScientificSession({ socketPath, ...options }); clients.push(client); return client; };
  return { directory, socketPath, service, connect, brokers };
}

async function ownerAndWorker(f, grantArgs = {}) {
  const owner = await f.connect();
  const created = await owner.create({ sessionId: 'test-session' });
  const grant = await owner.grant({ objects: ['source'], operations: ['describe', 'query', 'deposit', 'result'], outputSlot: 'output', ttlMs: 1000, ...grantArgs });
  const worker = await f.connect();
  const attached = await originalAttach(worker, grant);
  return { owner, worker, grant, created, attached };
}

// Attach deliberately accepts exactly sessionId/capability, not the full grant.
// Keep that wire boundary explicit in this convenience wrapper.
const originalAttach = async (client, grant) => client.attach({ sessionId: grant.sessionId, capability: grant.capability });

test('real broker persists bindings through disconnect and owner reconnect', async t => {
  const f = await fixture(t, { brokerFactory: () => new KernelBroker({ bootstrapLinkedScience: false, provider: null }) });
  if (!f) return;
  assert.equal((await lstat(f.socketPath)).mode & 0o777, 0o600);
  const first = await f.connect();
  const created = await first.create();
  assert.equal(created.role, 'owner');
  await first.execute('var sharedScientificBinding = 41');
  first.detach();
  const second = await f.connect();
  assert.equal((await originalAttach(second, created)).role, 'owner');
  assert.equal((await second.execute('nodeRepl.write(sharedScientificBinding + 1)')).content[0].text, '42');
  await second.closeSession();
  const third = await f.connect();
  await assert.rejects(originalAttach(third, created), { code: 'UNAUTHORIZED' });
});

test('tokens isolate sessions and deny unauthenticated control', async t => {
  const f = await fixture(t); if (!f) return;
  const a = await f.connect(), b = await f.connect(), stranger = await f.connect();
  const first = await a.create({ sessionId: 'first' });
  const second = await b.create({ sessionId: 'second' });
  await assert.rejects(stranger.reset(), { code: 'UNAUTHORIZED' });
  await assert.rejects(stranger.attach({ sessionId: first.sessionId, capability: second.capability }), { code: 'UNAUTHORIZED' });
  await assert.rejects(stranger.create({ sessionId: 'first' }), { code: 'SESSION_EXISTS' });
  assert.equal((await originalAttach(stranger, first)).role, 'owner');
});

test('worker operations, objects and output slots are connection-authorized', async t => {
  const f = await fixture(t); if (!f) return;
  const { worker, grant } = await ownerAndWorker(f);
  for (const call of [() => worker.execute('42'), () => worker.reset(), () => worker.addModuleDir('/tmp/node_modules'), () => worker.closeSession(), () => worker.grant({})]) await assert.rejects(call(), { code: 'FORBIDDEN' });
  await assert.rejects(worker.request('execute', { code: '42' }), { code: 'FORBIDDEN' });
  await assert.rejects(worker.request('describe', { object: 'secret' }), { code: 'FORBIDDEN' });
  await assert.rejects(worker.request('describe', { object: 'source', capability: grant.capability }), { code: 'INVALID_ARGUMENT' });
  await assert.rejects(worker.request('describe', { object: 'source', actor: 'owner' }), { code: 'INVALID_ARGUMENT' });
  await assert.rejects(worker.request('deposit', { slot: 'other', value: {} }), { code: 'FORBIDDEN' });
  await assert.rejects(worker.request('result', { slot: 'other' }), { code: 'FORBIDDEN' });
  assert.equal(f.brokers[0].calls.length, 0);
  assert.equal((await worker.request('describe', { object: 'source' })).count, 257);
  assert.deepEqual(f.brokers[0].calls[0].scope.objects, ['source']);
  assert.equal(f.brokers[0].calls[0].scope.capability, undefined);
});

test('query denies external scope and authorizes successful new objects only in the same grant', async t => {
  const f = await fixture(t); if (!f) return;
  const { owner, worker } = await ownerAndWorker(f);
  const otherGrant = await owner.grant({ objects: ['source'], operations: ['describe'], ttlMs: 1000 });
  const other = await f.connect(); await originalAttach(other, otherGrant);
  for (const sparql of ['SELECT * WHERE { SERVICE <https://example.test/> { ?s ?p ?o } }', 'SELECT * FROM <https://example.test/> WHERE { ?s ?p ?o }', 'INSERT DATA { <urn:s> <urn:p> <urn:o> }']) await assert.rejects(worker.request('query', { object: 'source', sparql }), { code: 'FORBIDDEN' });
  await assert.rejects(worker.request('query', { object: 'source', sparql: 'SELECT * WHERE { ?s ?p ?o }', sources: ['secret'] }), { code: 'INVALID_ARGUMENT' });
  const result = await worker.request('query', { object: 'source', sparql: 'SELECT * WHERE { ?s ?p ?o }' });
  assert.equal((await worker.request('describe', { object: result.object })).object, result.object);
  await assert.rejects(other.request('describe', { object: result.object }), { code: 'FORBIDDEN' });
});

test('deposit validates original source lifetimes, JSON bounds and the granted result slot', async t => {
  const f = await fixture(t); if (!f) return;
  const { worker } = await ownerAndWorker(f);
  await assert.rejects(worker.request('deposit', { slot: 'output', value: 'scalar' }), { code: 'INVALID_ARGUMENT' });
  await assert.rejects(worker.request('deposit', { slot: 'output', value: { text: 'a'.repeat(128 * 1024) } }), { code: 'FRAME_TOO_LARGE' });
  await worker.request('deposit', { slot: 'output', value: { answer: 42 } });
  assert.deepEqual(f.brokers[0].calls.map(call => call.operation), ['describe', 'deposit']);
  assert.deepEqual(await worker.request('result', { slot: 'output' }), { slot: 'output', value: { answer: 42 } });
  f.brokers[0].released.add('source');
  await assert.rejects(worker.request('deposit', { slot: 'output', value: {} }), { code: 'LS_RELEASED_HANDLE' });
  assert.equal(f.brokers[0].calls.at(-1).operation, 'describe');
});

test('grants expire and reset or child loss invalidates them without worker respawn', async t => {
  const f = await fixture(t); if (!f) return;
  const { owner, worker } = await ownerAndWorker(f, { ttlMs: 30 });
  await delay(40);
  await assert.rejects(worker.request('describe', { object: 'source' }), { code: 'GRANT_EXPIRED' });
  for (const invalidate of ['reset', 'exit', 'epoch']) {
    const grant = await owner.grant({ objects: ['source'], operations: ['describe'], ttlMs: 1000 });
    const next = await f.connect(); await originalAttach(next, grant);
    if (invalidate === 'reset') await owner.reset();
    else if (invalidate === 'exit') f.brokers[0].child = null;
    else f.brokers[0].epoch++;
    const before = f.brokers[0].epoch;
    await assert.rejects(next.request('describe', { object: 'source' }), { code: 'GRANT_EXPIRED' });
    assert.equal(f.brokers[0].epoch, before);
    await owner.execute('initialize');
  }
});

test('kernel owner callbacks grant without queue deadlock and reject reentrant closure', async t => {
  const f = await fixture(t); if (!f) return;
  const owner = await f.connect(); await owner.create();
  const broker = f.brokers[0];
  const grant = await broker.sessionControl({ operation: 'grant', args: { objects: ['source'], operations: ['describe'], ttlMs: 1000 } });
  const worker = await f.connect(); assert.equal((await originalAttach(worker, grant)).role, 'worker');
  assert.equal((await broker.sessionControl({ operation: 'status' })).role, 'owner');
  await assert.rejects(broker.sessionControl({ operation: 'closeSession' }), { code: 'REENTRANT_CONTROL' });
  await assert.rejects(broker.sessionControl({ operation: 'reset' }), { code: 'FORBIDDEN' });
});

test('idle expiry closes detached sessions and shutdown closes all remaining brokers', async t => {
  const f = await fixture(t, { idleTtlMs: 25 }); if (!f) return;
  const owner = await f.connect(); const created = await owner.create(); owner.detach();
  await delay(80);
  assert.equal(f.brokers[0].closed, true);
  const next = await f.connect(); await assert.rejects(originalAttach(next, created), { code: 'UNAUTHORIZED' });
  await next.create(); await f.service.close();
  assert.ok(f.brokers.every(broker => broker.closed));
  await assert.rejects(next.status(), error => ['CONNECTION_CLOSED', 'ECONNRESET', 'EPIPE'].includes(error.code));
});

test('client enforces pending and frame limits and times out without an unbounded wait', async t => {
  const f = await fixture(t); if (!f) return;
  const client = await f.connect({ maxPending: 1, requestTimeoutMs: 40 }); await client.create();
  await assert.rejects(client.execute('x'.repeat(MAX_FRAME_BYTES)), { code: 'FRAME_TOO_LARGE' });
  const pending = client.execute('slow');
  const timedOut = assert.rejects(pending, { code: 'REQUEST_TIMEOUT' });
  await assert.rejects(client.status(), { code: 'CAPACITY' });
  await timedOut;
});

async function raw(socketPath, frames) {
  const socket = net.createConnection(socketPath);
  let text = '';
  return new Promise((resolve, reject) => {
    socket.once('connect', () => socket.write(frames));
    socket.on('data', chunk => { text += chunk; });
    socket.once('error', reject);
    socket.once('end', () => { socket.destroy(); resolve(text.trim().split('\n').map(line => JSON.parse(line))); });
  });
}

test('server rejects malformed, duplicate and oversized frames, and bounds pending requests', async t => {
  const f = await fixture(t, { maxPending: 1 }); if (!f) return;
  for (const [frame, code] of [['{broken}\n', 'INVALID_REQUEST'], ['x'.repeat(MAX_FRAME_BYTES + 1), 'FRAME_TOO_LARGE'], ['{"id":1,"method":"status"}\n{"id":1,"method":"status"}\n', 'INVALID_REQUEST'], ['{"id":1,"method":"status"}\n{"id":2,"method":"status"}\n', 'CAPACITY']]) {
    const replies = await raw(f.socketPath, frame);
    assert.equal(replies[0].error.code, code);
  }
});

test('service timeout closes a stuck session and rejects queued control', async t => {
  const f = await fixture(t, { requestTimeoutMs: 25 }); if (!f) return;
  const client = await f.connect(); await client.create();
  await assert.rejects(client.execute('slow'), { code: 'REQUEST_TIMEOUT' });
  await assert.rejects(client.status(), error => ['UNAUTHORIZED', 'CONNECTION_CLOSED', 'ECONNRESET', 'EPIPE'].includes(error.code));
  assert.equal(f.brokers[0].closed, true);
});


test('scoped dispatch rechecks queued grants before entering the broker', async t => {
  const f = await fixture(t); if (!f) return;
  const { worker } = await ownerAndWorker(f);
  const broker = f.brokers[0];
  let resume;
  broker.queue = new Promise(done => { resume = done; });
  const request = worker.request('describe', { object: 'source' });
  const rejected = assert.rejects(request, { code: 'GRANT_EXPIRED' });
  await delay(10);
  broker.child = null;
  resume();
  await rejected;
  assert.equal(broker.calls.length, 0);
});

test('transport preserves JSON data without interpreting it as JavaScript', async t => {
  const f = await fixture(t); if (!f) return;
  const { worker } = await ownerAndWorker(f);
  const value = JSON.parse('{"__proto__":{"injected":true},"text":"\\";process.exit();//"}');
  await worker.request('deposit', { slot: 'output', value });
  assert.deepEqual((await worker.request('result', { slot: 'output' })).value, value);
  assert.equal(Object.prototype.injected, undefined);
});


test('service rejects an insecure socket directory', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'scientific-session-mode-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await chmod(directory, 0o755);
  await assert.rejects(startScientificSessionService({ socketPath: join(directory, 'service.sock') }), { code: 'SOCKET_DIRECTORY' });
});

test('service shutdown cancels outstanding RPC and closes the broker', async t => {
  const f = await fixture(t); if (!f) return;
  const owner = await f.connect(); await owner.create();
  let entered;
  const started = new Promise(done => { entered = done; });
  f.brokers[0].execute = () => { entered(); return new Promise(() => {}); };
  const result = owner.execute('stuck');
  const rejected = assert.rejects(result, error => ['CONNECTION_CLOSED', 'SERVICE_CLOSED', 'ECONNRESET'].includes(error.code));
  await started;
  await f.service.close();
  await rejected;
  assert.equal(f.brokers[0].closed, true);
});

test('in-flight scoped response is rejected after its grant expires', async t => {
  const f = await fixture(t); if (!f) return;
  const { worker } = await ownerAndWorker(f, { ttlMs: 50 });
  const broker = f.brokers[0], send = broker._send.bind(broker);
  broker._send = async (...args) => { const result = await send(...args); await delay(65); return result; };
  await assert.rejects(worker.request('describe', { object: 'source' }), { code: 'GRANT_EXPIRED' });
});


test('output slots are exclusive across grants, remain reserved after expiry, and reset clears them', async t => {
  const f = await fixture(t); if (!f) return;
  const { owner } = await ownerAndWorker(f, { ttlMs: 20 });
  const args = { objects: ['source'], operations: ['deposit', 'result'], outputSlot: 'output', ttlMs: 1000 };
  await assert.rejects(owner.grant(args), { code: 'SLOT_IN_USE' });
  await delay(30);
  await assert.rejects(owner.grant(args), { code: 'SLOT_IN_USE' });
  await owner.reset();
  assert.equal((await owner.grant(args)).outputSlot, 'output');
});

test('worker timeout before kernel dispatch preserves the owner session', async t => {
  const f = await fixture(t, { requestTimeoutMs: 30 }); if (!f) return;
  const { owner, worker } = await ownerAndWorker(f);
  let resume;
  const broker = f.brokers[0];
  broker.queue = new Promise(done => { resume = done; });
  await assert.rejects(worker.request('describe', { object: 'source' }), { code: 'REQUEST_TIMEOUT' });
  assert.equal(broker.closed, false);
  resume();
  assert.equal((await owner.status()).role, 'owner');
  assert.equal(broker.calls.length, 0);
});

test('worker timeout during kernel dispatch closes the shared session', async t => {
  const f = await fixture(t, { requestTimeoutMs: 30 }); if (!f) return;
  const { worker } = await ownerAndWorker(f);
  f.brokers[0]._send = () => new Promise(() => {});
  await assert.rejects(worker.request('describe', { object: 'source' }), { code: 'REQUEST_TIMEOUT' });
  assert.equal(f.brokers[0].closed, true);
});

test('unsupported cursor and expectedSchema fields fail before dispatch', async t => {
  const f = await fixture(t); if (!f) return;
  const { worker } = await ownerAndWorker(f, { operations: ['match', 'deposit'] });
  await assert.rejects(worker.request('match', { object: 'source', cursor: 'ignored', limit: 1 }), { code: 'INVALID_ARGUMENT' });
  await assert.rejects(worker.request('deposit', { slot: 'output', value: {}, expectedSchema: {} }), { code: 'INVALID_ARGUMENT' });
  assert.equal(f.brokers[0].calls.length, 0);
});

test('derived objects count toward the grant cap before further query dispatch', async t => {
  const f = await fixture(t, { maxGrantObjects: 2 }); if (!f) return;
  const { worker } = await ownerAndWorker(f);
  const query = { object: 'source', sparql: 'SELECT * WHERE { ?s ?p ?o }' };
  const derived = await worker.request('query', query);
  assert.equal((await worker.request('describe', { object: derived.object })).object, derived.object);
  const calls = f.brokers[0].calls.length;
  await assert.rejects(worker.request('query', query), { code: 'CAPACITY' });
  assert.equal(f.brokers[0].calls.length, calls);
});
