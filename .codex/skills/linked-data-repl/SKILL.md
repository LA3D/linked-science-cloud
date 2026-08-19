---
name: linked-data-repl
description: Explore messy RDF, ontologies, and approved public Linked Data sources through a persistent Node JavaScript REPL with Communica. Use for evidence-grounded questions, adaptive source recovery, schema discovery, bounded read queries, symbolic orientation maps, retained handles, and compact presentation.
---

# Linked Data REPL

Use this experimental project as a goal-directed, read-only Linked Data workspace. Let the user's goal and current evidence determine the route; do not impose a fixed reasoning or narration sequence.

## Invariants

- Work from this repository and preserve unrelated changes.
- Treat remembered terms, prefixes, graph paths, and endpoint behavior as hypotheses until supported by retrieved source evidence.
- Distinguish prior belief, source evidence, query-result evidence, and synthesis.
- Pursue the information goal, not a preferred source or memorized graph path. Change routes when evidence or failures warrant it.
- Never interpret an unavailable source or empty result as proof of global absence.
- Use only an endpoint or documentation profile explicitly approved for the current task. Do not substitute hosts, paths, provider URLs, REST routes, or federation targets.
- Keep live operations read-only, bounded, pinned, redirect-free, timed out, and provenance-bearing through the project guard.
- Keep large documents and results in the REPL behind named bindings or handles. Return only compact metadata, bounded pages or aggregates, provenance, and uncertainty.
- Do not change global Codex configuration, install packages, export data, commit, push, or write externally unless the user separately authorizes it.

## REPL environment contract

Keep these names distinct:

- `js_repl` is the Codex feature flag;
- `node_repl` is the MCP server exposed when that capability is available;
- `mcp__node_repl__js` is the tool an agent calls to execute JavaScript;
- `mcp__node_repl__js_add_node_module_dir` adds an absolute `node_modules` search root;
- `mcp__node_repl__js_reset` destroys the JavaScript kernel and its resident bindings.

Use the `node_repl` MCP `js` tool whenever this skill says to use the REPL. Do not look for a separate callable tool literally named `js_repl`.

Before creating scientific state, perform this short environment preflight in order:

1. Confirm the `node_repl` MCP `js` tool is callable with `nodeRepl.write(nodeRepl.cwd)`.
2. Require `nodeRepl.cwd` to equal this repository's intended project root. A shell `cd` is not evidence of the REPL cwd. If it differs, stop and report a task-launch/cwd failure rather than silently attaching another project's dependencies.
3. In the REPL, run `await import.meta.resolve('@comunica/query-sparql')`. A failure here is module resolution, not missing network access.
4. Only when the cwd is correct and the dependency is already installed, use `js_add_node_module_dir` with the exact project `node_modules` path as an explicit recovery. Report that recovery. Do not install anything or guess another module directory.
5. Create a trivial top-level `var` binding, then inspect it in a second `js` call before claiming persistence.
6. When the authorized task needs live data, make one bounded, approved, guarded network preflight. Treat DNS, socket, timeout, and HTTP failures as transport evidence distinct from tool exposure, cwd, module resolution, and persistence.

The visible three-tool MCP surface does not prove how it was activated. A manually registered `node_repl` server can look the same as feature-managed `js_repl` while receiving different project, sandbox, network, native-pipe, or module metadata. Report activation as unresolved unless current task metadata establishes it; never change global Codex configuration from this skill.

Use dynamic imports and top-level `var` for reusable bindings. Package imports use the REPL-wide roots and cwd; do not import package entrypoints through `./node_modules/...`. Prefer `nodeRepl.write(...)` for compact text output. `js_reset` clears JavaScript bindings, but module search roots added with `js_add_node_module_dir` survive for the MCP server lifetime. Treat reset as recovery, not routine cleanup.

Documentation-only or static-source tasks do not require this preflight unless they claim REPL execution, retention, or live connectivity.

## Evidence resources

Use `resources/index.md` only when the goal crosses sources or the starting source is unclear. It is a compact terrain map of scientific roles, candidate entry points, and identifier anchors—not an allowlist, health check, query plan, or availability claim. Read only the relevant section, then use source-owned documentation, ontology evidence, bounded probes, and task receipts to establish what works now. A source-specific skill may supply procedural knowledge, but neither the skill nor the index is evidence for a scientific claim.

For UniProt work, `resources/uniprot.evidence-pack.json` is a minimal evidence manifest. It identifies the authoritative ontology documentation, official query examples, dataset description, named graph declaration, and query-policy reference. It does not supply query plans, term inventories, motifs, or fallback answers.

Choose and retrieve resources according to the goal. If authoritative evidence cannot be acquired, keep the relevant claim unresolved rather than falling back to the legacy affordance planner.

Evidence seeking has intentionally high freedom. Depending on the goal and what is reachable, useful routes can include an ontology, service description, official documentation, examples, endpoint introspection, a bounded instance probe, or locally authorized source code. Prefer stronger and more direct evidence, but do not make one route a universal prerequisite. Record failed routes and weaker evidence explicitly, then replan without upgrading prior knowledge into fact.

## Guarded evidence acquisition

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

## Documentation retrieval

Use the ergonomic guarded client:

```js
var documentationModule = await import('./lib/guarded-documentation-fetch.mjs');
var documentationClient = documentationModule.createDocumentationClient();
var { response, receipt } = await documentationClient.fetch('uniprotRdfSchema');
```

Keep `response` or its text resident in the REPL. Use `receipt` directly for source, status, content type, byte length, SHA-256, redirect policy, and timeout. The `uniprotRdfSchema` profile authorizes only the pinned UniProt ontology documentation GET; it does not authorize a SPARQL request.

