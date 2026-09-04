# Persistent scientific REPL architecture

- **Status:** Current architecture
- **Date:** 2026-09-04
- **Plan:** [Scientific REPL](../../PLAN.md)

## Design

Linked Science keeps scientific resources and results outside the prompt in a persistent JavaScript kernel. A thin workspace API owns handles, provenance and lifetime. RDF/JS sources and N3 provide native graph operations; Comunica provides SPARQL execution. The trusted broker provides anonymous public-read mediation, output limits, epoch recovery and private result storage. Codex owns the task and worker lifecycle.

```text
Codex task → persistent JavaScript → workspace handles / RDF/JS / Comunica
                                       ↕
                     broker transport, storage, limits and receipts
```

This uses the external-context mechanism described by [RLM](https://arxiv.org/html/2512.24601v2). The current provider capability is optional and reported honestly by `nodeRepl.rlm.capabilities()`. A recursive model call, durable child session and external-context registry are different mechanisms; the REPL does not require a durable agent platform.

## State and lifetime

Each workspace has one registry of resources, graph evidence and typed results. A handle is an epoch-scoped reference, not an artifact. `inventory()` gives a bounded view of current ownership; `results.profile()` gives detailed bounded provenance.

- `await workspace.release(handle)` invalidates one handle immediately, returns graph quota and removes any associated broker spool. Dependent results retain compact provenance, not ownership of the source payload.
- `await workspace.dispose()` invalidates the workspace immediately, then cleans up broker state. It waits for in-flight allocations to reveal their IDs before reclaiming them. Late queries and derivations cannot publish old-workspace results. It can be retried if cleanup reports a failure.
- `await linkedScience.reset({ contextKey })` disposes that workspace and advances its epoch. Other workspaces remain usable. Reopening creates a fresh registry.
- Kernel reset or loss additionally clears all JavaScript bindings and epoch-owned broker results. PEEK orientation survives as advisory metadata. The next evaluation initializes the validated facade again.

Release cannot erase JavaScript copies already obtained by the caller. Native query work already running may unwind after invalidation; physical execution limits remain the final bound. No stale handle is silently reacquired or restored.

## Native RDF/JS

`rdf.source(handle)` returns a read-only RDF/JS Source supporting `match` and `countQuads`. It supports both resident N3 stores and broker-stored graph results. The view exposes neither a mutable store nor transport authority and rejects new reads after release/disposal.

Resident matching uses N3's lazy `readQuads`; counts use its indexes. Stored matching pushes each pattern into the broker's SPO/POS/OSP indexes and streams bounded keyset pages. Comunica accepts these native interfaces directly, including optional count estimates for planning. See [Comunica source support](https://comunica.dev/docs/query/advanced/rdfjs_querying/).

`rdf.clone(handle)` explicitly copies a resident graph into a mutable N3 dataset; `rdf.dataset(handle)` remains a compatibility alias. Stored results require streaming views, bounded pages or symbolic subqueries. Parsing no longer copies private parser output again, and native dataset retention/cloning avoids unnecessary intermediate arrays. The original ordered, duplicate-aware source sequence remains where the evidence contract promises it; query stores apply RDF set semantics.

## Complete query results and bounded observations

SPARQL controls result semantics. The runtime accepts local and mediated SELECT, ASK, CONSTRUCT and DESCRIBE without inserting or requiring LIMIT. It publishes a handle only after materialization completes. Execution/storage exhaustion fails without a partial successful handle.

Small bindings and graph results remain in the kernel. Larger complete results spill into private broker SQLite storage. Bindings preserve bag semantics; graphs preserve set semantics. The spool is ephemeral, with no exposed path or durable-artifact claim. Workspace cleanup and kernel loss reclaim its records.

DESCRIBE uses the declared outgoing-subject-triples policy, preserving explicit IRIs, variable targets, wildcard expansion, dataset clauses and solution modifiers during normalization. Profiles retain the caller's query type/hash and completion policy.

Projection is independent: pages, tables, schema searches and neighborhoods expose bounded views of complete values and label truncation. Always await page/table calls across both storage tiers.

## Resource bounds and authority

Execution (requests, time, bytes and fan-out), residency (retained memory/storage) and projection (model-visible output) remain separate. Resident quotas use a heap-derived estimate and live headroom checks. These are admission aids, not proof that arbitrary data or every query operator fits memory. Joins, DISTINCT, merge deduplication and arbitrary JavaScript can require substantial working memory. The broker reports `KERNEL_OOM` and epoch loss if the process exhausts its heap.

Anonymous public HTTP/HTTPS resources and SPARQL services are dynamically selected. A private custom Fetch connects Comunica to the broker; the broker strips identity, denies unauthorized effects, enforces bounds and records per-exchange provenance. Authentication, mutation, bulk ingestion and exports remain separate authority classes. No ambient Fetch is exposed to model code.

## Orientation and startup

The broker initializes `linkedScience` / `ls` before the first evaluation in the authoritative project. Normal work opens a workspace directly. Explicit bootstrap validates roots and remains available for diagnosis; a generic REPL or the sibling probe cannot substitute for the project runtime.

A small source-orientation map is derived from retained source metadata. It records source identity/version, format or role and evidence references. Query results stay in the ephemeral inventory. `open({ contextKey, orientationContext: { id, version } })` optionally shares orientation across related questions while keeping registries separate. Map references do not establish residency or authority. See [orientation and reset](orientation-cache-and-reset.md).

Learned PEEK policy, recursive-provider experiments and durable Prime recovery remain [optional research](prime-linked-data-context-management.md). They are not an implementation dependency of the scientific REPL.
