# Guarded evidence acquisition

Use only sources and profiles explicitly approved for the current task. The project guards enforce the request boundary; repository descriptions and resource indexes do not grant permission.

## Finding evidence

Use `resources/index.md` only when the goal crosses sources or the starting source is unclear. It is a compact terrain map of scientific roles, candidate entry points, and identifier anchors—not an allowlist, health check, query plan, or availability claim. Read only the relevant section, then use source-owned documentation, ontology evidence, bounded probes, and task receipts to establish what works now. A source-specific skill may supply procedural knowledge, but neither the skill nor the index is evidence for a scientific claim.

For UniProt work, `resources/uniprot.evidence-pack.json` is a minimal evidence manifest. It identifies authoritative ontology documentation, official query examples, the dataset description, named graph declaration, and query-policy reference. It does not supply query plans, term inventories, motifs, or fallback answers.

Choose resources according to the goal. Useful routes may include an ontology, service description, official documentation, examples, endpoint introspection, a bounded instance probe, or locally authorized source code. Record failed routes and weaker evidence explicitly, then replan without upgrading prior knowledge into fact. If authoritative evidence cannot be acquired, keep the claim unresolved rather than falling back to the legacy affordance planner.

## Exact document or ontology acquisition

Use `lib/guarded-evidence-acquisition.mjs` to acquire an exact approved source into a retained handle. The caller supplies a narrow profile with exact HTTPS sources, permitted detected formats, timeout, byte ceiling, and Accept header. The operation content-sniffs the response because extensions and HTTP metadata can be wrong.

```js
var acquisitionModule = await import('./lib/guarded-evidence-acquisition.mjs');
var evidenceProfile = {
  name: 'approved-ontology',
  sources: ['https://example.org/ontology.owl'],
  accept: 'application/rdf+xml, text/turtle',
  allowedFormats: ['rdfxml', 'turtle'],
  timeoutMs: 8000,
  maxBytes: 2_000_000,
};
var acquired = await acquisitionModule.acquireEvidenceToHandleGuarded({
  session,
  handle: 'ontology-source',
  source: evidenceProfile.sources[0],
  profile: evidenceProfile,
});
```

A successful receipt distinguishes declared content type from detected format and flags disagreement. An acquisition failure retains a typed attempt handle and throws an error carrying the receipt. A preflight rejection performs no network request and creates no handle. Inspect evidence only through bounded `inspectEvidence` views; pass RDF content to Communica or N3 rather than building a parallel parser/query engine.

For the pinned UniProt documentation profile, use the ergonomic guarded client:

```js
var documentationModule = await import('./lib/guarded-documentation-fetch.mjs');
var documentationClient = documentationModule.createDocumentationClient();
var { response, receipt } = await documentationClient.fetch('uniprotRdfSchema');
```

Keep `response` or its text resident in the REPL. Use `receipt` directly for source, status, content type, byte length, SHA-256, redirect policy, and timeout. The `uniprotRdfSchema` profile authorizes only the pinned UniProt ontology documentation GET; it does not authorize a SPARQL request.

## Guarded SPARQL

Use `lib/guarded-sparql-transport.mjs` for approved live queries. It is the enforcement point for syntax, read operation, endpoint, bounds, redirects, timeouts, retries, federation targets, provenance, and response-byte ceiling. Pass its Communica options at the top level, not nested under `context`.

For a live read result that should remain available, use the typed atomic worker-facing operation:

```js
var sessionModule = await import('./lib/repl-linked-data-session.mjs');
var transportModule = await import('./lib/guarded-sparql-transport.mjs');
var engine = new (await import('@comunica/query-sparql')).QueryEngine();
var session = sessionModule.initializeLinkedDataSession({ engine, sources: [], maxRows: profile.maxResults });
var { handle, receipt } = await transportModule.queryToHandleGuarded({ session, handle: 'result-name', query, profile });
```

This validates the session, handle, query type, and result cap before network access; performs the guarded query once; retains the typed result; and returns one receipt containing all transport attempts and metadata-only result shape. It returns no automatic row or quad sample: page the handle explicitly when bounded values are needed, because literals can be large. A SPARQL `LIMIT` alone does not necessarily bound graph-response bytes.

`SELECT` yields a bindings handle, `ASK` a boolean handle, and `CONSTRUCT` or `DESCRIBE` a quad handle. The installed Communica engine handles `SELECT`, `ASK`, and `CONSTRUCT`; endpoint-native `DESCRIBE` uses the same guarded transport and parses its bounded RDF response with N3 because this engine build has no DESCRIBE operation actor. If an operation fails, inspect the thrown error's `receipt` instead of repeating the query blindly.

Available profiles include:

- `identifiersOrg`: bounded read operations against the pinned Identifiers.org SPARQL endpoint.
- `identifiersOrgLiveTable`: `SELECT` only, capped at 20 rows for a live-table demonstration.
- `uniprotRead`: bounded `ASK`, `SELECT`, `CONSTRUCT`, and carefully qualified `DESCRIBE` against UniProt only; no `SERVICE`.
- `wikiPathwaysRead`: bounded read operations against the exact WikiPathways SPARQL endpoint, including linked `wp:bdbChEBI` and `wp:bdbUniprot` identifiers; no `SERVICE`.
- `uniprotRheaWikidataFederation`: starts at the pinned UniProt endpoint, allows bounded `SELECT`, and permits only the pinned Rhea and Wikidata `SERVICE` targets.

Choose the operation for the information need; do not default to `SELECT` merely because it is familiar.

## ChEBI boundary

Distinguish a linked identifier from external enrichment. WikiPathways may return a ChEBI IRI through `http://vocabularies.wikipathways.org/wp#bdbChEBI`; returning that IRI does not contact EMBL-EBI.

When the goal needs ChEBI labels, definitions, or ontology metadata, create an exact profile with `createChebiCompoundEvidenceProfile('CHEBI:<id>')` from `lib/linked-data-source-profiles.mjs`, then pass it to `acquireEvidenceToHandleGuarded`. The helper permits only the official public compound JSON route for that validated accession. Do not treat ChEBI as a SPARQL service or fetch the hundreds-of-megabytes full ontology by default.
