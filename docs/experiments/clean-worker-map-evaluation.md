# Blind clean-worker map evaluation protocol

## Question

Can a fresh worker, given only this repository, its root `AGENTS.md`, and the project-local linked-data-repl skill, orient from compact state and complete a bounded local navigation task without relying on prior conversation or raw-result context?

## Status and boundary

**One constrained local evaluation passed on 2026-08-15.** A fresh task received this repository and the bounded local goal, then performed actual persistent-JS-REPL calls. It did not access a network, change files, install packages, or use an endpoint. This is evidence for the narrow coordinator/worker loop below, not a claim of general autonomous Linked Data navigation.

Prior open clean-worker trajectories remain **informative failed/inconclusive preflights**, not passing evaluations: one lacked an actual persistent-JS-REPL state receipt and another answered from repository source rather than execution.

## Hard preflight

The worker must call the persistent JS REPL and emit a receipt with tool/capability, `persistent-js-repl` execution mode, Communica module resolution, explicit session/map binding states, and actual operation IDs before source-level analysis can satisfy this agentic-REPL goal. If the tool is unavailable, it must stop with `missing-persistent-repl`; a terminal/CLI script and repository inspection are not fallbacks. CLI fixtures are deterministic only and cannot prove retention. Static source inspection is outside this evaluation unless the evaluator explicitly changes the task to request it.

## Evaluator prompt

Give the fresh worker this goal and no other task context:

> Using the persistent JS REPL, determine whether the local synthetic 120-item result is balanced across groups. Return an execution-backed bounded display model and compact map/session report. If the persistent REPL is unavailable, stop with `missing-persistent-repl`.

The evaluator prompt must not supply an expected query, result shape, frontier, candidate identifier, answer, retained handle name, or query history. The worker may read only the repository, `AGENTS.md`, and the linked-data-repl skill available to that task.

## Scenario contract

The worker must first pass the hard preflight, then use local synthetic state, create or recover a compact map/session state, and keep the 120-row result behind a handle. It must establish group balance through bounded operations (for example, a derived count handle) and emit a typed table display model with at most 10 rows. It must not print the 120-row source table. Every materialization/reuse/recovery statement must cite a prior actual REPL receipt operation for that handle.

## Observable pass/fail criteria

| Criterion | Pass evidence | Fail evidence |
| --- | --- | --- |
| Persistent-REPL preflight | Actual JS-call receipt names the persistent tool/capability, module resolution, explicit mode, session/map binding state, and operations before any execution conclusion. | Missing receipt; CLI/terminal mode; or source-level analysis used to satisfy the goal before preflight. |
| Execution-backed conclusion | Final balance conclusion cites bounded REPL operations and display evidence. | Repository/fixture/source-code conclusion, even if it avoids unsupported resident-state claims. |
| Map-first orientation | Trace first inspects or explicitly creates compact map/session state before result navigation. | It starts from assumed conversational state or a raw result. |
| Handle reuse | Later bounded profile/page/derive/display identifies the resident source or derived handle and cites the prior actual REPL operation; rematerialization is explicit if necessary. | It silently reruns or replaces a known handle, or makes an uncited stateful claim. |
| Bounded work | All pages/display models are at most 10 rows; no full 120-row dump appears. | Any raw/full table or unbounded display reaches the report/context. |
| Provenance and budget | Report states local-synthetic provenance plus applicable handle/result/query budget and observed count. | Missing/implicit provenance or budget. |
| Coherent derived result | A bounded derived group result accounts for the source count and supports the balance conclusion. | Conclusion is unsupported, inconsistent, or derived from unbounded output. |
| Reset honesty, if tested | Reset/invalidation is reported and any rematerialization is distinguished from reuse. | A missing/reset handle is claimed to remain resident. |
| External boundary | Trace shows no endpoint, provider, REST, package, config, or other unauthorized external access. | Any such access occurs. |

The evaluator withholds the expected balance from the worker and checks the final bounded evidence independently.

## Recorded constrained run — 2026-08-15

The first qualifying run used the fresh task **Clean REPL Execution Evaluation**. Its prompt required a persistent-JS-REPL execution-backed characterization of local RDF categories, prohibited network and repository changes, and did not provide a query, expected result shape, expected answer, handle name, or frontier.

### Observed trace

