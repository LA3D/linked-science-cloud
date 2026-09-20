# Persistent session and handles

`lib/linked-science-runtime.mjs` owns the production workspace registry. `lib/repl-linked-data-session.mjs` remains an offline compatibility API. A persistent JavaScript kernel owns native values and a Comunica engine per workspace; the broker owns mediated transport and private storage for complete large results.

A **handle** refers to retained epoch-scoped data. A **receipt** records an operation. An **orientation entry** is advisory source context. A **display** is a bounded projection. A **durable artifact** requires a separately authorized write. These identities are not interchangeable.

## Normal use

The project MCP prepares `linkedScience` before evaluating code:

```js
var ws = linkedScience.open({ contextKey: 'measurement-question' });
var inventory = ws.inventory();
// Retain resources or local graphs, run queries, inspect bounded results.
await ws.release(unneededHandle);
await ws.dispose();
```

`release` accepts a handle or ResourceResponse, invalidates new access immediately, returns graph capacity and removes associated stored results. Other result handles keep their provenance and remain usable. Caller-owned JavaScript copies remain caller-owned.

`dispose` invalidates a workspace and reclaims its storage, including allocations that were already pending. Repeated successful disposal is harmless. Await completion before relying on reclaimed storage. `await linkedScience.reset({ contextKey })` uses the same cleanup and advances the epoch. `open` then creates a fresh workspace without changing unrelated workspaces. Failed cleanup is explicit; retaining the old workspace permits a retry of `dispose()`.

Late queries/derivations cannot publish results into the disposed workspace. Already-running native work may unwind after invalidation; this is not a separate scheduler or execution framework.

## Native composition

`ws.rdf.source(handle)` supplies an RDF/JS streaming Source, including indexed matching/counts for stored graph results. It does not copy the whole graph or expose mutable evidence. `ws.rdf.clone(handle)` explicitly creates a mutable N3 dataset for resident graphs. `rdf.dataset` remains a compatibility alias for cloning. `rdf.retain` copies caller-owned data into retained evidence.

Source graphs preserve ordered duplicate-aware evidence; RDF query stores use set semantics. Solution sequences preserve bag semantics. Queries never acquire a successful handle for an operationally truncated result; bounded pages remain independent projections. Full scientific data stays outside the prompt.

Kernel reset removes bindings, workspaces and epoch-owned storage. The broker's source-orientation map may survive but cannot restore data or authorize reacquisition. See [orientation/reset](orientation-cache-and-reset.md) and [runtime discovery](../agent/runtime-discovery.md).
