import { createEyeronReasoner } from "./eyeron-reasoning.mjs";
import { fork } from "node:child_process";
import { randomBytes } from "node:crypto";
import { realpathSync } from "node:fs";
import { stat } from "node:fs/promises";
import { basename, dirname, resolve, sep } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";

import { PeekRegistry } from "./peek-runtime.mjs";
import { MediatedTraversalBroker } from "./mediated-traversal.mjs";
import { ResultSpoolRegistry } from "./result-spool.mjs";

export const SERVER_NAME = "cleanroom-node-repl";
export const SERVER_VERSION = "0.6.0";

const KERNEL_PATH = fileURLToPath(new URL("./repl-kernel-child.mjs", import.meta.url));
const KERNEL_ROOT = dirname(KERNEL_PATH);
const MAX_REQUEST_BYTES = 512 * 1024;
const MAX_CODE_BYTES = 256 * 1024;
const DEFAULT_MAX_OUTPUT_BYTES = 32 * 1024;
const MAX_OUTPUT_BYTES = 256 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;
// The kernel heap is an explicit physical ceiling. The Linked Science facade
// derives its resident-graph quotas from the heap it actually receives, so a
// larger default here raises the advertised symbolic capacity rather than
// letting a resident graph outgrow the process.
const DEFAULT_MAX_OLD_SPACE_MB = 1024;
const STDERR_HEAD_BYTES = 2 * 1024;
const STDERR_TAIL_BYTES = 2 * 1024;
const STDERR_SEAM_CHARS = 256;
const HEAP_EXHAUSTION_PATTERN = /Reached heap limit|heap out of memory|FATAL ERROR: .*(?:Allocation failed|OOM|Committing semi space failed)/iu;

// V8 prints one fatal-error line and then a long native backtrace, so the
// classification is latched as stderr arrives rather than read from a tail.
function createStderrObserver() {
  const state = { head: "", tail: "", seam: "", heapExhausted: false };
  return {
    state,
    observe(chunk) {
      const text = chunk.toString("utf8");
      if (!state.heapExhausted && HEAP_EXHAUSTION_PATTERN.test(`${state.seam}${text}`)) state.heapExhausted = true;
      state.seam = `${state.seam}${text}`.slice(-STDERR_SEAM_CHARS);
      if (state.head.length < STDERR_HEAD_BYTES) state.head = `${state.head}${text}`.slice(0, STDERR_HEAD_BYTES);
      state.tail = `${state.tail}${text}`.slice(-STDERR_TAIL_BYTES);
    },
  };
}

function kernelExitError({ code, signal, stderr, maxOldSpaceMb, cwd }) {
  const scrub = value => value.replaceAll(cwd, "<cwd>").trim();
  const head = scrub(stderr.head);
  const tail = scrub(stderr.tail);
  const heapExhausted = stderr.heapExhausted;
  const error = new Error(heapExhausted
    ? `Kernel exceeded its ${maxOldSpaceMb} MB heap and was replaced; every binding, handle, RLM context, and stored result from the previous epoch is lost`
    : `Kernel exited (${code ?? signal ?? "unknown"}) and was replaced; every binding, handle, RLM context, and stored result from the previous epoch is lost`);
  const repair = {
    kind: "cleanroom-kernel-repair",
    scope: heapExhausted ? "kernel-heap" : "kernel-exit",
    epochLost: true,
    allowed: true,
    sameCall: false,
    ...(heapExhausted ? { heapLimitMb: maxOldSpaceMb } : {}),
    action: heapExhausted
      ? "Bootstrap again in the fresh kernel, keep resident graphs within linkedScience.capabilities().budgetPlanes.residency, prefer symbolic subqueries over whole-graph copies, and treat every previous handle as stale."
      : "Bootstrap again in the fresh kernel and treat every previous handle as stale.",
  };
  return Object.assign(error, {
    code: heapExhausted ? "KERNEL_OOM" : "KERNEL_EXIT",
    stage: "kernel-lifecycle",
    retryable: false,
    repair,
    receipt: {
      kind: "cleanroom-kernel-exit",
      exitCode: code ?? null,
      signal: signal ?? null,
      heapLimitMb: maxOldSpaceMb,
      heapExhausted,
      ...(head ? { stderrHead: head } : {}),
      ...(tail && tail !== head ? { stderrTail: tail } : {}),
      repair,
    },
  });
}

