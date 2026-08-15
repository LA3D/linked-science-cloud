const FORBIDDEN = new Set(['prefixes', 'terms', 'motifs', 'tags', 'outline', 'serviceTargets', 'query', 'plan', 'frontier', 'handles']);

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} must be a non-empty string`);
}

export function validateEvidencePack(pack) {
  if (pack?.apiVersion !== 'linked-data-repl/v1' || pack.kind !== 'EvidencePack') throw new Error('Expected linked-data-repl/v1 EvidencePack');
  for (const key of Object.keys(pack)) if (FORBIDDEN.has(key)) throw new Error(`Evidence packs may not contain ${key}`);
  nonEmpty(pack.metadata?.id, 'metadata.id'); nonEmpty(pack.metadata?.version, 'metadata.version');
  if (!Array.isArray(pack.resources) || pack.resources.length === 0) throw new Error('Evidence pack needs resources');
  const ids = new Set();
  for (const resource of pack.resources) {
    nonEmpty(resource?.id, 'resource.id'); nonEmpty(resource?.role, 'resource.role'); nonEmpty(resource?.uri, 'resource.uri');
    nonEmpty(resource?.authority, 'resource.authority'); nonEmpty(resource?.retrievalPolicy, 'resource.retrievalPolicy');
    if (!Array.isArray(resource.mediaTypes) || ids.has(resource.id)) throw new Error('Resources need media types and unique ids');
    ids.add(resource.id);
  }
  nonEmpty(pack.access?.queryPolicy, 'access.queryPolicy'); nonEmpty(pack.access?.endpointRole, 'access.endpointRole');
  for (const graph of pack.declarations?.namedGraphs ?? []) {
    nonEmpty(graph?.iri, 'named graph iri');
    if (!ids.has(graph?.evidence?.resource)) throw new Error('Named graph needs a known evidence resource');
    nonEmpty(graph.evidence?.locator, 'named graph evidence locator');
  }
  return Object.freeze(JSON.parse(JSON.stringify(pack)));
}

export function createEvidenceManifest(pack) {
  const value = validateEvidencePack(pack);
  return Object.freeze({
    identity: value.metadata,
    resources: value.resources.map(({ id, role, uri, authority, retrievalPolicy, mediaTypes }) => ({ id, role, uri, authority, retrievalPolicy, mediaTypes })),
    access: value.access,
    declarations: value.declarations ?? {},
    note: 'Locations and declared evidence only; this is not schema evidence, a query plan, or a runtime availability claim.',
  });
}
