# Codex-goal-compatible evidence state

## Decision

The project is changing direction. The earlier worker guidance prescribed a narration-shaped sequence—preflight, orient, justify, act, update, report—and asked the worker to construct map/receipt fields itself. The recorded trials show that this can preserve safety while producing brittle, mechanical behavior and unsupported state claims.

Codex already owns the durable task/goal lifecycle and worker coordination. This project must not introduce a competing goal graph, scheduler, or completion state machine. It should attach compact Linked Data evidence/session state to the current Codex goal and let Codex decide when to continue, delegate, or close the goal.

The replacement hypothesis is:

> Given a Codex goal, a worker should use a project-local, tool-generated evidence/session layer to pursue it. Skills enforce invariants and expose useful affordances; they do not prescribe a universal reasoning sequence or replace Codex's goal loop.

The direction remains experimental. The runtime implements guarded reads, typed retained evidence/results, and a bounded symbolic orientation cache; broader claim and schema-index state remains proposed.

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
3. **Read boundary:** live actions require an explicitly approved traversal scope and remain public HTTP/HTTPS, read-only, behavior-bounded, and provenance-bearing through the mediator.
4. **Large-context boundary:** bulk source documents and result tables stay behind REPL handles; reports expose only bounded views, metadata, and provenance.
5. **Epistemic scope:** an empty result means no binding for one exact query over one queried graph; a failed/unretrieved schema means schema state is unavailable, not that the requested fact is false or absent.
6. **Evidence honesty:** a scientific action may use only the evidence the agent actually has. Failed schema acquisition cannot be reported as a schema-derived operation choice.
7. **Composable evidence:** resources use the same persistent handles and direct bounded operations while their semantics remain declarative and resident rather than becoming generic runtime branches.

## Goal loop

The worker may choose its own route through the current state:

```text
observe state → choose an uncertainty-reducing action → act
             → integrate evidence → continue, redirect, or stop
```

Examples of available actions include acquiring a source, searching/indexing a schema, inspecting a result handle, checking an assertion with `ASK`, retrieving a bounded table with `SELECT`, deriving a bounded relationship graph with `CONSTRUCT`, cautiously using endpoint-supported `DESCRIBE`, or asking the coordinator for a missing approval.

The skill should require an evidence-backed transition and an honest outcome—not a fixed narration order.

Following the compositional-harness principle described by Alex Zhang and Omar Khattab, the persistent operation and handle surface should make distinct Linked Science resources easier to compose without prescribing their scientific reasoning. The runtime must not encode a standard-location search sequence, endpoint-selection heuristic, ontology interpretation, or query-construction strategy. Those remain agent decisions informed by source-owned evidence. Typed results may be cited by a later query through the same resident-handle contract.

## Symbolic orientation cache

The first implemented slice follows the RLM/PEEK separation: bulk source and result state stays resident behind REPL handles, while a bounded prompt-visible map preserves reusable orientation. The map has five sections—context roadmap, context understanding, domain constants, parsing schema, and reusable results—and stable symbolic entries with evidence-handle links and priority eviction. It excludes raw source text, result rows, SPARQL, task answers, and goal lifecycle state.

Guarded acquisition content-sniffs approved sources instead of trusting a URL suffix or HTTP content type. Success creates an evidence handle and source/parsing entries. A request failure creates a typed attempt handle and failure entry. Preflight rejection creates neither. Thus a broken route can inform replanning without being mistaken for evidence of absence.

This design is informed by [Recursive Language Models](https://arxiv.org/abs/2512.24601) and [PEEK](https://arxiv.org/abs/2605.19932), but the project-local contract is intentionally smaller and enforcement-oriented.

## Target evidence/session state

Tools, rather than the worker's prose, should own these states. Each checkpoint references the existing Codex task/goal; it does not duplicate its lifecycle.

| Entity | States |
| --- | --- |
| Claim | `prior-unverified`, `source-confirmed`, `result-supported`, `contradicted`, `unresolved` |
| Source acquisition | `not-attempted`, `retrieved`, `unavailable`, `failed` |
| Schema | `unknown`, `partial`, `indexed`, `stale` |
| Execution | `not-run`, `running`, `succeeded`, `failed`, `guard-rejected` |
| Result | `unknown`, `nonempty`, `empty-for-exact-query`, `truncated` |
| Handle | `resident`, `invalidated`, `missing`, `artifact-backed` |
| Local stop/report | `evidence-insufficient`, `source-unavailable`, `budget-exhausted`, `approval-needed`, `tool-unavailable` |

The worker reports its local evidence state and stop reason back to Codex. Codex retains authority to decide whether the overall goal is satisfied, remains active, or is delegated.

## Tool surface

The implemented active surface stays small:

- `evidence.load()` retains bounded local declarative evidence;
- `traversal.query()` performs one direct mediated read and retains the result;
- `traversal.history()` exposes bounded attempt receipts for evaluation and recovery;
- `profile()`, `page()`, `table()`, `derive()`, schema search, and graph neighborhoods inspect or transform resident handles; and
- orientation operations preserve compact handle references without copying source or result payloads.

Historical guarded-acquisition helpers remain available only for reproducing their recorded experiments.

Reviewed affordance packs remain optional accelerators. They can propose candidates but are not proof and do not become mandatory query templates.

## Next experiments

1. Forward-test a fresh worker against the adaptive skill with a misleading content type and a failed preferred route.
2. Add schema indexing/search over an acquired evidence handle using Communica/N3 rather than a second query engine.
3. Add perturbations for stale/contradicted prior, ambiguity, empty exact query, large result, and REPL reset.
4. Retry real multi-source schema-to-query navigation only under an explicitly approved traversal budget.

Score actual tool events, evidence scope, adaptation, unnecessary calls, and honest outcomes—not compliance with a prose checklist.

## Limits

The implemented slice is project-local and tested with injected fetch responses. It does not itself authorize any live source, export, configuration change, commit, or endpoint expansion.
