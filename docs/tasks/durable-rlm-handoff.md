# Durable RLM yield-and-resume implementation

- **Status:** Paused at the user’s explicit request on 2026-09-29; deterministic checkpoint verified; no live activation.
- **Authorization:** The user explicitly approved this general-purpose implementation and requested a separate implementation chat on 2026-09-29. Source/tests/docs and bounded local synthetic recovery artifacts are authorized. Configuration, installation, push, provider activation and restarting the active scientific session remain outside this task.
- **Checkout:** `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`
- **Branch/start:** `codex/durable-rlm-handoff`, starting at `485cb2786850e02414fcbfce9856f05d2a2cc51f` on local `main`.

## Decisions and implementation

See the [architecture/API contract](../architecture/durable-rlm-handoff.md). Named replayable continuations, an atomic SQLite ledger, explicit RDF/JSON snapshots, selected activity recovery and scratch-worker grant reuse are implemented. The host never schedules model work. Result acceptance and continuation revision commit together; physical computation may replay. The durable slice supports 128 KiB complete snapshots; large spools remain ephemeral. The prior [dataset-persistence deferral](durable-dataset-persistence.md) is superseded for this authorized slice, not for unrestricted bulk storage.

The host owns a private root outside child-readable code roots. Default MCP configuration remains unchanged and durability is unavailable until a host explicitly provides that root. The shared-service launcher supports `--handoff-root`; activation remains a subsequent authorized operation.

The existing uncommitted recursion capability diagnostic in `repl-kernel-child.mjs` is preserved but excluded from task commits. Wiki, configuration, artifacts and other pre-existing changes are likewise excluded. No experimental drivers were imported into production.

## Pause checkpoint and evidence

The user explicitly requested a graceful pause to close the laptop. Resume **only on the user's request in this same chat**. No tracked goal was active (`get_goal` returned null). No live process or REPL binding is needed for recovery. All task test processes finished or were specifically stopped; the user's existing scientific session was not reset or restarted.

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

## Remaining work after explicit resumption

1. Inspect the named branch/commit and preserved unrelated work; read this brief and the architecture contract. Do not restart the active scientific session.
2. Finish the broader implementation review: hostile/corrupt storage handling, concurrent first-accept contention across host processes (current coverage proves transactional CAS, physical crash recovery and concurrent identical retries, but is not an exhaustive multiprocess race stress test), and explicit service-launcher activation-path tests. Review bounded step/result contracts and documentation discoverability before calling the overall implementation complete.
3. Run final full repository checks **only after resumption**, because checkpoint fixes landed after the earlier full run. Record the unrelated registry failure separately if it still exists. Do not change global/project client configuration or run live model verification implicitly.
4. Make any necessary focused follow-up commits, then integrate into local `main` when safe. No push is authorized.

Exact starting commands after resumption (in the checkout above):

```sh
git status --short
git branch --show-current
git log -3 --oneline
node --test packages/cleanroom-node-repl/test/handoff-store.test.mjs packages/cleanroom-node-repl/test/handoff-runtime.test.mjs
npm test
npm run smoke
npm run linked-science:verify
git diff --check
```

The Unix-socket tests need the same local execution approval used during this task when the outer sandbox denies socket creation. No dependencies were installed. See the architecture contract for precise subsequent opt-in activation; do not perform it merely to resume source review.

## Git checkpoint

Checkpoint changes are committed on `codex/durable-rlm-handoff`; identify the implementation commit with `git log -1 --format=%H -- packages/cleanroom-node-repl/src/handoff-store.mjs`. The final chat response records the exact hash. Local `main` remains at starting commit `485cb2786850e02414fcbfce9856f05d2a2cc51f`, already 3 commits ahead of its upstream at task start/checkpoint. **Not integrated into main**: the user requested this pause before final review/verification. Keep the named branch; no worktree was created.

Pre-existing modifications to the recursion diagnostics and task-index debugging row remain uncommitted and are excluded using focused index contents. Configuration, scientific/wiki files, registry and artifacts remain untouched and uncommitted as found. No task source changes should remain outside the checkpoint commit; confirm with the targeted diff when resuming. Do not reset or sweep unrelated work into a future commit.
