# Durable RLM yield-and-resume implementation

- **Status:** Implementation, final verification and independent coordinator review complete. Reviewed commits are integrated into local `main` following explicit user approval. No push or live activation.
- **Authorization:** The user explicitly approved this general-purpose implementation and requested a separate implementation chat on 2026-09-29. Source/tests/docs and bounded local synthetic recovery artifacts are authorized. Configuration, installation, push, provider activation and restarting the active scientific session remain outside this task.
- **Checkout:** `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`
- **Branch/start:** `codex/durable-rlm-handoff`, starting at `485cb2786850e02414fcbfce9856f05d2a2cc51f` on local `main`.

## Decisions and implementation

See the [architecture/API contract](../architecture/durable-rlm-handoff.md). Named replayable continuations, an atomic SQLite ledger, explicit RDF/JSON snapshots, selected activity recovery and scratch-worker grant reuse are implemented. The host never schedules model work. Result acceptance and continuation revision commit together; physical computation may replay. The durable slice supports 128 KiB complete snapshots; large spools remain ephemeral. The prior [dataset-persistence deferral](durable-dataset-persistence.md) is superseded for this authorized slice, not for unrestricted bulk storage.

The host owns a private root outside child-readable code roots. Default MCP configuration remains unchanged and durability is unavailable until a host explicitly provides that root. The shared-service launcher supports `--handoff-root`; activation remains a subsequent authorized operation.

The existing uncommitted recursion capability diagnostic in `repl-kernel-child.mjs` is preserved but excluded from task commits. Wiki, configuration, artifacts and other pre-existing changes are likewise excluded. No experimental drivers were imported into production.

## Pause checkpoint and evidence

Historical checkpoint: the user explicitly requested a graceful pause to close the laptop. That pause was subsequently revoked by explicit user authorization to resume and obtain independent review. No tracked goal was active (`get_goal` returned null). No live process or REPL binding is needed for recovery. All task test processes finished or were specifically stopped; the user's existing scientific session was not reset or restarted.

- Mounted project identity and binding persistence were verified through `cleanroom_node_repl`; direct provider absent. The reference-only workspace may remain in that live kernel, but implementation recovery does not depend on it.
- Upstream RLM LocalREPL was inspected through the private public-read mediator; the architecture contract records the comparison and the mutable URL limitation.
- **Final focused command:** `node --test packages/cleanroom-node-repl/test/handoff-store.test.mjs packages/cleanroom-node-repl/test/handoff-runtime.test.mjs` — **14 passed, 0 failed**. Includes actual SIGKILL before/after prepare/dispatch/accept/advance commits, identical/conflicting retries, retained graph/JSON inputs, nested deterministic synthesis, restart/fresh handles, source sequence/named-graph/bindings bag fidelity, source release, lost output, same-evaluation dispatch rejection, worker read/deposit/revocation, bounded fresh JSON handles, ancestor cancellation preserving accepted descendant receipts, and explicit shared-reference selection on reopening.
- **Already-running `npm test`:** finished **328 passed, 1 failed (329 tests)**. Sole failure: `test/experiment-result-registry.test.mjs`, missing registry coverage for the pre-existing untracked `docs/experiments/scientific-trajectory-evidence.md`. That dossier and registry were already dirty at task start and were not changed here. Do not silently fix or commit unrelated scientific records. This full run predates the final JSON-handle/ancestor-cancellation/isolation checkpoint fixes; it is not final verification of the checkpoint commit.
- **Earlier `npm run smoke`:** passed (`synthetic Communica SELECT passed: Alex`).
- **Earlier `npm run linked-science:verify`:** passed offline boundary/broker/runtime verification. This does not activate the running Desktop session.
- **`git diff --check`:** passed at checkpoint preparation. Changed documentation relative links checked locally.
- During development the first full-suite attempt stalled on a new static import outside a standalone scratch broker's readable roots. The private recovery adapter was moved into the broker package, and only this task's identified stalled test processes were terminated. The subsequent full run completed as recorded above. Early focused failures (fixture graph kind, test error assertions, missing JSON restore lineage) were fixed; the final 14-test run supersedes them.

[Saved test logs](../../artifacts/implementation-checkpoints/durable-rlm-handoff-20260929/README.md) are implementation verification evidence, not scientific experiment results. No experiment registry mutation was needed or made for these tests. No provider, credentials, native child model calls or live evaluation were activated.

## Retention/isolation review completed at this checkpoint

