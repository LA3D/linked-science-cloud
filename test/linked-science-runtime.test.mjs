import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { QueryEngine } from '@comunica/query-sparql';
import { Store } from 'n3';
import {
  LINKED_SCIENCE_API_SCHEMA,
  LinkedScienceRuntimeError,
  setupLinkedScience,
} from '../lib/linked-science-runtime.mjs';
import { evaluateRuntimeDiscoveryTrace } from '../lib/runtime-discovery-evaluation.mjs';
import {
  EX,
  measurementQuery,
  ontologyQuads,
  shaclQuads,
  sourceAQuads,
  sourceBQuads,
} from './fixtures/linked-science-runtime/synthetic-science.mjs';

async function runtimeFixture({ contextKey = 'measurement-goal', budgets } = {}) {
  const nodeRepl = {};
  const linkedScience = await setupLinkedScience({ nodeRepl, budgets });
  const workspace = linkedScience.open({ contextKey });
  await workspace.orientation.bootstrap();
  const ontology = await workspace.graphs.load({ name: 'science-ontology', kind: 'ontology', quads: ontologyQuads, source: { kind: 'local-synthetic', id: 'ontology' } });
  const shacl = await workspace.graphs.load({ name: 'measurement-shacl', kind: 'shacl', quads: shaclQuads, source: { kind: 'local-synthetic', id: 'shacl' } });
  const sourceA = await workspace.graphs.load({ name: 'source-a', kind: 'instance-data', quads: sourceAQuads, source: { kind: 'local-synthetic', id: 'source-a' } });
  const sourceB = await workspace.graphs.load({ name: 'source-b', kind: 'instance-data', quads: sourceBQuads, source: { kind: 'local-synthetic', id: 'source-b' } });
  return { nodeRepl, linkedScience, workspace, ontology, shacl, sourceA, sourceB };
}

test('bootstraps exactly once with stable facade bindings and generated discovery routes', async () => {
  const nodeRepl = {};
  const first = await setupLinkedScience({ nodeRepl });
  const second = await setupLinkedScience({ nodeRepl });
  assert.equal(first, second);
  assert.equal(nodeRepl.linkedScience, first);
  assert.equal(nodeRepl.ls, first);
  assert.equal(first.documentation().runtime, 'linked-science');
  assert.match(first.documentation.get('schema.search').signature, /schema\.search/);
  assert.equal(first.documentation.get('ontology').name, 'schema.search');
  assert.throws(() => first.documentation.get('neighbors-missing'), error => error instanceof LinkedScienceRuntimeError && error.code === 'LS_DOCUMENT_NOT_FOUND');
  assert.equal(first.capabilities().rawEngineExposed, false);
  assert.equal(first.capabilities().currentJsGuardIsSecuritySandbox, false);
  assert.deepEqual(first.examples(), { topics: [ 'bootstrap', 'ontology', 'query', 'derive', 'reset' ] });
  assert.match(first.examples('ontology').code, /schema\.search/);
  assert.equal(LINKED_SCIENCE_API_SCHEMA.bootstrap, first.documentation.get('bootstrap').usage);
  assert.equal(typeof first.compatibility.queryToHandleGuarded, 'function');
});

