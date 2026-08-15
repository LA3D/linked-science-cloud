# Prior grounding and tool-surface evaluation

## Question

Can a fresh worker use useful pretrained knowledge as **candidate hypotheses**, ground or correct those hypotheses against a versioned schema/example source, and choose a bounded SPARQL operation without confusing failures of the REPL surface with failures of methodology?

## Status and boundary

**Superseded as the primary design direction.** This dossier remains the record of the checklist-shaped evaluation and its local runs. The project now prefers a goal loop with minimal invariants and a tool-generated state graph; see [the successor dossier](goal-loop-state-graph.md). It does not claim a new REPL capability.

The worker is allowed to have priors. A prior is not evidence, authorization, or an executable query term. It must be reconciled against source evidence before it can support a plan.

```text
pretrained candidate → unverified
                     ↓ source/example evidence
confirmed | corrected | rejected | unresolved
                     ↓
only confirmed/corrected claims may enter a bounded plan
```

## Comparable evaluation arms

Give each fresh worker the same repository, persistent-REPL requirement, read-only boundary, source snapshot, scenario goal, tool surface, and output/receipt budget. Do not change safety constraints between arms.

| Arm | Additional guidance | Purpose |
| --- | --- | --- |
| `baseline` | Existing safety and REPL guidance only. | Observe ordinary use of priors and tools. |
| `grounding-method` | Explicit candidate → evidence → reconciliation workflow. | Measure whether the method improves grounding and repair. |
| `grounding-method-plus-pack` | The method plus a reviewed, versioned resource pack. | Measure the extra value of source-specific affordances. |

Use a new worker task for each run. The evaluator retains the expected outcome and any answer key outside the worker's prompt.

## Scenario suite

Begin with local, pinned schema/example fixtures and a small local instance graph. Keep documentation transport in a separate trial: a failed fetch is an environment result, not a reasoning score.

1. **Familiar prior:** a likely term/path is present; assess quick, evidence-cited confirmation.
2. **Correction:** a plausible prior is ambiguous, renamed, or deprecated; assess correction before planning.
3. **No path:** the requested relation is not documented; assess rejection or honest uncertainty rather than query guessing.
4. **Operation choice:** choose and justify `ASK` for a bounded existence/shape check, `SELECT` for a bounded table, `CONSTRUCT` for a relationship subgraph handle, or `DESCRIBE` only where its endpoint-specific limits are acknowledged.

The operation-choice scenario may end with a non-executing plan. Execution is a separately scoped action under the relevant endpoint profile.

### First runnable local scenario

All arms use `test/fixtures/prior-grounding/schema.ttl` and `instances.ttl`, with no network access. The worker receives this goal only:

> Using the persistent JS REPL and the local fixture, determine whether `ex:P123` has a catalytic activity. First ground any candidate path against the schema, choose one minimally suitable bounded read operation, and return a compact receipt plus bounded result. Do not change files or contact a network.

The evaluator withholds the expected query and outcome. The `grounding-method-plus-pack` arm alone receives `curated-pack.json`; it is a reviewed convenience surface, not data evidence. The `baseline` arm must not be evaluated as a strict no-method control while the project skill embeds the grounding loop. Treat its first run as an **instrumented reference arm** and record this guidance leakage as a limit. A future strict control needs a separately versioned minimal skill snapshot.

## Receipt contract

Use `lib/trajectory-evaluation.mjs` to validate a compact receipt. It records:

- evaluation arm, scenario, and goal;
- prior claims with confidence;
- source evidence with stable locators;
- per-claim reconciliation status and cited evidence;
- selected operation, boundedness, and only its confirmed/corrected claim IDs;
- actual REPL/tool events, compact map changes, and result or honest stop;
- one or more diagnoses.

Do not retain raw schema documents, full result tables, or raw query text in the compact receipt. They remain in the appropriate REPL handle or controlled artifact.

The receipt must also state one terminal outcome: `completed`, `planned-not-executed`, or `honest-stop`. A completed outcome requires an executed bounded operation. This avoids treating a convenient answer-like field as evidence that the requested trajectory actually reached a terminal state.

## Scoring and diagnosis

Score trajectories, not just final answers: hypothesis utility and calibration, grounding precision, correction/rejection responsiveness, uncertainty discipline, operation fit, source reads, speculative queries, repair loops, and bounded handle/map use.

Every material struggle receives one diagnosis:

| Kind | Meaning |
| --- | --- |
| `methodology` | The worker skipped grounding, used unsupported terms, or failed to reconcile a contradiction. |
| `tool-surface` | Available evidence supports the intended step, but the REPL/API cannot clearly inspect or express it. Record the desired operation, exposed tool, and obstacle. |
| `environment` | Missing REPL, dependency, network, sandbox, or transport behavior prevented the run. |
| `source` | The approved documentation is absent, ambiguous, or insufficient for the requested claim. |
| `mixed` | More than one cause materially contributed; name each. |

Do not use `tool-surface` as a catch-all. The receipt must say which small affordance would have made the intended action legible—for example, a bounded graph-handle materializer for `CONSTRUCT`.

## Acceptance evidence

Before treating this direction as validated, collect at least one fresh-worker trace per arm for the same local scenario, then compare their validated receipts and chronological tool traces. A live documentation run is reported separately as transport evidence; it does not replace the local reasoning comparison.

## Recorded first local run — 2026-08-15

All three fresh workers completed the first runnable local scenario using actual persistent-JS-REPL calls, local Communica/N3 resolution, the two named fixtures, and one bounded `ASK`. Each concluded `true` for `ex:P123` and made no network, file, package, configuration, commit, or artifact change.

| Arm | Observed trajectory | Interpretation |
| --- | --- | --- |
| `baseline` | Preflight, schema/instance grounding, one `ASK`, and an explicit `completed` receipt. | A useful instrumented reference, but not a strict control: the current project skill already teaches grounding. |
| `grounding-method` | Kept prior/evidence/reconciliation/plan distinct, validated its receipt, and verified retained state in a second REPL call. | The intended contract was followed for this simple scenario. |
| `grounding-method-plus-pack` | Verified the pack path against the schema before a single `ASK`; initially assumed a store count, then inspected and corrected it. | The pack did not visibly reduce work in this trivial case. The corrected count assumption is a methodology/state-verification finding, not a tool-surface failure. |

The original first pass is excluded from comparison because the receipt validator did not require an explicit terminal outcome. The validator was corrected and all retry receipts supplied `outcome.status: completed` before this summary was recorded.

### What this establishes

The scenario validates the basic hypothesis lifecycle and bounded `ASK` operation in a fresh worker. It **does not** establish an effect size between arms, because the task is easy and the baseline saw the project skill's grounding guidance. It also does not test `SELECT`, `CONSTRUCT`, `DESCRIBE`, real schema retrieval, endpoint transport, or a missing-path/contradiction case.

The next valid comparison should use a separately versioned minimal-skill snapshot for the strict baseline and add a correction/no-path scenario before judging whether the curated pack shortens trajectories.

## Limits

This is an evaluation scaffold, not a claim that pretraining is correct or that source grounding removes all error. It does not authorize schema retrieval, endpoint access, federation, exports, commits, or configuration changes.
