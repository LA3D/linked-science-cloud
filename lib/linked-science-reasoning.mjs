import { createHash } from 'node:crypto';
import { DataFactory, Parser, Writer, Store } from 'n3';

const fail = (code, message) => { throw Object.assign(new Error(message), { code, stage: 'reasoning' }); };
const hash = text => createHash('sha256').update(text).digest('hex');
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const plain = x => x && typeof x === 'object' && !Array.isArray(x);

// This surface only exchanges payloads with a private host adapter. Neither
// graphs nor proofs are implicitly printed into the driving model's context.
export function createWorkspaceReasoning({ adapter, capabilities, source, resolve, retainGraph, retainProof, release, operation, depend, orient, ensureActive, maxBytes }) {
  const runs = new WeakMap();
  const check = run => {
    const state = runs.get(run);
    if (!state) fail('LS_REASONING_RUN', 'A reasoning run from this workspace is required');
    resolve(run.derived);
    for (const h of state.sources) resolve(h);
    return state;
  };
  async function run(options = {}) {
    ensureActive();
    if (!plain(options) || Object.keys(options).some(k => !['sources','rules','graphPolicy','proof','limits'].includes(k))) fail('LS_REASONING_OPTIONS', 'Unknown reasoning option');
    let { sources, rules, graphPolicy, proof = false, limits = {} } = options;
    if (!Array.isArray(sources) || !sources.length || sources.length !== 1 || new Set(sources).size !== sources.length) fail('LS_REASONING_SOURCES', 'Supply one retained RDF source; explicitly construct a merged source first');
    sources.forEach(h => source(h));
    if (graphPolicy !== 'default-graph-only') fail('LS_REASONING_GRAPH_POLICY', 'Explicit default-graph-only policy is required; named graphs are rejected');
    if (!plain(rules) || Object.keys(rules).some(k => !['id','version','text'].includes(k)) || !['id','version'].every(k => typeof rules[k] === 'string' && rules[k].length > 0 && rules[k].length <= 160) || typeof rules.text !== 'string' || !rules.text.length || Buffer.byteLength(rules.text) > 65536) fail('LS_REASONING_RULES', 'Rules require bounded id, version and N3 text (maximum 64 KiB)');
    if (typeof proof !== 'boolean' || !plain(limits)) fail('LS_REASONING_OPTIONS', 'Invalid proof or limits');
    sources = [...sources]; rules = Object.freeze({ ...rules }); limits = Object.freeze({ ...limits });
    if (!adapter || capabilities?.available === false) fail('LS_REASONING_UNAVAILABLE', 'Pinned Eyeron adapter unavailable; inspect reasoning.capabilities()');
    const ceiling = capabilities?.ceilings?.maxInputBytes ?? capabilities?.limits?.maxInputBytes ?? 1024 * 1024;
    const inputLimit = limits.maxInputBytes ?? capabilities?.defaults?.maxInputBytes ?? ceiling;
    if (!Number.isSafeInteger(inputLimit) || inputLimit < 1 || inputLimit > ceiling) fail('LS_REASONING_INPUT_LIMIT', 'Invalid reasoning input byte bound');
    const writer = new Writer({ format: 'N-Triples' });
    let data = '', bytes = 0;
    const reverse = new Map();
    // Different retained datasets have independent blank-node scopes. Preserve
    // identity within each source and map engine output back to that source.
    for (let i = 0; i < sources.length; i++) {
      const names = new Map();
      const rewrite = t => {
        if (t.termType === 'BlankNode') {
          if (!names.has(t.value)) { const name = `s${i}b${names.size}`; names.set(t.value, name); reverse.set(name, t); }
          return DataFactory.blankNode(names.get(t.value));
        }
        if (!['NamedNode','Literal'].includes(t.termType)) fail('LS_REASONING_TERM', 'Only RDF 1.1 terms are supported');
        return t;
      };
      for await (const q of source(sources[i]).match()) {
        if (q.graph.termType !== 'DefaultGraph') fail('LS_REASONING_NAMED_GRAPH', 'Select or construct the intended default graph explicitly before reasoning');
        const line = writer.quadToString(rewrite(q.subject), rewrite(q.predicate), rewrite(q.object), DataFactory.defaultGraph());
        bytes += Buffer.byteLength(line);
        if (bytes > inputLimit) fail('LS_REASONING_INPUT_LIMIT', 'Complete source exceeds reasoning input bound; no truncated execution was submitted');
        data += line;
      }
      resolve(sources[i]);
    }
    const operationId = operation();
    const response = await adapter.run({ data, rules: rules.text, proof, limits });
    ensureActive(); sources.forEach(h => resolve(h));
    if (response?.complete !== true || typeof response.derived !== 'string' || (proof && typeof response.proof !== 'string')) fail('LS_REASONING_INCOMPLETE', 'Reasoner did not return a complete result');
    const outputLimit = limits.maxOutputBytes ?? capabilities?.defaults?.maxOutputBytes ?? capabilities?.limits?.maxOutputBytes ?? 1024 * 1024;
    const proofLimit = limits.maxProofBytes ?? capabilities?.defaults?.maxProofBytes ?? outputLimit;
    if (Buffer.byteLength(response.derived) > outputLimit || Buffer.byteLength(response.proof ?? '') > proofLimit) fail('LS_REASONING_OUTPUT_LIMIT', 'Reasoner output exceeds admission bound');
    let quads;
    try { quads = new Parser({ format: 'Turtle', blankNodePrefix: '' }).parse(response.derived); }
    catch { fail('LS_REASONING_OUTPUT', 'Derived output is not valid RDF 1.1 Turtle'); }
    const fresh = new Map();
    const remap = t => {
      if (t.termType !== 'BlankNode') return t;
      if (reverse.has(t.value)) return reverse.get(t.value);
      if (!fresh.has(t.value)) fresh.set(t.value, DataFactory.blankNode());
      return fresh.get(t.value);
    };
    quads = [...new Store(quads.map(q => {
      if (q.graph.termType !== 'DefaultGraph') fail('LS_REASONING_OUTPUT', 'Derived output contains a named graph');
      return DataFactory.quad(remap(q.subject), remap(q.predicate), remap(q.object));
    }))];
    const report = freeze({ kind: 'linked-science-reasoning-run', operationId, complete: true,
      semantics: 'explicit-n3-rules', graphPolicy, rules: { id: rules.id, version: rules.version, sha256: hash(rules.text), authority: 'caller-supplied-premises' },
      inputs: sources.map(h => ({ id: h.id, epoch: h.epoch, fingerprints: [...resolve(h).fingerprints] })),
      inputSha256: hash(data), outputSha256: hash(response.derived), engine: response.engine,
      elapsedMs: response.elapsedMs, limits: response.limits, ...(response.usage ? { usage: response.usage } : {}), count: quads.length,
      proof: { available: proof, verified: false, ...(proof ? { sha256: hash(response.proof), bytes: Buffer.byteLength(response.proof) } : {}) },
      validity: 'source-dependent-workspace-epoch', blankNodes: 'source-scoped-inputs' });
    // Admit atomically: no successful handle can survive a failed admission.
    let derived, proofHandle;
    try {
      derived = retainGraph(quads, report);
      if (proof) proofHandle = retainProof(response.proof, report);
      depend(derived, sources);
      if (proofHandle) depend(proofHandle, [derived]);
      await orient(derived);
      sources.forEach(h => resolve(h));
      const result = Object.freeze({ derived, proof: proofHandle ?? null, report });
      runs.set(result, { sources: [...sources] });
      return result;
    } catch (error) {
      if (proofHandle) await release(proofHandle);
      if (derived) await release(derived);
      throw error;
    }
  }
  return Object.freeze({
    capabilities: () => capabilities ?? Object.freeze({ available: false }),
    run,
    describe(value) { check(value); return value.report; },
    explain(value, { maxBytes: requested = Math.min(maxBytes, 4096) } = {}) {
      check(value);
      if (!value.proof) fail('LS_REASONING_PROOF_UNAVAILABLE', 'This run did not retain an N3 proof');
      const proofText = resolve(value.proof).value.text;
      if (!Number.isSafeInteger(requested) || requested < 256 || requested > maxBytes) fail('LS_REASONING_EXPLANATION_BOUND', 'Explanation byte limit must fit the workspace projection bound');
      const payload = { kind: 'linked-science-proof-excerpt', operationId: value.report.operationId, format: 'N3', verified: false, selectedConclusion: false, truncated: true, text: '' };
      const room = requested - Buffer.byteLength(JSON.stringify(payload));
      // JSON escaping can expand text; binary search to bound the entire view.
      let low = 0, high = Math.min(proofText.length, room);
      while (low < high) { const mid = Math.ceil((low + high) / 2); payload.text = proofText.slice(0, mid); if (Buffer.byteLength(JSON.stringify(payload)) <= requested) low = mid; else high = mid - 1; }
      payload.text = proofText.slice(0, low); payload.truncated = low < proofText.length;
      return Object.freeze(payload);
    },
  });
}
