import assert from 'node:assert/strict';
import test from 'node:test';
import { setupLinkedScience } from '../lib/linked-science-runtime.mjs';
import { MediatedTraversalBroker } from '../packages/cleanroom-node-repl/src/mediated-traversal.mjs';

const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const XML = `<rdf:RDF xmlns:rdf="${RDF}" xmlns:ex="https://example.test/vocab/">
 <rdf:Description rdf:about="#protein">
  <ex:sequence rdf:nodeID="sequence"/>
  <ex:label xml:lang="en">Protein &amp; peptide</ex:label>
 </rdf:Description>
 <rdf:Description rdf:nodeID="sequence">
  <rdf:value rdf:datatype="http://www.w3.org/2001/XMLSchema#string">GYDPETGTWG</rdf:value>
  <ex:count rdf:datatype="http://www.w3.org/2001/XMLSchema#integer">010</ex:count>
  <ex:link rdf:resource="related"/>
 </rdf:Description>
</rdf:RDF>`;
const TURTLE = `@prefix ex: <https://example.test/vocab/> .
@prefix rdf: <${RDF}> . @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
<https://data.example/ontology.rdf#protein> ex:sequence _:s; ex:label "Protein & peptide"@en .
_:s rdf:value "GYDPETGTWG"^^xsd:string; ex:count "010"^^xsd:integer; ex:link <https://data.example/related> .`;

async function fixture(body = XML, mediaType = 'application/rdf+xml', budgets) {
  const calls = [];
  const owner = { token: 'c'.repeat(64), epoch: 1 };
  const broker = new MediatedTraversalBroker({ fetchImpl: async url => {
    calls.push(String(url));
    return new Response(body, { headers: { 'content-type': mediaType } });
  } });
  const traversal = {
    capabilities: () => broker.capabilities(),
    beginTraversal: budget => broker.beginTraversal(budget, owner),
    request: (traversalId, request) => broker.request({ traversalId, request }, owner),
    snapshotTraversal: traversalId => broker.snapshotTraversal({ traversalId }, owner),
    finishTraversal: traversalId => broker.finishTraversal({ traversalId }, owner),
    abortTraversal: (traversalId, reason) => broker.abortTraversal({ traversalId, reason }, owner),
    createFetch() { throw new Error('Parsing must never acquire another resource'); },
  };
  const ws = (await setupLinkedScience({ nodeRepl: {}, traversal, budgets })).open({ contextKey: 'rdfxml-fixture' });
  const resource = await ws.resources.get('https://data.example/ontology.rdf');
  return { ws, resource, calls };
}

function semanticQuads(dataset) {
  // The fixture has one shared blank node; compare topology without assuming
  // cross-parser blank-node identifiers have meaning outside their graphs.
  return [...dataset].map(q => [q.subject, q.predicate, q.object, q.graph].map(t =>
    t.termType === 'BlankNode' ? ['BlankNode'] : [t.termType, t.value, t.language ?? '', t.datatype?.value ?? ''],
  )).map(JSON.stringify).sort();
}

test('retained RDF/XML matches Turtle terms and blank-node topology with source provenance and no refetch', async () => {
  const { ws, resource, calls } = await fixture();
  const graph = await resource.rdf({ name: 'xml-ontology', kind: 'ontology' });
  const turtle = await ws.graphs.load({ name: 'turtle-ontology', kind: 'ontology', text: TURTLE });
  for (const handle of [graph, turtle]) {
    const blankNodes = new Set([...ws.rdf.dataset(handle)].flatMap(q =>
      [q.subject, q.predicate, q.object, q.graph].filter(t => t.termType === 'BlankNode').map(t => t.value)));
    assert.equal(blankNodes.size, 1);
  }
  assert.deepEqual(semanticQuads(ws.rdf.dataset(graph)), semanticQuads(ws.rdf.dataset(turtle)));
  const profile = ws.results.profile(graph);
  assert.equal(profile.count, 5);
  assert.equal(profile.provenance.format, 'application/rdf+xml');
  assert.equal(profile.provenance.sourceResource, resource.handle.id);
  assert.equal(profile.provenance.resourceProvenance.traversalReceipt.status, 'complete');
  assert.equal(calls.length, 1);
});

test('XML base overrides the response URL and RDF/XML can be explicitly selected for generic XML', async () => {
  const { ws, resource } = await fixture(XML.replace('<rdf:RDF ', '<rdf:RDF xml:base="https://vocab.example/base/" '), 'application/xml');
  const graph = await resource.rdf({ name: 'explicit-xml', format: 'RDF/XML' });
  assert.ok([...ws.rdf.dataset(graph)].some(q => q.subject.value === 'https://vocab.example/base/#protein'));
});

for (const [label, body] of [
  ['truncated XML', XML.slice(0, -10)],
  ['malformed XML', XML.replace('</rdf:Description>', '</wrong>')],
  ['external entity', `<!DOCTYPE rdf:RDF [<!ENTITY secret SYSTEM "https://private.example/secret">]>${XML}`],
  ['internal entity', `<!DOCTYPE rdf:RDF [<!ENTITY expansion "repeated">]>${XML}`],
]) {
  test(`${label} fails without a partial graph or another request`, async () => {
    const { ws, resource, calls } = await fixture(body);
    const before = ws.inventory();
    await assert.rejects(resource.rdf({ name: 'invalid-xml' }), e => e.code === 'LS_RESOURCE_RDF_PARSE');
    assert.deepEqual(ws.inventory(), before);
    assert.equal(calls.length, 1);
  });
}

test('unsupported serialization recovery never advises relabelling bytes', async () => {
  const { resource, calls } = await fixture('<html>not RDF/XML</html>', 'text/html');
  await assert.rejects(resource.rdf({ name: 'unsupported-rdf' }), e => {
    assert.equal(e.code, 'LS_RESOURCE_RDF_FORMAT');
    assert.match(e.repair.action, /changing format does not convert/);
    assert.equal(e.repair.budgetImpact.liveRequests, 0);
    return true;
  });
  assert.equal(calls.length, 1);
});

test('RDF/XML collection respects the existing resident quad bound', async () => {
  const { resource, calls } = await fixture(XML, 'application/rdf+xml', { maxResidentGraphQuads: 2 });
  await assert.rejects(resource.rdf({ name: 'bounded-xml' }), e => e.code === 'LS_RESOURCE_RDF_PARSE');
  assert.equal(calls.length, 1);
});

test('workspace quad capacity rejects atomically and parsing can recover after release', async () => {
  const { ws, resource, calls } = await fixture(XML, 'application/rdf+xml', {
    maxResidentGraphQuads: 5, maxWorkspaceGraphQuads: 5,
  });
  try {
    const occupied = await ws.graphs.load({ name: 'occupied', text: '<urn:s> <urn:p> <urn:o> .', kind: 'instance-data' });
    const before = ws.inventory();
    await assert.rejects(resource.rdf({ name: 'capacity-xml' }), { code: 'LS_RESOURCE_RDF_PARSE' });
    assert.deepEqual(ws.inventory(), before);
    await ws.release(occupied);
    const graph = await resource.rdf({ name: 'capacity-xml' });
    assert.equal(ws.results.profile(graph).count, 5);
    assert.equal(calls.length, 1);
  } finally { await ws.dispose(); }
});
