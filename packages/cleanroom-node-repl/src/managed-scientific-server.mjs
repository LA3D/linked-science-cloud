import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { startScientificSessionService } from './scientific-session-service.mjs';
import { KernelBroker } from './cleanroom-mcp.mjs';
import { managedConfiguration, serviceIdentity, privateDirectory } from './managed-scientific-startup.mjs';

try {
  const requested = JSON.parse(process.argv[2]);
  const config = await managedConfiguration(requested);
  if (config.fingerprint !== requested.fingerprint) throw new Error('Runtime changed during startup');
  config.handoffRoot = await privateDirectory(config.handoffRoot);
  const service = await startScientificSessionService({ socketPath: config.socketPath, serviceInfo: { ...serviceIdentity(config), pid: process.pid }, brokerFactory: ({ sessionId }) => new KernelBroker({ cwd: config.root, provider: null, handoffRoot: join(config.handoffRoot, createHash('sha256').update(sessionId).digest('hex')) }) });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { service.close().catch(() => { process.exitCode = 1; }); });
} catch (error) { console.error(`Managed scientific service failed: ${error.code ?? 'STARTUP_FAILED'}`); process.exitCode = 1; }