const TOOLS = Object.freeze([
  {
    name: "js",
    description: "Execute JavaScript in a persistent, raw-network-denied RLM control environment with top-level await. Bindings and external context persist until js_reset; use var for redeclarable state. Use dynamic imports, nodeRepl.write(value) for bounded output, nodeRepl.rlm for structured context and optional host-mediated recursion, nodeRepl.peek for the PEEK-compatible orientation map, and linkedScience for symbolic RDF/JS and Communica work.",
    inputSchema: {
      type: "object",
      required: ["code"],
      properties: {
        code: { type: "string", description: "JavaScript code to execute with top-level await." },
        timeout_ms: { type: "integer", minimum: 1, maximum: MAX_TIMEOUT_MS },
        max_output_bytes: { type: "integer", minimum: 256, maximum: MAX_OUTPUT_BYTES, description: "Aggregate text-output budget for this evaluation. Defaults to 32768 bytes." },
        title: { type: "string", maxLength: 200 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "js_reset",
    description: "Reset the JavaScript kernel and clear bindings plus epoch-owned result spools. Registered module directories and broker-owned PEEK maps survive.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "js_add_node_module_dir",
    description: "Add an absolute node_modules directory for dynamic package imports. The directory remains available after js_reset.",
    inputSchema: {
      type: "object",
      required: ["path"],
      properties: { path: { type: "string" } },
      additionalProperties: false,
    },
  },
]);

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id, code, message = "Request failed") {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function errorToolResult(error) {
  const boundedJson = (value, maxBytes) => {
    if (value === undefined) return undefined;
    try {
      const text = JSON.stringify(value);
      return Buffer.byteLength(text, "utf8") <= maxBytes ? JSON.parse(text) : undefined;
    } catch { return undefined; }
  };
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        ok: false,
        error: {
          code: typeof error?.code === "string" ? error.code.slice(0, 96) : "REPL_ERROR",
          name: typeof error?.name === "string" ? error.name.slice(0, 96) : "Error",
          message: typeof error?.message === "string" ? error.message.slice(0, 2_000) : "REPL operation failed",
          ...(typeof error?.stage === "string" ? { stage: error.stage.slice(0, 96) } : {}),
          ...(typeof error?.recoveryDocument === "string" ? { recoveryDocument: error.recoveryDocument.slice(0, 96) } : {}),
          ...(typeof error?.retryable === "boolean" ? { retryable: error.retryable } : {}),
          ...(boundedJson(error?.repair, 16_000) ? { repair: boundedJson(error.repair, 16_000) } : {}),
          ...(boundedJson(error?.receipt, 64_000) ? { receipt: boundedJson(error.receipt, 64_000) } : {}),
        },
      }),
    }],
    isError: true,
  };
}

function safeChildEnvironment(providerConfigured) {
  const allowed = ["HOME", "LANG", "LC_ALL", "PATH", "TMPDIR", "TZ"];
  const env = Object.fromEntries(allowed.filter((key) => process.env[key] !== undefined).map((key) => [key, process.env[key]]));
  env.CLEANROOM_RLM_PROVIDER = providerConfigured ? "configured" : "unavailable";
  return env;
}

