# Orientation cache, stale state, and reset

`lib/context-map-recovery.mjs` implements a bounded PEEK-aligned orientation cache beside the REPL's bulk state. Its five sections record compact reusable orientation:

- `context-roadmap`: available or attempted sources;
- `context-understanding`: grounded relations and known failures;
- `domain-constants`: stable IRIs and identifiers;
- `parsing-schema`: detected formats and reusable parsing facts; and
- `reusable-results`: named retained handles and their roles.

Entries use stable IDs, remain JSON-compatible, and are priority-evicted to stay small. They may cite evidence handles and operation IDs. They must not contain raw documents, result rows, SPARQL text, task answers, prose reasoning, or a second goal/workflow lifecycle.

The cache is orientation, not authority. Before reusing an entry, a worker checks the current session for the referenced handle and verifies its type and state through an operation receipt. A cache entry that predates a reset or conflicts with current session evidence is stale; it may preserve lineage or a known failed route, but it cannot support a claim that the handle is resident.

After REPL reset, JavaScript bindings and resident handles are missing. Recovery must report invalidation or absence honestly. Rematerialization is a new operation through the original authorized source path, with new provenance, and must be refused when the source or current authorization is unavailable. Module search roots added to the MCP server may survive a kernel reset, but that does not restore scientific state.

Source failures can remain useful orientation only at their exact scope. A failed route is not evidence that a fact is globally absent, and an empty result describes one exact bounded query over the queried graph.

The detailed design evidence and pending perturbations live in the [goal-loop state dossier](../experiments/goal-loop-state-graph.md). The recorded constrained reset behavior is in the [clean-worker evaluation](../experiments/clean-worker-map-evaluation.md).
