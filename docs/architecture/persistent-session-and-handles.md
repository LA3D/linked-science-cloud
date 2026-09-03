# Persistent Communica session and symbolic handles

The worker's Node JavaScript REPL owns the in-memory Communica engine, model-selected source IRIs, and retained result state. It has no raw transport: live dereference and federation requests cross a parent-owned traversal mediator. Reusable top-level bindings let state survive across REPL tool calls within one kernel.

`lib/repl-linked-data-session.mjs` provides the retained-session boundary. Resources and results are materialized once under symbolic handles and inspected through typed, bounded operations such as `resources.inspect`, `profile`, `page`, `deriveFilter`, or `deriveCountBy`. Broker-mediated resource reads retain native bytes, response metadata, and aggregate lineage atomically; RDF can be parsed into a native graph handle and reused by Communica without a second request.

Keep the following identities distinct:

- a **handle** names REPL-resident evidence or results;
- an **operation receipt** proves a particular state transition or observation;
- an **orientation entry** is compact symbolic guidance that may point to a handle;
- a **display model** is a bounded projection for presentation; and
- an **artifact** is a separately authorized durable file.

A handle name alone does not prove residency, type, count, or freshness. Those claims require a current session operation. Full documents and result rows remain behind handles; compact metadata, bounded pages, aggregates, provenance, and uncertainty may cross into the task conversation.

The REPL kernel is ephemeral. Reset destroys JavaScript bindings and resident handles; it does not turn a former result into an artifact or authorize rerunning its source. See [orientation cache and reset](orientation-cache-and-reset.md) for recovery semantics, the [goal-loop dossier](../experiments/goal-loop-state-graph.md) for the evidence-state rationale, and the [operation-selection experiment](../experiments/open-goal-uniprot-operation-selection.md) for recorded table and graph handles.
