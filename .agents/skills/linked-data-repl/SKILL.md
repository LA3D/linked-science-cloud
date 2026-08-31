---
name: linked-data-repl
description: Explore RDF, ontologies, and approved public Linked Data through a persistent mediated JavaScript workspace with resident evidence, bounded queries, and reusable result handles.
---

# Linked Data REPL

Choose the narrowest capability that serves the user's intent. Use static repository or connector evidence when sufficient. Use `cleanroom_node_repl` for persistent RDF/Communica state, mediated public Linked Data traversal, or reuse of resident scientific evidence. Live work requires current authorization for its scope and budgets.

The authoritative project root is `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`. It owns both the Linked Science facade and `packages/cleanroom-node-repl`. The sibling `node-repl-network-probe` checkout and Desktop's bundled `node_repl` are not production implementations or fallbacks. When repository verification is in scope, run `npm run linked-science:verify` from the authoritative root; this is an offline proof and does not replace task-level MCP observation.

## Persistent runtime

Use only `cleanroom_node_repl`. On a fresh kernel, verify project cwd, CodeAct mode, cross-call persistence, and absence of raw transport once. Initialize only when the stable binding is absent:

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

After bootstrap, inspect `linkedScience.capabilities().environment` once. Require project id `@linked-science/runtime`, role `authoritative-production-implementation`, broker package `@linked-science/cleanroom-node-repl`, the authoritative cwd, and the exact three-tool MCP surface. Stop rather than treating a generic or probe REPL as Linked Science when any value differs.

Reuse `linkedScience`, the goal workspace, and valid evidence/result handles across calls and later turns. Read `linkedScience.documentation.all()` once, then use `documentation.get(name)` only for targeted recovery. Correct malformed calls in place; reset only after actual kernel or workspace invalidation. A reset makes old handles stale and does not authorize reacquisition.

## Agentic Linked Science

Before constructing a scientific query, inspect evidence appropriate to the resource and question: source-owned documentation, an ontology or schema, a service or dataset description, VoID/DCAT, `/.well-known/void`, examples, or another justified source. Treat remembered access patterns as hypotheses. Keep resource-specific endpoints, graphs, predicates, and identifiers in evidence or resident JavaScript state—not this skill or generic runtime code.

Retain local declarative material when useful:

```js
const evidence = await workspace.evidence.load({
  name: 'resource-notes',
  document: resourceNotes,
});
```

Retrieve RDF evidence and run scientific reads with the same direct operation. Mark a SPARQL service explicitly so it is not dereferenced as an RDF document:

```js
const result = await workspace.traversal.query({
  sources: [{ type: 'sparql', value: serviceUrl }],
  sparql,
  evidence: [evidence],
  budgets: { maxRequests: 4, maxResultItems: 100 },
});
```

Each call is one visible, bounded attempt with a final receipt and no hidden transport retry. Inspect `workspace.traversal.history()` when retry count or failure history matters. Explicit corrections and revised scientific queries are normal agent actions; evaluation observes them instead of controlling the runtime.

Errors expose `error.repair` when a local call shape can be corrected without a live request. Reuse resident handles and ordinary JavaScript values to compose work across resources. Keep bulk data behind handles and return only bounded views, provenance, and calibrated uncertainty. An unavailable source or empty result is not proof of global absence.

## Routed detail

- Persistent environment or reset semantics: [REPL environment and persistence](references/repl-environment.md).
- Authorization, evidence orientation, mediated querying, and receipts: [guarded evidence acquisition](references/guarded-evidence-acquisition.md).
- Retained handles and presentation: [retained state and bounded presentation](references/retained-state-and-presentation.md).
- Runtime implementation or recovery: [runtime discovery](../../../docs/agent/runtime-discovery.md), then generated documentation.
- Historical Identifiers.org reproduction only: [retired profile](references/identifiers-org-sparql.md).

Do not expose raw Fetch, create a parallel data/query facade, install packages, change global configuration, export, commit, or push unless separately authorized. After authorized repository changes, follow [verification](../../../docs/agent/verification.md).
