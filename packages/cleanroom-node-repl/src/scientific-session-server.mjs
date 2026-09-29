import { mkdir, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startScientificSessionService } from './scientific-session-service.mjs';
import { KernelBroker } from './cleanroom-mcp.mjs';

// Run separately from the desktop/MCP process. No daemon auto-start, capability
// persistence, socket replacement, or model provider is implicit.
const requested = process.argv[2];
const handoffRoot = process.argv[3] === '--handoff-root' ? process.argv[4] : undefined;
if (!requested || ![3,5].includes(process.argv.length) || (process.argv.length===5 && !handoffRoot?.startsWith('/'))) {
  console.error('Usage: node scientific-session-server.mjs /absolute/private-directory/session.sock [--handoff-root /absolute/private-durable-directory]');
  process.exitCode = 1;
} else {
  if (!requested.startsWith('/')) throw new Error('Socket path must be absolute');
  await mkdir(dirname(requested), { recursive: true, mode: 0o700 });
  const socketPath = resolve(await realpath(dirname(requested)), requested.split('/').at(-1));
  const cwd = fileURLToPath(new URL('../../..', import.meta.url));
  const service = await startScientificSessionService({socketPath, brokerFactory: ({sessionId}) => new KernelBroker({cwd, provider: null, ...(handoffRoot ? {handoffRoot:join(handoffRoot,createHash('sha256').update(sessionId).digest('hex'))} : {})})});
  console.log(JSON.stringify({status:'ready', socketPath, idleTtlMs:300000}));
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => {
    service.close().catch(error => { console.error(error); process.exitCode = 1; });
  });
}