1. **Preflight:** actual persistent-REPL operations `preflight-op-001` and `preflight-op-002` resolved local Communica/N3 modules, queried a small in-memory preflight store, and confirmed the engine/store bindings remained present in a second REPL call.
2. **First bounded finding:** `rdf-op-001` materialized 120 local synthetic item bindings under `rdf-items`; `rdf-op-002` derived `category-counts`; `rdf-op-003` rendered a two-row typed table from that retained derived handle. The observed counts were `even: 60` and `odd: 60`.
3. **Coordinator-steered second turn:** the coordinator selected the worker's bounded membership-page option specifically because the source-query budget was exhausted. `rdf-op-004` re-oriented from the resident handles and compact map. `rdf-op-005` derived `even-members` from `rdf-items` and displayed five rows without a new source query or rematerialization.
4. **Reset honesty:** a deliberate REPL reset was followed by operations `rdf-op-006` through `rdf-op-008`, which recognized all former handles as missing and not recoverable. The worker made no source query and explicitly stated that it could no longer claim the earlier results as resident.

### Evaluation interpretation

The trace satisfies the protocol's persistent-REPL preflight, execution-backed conclusion, map/session orientation, cited handle reuse, bounded display, local provenance, exhausted source-query budget, and reset-honesty criteria. The coordinator's second action genuinely depended on the returned frontier and budget state.

It remains a constrained synthetic evaluation: the initial goal explicitly required the REPL, the worker was shown the project skill and `AGENTS.md`, and only one simple local category derivation was needed. The experiment does not establish open-ended frontier generation, semantic endpoint navigation, long-result export, or general decision quality.

## Recorded multi-turn context-recovery run — 2026-08-20

A fresh Local task started from local `main` at `65f4284f48dcafae8db0e43d77906b588bc46164` with one natural scientific goal: decide whether bounded local-synthetic records supported one unambiguous demo row or left multiple candidates. The task used only the project-registered `cleanroom_node_repl`, made no network request or repository change, and received the narrower derivation and reset challenges as separate turns.

### Observed trace

1. **Preflight and first result:** the worker observed the exact clean-room tool surface, checkout cwd, CodeAct mode, persistence across two calls, declared dependency resolutions, Linked Science bootstrap, bounded RLM discovery, and an initially empty broker PEEK map. It retained the 32-quad fixture as `h-000001`, retained two eligible bindings as `h-000002` through query operation `op-000002`, and rendered a two-row table through `op-000003`. Both records described sample `LSC-017`, compound Q, absorbance `0.42 AU`, and curated status; only the record identity and source batch differed, so the worker refused to select one.
2. **Genuine second-turn reuse:** the worker first re-profiled `h-000001` and `h-000002` in the unchanged workspace epoch. It derived comparison handle `h-000003` directly from `h-000002` through `op-000004` and rendered two bounded comparison rows through `op-000005`. It did not reload the graph, rerun the source query, or rematerialize either source handle. The comparison confirmed that the evidence supplied no ranking, quality, timestamp, or identity rule that resolved the two batches.
3. **Actual kernel reset:** `mcp__cleanroom_node_repl__js_reset` returned `{ "ok": true, "epoch": 2 }`. In the replacement kernel, all prior JavaScript bindings were undefined and RLM inspection returned `CONTEXT_NOT_FOUND`, while broker PEEK still contained compact references to `h-000001`, `h-000002`, and `h-000003`. After the exact documented bootstrap and reopening the same context, current orientation status classified all three old-epoch references as `stale`. The worker did not reload, query, derive, rematerialize, or reconstruct the former answer.

### Evaluation interpretation

The trace passed all seven criteria in the [context-recovery task brief](../tasks/context-recovery-sanity-check.md): real persistent-REPL preflight, map-first orientation, bounded local retention and display, genuine cross-turn handle reuse, explicit ambiguity, stale-state recognition after actual reset, and no external or mutation boundary violation. It strengthens the earlier constrained run with natural ambiguity and broker-versus-kernel recovery evidence. It still does not establish open-ended source navigation, live endpoint behavior, rematerialization, export, or general scientific decision quality.

## Coordinator audit

Audit the fresh-task trace in chronological order: persistent-REPL availability and actual state receipt before any source-level conclusion; initial repository/skill orientation; first map/session inspection; each named action and its stated budget; session-handle reuse or explicit rematerialization; final execution-backed model/report; and all tool/transport attempts. Match every stateful claim and the final conclusion to cited REPL operations; reject unsupported claims and any source-only conclusion. Record observed trace evidence separately from an evaluator's interpretation. A missing trace segment is a failed criterion, not evidence of compliance.

## Limits

This evaluates one local synthetic scenario, not conversational intelligence, long-term memory, endpoint behavior, federation, or export. Passing does not authorize a live request, generated artifact, configuration change, package installation, or commit.
