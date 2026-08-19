import { setupLinkedScience } from '../lib/linked-science-runtime.mjs';
import {
  measurementQuery,
  ontologyQuads,
  shaclQuads,
  sourceAQuads,
  sourceBQuads,
} from '../test/fixtures/linked-science-runtime/synthetic-science.mjs';

const host = {};
const linkedScience = await setupLinkedScience({ nodeRepl: host });
const workspace = linkedScience.open({ contextKey: 'synthetic-acceptance' });
workspace.orientation.bootstrap();

const ontology = workspace.graphs.load({ name: 'ontology', kind: 'ontology', quads: ontologyQuads, source: { kind: 'local-synthetic', id: 'ontology' } });
const shacl = workspace.graphs.load({ name: 'shacl', kind: 'shacl', quads: shaclQuads, source: { kind: 'local-synthetic', id: 'shacl' } });
const sourceA = workspace.graphs.load({ name: 'source-a', kind: 'instance-data', quads: sourceAQuads, source: { kind: 'local-synthetic', id: 'source-a' } });
const sourceB = workspace.graphs.load({ name: 'source-b', kind: 'instance-data', quads: sourceBQuads, source: { kind: 'local-synthetic', id: 'source-b' } });

const discovery = workspace.schema.search(ontology, { text: 'measurement', limit: 5 });
workspace.schema.search(shacl, { text: 'datatype', limit: 5 });
const measurements = await workspace.query.select({ sources: [ ontology, sourceA, sourceB ], sparql: measurementQuery, role: 'measurements' });
const aboveFive = await workspace.results.derive(measurements, ({ rows }) => ({
  kind: 'bindings',
  rows: rows.filter(row => Number(row.get('value').value) > 5),
}), { role: 'above-five' });
const resultProfile = workspace.results.profile(aboveFive);
const table = workspace.results.table(aboveFive, { title: 'Measurements above five', limit: 5 });
const neighborhood = workspace.graph.neighbors(sourceB, { term: 'https://example.test/science/sample-b', maxNodes: 5, maxEdges: 5 });
const checkpoint = workspace.orientation.commit();
linkedScience.reset({ contextKey: 'synthetic-acceptance' });
const resetStatus = linkedScience.open({ contextKey: 'synthetic-acceptance' }).orientation.status();

console.log(JSON.stringify({
  runtime: linkedScience.version,
  ontologyHits: discovery.hits.length,
  result: resultProfile,
  table,
  neighborhood: { nodes: neighborhood.bounds.nodes, edges: neighborhood.bounds.edges, provenance: neighborhood.provenance },
  checkpoint: { entries: checkpoint.entries, sha256: checkpoint.sha256 },
  resetStatus,
}, null, 2));