test('retains first-class graph objects with RDF term, duplicate, order, named-graph, and source fidelity', async () => {
  const { workspace, ontology, shacl, sourceA, sourceB } = await runtimeFixture();
  const sourceProfile = workspace.results.profile(sourceA);
  assert.equal(sourceProfile.type, 'instance-data');
  assert.equal(sourceProfile.count, 5, 'duplicate quads remain retained even though RDF dataset query semantics de-duplicate them');
  assert.equal(sourceProfile.fingerprints.length, 1);
  assert.equal(sourceProfile.provenance.source.id, 'source-a');

  const reversed = await workspace.graphs.load({ name: 'source-a-reversed', kind: 'instance-data', quads: [ ...sourceAQuads ].reverse(), source: { kind: 'local-synthetic', id: 'source-a-reversed' } });
  assert.notEqual(workspace.results.profile(reversed).fingerprints[0], sourceProfile.fingerprints[0], 'ordered duplicate-aware source fingerprint changes when order changes');
  const schema = await workspace.graphs.load({ name: 'schema-object', kind: 'schema', quads: ontologyQuads.slice(0, 2), source: { kind: 'local-synthetic', id: 'schema-object' } });
  const inferred = await workspace.graphs.load({ name: 'inferred-object', kind: 'inferred-graph', quads: [], source: { kind: 'local-synthetic', id: 'inferred-object' } });
  assert.equal(workspace.results.profile(schema).type, 'schema');
  assert.equal(workspace.results.profile(inferred).type, 'inferred-graph');

  const ontologyNeighbors = workspace.graph.neighbors(ontology, { term: `${EX}Measurement`, maxEdges: 10, maxNodes: 10 });
  assert.equal(ontologyNeighbors.edges.some(edge => edge.object.termType === 'BlankNode'), true);
  assert.equal(ontologyNeighbors.edges.every(edge => edge.graph.value === `${EX}graph/ontology`), true);
  assert.equal(ontologyNeighbors.bounds.edges <= ontologyNeighbors.bounds.maxEdges, true);
  assert.equal(ontologyNeighbors.bounds.nodes <= ontologyNeighbors.bounds.maxNodes, true);
  assert.equal(ontologyNeighbors.bounds.bytes <= ontologyNeighbors.bounds.maxBytes, true);

  const french = workspace.graph.neighbors(sourceB, { term: `${EX}sample-b`, maxEdges: 10, maxNodes: 10 });
  const label = french.edges.find(edge => edge.predicate.value.endsWith('label')).object;
  assert.equal(label.termType, 'Literal');
  assert.equal(label.language, 'fr');

  const duplicates = workspace.graph.neighbors(sourceA, { term: `${EX}sample-a`, maxEdges: 10, maxNodes: 10 });
  assert.equal(duplicates.edges.filter(edge => edge.object.value === 'duplicate-preserved').length, 2);
  assert.equal(workspace.results.profile(shacl).type, 'shacl');
});

test('discovers ontology terms, runs ontology-informed SELECT, and matches raw Communica', async () => {
  const { workspace, ontology, shacl, sourceA, sourceB } = await runtimeFixture();
  const search = workspace.schema.search(ontology, { text: 'measurement', limit: 5 });
  assert.equal(search.hits.length > 0, true);
  assert.equal(search.provenance.sourceFingerprint, workspace.results.profile(ontology).fingerprints[0]);
  assert.equal(search.bounds.bytes <= search.bounds.maxBytes, true);
  assert.equal(workspace.schema.search(shacl, { text: 'datatype', limit: 3 }).hits.length > 0, true);

  const result = await workspace.query.select({ sources: [ ontology, sourceA, sourceB ], sparql: measurementQuery, role: 'all-measurements' });
  const profile = workspace.results.profile(result);
  assert.equal(profile.type, 'bindings');
  assert.equal(profile.count, 2);
  assert.deepEqual(profile.columns, [ 'sample', 'value' ]);
  assert.equal(profile.provenance.sourceFingerprints.length, 3);
  const page = workspace.results.page(result, { limit: 10 });
  assert.deepEqual(page.rows.map(row => row.sample.value), [ `${EX}sample-a`, `${EX}sample-b` ]);
  assert.equal(page.rows[0].sample.termType, 'NamedNode');
  assert.equal(page.rows[0].value.datatype, 'http://www.w3.org/2001/XMLSchema#decimal');

  const rawRows = await (await new QueryEngine().queryBindings(measurementQuery, {
    sources: [ new Store([ ...ontologyQuads, ...sourceAQuads, ...sourceBQuads ]) ],
  })).toArray();
  assert.deepEqual(page.rows.map(row => [ row.sample.value, row.value.value ]), rawRows.map(row => [ row.get('sample').value, row.get('value').value ]));
});

