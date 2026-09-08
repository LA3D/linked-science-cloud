import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createRequestHandler, KernelBroker } from "../src/cleanroom-mcp.mjs";
import { PeekRegistry } from "../src/peek-runtime.mjs";

const serverPath = fileURLToPath(new URL("../src/cleanroom-mcp.mjs", import.meta.url));
const linkedScienceBootstrapUrl = new URL("../../../lib/cleanroom-linked-science-bootstrap.mjs", import.meta.url).href;
const linkedScienceProjectRoot = fileURLToPath(new URL("../../..", import.meta.url));

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
  assert.match(initialized.result.instructions, /RLM.*persistent JavaScript.*RDF\/JS.*Communica.*bounded projections/u);
  assert.match(initialized.result.instructions, /exactly js, js_reset, and js_add_node_module_dir/u);
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

test("JavaScript text output is aggregate-bounded with an explicit per-evaluation override", async (t) => {
  const broker = new KernelBroker();
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });

  const bounded = await handle(request(1, "js", { code: "nodeRepl.write('a'.repeat(20000)); nodeRepl.write('b'.repeat(20000))" }));
  const boundedTexts = bounded.result.content.filter(item => item.type === "text");
  assert.equal(Buffer.byteLength(boundedTexts.map(item => item.text).join(""), "utf8") <= 32 * 1024, true);
  assert.equal(boundedTexts.some(item => item._meta?.["cleanroom/output"]?.truncated === true), true);

  const expanded = await handle(request(2, "js", {
    code: "nodeRepl.write('c'.repeat(36000))",
    max_output_bytes: 40_000,
  }));
  assert.equal(Buffer.byteLength(text(expanded), "utf8"), 36_000);
  assert.equal(expanded.result.content[0]._meta, undefined);
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
  const broker = new KernelBroker();
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const exposed = await handle(request(1, "js", { code: "nodeRepl.write(typeof nodeRepl.linkedScienceTraversal)" }));
  assert.equal(text(exposed), "undefined");
  const owner = { token: broker.hostCapabilityToken, epoch: broker.epoch };
  const started = broker.traversal.beginTraversal({ maxDurationMs: 1_000 }, owner);
  assert.match(started.traversalId, /^traversal-/u);
  assert.equal(broker.traversal.sessions.size, 1);
  await handle(request(2, "js_reset", {}));
  assert.equal(broker.traversal.sessions.size, 0);
  assert.equal(broker.traversal.capabilities().authority.class, "anonymous-linked-data-read");
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

test("raw Fetch, Response, traversal bridge, and direct network imports are absent while permission denies computed raw network effects", async (t) => {
  const broker = new KernelBroker();
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const globals = await handle(request(1, "js", { code: "nodeRepl.write([typeof fetch,typeof Request,typeof Response,typeof nodeRepl.linkedScienceTraversal].join(','))" }));
  assert.equal(text(globals), "undefined,undefined,undefined,undefined");
  for (const specifier of [ "node:http", "node:https", "node:net", "node:tls", "node:dns", "undici" ]) {
    const response = await handle(request(2, "js", { code: `await import('${specifier}')` }));
    assert.equal(response.result.isError, true);
    assert.match(text(response), /MODULE_BLOCKED/u);
  }
  const permissionBoundary = await handle(request(3, "js", { timeout_ms: 2_000, code: `
    var computedNetworkModule = 'node:' + 'http';
    var rawHttp = await import(computedNetworkModule);
    try {
      await new Promise((resolveCall, rejectCall) => {
        var rawRequest = rawHttp.get('http://127.0.0.1:1/', resolveCall);
        rawRequest.on('error', rejectCall);
      });
    } catch (error) {
      nodeRepl.write(error.code);
    }
  ` }));
  assert.equal(text(permissionBoundary), "ERR_ACCESS_DENIED");
  assert.equal(broker.traversal.sessions.size, 0);
});

