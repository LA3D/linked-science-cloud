import { isBuiltin, registerHooks } from "node:module";
import { readFile } from "node:fs/promises";
import repl from "node:repl";
import { PassThrough } from "node:stream";
import { inspect } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, sep } from "node:path";

const sendToParent = process.send.bind(process);
const MAX_TEXT_BYTES = 256 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_CONTEXT_BYTES = 2 * 1024 * 1024;
const roots = [];
const contexts = new Map();
const pendingHostCalls = new Map();
let hostCallSequence = 0;
let hostCapabilityToken;
let currentRequestMeta = Object.freeze({});
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

function boundedText(value) {
  const text = typeof value === "string"
    ? value
    : inspect(value, { depth: 6, maxArrayLength: 200, maxStringLength: 32_000, breakLength: 120 });
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes <= MAX_TEXT_BYTES) return text;
  return `${Buffer.from(text).subarray(0, MAX_TEXT_BYTES).toString("utf8")}\n…[truncated]`;
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

const rlm = Object.freeze({
  get mode() {
    return process.env.CLEANROOM_RLM_PROVIDER === "configured" ? "recursive" : "codeact";
  },
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
    return { mode: this.mode, contextCount: contexts.size };
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

const linkedScienceBroker = Object.freeze({
  capabilities: () => hostCallStrict("linked-science.capabilities", {}),
  acquire: (options = {}) => hostCallStrict("linked-science.acquire", options),
  query: (options = {}) => hostCallStrict("linked-science.query", options),
});

function createKernel() {
  const input = new PassThrough();
  const output = new PassThrough();
  output.resume();
  const server = repl.start({ prompt: "", terminal: false, input, output, ignoreUndefined: false });
  delete server.context.process;
  delete server.context.require;
  const nodeRepl = {};
  Object.defineProperties(nodeRepl, {
    cwd: { enumerable: true, value: process.cwd() },
    homeDir: { enumerable: true, value: process.env.HOME ?? "" },
    tmpDir: { enumerable: true, value: process.env.TMPDIR ?? "/tmp" },
    requestMeta: { enumerable: true, get: () => currentRequestMeta },
    rlm: { enumerable: true, value: rlm },
    peek: { enumerable: true, value: peek },
    linkedScienceBroker: { enumerable: true, value: linkedScienceBroker },
  });
  Object.defineProperties(nodeRepl, {
    write: {
      enumerable: true,
      value(value) {
        writes.push({ type: "text", text: boundedText(value) });
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
  server.context.nodeRepl = nodeRepl;
  return server;
}

const kernel = createKernel();

function evaluate(code) {
  if (/\bimport\s*\(\s*(["'])(?:node:)?process\1\s*\)/.test(code)) {
    return Promise.reject(Object.assign(new Error("The process module is unavailable in this REPL"), { code: "MODULE_BLOCKED" }));
  }
  return new Promise((resolveEval, rejectEval) => {
    kernel.eval(code, kernel.context, "cleanroom-repl", (error, value) => {
      if (error) rejectEval(error);
      else resolveEval(value);
    });
  });
}

function sanitizeError(error) {
  return {
    code: typeof error?.code === "string" ? error.code.slice(0, 96) : "EVALUATION_ERROR",
    name: typeof error?.name === "string" ? error.name.slice(0, 96) : "Error",
    message: typeof error?.message === "string" ? error.message.replaceAll(process.cwd(), "<cwd>").slice(0, 2_000) : "Evaluation failed",
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
  currentRequestMeta = Object.freeze(message.requestMeta && typeof message.requestMeta === "object" ? message.requestMeta : {});
  try {
    await evaluate(message.code);
    const content = [...writes, ...images];
    sendToParent({ type: "response", id: message.id, ok: true, value: { content } });
  } catch (error) {
    sendToParent({ type: "response", id: message.id, ok: false, error: sanitizeError(error) });
  }
});

sendToParent({ type: "ready" });
