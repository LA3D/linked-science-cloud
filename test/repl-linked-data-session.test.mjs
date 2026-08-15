import assert from 'node:assert/strict';
import test from 'node:test';
import { QueryEngine } from '@comunica/query-sparql';
import { DataFactory, Store } from 'n3';
import { createTableDisplay, initializeLinkedDataSession } from '../lib/repl-linked-data-session.mjs';

function fixture() {
  const { namedNode, literal, quad } = DataFactory;
  const group = namedNode('https://example.test/group');
  const quads = Array.from({ length: 120 }, (_, index) => quad(namedNode(`https://example.test/item-${index + 1}`), group, literal(index % 2 ? 'odd' : 'even')));
  return { engine: new QueryEngine(), store: new Store(quads), query: 'SELECT ?item ?group WHERE { ?item <https://example.test/group> ?group }' };
}

test('materializes a large local result behind a handle without checkpointing raw rows', async() => {
  const { engine, store, query } = fixture();
  const session = initializeLinkedDataSession({ engine, sources: [store] });
  const profile = await session.materialize({ handle: 'items', query });
  assert.equal(profile.count, 120);
  assert.equal(profile.sample.length, 2);
  const checkpoint = JSON.stringify(session.checkpoint());
  assert.doesNotMatch(checkpoint, /item-120/);
  assert.match(checkpoint, /querySha256/);
});

test('profiles, pages, and derives without rerunning the original query', async() => {
  const { engine, store, query } = fixture();
  const session = initializeLinkedDataSession({ engine, sources: [store] });
  await session.materialize({ handle: 'items', query });
  const page = session.page('items', { offset: 30, limit: 3 });
  const derived = session.deriveCountBy({ handle: 'by-group', sourceHandle: 'items', column: 'group' });
  assert.equal(page.rows.length, 3);
  assert.equal(derived.count, 2);
  assert.equal(derived.lineage.sourceHandle, 'items');
  assert.throws(() => session.page('items', { limit: 11 }));
});

test('recognizes invalidated handles after a reset-like event', async() => {
  const { engine, store, query } = fixture();
  const session = initializeLinkedDataSession({ engine, sources: [store] });
  await session.materialize({ handle: 'items', query });
  const checkpoint = session.checkpoint();
  assert.equal(session.invalidate('items').status, 'invalidated');
  assert.deepEqual(session.recover(checkpoint), [{ handle: 'items', status: 'invalidated', recoverable: false, invalidation: 'session-reset' }]);
});

test('retains externally guarded bindings under a hard materialization cap', async() => {
  const { engine } = fixture();
  const session = initializeLinkedDataSession({ engine, sources: [], maxRows: 20 });
  const binding = index => new Map([
    [DataFactory.variable('namespace'), DataFactory.namedNode(`http://identifiers.org/test-${index}`)],
    [DataFactory.variable('prefix'), DataFactory.literal(`test-${index}`)],
  ]);
  const profile = session.materializeBindings({
    handle: 'registry-namespaces',
    bindings: Array.from({ length: 20 }, (_, index) => binding(index)),
    query: 'SELECT ?namespace ?prefix WHERE { ?namespace ?p ?prefix } LIMIT 20',
    provenance: { endpoint: 'https://sparql.api.identifiers.org/sparql', method: 'POST' },
  });
  assert.equal(profile.count, 20);
  assert.throws(() => session.materializeBindings({
    handle: 'too-many',
    bindings: Array.from({ length: 21 }, (_, index) => binding(index)),
    query: 'SELECT ?namespace ?prefix WHERE { ?namespace ?p ?prefix } LIMIT 20',
  }));
  await assert.rejects(() => session.materialize({ handle: 'not-local', query: 'SELECT * WHERE { ?s ?p ?o }' }));
});

test('emits a bounded typed table display with compact provenance and safe scalar cells', async() => {
  const { engine, store, query } = fixture();
  const session = initializeLinkedDataSession({ engine, sources: [store] });
  await session.materialize({
    handle: 'items',
    query,
    provenance: { profile: 'local-synthetic', transport: [{ endpoint: 'https://example.test/sparql', method: 'GET', queryType: 'SELECT', queryLimit: 120, status: 200 }] },
  });
  const display = session.displayTable({ handle: 'items', title: 'Synthetic items', columns: ['item'], offset: 30, limit: 3 });
  assert.deepEqual(display.columns, [{ key: 'item', label: 'item' }]);
  assert.equal(display.kind, 'table');
  assert.equal(display.rows.length, 3);
  assert.deepEqual(display.page, { offset: 30, limit: 3, total: 120 });
  assert.deepEqual(display.source, { handle: 'items', provenance: { profile: 'local-synthetic', endpoint: 'https://example.test/sparql', method: 'GET', queryType: 'SELECT', queryLimit: 120, status: 200 } });
  assert.doesNotMatch(JSON.stringify(display), /SELECT \?item/);
  assert.deepEqual(createTableDisplay({ session, handle: 'items', title: 'Synthetic items', columns: ['item'], offset: 30, limit: 3 }), display);
  assert.throws(() => session.displayTable({ handle: 'items', title: 'Too many', limit: 11 }));

  session.records.get('items').rows[0].item = 'x'.repeat(2_049);
  assert.throws(() => session.displayTable({ handle: 'items', title: 'Unsafe scalar', limit: 1 }));
});
