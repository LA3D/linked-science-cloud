# Optional RLM and PEEK research

- **Status:** Optional, evidence-gated research
- **Date:** 2026-09-04
- **Current product:** [Persistent scientific REPL](rlm-linked-science-runtime.md)
- **Authorization:** No provider activation, learned-policy run, durable service or live evaluation follows from this note.

The scientific REPL is useful independently of these experiments. Its native RDF/JS/Comunica operations already perform structural decomposition, filtering and aggregation. Each additional mechanism needs a concrete information-management problem and measured benefit.

## Model recursion

The [RLM paper](https://arxiv.org/html/2512.24601v2) reports useful external-context REPL behavior without subcalls, and additional benefits from recursion on information-dense semantic tasks. Its reported depth-one synchronous calls do not require durable asynchronous child sessions.

A separately authorized experiment should compare the existing root REPL with a bounded depth-one call on semantic tasks such as annotation interpretation or ambiguous-label reconciliation. Match observation budgets, record correctness, cost and latency, and retain SPARQL-only controls where meaningful. Keep credentials, admission and accounting host-owned. A child requiring symbolic graph access receives explicitly scoped access, never a bulk prompt dump or ambient transport.

No improvement leaves the current REPL as the production path. A benefit justifies that bounded mechanism; durability needs a further user need and experiment.

## Orientation policy

The [PEEK paper](https://arxiv.org/html/2605.19932v1) studies reusable orientation across questions about recurring external context. The current baseline is a small derived source map, separated from ephemeral handle inventory and optionally shared by context identity/version.

First compare no map, manual/static orientation and the current derived map on recurring but different questions. A later Distiller/Cartographer/Evictor experiment should measure whether later tasks require less rediscovery, remove stale or incorrect entries, and improve correctness under a fixed context budget. Use bounded public observations and receipts; do not ingest hidden reasoning, raw documents or evaluator-private answers into map maintenance.

The Distiller extracts reusable context, the Cartographer proposes local edits, and the Evictor enforces the map budget. These are separate testable policy functions, not an additional evidence store or workflow engine. Their implementation and provider work require separate authorization.

## Durability and continual refinement

Durable roots/children, append-only event histories, artifact recovery and reviewed harness refinement belong to a broader optional research program. They are not an irreducible scientific-REPL foundation. Any future recovery work must distinguish native handles from durable payloads, establish fresh identity on materialization and avoid silently replaying uncertain external effects.

The [earlier detailed plan](prime-research-plan-2026-09-04.md) and [Phase 0 decision](prime-durable-core-phase-0.md) remain historical design records. Neither commits the project to implementing that program. The [current plan](../../PLAN.md) controls active scope.