## Guarded SPARQL

Use `lib/guarded-sparql-transport.mjs` for approved live queries. It is the enforcement point for syntax, read operation, endpoint, bounds, redirects, timeouts, retries, federation targets, and provenance. Pass its Communica options at the top level, not nested under `context`.

For a live read result that should remain available, use the typed atomic worker-facing operation:

```js
var sessionModule = await import('./lib/repl-linked-data-session.mjs');
var transportModule = await import('./lib/guarded-sparql-transport.mjs');
var engine = new (await import('@comunica/query-sparql')).QueryEngine();
var session = sessionModule.initializeLinkedDataSession({ engine, sources: [], maxRows: profile.maxResults });
var { handle, receipt } = await transportModule.queryToHandleGuarded({ session, handle: 'result-name', query, profile });
```

This validates the session, handle, query type, and result cap before network access; performs the guarded query once; retains the typed result; and returns one receipt containing all transport attempts and metadata-only result shape. It deliberately returns no automatic row or quad sample: explicitly page the handle when bounded values are needed, because literals can be large. The transport also enforces a response-byte ceiling, because a SPARQL `LIMIT` does not necessarily bound the size of a graph response. `SELECT` yields a bindings handle, `ASK` a boolean handle, and `CONSTRUCT` or `DESCRIBE` a quad handle. The installed Communica engine handles `SELECT`, `ASK`, and `CONSTRUCT`; endpoint-native `DESCRIBE` uses the same guarded transport and parses its bounded RDF response with N3 because this engine build has no DESCRIBE operation actor. If an operation fails, inspect the thrown error's `receipt` instead of repeating the query blindly.

Available profiles include:

- `identifiersOrg`: bounded read operations against the pinned Identifiers.org SPARQL endpoint.
- `identifiersOrgLiveTable`: `SELECT` only, capped at 20 rows for a live-table demonstration.
- `uniprotRead`: bounded `ASK`, `SELECT`, `CONSTRUCT`, and carefully qualified `DESCRIBE` against UniProt only; no `SERVICE`.
- `wikiPathwaysRead`: bounded read operations against the exact WikiPathways SPARQL endpoint, including retrieval of linked `wp:bdbChEBI` and `wp:bdbUniprot` identifiers; no `SERVICE`.
- `uniprotRheaWikidataFederation`: starts at the pinned UniProt endpoint, allows bounded `SELECT`, and permits only the pinned Rhea and Wikidata `SERVICE` targets.

Choose `ASK`, `SELECT`, `CONSTRUCT`, or carefully qualified `DESCRIBE` according to the information need. Do not default to `SELECT` merely because it is familiar. A transport receipt proves the request occurred; it does not by itself prove a semantic interpretation.

For ChEBI, distinguish a linked identifier from external enrichment. WikiPathways may return a ChEBI IRI through the HTTP vocabulary predicate `http://vocabularies.wikipathways.org/wp#bdbChEBI`; returning that IRI does not contact EMBL-EBI. When the goal needs ChEBI labels, definitions, or ontology metadata, create an exact profile with `createChebiCompoundEvidenceProfile('CHEBI:<id>')` from `lib/linked-data-source-profiles.mjs`, then pass that profile to `acquireEvidenceToHandleGuarded`. The helper permits only the official public compound JSON route for that validated accession. Do not treat ChEBI as a SPARQL service or fetch the hundreds-of-megabytes full ontology by default.

Read `references/identifiers-org-sparql.md` only for Identifiers.org schema work. Read `docs/experiments/goal-loop-state-graph.md` only when changing the evidence/session architecture.

## Retained results and presentation

Use `lib/repl-linked-data-session.mjs` when results should survive across REPL calls. For live results, prefer `queryToHandleGuarded`; use direct materialization methods only for values already obtained through another verified guard. Materialize once under a symbolic handle, then inspect with bounded `profile`, `page`, `deriveFilter`, or `deriveCountBy` operations rather than rerunning or dumping the source result.

Use `displayTable` for an inline table model of at most 10 scalar rows. A display model is a bounded projection, not the result itself. Export requires separate user authorization and is not implemented by this skill.

## Symbolic orientation cache

Use `createOrientationMap`, `recordAcquisitionOrientation`, `recordResultOrientation`, and `recordOrientation` from `lib/context-map-recovery.mjs` when a task needs a compact context map. This is the PEEK-style orientation cache beside the REPL's bulk state:

- `context-roadmap`: available or attempted sources;
- `context-understanding`: grounded relations and known failures;
- `domain-constants`: stable IRIs and identifiers;
- `parsing-schema`: detected formats and reusable parsing facts;
- `reusable-results`: named retained handles and their roles.

The map is bounded, stable-ID, JSON-compatible symbolic state. It may point to evidence handles but must not contain raw documents, rows, SPARQL text, task answers, prose reasoning, or a competing goal/workflow state machine. Add only reusable orientation that reduces later search or prevents a repeated failure. Priority eviction keeps the map compact; the REPL handles retain the inspectable evidence.

## Reporting

Return the answer at the scale the user needs. Include enough compact evidence to distinguish:

- what source or query was actually used;
- what remains resident in the REPL;
- what the bounded result supports;
- what remains uncertain or would require another source or permission.

Do not manufacture a map, receipt, frontier, or operation narrative merely to satisfy a template. Codex owns the task and worker lifecycle; this project contributes only Linked Data evidence and session state.

## Verification after code changes

Run:

```sh
npm test
npm run smoke
git diff --check
```