function within(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

export class KernelBroker {
  constructor({
    cwd = process.cwd(),
    provider = null,
    peekPolicy = null,
    checkpointRoot = null,
    maxOldSpaceMb = DEFAULT_MAX_OLD_SPACE_MB,
    traversalBroker,
    traversalOptions,
    resultSpool,
    resultSpoolOptions,
    bootstrapLinkedScience = true,
    sessionControl = null,
    reasoner, reasoningOptions,
  } = {}) {
    this.cwd = realpathSync(resolve(cwd));
    this.provider = provider;
    this.reasoner = reasoner ?? createEyeronReasoner(reasoningOptions);
    this.reasoningControllers = new Map();
    this.sessionControl = sessionControl;
    this.checkpointRoot = checkpointRoot ? resolve(checkpointRoot) : null;
    this.maxOldSpaceMb = maxOldSpaceMb;
    this.bootstrapLinkedScience = bootstrapLinkedScience && this.cwd === realpathSync(resolve(KERNEL_ROOT, '../../..'));
    this.peek = new PeekRegistry({ policy: peekPolicy });
    this.traversal = traversalBroker ?? new MediatedTraversalBroker(traversalOptions);
    this.resultSpool = resultSpool ?? new ResultSpoolRegistry(resultSpoolOptions);
    this.moduleRoots = [];
    this.child = null;
    this.ready = null;
    this.pending = new Map();
    this.sequence = 0;
    this.epoch = 0;
    this.hostCapabilityToken = null;
    this.queue = Promise.resolve();
  }

  _enqueue(operation) {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => {});
    return next;
  }

  async _spawn() {
    if (this.child) return this.ready;
    this.epoch += 1;
    const kernelEpoch = this.epoch;
    const hostCapabilityToken = randomBytes(32).toString("hex");
    this.hostCapabilityToken = hostCapabilityToken;
    const child = fork(KERNEL_PATH, [], {
      cwd: this.cwd,
      env: { ...safeChildEnvironment(Boolean(this.provider)), CLEANROOM_LINKED_SCIENCE_BOOTSTRAP: this.bootstrapLinkedScience ? 'enabled' : 'disabled' },
      execArgv: [
        `--max-old-space-size=${this.maxOldSpaceMb}`,
        "--permission",
        `--allow-fs-read=${this.cwd}`,
        `--allow-fs-read=${KERNEL_ROOT}`,
      ],
      serialization: "advanced",
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    });
    this.child = child;
    const stderr = createStderrObserver();
    child.stderr?.on("data", stderr.observe);
    this.ready = new Promise((resolveReady, rejectReady) => {
      const onError = (error) => rejectReady(error);
      child.once("error", onError);
      child.on("message", (message) => {
        if (message?.type === "ready") {
          child.off("error", onError);
          child.send({ type: "host_capability_init", token: hostCapabilityToken }, (error) => {
            if (error) rejectReady(error);
            else resolveReady();
          });
        } else if (message?.type === "response") {
          const pending = this.pending.get(message.id);
          if (!pending) return;
          this.pending.delete(message.id);
          if (message.ok) pending.resolve(message.value);
          else pending.reject(Object.assign(new Error(message.error?.message ?? "Kernel operation failed"), message.error));
        } else if (message?.type === "host_call") {
          this._handleHostCall(message, child).catch(() => {});
        }
      });
    });
    child.once("exit", () => {
      const owner = { token: hostCapabilityToken, epoch: kernelEpoch };
      this.reasoningControllers.get(child)?.abort();
      this.reasoningControllers.delete(child);
      this.traversal.abortOwner(owner, "kernel-exit");
      this.resultSpool.releaseOwner(owner);
      if (this.child === child) this.child = null;
    });
    // `close` follows `exit` once stdio has drained, so the stderr tail that
    // classifies a heap-exhaustion abort is complete before callers hear of it.
    child.once("close", (code, signal) => {
      const error = kernelExitError({ code, signal, stderr: stderr.state, maxOldSpaceMb: this.maxOldSpaceMb, cwd: this.cwd });
      // Only this kernel's requests are rejected; a replacement kernel may
      // already have its own in flight by the time the old stdio drains.
      for (const [ id, pending ] of this.pending) {
        if (pending.child !== child) continue;
        this.pending.delete(id);
        pending.reject(error);
      }
    });
    await this.ready;
    for (const root of this.moduleRoots) await this._send("add_root", { path: root });
  }

  async _send(type, payload) {
    await this._spawn();
    const id = ++this.sequence;
    return new Promise((resolveRequest, rejectRequest) => {
      this.pending.set(id, { resolve: resolveRequest, reject: rejectRequest, child: this.child });
      this.child.send({ type, id, ...payload }, (error) => {
        if (!error) return;
        this.pending.delete(id);
        rejectRequest(error);
      });
    });
  }

  async _handleHostCall(message, child) {
    if (child !== this.child || message.token !== this.hostCapabilityToken) return;
    const respond = (ok, value, error) => {
      if (child?.connected) child.send({ type: "host_result", id: message.id, ok, value, error });
    };
    try {
      const { method, args = {} } = message;
      let value;
      if (method === 'scientificSession.control') {
        if (!this.sessionControl) throw Object.assign(new Error('Scientific session adapter is not connected'), {code:'SESSION_UNAVAILABLE'});
        value = await this.sessionControl(args);
      }
      else if (method === "reasoning.capabilities") value = await this.reasoner.capabilities();
      else if (method === "reasoning.run") {
        let controller = this.reasoningControllers.get(child);
        if (!controller) { controller = new AbortController(); this.reasoningControllers.set(child, controller); }
        value = await this.reasoner.run(args, { signal: controller.signal });
      }
      else if (method === "rlm.query") value = await this._recursiveQuery(args);
      else if (method === "traversal.capabilities") value = this.traversal.capabilities();
      else if (method === "traversal.begin") value = this.traversal.beginTraversal(args.budgets, { token: this.hostCapabilityToken, epoch: this.epoch });
      else if (method === "traversal.request") value = await this.traversal.request(args, { token: this.hostCapabilityToken, epoch: this.epoch });
      else if (method === "traversal.snapshot") value = this.traversal.snapshotTraversal(args, { token: this.hostCapabilityToken, epoch: this.epoch });
      else if (method === "traversal.finish") value = this.traversal.finishTraversal(args, { token: this.hostCapabilityToken, epoch: this.epoch });
      else if (method === "traversal.abort") value = this.traversal.abortTraversal(args, { token: this.hostCapabilityToken, epoch: this.epoch });
      else if (method === "results.capabilities") value = this.resultSpool.capabilities();
      else if (method === "results.begin") value = this.resultSpool.begin(args, { token: this.hostCapabilityToken, epoch: this.epoch });
      else if (method === "results.append") value = this.resultSpool.append(args, { token: this.hostCapabilityToken, epoch: this.epoch });
      else if (method === "results.commit") value = this.resultSpool.commit(args, { token: this.hostCapabilityToken, epoch: this.epoch });
      else if (method === "results.page") value = this.resultSpool.page(args, { token: this.hostCapabilityToken, epoch: this.epoch });
      else if (method === "results.match") value = this.resultSpool.match(args, { token: this.hostCapabilityToken, epoch: this.epoch });
      else if (method === "results.count") value = this.resultSpool.count(args, { token: this.hostCapabilityToken, epoch: this.epoch });
      else if (method === "results.abort") value = this.resultSpool.abort(args, { token: this.hostCapabilityToken, epoch: this.epoch });
      else if (method === "peek.begin") value = this.peek.begin(args.contextId, args.options);
      else if (method === "peek.current") value = this.peek.current(args.contextId);
      else if (method === "peek.edit") value = this.peek.edit(args.contextId, args.edits);
      else if (method === "peek.commit") value = await this.peek.commit(args.contextId, args.observableTrajectory);
      else if (method === "peek.clear") value = this.peek.clear(args.contextId);
      else if (method === "peek.checkpoint") value = await this._checkpoint(args.contextId, args.path);
      else if (method === "peek.restore") value = await this._restore(args.path);
      else throw Object.assign(new Error("Unknown host capability"), { code: "UNKNOWN_HOST_CAPABILITY" });
      respond(true, value);
    } catch (error) {
      const receipt = typeof error?.receipt?.kind === "string" && error.receipt.kind.startsWith("linked-science-traversal-") &&
        Buffer.byteLength(JSON.stringify(error.receipt), "utf8") <= 64_000
        ? error.receipt
        : undefined;
      respond(false, undefined, {
        code: typeof error?.code === "string" ? error.code.slice(0, 96) : "HOST_CALL_ERROR",
        name: typeof error?.name === "string" ? error.name.slice(0, 96) : "Error",
        message: typeof error?.message === "string" ? error.message.slice(0, 2_000) : "Host call failed",
        ...(receipt ? { receipt } : {}),
      });
    }
  }

  async _recursiveQuery({ prompt, context, options = {} }) {
    if (!this.provider) {
      throw Object.assign(new Error("No recursive model provider is configured; continue with local external-context operations or use a provider-enabled host"), { code: "RLM_PROVIDER_UNAVAILABLE" });
    }
    const depth = Number.isInteger(options.depth) ? options.depth : 1;
    if (depth < 1 || depth > 4) throw Object.assign(new Error("Recursive depth limit exceeded"), { code: "RLM_DEPTH_LIMIT" });
    const timeoutMs = Number.isInteger(options.timeoutMs) ? Math.min(Math.max(options.timeoutMs, 100), 60_000) : 30_000;
    const budget = {
      depth,
      maxOutputTokens: Number.isInteger(options.maxOutputTokens) ? Math.min(Math.max(options.maxOutputTokens, 1), 8_192) : 2_048,
      maxOutputBytes: Number.isInteger(options.maxOutputBytes) ? Math.min(Math.max(options.maxOutputBytes, 256), 256 * 1024) : 64 * 1024,
      timeoutMs,
    };
    let timer;
    const timeout = new Promise((_resolve, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error("Recursive call timed out"), { code: "RLM_TIMEOUT" })), timeoutMs);
    });
    try {
      const result = await Promise.race([this.provider({ prompt, context, budget }), timeout]);
      const text = typeof result === "string" ? result : JSON.stringify(result);
      if (Buffer.byteLength(text, "utf8") > budget.maxOutputBytes) {
        throw Object.assign(new Error("Recursive output exceeded its byte budget"), { code: "RLM_OUTPUT_LIMIT" });
      }
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  _allowedCheckpoint(path) {
    if (!this.checkpointRoot) throw Object.assign(new Error("PEEK checkpoints are disabled"), { code: "CHECKPOINT_DISABLED" });
    if (typeof path !== "string" || !path.startsWith("/")) throw Object.assign(new Error("Checkpoint path must be absolute"), { code: "INVALID_CHECKPOINT_PATH" });
    const candidate = resolve(path);
    if (!within(this.checkpointRoot, candidate)) throw Object.assign(new Error("Checkpoint path is outside the configured root"), { code: "CHECKPOINT_PATH_DENIED" });
    return candidate;
  }

  _checkpoint(contextId, path) {
    return this.peek.checkpoint(contextId, this._allowedCheckpoint(path));
  }

  _restore(path) {
    return this.peek.restore(this._allowedCheckpoint(path));
  }

  async _terminate() {
    const child = this.child;
    if (!child) return;
    const owner = { token: this.hostCapabilityToken, epoch: this.epoch };
    this.child = null;
    this.reasoningControllers.get(child)?.abort();
    this.reasoningControllers.delete(child);
    this.hostCapabilityToken = null;
    this.traversal.abortOwner(owner, "kernel-replaced");
    this.resultSpool.releaseOwner(owner);
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise((resolveExit) => {
        child.once("exit", resolveExit);
        child.kill("SIGKILL");
      });
    }
  }

  execute(code, { timeoutMs = DEFAULT_TIMEOUT_MS, maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES, requestMeta = {} } = {}) {
    return this._enqueue(async () => {
      let timer;
      const timeout = new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error("JavaScript execution timed out; the kernel was replaced"), { code: "KERNEL_TIMEOUT" })), timeoutMs);
      });
      try {
        return await Promise.race([this._send("eval", {
          code,
          requestMeta,
          maxOutputBytes,
        }), timeout]);
      } catch (error) {
        if (error?.code === "KERNEL_TIMEOUT") await this._terminate();
        throw error;
      } finally {
        clearTimeout(timer);
      }
    });
  }

  reset() {
    return this._enqueue(async () => {
      await this._terminate();
      await this._spawn();
      return { ok: true, epoch: this.epoch };
    });
  }

  addModuleDir(path) {
    return this._enqueue(async () => {
      if (typeof path !== "string" || !path.startsWith("/") || basename(path) !== "node_modules") {
        throw Object.assign(new Error("Path must be an absolute node_modules directory"), { code: "INVALID_MODULE_DIR" });
      }
      const root = resolve(path);
      if (!within(this.cwd, root)) {
        throw Object.assign(new Error("Module path is outside the worker root"), { code: "MODULE_DIR_OUTSIDE_WORKER_ROOT" });
      }
      const metadata = await stat(root);
      if (!metadata.isDirectory()) throw Object.assign(new Error("Module path is not a directory"), { code: "INVALID_MODULE_DIR" });
      if (!this.moduleRoots.includes(root)) this.moduleRoots.push(root);
      if (this.child) await this._send("add_root", { path: root });
      return { ok: true, path: root, moduleDirCount: this.moduleRoots.length };
    });
  }

  attestFilesystemBoundary({ workerRoot, evaluatorRoot, probePath } = {}) {
    return this._enqueue(async () => {
      const worker = realpathSync(resolve(workerRoot ?? ""));
      const evaluator = realpathSync(resolve(evaluatorRoot ?? ""));
      const probe = realpathSync(resolve(probePath ?? ""));
      if (worker !== this.cwd) throw Object.assign(new Error("Worker root does not match the broker kernel root"), { code: "WORKER_ROOT_MISMATCH" });
      if (within(worker, evaluator) || within(evaluator, worker)) {
        throw Object.assign(new Error("Evaluator-private and worker roots must not overlap"), { code: "PRIVATE_ROOT_OVERLAP" });
      }
      if (!within(evaluator, probe)) throw Object.assign(new Error("Probe path is outside evaluator-private root"), { code: "PRIVATE_PROBE_PATH_DENIED" });
      const metadata = await stat(probe);
      if (!metadata.isFile()) throw Object.assign(new Error("Evaluator-private probe must be a file"), { code: "PRIVATE_PROBE_INVALID" });
      const observed = await this._send("probe_read", { path: probe });
      if (observed?.status !== "denied") {
        throw Object.assign(new Error("Child could read evaluator-private state"), { code: "PRIVATE_BOUNDARY_FAILED" });
      }
      return Object.freeze({
        kind: "cleanroom-filesystem-boundary",
        enforcer: "cleanroom-broker",
        privateReadProbe: "denied",
        workerRoot: worker,
        evaluatorRoot: evaluator,
        permissionModel: "node-permission",
        probeCode: observed.code,
      });
    });
  }

  close() {
    return this._terminate().finally(async () => {
      try { await this.reasoner.close?.(); } finally { this.resultSpool.close(); }
    });
  }
}

