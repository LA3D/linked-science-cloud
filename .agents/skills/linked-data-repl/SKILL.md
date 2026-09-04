---
name: linked-data-repl
description: Use the persistent Linked Science/Linked Data REPL for composable public resources, RDF/JS datasets, Communica queries, and reusable resident results.
---

# Linked Data RLM REPL

Treat `cleanroom_node_repl` as an RDF-specialized Recursive Language Model (RLM) control environment. Large resources, graphs, ontologies, and results stay external to the prompt behind resident handles; use model-written JavaScript, RDF/JS, Communica, and optional host-mediated recursive calls to inspect only the relevant context. Choose the narrowest capability that serves the user's intent. Use static repository or connector evidence when sufficient. A normal request that needs anonymous public scientific retrieval uses the broker-mediated surface and its defaults; request-specific tighter limits remain available. Authenticated, sensitive, mutating, bulk, export, and evaluation work require the appropriate separate authority.

The authoritative project root is `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`. It owns both the Linked Science facade and `packages/cleanroom-node-repl`. The sibling `node-repl-network-probe` checkout and Desktop's bundled `node_repl` are not production implementations or fallbacks. When repository verification is in scope, run `npm run linked-science:verify` from the authoritative root; this is an offline proof and does not replace task-level MCP observation.

## Persistent runtime

Use only `cleanroom_node_repl`. For normal work, conditionally bootstrap the stable facade once per kernel:

```js
if (globalThis.linkedScience == null) {
  var { bootstrapLinkedScience } = await import('file:///Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl/lib/cleanroom-linked-science-bootstrap.mjs');
  await bootstrapLinkedScience({
    host: globalThis,
    cleanroom: nodeRepl,
    projectRoot: '/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl',
    moduleRoot: '/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl/node_modules',
  });
}
```

Use `linkedScience.capabilities()` or `documentation.get(name)` when you need to discover an available effect, route, bound, or recovery action. Reserve exhaustive identity, persistence, raw-transport, and exact three-tool checks for activation, diagnostics, evaluation, or a suspected wrong runtime; see [runtime discovery](../../../docs/agent/runtime-discovery.md).

Reuse `linkedScience`, the goal workspace, and valid resource/evidence/result handles across calls and later turns. Correct malformed calls in place; reset only after actual kernel or workspace invalidation. A reset makes old handles stale and does not authorize reacquisition.

## Agentic RLM Linked Science

Use source documentation, an ontology/schema, service description, examples, or retained evidence when an access pattern, vocabulary, provenance claim, scientific ambiguity, or stakes make it useful. Do not add an orientation step merely by ritual: straightforward resource reads and known local datasets can proceed directly. Treat remembered resource-specific details as hypotheses and keep endpoints, graphs, predicates, and identifiers in evidence or resident JavaScript state—not this skill or generic runtime code.

Retain local declarative material when useful:

```js
const evidence = await workspace.evidence.load({
  name: 'resource-notes',
  document: resourceNotes,
});
```

Choose between direct subgraph query and acquire-once reuse by considering the information need and likely representation size. Query a remote RDF source directly when only one small subgraph is needed. Retrieve and parse once when several local queries or RDF/JS transformations will reuse the same representation. `HEAD` and `Content-Length` are optional hints, not required gates; actual broker byte/time accounting is authoritative. A large RDF graph is symbolic external context, not a prompt-size failure.

Retrieve a representation through the general resource surface when its document, JSON, text, XML, CSV, binary, or reusable RDF form matters. The returned object is response-like inside the persistent REPL; its bounded inspection and provenance are automatic. Parse RDF directly into a resident graph—do not wrap document retrieval in CONSTRUCT merely to acquire it:

```js
const resource = await workspace.resources.get(documentUrl, {
  headers: { accept: 'text/turtle, application/ld+json;q=0.8' },
  role: 'source-document',
});
const graph = await resource.rdf({ name: 'source-graph' });
const dataset = workspace.rdf.dataset(graph); // native RDF/JS DatasetCore in the REPL
```

Use `workspace.traversal.query` for general SPARQL/Communica reads. Mark a SPARQL service explicitly so it is not dereferenced as an RDF document:

```js
const result = await workspace.traversal.query({
  sources: [{ type: 'sparql', value: serviceUrl }],
  sparql,
  evidence: [evidence],
});
```

Each call is one visible, broker-bounded attempt with a final receipt and no hidden transport retry. Supply `budgets` only when the task needs tighter limits than the broker defaults. Keep execution limits (requests, bytes, time), resident state limits, and model-visible projections (rows, cells, nodes, edges, preview bytes) conceptually separate. Inspect `workspace.traversal.history()` when retry count or failure history matters. Explicit corrections and revised scientific queries are normal agent actions; evaluation observes them instead of controlling the runtime.

Errors expose `error.repair` when a local call shape can be corrected without a live request. Reuse resident handles and ordinary JavaScript values to compose work across resources. Prefer ontology-informed `ASK`, `SELECT`, `CONSTRUCT`, neighborhoods, schema search, or RDF/JS matching over printing or paging through a graph. Keep bulk data behind handles and return only bounded views, provenance, and calibrated uncertainty. An unavailable source or empty result is not proof of global absence.

## Routed detail

- Persistent environment or reset semantics: [REPL environment and persistence](references/repl-environment.md).
- Authorization, evidence orientation, mediated querying, and receipts: [guarded evidence acquisition](references/guarded-evidence-acquisition.md).
- Retained handles and presentation: [retained state and bounded presentation](references/retained-state-and-presentation.md).
- Runtime implementation or recovery: [runtime discovery](../../../docs/agent/runtime-discovery.md), then generated documentation.
- Historical Identifiers.org reproduction only: [retired profile](references/identifiers-org-sparql.md).

Do not expose raw ambient Fetch, install packages, change global configuration, export, commit, or push unless separately authorized. The stable `workspace.resources`, `workspace.rdf`, and `workspace.traversal` APIs are the supported composable Linked Data surface. After authorized repository changes, follow [verification](../../../docs/agent/verification.md).
