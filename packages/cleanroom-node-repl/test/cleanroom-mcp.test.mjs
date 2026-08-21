import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createRequestHandler, KernelBroker } from "../src/cleanroom-mcp.mjs";
import { PeekRegistry } from "../src/peek-runtime.mjs";

const serverPath = fileURLToPath(new URL("../src/cleanroom-mcp.mjs", import.meta.url));

function startStdioClient(t) {
  const child = spawn(process.execPath, [serverPath], { stdio: ["pipe", "pipe", "pipe"] });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  const pending = new Map();
  lines.on("line", (line) => {
    const response = JSON.parse(line);
    const waiter = pending.get(response.id);
    if (!waiter) return;
    pending.delete(response.id);
    waiter.resolve(response);
  });
  t.after(async () => {
    lines.close();
    child.stdin.end();
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
      await new Promise((resolveExit) => child.once("exit", resolveExit));
    }
  });
  return {
    call(id, method, params = {}) {
      const result = new Promise((resolveCall, rejectCall) => pending.set(id, { resolve: resolveCall, reject: rejectCall }));
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      return result;
    },
  };
}

function request(id, name, argumentsValue = {}, meta) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name, arguments: argumentsValue, ...(meta ? { _meta: meta } : {}) },
  };
}

function text(response) {
  return response.result.content.find((item) => item.type === "text")?.text;
}

async function writePackage(packageRoot, manifest, files) {
  await mkdir(packageRoot, { recursive: true });
  await writeFile(join(packageRoot, "package.json"), JSON.stringify(manifest));
  await Promise.all(Object.entries(files).map(async ([path, source]) => {
    const target = join(packageRoot, path);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, source);
  }));
}

test("MCP lists the observed three-tool Node REPL contract", async (t) => {
  const broker = new KernelBroker();
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const initialized = await handle({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2024-11-05" },
  });
  const listed = await handle({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });

  assert.equal(initialized.result.serverInfo.name, "cleanroom-node-repl");
  assert.match(initialized.result.instructions, /CodeAct mode/);
  assert.deepEqual(listed.result.tools.map(({ name }) => name), ["js", "js_reset", "js_add_node_module_dir"]);
  assert.deepEqual(listed.result.tools[0].inputSchema.required, ["code"]);
});

test("real stdio JSON-RPC transport keeps one persistent kernel", async (t) => {
  const client = startStdioClient(t);
  await client.call(1, "initialize", { protocolVersion: "2024-11-05" });
  await client.call(2, "tools/call", { name: "js", arguments: { code: "var stdioSentinel = 9" } });
  const response = await client.call(3, "tools/call", {
    name: "js",
    arguments: { code: "nodeRepl.write(stdioSentinel * 2)" },
  });
  assert.equal(response.result.content[0].text, "18");
});

test("JavaScript bindings, top-level await, writes, and request metadata persist correctly", async (t) => {
  const broker = new KernelBroker();
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });

  await handle(request(1, "js", { code: "var answer = 40" }));
  const persisted = await handle(request(2, "js", { code: "nodeRepl.write(await Promise.resolve(answer + 2))" }));
  const written = await handle(request(3, "js", { code: "nodeRepl.write({answer})" }));
  const metadata = await handle(request(4, "js", { code: "nodeRepl.write(nodeRepl.requestMeta.label)" }, { label: "separate-call" }));

  assert.equal(text(persisted), "42");
  assert.equal(text(written), "{ answer: 40 }");
  assert.equal(text(metadata), "separate-call");
});

test("implicit values stay silent and var bindings can be redeclared", async (t) => {
  const broker = new KernelBroker();
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });

  const silent = await handle(request(1, "js", { code: "1 + 1" }));
  await handle(request(2, "js", { code: "var redeclarable = 1" }));
  const redeclared = await handle(request(3, "js", { code: "var redeclarable = redeclarable + 1; nodeRepl.write(redeclarable)" }));
  const staticImport = await handle(request(4, "js", { code: "import os from 'node:os'" }));

  assert.deepEqual(silent.result.content, []);
  assert.equal(text(redeclared), "2");
  assert.equal(staticImport.result.isError, true);
});

test("process is absent and node:process dynamic import is blocked", async (t) => {
  const broker = new KernelBroker();
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });

  const globalCheck = await handle(request(1, "js", { code: "nodeRepl.write(typeof process)" }));
  const importCheck = await handle(request(2, "js", { code: "await import('node:process')" }));

  assert.equal(text(globalCheck), "undefined");
  assert.equal(importCheck.result.isError, true);
  assert.match(text(importCheck), /MODULE_BLOCKED/);
});

