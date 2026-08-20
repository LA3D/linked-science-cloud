import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const projectRoot = '/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl';
const moduleRoot = `${projectRoot}/node_modules`;
const serverPath = '/Users/cvardema/dev/git/LA3D/linked-science-cloud/node-repl-network-probe/src/cleanroom-mcp.mjs';
const bootstrapPath = `${projectRoot}/lib/cleanroom-linked-science-bootstrap.mjs`;
const fixturePath = `${projectRoot}/test/fixtures/linked-science-runtime/synthetic-science.mjs`;

const child = spawn(process.execPath, [ serverPath ], { cwd: projectRoot, stdio: [ 'pipe', 'pipe', 'pipe' ] });
const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
const pending = new Map();
let sequence = 0;

lines.on('line', line => {
  const response = JSON.parse(line);
  const waiter = pending.get(response.id);
  if (!waiter) return;
  pending.delete(response.id);
  waiter.resolve(response);
});

function request(method, params = {}) {
  const id = ++sequence;
  const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  return response;
}

async function tool(name, argumentsValue = {}) {
  const response = await request('tools/call', { name, arguments: argumentsValue });
  assert.equal(response.error, undefined, JSON.stringify(response));
  assert.notEqual(response.result?.isError, true, JSON.stringify(response));
  return response.result;
}

function text(result) {
  return result.content?.find(item => item.type === 'text')?.text ?? '';
}

const bootstrap = `var { bootstrapLinkedScience } = await import('file://${bootstrapPath}'); var boot = await bootstrapLinkedScience({ host: globalThis, cleanroom: nodeRepl, projectRoot: '${projectRoot}', moduleRoot: '${moduleRoot}' }); nodeRepl.write({version:boot.version, same:boot===linkedScience, environment:boot.capabilities().environment})`;

try {
  await request('initialize', { protocolVersion: '2024-11-05' });
  const listed = await request('tools/list');
  assert.deepEqual(listed.result.tools.map(tool => tool.name), [ 'js', 'js_reset', 'js_add_node_module_dir' ]);

  await tool('js', { code: 'var cleanroomSentinel = 40' });
  const persistent = text(await tool('js', { code: 'nodeRepl.write({value:cleanroomSentinel + 2, cwd:nodeRepl.cwd, mode:nodeRepl.rlm.mode})' }));
  assert.match(persistent, /value: 42/u);
  assert.match(persistent, new RegExp(projectRoot.replaceAll('/', '\\/')));
  assert.match(persistent, /mode: 'codeact'/u);

  const booted = text(await tool('js', { code: bootstrap, timeout_ms: 120_000 }));
  assert.match(booted, /version: '1\.1\.0'/u);
  assert.match(booted, /runtime: 'cleanroom_node_repl'/u);
  assert.match(booted, /@comunica\/query-sparql/u);
  const idempotent = text(await tool('js', { code: "nodeRepl.write((await bootstrapLinkedScience({host:globalThis,cleanroom:nodeRepl,projectRoot:'" + projectRoot + "',moduleRoot:'" + moduleRoot + "'}))===linkedScience)" }));
  assert.equal(idempotent, 'true');

  const rlm = text(await tool('js', { code: "nodeRepl.write(nodeRepl.rlm.inspect('linked-science:runtime',{start:0,end:4096}))" }));
  assert.match(rlm, /linked-science-runtime-discovery/u);
  assert.match(rlm, /cleanroom_node_repl/u);

  const local = text(await tool('js', { code: `var fixture=await import('file://${fixturePath}'); var ws=linkedScience.open({contextKey:'cleanroom-proof'}); await ws.orientation.bootstrap(); var ontology=await ws.graphs.load({name:'ontology',kind:'ontology',quads:fixture.ontologyQuads,source:{kind:'local-synthetic',id:'ontology'}}); var sourceA=await ws.graphs.load({name:'source-a',kind:'instance-data',quads:fixture.sourceAQuads,source:{kind:'local-synthetic',id:'source-a'}}); var sourceB=await ws.graphs.load({name:'source-b',kind:'instance-data',quads:fixture.sourceBQuads,source:{kind:'local-synthetic',id:'source-b'}}); var result=await ws.query.select({sources:[ontology,sourceA,sourceB],sparql:fixture.measurementQuery,role:'measurements'}); nodeRepl.write(ws.results.table(result,{limit:2,maxCells:4,maxBytes:4096}))`, timeout_ms: 120_000 }));
  assert.match(local, /kind: 'table'/u);
  assert.match(local, /localOnly: true/u);
  assert.match(local, /maxRows: 2/u);

  const reused = text(await tool('js', { code: "nodeRepl.write({profile:ws.results.profile(result),orientation:await ws.orientation.status()})" }));
  assert.match(reused, /owner: 'cleanroom-broker'/u);
  assert.match(reused, /status: 'resident'/u);

  await tool('js_reset');
  const reset = text(await tool('js', { code: "nodeRepl.write({sentinel:typeof cleanroomSentinel,facade:typeof linkedScience,peek:await nodeRepl.peek.current('cleanroom-proof')})" }));
  assert.match(reset, /sentinel: 'undefined'/u);
  assert.match(reset, /facade: 'undefined'/u);
  assert.match(reset, /linked-science-handle-reference/u);

  await tool('js', { code: bootstrap, timeout_ms: 120_000 });
  const recovered = text(await tool('js', { code: "var recovered=linkedScience.open({contextKey:'cleanroom-proof'}); nodeRepl.write(await recovered.orientation.status())" }));
  assert.match(recovered, /owner: 'cleanroom-broker'/u);
  assert.match(recovered, /status: 'stale'/u);

  console.log(JSON.stringify({
    ok: true,
    server: 'cleanroom_node_repl',
    tools: listed.result.tools.map(tool => tool.name),
    persistence: true,
    projectRoot,
    moduleRoot,
    facadeVersion: '1.1.0',
    localSynthetic: true,
    reset: { bindingsCleared: true, rlmRebootstrapped: true, peekSurvived: true, oldHandles: 'stale' },
  }, null, 2));
} finally {
  lines.close();
  child.stdin.end();
  if (child.exitCode === null && child.signalCode === null) {
    child.kill();
    await new Promise(resolve => child.once('exit', resolve));
  }
}