function validateJsArguments(args) {
  if (!plainObject(args) || typeof args.code !== "string" || Buffer.byteLength(args.code, "utf8") > MAX_CODE_BYTES) return false;
  if (Object.keys(args).some((key) => !["code", "timeout_ms", "max_output_bytes", "title"].includes(key))) return false;
  if (args.timeout_ms !== undefined && (!Number.isInteger(args.timeout_ms) || args.timeout_ms < 1 || args.timeout_ms > MAX_TIMEOUT_MS)) return false;
  if (args.max_output_bytes !== undefined && (!Number.isInteger(args.max_output_bytes) || args.max_output_bytes < 256 || args.max_output_bytes > MAX_OUTPUT_BYTES)) return false;
  return args.title === undefined || (typeof args.title === "string" && args.title.length <= 200);
}

export function createRequestHandler({ broker = new KernelBroker() } = {}) {
  return async function handleRequest(request) {
    if (!plainObject(request) || request.jsonrpc !== "2.0" || typeof request.method !== "string") return rpcError(request?.id, -32600);
    if (!("id" in request)) return null;
    if (request.method === "initialize") {
      const requestedVersion = request.params?.protocolVersion;
      return rpcResult(request.id, {
        protocolVersion: typeof requestedVersion === "string" ? requestedVersion : "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions: "Linked Science RDF-specialized RLM environment. Use persistent JavaScript to keep large resources, graphs, ontologies, and results external to the prompt behind handles; large graph-query results may use private broker storage and remain streaming local-query sources. Inspect state with RDF/JS, Communica subgraph queries, and bounded projections. Call nodeRepl.rlm.capabilities() before relying on optional host-mediated recursion. The child has no ambient raw network or filesystem-write authority: private token-bound mediation applies anonymous public-read effects, execution/storage bounds, identity stripping, and receipts. The MCP remains exactly js, js_reset, and js_add_node_module_dir. PEEK is an orientation map, never a bulk context or result store.",
      });
    }
    if (request.method === "ping") return rpcResult(request.id, {});
    if (request.method === "tools/list") return rpcResult(request.id, { tools: TOOLS });
    if (request.method !== "tools/call") return rpcError(request.id, -32601);

    const name = request.params?.name;
    const args = request.params?.arguments ?? {};
    try {
      if (name === "js") {
        if (!validateJsArguments(args)) throw Object.assign(new Error("Invalid js arguments"), { code: "INVALID_ARGUMENT" });
        return rpcResult(request.id, await broker.execute(args.code, {
          timeoutMs: args.timeout_ms ?? DEFAULT_TIMEOUT_MS,
          maxOutputBytes: args.max_output_bytes ?? DEFAULT_MAX_OUTPUT_BYTES,
          requestMeta: plainObject(request.params?._meta) ? request.params._meta : {},
        }));
      }
      if (name === "js_reset") {
        if (!plainObject(args) || Object.keys(args).length !== 0) throw Object.assign(new Error("Invalid js_reset arguments"), { code: "INVALID_ARGUMENT" });
        return rpcResult(request.id, { content: [{ type: "text", text: JSON.stringify(await broker.reset()) }] });
      }
      if (name === "js_add_node_module_dir") {
        if (!plainObject(args) || Object.keys(args).length !== 1 || typeof args.path !== "string") throw Object.assign(new Error("Invalid module-dir arguments"), { code: "INVALID_ARGUMENT" });
        return rpcResult(request.id, { content: [{ type: "text", text: JSON.stringify(await broker.addModuleDir(args.path)) }] });
      }
      throw Object.assign(new Error("Unknown tool"), { code: "UNKNOWN_TOOL" });
    } catch (error) {
      return rpcResult(request.id, errorToolResult(error));
    }
  };
}