test("consumer-owned bootstrap privately injects anonymous-read authority without expanding the MCP or nodeRepl surface", async t => {
  const broker = new KernelBroker({ cwd: linkedScienceProjectRoot });
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const response = await handle(request(1, "js", { code: `
    var { bootstrapLinkedScience } = await import(${JSON.stringify(linkedScienceBootstrapUrl)});
    var facade = await bootstrapLinkedScience({ host: globalThis, cleanroom: nodeRepl });
    var workspace = facade.open({ contextKey: 'private-authority-smoke' });
    var evidence = await workspace.evidence.load({ name: 'synthetic-manifest', document: { kind: 'EvidencePack' } });
    var evidenceProfile = workspace.results.profile(evidence);
    var attemptHistory = workspace.traversal.history();
    nodeRepl.write({
      version: facade.version,
      authority: facade.capabilities().traversal.authority.class,
      transport: facade.capabilities().traversal.transport.implementation,
      evidenceMethod: typeof workspace.evidence.load,
      traversalMethod: typeof workspace.traversal.query,
      evidenceType: evidenceProfile.type,
      attempts: attemptHistory.total,
      exposedBridge: typeof nodeRepl.linkedScienceTraversal,
      exposedFetch: typeof fetch
    });
  ` }));
  assert.equal(response.result.isError, undefined);
  assert.match(text(response), /version: '6\.4\.0'/u);
  assert.match(text(response), /authority: 'anonymous-linked-data-read'/u);
  assert.match(text(response), /transport: 'standard-fetch'/u);
  assert.match(text(response), /evidenceMethod: 'function'/u);
  assert.match(text(response), /traversalMethod: 'function'/u);
  assert.match(text(response), /evidenceType: 'evidence'/u);
  assert.match(text(response), /attempts: 0/u);
  assert.match(text(response), /exposedBridge: 'undefined'/u);
  assert.match(text(response), /exposedFetch: 'undefined'/u);
  assert.equal(broker.traversal.sessions.size, 0);
});

test("the project facade is ready without a bootstrap call and workspace disposal reclaims its stored results", async t => {
  const broker = new KernelBroker({ cwd: linkedScienceProjectRoot });
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const loaded = await handle(request(1, "js", { code: `
    var autoWs = linkedScience.open({ contextKey: 'auto-bootstrap' });
    var autoGraph = await autoWs.graphs.load({name:'fixture',kind:'instance-data',text:Array.from({length:600},(_,i)=>'<urn:s'+i+'> <urn:p> "x" .').join('\\n')});
    var autoResult = await autoWs.query.run({sources:[autoGraph],sparql:'SELECT * WHERE {?s ?p ?o}'});
    nodeRepl.write({ project: linkedScience.capabilities().environment.project.id, alias: ls === linkedScience, count: autoWs.results.profile(autoResult).count, inventory: autoWs.inventory().total });
  ` }));
  assert.equal(loaded.result.isError, undefined, text(loaded));
  assert.match(text(loaded), /project: '@linked-science\/runtime'/u);
  assert.match(text(loaded), /count: 600/u);
  assert.match(text(loaded), /inventory: 2/u);
  assert.equal(broker.resultSpool.records.size, 1);
  const disposed = await handle(request(2, "js", { code: `await autoWs.dispose(); nodeRepl.write(linkedScience.open({contextKey:'auto-bootstrap'}).inventory().total)` }));
  assert.equal(disposed.result.isError, undefined, text(disposed));
  assert.equal(text(disposed), '0');
  assert.equal(broker.resultSpool.records.size, 0);
  assert.equal(broker.resultSpool.totalBytes, 0);
  await broker.reset();
  const fresh = await handle(request(3, "js", { code: `nodeRepl.write({ready:typeof linkedScience.open,oldBinding:typeof autoWs})` }));
  assert.match(text(fresh), /ready: 'function'/u);
  assert.match(text(fresh), /oldBinding: 'undefined'/u);
});

