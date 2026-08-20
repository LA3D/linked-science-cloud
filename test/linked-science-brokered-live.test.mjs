import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { setupLinkedScience } from '../lib/linked-science-runtime.mjs';

const RELEASE_QUERY = 'SELECT ?release WHERE { ?service ?predicate ?release } LIMIT 1';
const ENTITY_QUERY = 'SELECT ?entryName ?domainName ?componentName WHERE { ?entry ?predicate ?value } LIMIT 10';
const GO_QUERY = 'SELECT ?accession ?category ?term WHERE { ?accession ?predicate ?term } LIMIT 10';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [ key, stable(value[key]) ]));
  return value;
}

function digest(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(stable(value))).digest('hex');
}

const named = value => ({ termType: 'NamedNode', value });
const literal = (value, datatype = 'http://www.w3.org/2001/XMLSchema#string') => ({ termType: 'Literal', value, language: '', datatype });

function fakeBroker({ mutateQueryResponse } = {}) {
  const calls = [];
  const profiles = [
    { id: 'uniprot-void-description', operation: 'acquire', limits: { maxBytes: 100_000, maxItems: 100, maxTransports: 1 } },
    { id: 'uniprot-core-ontology', operation: 'acquire', limits: { maxBytes: 100_000, maxItems: 100, maxTransports: 1 } },
    { id: 'go-orientation', operation: 'acquire', limits: { maxBytes: 100_000, maxItems: 100, maxTransports: 1 } },
    { id: 'uniprot-read', operation: 'query', limits: { maxBytes: 1_000_000, maxItems: 10, maxTransports: 1, maxQueryChars: 4_096 } },
  ].map(profile => ({ ...profile, sha256: digest(profile) }));

  function receipt({ operation, profile, input, payload, source }) {
    const descriptor = profiles.find(item => item.id === profile && item.operation === operation);
    return {
      kind: 'linked-science-broker-operation',
      status: 'ready',
      operation,
      operationId: `broker-${String(calls.length).padStart(3, '0')}`,
      profile,
      profileSha256: descriptor.sha256,
      inputSha256: digest(input),
      payloadSha256: digest(payload),
      source,
      attempts: [{ status: 200, redirect: 'error', retries: 0 }],
    };
  }

  return {
    calls,
    capabilities() {
      return { kind: 'linked-science-network-broker', version: 'offline-test-v1', profiles };
    },
    async acquire({ profile, source }) {
      calls.push({ operation: 'acquire', profile, source });
      const contents = {
        'uniprot-void-description': '@prefix ex: <https://example.test/> . ex:service ex:release "2026_04" .',
        'uniprot-core-ontology': '@prefix ex: <https://example.test/> . ex:Entry a ex:Class . ex:domain a ex:Property . ex:component a ex:Property .',
        'go-orientation': '@prefix ex: <https://example.test/> . ex:process a ex:Category . ex:function a ex:Category . ex:component a ex:Category .',
      };
      const content = contents[profile];
      if (!content) throw new Error(`profile denied: ${profile}`);
      return { content, receipt: receipt({ operation: 'acquire', profile, input: { profile, source }, payload: content, source: `broker://${profile}` }) };
    },
    async query({ profile, sparql }) {
      calls.push({ operation: 'query', profile, sparql });
      if (profile !== 'uniprot-read') throw new Error(`profile denied: ${profile}`);
      let result;
      if (sparql === RELEASE_QUERY) {
        result = { kind: 'bindings', rows: [{ release: literal('2026_04') }] };
      } else if (sparql === ENTITY_QUERY) {
        result = { kind: 'bindings', rows: [{ entryName: literal('Synthetic entry'), domainName: literal('Synthetic domain'), componentName: literal('Synthetic component') }] };
      } else if (sparql === GO_QUERY) {
        result = { kind: 'bindings', rows: [
          { accession: named('https://example.test/accession/A1'), category: literal('process'), term: named('https://example.test/go/1') },
          { accession: named('https://example.test/accession/A1'), category: literal('function'), term: named('https://example.test/go/2') },
          { accession: named('https://example.test/accession/A1'), category: literal('component'), term: named('https://example.test/go/3') },
        ] };
      } else {
        throw new Error('query not in offline injected fixture');
      }
      const response = { result, receipt: receipt({ operation: 'query', profile, input: sparql, payload: result, source: 'broker://uniprot-read' }) };
      return mutateQueryResponse ? mutateQueryResponse(structuredClone(response)) : response;
    },
  };
}