export function runStdioServer({ input = process.stdin, output = process.stdout, broker = new KernelBroker() } = {}) {
  const handleRequest = createRequestHandler({ broker });
  const lines = createInterface({ input, crlfDelay: Infinity });
  lines.on("line", async (line) => {
    if (Buffer.byteLength(line, "utf8") > MAX_REQUEST_BYTES) {
      output.write(`${JSON.stringify(rpcError(null, -32700))}\n`);
      return;
    }
    let request;
    try {
      request = JSON.parse(line);
    } catch {
      output.write(`${JSON.stringify(rpcError(null, -32700))}\n`);
      return;
    }
    const response = await handleRequest(request);
    if (response !== null) output.write(`${JSON.stringify(response)}\n`);
  });
  lines.once("close", () => broker.close().catch(() => {}));
  return broker;
}

const isDirectExecution = typeof process !== "undefined"
  && typeof process.argv?.[1] === "string"
  && pathToFileURL(process.argv[1]).href === import.meta.url;

// Keep the registered entrypoint stable. Imported brokers retain standalone
// ownership; desktop stdio connections can explicitly attach to a shared session.
if (isDirectExecution) {
  import('./scientific-session-mcp.mjs').then(({ ScientificSessionMcpAdapter }) => {
    runStdioServer({ broker: new ScientificSessionMcpAdapter() });
  }).catch(error => { console.error(error); process.exitCode = 1; });
}
