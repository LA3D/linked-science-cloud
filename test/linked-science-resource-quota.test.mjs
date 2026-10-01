import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setupLinkedScience } from '../lib/linked-science-runtime.mjs';
import { MediatedTraversalBroker } from '../packages/cleanroom-node-repl/src/mediated-traversal.mjs';
import { ResourceStorage } from '../packages/cleanroom-node-repl/src/resource-storage.mjs';

const CEILING = 100_000_000;
const XML = `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:ex="urn:example:"><rdf:Description rdf:about="urn:item"><ex:label>Example</ex:label></rdf:Description></rdf:RDF>`;

async function fixture(t, bytes, budgets) {
  const root = await mkdtemp(join(tmpdir(), 'ls-resource-quota-'));
  const owner = { token: 'quota-test', epoch: 1 };
  const resources = new ResourceStorage({ tempRoot: root, reserveBytes: 0 });
  let requests = 0;
  let reads = 0;
  const broker = new MediatedTraversalBroker({ resourceStorage: resources, fetchImpl: async () => {
    requests++;
    let remaining = bytes - Buffer.byteLength(XML);
    let started = false;
    const padding = Buffer.alloc(64 * 1024, 32);
    return new Response(new ReadableStream({ pull(controller) {
      if (!started) { started = true; controller.enqueue(Buffer.from(XML)); }
      else if (remaining > 0) {
        const count = Math.min(remaining, padding.length);
        controller.enqueue(padding.subarray(0, count)); remaining -= count;
      } else controller.close();
    } }), { headers: { 'content-type': 'text/plain' } });
  } });
  const traversal = {
    capabilities: () => broker.capabilities(),
    beginTraversal: budget => broker.beginTraversal(budget, owner),
    beginResource: options => broker.beginResource(options, owner),
    request: (traversalId, request) => broker.request({ traversalId, request }, owner),
    snapshotTraversal: traversalId => broker.snapshotTraversal({ traversalId }, owner),
    finishTraversal: traversalId => broker.finishTraversal({ traversalId }, owner),
    abortTraversal: (traversalId, reason) => broker.abortTraversal({ traversalId, reason }, owner),
    readResource: (storageId, options) => { reads++; return resources.read({ storageId, ...options }, owner); },
    releaseResource: storageId => resources.release({ storageId }, owner),
    createFetch() { throw new Error('Parsing must not refetch'); },
  };
  const ls = await setupLinkedScience({ nodeRepl: {}, traversal, budgets });
  const ws = ls.open({ contextKey: 'resource-quota' });
  t.after(async () => {
    await ws.dispose(); await resources.releaseOwner(owner); await rm(root, { recursive: true, force: true });
  });
  const resource = await ws.resources.get('https://example.test/ontology.owl', { storage: 'disk', maxBytes: bytes });
  return { ls, ws, resource, counts: () => ({ requests, reads }) };
}

test('disk RDF/XML larger than the old 4MB limit parses through mediation with bounded output', async t => {
  const { ls, ws, resource, counts } = await fixture(t, 4_000_001);
  assert.equal(ls.capabilities().budgets.maxResidentResourceBytes, CEILING);
  assert.equal(ls.capabilities().budgetPlanes.residency.kernelHeap.headroomCheck, 'live');
  const graph = await resource.rdf({ name: 'modest-ontology', kind: 'ontology', format: 'application/rdf+xml' });
  assert.equal(ws.results.profile(graph).count, 1);
  assert.equal(ws.results.profile(graph).provenance.resourceProvenance.traversalReceipt.status, 'complete');
  assert.equal(counts().requests, 1);
  assert.ok(counts().reads > 1);
  assert.equal(ls.capabilities().budgets.maxBytes, 32_768);
  assert.equal((await resource.inspect()).bytes, 4_000_001);
  await assert.rejects(resource.read({ length: 1_048_577 }), { code: 'LS_RESOURCE_READ_BOUND' });
});

test('a disk resource above 100MB is rejected before whole-body reads or partial graph retention', async t => {
  const { ws, resource, counts } = await fixture(t, CEILING + 1);
  const before = ws.inventory();
  for (const convert of [() => resource.text(), () => resource.json(), () => resource.arrayBuffer(),
    () => resource.rdf({ name: 'oversized-ontology', format: 'application/rdf+xml' })]) {
    await assert.rejects(convert(), { code: 'LS_RESOURCE_WORKING_MEMORY' });
  }
  assert.deepEqual(ws.inventory(), before);
  assert.deepEqual(counts(), { requests: 1, reads: 0 });
  assert.equal((await resource.read({ length: 64 })).length, 64);
});

test('a tighter resource quota and native graph quota still reject atomically', async t => {
  const { ws, resource } = await fixture(t, 4_000_001, { maxResidentResourceBytes: 4_000_000 });
  const before = ws.inventory();
  await assert.rejects(resource.rdf({ name: 'tight-ontology', format: 'application/rdf+xml' }), { code: 'LS_RESOURCE_WORKING_MEMORY' });
  assert.deepEqual(ws.inventory(), before);
  const bounded = await fixture(t, 4_000_001, { maxResidentGraphQuads: 1, maxWorkspaceGraphQuads: 1 });
  await bounded.ws.graphs.load({ name: 'occupied', kind: 'instance-data', text: '<urn:s> <urn:p> <urn:o> .' });
  const occupied = bounded.ws.inventory();
  await assert.rejects(bounded.resource.rdf({ name: 'graph-bound', format: 'application/rdf+xml' }), { code: 'LS_RESOURCE_RDF_PARSE' });
  assert.deepEqual(bounded.ws.inventory(), occupied);
});

test('100MB configuration is accepted and larger configurations are rejected', async () => {
  const ls = await setupLinkedScience({ nodeRepl: {}, budgets: { maxResidentResourceBytes: CEILING } });
  assert.equal(ls.capabilities().budgets.maxResidentResourceBytes, CEILING);
  await assert.rejects(setupLinkedScience({ nodeRepl: {}, budgets: { maxResidentResourceBytes: CEILING + 1 } }), { code: 'LS_BOUND_EXCEEDED' });
});