test("reset clears bindings while preserving module roots and broker PEEK state", async (t) => {
  const fixture = await mkdtemp(join(tmpdir(), "cleanroom-repl-modules-"));
  const moduleRoot = join(fixture, "node_modules");
  const packageRoot = join(moduleRoot, "toy-package");
  await mkdir(packageRoot, { recursive: true });
  await writeFile(join(packageRoot, "package.json"), JSON.stringify({ name: "toy-package", type: "module", exports: "./index.mjs" }));
  await writeFile(join(packageRoot, "index.mjs"), "export const value = 73;\n");

  const broker = new KernelBroker({ cwd: fixture });
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  await handle(request(1, "js_add_node_module_dir", { path: moduleRoot }));
  await handle(request(2, "js", { code: "var beforeReset = 1; await nodeRepl.peek.begin('demo'); await nodeRepl.peek.edit('demo', [{action:'ADD', entry:{section:'domain-constants', text:'alpha', score:0.9}}])" }));
  await handle(request(3, "js_reset", {}));

  const binding = await handle(request(4, "js", { code: "nodeRepl.write(typeof beforeReset)" }));
  const imported = await handle(request(5, "js", { code: "nodeRepl.write((await import('toy-package')).value)" }));
  const map = await handle(request(6, "js", { code: "nodeRepl.write(await nodeRepl.peek.current('demo'))" }));

  assert.equal(text(binding), "undefined");
  assert.equal(text(imported), "73");
  assert.match(text(map), /alpha/);
});

test("kernel reset aborts token-bound traversal sessions", async (t) => {
  const broker = new KernelBroker({
    traversalOptions: {
      resolveAddresses: async () => [ { address: "93.184.216.34", family: 4 } ],
      transport: async () => ({ status: 200, headers: { "content-type": "text/turtle" }, body: Buffer.from("@prefix ex: <https://example.test/> .") }),
    },
  });
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const started = await handle(request(1, "js", { code: "var traversal = await nodeRepl.linkedScienceTraversal.beginTraversal({maxDurationMs:1000}); nodeRepl.write(traversal.traversalId)" }));
  assert.match(text(started), /trv-/u);
  assert.equal(broker.traversal.sessions.size, 1);
  await handle(request(2, "js_reset", {}));
  assert.equal(broker.traversal.sessions.size, 0);
  const capabilities = await handle(request(3, "js", { code: "nodeRepl.write(await nodeRepl.linkedScienceTraversal.capabilities())" }));
  assert.match(text(capabilities), /public-https-dns-pinned/u);
});

test("oversized JavaScript requests are denied before entering the child IPC channel", async (t) => {
  const broker = new KernelBroker();
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const response = await handle(request(1, "js", { code: "x".repeat(256 * 1024 + 1) }));
  assert.equal(response.result.isError, true);
  assert.match(text(response), /INVALID_ARGUMENT/u);
  assert.equal(broker.child, null);
});

test("oversized traversal host calls are denied before crossing child IPC", async (t) => {
  const broker = new KernelBroker();
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const response = await handle(request(1, "js", { code: `
    var oversizedTraversal = await nodeRepl.linkedScienceTraversal.beginTraversal();
    try {
      await nodeRepl.linkedScienceTraversal.request(oversizedTraversal.traversalId, {
        url: 'https://data.example/sparql', method: 'POST',
        headers: {'content-type': 'application/sparql-query'}, body: 'x'.repeat(400000)
      });
    } catch (error) {
      nodeRepl.write(error.code);
    }
  ` }));
  assert.equal(text(response), "HOST_CALL_LIMIT");
  assert.equal(broker.traversal.sessions.size, 1);
  await handle(request(2, "js_reset", {}));
  assert.equal(broker.traversal.sessions.size, 0);
});

test("registered package entrypoints use ESM import conditions", async (t) => {
  const fixture = await mkdtemp(join(tmpdir(), "cleanroom-repl-conditions-"));
  const moduleRoot = join(fixture, "node_modules");
  await writePackage(join(moduleRoot, "conditional-entry"), {
    name: "conditional-entry",
    type: "module",
    exports: {
      ".": {
        import: "./import-entry.mjs",
        require: "./require-entry.cjs",
      },
    },
  }, {
    "import-entry.mjs": "export const selected = 'import';\n",
    "require-entry.cjs": "module.exports = { selected: 'require' };\n",
  });

  const broker = new KernelBroker({ cwd: fixture });
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  await handle(request(1, "js_add_node_module_dir", { path: moduleRoot }));
  const imported = await handle(request(2, "js", {
    code: "nodeRepl.write((await import('conditional-entry')).selected)",
  }));

  assert.equal(text(imported), "import");
});