test("the actual repository MCP retains a large graph and returns all four complete SPARQL result forms", async t => {
  const requests = [];
  const largeTurtle = Array.from({ length: 12_050 }, (_, index) =>
    `<https://example.test/item/${index}> <https://example.test/p> <https://example.test/o> .`,
  ).join("\n");
  const fixture = createServer((request, response) => {
    requests.push({ method: request.method, url: request.url });
    response.writeHead(200, { "content-type": "text/turtle" });
    response.end(largeTurtle);
  });
  await new Promise((resolveListen, rejectListen) => {
    fixture.once("error", rejectListen);
    fixture.listen(0, "127.0.0.1", resolveListen);
  });
  t.after(() => new Promise(resolveClose => fixture.close(resolveClose)));
  const address = fixture.address();
  const url = `http://127.0.0.1:${address.port}/source.ttl`;
  const broker = new KernelBroker({ cwd: linkedScienceProjectRoot });
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const response = await handle(request(1, "js", { timeout_ms: 120_000, code: `
    var { bootstrapLinkedScience } = await import(${JSON.stringify(linkedScienceBootstrapUrl)});
    await bootstrapLinkedScience({ host: globalThis, cleanroom: nodeRepl });
    var ws = linkedScience.open({ contextKey: 'loopback-resource-composition' });
    var resource = await ws.resources.get(${JSON.stringify(url)}, { role: 'fixture-document' });
    var graph = await resource.rdf({ name: 'fixture-graph' });
    var exists = await ws.query.run({ sources: [graph], sparql: 'ASK { <https://example.test/item/12049> <https://example.test/p> <https://example.test/o> }' });
    var result = await ws.query.select({ sources: [graph], sparql: 'SELECT ?item WHERE { VALUES ?item { <https://example.test/item/1> <https://example.test/item/12049> } ?item <https://example.test/p> <https://example.test/o> } ORDER BY ?item' });
    var constructed = await ws.query.run({ sources: [graph], sparql: 'CONSTRUCT { ?item <https://example.test/selected> true } WHERE { VALUES ?item { <https://example.test/item/1> <https://example.test/item/12049> } ?item <https://example.test/p> <https://example.test/o> }' });
    var described = await ws.query.run({ sources: [graph], sparql: 'DESCRIBE ?item WHERE { VALUES ?item { <https://example.test/item/1> <https://example.test/item/12049> } ?item <https://example.test/p> <https://example.test/o> } ORDER BY ?item LIMIT 1 OFFSET 1' });
    var describedAll = await ws.query.run({ sources: [graph], sparql: 'DESCRIBE ?item WHERE { ?item <https://example.test/p> <https://example.test/o> }' });
    var describedAllContainsLast = await ws.query.run({ sources: [describedAll], sparql: 'ASK { <https://example.test/item/12049> <https://example.test/p> <https://example.test/o> }' });
    var describedPage = await ws.results.page(described, { limit: 1 });
    var existsPage = await ws.results.page(exists, { limit: 1 });
    var selectedPage = await ws.results.page(result, { limit: 2 });
    var profiles = [result, exists, constructed, described].map(value => ws.results.profile(value));
    nodeRepl.write({
      graph: ws.results.profile(graph),
      exists: existsPage.rows[0].value,
      rows: selectedPage.rows.map(row => row.item.value),
      constructedDatasetSize: ws.rdf.dataset(constructed).size,
      resultTypes: profiles.map(profile => profile.type),
      completion: profiles.map(profile => profile.completion.complete),
      described: {
        count: profiles[3].count,
        queryType: profiles[3].provenance.queryType,
        executionQueryType: profiles[3].provenance.executionQueryType,
        policy: profiles[3].completion.descriptionPolicy.id,
        subject: describedPage.rows[0].subject.value
      },
      completeLargeDescribe: {
        count: ws.results.profile(describedAll).count,
        complete: ws.results.profile(describedAll).completion.complete,
        truncated: ws.results.profile(describedAll).completion.truncated,
        residency: ws.results.profile(describedAll).residency
      },
      storedResultReusable: (await ws.results.page(describedAllContainsLast, { limit: 1 })).rows[0].value,
      history: ws.resources.history(),
      budgets: linkedScience.capabilities().budgetPlanes,
      rawFetch: typeof fetch
    });
  ` }));
  assert.equal(response.result.isError, undefined, text(response));
  const output = text(response);
  assert.match(output, /count: 12050/u);
  assert.match(output, /indexed: true/u);
  assert.match(output, /exists: true/u);
  assert.match(output, /constructedDatasetSize: 2/u);
  assert.match(output, /https:\/\/example\.test\/item\/1/u);
  assert.match(output, /https:\/\/example\.test\/item\/12049/u);
  assert.match(output, /resultTypes: \[ 'bindings', 'boolean', 'quads', 'quads' \]/u);
  assert.match(output, /completion: \[ true, true, true, true \]/u);
  assert.match(output, /queryType: 'DESCRIBE'/u);
  assert.match(output, /executionQueryType: 'CONSTRUCT'/u);
  assert.match(output, /policy: 'outgoing-subject-triples'/u);
  assert.match(output, /subject: 'https:\/\/example\.test\/item\/12049'/u);
  assert.match(output, /completeLargeDescribe: \{[\s\S]*count: 12050,[\s\S]*complete: true,[\s\S]*truncated: false,/u);
  assert.match(output, /kind: 'broker-stored-result'/u);
  assert.match(output, /backend: 'broker-sqlite'/u);
  assert.match(output, /storedResultReusable: true/u);
  assert.match(output, /total: 1/u);
  assert.match(output, /operational in-memory safety and atomic admission; not query semantics or a prompt\/display limit/u);
  assert.match(output, /rawFetch: 'undefined'/u);
  assert.equal(requests.length, 1);
  assert.equal(broker.resultSpool.records.size, 1);
  await broker.reset();
  assert.equal(broker.resultSpool.records.size, 0);
});

test("out-of-core graph-result quota failure publishes no partial stored result", async t => {
  const broker = new KernelBroker({
    cwd: linkedScienceProjectRoot,
    resultSpoolOptions: { maxResultBytes: 1_024, maxTotalBytes: 2_048 },
  });
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const response = await handle(request(1, "js", { timeout_ms: 30_000, code: `
    var { bootstrapLinkedScience } = await import(${JSON.stringify(linkedScienceBootstrapUrl)});
    await bootstrapLinkedScience({ host: globalThis, cleanroom: nodeRepl });
    var quotaWs = linkedScience.open({ contextKey: 'result-storage-quota' });
    var df = quotaWs.rdf.DataFactory;
    var quotaQuads = Array.from({ length: 501 }, (_, index) => df.quad(
      df.namedNode('https://example.test/item/' + index),
      df.namedNode('https://example.test/predicate'),
      df.literal('value-' + index)
    ));
    var quotaGraph = await quotaWs.graphs.load({
      name: 'quota-graph',
      kind: 'instance-data',
      quads: quotaQuads,
      source: { kind: 'local-synthetic', id: 'quota-fixture' }
    });
    await quotaWs.query.run({
      sources: [quotaGraph],
      sparql: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }'
    });
  ` }));
  assert.equal(response.result.isError, true);
  const envelope = JSON.parse(text(response)).error;
  assert.equal(envelope.code, "LS_QUERY_RESULT_STORAGE_BOUND");
  assert.equal(envelope.stage, "result-storage");
  assert.equal(envelope.retryable, true);
  assert.equal(envelope.repair.preservesOriginalAnswer, false);
  assert.match(envelope.message, /no partial result handle was retained/u);
  assert.equal(broker.resultSpool.records.size, 0);
  assert.equal(broker.resultSpool.totalBytes, 0);
});

test("a mediated out-of-core graph result remains a streaming source for local SPARQL", async t => {
  const requests = [];
  const turtle = Array.from({ length: 600 }, (_, index) =>
    `<https://example.test/mediated/${index}> <https://example.test/p> <https://example.test/o> .`,
  ).join("\n");
  const fixture = createServer((request, response) => {
    requests.push({ method: request.method, url: request.url });
    response.writeHead(200, { "content-type": "text/turtle" });
    response.end(turtle);
  });
  await new Promise((resolveListen, rejectListen) => {
    fixture.once("error", rejectListen);
    fixture.listen(0, "127.0.0.1", resolveListen);
  });
  t.after(() => new Promise(resolveClose => fixture.close(resolveClose)));
  const address = fixture.address();
  const url = `http://127.0.0.1:${address.port}/mediated.ttl`;
  const broker = new KernelBroker({ cwd: linkedScienceProjectRoot });
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const response = await handle(request(1, "js", { timeout_ms: 30_000, code: `
    var { bootstrapLinkedScience } = await import(${JSON.stringify(linkedScienceBootstrapUrl)});
    await bootstrapLinkedScience({ host: globalThis, cleanroom: nodeRepl });
    var mediatedWs = linkedScience.open({ contextKey: 'mediated-stored-result' });
    var mediatedGraph = await mediatedWs.traversal.query({
      sources: [${JSON.stringify(url)}],
      sparql: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }'
    });
    var containsLast = await mediatedWs.query.run({
      sources: [mediatedGraph],
      sparql: 'ASK { <https://example.test/mediated/599> <https://example.test/p> <https://example.test/o> }'
    });
    nodeRepl.write({
      profile: mediatedWs.results.profile(mediatedGraph),
      containsLast: (await mediatedWs.results.page(containsLast, { limit: 1 })).rows[0].value,
      history: mediatedWs.traversal.history()
    });
  ` }));
  assert.equal(response.result.isError, undefined, text(response));
  assert.match(text(response), /count: 600/u);
  assert.match(text(response), /kind: 'broker-stored-result'/u);
  assert.match(text(response), /containsLast: true/u);
  assert.match(text(response), /total: 1/u);
  assert.equal(requests.length, 1);
});

test("repairable local validation reaches the MCP tool error envelope with typed correction metadata", async t => {
  const broker = new KernelBroker({ cwd: linkedScienceProjectRoot });
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const response = await handle(request(1, "js", { code: `
    var { bootstrapLinkedScience } = await import(${JSON.stringify(linkedScienceBootstrapUrl)});
    await bootstrapLinkedScience({ host: globalThis, cleanroom: nodeRepl });
    var workspace = linkedScience.open({ contextKey: 'repair-feedback-smoke' });
    await workspace.evidence.load({ name: 'resource-manifest', document: { kind: 'EvidencePack' }, source: { kind: 'remote', id: 'https://example.test/' } });
  ` }));
  assert.equal(response.result.isError, true);
  const envelope = JSON.parse(text(response)).error;
  assert.equal(envelope.code, "LS_EVIDENCE");
  assert.equal(envelope.stage, "evidence-load");
  assert.equal(envelope.retryable, true);
  assert.equal(envelope.repair.field, "source");
  assert.deepEqual(envelope.repair.expected.omittedDefault, { kind: "declarative-resource-manifest", id: "<name>" });
  assert.deepEqual(envelope.repair.budgetImpact, { liveRequests: 0 });
  assert.deepEqual(envelope.receipt.repair, envelope.repair);
  assert.equal(broker.traversal.sessions.size, 0);

  const queryResponse = await handle(request(2, "js", { code: `
    await workspace.query.select({ sources: [], sparql: 'SELECT ?s WHERE { ?s ?p ?o }' });
  ` }));
  assert.equal(queryResponse.result.isError, true);
  const queryEnvelope = JSON.parse(text(queryResponse)).error;
  assert.equal(queryEnvelope.code, "LS_QUERY_PREFLIGHT");
  assert.equal(queryEnvelope.stage, "query-preflight");
  assert.equal(queryEnvelope.retryable, true);
  assert.equal(queryEnvelope.repair.field, "sources");
  assert.deepEqual(queryEnvelope.repair.expected, { type: "array", minItems: 1, maxItems: 20, items: "resident graph handle" });
  assert.deepEqual(queryEnvelope.repair.budgetImpact, { liveRequests: 0 });
  assert.deepEqual(queryEnvelope.receipt.repair, queryEnvelope.repair);
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

test("post-reset RLM inspection errors return without replacing the kernel", async (t) => {
  const broker = new KernelBroker();
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });

  await handle(request(1, "js", { code: "nodeRepl.rlm.registerContext('temporary', 'value')" }));
  await handle(request(2, "js_reset", {}));
  const resetEpoch = broker.epoch;
  const missing = await handle(request(3, "js", {
    code: "nodeRepl.rlm.inspect('temporary', { start: 0, end: 64 })",
    timeout_ms: 1_000,
  }));
  const rejected = await handle(request(4, "js", {
    code: "await Promise.reject(Object.assign(new Error('async failure'), { code: 'ASYNC_FAILURE' }))",
    timeout_ms: 1_000,
  }));
  const recovered = await handle(request(5, "js", { code: "nodeRepl.write(1 + 1)" }));

  assert.equal(missing.result.isError, true);
  assert.match(text(missing), /CONTEXT_NOT_FOUND/u);
  assert.equal(rejected.result.isError, true);
  assert.match(text(rejected), /ASYNC_FAILURE/u);
  assert.equal(broker.epoch, resetEpoch);
  assert.equal(text(recovered), "2");
});

test("external-context RLM mode provides symbolic contexts and reports recursion honestly", async (t) => {
  const broker = new KernelBroker();
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });

  const symbolic = await handle(request(1, "js", {
    code: "nodeRepl.rlm.registerContext('letters', 'abcdefghij'); nodeRepl.write({slice:nodeRepl.rlm.inspect('letters', {start:2,end:6}), capabilities:nodeRepl.rlm.capabilities()})",
  }));
  const recursive = await handle(request(2, "js", { code: "nodeRepl.write(await nodeRepl.rlm.query('summarize'))" }));

  assert.match(text(symbolic), /cdef/);
  assert.match(text(symbolic), /architecture: 'recursive-language-model'/u);
  assert.match(text(symbolic), /controlEnvironment: 'persistent-javascript'/u);
  assert.match(text(symbolic), /available: false/u);
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
    code: "nodeRepl.rlm.registerContext('ctx','0123456789'); nodeRepl.write({capabilities:nodeRepl.rlm.capabilities(), result:await nodeRepl.rlm.query('inspect', {contextId:'ctx', slice:{start:3,end:7}})})",
  }));

  assert.match(text(response), /available: true/u);
  assert.match(text(response), /result: 'nested:3456'/u);
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

