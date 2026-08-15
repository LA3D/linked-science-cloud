import { QueryEngine } from '@comunica/query-sparql';
import { DataFactory, Store } from 'n3';

const { namedNode, literal, quad } = DataFactory;
const store = new Store([
  quad(namedNode('https://example.test/alex'), namedNode('https://example.test/name'), literal('Alex')),
]);
const engine = new QueryEngine();
const rows = await (await engine.queryBindings(
  'SELECT ?name WHERE { <https://example.test/alex> <https://example.test/name> ?name }',
  { sources: [store] },
)).toArray();

if (rows.length !== 1 || rows[0].get('name')?.value !== 'Alex') {
  throw new Error(`Unexpected query result: ${JSON.stringify(rows.map((row) => row.toString()))}`);
}
console.log('synthetic Communica SELECT passed: Alex');
