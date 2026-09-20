import { Worker } from 'node:worker_threads';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

const MiB = 1024 * 1024;
const DEFAULTS = Object.freeze({
  timeoutMs: 10_000, maxInputBytes: MiB, maxRulesBytes: 256 * 1024,
  maxRules: 1000, maxOutputBytes: MiB, maxProofBytes: MiB,
  wasmMemoryMiB: 128, workerHeapMiB: 64,
});
const CEILINGS = Object.freeze({
  timeoutMs: 60_000, maxInputBytes: 8 * MiB, maxRulesBytes: MiB,
  maxRules: 10_000, maxOutputBytes: 8 * MiB, maxProofBytes: 8 * MiB,
  wasmMemoryMiB: 256, workerHeapMiB: 128,
});
const engine = Object.freeze({ name: 'eyeron', version: '0.5.13',
  sha256: 'd97a3e9e35d4c12960a46570eb20ab32287ef8d07e88dc7aa04c0c1b70fbd88d' });
const error = (code, message) => Object.assign(new Error(message), { code });
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function boundedLimits(value, base = DEFAULTS) {
  if (!record(value)) throw error('REASONING_INVALID_LIMITS', 'limits must be an object');
  const result = { ...base };
  for (const key of Reflect.ownKeys(value)) {
    const minimum = key === 'wasmMemoryMiB' ? 2 : key === 'workerHeapMiB' ? 16 : 1;
    if (!Object.hasOwn(CEILINGS, key) || !Number.isSafeInteger(value[key]) ||
        value[key] < minimum || value[key] > CEILINGS[key]) {
      throw error('REASONING_INVALID_LIMITS', `Invalid reasoning limit: ${String(key)}`);
    }
    result[key] = value[key];
  }
  return result;
}

/**
 * Private host adapter, not a rule-accessible module loader. modulePath identifies
 * the installed pkg/eyeron.js; only its sibling pinned Wasm is read/executed.
 * All methods are async except construction. One in-flight operation per adapter;
 * the caller owns aggregate concurrency across adapters. No compiled/data cache.
 * Limits are per run, including both passes when proof is requested. Heap limits
 * bound V8, the rewritten Wasm declaration bounds linear memory; neither is an
 * exact process RSS ceiling (code, stacks and bounded message copies add overhead).
 */
