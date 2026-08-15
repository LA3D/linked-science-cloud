import assert from 'node:assert/strict';
import test from 'node:test';
import { createAffordanceCatalog, UNIPROT_RHEA_WIKIDATA_AFFORDANCE_PACK, uniprotRheaWikidataAffordances } from '../lib/linked-data-affordances.mjs';

const { catalogCheckpoint, createAffordancePlan, lookupAffordances, validateAffordancePlan } = uniprotRheaWikidataAffordances;

test('looks up a source-backed UniProt/Rhea/InterPro motif', () => {
  const lookup = lookupAffordances({ tags: [ 'protein', 'catalytic-activity', 'rhea', 'interpro' ] });
  assert.equal(lookup.motifs.length, 1);
  assert.equal(lookup.motifs[0].id, 'uniprot-rhea-interpro');
  assert.deepEqual(lookup.prefixes.map(prefix => prefix.prefix), [ 'up', 'rdfs' ]);
  assert.match(lookup.motifs[0].source.url, /sparql-examples/);
});

test('builds a bounded federation plan only from approved service targets', () => {
  const plan = createAffordancePlan({ motifId: 'rhea-uniprot-wikidata-drug', limit: 3 });
  assert.equal(plan.primaryEndpoint, 'https://sparql.uniprot.org/sparql');
  assert.deepEqual(plan.serviceTargets, [ 'https://sparql.rhea-db.org/sparql', 'https://query.wikidata.org/sparql' ]);
  assert.equal(plan.limit, 3);
  assert.equal(plan.execution, 'not-executed');
  assert.deepEqual(validateAffordancePlan(plan), plan);
});

test('rejects an altered endpoint plan and an out-of-profile limit', () => {
  assert.throws(() => createAffordancePlan({ motifId: 'uniprot-rhea-interpro', limit: 11 }));
  const plan = createAffordancePlan({ motifId: 'rhea-uniprot-wikidata-drug', limit: 1 });
  assert.throws(() => validateAffordancePlan({ ...plan, serviceTargets: [ 'https://example.test/sparql' ] }));
});

test('keeps catalog metadata distinct from query results', () => {
  const checkpoint = catalogCheckpoint();
  assert.match(checkpoint.note, /not a query result/);
  assert.deepEqual(checkpoint.safeOperations, [ 'lookupAffordances', 'createAffordancePlan', 'validateAffordancePlan' ]);
});

test('accepts another resource as data, not a source-specific code path', () => {
  const catalog = createAffordanceCatalog({
    pack: {
      format: 'linked-data-affordance-pack/v1',
      id: 'synthetic-resource',
      version: '1.0.0',
      defaultProfile: 'synthetic-profile',
      sources: [ { id: 'schema', kind: 'ontology', url: 'https://example.test/schema' } ],
      prefixes: [ { prefix: 'ex', namespace: 'https://example.test/', role: 'source-core', terms: [ 'Thing' ] } ],
      motifs: [ { id: 'things', tags: [ 'thing' ], sourceId: 'schema', prefixes: [ 'ex' ], serviceTargets: [], outline: [ '?thing a ex:Thing' ] } ],
    },
    resolveProfile: () => ({ name: 'synthetic-profile', endpoint: 'https://example.test/sparql', maxResults: 2, allowService: false }),
  });
  assert.equal(catalog.lookupAffordances({ tags: [ 'thing' ] }).motifs[0].id, 'things');
  assert.equal(catalog.createAffordancePlan({ motifId: 'things', limit: 1 }).profile, 'synthetic-profile');
});

test('exemplar remains a data pack', () => {
  assert.equal(UNIPROT_RHEA_WIKIDATA_AFFORDANCE_PACK.format, 'linked-data-affordance-pack/v1');
  assert.equal(UNIPROT_RHEA_WIKIDATA_AFFORDANCE_PACK.id, 'uniprot-rhea-wikidata-exemplar');
});