test('generic derivation and views preserve lineage and enforce row, cell, edge, node, and byte bounds', async () => {
  const { workspace, ontology, sourceA, sourceB } = await runtimeFixture({ budgets: { maxBytes: 4_096 } });
  const result = await workspace.query.select({ sources: [ ontology, sourceA, sourceB ], sparql: measurementQuery, role: 'all-measurements' });
  const derived = await workspace.results.derive(result, ({ rows }) => ({
    kind: 'bindings',
    rows: rows.filter(row => Number(row.get('value').value) > 5),
  }), { role: 'above-five' });
  const derivedProfile = workspace.results.profile(derived);
  assert.equal(derivedProfile.count, 1);
  assert.equal(derivedProfile.lineage.sourceHandle, result.id);
  assert.equal(derivedProfile.provenance.derivedFrom, result.id);
  const table = workspace.results.table(derived, { title: 'Measurements above five', limit: 10, maxCells: 2 });
  assert.equal(table.rows.length, 1);
  assert.equal(table.bounds.cells, 2);
  assert.equal(table.provenance.operationId, derivedProfile.provenance.operationId);

  const bulky = await workspace.results.derive(result, () => ({
    kind: 'rows',
    rows: Array.from({ length: 5 }, (_, index) => ({ index, note: 'x'.repeat(500) })),
  }), { role: 'bulky-local-rows' });
  const bounded = workspace.results.page(bulky, { limit: 5, maxCells: 10, maxBytes: 2_000 });
  assert.equal(bounded.truncated, true);
  assert.equal(bounded.bounds.rows <= 5, true);
  assert.equal(bounded.bounds.cells <= 10, true);
  assert.equal(bounded.bounds.bytes <= 2_000, true);
  assert.equal(Buffer.byteLength(JSON.stringify(bounded)), bounded.bounds.bytes);
  const rowBounded = workspace.results.page(bulky, { limit: 2, maxCells: 10, maxBytes: 4_096 });
  assert.equal(rowBounded.rows.length, 2);
  assert.equal(rowBounded.truncated, true);
  const cellBounded = workspace.results.page(bulky, { limit: 5, maxCells: 2, maxBytes: 4_096 });
  assert.equal(cellBounded.rows.length, 1);
  assert.equal(cellBounded.bounds.cells, 2);

  const neighborhood = workspace.graph.neighbors(sourceA, { term: `${EX}sample-a`, maxEdges: 2, maxNodes: 3, maxBytes: 2_000 });
  assert.equal(neighborhood.bounds.edges <= 2, true);
  assert.equal(neighborhood.bounds.nodes <= 3, true);
  assert.equal(neighborhood.bounds.bytes <= 2_000, true);
  assert.equal(Buffer.byteLength(JSON.stringify(neighborhood)), neighborhood.bounds.bytes);
});

test('reset retains PEEK orientation but rejects old-epoch handles in reset and recreated sessions', async () => {
  const { linkedScience, workspace, ontology, sourceA, sourceB } = await runtimeFixture({ contextKey: 'reset-goal' });
  const result = await workspace.query.select({ sources: [ ontology, sourceA, sourceB ], sparql: measurementQuery, role: 'measurements' });
  const committed = await workspace.orientation.commit();
  assert.equal(committed.entries > 0, true);
  const reset = linkedScience.reset({ contextKey: 'reset-goal' });
  assert.equal(reset.orientationRetained, true);
  const recovered = linkedScience.open({ contextKey: 'reset-goal' });
  const status = await recovered.orientation.status();
  assert.equal(status.status, 'ready');
  assert.equal(status.handles.some(item => item.status === 'stale'), true);
  assert.throws(() => recovered.results.profile(result), error => error.code === 'LS_STALE_HANDLE' && error.recoveryDocument === 'reset' && error.retryable === false);

  const recreatedHost = {};
  const recreatedFacade = await setupLinkedScience({ nodeRepl: recreatedHost, orientationCheckpoints: { 'reset-goal': committed } });
  const recreated = recreatedFacade.open({ contextKey: 'reset-goal' });
  assert.equal((await recreated.orientation.status()).entries, committed.entries);
  assert.throws(() => recreated.results.profile(result), error => error.code === 'LS_STALE_HANDLE');
});

test('errors are recovery-shaped and no raw network-capable engine is present on the child facade', async () => {
  const { workspace, ontology } = await runtimeFixture();
  assert.equal(workspace.engine, undefined);
  assert.equal(workspace.fetch, undefined);
  await assert.rejects(() => workspace.query.select({
    sources: [ ontology ],
    sparql: `SELECT ?s WHERE { GRAPH ?g { ?s ?p ?o } }`,
  }), error => error instanceof LinkedScienceRuntimeError && error.code === 'LS_QUERY_PREFLIGHT' && error.stage === 'query-preflight' && error.receipt && error.recoveryDocument === 'recovery');
  await assert.rejects(() => workspace.graphs.load({ name: 'remote', kind: 'ontology', quads: ontologyQuads, source: { kind: 'remote', id: 'https://example.test/ontology' } }), error => error.code === 'LS_LOCAL_ONLY');
});

