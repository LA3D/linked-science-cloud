# Codex-owned scoped data bridge experiments

- Protocol: `scoped-data-bridge/v1`, designed 2026-09-09.
- Status: E1 executed; shared scientific-session implementation selected. E2–E5 remain unrun.
- Task: [scoped data bridge](../tasks/scoped-data-bridge.md).
- Records: [storage contract](../../artifacts/scoped-data-bridge/README.md), [receipt template](scoped-data-bridge/receipt.template.json), [result registry](RESULTS.md).

## Question and fixed constraints

Can Codex dispatch its own subagents to interpret selected resident data, deposit structured findings, and resume symbolic computation without passing the bulk inputs or findings through the parent model's context?

Codex owns model selection, dispatch, cancellation and worker lifecycle. The REPL owns native values, operations and evidence; the broker owns scoped transport and result storage. No embedded model, external model-provider API, MCP sampling dependency, new agent scheduler, or replacement of the existing scientific runtime is assumed. An MCP tool call returns at the delegation boundary; later calls resume computation. A pending computation is not an indefinitely blocked kernel evaluation.

The user subsequently authorized execution and then selected a core shared-session refactor after E1. The original protocol remains the experiment specification, not blanket authority for future runs. Use local synthetic data; no public scientific retrieval is needed for this suite.

## Starting evidence, not suite results

Source inspection found identity-bound handles in `resolve`, streaming graph access in `rdfSource`, and rejection of broker-stored results in `derivationInput` in `lib/linked-science-runtime.mjs`. The conversation's mounted-runtime capability inspection reported recursion unavailable. These observations motivate the tests; they are not contemporaneous run receipts for this suite and do not establish worker sharing or isolation.

