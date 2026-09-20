import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile, rm, copyFile } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { Parser } from 'n3';
import { createEyeronReasoner } from '../src/eyeron-reasoning.mjs';
import { constrainEyeronMemory } from '../src/eyeron-reasoning-worker.mjs';

const modulePath = process.env.LINKED_SCIENCE_EYERON_MODULE ??
  resolve(homedir(), '.local/share/linked-science/eyeron-v0.5.13/pkg/eyeron.js');
const installed = existsSync(modulePath) && existsSync(resolve(dirname(modulePath), 'eyeron_bg.wasm'));
const real = { skip: installed ? false : 'Optional pinned Eyeron installation absent' };
const input = { data: '<urn:s> <urn:p> <urn:o> .', rules: '{ ?s <urn:p> ?o } => { ?s <urn:q> ?o } .' };
const code = value => ({ code: value });
async function directory(t) {
  const path = await mkdtemp(resolve(tmpdir(), 'eyeron-adapter-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}
function reasoner(t, options = {}) {
  const result = createEyeronReasoner({ modulePath, ...options });
  t.after(() => result.close());
  return result;
}

test('missing dependency is an explicit unavailable capability and run error', async t => {
  const r = reasoner(t, { modulePath: resolve(await directory(t), 'missing.js') });
  const capability = await r.capabilities();
  assert.equal(capability.available, false);
  assert.equal(capability.code, 'REASONING_UNAVAILABLE');
  assert.equal(capability.hostIO, false);
  await assert.rejects(r.run(input), code('REASONING_UNAVAILABLE'));
});

test('bounds and argument types are validated before dependency loading', async t => {
  const r = reasoner(t, { modulePath: resolve(await directory(t), 'missing.js') });
  for (const limits of [null, [], { timeoutMs: 0 }, { maxRules: 1.2 }, { maxInputBytes: Infinity },
    { maxOutputBytes: -1 }, { wasmMemoryMiB: 1 }, { wasmMemoryMiB: 257 }, { workerHeapMiB: 15 },
    { unknown: 1 }, { timeoutMs: 60_001 }]) {
    await assert.rejects(r.run({ ...input, limits }), code('REASONING_INVALID_LIMITS'));
  }
  assert.throws(() => createEyeronReasoner({ limits: { timeoutMs: NaN } }), code('REASONING_INVALID_LIMITS'));
  await assert.rejects(r.run({ data: 42, rules: '' }), code('REASONING_INVALID_INPUT'));
  await assert.rejects(r.run({ ...input, proof: 'yes' }), code('REASONING_INVALID_INPUT'));
  await assert.rejects(r.run(input, { signal: {} }), code('REASONING_INVALID_INPUT'));
  await assert.rejects(r.run(input, null), code('REASONING_INVALID_INPUT'));
  await assert.rejects(r.run({ ...input, data: 'é', limits: { maxInputBytes: 1 } }), code('REASONING_INPUT_TOO_LARGE'));
  await assert.rejects(r.run({ ...input, limits: { maxRulesBytes: 1 } }), code('REASONING_RULES_TOO_LARGE'));
});

test('pre-abort, in-flight cancellation, busy, close and timeout terminate workers', async t => {
  const r = reasoner(t, { modulePath: resolve(await directory(t), 'missing.js') });
  const aborted = AbortSignal.abort();
  await assert.rejects(r.run(input, { signal: aborted }), code('REASONING_CANCELLED'));
  const controller = new AbortController();
  const pending = r.run(input, { signal: controller.signal });
  const cancelled = assert.rejects(pending, code('REASONING_CANCELLED'));
  await assert.rejects(r.run(input), code('REASONING_BUSY'));
  controller.abort();
  await cancelled;
  await assert.rejects(r.run({ ...input, limits: { timeoutMs: 1 } }), code('REASONING_TIMEOUT'));
  const closing = r.run(input);
  const closed = assert.rejects(closing, code('REASONING_CLOSED'));
  await r.close();
  await closed;
  await r.close();
  await assert.rejects(r.run(input), code('REASONING_CLOSED'));
});

test('corrupt Wasm fails closed, without importing the JavaScript wrapper', async t => {
  const dir = await directory(t);
  const path = resolve(dir, 'eyeron.js');
  await writeFile(path, 'throw new Error("UNTRUSTED WRAPPER MUST NEVER EXECUTE");');
  await writeFile(resolve(dir, 'eyeron_bg.wasm'), Buffer.alloc(2_052_543));
  const r = reasoner(t, { modulePath: path });
  assert.equal((await r.capabilities()).code, 'REASONING_INTEGRITY');
  await assert.rejects(r.run(input), code('REASONING_INTEGRITY'));
  assert.throws(() => constrainEyeronMemory(Buffer.from('not wasm'), 128), code('REASONING_INTEGRITY'));
});

test('real pinned Wasm has an enforced linear memory maximum', real, async () => {
  const original = await readFile(resolve(dirname(modulePath), 'eyeron_bg.wasm'));
  const module = new WebAssembly.Module(constrainEyeronMemory(original, 2));
  const imports = Object.fromEntries(WebAssembly.Module.imports(module).map(entry => [entry.name, () => {
    throw new Error('unexpected host call');
  }]));
  const { memory } = new WebAssembly.Instance(module, { './eyeron_bg.js': imports }).exports;
  assert.equal(memory.buffer.byteLength, 23 * 65536);
  memory.grow(32 - 23);
  assert.equal(memory.buffer.byteLength, 2 * 1024 * 1024);
  assert.throws(() => memory.grow(1), RangeError);
  assert.throws(() => constrainEyeronMemory(original, 0), code('REASONING_INVALID_LIMITS'));
  const corrupted = Buffer.from(original);
  corrupted[100] ^= 1;
  assert.throws(() => constrainEyeronMemory(corrupted, 128), code('REASONING_INTEGRITY'));
});

test('real engine derives deterministic default-graph Turtle and separate proof', real, async t => {
  const r = reasoner(t);
  const cap = await r.capabilities();
  assert.equal(cap.available, true);
  assert.equal(cap.limits.maxInputBytes, 1048576);
  assert.equal(cap.limits.maxOutputBytes, 1048576);
  assert.equal(cap.engine.sha256, 'd97a3e9e35d4c12960a46570eb20ab32287ef8d07e88dc7aa04c0c1b70fbd88d');
  const result = await r.run({ ...input, proof: true });
  assert.equal(result.complete, true);
  assert.equal(result.engine.version, '0.5.13');
  assert.match(result.engine.transformedSha256, /^[a-f0-9]{64}$/);
  assert.notEqual(result.engine.transformedSha256, result.engine.sha256);
  assert.equal(result.engine.transformedSha256, cap.engine.transformedSha256);
  assert.equal(result.usage.memoryPolicy.wasmMaximumBytes, 128 * 1024 * 1024);
  assert.ok(result.usage.wasmLinearMemoryBytes <= result.usage.memoryPolicy.wasmMaximumBytes);
  assert.equal(result.usage.inputBytes, Buffer.byteLength(input.data));
  assert.equal(result.usage.outputBytes, Buffer.byteLength(result.derived));
  assert.equal(result.usage.proofBytes, Buffer.byteLength(result.proof));
  assert.ok(result.elapsedMs >= 0);
  assert.equal(result.limits.wasmMemoryMiB, 128);
  const quads = new Parser({ format: 'Turtle' }).parse(result.derived);
  assert.equal(quads.length, 1);
  assert.equal(quads[0].predicate.value, 'urn:q');
  assert.ok(new Parser({ format: 'N3' }).parse(result.proof).length > 1);
  const repeat = await r.run({ ...input, proof: true });
  assert.equal(repeat.derived, result.derived);
  assert.equal(repeat.proof, result.proof);
  const independent = await r.run({ ...input, data: '' });
  assert.equal(independent.derived, '');
  assert.equal(independent.proof, null);
});

test('real engine preserves input blank node labels for upstream graph identity', real, async t => {
  const r = reasoner(t);
  const result = await r.run({ ...input, data: '_:s0b0 <urn:p> _:s0b1 .', proof: true });
  assert.equal(result.derived, '_:s0b0 <urn:q> _:s0b1 .\n');
  const [quad] = new Parser({ format: 'Turtle', blankNodePrefix: '' }).parse(result.derived);
  assert.equal(quad.subject.termType, 'BlankNode');
  assert.equal(quad.subject.value, 's0b0');
  assert.equal(quad.object.value, 's0b1');
  assert.match(result.proof, /_:s0b0/);
  assert.match(result.proof, /_:s0b1/);
});

test('real Wasm works without executing installed JS', real, async t => {
  const dir = await directory(t);
  await writeFile(resolve(dir, 'eyeron.js'), 'throw new Error("do not execute");');
  await copyFile(resolve(dirname(modulePath), 'eyeron_bg.wasm'), resolve(dir, 'eyeron_bg.wasm'));
  const r = reasoner(t, { modulePath: resolve(dir, 'eyeron.js') });
  assert.equal((await r.run(input)).derived, '<urn:s> <urn:q> <urn:o> .\n');
});

test('real engine rejects malformed input/rules/output, graph data and rule/output bounds', real, async t => {
  const r = reasoner(t);
  await assert.rejects(r.run({ ...input, data: 'not RDF' }), code('REASONING_MALFORMED_INPUT'));
  await assert.rejects(r.run({ ...input, rules: '{ malformed' }), code('REASONING_MALFORMED_RULES'));
  await assert.rejects(r.run({ ...input, data: '<urn:s> <urn:p> <urn:o> <urn:g> .' }), code('REASONING_MALFORMED_INPUT'));
  await assert.rejects(r.run({ ...input, limits: { maxOutputBytes: 1 } }), code('REASONING_OUTPUT_TOO_LARGE'));
  await assert.rejects(r.run({ ...input, proof: true, limits: { maxProofBytes: 1 } }), code('REASONING_PROOF_TOO_LARGE'));
  await assert.rejects(r.run({ ...input, rules: input.rules + '{ ?s <urn:q> ?o } => { ?s <urn:r> ?o } .',
    limits: { maxRules: 1 } }), code('REASONING_RULE_LIMIT'));
  await assert.rejects(r.run({ ...input,
    rules: '{ ?s <urn:p> ?o } => { <urn:x> <http://www.w3.org/2000/10/swap/log#outputString> "not Turtle" } .' }),
  code('REASONING_UNSUPPORTED'));
  await assert.rejects(r.run({ ...input, rules:
    '{ ?s <urn:p> ?o } => { <urn:g> <http://www.w3.org/2000/10/swap/log#nameOf> { <urn:a> <urn:b> <urn:c> } } .' }),
  code('REASONING_MALFORMED_OUTPUT'));
  // A failure must not poison the next fresh worker.
  assert.equal((await r.run(input)).complete, true);
});

test('real engine rejects incomplete backward reasoning and clock-dependent rules', real, async t => {
  const r = reasoner(t);
  const backward = Array.from({ length: 40 }, (_, i) =>
    `{ <urn:s> <urn:p${i}> <urn:o> } <= { <urn:s> <urn:p${i + 1}> <urn:o> } .`).join('\n') +
    '<urn:s> <urn:p40> <urn:o> . { <urn:s> <urn:p0> <urn:o> } => { <urn:s> <urn:done> <urn:o> } .';
  await assert.rejects(r.run({ data: '', rules: backward }), code('REASONING_INCOMPLETE'));
  await assert.rejects(r.run({ data: '', rules:
    '{ () <http://www.w3.org/2000/10/swap/time#localTime> ?t } => { <urn:s> <urn:time> ?t } .' }),
  code('REASONING_UNSUPPORTED'));
});

test('real engine cannot read a submitted file URL or resolve a network URL', real, async t => {
  const r = reasoner(t);
  const dir = await directory(t);
  const secret = resolve(dir, 'secret.txt');
  await writeFile(secret, 'PRIVATE TEST CONTENT');
  for (const url of [`file://${secret}`, 'https://example.invalid/do-not-fetch']) {
    await assert.rejects(r.run({ data: '', rules:
      `{ <${url}> <http://www.w3.org/2000/10/swap/log#content> ?text } => { <urn:s> <urn:content> ?text } .` }),
    code('REASONING_UNSUPPORTED'));
  }
});

test('expanded rules and data reject IO fixtures, renamed prefixes and dynamic builtin construction', real, async t => {
  const r = reasoner(t);
  for (const name of ['content', 'semantics', 'semanticsOrError', 'imports', 'outputString', 'uri', 'parsedAsN3']) {
    await assert.rejects(r.run({ data: '', rules:
      `@prefix renamed: <http://www.w3.org/2000/10/swap/log#> .
      { <https://example.invalid/HELLO.n3> renamed:${name} ?v } => { <urn:s> <urn:p> ?v } .` }),
    code('REASONING_UNSUPPORTED'));
  }
  await assert.rejects(r.run({ ...input, rules:
    '@prefix renamed: <http://www.w3.org/2000/10/swap/time#> . { () renamed:localTime ?t } => { <urn:s> <urn:time> ?t } .' }),
  code('REASONING_UNSUPPORTED'));
  await assert.rejects(r.run({ ...input, rules:
    '@prefix renamed: <http://www.w3.org/2002/07/owl#> . <urn:s> renamed:imports <file:///tmp/HELLO.n3> .' }),
  code('REASONING_UNSUPPORTED'));
  await assert.rejects(r.run({ ...input, rules:
    '{ <urn:s> <http://www.w3.org/2000/10/swap/log#cont\\u0065nt> ?v } => { <urn:s> <urn:p> ?v } .' }),
  code('REASONING_UNSUPPORTED'));
  for (const iri of ['http://www.w3.org/2000/10/swap/log#content',
    'http://www.w3.org/2000/10/swap/log#semantics',
    'http://www.w3.org/2000/10/swap/time#localTime']) {
    // Even an object-position IRI cannot be used later as a variable predicate.
    await assert.rejects(r.run({ ...input, data: `<urn:s> <urn:p> <${iri}> .` }), code('REASONING_UNSUPPORTED'));
  }
});