test('broker-owned acquisition and query produce native handles for offline competency tiers 0-2', async () => {
  const broker = fakeBroker();
  const linkedScience = await setupLinkedScience({ nodeRepl: {}, broker });
  const capabilities = linkedScience.capabilities();
  assert.equal(capabilities.localOnly, false);
  assert.equal(capabilities.brokerOwnedLive, true);
  assert.deepEqual(capabilities.broker.profiles.map(item => item.id), [
    'uniprot-void-description', 'uniprot-core-ontology', 'go-orientation', 'uniprot-read',
  ]);
  assert.equal(typeof linkedScience.compatibility.queryToHandleGuarded, 'undefined');

  const workspace = linkedScience.open({ contextKey: 'offline-uniprot-tiers' });
  await workspace.orientation.bootstrap();

  const voidEvidence = await workspace.live.acquire({ profile: 'uniprot-void-description', role: 'void-description' });
  assert.equal(workspace.results.profile(voidEvidence).type, 'evidence');
  assert.equal(workspace.evidence.search(voidEvidence, { text: 'release', limit: 2 }).hits.length, 1);

  const coreEvidence = await workspace.live.acquire({ profile: 'uniprot-core-ontology', role: 'core-ontology-source' });
  const coreOntology = await workspace.graphs.fromEvidence(coreEvidence, { name: 'core-ontology', kind: 'ontology' });
  assert.equal(workspace.results.profile(coreOntology).lineage.sourceHandle, coreEvidence.id);
  assert.equal(workspace.schema.search(coreOntology, { text: 'domain', limit: 2 }).hits.length > 0, true);

  const goEvidence = await workspace.live.acquire({ profile: 'go-orientation', role: 'go-orientation-source' });
  const goOntology = await workspace.graphs.fromEvidence(goEvidence, { name: 'go-orientation', kind: 'ontology' });
  assert.equal(workspace.schema.search(goOntology, { text: 'component', limit: 2 }).hits.length > 0, true);

  const tier0 = await workspace.live.query({ profile: 'uniprot-read', sparql: RELEASE_QUERY, role: 'tier-zero-release' });
  const tier1 = await workspace.live.query({ profile: 'uniprot-read', sparql: ENTITY_QUERY, role: 'tier-one-entity-parts' });
  const tier2 = await workspace.live.query({ profile: 'uniprot-read', sparql: GO_QUERY, role: 'tier-two-go-groups' });
  assert.equal(workspace.results.page(tier0, { limit: 1 }).rows[0].release.value, '2026_04');
  assert.deepEqual(workspace.results.profile(tier1).columns, ['entryName', 'domainName', 'componentName']);
  assert.deepEqual(workspace.results.page(tier2, { limit: 10 }).rows.map(row => row.category.value), ['process', 'function', 'component']);
  assert.equal(workspace.results.profile(tier2).provenance.brokerOwnedTransport, true);
  assert.equal(workspace.results.profile(tier2).lineage.kind, 'broker-query');

  const reused = await workspace.results.derive(tier2, ({ rows }) => ({
    kind: 'rows', rows: rows.map(row => ({ category: row.get('category').value })),
  }), { role: 'tier-two-second-turn' });
  assert.equal(workspace.results.profile(reused).lineage.sourceHandle, tier2.id);
  assert.equal(broker.calls.filter(item => item.operation === 'query').length, 3, 'second-turn derivation does not re-query the broker');
});

test('child callers cannot inject profile objects, fetch, endpoints, or oversized broker results through the native surface', async () => {
  const broker = fakeBroker();
  const linkedScience = await setupLinkedScience({ nodeRepl: {}, broker });
  const workspace = linkedScience.open({ contextKey: 'broker-negative-cases' });
  await assert.rejects(
    () => workspace.live.query({ profile: { id: 'uniprot-read', endpoint: 'https://attacker.invalid' }, sparql: RELEASE_QUERY, fetch: async () => {} }),
    error => error.code === 'LS_BROKER_PROFILE',
  );
  assert.equal(broker.calls.length, 0);
  await assert.rejects(
    () => workspace.live.query({ profile: 'missing-profile', sparql: RELEASE_QUERY }),
    error => error.code === 'LS_BROKER_PROFILE',
  );
  assert.equal(broker.calls.length, 0);

  const oversizedBroker = fakeBroker({ mutateQueryResponse(response) {
    response.result.rows = Array.from({ length: 11 }, () => ({ release: literal('oversized') }));
    response.receipt.payloadSha256 = digest(response.result);
    return response;
  } });
  const oversizedWorkspace = (await setupLinkedScience({ nodeRepl: {}, broker: oversizedBroker })).open({ contextKey: 'oversized-result' });
  await assert.rejects(
    () => oversizedWorkspace.live.query({ profile: 'uniprot-read', sparql: RELEASE_QUERY }),
    error => error.code === 'LS_BROKER_RESULT_BOUND',
  );

  const tamperedBroker = fakeBroker({ mutateQueryResponse(response) {
    response.receipt.payloadSha256 = '0'.repeat(64);
    return response;
  } });
  const tamperedWorkspace = (await setupLinkedScience({ nodeRepl: {}, broker: tamperedBroker })).open({ contextKey: 'tampered-receipt' });
  await assert.rejects(
    () => tamperedWorkspace.live.query({ profile: 'uniprot-read', sparql: RELEASE_QUERY }),
    error => error.code === 'LS_BROKER_RECEIPT',
  );
});

test('live methods remain present but fail recovery-shape preflight when no broker is injected', async () => {
  const linkedScience = await setupLinkedScience({ nodeRepl: {} });
  const workspace = linkedScience.open({ contextKey: 'no-broker' });
  await assert.rejects(
    () => workspace.live.query({ profile: 'uniprot-read', sparql: RELEASE_QUERY }),
    error => error.code === 'LS_BROKER_UNAVAILABLE' && error.recoveryDocument === 'security' && error.retryable === true,
  );
});

test('broker capability descriptors cannot disclose endpoints or transport internals to the child', async () => {
  const broker = fakeBroker();
  const original = broker.capabilities;
  broker.capabilities = () => {
    const capabilities = original();
    capabilities.profiles[0].endpoint = 'https://should-not-be-child-visible.invalid';
    return capabilities;
  };
  await assert.rejects(
    () => setupLinkedScience({ nodeRepl: {}, broker }),
    error => error.code === 'LS_BROKER_CAPABILITIES',
  );
});
