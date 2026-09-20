import { isBuiltin, registerHooks } from "node:module";
import { readFile } from "node:fs/promises";
import repl from "node:repl";
import { PassThrough } from "node:stream";
import { inspect } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, sep } from "node:path";
import { createScientificSessionRuntime } from './scientific-session-runtime.mjs';

import {
  registerLinkedSciencePrivateResultStore,
  registerLinkedSciencePrivateReasoner,
  registerLinkedSciencePrivateTraversal,
} from "./private-linked-science-traversal.mjs";

const sendToParent = process.send.bind(process);
const MAX_TEXT_BYTES = 256 * 1024;
const DEFAULT_MAX_OUTPUT_BYTES = 32 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_CONTEXT_BYTES = 2 * 1024 * 1024;
const MAX_HOST_CALL_BYTES = 384 * 1024;
const roots = [];
const contexts = new Map();
const pendingHostCalls = new Map();
let hostCallSequence = 0;
let hostCapabilityToken;
let currentRequestMeta = Object.freeze({});
let currentMaxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES;
let currentOutputBytes = 0;
let outputTruncationReported = false;
let writes = [];
let images = [];

function packageSpecifier(specifier) {
  return typeof specifier === "string"
    && specifier.length > 0
    && !specifier.startsWith(".")
    && !specifier.startsWith("/")
    && !specifier.startsWith("#")
    && !specifier.startsWith("file:")
    && !specifier.startsWith("data:")
    && !specifier.includes(":")
    && !isBuiltin(specifier);
}