- JSON now restores behind fresh epoch-bound production evidence handles rather than returning a bulk detached object; bounded `readJson` validates handle lifetime.
- Original source release does not delete independently saved inputs. Computations pin saved versions; explicit activity removal checks cross-activity references.
- Opening an activity again does not inherit previously selected shared references.
- Cancelling a parent cancels unresolved descendants while retaining already committed child acceptance receipts.
- Request grants remain ephemeral, revoke on acceptance/cancellation, and retain exclusive output slots. Kernel loss invalidates grants and handles. Bridge copies are unpublished and released on cleanup.
- The host root is outside child-readable roots; no paths or capability tokens are checkpoint data. Snapshot formats/quotas and RDF sequence/set/bag distinctions are explicit.

## Changed files owned by this task

- `packages/cleanroom-node-repl/src/handoff-values.mjs`, `handoff-store.mjs`, `handoff-runtime.mjs`, `private-linked-science-recovery.mjs`: validation, transactional ledger, child API, private production-registry adapter.
- `lib/linked-science-runtime.mjs`: supported native snapshot/restore and bounded JSON access.
- `packages/cleanroom-node-repl/src/cleanroom-mcp.mjs`, `repl-kernel-child.mjs`: host dispatch, epoch/evaluation identity and RLM/PEEK surface.
- `packages/cleanroom-node-repl/src/scientific-session-{client,mcp,runtime,server,service}.mjs`: explicit owner revocation and opt-in durable service launcher.
- `packages/cleanroom-node-repl/test/handoff-{store,runtime}.test.mjs`, `test/fixtures/handoff-crash.mjs`: focused tests and physical crash fixture (paths relative to the broker package).
- `README.md`, `docs/architecture/{durable-rlm-handoff,persistent-session-and-handles}.md`, `docs/tasks/{README,durable-dataset-persistence,durable-rlm-handoff}.md`: API, scope reconciliation and durable handoff.
- `artifacts/implementation-checkpoints/durable-rlm-handoff-20260929/`: saved logs and checkpoint notes.

## Resumed review and final verification

The user authorized resumption and independent review by the coordinating chat. The coordinator reported no remaining identified code blockers after reviewing fixes and independently rerunning targeted tests. The coordinator completed review of `1d6a28583f4d2630dff8b34795155fc412f58c38` with no remaining identified code blockers. Automatic approval review then rejected the coordinator’s local-main integration request because it requires explicit user authorization. The user subsequently answered “Ok” to the explicit question “May I fast-forward these reviewed commits into local main?” That approval authorized the completed local integration; it did not authorize pushing, configuration changes or activation.

Review findings resolved:

1. **Late grant / cleanup races:** provisional allocations remain tracked until settled; terminal requests fence and revoke late grants. Cleanup is serialized per request, retains retryable partial progress, handles already-invalidated resources and does not inspect another activity's leases. Acceptance/cancellation return honest cleanup-pending status. Deterministic tests include acceptance/cancellation during deferred allocation and failed late revocation followed by repair.
2. **Lost computation identity:** bounded `computations(activity,...)` inventory exposes all computation lifecycle states, step identities, revisions and request links. Restart tests discard every volatile activity/computation/request ID and discover both an unacknowledged start and a continuation whose acceptance already removed the request from `pending`.
3. **Binding fidelity:** declared columns are saved, validated and restored, including empty results, never-bound projections and spooled all-unbound solution bags.
4. **Storage and concurrent startup:** confinement is checked before directory creation; database and sidecar file types/links/size are checked; database creation is private; payload/envelope format checks precede loading. The SQLite busy timeout is set before the first schema/journal operation. Pending requests reserve terminal-commit space. Physical crash and four-process first-accept tests cover recovery and concurrent retries.
5. **Launcher isolation/recovery:** a real isolated `scientific-session-server.mjs --handoff-root ...` process is restarted in the synthetic test. The same named session recovers saved JSON; sibling and fresh session stores stay isolated. No user MCP/service was activated or restarted.

Final source verification, after the review fixes:

| Command | Result |
| --- | --- |
| `node --test packages/cleanroom-node-repl/test/handoff-races.test.mjs packages/cleanroom-node-repl/test/handoff-store.test.mjs packages/cleanroom-node-repl/test/handoff-runtime.test.mjs` | Intermediate review fixes: 20 passed |
| `node --test packages/cleanroom-node-repl/test/handoff-store.test.mjs packages/cleanroom-node-repl/test/handoff-races.test.mjs packages/cleanroom-node-repl/test/handoff-launcher.test.mjs` | Final storage/launcher/race hardening: 19 passed |
| `npm test` | **345 passed, 1 failed, 346 total**; sole failure is the unchanged pre-existing registry coverage gap for `docs/experiments/scientific-trajectory-evidence.md` |
| `npm run smoke` | Passed |
| `npm run linked-science:verify` | Passed; offline identity/broker/runtime evidence only |
| `git diff --check` / focused staged diff check | Passed |
| Changed documentation relative-link check | Passed |

The final full suite includes all **26 handoff-specific tests** (13 store, 7 runtime, 5 races, 1 launcher), plus fixture-file discovery by the Node test runner. No new runtime test failure remains. [Final verification logs](../../artifacts/implementation-checkpoints/durable-rlm-handoff-20260929/review/README.md) are separate from the earlier pause-checkpoint evidence.

The registry failure is not caused by these implementation files: the uncovered dossier was already untracked at task start, and the registry was already dirty. They remain outside this change. Do not silently fix or commit unrelated scientific records. Default tests use synthetic data only; no live native Codex model execution/quality, provider activation or universal native-tool recursion enforcement is claimed.

## Review handoff and remaining limitations

- Independent review and user-approved local integration are complete. The reviewed implementation commits and approval-hold documentation commit are reachable from local `main`; `codex/durable-rlm-handoff` remains as a retained reference. No push, configuration change, durable-service/provider activation or active-session restart/reset is authorized.
- Durability deliberately supports complete snapshots up to 128 KiB, not arbitrary bulk datasets/resources. Large result spools remain epoch-scoped. RDF/JSON format hashes are encoding identities, not canonical RDF identities. RDF-star and additional result kinds are unsupported.
- Named replayable function registration is required after recovery. Functions/closures/stacks and arbitrary side effects are not serialized. Once-only committed advancement does not mean exactly-once physical execution.
- Codex owns actual model work, lifecycle, cancellation and scheduling. The default client remains unchanged; explicit private host storage and a newly authorized session are needed to activate this capability. Ephemeral grants are never restored.
- Cleanup registry state is intentionally ephemeral. If a process loses an acknowledgement after the service issued a capability but before the kernel learned it, the unknown capability cannot be recovered from the ledger; service TTL/epoch invalidation bounds its lifetime. No durable authority is recreated.
- Review tests establish four-process transactional contention behavior, not arbitrary adversarial same-OS-user protection or exhaustive concurrency model checking.

For read-only inspection of the reviewed branch:

```sh
git status --short
git diff 5256aab..HEAD --stat
git log -2 --oneline
```

Local integration completed after the explicit user approval recorded above. Before the operation, local `main` was verified as an ancestor of the reviewed branch and was not checked out elsewhere. An exact-old-value, ancestry-checked reference fast-forward moved `main` to `bebbd67d87fde093a0a4bc5b13e9fbf93545b92a`; switching to that identical tree preserved the working files. SHA-256 comparisons of the complete tracked binary diff and dirty/untracked status manifest were unchanged across integration. `git merge-base --is-ancestor` succeeded for `5256aab`, `1d6a285` and `bebbd67` against `main`. No stash, reset, force checkout or unrelated-work commit was used. Required checks above remain applicable because integration changed no runtime source. No running scientific session was restarted or reset.

## Git checkpoint and final branch

- Checkout: `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`; no separate worktree.
- Current branch: `main`; retained task branch: `codex/durable-rlm-handoff`.
- Starting local main: `485cb2786850e02414fcbfce9856f05d2a2cc51f`.
- Initial checkpoint: `5256aab98b520b4e5fff6710d48b6fb4c8c2df68`.
- Reviewed fix commit: `1d6a28583f4d2630dff8b34795155fc412f58c38`. Approval-hold documentation commit: `bebbd67d87fde093a0a4bc5b13e9fbf93545b92a`. Both and the initial checkpoint are verified ancestors of local `main`.
- **Integrated into local main** with explicit user approval. Main was 6 commits ahead of `origin/main` immediately after the fast-forward; the subsequent focused completion-record commit makes it 7 ahead. Nothing was pushed. The exact completion-record commit is reported in the final chat response.

Pre-existing recursion diagnostics and the task-index debugging row remain uncommitted and are excluded from task commits. Configuration, scientific/wiki files, registry and artifacts remain as found. No task source changes should remain uncommitted after the focused follow-up; inspect the targeted diff rather than resetting or sweeping unrelated work into a commit.