test("large SELECT solutions spill to broker storage with bag semantics and remain pageable", async t => {
  const broker = new KernelBroker({ cwd: linkedScienceProjectRoot });
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const response = await handle(request(1, "js", { timeout_ms: 60_000, code: `
    var { bootstrapLinkedScience } = await import(${JSON.stringify(linkedScienceBootstrapUrl)});
    await bootstrapLinkedScience({ host: globalThis, cleanroom: nodeRepl });
    var selectWs = linkedScience.open({ contextKey: 'select-spill' });
    var df = selectWs.rdf.DataFactory;
    var selectQuads = [];
    for (let index = 0; index < 1200; index += 1) {
      selectQuads.push(df.quad(df.namedNode('https://example.test/s/' + index), df.namedNode('https://example.test/kind'), df.namedNode('https://example.test/kind/' + (index % 4))));
    }
    var selectGraph = await selectWs.graphs.load({ name: 'select-graph', kind: 'instance-data', quads: selectQuads, source: { kind: 'local-synthetic', id: 'select-fixture' } });
    var solutions = await selectWs.query.run({ sources: [selectGraph], sparql: 'SELECT ?s ?kind WHERE { ?s <https://example.test/kind> ?kind } ORDER BY ?s' });
    var profile = selectWs.results.profile(solutions);
    var firstPage = await selectWs.results.page(solutions, { limit: 3 });
    var table = await selectWs.results.table(solutions, { limit: 2, offset: 1198 });
    var derived;
    try { await selectWs.results.derive(solutions, value => value); derived = 'allowed'; } catch (error) { derived = error.code; }
    var asSource;
    try { await selectWs.query.run({ sources: [solutions], sparql: 'ASK { ?s ?p ?o }' }); asSource = 'allowed'; } catch (error) { asSource = error.code; }
    nodeRepl.write({
      type: profile.type,
      count: profile.count,
      columns: profile.columns,
      residency: profile.residency,
      complete: profile.completion.complete,
      firstRows: firstPage.rows.map(row => row.kind.value),
      firstTruncated: firstPage.truncated,
      lastRows: table.rows.length,
      lastTotal: table.total,
      derived,
      asSource,
    });
  ` }));
  assert.equal(response.result.isError, undefined, text(response));
  const output = text(response);
  assert.match(output, /type: 'bindings'/u);
  assert.match(output, /count: 1200/u);
  assert.match(output, /columns: \[ 's', 'kind' \]/u);
  assert.match(output, /kind: 'broker-stored-result'/u);
  assert.match(output, /complete: true/u);
  assert.match(output, /firstRows: \[\s*'https:\/\/example\.test\/kind\/0',\s*'https:\/\/example\.test\/kind\/1',\s*'https:\/\/example\.test\/kind\/2'\s*\]/u);
  assert.match(output, /firstTruncated: true/u);
  assert.match(output, /lastRows: 2/u);
  assert.match(output, /lastTotal: 1200/u);
  assert.match(output, /derived: 'LS_STORED_RESULT_DERIVATION'/u);
  assert.match(output, /asSource: 'LS_HANDLE_KIND'/u);
  assert.equal(broker.resultSpool.records.size, 1);
  assert.equal([ ...broker.resultSpool.records.values() ][0].kind, "bindings");
});

