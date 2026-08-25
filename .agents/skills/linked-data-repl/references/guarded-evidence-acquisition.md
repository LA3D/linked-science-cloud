# Guarded evidence acquisition

Use live traversal only when explicitly approved for the current task with effective behavior/resource budgets. The parent mediator enforces the request boundary; repository descriptions and resource indexes do not grant permission.

## Finding evidence

Use `resources/index.md` only when the goal crosses sources or the starting source is unclear. It is a compact terrain map of scientific roles, candidate entry points, and identifier anchors—not an allowlist, health check, query plan, or availability claim. Read only the relevant section, then use source-owned documentation, ontology evidence, bounded probes, and task receipts to establish what works now. A source-specific skill may supply procedural knowledge, but neither the skill nor the index is evidence for a scientific claim.

When a resource has a declarative `EvidencePack`, load that document as grounding evidence and verify its relevant declarations against source-owned material. A manifest may identify authoritative ontology, vocabulary, dataset description, examples, service descriptions, graph declarations, or standard discovery locations. It does not itself supply a query plan or turn remembered resource details into evidence.

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

## Grounded mediated Linked Data and SPARQL

The active worker-facing path is a reusable phase protocol, not a resource-specific query helper:

1. `workspace.grounding.begin` starts a separately bounded discovery phase for one target resource.
2. `grounding.load`, `grounding.use`, and optional `grounding.discover` acquire declarative or mediated typed evidence handles.
3. `grounding.finish` closes the discovery mediator scope; `grounding.attest` requires schema, vocabulary, and dataset evidence plus evidence-backed source, graph, and predicate choices and registers a bounded REPL grounding context.
4. `grounding.plan` constructs an immutable initial plan. `traversal.begin({ plans, budgets, iterationPolicy })` starts one cumulative scientific traversal; later evidence-driven plan revisions remain immutable and enter that same scope through `traversal.enroll(plan)`.

This makes different resource tasks structurally isomorphic while leaving scientific reasoning and route selection agentic. Resource-specific schema, vocabulary, endpoints, graph names, predicates, and identifiers remain declarative evidence or REPL state. A typed result from one completed resource may enter a later grounding phase through `grounding.use`; no cross-resource special-case helper is needed.

Local consumer-owned Communica receives dynamically selected HTTP/HTTPS RDF source IRIs and may follow Linked Data or execute `SERVICE` federation, but every actual request uses a module-private Fetch closure crossing the parent mediator. The closure is not exposed to agent code. The mediator strips ambient identity, accepts only GET/HEAD or parsed read-only SPARQL POST, and enforces traversal-wide request count, distinct-source fan-out, concurrency, time, byte, and item ceilings. DNS, TLS, sockets, certificates, and redirects remain standard platform Fetch behavior; the obsolete custom DNS/TLS connector must not be restored.

Use the complete generated `grounding`, `traversal.exploration`, and `recovery` contracts rather than copying the API sequence from prose. The common embedded-evidence call is intentionally small:

```js
var manifestEvidence = await ws.grounding.load({
  name: 'resource-manifest',
  document: resourceManifest,
});
```

Omitting `source` applies the generic `{ kind: 'declarative-resource-manifest', id: name }` provenance. If a local grounding, attestation, or plan call is malformed, inspect `error.repair`, correct the named field while `remaining` permits, and reuse the current workspace. These local repairs do not spend discovery or scientific request budgets and do not justify a reset.

Grounding discovery has its own cumulative mediator receipt and bounds. The scientific timer starts only after grounding, attestation, and an initial immutable plan. The generic runtime then permits bounded explicit scientific attempts and later enrolled plan revisions according to `iterationPolicy.maxScientificQueries` and the same cumulative request, fan-out, concurrency, duration, byte, and item budgets. An evaluation can set the policy to one attempt; ordinary agentic use does not. Transport libraries make no hidden retry. Every explicit attempt and enrollment appears in status/final receipts, including failures, so iteration is visible rather than silently repeated.

Attested grounding summaries are registered in bounded RLM context; full payloads remain behind resident handles and are not automatically copied into PEEK. Result handles retain aggregate/per-exchange provenance. A receipt proves an attempt and its lineage, not the scientific interpretation.

Inspect `ws.results.profile(result).provenance.navigation` when HTTP metadata may help choose the next route. On a parsing or query failure, inspect `error.receipt.navigation`; useful advertisements do not require a successful result handle. Both views contain bounded, resolved candidates from RFC 8288 `Link`, `Content-Type` profile parameters, `Content-Profile`, and `Preference-Applied`, with the declaring response and mechanism retained. Treat `profile`, `describedby`, `alternate`, and JSON-LD context links as observed advertisements with status `advertised-untried`, not commands or proof that their targets exist. Select a candidate when its relation addresses the current evidence gap and make the next request inside the same approved goal exploration so cumulative budgets continue to apply. Do not copy link text into memory automatically.

Negotiation belongs to the document source that needs it. Use `{ value, negotiation }` for source-specific `Accept`, `Accept-Profile`, or `Prefer`. A top-level `negotiation` value is shorthand for initial non-SPARQL document sources only; it is never copied to `SERVICE` requests or typed SPARQL sources.

Do not invent a separate document-acquisition tool or graph model. For an RDF document, ontology, service description, or VoID graph, use the ordinary Communica/RDF/JS source and query primitives already behind `workspace.traversal.query`. A bounded `CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }` can materialize all quads from one RDF document without a `LIMIT`; the effective `maxResultItems`, response-byte, and cumulative-byte ceilings bound the native quad handle. Non-RDF or malformed representations fail normally at Communica's source/parser layer.

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