export function createEyeronReasoner(options = {}) {
  if (!record(options)) throw error('REASONING_INVALID_OPTIONS', 'options must be an object');
  const modulePath = options.modulePath ?? process.env.LINKED_SCIENCE_EYERON_MODULE ??
    resolve(homedir(), '.local/share/linked-science/eyeron-v0.5.13/pkg/eyeron.js');
  if (typeof modulePath !== 'string' || !modulePath.length) {
    throw error('REASONING_INVALID_OPTIONS', 'modulePath must be a filesystem path');
  }
  const defaults = boundedLimits(options.limits === undefined ? {} : options.limits);
  let closed = false;
  let active = null;

  async function execute(request, limits, signal) {
    if (closed) throw error('REASONING_CLOSED', 'Reasoner is closed');
    if (signal && (typeof signal.addEventListener !== 'function' || typeof signal.aborted !== 'boolean')) {
      throw error('REASONING_INVALID_INPUT', 'signal must be an AbortSignal');
    }
    if (signal?.aborted) throw error('REASONING_CANCELLED', 'Reasoning cancelled');
    if (active) throw error('REASONING_BUSY', 'Reasoner already has an active operation');
    const started = performance.now();
    return new Promise((resolveRun, rejectRun) => {
      let worker;
      try {
        worker = new Worker(new URL('./eyeron-reasoning-worker.mjs', import.meta.url), {
          workerData: { ...request, modulePath: resolve(modulePath), limits, engine },
          // Do not inherit loaders, --input-type, or arbitrary parent startup hooks.
          execArgv: [], env: {},
          resourceLimits: { maxOldGenerationSizeMb: limits.workerHeapMiB,
            maxYoungGenerationSizeMb: 8, stackSizeMb: 4 },
        });
      } catch {
        rejectRun(error('REASONING_FAILED', 'Could not start isolated reasoning worker'));
        return;
      }
      let settled = false;
      let timer;
      const finish = (failure, value) => {
        if (settled) return active?.done;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        const done = worker.terminate().catch(() => {}).then(() => {
          active = null;
          if (failure) rejectRun(failure);
          else resolveRun(request.operation === 'probe' ? value : {
            ...value, engine: { ...engine, transformedSha256: value.engine.transformedSha256 },
            complete: true, limits: { ...limits },
            elapsedMs: performance.now() - started,
          });
        });
        active.done = done;
        return done;
      };
      const cancel = () => finish(error('REASONING_CANCELLED', 'Reasoning cancelled'));
      active = { finish, done: null };
      worker.on('message', message => {
        if (message?.error) {
          finish(error(message.error.code, message.error.message));
        } else if (message?.result && (request.operation === 'probe' ||
            (typeof message.result.derived === 'string' &&
             (message.result.proof === null || typeof message.result.proof === 'string')))) {
          finish(null, message.result);
        } else finish(error('REASONING_FAILED', 'Malformed worker response'));
      });
      worker.on('error', err => finish(error(
        err.code === 'ERR_WORKER_OUT_OF_MEMORY' ? 'REASONING_MEMORY_LIMIT' : 'REASONING_FAILED',
        'Isolated reasoning worker failed')));
      worker.on('exit', () => finish(error('REASONING_FAILED', 'Reasoning worker exited without a result')));
      timer = setTimeout(() => finish(error('REASONING_TIMEOUT', 'Reasoning deadline exceeded')), limits.timeoutMs);
      signal?.addEventListener('abort', cancel, { once: true });
      if (signal?.aborted) cancel();
    });
  }

  return Object.freeze({
    async capabilities() {
      const description = {
        engine: { ...engine }, inputFormat: 'N-Triples', graphPolicy: 'default-only',
        rulesFormat: 'N3', outputFormat: 'Turtle', proofFormat: 'N3',
        deterministic: true, hostIO: false, clock: 'rejected',
        builtinProfile: 'deterministic-n3-v1',
        profileRestrictions: ['No IO, imports, clocks, log:outputString or log:query',
          'No log:uri, log:parsedAsN3 or dynamic unquote; only enumerated SWAP builtins',
          'Rules must also parse with N3.js; reserved builtin IRIs rejected in all input positions'],
        memoryPolicy: 'bounded-wasm-linear-memory-and-worker-heap',
        limits: { ...defaults }, defaults: { ...defaults }, ceilings: { ...CEILINGS },
      };
      try {
        const probe = await execute({ operation: 'probe' }, defaults);
        return { ...description, engine: probe.engine, available: true };
      } catch (err) {
        return { ...description, available: false, code: err.code, reason: err.message };
      }
    },
    async run(request, control = {}) {
      if (!record(control)) throw error('REASONING_INVALID_INPUT', 'Expected run control options');
      const { signal } = control;
      if (!record(request) || typeof request.data !== 'string' || typeof request.rules !== 'string' ||
          (request.proof !== undefined && typeof request.proof !== 'boolean')) {
        throw error('REASONING_INVALID_INPUT', 'Expected data and rules strings and an optional boolean proof');
      }
      const limits = boundedLimits(request.limits === undefined ? {} : request.limits, defaults);
      if (Buffer.byteLength(request.data, 'utf8') > limits.maxInputBytes) {
        throw error('REASONING_INPUT_TOO_LARGE', 'Data exceeds maxInputBytes');
      }
      if (Buffer.byteLength(request.rules, 'utf8') > limits.maxRulesBytes) {
        throw error('REASONING_RULES_TOO_LARGE', 'Rules exceed maxRulesBytes');
      }
      return execute({ operation: 'run', data: request.data, rules: request.rules,
        proof: request.proof ?? false }, limits, signal);
    },
    async close() {
      closed = true;
      if (active) await (active.done ?? active.finish(error('REASONING_CLOSED', 'Reasoner is closed')));
    },
  });
}
