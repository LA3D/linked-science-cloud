import { mkdir, lstat, realpath, readFile, readdir, writeFile, rename, rm, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { connectScientificSession } from './scientific-session-client.mjs';
import { assertLinkedScienceProjectManifest } from '../../../lib/linked-science-project-identity.mjs';

const fail = (code, message) => Object.assign(new Error(message), { code });
const hash = value => createHash('sha256').update(value).digest('hex');
export const MANAGED_PROTOCOL = 1;
export const checkoutRoot = fileURLToPath(new URL('../../..', import.meta.url));

// Never repair permissions or remove an occupied socket/store behind another host.
export async function privateDirectory(path) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink() || info.uid !== process.getuid() || (info.mode & 0o777) !== 0o700) throw fail('PRIVATE_DIRECTORY', 'Managed directory must be user-owned, mode 0700, and not a symlink');
  return realpath(path);
}

export async function managedConfiguration({ root = checkoutRoot, socketPath, handoffRoot, connectionRoot } = {}) {
  root = await realpath(root);
  assertLinkedScienceProjectManifest(JSON.parse(await readFile(join(root, 'package.json'), 'utf8')));
  const checkoutKey = hash(root).slice(0, 16);
  const store = join(homedir(), 'Library/Application Support/LinkedScience/managed', checkoutKey);
  socketPath ??= `/private/tmp/linked-science-managed-${process.getuid()}-${checkoutKey}/session.sock`;
  handoffRoot ??= join(store, 'handoff');
  connectionRoot ??= join(store, 'connections');
  if (![socketPath, handoffRoot, connectionRoot].every(p => typeof p === 'string' && p.startsWith('/'))) throw fail('INVALID_CONFIGURATION', 'Managed paths must be absolute');
  // Source identity rejects reuse after runtime changes, including uncommitted edits.
  const digest = createHash('sha256');
  async function add(path) {
    const info = await lstat(join(root, path));
    if (info.isSymbolicLink()) throw fail('CHECKOUT_IDENTITY', 'Runtime source must not escape through symlinks');
    if (info.isDirectory()) { for (const name of (await readdir(join(root, path))).sort()) await add(join(path, name)); }
    else if (/\.(mjs|json)$/u.test(path)) { digest.update(path); digest.update(await readFile(join(root, path))); }
  }
  for (const path of ['lib', 'packages/cleanroom-node-repl/src', 'package.json', 'package-lock.json']) await add(path);
  return { root, socketPath, handoffRoot, connectionRoot, fingerprint: digest.digest('hex') };
}

export async function withPrivateLock(directory, name, operation, { timeoutMs = 6500 } = {}) {
  const lock = join(directory, name);
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try { await mkdir(lock, { mode: 0o700 }); break; }
    catch (error) { if (error.code !== 'EEXIST') throw error; if (Date.now() >= deadline) throw fail('STARTUP_LOCK_TIMEOUT', 'Managed startup lock is busy or abandoned; inspect it explicitly'); await delay(40); }
  }
  try { return await operation(); } finally { await rm(lock, { recursive: true }); }
}

export function serviceIdentity(config) {
  return { protocol: MANAGED_PROTOCOL, checkout: config.root, fingerprint: config.fingerprint, handoffRoot: config.handoffRoot, idleTtlMs: 86_400_000, idlePolicy: 'detached-only' };
}

export async function ensureManagedService(configuration, { timeoutMs = 6500 } = {}) {
  const config = { ...configuration };
  const directory = await privateDirectory(dirname(config.socketPath));
  config.socketPath = join(directory, config.socketPath.split('/').at(-1));
  config.handoffRoot = await privateDirectory(config.handoffRoot);
  config.connectionRoot = await privateDirectory(config.connectionRoot);
  const expected = serviceIdentity(config);
  async function probe() {
    let info;
    try { info = await lstat(config.socketPath); } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
    if (!info.isSocket() || info.uid !== process.getuid() || (info.mode & 0o777) !== 0o600) throw fail('OCCUPIED_SOCKET', 'Managed socket is occupied or has unsafe permissions; it was not replaced');
    let client;
    try {
      client = await connectScientificSession({ socketPath: config.socketPath, requestTimeoutMs: 400 });
      const actual = await client.serviceInfo();
      if (Object.entries(expected).some(([key, value]) => actual?.[key] !== value)) throw fail('INCOMPATIBLE_SERVICE', 'Occupied service belongs to a different checkout, runtime revision, or handoff configuration');
      return true;
    } catch (error) { throw fail('INCOMPATIBLE_SERVICE', `Occupied service cannot be safely reused (${error.code ?? 'UNKNOWN'}); it was not replaced`); }
    finally { client?.close(); }
  }
  if (await probe()) return config;
  await withPrivateLock(directory, 'startup.lock', async () => {
    if (await probe()) return;
    // Detach from stdio/desktop lifetime. stdout is discarded; diagnostics use stderr.
    const log = await open(join(directory, 'service.log'), constants.O_WRONLY | constants.O_CREAT | constants.O_APPEND | constants.O_NOFOLLOW, 0o600);
    let child;
    try {
      const info = await log.stat();
      if (!info.isFile() || info.uid !== process.getuid() || (info.mode & 0o777) !== 0o600 || info.size > 65536) throw fail('PRIVATE_LOG', 'Managed diagnostic log must be private and bounded');
      child = spawn(process.execPath, [join(config.root, 'packages/cleanroom-node-repl/src/managed-scientific-server.mjs'), JSON.stringify(config)], { cwd: config.root, detached: true, stdio: ['ignore', 'ignore', log.fd], env: { PATH: process.env.PATH, HOME: homedir(), TMPDIR: process.env.TMPDIR } });
    } finally { await log.close(); }
    let launchError;
    child.once('error', error => { launchError = error; });
    child.unref();
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (launchError || child.exitCode !== null || child.signalCode !== null) throw fail('SERVICE_START_FAILED', 'Managed scientific service could not start');
      // The server publishes socket mode before readiness; wait for its handshake.
      try { if (await probe()) return; } catch (error) { if (Date.now() >= deadline) throw error; }
      if (Date.now() >= deadline) throw fail('SERVICE_START_TIMEOUT', 'Managed scientific service readiness timed out');
      await delay(40);
    }
  }, { timeoutMs });
  return config;
}

export async function readPrivateConnection(path) {
  let info;
  try { info = await lstat(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (!info.isFile() || info.isSymbolicLink() || info.uid !== process.getuid() || (info.mode & 0o777) !== 0o600 || info.size > 4096) throw fail('PRIVATE_CONNECTION', 'Connection record must be a private regular file');
  return JSON.parse(await readFile(path, 'utf8'));
}
export async function savePrivateConnection(path, connection) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, JSON.stringify(connection), { mode: 0o600, flag: 'wx' }); await rename(temporary, path); }
  finally { await rm(temporary, { force: true }); }
}
export const chatKey = threadId => hash(threadId);
