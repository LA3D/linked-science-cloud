import net from 'node:net';
import { lstat, chmod, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { Parser } from 'sparqljs';
import { KernelBroker } from './cleanroom-mcp.mjs';

export const MAX_FRAME_BYTES = 512 * 1024;
const operations = new Set(['describe', 'match', 'bindings', 'query', 'deposit', 'result']);
const fail = (code, message) => Object.assign(new Error(message), { code });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const name = value => typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/u.test(value);
const token = () => randomBytes(32).toString('hex');
function fields(value, allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) throw fail('INVALID_ARGUMENT', 'Unexpected request fields');
}
function scopedArgs(operation, args, grant) {
  const allowed = { describe: ['object'], match: ['object', 'pattern', 'offset', 'limit'], bindings: ['object', 'offset', 'limit'], query: ['object', 'sparql'], deposit: ['slot', 'value'], result: ['slot'] };
  if (!operations.has(operation) || !grant.operations.includes(operation)) throw fail('FORBIDDEN', 'Operation is outside the grant');
  fields(args, allowed[operation]);
  if (operation === 'deposit' || operation === 'result') {
    if (!grant.outputSlot || args.slot !== grant.outputSlot) throw fail('FORBIDDEN', 'Slot is outside the grant');
  } else if (!grant.objects.includes(args.object)) throw fail('FORBIDDEN', 'Object is outside the grant');
  if (['match', 'bindings'].includes(operation) && args.limit !== undefined && (!positive(args.limit) || args.limit > 128)) throw fail('INVALID_ARGUMENT', 'limit must be 1-128');
  if (args.offset !== undefined && (!Number.isSafeInteger(args.offset) || args.offset < 0)) throw fail('INVALID_ARGUMENT', 'Invalid offset');
  if (operation === 'query') {
    if (typeof args.sparql !== 'string' || Buffer.byteLength(args.sparql) > 65536) throw fail('INVALID_ARGUMENT', 'sparql is required');
    let parsed;
    try { parsed = new Parser().parse(args.sparql); } catch { throw fail('INVALID_QUERY', 'Invalid local SPARQL query'); }
    const forbidden = value => value && typeof value === 'object' && (value.type === 'service' || value.from !== undefined || Object.values(value).some(forbidden));
    if (parsed.type !== 'query' || forbidden(parsed)) throw fail('FORBIDDEN', 'Only local queries without SERVICE or dataset clauses are allowed');
  }
}

/** Local same-user creation; attaching requires a capability. No provider is configured.
 * brokerFactory is trusted host configuration, never a wire argument. Worker dispatch
 * uses KernelBroker's serialized _send path, checking the live child before _send can
 * call _spawn. Thus a dead child cannot auto-respawn under an old worker grant.
 * Output slots are exclusive reservations until reset/close, even after grant expiry.
 * Timeouts during owner control or an in-flight worker dispatch close the shared
 * session: KernelBroker cannot safely cancel one evaluation while preserving its
 * kernel. A worker timing out before dispatch is detached without killing the session.
 */
