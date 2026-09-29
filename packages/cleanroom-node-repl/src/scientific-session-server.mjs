import { mkdir, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startScientificSessionService } from './scientific-session-service.mjs';
import { KernelBroker } from './cleanroom-mcp.mjs';

// Run separately from the desktop/MCP process. No daemon auto-start, capability
// persistence, socket replacement, or model provider is implicit.
const requested = process.argv[2];
const flags = process.argv.slice(3);
let handoffRoot;
let idleTtlMs = 86_400_000;
let valid = typeof requested === 'string' && requested.startsWith('/') && flags.length % 2 === 0;
const seen = new Set();
for (let i = 0; i < flags.length; i += 2) {
  const [flag, value] = flags.slice(i, i + 2);
  if (seen.has(flag)) valid = false;
  seen.add(flag);
  if (flag === '--handoff-root') { handoffRoot = value; if (!value?.startsWith('/')) valid = false; }
  else if (flag === '--idle-ttl-ms') { idleTtlMs = Number(value); if (!/^\d+$/.test(value) || !Number.isSafeInteger(idleTtlMs) || idleTtlMs < 1) valid = false; }
  else valid = false;
}
if (!valid) {
  console.error('Usage: node scientific-session-server.mjs /absolute/private-directory/session.sock [--handoff-root /absolute/private-durable-directory] [--idle-ttl-ms milliseconds]');
  process.exitCode = 1;
} else {
  await mkdir(dirname(requested), { recursive: true, mode: 0o700 });
  const socketPath = resolve(await realpath(dirname(requested)), requested.split('/').at(-1));
  const cwd = fileURLToPath(new URL('../../..', import.meta.url));
  const service = await startScientificSessionService({socketPath, idleTtlMs, brokerFactory: ({sessionId}) => new KernelBroker({cwd, provider: null, ...(handoffRoot ? {handoffRoot:join(handoffRoot,createHash('sha256').update(sessionId).digest('hex'))} : {})})});
  console.log(JSON.stringify({status:'ready', socketPath, idleTtlMs, idlePolicy:'detached-only'}));
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => {
    service.close().catch(error => { console.error(error); process.exitCode = 1; });
  });
}
