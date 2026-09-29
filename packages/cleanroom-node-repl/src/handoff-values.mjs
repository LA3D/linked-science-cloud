import { createHash } from 'node:crypto';

export function fail(code, message = code) { throw Object.assign(new Error(message), {code}); }
export function jsonCopy(value, maxBytes = 65536) {
  let nodes = 0, bytes = 0;
  const seen = new Set();
  const charge = n => { bytes += n; if (bytes > maxBytes) fail('HANDOFF_BYTES'); };
  function visit(v, depth) {
    if (++nodes > 100000 || depth > 40) fail('HANDOFF_JSON_DEPTH');
    if (v === null || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) { charge(16); return v; }
    if (typeof v === 'string') { charge(Buffer.byteLength(v) + 2); return v; }
    if (!v || typeof v !== 'object' || seen.has(v)) fail('HANDOFF_JSON');
    const array = Array.isArray(v), proto = Object.getPrototypeOf(v);
    if (!array && proto !== null && (Object.getPrototypeOf(proto) !== null || Object.getOwnPropertyDescriptor(proto, 'constructor')?.value?.name !== 'Object')) fail('HANDOFF_JSON');
    if(array && v.length>100000)fail('HANDOFF_JSON_DEPTH');
    seen.add(v); charge(2);
    const out = array ? [] : Object.create(null);
    const keys=Reflect.ownKeys(v);
    if(keys.some(key=>typeof key!=='string'))fail('HANDOFF_JSON');
    for (const key of keys.sort()) {
      if (array && key === 'length') continue;
      const d = Object.getOwnPropertyDescriptor(v, key);
      if (typeof key !== 'string' || !d.enumerable || !Object.hasOwn(d, 'value')) fail('HANDOFF_JSON');
      if (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= v.length)) fail('HANDOFF_JSON');
      charge(Buffer.byteLength(key) + 4);
      Object.defineProperty(out, key, {value:visit(d.value, depth + 1),enumerable:true,writable:true,configurable:true});
    }
    if (array && (out.length !== v.length || Array.from({length:v.length}, (_, i) => Object.hasOwn(out, i)).includes(false))) fail('HANDOFF_JSON');
    seen.delete(v); return out;
  }
  const out = visit(value, 0);
  if (Buffer.byteLength(JSON.stringify(out)) > maxBytes) fail('HANDOFF_BYTES');
  return out;
}
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function name(value) { if (typeof value !== 'string' || !/^[A-Za-z0-9_.:-]{1,128}$/.test(value)) fail('HANDOFF_NAME'); return value; }
export function integer(value, min, max) { if (!Number.isSafeInteger(value) || value < min || value > max) fail('HANDOFF_BOUNDS'); return value; }
export function fields(value, allowed) { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) fail('HANDOFF_FIELDS'); }
export function validateContract(contract, value, validateValue = true) {
  fields(contract, ['type','required','properties','maxBytes']);
  if (contract.type !== 'object') fail('HANDOFF_CONTRACT');
  integer(contract.maxBytes, 1, 32768);
  if (!Array.isArray(contract.required) || contract.required.length > 32 || !contract.properties || typeof contract.properties!=='object' || Array.isArray(contract.properties)) fail('HANDOFF_CONTRACT');
  const types = ['string','number','boolean','object','array','null'];
  if (Object.keys(contract.properties).length > 32 || Object.entries(contract.properties).some(([k,v]) => !name(k) || !types.includes(v)) || contract.required.some(k => !Object.hasOwn(contract.properties,k))) fail('HANDOFF_CONTRACT');
  if (!validateValue) return;
  fields(value, Object.keys(contract.properties));
  if (contract.required.some(k => !Object.hasOwn(value,k))) fail('HANDOFF_RESULT_SCHEMA');
  for (const [k,v] of Object.entries(value)) if ((v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v) !== contract.properties[k]) fail('HANDOFF_RESULT_SCHEMA');
  jsonCopy(value, contract.maxBytes);
}
// Versioned encoding identity, not RDF graph isomorphism/canonicalization.
export function rdfTerm(t, position) {
  fields(t, ['termType','value','language','datatype']);
  if (typeof t.value !== 'string') fail('HANDOFF_RDF');
  const allowed = position === 0 ? ['NamedNode','BlankNode'] : position === 1 ? ['NamedNode'] : position === 2 ? ['NamedNode','BlankNode','Literal'] : ['NamedNode','BlankNode','DefaultGraph'];
  if (!allowed.includes(t.termType)) fail('HANDOFF_RDF');
  if (t.termType === 'DefaultGraph' && t.value !== '') fail('HANDOFF_RDF');
  if (t.termType === 'Literal') {
    if (typeof t.language !== 'string' || typeof t.datatype !== 'string' || !t.datatype || (t.language && t.datatype !== 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString')) fail('HANDOFF_RDF');
  } else if (t.language !== undefined || t.datatype !== undefined) fail('HANDOFF_RDF');
}
export function validateSnapshot(snapshot) {
  fields(snapshot, ['format','kind','semantics','items','metadata']);
  if (snapshot.format !== 1 || !['json','rdf','bindings'].includes(snapshot.kind)) fail('HANDOFF_FORMAT');
  if (!Object.hasOwn(snapshot,'items') || !snapshot.metadata || typeof snapshot.metadata!=='object' || Array.isArray(snapshot.metadata))fail('HANDOFF_FORMAT');
  if (snapshot.kind === 'json') { if (snapshot.semantics !== 'json') fail('HANDOFF_FORMAT'); return; }
  if (!Array.isArray(snapshot.items) || snapshot.items.length > 10000) fail('HANDOFF_ITEMS');
  if (snapshot.kind === 'rdf') {
    if (!['sequence','set'].includes(snapshot.semantics)) fail('HANDOFF_FORMAT');
    if(snapshot.semantics==='sequence'&&!['ontology','schema','shacl','instance-data','inferred-graph'].includes(snapshot.metadata.kind))fail('HANDOFF_FORMAT');
    for (const q of snapshot.items) { if (!Array.isArray(q) || q.length !== 4) fail('HANDOFF_RDF'); q.forEach(rdfTerm); }
    if (snapshot.semantics === 'set' && new Set(snapshot.items.map(q => JSON.stringify(q))).size !== snapshot.items.length) fail('HANDOFF_RDF_SET');
  } else {
    if (snapshot.semantics !== 'bag-sequence') fail('HANDOFF_FORMAT');
    const columns=snapshot.metadata.columns;
    if(!Array.isArray(columns)||columns.length>100||columns.some(c=>typeof c!=='string'||!c||c.length>200)||new Set(columns).size!==columns.length)fail('HANDOFF_BINDINGS_COLUMNS');
    for (const row of snapshot.items) {
      if (!Array.isArray(row) || row.length > 100) fail('HANDOFF_BINDINGS');
      const seen = new Set();
      for (const pair of row) { if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || !columns.includes(pair[0]) || seen.has(pair[0])) fail('HANDOFF_BINDINGS'); seen.add(pair[0]); rdfTerm(pair[1],2); }
    }
  }
}