test("registered deep ESM graphs keep nested and package-local resolution context", async (t) => {
  const fixture = await mkdtemp(join(tmpdir(), "cleanroom-repl-deep-modules-"));
  const moduleRoot = join(fixture, "node_modules");
  const graphRoot = join(moduleRoot, "graph-entry");
  const nestedModules = join(graphRoot, "node_modules");
  const scale = 24;

  await writePackage(join(moduleRoot, "shared-dependency"), {
    name: "shared-dependency",
    type: "module",
    exports: "./index.mjs",
  }, { "index.mjs": "export const selected = 'flattened-top-level';\n" });
  await writePackage(join(nestedModules, "shared-dependency"), {
    name: "shared-dependency",
    type: "module",
    exports: {
      ".": {
        import: "./import-entry.mjs",
        require: "./require-entry.cjs",
      },
    },
  }, {
    "import-entry.mjs": "export const selected = 'nested-import';\n",
    "require-entry.cjs": "module.exports = { selected: 'nested-require' };\n",
  });
  for (let index = 0; index < scale; index += 1) {
    await writePackage(join(nestedModules, `scale-dependency-${index}`), {
      name: `scale-dependency-${index}`,
      type: "module",
      exports: "./index.mjs",
    }, { "index.mjs": `export default ${index};\n` });
  }

  const scaleImports = Array.from({ length: scale }, (_, index) =>
    `import value${index} from 'scale-dependency-${index}';`).join("\n");
  const scaleValues = Array.from({ length: scale }, (_, index) => `value${index}`).join(", ");
  await writePackage(graphRoot, {
    name: "graph-entry",
    type: "module",
    exports: "./index.mjs",
    imports: { "#package-local": "./package-local.mjs" },
  }, {
    "package-local.mjs": "export const local = 'package-local';\n",
    "index.mjs": `import { selected } from 'shared-dependency';\nimport { local } from '#package-local';\n${scaleImports}\nexport const result = { selected, local, values: [${scaleValues}] };\n`,
  });

  const broker = new KernelBroker({ cwd: fixture });
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  await handle(request(1, "js_add_node_module_dir", { path: moduleRoot }));
  const imported = await handle(request(2, "js", {
    code: "nodeRepl.write(JSON.stringify((await import('graph-entry')).result))",
    timeout_ms: 5_000,
  }));
  const direct = await handle(request(3, "js", {
    code: "nodeRepl.write((await import('shared-dependency')).selected)",
  }));

  assert.deepEqual(JSON.parse(text(imported)), {
    selected: "nested-import",
    local: "package-local",
    values: Array.from({ length: scale }, (_, index) => index),
  });
  assert.equal(text(direct), "flattened-top-level");
});

test("a synchronous infinite loop times out and the broker replaces the kernel", async (t) => {
  const broker = new KernelBroker();
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });

  const timedOut = await handle(request(1, "js", { code: "while (true) {}", timeout_ms: 50 }));
  const recovered = await handle(request(2, "js", { code: "nodeRepl.write(1 + 1)" }));

  assert.equal(timedOut.result.isError, true);
  assert.match(text(timedOut), /KERNEL_TIMEOUT/);
  assert.equal(text(recovered), "2");
  assert.ok(broker.epoch >= 2);
});

test("CodeAct mode provides symbolic contexts and reports recursion unavailable", async (t) => {
  const broker = new KernelBroker();
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });

  const symbolic = await handle(request(1, "js", {
    code: "nodeRepl.rlm.registerContext('letters', 'abcdefghij'); nodeRepl.write(nodeRepl.rlm.inspect('letters', {start:2,end:6}))",
  }));
  const recursive = await handle(request(2, "js", { code: "nodeRepl.write(await nodeRepl.rlm.query('summarize'))" }));

  assert.match(text(symbolic), /cdef/);
  assert.match(text(recursive), /RLM_PROVIDER_UNAVAILABLE/);
});

test("configured recursive provider is broker-mediated and bounded", async (t) => {
  const seen = [];
  const broker = new KernelBroker({
    provider: async (call) => {
      seen.push(call);
      return `nested:${call.context}`;
    },
  });
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });

  const response = await handle(request(1, "js", {
    code: "nodeRepl.rlm.registerContext('ctx','0123456789'); nodeRepl.write(await nodeRepl.rlm.query('inspect', {contextId:'ctx', slice:{start:3,end:7}}))",
  }));

  assert.equal(text(response), "nested:3456");
  assert.equal(seen.length, 1);
  assert.equal(seen[0].budget.depth, 1);
});

test("PEEK applies structured edits and deterministic bounded eviction", async () => {
  const registry = new PeekRegistry();
  registry.begin("bounded", { tokenBudget: 64 });
  registry.edit("bounded", [
    { action: "ADD", entry: { id: "low", section: "context-roadmap", text: "x".repeat(180), score: 0.1 } },
    { action: "ADD", entry: { id: "high", section: "domain-constants", text: "important", score: 0.9 } },
  ]);

  const map = registry.current("bounded");
  assert.deepEqual(map.entries.map(({ id }) => id), ["high"]);
  assert.ok(map.estimatedTokens <= map.tokenBudget);
});

test("image emission returns an MCP image content block", async (t) => {
  const broker = new KernelBroker();
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const response = await handle(request(1, "js", {
    code: "await nodeRepl.emitImage({mimeType:'image/png', data:'iVBORw0KGgo='})",
  }));

  assert.deepEqual(response.result.content, [{ type: "image", mimeType: "image/png", data: "iVBORw0KGgo=" }]);
});