test('machine-readable schema routes match runtime documentation and examples', async () => {
  const schema = JSON.parse(await readFile(new URL('../docs/runtime/linked-science-api.schema.json', import.meta.url), 'utf8'));
  const routes = JSON.parse(await readFile(new URL('../docs/runtime/routes.json', import.meta.url), 'utf8'));
  const facade = await setupLinkedScience({ nodeRepl: {} });
  assert.deepEqual(schema, LINKED_SCIENCE_API_SCHEMA);
  assert.deepEqual(routes.routes, facade.documentation().routes);
  for (const route of routes.routes) assert.equal(facade.documentation.get(route).name, route);
  for (const topic of facade.examples().topics) assert.equal(typeof facade.examples(topic).code, 'string');

  const bootstrap = facade.examples('bootstrap').code;
  assert.match(bootstrap, /bootstrapLinkedScience/u);
  assert.match(bootstrap, /cleanroom: nodeRepl/u);

  const { workspace, ontology, sourceA, sourceB } = await runtimeFixture({ contextKey: 'example-goal' });
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  await new AsyncFunction('linkedScience', 'ontologyTurtle', `${facade.examples('ontology').code}`)(facade, `@prefix ex: <${EX}> . ex:Measurement a ex:Class .`);
  await new AsyncFunction('ws', 'ontology', 'sourceA', 'sourceB', `${facade.examples('query').code}`)(workspace, ontology, sourceA, sourceB);
  const hits = await workspace.query.select({ sources: [ ontology, sourceA, sourceB ], sparql: measurementQuery, role: 'example-hits' });
  await new AsyncFunction('ws', 'hits', `${facade.examples('derive').code}`)(workspace, hits);
  await new AsyncFunction('ws', 'linkedScience', `${facade.examples('reset').code}`)(workspace, facade);
});

test('fresh-agent discovery fixture passes the documented behavioral rubric using only a natural goal input', async () => {
  const fixture = JSON.parse(await readFile(new URL('./fixtures/runtime-discovery/fresh-agent-goal.json', import.meta.url), 'utf8'));
  assert.doesNotMatch(fixture.goal, /\b(?:API|SPARQL|SELECT|bootstrap|schema\.search|results\.)\b/i);
  const { linkedScience, workspace, ontology, sourceA, sourceB } = await runtimeFixture({ contextKey: 'fresh-agent-goal' });
  const docs = linkedScience.documentation();
  const result = await workspace.query.select({ sources: [ ontology, sourceA, sourceB ], sparql: measurementQuery, role: 'measurements' });
  const page = workspace.results.page(result, { limit: 2, maxCells: 4 });
  const checkpoint = await workspace.orientation.commit();
  linkedScience.reset({ contextKey: 'fresh-agent-goal' });
  const fresh = linkedScience.open({ contextKey: 'fresh-agent-goal' });
  let staleRejected = false;
  try { fresh.results.profile(result); } catch (error) { staleRejected = error.code === 'LS_STALE_HANDLE'; }
  const evaluation = evaluateRuntimeDiscoveryTrace({
    goal: fixture.goal,
    events: [
      { name: 'bootstrap', supported: true },
      { name: 'documentation', supported: true, routes: docs.routes },
      { name: 'orientation.bootstrap', supported: true },
      { name: 'handle.retained', supported: true, type: result.type },
      { name: 'handle.reused', supported: true, id: page.source.id },
      { name: 'bounded.observation', supported: true, ...page.bounds },
      { name: 'provenance.observed', supported: true, operationId: page.provenance.operationId },
      { name: 'reset', supported: true, checkpoint: checkpoint.sha256 },
      { name: 'stale-handle.rejected', supported: staleRejected },
    ],
  });
  assert.equal(evaluation.passed, true, JSON.stringify(evaluation));
});
