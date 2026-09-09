import { mkdir, realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startScientificSessionService } from './scientific-session-service.mjs';
import { KernelBroker } from './cleanroom-mcp.mjs';

// Run separately from the desktop/MCP process. No daemon auto-start, capability
// persistence, socket replacement, or model provider is implicit.
const requested = process.argv[2];
if (!requested || process.argv.length !== 3) {
  console.error('Usage: node scientific-session-server.mjs /absolute/private-directory/session.sock');
  process.exitCode = 1;
} else {
  if (!requested.startsWith('/')) throw new Error('Socket path must be absolute');
  await mkdir(dirname(requested), { recursive: true, mode: 0o700 });
  const socketPath = resolve(await realpath(dirname(requested)), requested.split('/').at(-1));
  const cwd = fileURLToPath(new URL('../../..', import.meta.url));
  const service = await startScientificSessionService({socketPath, brokerFactory: () => new KernelBroker({cwd, provider: null})});
  console.log(JSON.stringify({status:'ready', socketPath, idleTtlMs:300000}));
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => {
    service.close().catch(error => { console.error(error); process.exitCode = 1; });
  });
}