export async function startScientificSessionService({ socketPath, brokerFactory = () => new KernelBroker({ provider: null }), idleTtlMs = 300_000, requestTimeoutMs = 30_000, maxPending = 32, maxSessions = 32, maxConnections = 64, maxGrants = 128, maxGrantObjects = 1024 } = {}) {
  if (typeof socketPath !== 'string' || !socketPath.startsWith('/') || ![idleTtlMs, requestTimeoutMs, maxPending, maxSessions, maxConnections, maxGrants, maxGrantObjects].every(positive)) throw fail('INVALID_ARGUMENT', 'Invalid service options');
  const directory = dirname(socketPath);
  const metadata = await lstat(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || metadata.uid !== process.getuid() || (metadata.mode & 0o777) !== 0o700) throw fail('SOCKET_DIRECTORY', 'Socket directory must be user-owned and mode 0700');
  const sessions = new Map();
  const connections = new Set();
  const cleanups = new Set();
  const activeRequests = new Set();
  let closing = false;
  let shutdown;
  let socketIdentity;
  async function closeSession(session) {
    if (session.closed) return session.closing;
    session.closed = true;
    session.grants.clear();
    session.slots.clear();
    sessions.delete(session.id);
    session.closing = Promise.resolve().then(() => session.broker.close());
    cleanups.add(session.closing);
    session.closing.finally(() => cleanups.delete(session.closing)).catch(() => {});
    return session.closing;
  }
  function syncEpoch(session) {
    if (session.broker.epoch !== session.epoch || !session.broker.child || session.broker.child.killed || session.broker.child.exitCode != null || session.broker.child.signalCode != null) {
      session.grants.clear();
      session.slots.clear();
      session.epoch = session.broker.epoch;
    }
  }
  function authorize(connection, owner = false) {
    if (connection.timedOut) throw fail('REQUEST_TIMEOUT', 'Connection timed out; reconnect with a valid capability');
    const { session, grant } = connection.auth ?? {};
    if (!session || session.closed) throw fail('UNAUTHORIZED', 'Attach to an open session first');
    syncEpoch(session);
    if (owner && grant) throw fail('FORBIDDEN', 'Owner capability required');
    if (grant && (session.grants.get(grant.capability) !== grant || grant.epoch !== session.epoch || grant.expiresAt <= Date.now())) throw fail('GRANT_EXPIRED', 'Grant expired or its kernel epoch was lost');
    return session;
  }
  function serialized(session, operation) {
    session.busy++;
    const next = session.queue.then(() => {
      if (session.closed || closing) throw fail('SESSION_CLOSED', 'Session is closed');
      return operation();
    });
    session.queue = next.catch(() => {});
    return next.finally(() => { session.busy--; session.lastUsed = Date.now(); });
  }
  function issueGrant(session, args) {
    syncEpoch(session);
    fields(args, ['objects', 'operations', 'ttlMs', 'outputSlot']);
    const { objects, operations: requested, ttlMs = 60_000, outputSlot } = args;
    if (!Array.isArray(objects) || objects.length > Math.min(128, maxGrantObjects) || !objects.every(name) || !Array.isArray(requested) || !requested.length || requested.length > operations.size || !requested.every(op => operations.has(op)) || !positive(ttlMs) || ttlMs > idleTtlMs || (outputSlot !== undefined && !name(outputSlot)) || (requested.some(op => ['deposit', 'result'].includes(op)) && !outputSlot)) throw fail('INVALID_ARGUMENT', 'Invalid grant scope or TTL');
    for (const [key, grant] of session.grants) if (grant.expiresAt <= Date.now()) session.grants.delete(key);
    if (session.grants.size >= maxGrants) throw fail('CAPACITY', 'Grant capacity reached');
    if (!session.broker.child) throw fail('EPOCH_LOST', 'Owner must initialize a live kernel before granting');
    if (outputSlot && session.slots.has(outputSlot)) throw fail('SLOT_IN_USE', 'Output slot is already reserved for this session epoch');
    const grant = { capability: token(), sessionId: session.id, epoch: session.epoch, objects: [...objects], sourceObjects: [...objects], operations: [...requested], ...(outputSlot ? { outputSlot } : {}), expiresAt: Date.now() + ttlMs };
    session.grants.set(grant.capability, grant);
    if (outputSlot) session.slots.add(outputSlot);
    const { sourceObjects, ...publicGrant } = grant;
    return publicGrant;
  }
  async function handle(connection, method, args) {
    if (closing) throw fail('SERVICE_CLOSED', 'Service is shutting down');
    if (method === 'create') {
      fields(args, ['sessionId']);
      if (connection.auth) throw fail('ALREADY_ATTACHED', 'Detach before creating another session');
      const id = args.sessionId ?? randomUUID();
      if (!name(id)) throw fail('INVALID_ARGUMENT', 'Invalid sessionId');
      if (sessions.has(id)) throw fail('SESSION_EXISTS', 'Session id is already in use');
      if (sessions.size >= maxSessions) throw fail('CAPACITY', 'Session capacity reached');
      const broker = brokerFactory({ sessionId: id });
      const session = { id, broker, capability: token(), grants: new Map(), slots: new Set(), epoch: broker.epoch, lastUsed: Date.now(), queue: Promise.resolve(), busy: 0, closed: false };
      broker.sessionControl = async ({ operation, args: controlArgs = {} }) => {
        if (session.closed || closing) throw fail('SESSION_CLOSED', 'Session is closed');
        if (operation === 'grant') return issueGrant(session, controlArgs);
        if (operation === 'status') { fields(controlArgs, []); syncEpoch(session); return { sessionId: id, epoch: session.epoch, role: 'owner' }; }
        if (operation === 'closeSession') throw fail('REENTRANT_CONTROL', 'Close the session through an external owner connection');
        throw fail('FORBIDDEN', 'Unsupported owner kernel control operation');
      };
      sessions.set(id, session);
      connection.auth = { session };
      try {
        await serialized(session, () => broker.execute('void 0', { timeoutMs: requestTimeoutMs, maxOutputBytes: 1024 }));
        session.epoch = broker.epoch;
        return { sessionId: id, capability: session.capability, epoch: session.epoch, role: 'owner' };
      } catch (error) { await closeSession(session); throw error; }
    }
    if (method === 'attach') {
      fields(args, ['sessionId', 'capability']);
      if (connection.auth) throw fail('ALREADY_ATTACHED', 'Connection is already attached');
      const session = sessions.get(args.sessionId);
      if (!session || typeof args.capability !== 'string') throw fail('UNAUTHORIZED', 'Invalid session capability');
      syncEpoch(session);
      const grant = session.grants.get(args.capability);
      if (args.capability !== session.capability && (!grant || grant.expiresAt <= Date.now() || grant.epoch !== session.epoch)) throw fail('UNAUTHORIZED', 'Invalid session capability');
      connection.auth = { session, ...(grant ? { grant } : {}) };
      session.lastUsed = Date.now();
      return { sessionId: session.id, epoch: session.epoch, role: grant ? 'worker' : 'owner' };
    }
    const session = authorize(connection, !['request', 'status'].includes(method));
    return serialized(session, async () => {
      authorize(connection, !['request', 'status'].includes(method));
      if (method === 'status') { fields(args, []); return { sessionId: session.id, epoch: session.epoch, role: connection.auth.grant ? 'worker' : 'owner' }; }
      if (method === 'closeSession') { fields(args, []); await closeSession(session); return { closed: true }; }
      if (method === 'reset') { fields(args, []); session.grants.clear(); session.slots.clear(); const result = await session.broker.reset(); session.epoch = session.broker.epoch; return result; }
      if (method === 'addModuleDir') { fields(args, ['path']); return session.broker.addModuleDir(args.path); }
      if (method === 'execute') {
        fields(args, ['code', 'options']); fields(args.options ?? {}, ['timeoutMs', 'maxOutputBytes', 'requestMeta']);
        const { timeoutMs = requestTimeoutMs, maxOutputBytes = 32 * 1024, requestMeta = {} } = args.options ?? {};
        if (!object(requestMeta)) throw fail('INVALID_ARGUMENT', 'requestMeta must be an object');
        if (typeof args.code !== 'string' || !positive(timeoutMs) || timeoutMs > requestTimeoutMs || !positive(maxOutputBytes) || maxOutputBytes > MAX_FRAME_BYTES / 4) throw fail('INVALID_ARGUMENT', 'Invalid execution bounds');
        try { return await session.broker.execute(args.code, { timeoutMs, maxOutputBytes, requestMeta }); } finally { syncEpoch(session); }
      }
      if (method === 'grant') {
        return issueGrant(session, args);
      }
      if (method === 'request') {
        fields(args, ['operation', 'args']);
        const grant = connection.auth.grant;
        if (!grant) throw fail('FORBIDDEN', 'Scoped request requires a worker grant connection');
        scopedArgs(args.operation, args.args, grant);
        if (args.operation === 'query' && grant.objects.length >= maxGrantObjects) throw fail('CAPACITY', 'Grant object capacity reached');
        const scope = { sessionId: session.id, epoch: grant.epoch, objects: grant.objects, operations: grant.operations, ...(grant.outputSlot ? { outputSlot: grant.outputSlot } : {}) };
        const broker = session.broker;
        async function dispatch(operation, data) {
          const requestJson = JSON.stringify({ operation, args: data, scope });
          const code = `nodeRepl.write(JSON.stringify(await nodeRepl.scientificSession.dispatch(JSON.parse(${JSON.stringify(requestJson)}))))`;
          const response = await broker._enqueue(async () => {
            authorize(connection);
            if (!broker.child || broker.epoch !== grant.epoch) throw fail('EPOCH_LOST', 'Worker cannot start a replacement kernel');
            connection.dispatching = true;
            try { return await broker._send('eval', { code, maxOutputBytes: MAX_FRAME_BYTES / 4, requestMeta: {} }); }
            finally { connection.dispatching = false; }
          });
          authorize(connection);
          if (response?.isError || response?.content?.length !== 1 || response.content[0].type !== 'text') throw fail('DISPATCH_FAILED', 'Kernel dispatcher did not return one JSON text result');
          let result;
          try { result = JSON.parse(response.content[0].text); } catch { throw fail('DISPATCH_FAILED', 'Kernel dispatcher output is not complete JSON'); }
          if (result?.error) throw fail(result.error.code ?? 'DISPATCH_FAILED', result.error.message ?? 'Kernel data operation failed');
          return result;
        }
        if (args.operation === 'deposit') {
          if (!object(args.args.value) && !Array.isArray(args.args.value)) throw fail('INVALID_ARGUMENT', 'Deposit value must be a JSON object or array');
          if (Buffer.byteLength(JSON.stringify(args.args.value)) > 128 * 1024) throw fail('FRAME_TOO_LARGE', 'Deposit exceeds 128KiB');
          for (const source of grant.sourceObjects) await dispatch('describe', { object: source });
        }
        const result = await dispatch(args.operation, args.args);
        if (args.operation === 'query') {
          if (!name(result?.object) || typeof result.kind !== 'string' || !Number.isSafeInteger(result.count) || result.count < 0) throw fail('DISPATCH_FAILED', 'Query did not return a valid retained object');
          if (!grant.objects.includes(result.object)) grant.objects.push(result.object);
        }
        return result;
      }
      throw fail('METHOD_NOT_FOUND', 'Unknown session method');
    });
  }
  const server = net.createServer(socket => {
    if (closing || connections.size >= maxConnections) { socket.destroy(); return; }
    const connection = { socket, auth: null, buffer: Buffer.alloc(0), stopped: false, pending: 0, lastId: 0, queue: Promise.resolve() };
    connections.add(connection);
    socket.on('error', () => {});
    socket.on('close', () => { connections.delete(connection); });
    function reply(value) {
      let line = JSON.stringify(value);
      if (Buffer.byteLength(line) > MAX_FRAME_BYTES) line = JSON.stringify({ id: value.id, error: { code: 'FRAME_TOO_LARGE', message: 'Response exceeds frame limit' } });
      if (socket.writableLength + Buffer.byteLength(line) > MAX_FRAME_BYTES * 2) { socket.destroy(); return; }
      if (!socket.destroyed && !socket.writableEnded) socket.write(line + '\n');
    }
    function reject(code, message) {
      connection.stopped = true;
      connection.buffer = Buffer.alloc(0);
      socket.pause();
      reply({ id: null, error: { code, message } });
      socket.end(() => socket.destroy());
    }
    socket.on('data', chunk => {
      if (connection.stopped) return;
      connection.buffer = Buffer.concat([connection.buffer, chunk]);
      for (;;) {
        const end = connection.buffer.indexOf(10);
        if (end < 0) { if (connection.buffer.length > MAX_FRAME_BYTES) reject('FRAME_TOO_LARGE', 'Frame exceeds limit'); return; }
        if (end > MAX_FRAME_BYTES) { reject('FRAME_TOO_LARGE', 'Frame exceeds limit'); return; }
        const frame = connection.buffer.subarray(0, end); connection.buffer = connection.buffer.subarray(end + 1);
        let request;
        try { request = JSON.parse(frame.toString('utf8')); fields(request, ['id', 'method', 'args']); if (!positive(request.id) || request.id <= connection.lastId || typeof request.method !== 'string') throw Error(); } catch { reject('INVALID_REQUEST', 'Malformed request or duplicate/non-increasing id'); return; }
        connection.lastId = request.id;
        if (++connection.pending > maxPending) { reject('CAPACITY', 'Too many pending requests'); return; }
        const work = connection.queue.then(async () => {
          if (connection.stopped) { connection.pending--; return; }
          let timer;
          let cancel;
          try {
            const result = await Promise.race([handle(connection, request.method, request.args ?? {}), new Promise((_, rejectTimeout) => { cancel = rejectTimeout; activeRequests.add(cancel); timer = setTimeout(() => {
              connection.timedOut = true;
              const mustClose = connection.auth && (!connection.auth.grant || connection.dispatching);
              if (mustClose) closeSession(connection.auth.session).catch(() => {});
              rejectTimeout(fail('REQUEST_TIMEOUT', mustClose ? 'Request timed out during kernel work; shared session closed' : 'Request timed out before worker dispatch; reconnect to the surviving session'));

            }, requestTimeoutMs); })]);
            reply({ id: request.id, result });
          } catch (error) { reply({ id: request.id, error: { code: String(error.code ?? 'SESSION_ERROR'), message: String(error.message ?? 'Session operation failed').slice(0, 2000) } }); }
          finally { clearTimeout(timer); activeRequests.delete(cancel); connection.pending--; if (connection.timedOut) { connection.stopped = true; socket.end(() => socket.destroy()); } }
        });
        connection.queue = work.catch(() => {});
      }
    });
  });
  await new Promise((done, reject) => { server.once('error', reject); server.listen(socketPath, () => { server.off('error', reject); done(); }); });
  try { await chmod(socketPath, 0o600); socketIdentity = await lstat(socketPath); } catch (error) { server.close(); throw error; }
  const sweep = setInterval(() => { for (const session of sessions.values()) if (!session.busy && Date.now() - session.lastUsed >= idleTtlMs) closeSession(session).catch(() => {}); }, Math.min(idleTtlMs, 1000));
  sweep.unref();
  return {
    socketPath,
    close() {
      if (shutdown) return shutdown;
      closing = true; clearInterval(sweep);
      for (const cancel of activeRequests) cancel(fail('SERVICE_CLOSED', 'Service is shutting down'));
      shutdown = (async () => {
        const stopped = new Promise(done => server.close(done));
        for (const connection of connections) connection.socket.destroy();
        const closingSessions = [...sessions.values()].map(closeSession);
        await Promise.allSettled([...closingSessions, ...cleanups]);
        await stopped;
        try { const current = await lstat(socketPath); if (current.ino === socketIdentity.ino && current.dev === socketIdentity.dev) await unlink(socketPath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      })();
      return shutdown;
    },
  };
}