References: [DSPy RLM](https://github.com/stanfordnlp/dspy/blob/main/dspy/predict/rlm.py), [DSPy dataframe example](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/api/modules/RLM.md#custom-sandbox-serializable-inputs), [Predict-RLM](https://github.com/Trampoline-AI/predict-rlm), [kglab query interface](https://github.com/DerwenAI/kglab/blob/main/kglab/query/mixin.py), and [Harvey's depth-one RLM study](https://www.harvey.ai/blog/post-training-rlm-agents-for-m-and-a-diligence). Freeze the inspected upstream revision or source hash before relying on it in a run. These references motivate the design; their reported performance is not evidence for Linked Science.

## Object contract to investigate

The exchange descriptor names the owner session and epoch, object kind and adapter version, permitted operations and selector, input version, grantee and expiry, plus a separate output slot and schema. A name or copied handle is not authority. Record descriptor metadata and a grant fingerprint, never a redeemable capability secret.

Native objects stay at their owner unless a run explicitly chooses snapshot materialization. A remote proxy is not the same JavaScript object and must not claim full synchronous DatasetCore compatibility. An RDF/JS streaming Source is the initial graph candidate; mutable DatasetCore copies, if needed, must be explicit child-local snapshots. Unknown object kinds fail with a typed unsupported-adapter error rather than implicit stringification.

| Kind | Candidate scoped operations | Preserved semantics |
| --- | --- | --- |
| RDF graph or ontology | Pattern match, count, scoped local query | RDF term types, language and datatype, blank-node scope, named graphs, graph set semantics |
| SELECT bindings | Complete async row/batch iteration, projection, derived output | Variable identity, unbound values, duplicates; ordering only when promised by the source query |
| JSON evidence | Typed read/path selection and structured output | Nested arrays/objects, null, boolean and numeric values, explicit version |

Separate transport chunks from model observations: a child may compute over a complete scoped stream while only selected content enters its model context. For scoped SPARQL, enforce the grant before query evaluation; reject any operation that escapes it, including ungranted federation. Reuse existing effect mediation; do not create ambient network or filesystem authority.

## Execution and reporting rules

Before each attempt, freeze a run plan with protocol version, exact source revision/dirty diff hash, fixture hashes, expected checks, arm, budgets and repetitions. Never expose evaluator answers to the child. The coordinator model receives dispatch metadata, not fixtures or expected semantic labels. Keep answer keys outside worker-accessible paths; lack of enforceable isolation makes semantic scoring exploratory, not blinded.

Default per-attempt ceilings: two workers, ten minutes wall time, 2 MiB scoped input transport, 256 KiB retained output per worker, 8 KiB child observation per read and 8 KiB aggregate parent observation. These are proposed ceilings to freeze or explicitly revise before a run, not claims that all controls are already enforceable. Record unavailable accounting/enforcement. No hidden retry: every attempt, timeout and retry has its own identifier. No benchmark-quality or latency claim follows from these small diagnostics.

Capture tool-generated observations while state is live and before any reset/worker closure. Save action code, compact operation outputs, checks and failure evidence; do not retain hidden reasoning or whole conversation dumps. Count parent-visible input/output separately from child-visible input/output and transport bytes. Measure token usage only where actually reported; otherwise use null plus a missing-evidence entry. Source inspection and a worker's prose assertion cannot substitute for boundary receipts.

## E1 — Worker connection and identity

**Hypothesis:** worker access can be classified as same kernel, distinct kernel with shared broker, isolated runtime, or unavailable; shared mounting alone is insufficient evidence.

**Procedure:** in a disposable, explicitly identified context create a fresh random marker and a tiny native graph. Dispatch a fresh Codex subagent without forked history, supplying only the variable/workspace locator and probe instructions, never the marker value. Collect project identity, broker/session identity when exposed, epoch, marker presence and its digest, and a graph-operation receipt from each side. Recheck the parent after worker completion. Repeat with three fresh workers, sequentially, preserving each attempt. Do not reset a shared kernel or inspect unrelated workspace inventory.

**Checks:** distinguish a copied descriptor from the resident branded handle; test a reconstructed descriptor as a negative control. Record whether the worker can execute arbitrary code in the parent namespace: shared access is connectivity evidence, not scoped isolation. If identity cannot be discriminated, classify inconclusive rather than inferring sharing from the same cwd.

**Decision:** choose the smallest feasible data route. Shared unrestricted kernel access requires an actual restriction boundary for later scope claims. Isolated kernels require an owner-mediated exchange. If tools are absent, save an unavailable result and stop dependent live tests. E1 needs no bridge implementation.

## E2 — Typed object transport and computation

**Prerequisite:** E1 topology recorded and a separately implemented minimal bridge candidate available. No production rollout is implied.

**Hypothesis:** scoped child operations preserve native data semantics across resident and broker-stored representations without parent payload relay.

**Fixtures:** a 24-quad synthetic ontology containing a subclass chain, blank-node restriction, language-tagged labels, typed literals, and two named graphs; eight SELECT rows with duplicate solutions and unbound cells; a nested JSON evidence object. Freeze exact fixtures and expected checks before execution. Force the same small logical graph/result through both storage tiers using test-only thresholds, not global configuration. Also run 257 binding rows in batches of at most 32 to expose boundary errors.

**Arms:** owner-local native operations as oracle; scoped worker operations; copied-handle-only negative control. No model interpretation is needed for equality checks. Repeat each representation once in a fresh context and repeat any failure as a separately recorded diagnostic attempt.

**Checks:** match/count/query agree with the oracle; named-graph separation and blank-node identity within the declared snapshot survive; bindings preserve multiplicity and unboundness across batch boundaries; JSON types survive; complete-or-fail behavior is explicit. Use canonical graph comparison or structural isomorphism rather than comparing incidental blank-node labels. Unsupported kinds/versions fail explicitly. Parent observation contains only metadata/digests.

**Decision:** accept adapters separately. Graph success does not establish bindings, JSON or arbitrary-object support. A materialized copy must be labeled snapshot, not shared native identity.

## E3 — Scope, lifetime and concurrent return

**Prerequisite:** at least one E2 adapter passes. Use an isolated test kernel for whole-kernel reset tests.

**Hypothesis:** grants limit data and operations, and invalidation prevents stale results from being accepted.

**Procedure:** grant worker A one graph/selector and output slot; grant worker B a disjoint selection and slot. Test authorized reads, another object's identifier, widened selectors, ungranted query sources, mutation attempts, wrong output slot, malformed output, duplicate deposit, release, expiry, workspace disposal and kernel reset. Pause one operation in a deterministic fixture to release its source in flight; deliver an old answer after epoch change. Test a mutable child snapshot separately: edits must not mutate the owner. All negatives use synthetic objects only.

**Checks:** each denied action has a recorded structured outcome and no unauthorized payload; stale/late deposits are rejected; duplicate delivery cannot double-count; unrelated workspace state survives workspace disposal. Explicitly state that previously disclosed bytes cannot be revoked. Fix the policy for in-flight read cancellation at a batch boundary; already delivered data remains delivered.

**Decision:** any unintended access fails the scope gate even when the scientific answer is correct. Do not label an unrestricted shared REPL as a scoped bridge. Record whether the boundary is enforced by the host or merely requested in instructions.

## E4 — Variable → Codex worker → variable

**Prerequisite:** the relevant E2 and E3 gates pass.

**Hypothesis:** Codex-owned semantic processing can return structured findings into retained state while the parent coordinates by references.

**Fixture:** twelve synthetic ontology annotations spanning direct assertions, tentative interpretations and explicit uncertainty. Include a small subclass graph needed to interpret two annotations. Freeze a rubric and answer key separately; score claims against supplied annotations, not general domain knowledge.

**Arms:** (A) root-only processing with explicit bounded payload relay, labeled baseline; (B) Codex subagents read granted inputs and deposit findings directly; (C) deterministic structural-only operations, explicitly not expected to resolve all semantic questions. Use the same model settings where configurable and record differences. Run three fresh attempts per arm; randomize arm order with a recorded seed. Stop at frozen budgets.

**Procedure for B:** parent retains data and work descriptors, returns from its MCP call, dispatches at most two fresh workers, then resumes in a later call after deposits. Worker answers contain claim, evidence references and uncertainty in a fixed schema. Parent-side code joins findings to input identifiers and produces aggregate counts. The parent prints only the final bounded aggregate, not every worker finding.

**Checks:** every assigned item has a success or explicit failure; schema and references validate; aggregate equals deposited findings; no answer is inferred from mere worker completion; parent payload accounting confirms no full input/output relay. Correctness, coverage, parent observation bytes, child usage, failures and elapsed time are separate measures. If transcript visibility cannot be audited, mark the no-relay claim unestablished. Report all repetitions, not the best run.

**Decision:** one verified B round trip establishes feasibility only. Compare all attempts descriptively; do not infer model-quality gains from three small runs. Poor semantic quality with a correct data path is distinct from a broken bridge.

## E5 — Bounded scale and recovery

**Prerequisite:** E4 demonstrates a round trip. No increased worker count or unbounded stress run.

**Hypothesis:** increasing the retained workload does not force proportional payload disclosure to the parent, and interrupted work can finish without duplicate or stale findings.

**Procedure:** use 32, 256 and 2,048 synthetic items, fixed batch size 32 and concurrency two, across graph and bindings adapters. Use deterministic worker outputs for transport scaling; label them plumbing tests, not model runs. Add one bounded real-worker case only within the frozen run scope. Interrupt one worker, time out one read, replay one completion, and reset only an isolated test context. Run each size once; repeat failed cases explicitly.

**Checks:** exact item coverage, duplicate count zero, peak retained/storage usage when measurable, explicit budget exhaustion, and compact parent output under its fixed ceiling. Record counts of dispatch/completion messages: metadata itself may grow with work and must not be claimed constant. Restart means fresh epoch and deliberate reacquisition; receipts do not resurrect native objects.

**Decision:** identify the largest verified size and remaining limits. Do not extend to bulk scientific ingestion or permanent shared services from this result.

## Decision and next action

### E1 observations and revised implementation direction

Four attempts are registered: [initial fixture failure](../../artifacts/scoped-data-bridge/20260909-e1-worker-01/receipt.json), [worker 1](../../artifacts/scoped-data-bridge/bridge-20260909-e1-worker-01-retry/receipt.json), [worker 2](../../artifacts/scoped-data-bridge/bridge-20260909-e1-worker-02/receipt.json), and [worker 3](../../artifacts/scoped-data-bridge/bridge-20260909-e1-worker-03/receipt.json). All three fresh workers reached the project runtime but did not observe the parent's variable; each parent recheck retained its marker and graph. This establishes separate or inaccessible namespaces, not independent broker process identity. Accounting gaps are recorded and durability is partial. No shared live-object access was demonstrated.

The user paused experiments and explicitly chose shared scientific-session ownership instead of snapshot transfer. Core implementation now separates MCP connection lifetime from scientific session lifetime. The unexecuted snapshot prototype was removed. E2–E5 need a frozen shared-session arm before resumption; do not claim the forthcoming implementation tests are those experimental runs.

E1 selects topology; E2 establishes per-type semantics; E3 establishes scope; E4 establishes the model round trip; E5 characterizes bounded operation. Stop dependent experiments when a prerequisite fails. Save failed and inconclusive attempts just as durably as successful ones.

Next action after run authorization: freeze E1's synthetic fixture and probe code, allocate its run directory, and execute the fresh-worker identity test. No E2–E5 result is implied by E1. Design changes receive a new protocol version; later interpretation adds a linked record rather than overwriting old observations.