function parentWithinRegisteredRoot(parentURL) {
  if (typeof parentURL !== "string" || !parentURL.startsWith("file:")) return false;
  let parentPath;
  try {
    parentPath = fileURLToPath(parentURL);
  } catch {
    return false;
  }
  return roots.some((root) => parentPath === root || parentPath.startsWith(`${root}${sep}`));
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (packageSpecifier(specifier) && !parentWithinRegisteredRoot(context.parentURL)) {
      for (const root of roots) {
        try {
          const parentURL = pathToFileURL(resolve(root, "..", "__cleanroom_repl__.mjs")).href;
          return nextResolve(specifier, { ...context, parentURL });
        } catch (error) {
          if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
          // Try the next registered root, then the importing module's native resolution.
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

function boundedText(value, maximum) {
  const text = typeof value === "string"
    ? value
    : inspect(value, { depth: 6, maxArrayLength: 200, maxStringLength: 32_000, breakLength: 120 });
  const bytes = Buffer.byteLength(text, "utf8");
  const limit = Math.max(0, Math.min(MAX_TEXT_BYTES, maximum));
  if (bytes <= limit) return { text, bytes, truncated: false, originalBytes: bytes };
  if (limit === 0) return { text: "", bytes: 0, truncated: true, originalBytes: bytes };
  const marker = "\n…[output truncated]";
  const markerBytes = Buffer.byteLength(marker, "utf8");
  const prefixLimit = Math.max(0, limit - markerBytes);
  let prefix = Buffer.from(text).subarray(0, prefixLimit).toString("utf8");
  if (prefix.endsWith("\uFFFD")) prefix = prefix.slice(0, -1);
  const bounded = markerBytes <= limit ? `${prefix}${marker}` : prefix;
  return { text: bounded, bytes: Buffer.byteLength(bounded, "utf8"), truncated: true, originalBytes: bytes };
}

function normalizeImage(image) {
  if (typeof image === "string" && image.startsWith("data:")) {
    const match = /^data:([^;,]+);base64,(.+)$/s.exec(image);
    if (!match) throw Object.assign(new Error("Invalid image data URL"), { code: "INVALID_IMAGE" });
    image = { mimeType: match[1], data: match[2] };
  }
  if (!image || typeof image !== "object" || typeof image.mimeType !== "string") {
    throw Object.assign(new Error("Image must be a data URL or {mimeType,data}"), { code: "INVALID_IMAGE" });
  }
  const data = Buffer.isBuffer(image.data) || image.data instanceof Uint8Array
    ? Buffer.from(image.data).toString("base64")
    : image.data;
  if (typeof data !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
    throw Object.assign(new Error("Invalid base64 image"), { code: "INVALID_IMAGE" });
  }
  if (Buffer.byteLength(data, "base64") > MAX_IMAGE_BYTES) {
    throw Object.assign(new Error("Image is too large"), { code: "IMAGE_LIMIT" });
  }
  return { type: "image", mimeType: image.mimeType.slice(0, 96), data };
}

function hostCall(method, args) {
  if (Buffer.byteLength(JSON.stringify({ method, args }), "utf8") > MAX_HOST_CALL_BYTES) {
    return Promise.reject(Object.assign(new Error("Host capability request is too large"), { code: "HOST_CALL_LIMIT" }));
  }
  const id = ++hostCallSequence;
  return new Promise((resolveCall, rejectCall) => {
    pendingHostCalls.set(id, { resolve: resolveCall, reject: rejectCall });
    sendToParent({ type: "host_call", token: hostCapabilityToken, id, method, args });
  });
}

async function hostCallStrict(method, args) {
  const result = await hostCall(method, args);
  if (result?.ok === false && result.error) {
    throw Object.assign(new Error(result.error.message ?? "Host call failed"), result.error);
  }
  return result;
}

function validateContextId(contextId) {
  if (typeof contextId !== "string" || !/^[A-Za-z0-9_.:-]{1,96}$/.test(contextId)) {
    throw Object.assign(new Error("Invalid RLM context id"), { code: "INVALID_CONTEXT_ID" });
  }
}

function rlmCapabilities() {
  const recursionAvailable = process.env.CLEANROOM_RLM_PROVIDER === "configured";
  return Object.freeze({
    kind: "cleanroom-rlm-capabilities",
    version: "1.0.0",
    architecture: "recursive-language-model",
    controlEnvironment: "persistent-javascript",
    externalContext: Object.freeze({
      available: true,
      persistence: "kernel-epoch",
      maxContextBytes: MAX_CONTEXT_BYTES,
      operations: Object.freeze(["registerContext", "context", "inspect"]),
    }),
    recursion: Object.freeze({
      available: recursionAvailable,
      interface: "nodeRepl.rlm.query",
      lifecycleOwner: "cleanroom-host",
      lifecycle: "bounded-one-shot-compatibility",
      durable: false,
      asynchronousHandle: false,
      hardMaxDepth: 4,
      recovery: recursionAvailable
        ? "Use a bounded provider call only when decomposition benefits from a recursive model invocation."
        : "Continue with local external-context operations, or run under a host configured with an RLM provider.",
    }),
  });
}

const rlm = Object.freeze({
  get mode() {
    return process.env.CLEANROOM_RLM_PROVIDER === "configured" ? "recursive" : "external-context";
  },
  capabilities: rlmCapabilities,
  registerContext(contextId, value) {
    validateContextId(contextId);
    if (Buffer.byteLength(JSON.stringify(value), "utf8") > MAX_CONTEXT_BYTES) {
      throw Object.assign(new Error("RLM context is too large"), { code: "CONTEXT_LIMIT" });
    }
    contexts.set(contextId, value);
    return { contextId, registered: true };
  },
  context(contextId) {
    validateContextId(contextId);
    if (!contexts.has(contextId)) throw Object.assign(new Error("RLM context not found"), { code: "CONTEXT_NOT_FOUND" });
    return contexts.get(contextId);
  },
  inspect(contextId, { start = 0, end = start + 4_096 } = {}) {
    const value = this.context(contextId);
    const text = typeof value === "string" ? value : JSON.stringify(value);
    const safeStart = Math.max(0, Math.min(text.length, Number.isInteger(start) ? start : 0));
    const safeEnd = Math.max(safeStart, Math.min(text.length, Number.isInteger(end) ? end : safeStart + 4_096));
    return { contextId, start: safeStart, end: safeEnd, totalLength: text.length, text: text.slice(safeStart, safeEnd) };
  },
  async query(prompt, options = {}) {
    if (typeof prompt !== "string" || !prompt.trim() || Buffer.byteLength(prompt, "utf8") > 64 * 1024) {
      throw Object.assign(new Error("Invalid recursive query"), { code: "INVALID_RLM_QUERY" });
    }
    let context;
    if (options.contextId !== undefined) {
      const inspected = this.inspect(options.contextId, options.slice ?? {});
      context = inspected.text;
    }
    return hostCall("rlm.query", { prompt, context, options });
  },
  status() {
    return { mode: this.mode, contextCount: contexts.size, capabilities: rlmCapabilities() };
  },
});

const peek = Object.freeze({
  begin: (contextId, options = {}) => hostCall("peek.begin", { contextId, options }),
  current: (contextId) => hostCall("peek.current", { contextId }),
  edit: (contextId, edits) => hostCall("peek.edit", { contextId, edits }),
  commit: (contextId, observableTrajectory) => hostCall("peek.commit", { contextId, observableTrajectory }),
  clear: (contextId) => hostCall("peek.clear", { contextId }),
  checkpoint: (contextId, path) => hostCall("peek.checkpoint", { contextId, path }),
  restore: (path) => hostCall("peek.restore", { path }),
});

async function serializedRequest(input, init = {}) {
  const request = new Request(input, init);
  const method = request.method.toUpperCase();
  const headers = Object.fromEntries(request.headers.entries());
  const body = method === "GET" || method === "HEAD" ? undefined : await request.text();
  return { url: request.url, method, headers, ...(body === undefined ? {} : { body }) };
}

const linkedScienceTraversal = Object.freeze({
  capabilities: () => hostCallStrict("traversal.capabilities", {}),
  beginTraversal: (budgets = {}) => hostCallStrict("traversal.begin", { budgets }),
  request: (traversalId, request) => hostCallStrict("traversal.request", { traversalId, request }),
  snapshotTraversal: (traversalId) => hostCallStrict("traversal.snapshot", { traversalId }),
  finishTraversal: (traversalId) => hostCallStrict("traversal.finish", { traversalId }),
  abortTraversal: (traversalId, reason) => hostCallStrict("traversal.abort", { traversalId, reason }),
  createFetch(traversalId) {
    return async (input, init = {}) => {
      if (init.signal?.aborted) throw init.signal.reason ?? Object.assign(new Error("Fetch aborted"), { code: "ABORT_ERR" });
      const result = await hostCallStrict("traversal.request", { traversalId, request: await serializedRequest(input, init) });
      if (init.signal?.aborted) throw init.signal.reason ?? Object.assign(new Error("Fetch aborted"), { code: "ABORT_ERR" });
      const response = new Response(Buffer.from(result.bodyBase64, "base64"), { status: result.status, statusText: result.statusText, headers: result.headers });
      Object.defineProperties(response, {
        url: { value: result.url, enumerable: true },
        redirected: { value: Boolean(result.redirected), enumerable: true },
      });
      return response;
    };
  },
});

const linkedScienceResultStorage = Object.freeze({
  capabilities: () => hostCallStrict("results.capabilities", {}),
  begin: options => hostCallStrict("results.begin", options),
  append: (storageId, items) => hostCallStrict("results.append", { storageId, items }),
  commit: (storageId, options = {}) => hostCallStrict("results.commit", { storageId, ...options }),
  page: (storageId, options = {}) => hostCallStrict("results.page", { storageId, ...options }),
  match: (storageId, options = {}) => hostCallStrict("results.match", { storageId, ...options }),
  count: (storageId, options = {}) => hostCallStrict("results.count", { storageId, ...options }),
  abort: storageId => hostCallStrict("results.abort", { storageId }),
});

function createKernel() {
  const input = new PassThrough();
  const output = new PassThrough();
  output.resume();
  const server = repl.start({ prompt: "", terminal: false, input, output, ignoreUndefined: false });
  delete server.context.process;
  delete server.context.require;
  delete server.context.fetch;
  delete server.context.Request;
  delete server.context.Response;
  delete server.context.Headers;
  const nodeRepl = {};
  Object.defineProperties(nodeRepl, {
    cwd: { enumerable: true, value: process.cwd() },
    homeDir: { enumerable: true, value: process.env.HOME ?? "" },
    tmpDir: { enumerable: true, value: process.env.TMPDIR ?? "/tmp" },
    requestMeta: { enumerable: true, get: () => currentRequestMeta },
    rlm: { enumerable: true, value: rlm },
    scientificSession: { enumerable: true, value: createScientificSessionRuntime({control: args => hostCallStrict('scientificSession.control', args)}) },
    peek: { enumerable: true, value: peek },
  });
  Object.defineProperties(nodeRepl, {
    write: {
      enumerable: true,
      value(value) {
        const remaining = Math.max(0, currentMaxOutputBytes - currentOutputBytes);
        const bounded = boundedText(value, remaining);
        currentOutputBytes += bounded.bytes;
        if (bounded.bytes > 0 || (!outputTruncationReported && bounded.truncated)) {
          writes.push({
            type: "text",
            text: bounded.text,
            ...(bounded.truncated ? { _meta: { "cleanroom/output": { truncated: true, maxBytes: currentMaxOutputBytes, originalWriteBytes: bounded.originalBytes } } } : {}),
          });
        }
        outputTruncationReported ||= bounded.truncated;
        return value;
      },
    },
    emitImage: {
      enumerable: true,
      async value(image) {
        const normalized = normalizeImage(image);
        images.push(normalized);
        return { mimeType: normalized.mimeType, bytes: Buffer.byteLength(normalized.data, "base64") };
      },
    },
  });
  Object.freeze(nodeRepl);
  registerLinkedSciencePrivateTraversal(nodeRepl, linkedScienceTraversal);
  registerLinkedSciencePrivateResultStore(nodeRepl, linkedScienceResultStorage);
  registerLinkedSciencePrivateReasoner(nodeRepl, Object.freeze({ capabilities: () => hostCallStrict("reasoning.capabilities", {}), run: args => hostCallStrict("reasoning.run", args) }));
  server.context.nodeRepl = nodeRepl;
  return server;
}

const kernel = createKernel();
let bootstrap;

function bootstrapProject() {
  if (process.env.CLEANROOM_LINKED_SCIENCE_BOOTSTRAP !== 'enabled') return;
  bootstrap ??= import('../../../lib/cleanroom-linked-science-bootstrap.mjs').then(({ bootstrapLinkedScience }) =>
    bootstrapLinkedScience({ host: kernel.context, cleanroom: kernel.context.nodeRepl }));
  return bootstrap;
}

function evaluate(code) {
  if (/\bimport\s*\(\s*(["'])(?:node:)?(?:process|http|https|http2|net|tls|dns|dgram|undici)\1\s*\)/.test(code)) {
    return Promise.reject(Object.assign(new Error("Raw process and network modules are unavailable in this REPL"), { code: "MODULE_BLOCKED" }));
  }
  return new Promise((resolveEval, rejectEval) => {
    // Node 26 routes runtime and top-level-await failures through the REPL
    // error handler without invoking the direct eval callback. Translate that
    // path back into this child's structured response contract.
    const previousHandleError = kernel._handleError;
    let settled = false;
    const finish = (settle, value) => {
      if (settled) return;
      settled = true;
      if (kernel._handleError === handleError) kernel._handleError = previousHandleError;
      settle(value);
    };
    const handleError = (error) => finish(rejectEval, error);
    kernel._handleError = handleError;
    try {
      kernel.eval(code, kernel.context, "cleanroom-repl", (error, value) => {
        if (error) finish(rejectEval, error);
        else finish(resolveEval, value);
      });
    } catch (error) {
      handleError(error);
    }
  });
}

function sanitizeError(error) {
  const boundedJson = (value, maxBytes) => {
    if (value === undefined) return undefined;
    try {
      const text = JSON.stringify(value);
      return Buffer.byteLength(text, 'utf8') <= maxBytes ? JSON.parse(text) : undefined;
    } catch { return undefined; }
  };
  return {
    code: typeof error?.code === "string" ? error.code.slice(0, 96) : "EVALUATION_ERROR",
    name: typeof error?.name === "string" ? error.name.slice(0, 96) : "Error",
    message: typeof error?.message === "string" ? error.message.replaceAll(process.cwd(), "<cwd>").slice(0, 2_000) : "Evaluation failed",
    ...(typeof error?.stage === 'string' ? { stage: error.stage.slice(0, 96) } : {}),
    ...(typeof error?.recoveryDocument === 'string' ? { recoveryDocument: error.recoveryDocument.slice(0, 96) } : {}),
    ...(typeof error?.retryable === 'boolean' ? { retryable: error.retryable } : {}),
    ...(boundedJson(error?.repair, 16_000) ? { repair: boundedJson(error.repair, 16_000) } : {}),
    ...(boundedJson(error?.receipt, 64_000) ? { receipt: boundedJson(error.receipt, 64_000) } : {}),
  };
}

process.on("message", async (message) => {
  if (message?.type === "host_capability_init" && hostCapabilityToken === undefined && typeof message.token === "string") {
    hostCapabilityToken = message.token;
    return;
  }
  if (message?.type === "host_result") {
    const pending = pendingHostCalls.get(message.id);
    if (!pending) return;
    pendingHostCalls.delete(message.id);
    if (message.ok) pending.resolve(message.value);
    else pending.resolve({ ok: false, error: message.error ?? { code: "HOST_CALL_ERROR" } });
    return;
  }
  if (message?.type === "add_root") {
    if (!roots.includes(message.path)) roots.push(message.path);
    sendToParent({ type: "response", id: message.id, ok: true, value: { path: message.path, roots: roots.length } });
    return;
  }
  if (message?.type === "probe_read") {
    try {
      await readFile(message.path);
      sendToParent({ type: "response", id: message.id, ok: true, value: { status: "readable" } });
    } catch (error) {
      if (error?.code === "ERR_ACCESS_DENIED") {
        sendToParent({ type: "response", id: message.id, ok: true, value: { status: "denied", code: error.code } });
      } else {
        sendToParent({ type: "response", id: message.id, ok: false, error: sanitizeError(error) });
      }
    }
    return;
  }
  if (message?.type !== "eval") return;
  writes = [];
  images = [];
  currentMaxOutputBytes = Number.isInteger(message.maxOutputBytes) ? Math.min(Math.max(message.maxOutputBytes, 256), MAX_TEXT_BYTES) : DEFAULT_MAX_OUTPUT_BYTES;
  currentOutputBytes = 0;
  outputTruncationReported = false;
  currentRequestMeta = Object.freeze(message.requestMeta && typeof message.requestMeta === "object" ? message.requestMeta : {});
  try {
    await bootstrapProject();
    await evaluate(message.code);
    const content = [...writes, ...images];
    sendToParent({ type: "response", id: message.id, ok: true, value: { content } });
  } catch (error) {
    sendToParent({ type: "response", id: message.id, ok: false, error: sanitizeError(error) });
  }
});

sendToParent({ type: "ready" });