test("stored quad results answer joins through indexed pattern pushdown instead of full re-streaming", async t => {
  const broker = new KernelBroker({ cwd: linkedScienceProjectRoot });
  t.after(() => broker.close());
  const calls = { match: 0, count: 0, page: 0 };
  for (const method of Object.keys(calls)) {
    const original = broker.resultSpool[method].bind(broker.resultSpool);
    broker.resultSpool[method] = (...args) => { calls[method] += 1; return original(...args); };
  }
  const handle = createRequestHandler({ broker });
  const response = await handle(request(1, "js", { timeout_ms: 60_000, code: `
    var { bootstrapLinkedScience } = await import(${JSON.stringify(linkedScienceBootstrapUrl)});
    await bootstrapLinkedScience({ host: globalThis, cleanroom: nodeRepl });
    var joinWs = linkedScience.open({ contextKey: 'stored-join' });
    var df = joinWs.rdf.DataFactory;
    var joinQuads = [];
    for (let index = 0; index < 3000; index += 1) {
      joinQuads.push(df.quad(df.namedNode('https://example.test/s/' + index), df.namedNode('https://example.test/p'), df.namedNode('https://example.test/o/' + (index % 50))));
    }
    for (let index = 0; index < 50; index += 1) {
      joinQuads.push(df.quad(df.namedNode('https://example.test/o/' + index), df.namedNode('https://example.test/label'), df.literal('label ' + index)));
    }
    var joinGraph = await joinWs.graphs.load({ name: 'join-graph', kind: 'instance-data', quads: joinQuads, source: { kind: 'local-synthetic', id: 'join-fixture' } });
    var stored = await joinWs.query.run({ sources: [joinGraph], sparql: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }' });
    nodeRepl.write({ storedCount: joinWs.results.profile(stored).count, residency: joinWs.results.profile(stored).residency.kind });
  ` }));
  assert.equal(response.result.isError, undefined, text(response));
  assert.match(text(response), /storedCount: 3050/u);
  assert.match(text(response), /residency: 'broker-stored-result'/u);
  calls.match = 0; calls.count = 0; calls.page = 0;
  const joined = await handle(request(2, "js", { timeout_ms: 60_000, code: `
    var joinedResult = await joinWs.query.run({ sources: [stored], sparql: 'SELECT (COUNT(*) AS ?n) WHERE { ?s <https://example.test/p> ?o . ?o <https://example.test/label> ?l }' });
    var bound = await joinWs.query.run({ sources: [stored], sparql: 'ASK { <https://example.test/s/2999> <https://example.test/p> <https://example.test/o/49> }' });
    nodeRepl.write({ joined: (await joinWs.results.page(joinedResult, { limit: 1 })).rows[0].n.value, bound: (await joinWs.results.page(bound, { limit: 1 })).rows[0].value });
  ` }));
  assert.equal(joined.result.isError, undefined, text(joined));
  assert.match(text(joined), /joined: '3000'/u);
  assert.match(text(joined), /bound: true/u);
  assert.equal(calls.page, 0, "query execution never pages the whole stored result");
  assert.ok(calls.count > 0, "Comunica receives exact cardinalities from the broker");
  assert.ok(calls.match <= 120, `bound lookups are index seeks, observed ${calls.match} match calls`);
});

