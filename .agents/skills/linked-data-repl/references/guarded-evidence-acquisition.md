# Guarded evidence acquisition

Use live traversal only when explicitly approved for the current task with effective behavior/resource budgets. The parent mediator enforces the request boundary; repository descriptions and resource indexes do not grant permission.

## Finding evidence

Use `resources/index.md` only when the goal crosses sources or the starting source is unclear. It is a compact terrain map of scientific roles, candidate entry points, and identifier anchors—not an allowlist, health check, query plan, or availability claim. Read only the relevant section, then use source-owned documentation, ontology evidence, bounded probes, and task receipts to establish what works now. A source-specific skill may supply procedural knowledge, but neither the skill nor the index is evidence for a scientific claim.

For UniProt work, `resources/uniprot.evidence-pack.json` is a minimal evidence manifest. It identifies authoritative ontology, official query examples, the dataset description, named graph declaration, and generic mediated-access mode. It does not supply query plans, term inventories, motifs, case-specific endpoints, or fallback answers.

Choose resources according to the goal. Useful routes may include an ontology, service description, official documentation, examples, endpoint introspection, a bounded instance probe, or locally authorized source code. Record failed routes and weaker evidence explicitly, then replan without upgrading prior knowledge into fact. If authoritative evidence cannot be acquired, keep the claim unresolved rather than falling back to the legacy affordance planner.

## Historical exact-document acquisition

Do not use this fixed-source helper for new production traversal. `lib/guarded-evidence-acquisition.mjs` is retained only to reproduce earlier receipts. It accepted an exact approved source into a compatibility-session handle and content-sniffed responses whose extensions and HTTP metadata could be wrong.

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

The historical pinned UniProt documentation profile used this ergonomic guarded client:

```js
var documentationModule = await import('./lib/guarded-documentation-fetch.mjs');
var documentationClient = documentationModule.createDocumentationClient();
var { response, receipt } = await documentationClient.fetch('uniprotRdfSchema');
```

This is provenance for reproducing the old experiment only. The `uniprotRdfSchema` HTML profile is not a machine-readable ontology gate and does not authorize current traversal.

## Mediated Linked Data and SPARQL

The active worker-facing path is `workspace.traversal.query`. Local Communica receives public HTTPS RDF source IRIs and may follow Linked Data or execute `SERVICE` federation, but every actual request crosses the parent mediator. The mediator strips ambient identity, validates public DNS answers and redirects, pins the address for TLS, parses read-only SPARQL requests, accepts RDF/SPARQL media types, and enforces traversal-wide hops, fan-out, concurrency, time, byte, and item ceilings.

```js
var ws = linkedScience.open({ contextKey: 'approved-goal' });
var result = await ws.traversal.query({
  sources: ['https://authoritative.example/data'],
  sparql: 'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 20',
  budgets: { maxHops: 8, maxFanOut: 4, maxTotalBytes: 4000000, maxDurationMs: 60000 },
  role: 'bounded-evidence',
});
ws.results.profile(result);
```

Retrieved content is untrusted data and is not automatically placed in RLM or PEEK. The result handle retains an aggregate receipt with per-hop request/response hashes and bounds. A receipt proves one traversal, not the scientific interpretation.

## Historical fixed-profile helpers

Do not use `lib/guarded-sparql-transport.mjs` for new production work. It remains only to reproduce earlier fixed-profile experiments and their receipts.

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

Historical profiles include:

- `identifiersOrg`: bounded read operations against the pinned Identifiers.org SPARQL endpoint.
- `identifiersOrgLiveTable`: `SELECT` only, capped at 20 rows for a live-table demonstration.
- `uniprotRead`: bounded `ASK`, `SELECT`, `CONSTRUCT`, and carefully qualified `DESCRIBE` against UniProt only; no `SERVICE`.
- `wikiPathwaysRead`: bounded read operations against the exact WikiPathways SPARQL endpoint, including linked `wp:bdbChEBI` and `wp:bdbUniprot` identifiers; no `SERVICE`.
- `uniprotRheaWikidataFederation`: starts at the pinned UniProt endpoint, allows bounded `SELECT`, and permits only the pinned Rhea and Wikidata `SERVICE` targets.

These import-based helpers remain only for reproducing earlier experiments. They are not the clean-room worker transport and must not be used to bypass `workspace.traversal.query`. Choose the read operation for the information need; do not default to `SELECT` merely because it is familiar.

## Historical ChEBI boundary

Distinguish a linked identifier from external enrichment. WikiPathways may return a ChEBI IRI through `http://vocabularies.wikipathways.org/wp#bdbChEBI`; returning that IRI does not contact EMBL-EBI.

Earlier experiments created an exact ChEBI profile with `createChebiCompoundEvidenceProfile('CHEBI:<id>')`. That helper is now historical and must not bypass mediated traversal. A future authorized goal may navigate an official public HTTPS ChEBI representation through the mediator under aggregate budgets; do not assume a SPARQL service or fetch a bulk ontology by default.
