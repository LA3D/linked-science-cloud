import { getEndpointProfile } from './guarded-sparql-transport.mjs';

export const AFFORDANCE_PACK_FORMAT = 'linked-data-affordance-pack/v1';

const OFFICIAL_EXAMPLES = 'https://sparql.uniprot.org/.well-known/sparql-examples/';
const UNIPROT_CORE = 'http://purl.uniprot.org/core/';

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freezeDeep(child);
  }
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function validatePack(pack) {
  if (pack?.format !== AFFORDANCE_PACK_FORMAT) throw new Error(`Affordance pack format must be ${AFFORDANCE_PACK_FORMAT}`);
  requireString(pack.id, 'pack.id');
  requireString(pack.version, 'pack.version');
  requireString(pack.defaultProfile, 'pack.defaultProfile');
  if (!Array.isArray(pack.sources) || !Array.isArray(pack.prefixes) || !Array.isArray(pack.motifs)) throw new Error('Affordance pack needs sources, prefixes, and motifs arrays');
  const prefixNames = new Set();
  for (const prefix of pack.prefixes) {
    requireString(prefix.prefix, 'prefix.prefix');
    requireString(prefix.namespace, 'prefix.namespace');
    requireString(prefix.role, 'prefix.role');
    if (prefixNames.has(prefix.prefix)) throw new Error(`Duplicate prefix: ${prefix.prefix}`);
    prefixNames.add(prefix.prefix);
  }
  const motifIds = new Set();
  for (const motif of pack.motifs) {
    requireString(motif.id, 'motif.id');
    if (motifIds.has(motif.id)) throw new Error(`Duplicate motif: ${motif.id}`);
    motifIds.add(motif.id);
    if (!Array.isArray(motif.tags) || !Array.isArray(motif.prefixes) || !Array.isArray(motif.serviceTargets) || !Array.isArray(motif.outline)) {
      throw new Error(`Motif ${motif.id} has an invalid shape`);
    }
    for (const prefix of motif.prefixes) if (!prefixNames.has(prefix)) throw new Error(`Motif ${motif.id} references unknown prefix: ${prefix}`);
  }
  return freezeDeep(clone(pack));
}

function boundedLimit(value, maximum) {
  if (!Number.isInteger(value) || value < 1 || value > maximum) throw new Error(`Plan limit must be an integer from 1 to ${maximum}`);
  return value;
}

function sourceForMotif(pack, motif) {
  const source = pack.sources.find(candidate => candidate.id === motif.sourceId);
  if (!source) throw new Error(`Motif ${motif.id} references unknown source: ${motif.sourceId}`);
  return source;
}

/**
 * Create a resource-neutral documentation affordance surface from a pack.
 * A pack carries source-specific ontology terms and example motifs; this module
 * only provides lookup, bounded planning, and profile-compatible validation.
 */
export function createAffordanceCatalog({ pack, resolveProfile = getEndpointProfile } = {}) {
  const frozenPack = validatePack(pack);
  if (typeof resolveProfile !== 'function') throw new Error('resolveProfile must be a function');

  function motifById(motifId) {
    const motif = frozenPack.motifs.find(candidate => candidate.id === motifId);
    if (!motif) throw new Error(`Unknown affordance motif: ${motifId}`);
    return motif;
  }

  function lookupAffordances({ tags = [] } = {}) {
    if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string' || tag.length === 0)) throw new Error('tags must be an array of non-empty strings');
    const requested = new Set(tags.map(tag => tag.toLowerCase()));
    const motifs = frozenPack.motifs.filter(motif => [ ...requested ].every(tag => motif.tags.includes(tag)));
    const prefixNames = new Set(motifs.flatMap(motif => motif.prefixes));
    return Object.freeze({
      pack: { id: frozenPack.id, version: frozenPack.version, format: frozenPack.format },
      requestedTags: [ ...requested ].sort(),
      sources: clone(frozenPack.sources),
      prefixes: clone(frozenPack.prefixes.filter(prefix => prefixNames.has(prefix.prefix))),
      motifs: clone(motifs.map(motif => ({ ...motif, source: sourceForMotif(frozenPack, motif) }))),
    });
  }

  function createAffordancePlan({ motifId, profileName = frozenPack.defaultProfile, limit = 5 } = {}) {
    const motif = motifById(motifId);
    const profile = resolveProfile(profileName);
    const allowedEndpoints = profile.allowedEndpoints ?? [ profile.endpoint ];
    if (profile.allowService !== true && motif.serviceTargets.length > 0) throw new Error('Profile does not allow SERVICE motifs');
    if (!motif.serviceTargets.every(target => allowedEndpoints.includes(target))) throw new Error('Motif requires a service target outside the endpoint profile');
    const prefixes = motif.prefixes.map(prefixName => frozenPack.prefixes.find(candidate => candidate.prefix === prefixName));
    const source = sourceForMotif(frozenPack, motif);
    return Object.freeze({
      kind: 'linked-data-affordance-plan',
      pack: { id: frozenPack.id, version: frozenPack.version, format: frozenPack.format },
      profile: profile.name,
      primaryEndpoint: profile.endpoint,
      motif: motif.id,
      source: clone(source),
      prefixes: clone(prefixes),
      serviceTargets: [ ...motif.serviceTargets ],
      limit: boundedLimit(limit, profile.maxResults),
      outline: [ ...motif.outline ],
      execution: 'not-executed',
    });
  }

  function validateAffordancePlan(plan, { profileName = frozenPack.defaultProfile } = {}) {
    if (plan?.kind !== 'linked-data-affordance-plan' || plan.pack?.id !== frozenPack.id || plan.pack?.version !== frozenPack.version || plan.pack?.format !== frozenPack.format) {
      throw new Error('Plan is not from this affordance pack version');
    }
    const expected = createAffordancePlan({ motifId: plan.motif, profileName, limit: plan.limit });
    if (plan.profile !== expected.profile || plan.primaryEndpoint !== expected.primaryEndpoint) throw new Error('Plan profile does not match the selected endpoint profile');
    if (JSON.stringify(plan.source) !== JSON.stringify(expected.source) || JSON.stringify(plan.serviceTargets) !== JSON.stringify(expected.serviceTargets) || JSON.stringify(plan.prefixes) !== JSON.stringify(expected.prefixes)) {
      throw new Error('Plan does not match its approved pack motif');
    }
    return expected;
  }

  function catalogCheckpoint() {
    return Object.freeze({
      pack: { id: frozenPack.id, version: frozenPack.version, format: frozenPack.format },
      sources: clone(frozenPack.sources),
      safeOperations: [ 'lookupAffordances', 'createAffordancePlan', 'validateAffordancePlan' ],
      note: 'This checkpoint describes documentation affordances only; it is not a query result or endpoint observation.',
    });
  }

  return Object.freeze({ lookupAffordances, createAffordancePlan, validateAffordancePlan, catalogCheckpoint });
}