test("resident-graph quotas follow the kernel heap and refuse oversized graphs before the kernel can die", async t => {
  const broker = new KernelBroker({ cwd: linkedScienceProjectRoot, maxOldSpaceMb: 256 });
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const response = await handle(request(1, "js", { timeout_ms: 60_000, code: `
    var { bootstrapLinkedScience } = await import(${JSON.stringify(linkedScienceBootstrapUrl)});
    await bootstrapLinkedScience({ host: globalThis, cleanroom: nodeRepl });
    var residency = linkedScience.capabilities().budgetPlanes.residency;
    var quotaWs = linkedScience.open({ contextKey: 'heap-quota' });
    var df = quotaWs.rdf.DataFactory;
    var oversized = [];
    for (let index = 0; index < residency.maxResidentGraphQuads + 1; index += 1) {
      oversized.push(df.quad(df.namedNode('https://example.test/s/' + index), df.namedNode('https://example.test/p'), df.namedNode('https://example.test/o')));
    }
    var refusal;
    try { await quotaWs.graphs.load({ name: 'oversized', kind: 'instance-data', quads: oversized, source: { kind: 'local-synthetic', id: 'oversized' } }); refusal = 'allowed'; } catch (error) { refusal = { code: error.code, scope: error.repair?.scope, maximum: error.repair?.maximum }; }
    nodeRepl.write({ maxResidentGraphQuads: residency.maxResidentGraphQuads, basis: residency.basis.source, capped: residency.basis.capped, derived: residency.basis.heap.derivedMaxQuads, heapLimitMb: Math.round(residency.basis.heap.heapLimitBytes / 1048576), refusal, headroom: residency.kernelHeap.failureCode });
  ` }));
  assert.equal(response.result.isError, undefined, text(response));
  const output = text(response);
  const advertised = Number(/maxResidentGraphQuads: (\d+)/u.exec(output)?.[1]);
  assert.ok(advertised > 1_000 && advertised < 250_000, `heap-derived quota ${advertised} sits below the configured ceiling`);
  assert.match(output, /basis: 'heap-derived'/u);
  assert.match(output, /capped: true/u);
  assert.match(output, /code: 'LS_GRAPH_RESIDENCY_BOUND'/u);
  assert.match(output, /scope: 'operational-residency'/u);
  assert.match(output, /headroom: 'LS_KERNEL_HEAP_BOUND'/u);
  assert.equal(broker.child !== null, true, "the kernel survived the refusal");
});

test("kernel heap exhaustion is reported as KERNEL_OOM with epoch-loss repair guidance", async t => {
  const broker = new KernelBroker({ maxOldSpaceMb: 64 });
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  await handle(request(1, "js", { code: "var survivor = 'before-oom'" }));
  const response = await handle(request(2, "js", { timeout_ms: 90_000, code: `
    var hog = [];
    for (;;) hog.push(new Array(100000).fill('x'.repeat(16)));
  ` }));
  assert.equal(response.result.isError, true);
  const envelope = JSON.parse(text(response)).error;
  assert.equal(envelope.code, "KERNEL_OOM");
  assert.equal(envelope.stage, "kernel-lifecycle");
  assert.equal(envelope.retryable, false);
  assert.equal(envelope.repair.epochLost, true);
  assert.equal(envelope.repair.scope, "kernel-heap");
  assert.equal(envelope.receipt.heapExhausted, true);
  assert.equal(envelope.receipt.heapLimitMb, 64);
  assert.match(envelope.message, /64 MB heap/u);
  const after = await handle(request(3, "js", { code: "nodeRepl.write(typeof survivor)" }));
  assert.equal(text(after), "undefined", "the replacement kernel starts a fresh epoch");
});
