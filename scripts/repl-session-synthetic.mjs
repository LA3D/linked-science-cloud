import { QueryEngine } from '@comunica/query-sparql';
import { DataFactory, Store } from 'n3';
import { initializeLinkedDataSession } from '../lib/repl-linked-data-session.mjs';

// Deterministic CLI fixture only; it is never evidence of persistent REPL state.

const { namedNode, literal, quad } = DataFactory;
const group = namedNode('https://example.test/group');
const quads = Array.from({ length: 120 }, (_, index) => quad(
  namedNode(`https://example.test/item-${String(index + 1).padStart(3, '0')}`), group, literal(index % 2 === 0 ? 'even' : 'odd'),
));
const session = initializeLinkedDataSession({ engine: new QueryEngine(), sources: [new Store(quads)] });
await session.materialize({ handle: 'items', query: 'SELECT ?item ?group WHERE { ?item <https://example.test/group> ?group }' });
session.deriveCountBy({ handle: 'by-group', sourceHandle: 'items', column: 'group' });
console.log(JSON.stringify({ profile: session.profile('items'), page: session.page('items', { offset: 40, limit: 3 }), derived: session.profile('by-group'), checkpoint: session.checkpoint() }, null, 2));
