---
name: linked-data-repl
description: Explore RDF, ontologies, and approved public SPARQL sources through a persistent Node JavaScript REPL with Communica. Use for evidence-grounded Linked Data questions, schema discovery, bounded read queries, retained result handles, and compact presentation of large results.
---

# Linked Data REPL

Use this experimental project as a goal-directed, read-only Linked Data workspace. Let the user's goal and current evidence determine the route; do not impose a fixed reasoning or narration sequence.

## Invariants

- Work from this repository and preserve unrelated changes.
- Treat remembered terms, prefixes, graph paths, and endpoint behavior as hypotheses until supported by retrieved source evidence.
- Distinguish prior belief, source evidence, query-result evidence, and synthesis.
- Never interpret an unavailable source or empty result as proof of global absence.
- Use only an endpoint or documentation profile explicitly approved for the current task. Do not substitute hosts, paths, provider URLs, REST routes, or federation targets.
- Keep live operations read-only, bounded, pinned, redirect-free, timed out, and provenance-bearing through the project guard.
- Keep large documents and results in the REPL behind named bindings or handles. Return only compact metadata, bounded pages or aggregates, provenance, and uncertainty.
- Do not change global Codex configuration, install packages, export data, commit, push, or write externally unless the user separately authorizes it.

## Persistent REPL

Use the persistent JavaScript REPL whenever the task needs resident documents, engines, results, or derived state. Verify the capability with an actual REPL call before making a persistence claim; do not substitute terminal output, repository prose, or conversation memory for live state.

Resolve project dependencies in the REPL with:

```js
await import.meta.resolve('@comunica/query-sparql')
```

Use dynamic imports and top-level `var` for reusable bindings. Inspect a binding again in a later REPL call before claiming it persisted. A reset destroys resident state.

Documentation-only or static-source tasks do not require a REPL preflight unless they claim REPL execution or retention.

## Evidence resources

For UniProt work, `resources/uniprot.evidence-pack.json` is a minimal evidence manifest. It identifies the authoritative ontology documentation, official query examples, dataset description, named graph declaration, and query-policy reference. It does not supply query plans, term inventories, motifs, or fallback answers.

Choose and retrieve resources according to the goal. If authoritative evidence cannot be acquired, keep the relevant claim unresolved rather than falling back to the legacy affordance planner.

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
- `uniprotRheaWikidataFederation`: starts at the pinned UniProt endpoint, allows bounded `SELECT`, and permits only the pinned Rhea and Wikidata `SERVICE` targets.

Choose `ASK`, `SELECT`, `CONSTRUCT`, or carefully qualified `DESCRIBE` according to the information need. Do not default to `SELECT` merely because it is familiar. A transport receipt proves the request occurred; it does not by itself prove a semantic interpretation.

Read `references/identifiers-org-sparql.md` only for Identifiers.org schema work. Read `docs/experiments/goal-loop-state-graph.md` only when changing the evidence/session architecture.

## Retained results and presentation

Use `lib/repl-linked-data-session.mjs` when results should survive across REPL calls. For live results, prefer `queryToHandleGuarded`; use direct materialization methods only for values already obtained through another verified guard. Materialize once under a symbolic handle, then inspect with bounded `profile`, `page`, `deriveFilter`, or `deriveCountBy` operations rather than rerunning or dumping the source result.

Use `displayTable` for an inline table model of at most 10 scalar rows. A display model is a bounded projection, not the result itself. Export requires separate user authorization and is not implemented by this skill.

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
