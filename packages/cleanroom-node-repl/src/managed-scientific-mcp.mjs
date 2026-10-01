import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ScientificSessionMcpAdapter } from './scientific-session-mcp.mjs';
import { runStdioServer } from './cleanroom-mcp.mjs';
import { managedConfiguration, ensureManagedService, chatKey, withPrivateLock, readPrivateConnection, savePrivateConnection } from './managed-scientific-startup.mjs';

const fail = (code, message) => Object.assign(new Error(message), { code });
export class ManagedScientificMcpAdapter extends ScientificSessionMcpAdapter {
  constructor(config) { super({ cwd: config.root }); this.config = config; this.threadId = null; this.preparing = Promise.resolve(); }
  prepare(meta, command) {
    const next = this.preparing.then(async () => {
      const threadId = meta.threadId;
      if (typeof threadId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(threadId)) throw fail('CHAT_IDENTITY_REQUIRED', 'Codex host threadId metadata is required for managed scientific attachment');
      if (this.threadId && this.threadId !== threadId) throw fail('CHAT_IDENTITY_CHANGED', 'This adapter is already bound to another chat');
      this.threadId = threadId;
      // Explicit worker grants retain worker/scratch semantics. Never promote them.
      if (command?.action === 'attach' || command?.action === 'create' || this.resume) return;
      const key = chatKey(threadId);
      const path = join(this.config.connectionRoot, `${key}.json`);
      await withPrivateLock(this.config.connectionRoot, `${key}.lock`, async () => {
        const saved = await readPrivateConnection(path);
        if (saved) {
          if (saved.socketPath !== this.config.socketPath || saved.sessionId !== `chat-${key}` || ! /^[a-f0-9]{64}$/u.test(saved.capability) || saved.role !== 'owner' || typeof saved.instanceId !== 'string' || !Number.isSafeInteger(saved.epoch)) throw fail('PRIVATE_CONNECTION', 'Connection record does not match the managed chat');
          this.resume = { ...saved };
          try { await this.control({ operation: 'attach', args: { socketPath: saved.socketPath, sessionId: saved.sessionId, capability: saved.capability } }); }
          catch (error) { if (error.code === 'UNAUTHORIZED') throw fail('SESSION_RECOVERY_REQUIRED', 'Saved scientific session is unavailable; recover explicitly permits recreation. No code was executed.'); throw error; }
          if (this.resume.instanceId !== saved.instanceId || this.resume.epoch !== saved.epoch || !this.resume.kernelAlive) {
            await this.disconnect();
            throw fail('SESSION_RECOVERY_REQUIRED', 'Saved scientific epoch is unavailable or changed; explicit recovery is required. No code was executed.');
          }
        } else {
          await this.control({ operation: 'create', args: { socketPath: this.config.socketPath, sessionId: `chat-${key}` } });
          await savePrivateConnection(path, this.resume);
        }
      });
    });
    this.preparing = next.catch(() => {});
    return next;
  }
  async persistEpoch() {
    if (!this.threadId || this.resume?.role !== 'owner' || this.resume.sessionId !== `chat-${chatKey(this.threadId)}`) return;
    const key = chatKey(this.threadId);
    await withPrivateLock(this.config.connectionRoot, `${key}.lock`, () => savePrivateConnection(join(this.config.connectionRoot, `${key}.json`), this.resume));
  }
  async reset() { const result = await super.reset(); await this.persistEpoch(); return result; }
  async sessionCommand(command) { const result = await super.sessionCommand(command); if (command.action === 'recover') await this.persistEpoch(); return result; }
  metadata() { return { ...super.metadata(), attachment: 'Codex host tool-call threadId', connectionLifetime: 'private host record; live kernel requires surviving service', bookmarkLifetime: 'MCP-adapter-process; recovery selections remain explicit' }; }
}
export async function startManagedMcp(options = {}) {
  const config = await ensureManagedService(await managedConfiguration(options));
  return new ManagedScientificMcpAdapter(config);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runStdioServer({ broker: await startManagedMcp(process.argv[2] ? JSON.parse(process.argv[2]) : {}) }); }
  catch (error) { console.error(`Linked Science managed startup failed: ${error.code ?? 'STARTUP_FAILED'}`); process.exitCode = 1; }
}
