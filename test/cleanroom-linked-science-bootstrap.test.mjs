import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  bootstrapLinkedScience,
  inspectLinkedScienceBootstrap,
  LINKED_SCIENCE_MODULE_ROOT,
  LINKED_SCIENCE_PROJECT_ROOT,
  LINKED_SCIENCE_RLM_CONTEXT,
} from '../lib/cleanroom-linked-science-bootstrap.mjs';
import { ontologyQuads } from './fixtures/linked-science-runtime/synthetic-science.mjs';

class MemoryBrokerPeek {
  constructor() { this.maps = new Map(); }
  async begin(contextId, { tokenBudget = 2_000 } = {}) {
    if (!this.maps.has(contextId)) this.maps.set(contextId, { version: 1, contextId, tokenBudget, estimatedTokens: 0, queryCount: 0, entries: [] });
    return structuredClone(this.maps.get(contextId));
  }
  async current(contextId) { return this.begin(contextId); }
  async edit(contextId, edits) {
    const map = await this.begin(contextId);
    for (const edit of edits) {
      assert.equal(edit.action, 'ADD');
      map.entries = map.entries.filter(entry => entry.id !== edit.entry.id);
      map.entries.push({ ...edit.entry });
    }
    map.estimatedTokens = Math.ceil(JSON.stringify(map.entries).length / 4);
    this.maps.set(contextId, map);
    return structuredClone(map);
  }
  async commit(contextId) {
    const map = await this.begin(contextId);
    map.queryCount += 1;
    this.maps.set(contextId, map);
    return structuredClone(map);
  }
}

function cleanroomFixture(peek = new MemoryBrokerPeek()) {
  const contexts = new Map();
  return {
    cwd: LINKED_SCIENCE_PROJECT_ROOT,
    peek,
    rlm: {
      mode: 'codeact',
      registerContext(contextId, value) { contexts.set(contextId, structuredClone(value)); return { contextId, registered: true }; },
      inspect(contextId, { start = 0, end = 4_096 } = {}) {
        const text = JSON.stringify(contexts.get(contextId));
        return { contextId, start, end: Math.min(end, text.length), totalLength: text.length, text: text.slice(start, end) };
      },
    },
    contexts,
  };
}

test('active project config registers only the saved clean-room MCP with an explicit Linked Science cwd', async () => {
  const config = await readFile(new URL('../.codex/config.toml', import.meta.url), 'utf8');
  const disabled = await readFile(new URL('../.codex/config.restricted-profile.toml.disabled', import.meta.url), 'utf8');
  assert.match(config, /^\[mcp_servers\.cleanroom_node_repl\]/u);
  assert.match(config, new RegExp(`cwd = "${LINKED_SCIENCE_PROJECT_ROOT}"`));
  assert.match(config, /node-repl-network-probe\/src\/cleanroom-mcp\.mjs/u);
  assert.doesNotMatch(config, /default_permissions|network_proxy|mcp_servers\.node_repl/u);
  assert.match(disabled, /default_permissions = "science-tools-linked-data"/u);
});

test('bootstrap validates roots and declared dependency resolution before installing the facade', async () => {
  const cleanroom = cleanroomFixture();
  const inspected = await inspectLinkedScienceBootstrap({ cleanroom, projectRoot: LINKED_SCIENCE_PROJECT_ROOT, moduleRoot: LINKED_SCIENCE_MODULE_ROOT });
  assert.equal(inspected.runtime, 'cleanroom_node_repl');
  assert.equal(inspected.mode, 'codeact');
  assert.deepEqual(Object.keys(inspected.dependencies), [ '@comunica/query-sparql', 'n3', 'sparqljs' ]);
  assert.equal(Object.values(inspected.dependencies).every(url => url.startsWith('file:') && url.includes('/node_modules/')), true);

  const host = {};
  const facade = await bootstrapLinkedScience({ host, cleanroom, projectRoot: LINKED_SCIENCE_PROJECT_ROOT, moduleRoot: LINKED_SCIENCE_MODULE_ROOT });
  assert.equal(host.linkedScience, facade);
  assert.equal(host.ls, facade);
  assert.equal(facade.capabilities().environment.runtime, 'cleanroom_node_repl');
  assert.equal(cleanroom.contexts.get(LINKED_SCIENCE_RLM_CONTEXT).api.bootstrapEnvironment.orientationOwner, 'cleanroom-broker');
});

test('broker PEEK state survives facade recreation while old Linked Science handles remain stale', async () => {
  const peek = new MemoryBrokerPeek();
  const firstCleanroom = cleanroomFixture(peek);
  const first = await bootstrapLinkedScience({ host: {}, cleanroom: firstCleanroom });
  const workspace = first.open({ contextKey: 'cleanroom-reset' });
  await workspace.orientation.bootstrap();
  const ontology = await workspace.graphs.load({ name: 'ontology', kind: 'ontology', quads: ontologyQuads, source: { kind: 'local-synthetic', id: 'ontology' } });
  assert.equal((await workspace.orientation.status()).handles.some(item => item.id === ontology.id && item.status === 'resident'), true);

  const recreated = await bootstrapLinkedScience({ host: {}, cleanroom: cleanroomFixture(peek) });
  const recovered = recreated.open({ contextKey: 'cleanroom-reset' });
  const status = await recovered.orientation.status();
  assert.equal(status.owner, 'cleanroom-broker');
  assert.equal(status.handles.some(item => item.id === ontology.id && item.status === 'stale'), true);
  assert.throws(() => recovered.results.profile(ontology), error => error.code === 'LS_STALE_HANDLE');
});
