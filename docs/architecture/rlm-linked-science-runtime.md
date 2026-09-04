# RLM/Prime Linked Science runtime

- **Status:** Normative architecture
- **Date:** 2026-09-04
- **Supersedes:** CodeAct as the architectural center of the Linked Science runtime
- **Related plan:** [Prime-inspired durable RLM, context, and continual-harness research plan](../../PLAN.md)

## Decision

Linked Science is an RDF-specialized Recursive Language Model (RLM) environment exposed through MCP. The persistent JavaScript kernel is the model's control environment, following the RLM pattern of keeping large context external and examining it programmatically. The clean-room broker is the trusted host membrane, following Prime Agent's separation between model-facing computation and host-owned provider calls, child lifecycle, authority, accounting, and recovery.

The browser-shaped JavaScript facade remains a useful ergonomic pattern. It is not the architecture. CodeAct describes one execution technique inside the persistent control environment; it does not define context ownership, recursive execution, or the semantic state model.

```text
Codex task / model
        |
        | exactly three MCP tools
        v
trusted clean-room host
  - authority and transport mediation
  - RLM provider/child lifecycle when configured
  - budgets, receipts, epochs, and recovery
        |
        v
persistent JavaScript control environment
  - external context as resident objects and handles
  - model-written search, decomposition, and subqueries
  - bounded recursive calls when the host advertises them
        |
        v
Linked Science semantic adapter
  - RDF/JS datasets and graph handles
  - Communica and SPARQL subgraph queries
  - ontology/schema evidence and provenance
  - bounded model-visible projections
```

## RLM interpretation of RDF

An RDF graph is symbolic external context, not prompt text. Its quad count is therefore not a model-context limit. A large graph remains behind a resident graph handle or an endpoint/source descriptor while the agent uses SPARQL, RDF/JS matching, schema search, and neighborhood operations to select the relevant subgraph.

Large does not mean physically free. Network bytes, parsing time, resident memory or durable storage, query execution, and fan-out remain operational resources. Those controls must not be confused with prompt-visible row, cell, edge, node, or byte limits.

For a broker-acquired RDF representation:

1. transport enforces actual response-byte, request, time, and concurrency limits;
2. parsing retains a native symbolic dataset under a handle;
3. repeated local queries reuse that dataset without source reacquisition; and
4. only profiles, pages, neighborhoods, aggregates, or query-selected subgraphs enter model-visible output.

An HTTP `HEAD` response or `Content-Length` may inform acquisition when available, but neither is required or authoritative. Compressed transfer, dynamic representations, and servers that omit or misstate length make actual streamed/request accounting the enforcement source.

## Three budget planes

| Plane | Governs | Examples | Must not be used as |
| --- | --- | --- | --- |
| Execution | External and compute effects | requests, response bytes, time, fan-out, concurrency, query work | a prompt-size proxy |
| Residency | State held behind handles | resource bytes, graph datasets, result stores, durable artifacts | a page or display limit |
| Projection | Values exposed to the model | rows, cells, nodes, edges, preview bytes, recursive output | a graph-admission limit |

Defaults and capabilities must report these planes separately. A caller may request tighter limits. Local and broker hard ceilings remain implementation-safety controls and must be named as such, with structured recovery that suggests a narrower symbolic query, a durable/bulk route, or a tighter projection as appropriate.

## Query semantics and complete symbolic results

SPARQL syntax controls the result. In particular, `LIMIT`, `OFFSET`, ordering, grouping, and dataset clauses are query semantics; the harness must not require, inject, remove, or relocate them to control memory or presentation. Local and mediated operations accept valid `SELECT`, `ASK`, `CONSTRUCT`, and `DESCRIBE` forms without a harness-imposed query limit.

Query materialization is atomic at the handle boundary. The runtime consumes the native result stream into symbolic state and publishes a result handle only after normal completion. Small graph results remain native N3 stores in the restricted kernel. When a `CONSTRUCT` or normalized `DESCRIBE` exceeds the in-kernel threshold, the broker atomically spools serialized RDF/JS quads into a private SQLite store and returns only an opaque epoch-owned descriptor after commit. The path and storage capability never enter agent-visible JavaScript. A successful handle therefore represents the complete result under the submitted query and the declared graph-description policy. If execution, transport, memory, storage, time, or a residency quota is exhausted, the call fails, cancels the stream, deletes any provisional spool, and publishes no successful partial handle. A smaller query can be a recovery choice made by the caller, but the runtime must not mislabel that narrower answer as the original result.

