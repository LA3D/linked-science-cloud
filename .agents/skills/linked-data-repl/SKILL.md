---
name: linked-data-repl
description: Explore RDF, ontologies, and approved public Linked Data through a persistent mediated JavaScript workspace with grounded evidence, cumulative budgets, retained handles, and bounded views.
---

# Linked Data REPL

Choose the narrowest capability that serves the user's intent. Use static repository or connector evidence when sufficient. Use the project `cleanroom_node_repl` only for persistent RDF/Communica state, mediated public Linked Data traversal, or bounded reuse of resident scientific evidence. Live work requires current authorization for its scope and budgets.

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

Reuse `linkedScience`, the goal workspace, and current evidence/result/plan handles across calls and later turns while valid. Read the complete callable contract once with `linkedScience.documentation.all()`; use `documentation.get(name)` for targeted troubleshooting. Do not duplicate the runtime schema from memory or reset because one local object or call is malformed. Read `documentation.get('recovery')` first. Reset only after actual kernel/workspace invalidation; stale handles must be reacquired through an authorized source.

## Scientific control boundary

Keep resource-specific schemas, vocabularies, endpoints, graphs, predicates, and identifiers in declarative evidence or resident context—not this skill or generic runtime logic. Before a scientific query, use the generated grounding contract to orient or discover, retain typed evidence, attest source/graph/predicate choices, and construct an immutable plan.

For embedded declarative evidence, normally call `await workspace.grounding.load({ name, document })`; omission of `source` selects the generic typed declarative-manifest provenance default.

Local deterministic validation failures expose `error.repair`. Correct them in place while its bounded allowance remains; they consume no live request budget. Live discovery and scientific query attempts are explicit agent decisions within one cumulative mediator scope. Iterate when task policy and remaining request, fan-out, concurrency, duration, byte, item, and `maxScientificQueries` budgets permit. Each attempt and later immutable-plan enrollment is receipted. Transport performs no hidden retries. An evaluation may explicitly set `maxScientificQueries: 1`; single-shot behavior is not the generic default.

Treat remembered resource facts as hypotheses until supported by declarative or retrieved evidence. An unavailable source or empty result is not proof of global absence. Keep bulk data behind resident handles and return only bounded views, provenance, and uncertainty.

## Routed detail

- Persistent environment or reset semantics: [REPL environment and persistence](references/repl-environment.md).
- Authorization, evidence acquisition, grounding, and cumulative iteration: [guarded evidence acquisition](references/guarded-evidence-acquisition.md).
- Retained handles and presentation: [retained state and bounded presentation](references/retained-state-and-presentation.md).
- Runtime implementation or recovery: [runtime discovery](../../../docs/agent/runtime-discovery.md), then generated documentation.
- Historical Identifiers.org reproduction only: [retired profile](references/identifiers-org-sparql.md).

Do not expose raw Fetch, create parallel data/query helpers, install packages, change global configuration, export, commit, or push unless separately authorized. After authorized repository changes, follow [verification](../../../docs/agent/verification.md).