// This is an exemplar pack, not a special case in the planning surface.
export const UNIPROT_RHEA_WIKIDATA_AFFORDANCE_PACK = freezeDeep({
  format: AFFORDANCE_PACK_FORMAT,
  id: 'uniprot-rhea-wikidata-exemplar',
  version: '2026-08-15.1',
  defaultProfile: 'uniprotRheaWikidataFederation',
  sources: [
    { id: 'uniprot-core', kind: 'ontology', url: UNIPROT_CORE },
    { id: 'uniprot-example-44', kind: 'example', url: `${OFFICIAL_EXAMPLES}?offset=43` },
    { id: 'uniprot-example-45', kind: 'example', url: `${OFFICIAL_EXAMPLES}?offset=44` },
    { id: 'uniprot-example-58', kind: 'example', url: `${OFFICIAL_EXAMPLES}?offset=57` },
  ],
  prefixes: [
    { prefix: 'up', namespace: UNIPROT_CORE, role: 'source-core', endpoint: 'https://sparql.uniprot.org/sparql', terms: [ 'Protein', 'organism', 'annotation', 'catalyticActivity', 'catalyzedReaction', 'reviewed', 'database' ] },
    { prefix: 'taxon', namespace: 'http://purl.uniprot.org/taxonomy/', role: 'source-identifier-space', endpoint: 'https://sparql.uniprot.org/sparql', terms: [ '9606' ] },
    { prefix: 'uniprotkb', namespace: 'http://purl.uniprot.org/uniprot/', role: 'source-identifier-space', endpoint: 'https://sparql.uniprot.org/sparql', terms: [ 'accession' ] },
    { prefix: 'rh', namespace: 'http://rdf.rhea-db.org/', role: 'service-vocabulary', endpoint: 'https://sparql.rhea-db.org/sparql', terms: [ 'Reaction', 'side', 'contains', 'compound' ] },
    { prefix: 'wdt', namespace: 'http://www.wikidata.org/prop/direct/', role: 'service-vocabulary', endpoint: 'https://query.wikidata.org/sparql', terms: [ 'P352', 'P129', 'P2175' ] },
    { prefix: 'rdfs', namespace: 'http://www.w3.org/2000/01/rdf-schema#', role: 'structural', terms: [ 'label', 'seeAlso', 'subClassOf' ] },
    { prefix: 'rdf', namespace: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', role: 'structural', terms: [ 'type' ] },
    { prefix: 'skos', namespace: 'http://www.w3.org/2004/02/skos/core#', role: 'structural', terms: [ 'prefLabel' ] },
  ],
  motifs: [
    {
      id: 'uniprot-rhea-interpro', tags: [ 'protein', 'catalytic-activity', 'rhea', 'interpro' ], sourceId: 'uniprot-example-44', prefixes: [ 'up', 'rdfs' ], serviceTargets: [],
      outline: [ '?protein up:reviewed true', '?protein up:annotation ?annotation', '?annotation up:catalyticActivity ?rhea', '?protein rdfs:seeAlso ?interpro', '?interpro up:database <http://purl.uniprot.org/database/InterPro>' ],
    },
    {
      id: 'rhea-uniprot-wikidata-drug', tags: [ 'protein', 'human', 'rhea', 'wikidata', 'drug', 'federated' ], sourceId: 'uniprot-example-45', prefixes: [ 'up', 'taxon', 'rh', 'wdt', 'rdfs' ], serviceTargets: [ 'https://sparql.rhea-db.org/sparql', 'https://query.wikidata.org/sparql' ],
      outline: [ 'SERVICE Rhea: constrain approved reactions', 'Source endpoint: join human proteins to catalytic activities and reactions', 'SERVICE Wikidata: join UniProt accession with wdt:P352 and drug relations' ],
    },
    {
      id: 'uniprot-accession-hgnc', tags: [ 'protein', 'accession', 'hgnc', 'mapping' ], sourceId: 'uniprot-example-58', prefixes: [ 'uniprotkb', 'up', 'rdfs' ], serviceTargets: [],
      outline: [ 'Bind supplied accession to a source IRI', 'Follow rdfs:seeAlso to an HGNC record', 'Constrain the cross-reference with up:database HGNC and read its symbol' ],
    },
  ],
});

export const uniprotRheaWikidataAffordances = createAffordanceCatalog({ pack: UNIPROT_RHEA_WIKIDATA_AFFORDANCE_PACK });