Projection is different. A page, table, neighborhood, or preview may be truncated under its explicit model-visible bounds because it is an observation of an already complete symbolic value. Page and table calls are awaitable for both storage tiers. Broker-stored quad results remain streaming RDF sources for later local SPARQL; whole-result dataset cloning and JavaScript derivation are rejected because those operations would defeat out-of-core residency. Projection metadata must identify truncation without weakening the completion claim of the source handle.

SPARQL leaves the exact `DESCRIBE` graph algorithm implementation-defined. This runtime declares one stable policy: return outgoing triples whose subject is each explicitly named IRI and each RDF resource selected by the query's described variables. `DESCRIBE *` expands to all in-scope query variables. Internal normalization to an equivalent `CONSTRUCT` may compensate for query-engine limitations, but it must preserve explicit resources, variable selection, wildcard expansion, dataset clauses, and solution modifiers, execute as one caller-visible attempt, and retain the original query type and hash as provenance.

## Agent behavior

The agent chooses the smallest information-bearing operation for the current uncertainty:

- query a remote RDF source directly when only a subgraph is needed once;
- acquire and parse once when several local queries or RDF/JS transformations will reuse the same representation;
- consult an ontology, schema, service description, or examples when vocabulary or access semantics are uncertain;
- use `ASK`, `SELECT`, `CONSTRUCT`, `DESCRIBE`, dataset matching, schema search, or neighborhoods according to the desired information shape; and
- inspect metadata and bounded projections before asking for more context.

This is an adaptive RLM loop, not a mandatory ceremony. Source documentation and ontologies are evidence, not query templates. Empty results remain scoped to the exact query and graph.

## Recursive execution

The runtime must advertise recursive execution as structured capability data rather than a binary "CodeAct mode" label. The control environment is always an RLM-style external-context REPL. When a provider is configured, the trusted host owns credentials, child admission, depth, timeout, output bounds, accounting, and lifecycle. When no provider is configured, local programmatic decomposition and symbolic RDF queries remain available, while recursion is reported as unavailable with an explicit recovery path.

The current one-shot provider seam is compatibility behavior, not the durable Prime-style child contract. A stable asynchronous child handle, independent context, durable terminal result, and restart recovery belong to the separately staged durable RLM implementation; they must not be simulated with an in-kernel promise or an MCP Sampling dependency.

## MCP boundary

MCP carries the persistent control environment; it is not the reasoning architecture. The public surface remains exactly `js`, `js_reset`, and `js_add_node_module_dir`. Model/provider recursion is a host integration behind `nodeRepl.rlm`, not an extra Linked Science MCP tool. Public scientific reads continue through the private mediated traversal authority, with no ambient Fetch or credentials in child code.

## Acceptance criteria for the symbolic-graph slice

A synthetic or controlled broker fixture larger than the former 10,000-quad threshold must demonstrate all of the following:

1. the RDF representation is acquired once and retained as a graph handle;
2. profile metadata reports the full resident graph count without exposing its quads;
3. at least two different Communica subgraph queries reuse the same handle with no refetch;
4. query and graph observations remain bounded independently of graph size;
5. graph-name, format, and projection-limit failures provide structured local repair; and
6. capabilities and agent guidance distinguish execution, residency, and projection budgets.

The query-completeness follow-up additionally requires all four SPARQL read forms through the project MCP, solution-modified `DESCRIBE`, explicit completion metadata, an out-of-core graph result that can be queried again symbolically, and an over-ceiling failure that publishes no partial result handle.

The current spool is kernel-epoch state, not a durable artifact: kernel reset removes it and invalidates its handle. Its byte quotas are physical storage controls, not semantic truncation. A quota failure is explicit and complete-or-fail; no finite implementation claims infinite storage.

This slice does not claim unbounded memory, durable graph persistence across kernel reset, or completion of the Prime durable child runtime.
