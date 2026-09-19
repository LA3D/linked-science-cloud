---
name: linked-data-repl
description: Use the persistent Linked Science REPL for public resources, native RDF/JS composition, Comunica queries, and reusable scientific state.
---

# Linked Data REPL

Use the project `cleanroom_node_repl` for scientific JavaScript work. Large resources, graphs and complete results stay outside the prompt; native RDF/JS and Comunica operations select useful evidence. The authoritative checkout is `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`. Its broker and facade are distinct from the sibling experimental probe and the bundled generic REPL.

## Start and reuse

The project broker prepares `linkedScience` / `ls` automatically:

```js
var ws = linkedScience.open({ contextKey: 'scientific-question' });
nodeRepl.write(await ws.orientation.bootstrap({ maxBytes: 4096 }));
```

Reuse bindings, workspaces and valid handles across calls. Use `ws.inventory()` to find retained objects, and `linkedScience.documentation.get(name)` for an unfamiliar operation. Full identity checks and explicit fallback bootstrap belong to [runtime discovery](../../../docs/agent/runtime-discovery.md), for activation or diagnosis.

## Choose the information-bearing operation

Use local synthetic RDF when it serves the task. Query a remote source directly for a one-off subgraph; acquire and parse once when repeated local queries or transformations will reuse the representation. Consult source-owned schema, ontology or documentation when vocabulary, access semantics or scientific ambiguity warrant it.

```js
var resource = await ws.resources.get(documentUrl);
var graph = await resource.rdf({ name: 'source-graph' });
var source = ws.rdf.source(graph); // streaming RDF/JS Source; no whole-graph clone
```

`ws.query.run({ sources: [graph], sparql })` runs local SPARQL. `ws.traversal.query({ sources, sparql })` performs mediated remote queries/federation; identify a SPARQL service as `{ type: 'sparql', value: serviceUrl }`. Native matching and `countQuads` are available on `rdf.source`; `rdf.clone` explicitly creates a mutable resident dataset, and `rdf.retain` retains caller-owned RDF. Legacy `rdf.dataset` also clones.

Choose ASK, SELECT, CONSTRUCT, DESCRIBE, matching, schema search or neighborhoods according to the needed information. DESCRIBE uses the runtime's documented outgoing-subject-triples policy. Keep source evidence, query results, prior hypotheses and synthesis distinct. An empty query or unavailable source is scoped evidence, not proof of global absence.

## Observe and release

Use bounded profiles, pages, tables or subqueries. Always `await ws.results.page(...)` and `table(...)`: large complete results may live in indexed broker storage. A display limit does not limit graph size. Never insert a SPARQL LIMIT just to satisfy storage or prompt bounds; successful query handles are complete and operational exhaustion is an explicit failure.

```js
nodeRepl.write(await ws.results.page(result));
await ws.release(result); // when no longer needed
// At the end of a workspace's useful lifetime:
await ws.dispose();
```

Release invalidates new handle/view access and reclaims registry/storage ownership. Disposal or `await linkedScience.reset({ contextKey })` cleans the workspace, including pending allocations. Other workspaces and caller-owned copies remain independent. Use whole-kernel reset for actual kernel invalidation, not routine memory cleanup. `KERNEL_OOM` means all earlier kernel handles are lost; the next evaluation rebuilds the facade.

Source orientation is a small derived map, separate from inventory. For repeated questions over a known context version, optionally pass `orientationContext: { id, version }` to `open`. On opening/resuming a question, display `orientation.bootstrap` as above; this is explicit tool-result delivery, not host prompt injection. Empty or unavailable maps do not block scientific work.

During normal exploration, the experimental `await ws.orientation.update({ edits })` accepts at most four ADD/REPLACE/DELETE edits with IDs such as `ls-semantic:relationship`. For ADD/REPLACE, supply `entry: { section: 'context-understanding', text, claimKind: 'observed-relationship' | 'documented-meaning' | 'interpretation', evidence: [{ handle: graph, quads: observedNativeQuads }] }` (at most eight quads per entry). Use native quads observed via `rdf.source(handle).match`, not invented evidence or prepared map answers. Runtime-attached source fingerprints and membership validation establish references, not semantic truth. Inspect the receipt for rejection or eviction, and continue from source evidence if an update fails. Dependency changes need fresh evidence before replacement; old map handles never restore residency.

Map references are advisory, never residency or authorization. Learned PEEK and model recursion remain separately advertised research capabilities.

## Access and further detail

Ordinary goal-relevant anonymous public scientific reads use the private broker and its default bounds/receipts; callers may request tighter bounds. Authenticated, sensitive, mutating, bulk-ingestion, export and evaluation work require their own authority. Do not expose raw Fetch, change global configuration, install packages or push without authorization.

Read only relevant detail:

- [Environment and diagnostics](references/repl-environment.md).
- [Mediated evidence acquisition](references/guarded-evidence-acquisition.md).
- [Retained state and presentation](references/retained-state-and-presentation.md).
- [Historical Identifiers.org reproduction](references/identifiers-org-sparql.md), only for that recorded experiment.

For repository changes, follow [verification](../../../docs/agent/verification.md) and the repository Git handoff procedure. Experiments require compact registered receipts before losing ephemeral state; ordinary implementation tests are not scientific evaluation claims.
