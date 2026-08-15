# Codex-goal-compatible evidence state

## Decision

The project is changing direction. The earlier worker guidance prescribed a narration-shaped sequence—preflight, orient, justify, act, update, report—and asked the worker to construct map/receipt fields itself. The recorded trials show that this can preserve safety while producing brittle, mechanical behavior and unsupported state claims.

Codex already owns the durable task/goal lifecycle and worker coordination. This project must not introduce a competing goal graph, scheduler, or completion state machine. It should attach compact Linked Data evidence/session state to the current Codex goal and let Codex decide when to continue, delegate, or close the goal.

The replacement hypothesis is:

> Given a Codex goal, a worker should use a project-local, tool-generated evidence/session layer to pursue it. Skills enforce invariants and expose useful affordances; they do not prescribe a universal reasoning sequence or replace Codex's goal loop.

This is a design decision and an experimental hypothesis, not an implemented runtime surface.

## Evidence that motivated the change

| Experiment | What it established | What it did not establish |
| --- | --- | --- |
| Local 120-item and local schema fixtures | Persistent REPL mechanics, bounded handles, and simple grounded `ASK` queries can work. | Open-ended navigation, tool-surface quality, or an advantage from a curated pack. The schema scenario was too easy. |
| Three-arm local schema run | All fresh workers used the persistent REPL and returned the same bounded boolean answer. | A causal comparison: the baseline inherited grounding guidance, and the task made the two-hop path obvious. |
| Fresh real UniProt trial | A worker stopped before a data query when its one approved schema fetch failed. | Real query construction or schema navigation. The worker also preselected terms, claimed an unbound session, prescribed a future `SELECT` without schema evidence, and bypassed the trajectory receipt surface. |

The last trial is not evidence that the answer does not exist in UniProt. It is evidence that the required schema source was unavailable in that execution environment.

## Mandatory invariants

Keep these as enforcement or tool-verified requirements:

1. **Evidence separation:** retain prior belief, retrieved source evidence, query-result evidence, and agent synthesis as distinct kinds.
2. **Verified state:** claims about session, handle, count, residency, or reset must cite a tool-generated operation/event—not a name invented in a report.
3. **Read boundary:** live actions remain in explicitly approved, bounded, read-only endpoint/documentation profiles.
4. **Large-context boundary:** bulk source documents and result tables stay behind REPL handles; reports expose only bounded views, metadata, and provenance.
5. **Epistemic scope:** an empty result means no binding for one exact query over one queried graph; a failed/unretrieved schema means schema state is unavailable, not that the requested fact is false or absent.
6. **Prerequisites:** a plan or frontier action may use only the evidence it actually has. Failed schema acquisition cannot yield a schema-derived operation choice.

## Goal loop

The worker may choose its own route through the current state:

```text
observe state → choose an uncertainty-reducing action → act
             → integrate evidence → continue, redirect, or stop
```

Examples of available actions include acquiring a source, searching/indexing a schema, inspecting a result handle, checking an assertion with `ASK`, retrieving a bounded table with `SELECT`, deriving a bounded relationship graph with `CONSTRUCT`, cautiously using endpoint-supported `DESCRIBE`, or asking the coordinator for a missing approval.

The skill should require an evidence-backed transition and an honest outcome—not a fixed narration order.

## Target evidence/session state

Tools, rather than the worker's prose, should own these states. Each checkpoint references the existing Codex task/goal; it does not duplicate its lifecycle.

| Entity | States |
| --- | --- |
| Claim | `prior-unverified`, `source-confirmed`, `result-supported`, `contradicted`, `unresolved` |
| Source acquisition | `not-attempted`, `retrieved`, `unavailable`, `failed` |
| Schema | `unknown`, `partial`, `indexed`, `stale` |
| Plan | `candidate`, `validated`, `invalid`, `superseded` |
| Execution | `not-run`, `running`, `succeeded`, `failed`, `guard-rejected` |
| Result | `unknown`, `nonempty`, `empty-for-exact-query`, `truncated` |
| Handle | `resident`, `invalidated`, `missing`, `artifact-backed` |
| Local stop/report | `evidence-insufficient`, `source-unavailable`, `budget-exhausted`, `approval-needed`, `tool-unavailable` |

The worker reports its local evidence state and stop reason back to Codex. Codex retains authority to decide whether the overall goal is satisfied, remains active, or is delegated.

## Proposed tool surface

Implement small stateful operations that return verified transitions:

- `inspectSession()`
- `acquireSource()`
- `indexSchema()`, `searchSchema()`, `neighbors()`, `findPaths()`
- `validatePlan()`
- typed `ask`, `select`, `construct`, and cautious `describe`
- `profile`, `page`, `aggregate`, `filter`, and `sample` for large result handles
- `checkpoint()` that serializes compact state only; receipts derive from actual events

Reviewed affordance packs remain optional accelerators. They can propose candidates but are not proof and do not become mandatory query templates.

## Next experiments

1. Build the smallest Codex-goal-compatible evidence/session layer with `inspectSession`, source/schema state, and verified handle events.
2. Compare the current checklist skill against minimal-invariants/state-graph guidance on the same open local goal.
3. Add perturbations: source retrieval failure, stale/contradicted prior, ambiguous schema, empty exact query, large result, and REPL reset.
4. Only after that, retry real UniProt schema-to-query navigation in an environment where the approved documentation profile is transport-verified.

Score actual tool events, evidence scope, adaptation, unnecessary calls, and honest outcomes—not compliance with a prose checklist.

## Limits

No Codex-goal-compatible evidence/session layer has been implemented. This document does not authorize live requests, exports, configuration changes, commits, or endpoint expansion.
