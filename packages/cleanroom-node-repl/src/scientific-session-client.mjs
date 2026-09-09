import net from 'node:net';

const MAX_FRAME_BYTES = 512 * 1024;
const fail = (code, message) => Object.assign(new Error(message), { code });

/** Connect once, then create or attach once. close/detach close only this transport.
 * create -> {sessionId, capability, epoch}; attach accepts owner or worker capability.
 * request(operation,args) sends only data; authority is retained by the server.
 */
export async function connectScientificSession({ socketPath, requestTimeoutMs = 30_000, maxPending = 32 } = {}) {
  if (typeof socketPath !== 'string' || !Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs < 1 || !Number.isSafeInteger(maxPending) || maxPending < 1) throw fail('INVALID_ARGUMENT', 'Invalid client options');
  const socket = net.createConnection(socketPath);
  const pending = new Map();
  let buffer = Buffer.alloc(0);
  let sequence = 0;
  let closed = false;
  function finish(error = fail('CONNECTION_CLOSED', 'Session transport closed')) {
    closed = true;
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(error); }
    pending.clear();
  }
  socket.on('error', finish);
  socket.on('close', () => finish());
  socket.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      const end = buffer.indexOf(10);
      if (end < 0) { if (buffer.length > MAX_FRAME_BYTES) { finish(fail('FRAME_TOO_LARGE', 'Response exceeds limit')); socket.destroy(); } return; }
      if (end > MAX_FRAME_BYTES) { finish(fail('FRAME_TOO_LARGE', 'Response exceeds limit')); socket.destroy(); return; }
      let response;
      try { response = JSON.parse(buffer.subarray(0, end).toString('utf8')); } catch { finish(fail('INVALID_RESPONSE', 'Malformed response')); socket.destroy(); return; }
      buffer = buffer.subarray(end + 1);
      if (response?.id === null && response.error) { finish(fail(response.error.code, response.error.message)); socket.destroy(); return; }
      const entry = pending.get(response?.id);
      if (!entry || (Object.hasOwn(response, 'error') === Object.hasOwn(response, 'result'))) { finish(fail('INVALID_RESPONSE', 'Invalid correlation id or response shape')); socket.destroy(); return; }
      pending.delete(response.id); clearTimeout(entry.timer);
      if (response.error) entry.reject(fail(response.error.code, response.error.message));
      else entry.resolve(response.result);
    }
  });
  await new Promise((done, reject) => {
    const timer = setTimeout(() => { socket.destroy(); reject(fail('CONNECT_TIMEOUT', 'Connection timed out')); }, requestTimeoutMs);
    socket.once('connect', () => { clearTimeout(timer); done(); });
    socket.once('error', error => { clearTimeout(timer); reject(error); });
  });
  function call(method, args = {}) {
    if (closed) return Promise.reject(fail('CONNECTION_CLOSED', 'Session transport closed'));
    if (pending.size >= maxPending) return Promise.reject(fail('CAPACITY', 'Too many pending requests'));
    let frame;
    const id = ++sequence;
    try {
      frame = JSON.stringify({ id, method, args });
      if (Buffer.byteLength(frame) > MAX_FRAME_BYTES) throw fail('FRAME_TOO_LARGE', 'Request exceeds frame limit');
    } catch (error) { return Promise.reject(error); }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { finish(fail('REQUEST_TIMEOUT', 'Session request timed out; outcome may be unknown')); socket.destroy(); }, requestTimeoutMs);
      pending.set(id, { resolve, reject, timer });
      socket.write(frame + '\n');
    });
  }
  const close = () => { finish(); socket.destroy(); };
  return Object.freeze({
    create: (args = {}) => call('create', args),
    attach: args => call('attach', args),
    execute: (code, options = {}) => call('execute', { code, options }),
    reset: () => call('reset'),
    addModuleDir: path => call('addModuleDir', { path }),
    grant: args => call('grant', args),
    request: (operation, args = {}) => call('request', { operation, args }),
    status: () => call('status'),
    closeSession: () => call('closeSession'),
    detach: close,
    close,
  });
}
