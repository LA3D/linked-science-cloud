import { parentPort, workerData } from 'node:worker_threads';
import { open, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { Parser } from 'n3';

const PIN = 'd97a3e9e35d4c12960a46570eb20ab32287ef8d07e88dc7aa04c0c1b70fbd88d';
const error = (code, message) => Object.assign(new Error(message), { code });
const fail = (code, message) => { throw error(code, message); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const SWAP = 'http://www.w3.org/2000/10/swap/';
// Deliberately narrow profile, applied to expanded named nodes in every position
// (including nested formulas and RDF-star terms). No dynamic text-to-formula or
// string-to-IRI construction: those could hide a rejected builtin in a literal.
const allowedBuiltins = new Set(Object.entries({
  log: 'implies impliedBy equalTo notEqualTo includes notIncludes rawType dtlit langlit skolem nameOf conjunction conclusion collectAllIn forAllIn',
  math: 'sum greaterThan lessThan notGreaterThan notLessThan equalTo notEqualTo difference product quotient integerQuotient remainder exponentiation negation absoluteValue rounded sin cos tan asin acos atan sinh cosh tanh degrees',
  string: 'lessThan greaterThan notLessThan notGreaterThan concatenation contains containsIgnoringCase endsWith startsWith equalIgnoringCase notEqualIgnoringCase format matches notMatches replace scrape',
  list: 'append iterate map firstRest reverse sort notMember first rest last length member in memberAt remove',
  crypto: 'sha',
}).flatMap(([namespace, names]) => names.split(' ').map(name => `${SWAP}${namespace}#${name}`)));

function validateTerm(term) {
  if (term.termType === 'Quad') {
    for (const part of [term.subject, term.predicate, term.object, term.graph]) validateTerm(part);
  } else if (term.termType === 'Literal') validateTerm(term.datatype);
  else if (term.termType === 'NamedNode') {
    const iri = term.value;
    if ((iri.startsWith(SWAP) && !allowedBuiltins.has(iri)) ||
        iri.startsWith('http://eulersharp.sourceforge.net/2003/03swap/') ||
        iri.startsWith('https://eulersharp.sourceforge.net/2003/03swap/') ||
        iri === 'http://www.w3.org/2002/07/owl#imports' || iri === 'urn:eyeron:unquote') {
      fail('REASONING_UNSUPPORTED', 'IRI is outside the deterministic N3 builtin profile');
    }
  }
}
const uleb = value => {
  const bytes = [];
  do { const low = value & 127; value = Math.floor(value / 128); bytes.push(low | (value ? 128 : 0)); } while (value);
  return Buffer.from(bytes);
};

/** Verify ORIGINAL bytes before changing ONLY the single wasm32 memory limit.
 * Exported for direct enforcement tests; no unpinned module can pass this gate.
 * v0.5.13 has exactly memory-section payload [1, 0, 23]: one unshared
 * 32-bit memory, no maximum, 23 initial 64KiB pages. Fail closed on drift.
 */
export function constrainEyeronMemory(bytes, memoryMiB) {
  if (hash(bytes) !== PIN) fail('REASONING_INTEGRITY', 'Eyeron Wasm SHA-256 mismatch');
  if (!Number.isSafeInteger(memoryMiB) || memoryMiB < 2 || memoryMiB > 256) {
    fail('REASONING_INVALID_LIMITS', 'Invalid Wasm memory ceiling');
  }
  let cursor = 8;
  const readLength = () => {
    let result = 0;
    for (let shift = 0; shift < 35 && cursor < bytes.length; shift += 7) {
      const byte = bytes[cursor++];
      result += (byte & 127) * 2 ** shift;
      if (!(byte & 128)) return result;
    }
    fail('REASONING_INTEGRITY', 'Invalid Wasm section length');
  };
  while (cursor < bytes.length) {
    const start = cursor;
    const id = bytes[cursor++];
    const size = readLength();
    const end = cursor + size;
    if (end > bytes.length) fail('REASONING_INTEGRITY', 'Invalid Wasm section');
    if (id === 5) {
      if (size !== 3 || bytes[cursor] !== 1 || bytes[cursor + 1] !== 0 || bytes[cursor + 2] !== 23) {
        fail('REASONING_INTEGRITY', 'Unexpected Wasm memory declaration');
      }
      const payload = Buffer.concat([Buffer.from([1, 1, 23]), uleb(memoryMiB * 16)]);
      return Buffer.concat([bytes.subarray(0, start), Buffer.from([5]), uleb(payload.length),
        payload, bytes.subarray(end)]);
    }
    cursor = end;
  }
  fail('REASONING_INTEGRITY', 'Missing Wasm memory declaration');
}

async function load(modulePath, limits) {
  let bytes;
  try {
    if (!(await stat(modulePath)).isFile()) fail('REASONING_UNAVAILABLE', 'Eyeron module is not a file');
    const file = await open(resolve(dirname(modulePath), 'eyeron_bg.wasm'), 'r');
    try {
      // Fixed-size read also bounds a file that grows after stat; never import JS.
      const size = 2_052_543;
      if (!(await file.stat()).isFile()) fail('REASONING_UNAVAILABLE', 'Eyeron Wasm is not a file');
      const buffer = Buffer.alloc(size + 1);
      let offset = 0;
      while (offset < buffer.length) {
        const { bytesRead } = await file.read(buffer, offset, buffer.length - offset, offset);
        if (!bytesRead) break;
        offset += bytesRead;
      }
      if (offset !== size) fail('REASONING_INTEGRITY', 'Unexpected Eyeron Wasm size');
      bytes = buffer.subarray(0, offset);
    } finally { await file.close(); }
  } catch (err) {
    if (err.code?.startsWith('REASONING_')) throw err;
    fail('REASONING_UNAVAILABLE', 'Pinned Eyeron installation is unavailable');
  }
  const constrained = constrainEyeronMemory(bytes, limits.wasmMemoryMiB);
  const transformedSha256 = hash(constrained);
  const module = new WebAssembly.Module(constrained);
  const names = ['__wbg_now_068e5f722db9b3cd', '__wbg___wbindgen_throw_344f42d3211c4765',
    '__wbindgen_cast_0000000000000001'];
  const imports = WebAssembly.Module.imports(module);
  if (imports.length !== names.length || imports.some((entry, i) =>
    entry.module !== './eyeron_bg.js' || entry.kind !== 'function' || entry.name !== names[i])) {
    fail('REASONING_INTEGRITY', 'Unexpected Eyeron host imports');
  }
  // Minimal pinned wasm-bindgen ABI from pkg/eyeron.js. The Rust Wasm entrypoint
  // parses strings directly: no CLI import resolver, WASI, filesystem or network.
  // Source audit: src/wasm.rs and src/n3/reasoner.rs. log:content/semantics have
  // static HELLO fixture fallbacks, NOT retrieval. Clock-dependent builtins fail.
  let wasm;
  const heap = new Array(1024).fill(undefined);
  heap.push(undefined, null, true, false);
  const decode = (ptr, len, max) => {
    ptr >>>= 0; len >>>= 0;
    if (len > max) fail('REASONING_OUTPUT_TOO_LARGE', 'Engine report exceeds its byte bound');
    if (ptr + len > wasm.memory.buffer.byteLength) fail('REASONING_FAILED', 'Invalid Wasm string');
    return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(wasm.memory.buffer, ptr, len));
  };
  wasm = new WebAssembly.Instance(module, { './eyeron_bg.js': {
    [names[0]]: () => fail('REASONING_UNSUPPORTED', 'Clock-dependent reasoning is unsupported'),
    [names[1]]: () => fail('REASONING_FAILED', 'Eyeron Wasm threw an exception'),
    [names[2]]: (ptr, len) => {
      heap.push(decode(ptr, len, 65536));
      return heap.length - 1;
    },
  } }).exports;
  const view = () => new DataView(wasm.memory.buffer);
  const string = text => {
    const data = new TextEncoder().encode(text);
    const ptr = wasm.__wbindgen_export(data.length, 1) >>> 0;
    new Uint8Array(wasm.memory.buffer, ptr, data.length).set(data);
    return [ptr, data.length];
  };
  const versionPointer = wasm.__wbindgen_add_to_stack_pointer(-16);
  wasm.version(versionPointer);
  const version = decode(view().getUint32(versionPointer, true), view().getUint32(versionPointer + 4, true), 128);
  wasm.__wbindgen_export3(view().getUint32(versionPointer, true), view().getUint32(versionPointer + 4, true), 1);
  wasm.__wbindgen_add_to_stack_pointer(16);
  if (version !== '0.5.13') fail('REASONING_INTEGRITY', 'Unexpected Eyeron version');
  return {
    transformedSha256,
    memoryBytes: () => wasm.memory.buffer.byteLength,
    reason(rules, data, proof, outputLimit) {
      const ret = wasm.__wbindgen_add_to_stack_pointer(-16);
      let session;
      let completed = false;
      try {
        wasm.eyeronsession_new(ret, ...string(rules), proof);
        if (view().getInt32(ret + 8, true)) fail('REASONING_MALFORMED_RULES', 'Eyeron rejected the N3 rules');
        session = view().getUint32(ret, true);
        if (wasm.eyeronsession_programRules(session) > limits.maxRules) {
          fail('REASONING_RULE_LIMIT', 'Compiled rule count exceeds maxRules');
        }
        wasm.eyeronsession_reasonReport(ret, session, ...string(data), true, ...string('ntriples'));
        const ptr = view().getUint32(ret, true);
        const len = view().getUint32(ret + 4, true);
        let report;
        try {
          // JSON escaping can expand every output byte sixfold; bound before decode.
          report = JSON.parse(decode(ptr, len, outputLimit * 6 + 65536));
        } finally { wasm.__wbindgen_export3(ptr, len, 1); }
        if (report?.ok === false) {
          fail(report.error?.code === 'parse_error' ? 'REASONING_MALFORMED_INPUT' : 'REASONING_INCOMPLETE',
            'Eyeron did not produce a complete result');
        }
        if (report?.ok !== true || typeof report.output !== 'string' || !report.statistics ||
            !['iterations', 'matchSteps', 'explicitFacts', 'derivedFacts', 'rules'].every(key =>
              Number.isSafeInteger(report.statistics[key]) && report.statistics[key] >= 0)) {
          fail('REASONING_FAILED', 'Malformed Eyeron completion report');
        }
        if (Buffer.byteLength(report.output) > outputLimit) {
          fail(proof ? 'REASONING_PROOF_TOO_LARGE' : 'REASONING_OUTPUT_TOO_LARGE', 'Reasoning output exceeds its byte bound');
        }
        completed = true;
        return report.output;
      } finally {
        // A JS exception through Rust can leave borrows/stack frames live. Never
        // re-enter that instance to free it: the parent terminates the worker.
        if (completed) {
          wasm.__wbg_eyeronsession_free(session, 0);
          wasm.__wbindgen_add_to_stack_pointer(16);
        }
      }
    },
  };
}

function validate(text, format, code, profile = false) {
  return new Promise((accept, reject) => {
    // Callback parsing avoids retaining another full array of RDF quads.
    const parser = new Parser({ format });
    parser.parse(text, (err, quad) => {
      if (err || (format !== 'N3' && quad && quad.graph.termType !== 'DefaultGraph')) {
        reject(error(code, `Expected valid ${format}`));
      }
      if (profile && quad) {
        try { validateTerm(quad); } catch (failure) { reject(failure); }
      }
      if (!quad) accept();
    });
  });
}

async function main({ modulePath, limits, operation, data, rules, proof }) {
  const api = await load(modulePath, limits);
  const engine = { name: 'eyeron', version: '0.5.13', sha256: PIN,
    transformedSha256: api.transformedSha256 };
  if (operation === 'probe') return { verified: true, engine };
  // Upstream promises N-Triples/default graph; validate defensively in isolation.
  await validate(data, 'N-Triples', 'REASONING_MALFORMED_INPUT', true);
  await validate(rules, 'N3', 'REASONING_MALFORMED_RULES', true);
  const derived = api.reason(rules, data, false, limits.maxOutputBytes);
  await validate(derived, 'Turtle', 'REASONING_MALFORMED_OUTPUT');
  const proofText = proof ? api.reason(rules, data, true, limits.maxProofBytes) : null;
  if (proof) await validate(proofText, 'N3', 'REASONING_MALFORMED_OUTPUT');
  return { derived, proof: proofText, engine, usage: {
    inputBytes: Buffer.byteLength(data), rulesBytes: Buffer.byteLength(rules),
    outputBytes: Buffer.byteLength(derived), proofBytes: proofText === null ? 0 : Buffer.byteLength(proofText),
    wasmLinearMemoryBytes: api.memoryBytes(),
    memoryPolicy: { kind: 'bounded-wasm-linear-memory-and-worker-heap',
      wasmMaximumBytes: limits.wasmMemoryMiB * 1024 * 1024,
      workerOldGenerationMiB: limits.workerHeapMiB, workerYoungGenerationMiB: 8,
      workerStackMiB: 4, processRssCeiling: false },
  } };
}

if (parentPort && workerData) {
  main(workerData).then(result => parentPort.postMessage({ result }), err => {
    parentPort.postMessage({ error: {
      code: err.code?.startsWith('REASONING_') ? err.code : 'REASONING_FAILED',
      message: err.code?.startsWith('REASONING_') ? err.message : 'Isolated Eyeron execution failed',
    } });
  });
}
