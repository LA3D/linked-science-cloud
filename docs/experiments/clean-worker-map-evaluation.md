# Blind clean-worker map evaluation protocol

## Question

Can a fresh worker, given only this repository, its root `AGENTS.md`, and the project-local linked-data-repl skill, orient from compact state and complete a bounded local navigation task without relying on prior conversation or raw-result context?

## Status and boundary

**Future evaluation only.** This protocol creates no worker, dataset, receipt, or network activity in the current documentation update. The evaluation worker uses a fresh Codex task and local synthetic RDF only; it receives no endpoint approval. Prior open clean-worker trajectories are **informative failed/inconclusive preflights**, not passing evaluations: one lacked an actual persistent-JS-REPL state receipt and the newest trace answered from repository source rather than execution.

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

## Coordinator audit

Audit the fresh-task trace in chronological order: persistent-REPL availability and actual state receipt before any source-level conclusion; initial repository/skill orientation; first map/session inspection; each named action and its stated budget; session-handle reuse or explicit rematerialization; final execution-backed model/report; and all tool/transport attempts. Match every stateful claim and the final conclusion to cited REPL operations; reject unsupported claims and any source-only conclusion. Record observed trace evidence separately from an evaluator's interpretation. A missing trace segment is a failed criterion, not evidence of compliance.

## Limits

This evaluates one local synthetic scenario, not conversational intelligence, long-term memory, endpoint behavior, federation, or export. Passing does not authorize a live request, generated artifact, configuration change, package installation, or commit.
