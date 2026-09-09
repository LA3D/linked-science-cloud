# Scoped data bridge and scientific sessions

- Status: shared-session core implemented and verified; live desktop activation passed.
- User constraint: Codex drives model work; no independent model provider in the REPL.
- Methodology: [five gated experiments](../experiments/scoped-data-bridge.md).
- Evidence: [run contract and E1 attempts](../../artifacts/scoped-data-bridge/README.md).
- Implementation: [scientific session architecture and activation](../architecture/scientific-session.md).

## Decisions and completed work

E1 recorded one failed preparation and three independent worker probes. Workers did not see parent globals; that establishes unavailable shared namespace, not definitive broker process identity. Receipts are registered with missing accounting explicitly recorded. E2–E5 have not run.

The user selected a shared live session service instead of snapshot transfer and authorized the core refactor. The service owns a kernel independently of MCP clients. Owners publish native graph/result handles; workers run separate scratch kernels and access selected objects through expiring grants. Fixed operations preserve RDF terms and SELECT bindings, and structured results return through a scoped slot. Codex owns dispatch and explicit continuation. Full recursive model behavior is not claimed.

Native bindings now have a complete iterator for resident and broker-stored results. Integration tests exercise independent MCP adapters, graph/query access, deposit and parent aggregation, reconnect persistence and scope/reset rejection. Idle expiry, timeout, shutdown and crashes can still lose state; no disk recovery is promised.

## Restart procedure (completed below)

Implementation is ready for a desktop restart. After restart, discover the mounted project runtime, launch the independent service if needed, and record a fresh live worker round trip separately from deterministic tests. Existing pre-refactor globals are not migrated automatically. Do not silently resume E2–E5 or treat shell checks as live activation evidence.

## Handoff

Implementation began in the authoritative checkout on `codex/scoped-bridge-runs` at `e355c43b1b1cf90f7fec2b06e1744cae71af8516`. Existing `.codex/config.toml` edits and untracked `artifacts/structure-viewer/` are unrelated and excluded. The registered entrypoint remains unchanged; its new direct-launch adapter requires a fresh desktop MCP connection. Verification and integration outcomes will be recorded here before restart.

## Verification and remaining limits

- `npm test`: 206 passed, zero failed/skipped, including real stdio transport, service lifecycle, five integration/launcher tests and native iterator tests.
- `npm run smoke` and `npm run linked-science:verify`: passed with offline synthetic fixtures.
- `npm run evaluation:results:validate`: passed, 36 registered runs with explicit durability classifications.
- Markdown links and `git diff --check`: passed.
- E1 receipts saved in `d7cd03c`; implementation saved in `00ce9a5`. Both were verified reachable from local `main` after fast-forward integration. This handoff update follows those commits. No push was performed.
- `npm run cleanroom:test`: 71 passed, zero failed/skipped.
- Only the pre-existing `.codex/config.toml` edits and `artifacts/structure-viewer/` remain outside the task commits.
- Large paged traversals rescan earlier rows. This is a bounded core implementation, not a scalability result. Worker timeouts during shared-kernel execution can close the session; timeouts before dispatch preserve it.
- At implementation handoff, live activation and semantic RLM evaluation were unrun; the subsequent activation result is recorded below. No service has been left running by tests. Existing pre-refactor REPL objects will not be migrated by restarting.

## Post-restart activation

The fresh mounted project MCP exposed the session interface. One fresh Codex worker read two native graph quads using a scoped grant, deposited a structured finding, and the owner retrieved it into a variable while retaining the graph. See the [activation receipt](../../artifacts/scoped-data-bridge/live-20260909-session-activation-01/receipt.json). This is a live bridge check, not a semantic quality evaluation. Broader E2–E5 work remains unrun. The service remains subject to five-minute idle expiry.

## Typed-data resumption

The [shared-session amendment](../experiments/scoped-data-bridge-shared-session.md) updates E2–E5 methodology. E2 executed with six recorded attempts; the final attempt passed graph/bindings equality and negative-handle checks, but the complete gate is partial: native JSON input is unsupported, and the full named-graph broker tier is unmeasured. E3–E5 remain unrun. Next: address these two coverage gaps, or explicitly limit E3 to passing graph/bindings adapter pairs. No runtime feature changes were made in this slice.

E2 delivery began on `codex/scoped-bridge-e2` from `7032936`. Receipts preserve all six attempts and the final run has 28 passing, four unsupported-JSON failures, and one unmeasured storage case. Registry validation reports 43 runs. Repository tests, smoke, whitespace and changed-document link checks pass; unrelated configuration and structure-viewer changes remain excluded.

## Adapter changes and passing E2 rerun

Implemented immutable workspace-bound JSON snapshots with scoped path reads, array slices, validation and release/version checks. Added explicit broker-backed native RDF retention preserving all quad terms. The [E2 rerun](../../artifacts/scoped-data-bridge/e2-20260909-adapters-fixed-03/receipt.json) passed all 48 checks. Final validation passed all 216 repository tests, smoke, offline runtime verification, result-registry validation and changed-document link/whitespace checks. E3–E5 remain unrun. No independent model/provider was introduced.

Work began on `codex/typed-input-adapters` from `c53dcea`. Runtime changes require a freshly loaded kernel/service for live use; deterministic experiment clients loaded the new code. Pre-existing configuration and structure-viewer changes remain excluded. Next action is E3, scoped to the now-tested adapter representations.

## E3 completed

Scope/lifetime experiment [attempt 2](../../artifacts/scoped-data-bridge/e3-20260909-scope-lifetime-02/receipt.json) passed all 74 checks after preserving one attempt with three harness-expectation failures. Tests used isolated real service/kernels and mechanical clients; the mounted working REPL was not reset. The supported whole-object RDF and path-scoped JSON protocol passed. Arbitrary RDF selectors, application-specific result schemas, and OS isolation are not established. E4 semantic processing is next; E5 remains unrun.

Delivery began on `codex/scoped-bridge-e3` from `fe60837`. No runtime source change was needed. Receipts, harness and methodology are the only intended changes, alongside registry validation. Unrelated configuration and structure-viewer edits remain excluded.

## E4 semantic processing completed

User authorized the twelve-item semantic experiment with three arms and three repetitions. Work began on `codex/scoped-bridge-e4` from `f2c4367`. The [frozen plan](../../artifacts/scoped-data-bridge/e4-20260909-semantic/plan.json) and evaluator are saved before dispatch. Two evaluator self-checks pass. A uses fresh direct-input evaluators as a declared root-baseline proxy; B uses mounted MCP workers and direct deposits; a repository client resumes each isolated owner kernel. No independent provider is added. Complete transcript/cost accounting and blinding are unavailable. E5 remains unrun.

The [nine-attempt comparison](../../artifacts/scoped-data-bridge/e4-20260909-semantic/summary.json) reports A 36/36, B 36/36 and structural-only C 18/36 semantic correctness, with 108/108 coverage and valid references. Each scoped deposit was retrieved into an owner variable and aggregated. One collection reconnect error was preserved and corrected without rerunning the model or changing the rubric. Evidence was captured before closure. The service and workers are closed; the working MCP scratch kernel was not reset. Semantic feasibility passes; strict no-relay auditing remains partial. Next is E5 bounded scale/recovery.

E4 verification: 218 repository tests passed; smoke, result registry (57 runs), frozen evidence hashes, changed-document links and whitespace checks passed. The focused experiment commit is intended for fast-forward integration into local main. Unrelated configuration and structure-viewer changes remain excluded. No push is authorized or performed.
