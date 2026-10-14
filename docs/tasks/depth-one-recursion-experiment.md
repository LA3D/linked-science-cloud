# Bounded depth-one recursion experiment

2026-09-24. Authorized prototype only; no production provider, saved configuration change, existing-session restart, or commit. Continuation of [boundary checkpoints](recursive-provider-boundary-checkpoint.md). Overall result: **partial for the native-subagent request; passed for the isolated programmatic fallback within its stated boundary**.

## Research comparison

[Original RLM v1, §5](https://arxiv.org/html/2512.24601v1) reports depth-one experiments with ordinary LM subcalls. It does not establish an arbitrary nested-agent architecture. [Authors' current implementation](https://github.com/alexzhang13/rlm/blob/main/rlm/core/rlm.py), retrieved on this date, defaults to maximum depth one, derives the next depth from the current host instance, falls back to a plain completion at the cap, and passes derived depth to a child below the cap. Observed relevant lines: 56, 350, 723, 734, 813. The moving `main` file is identified here by content SHA-256 `f7df6af55027159b2f428ff98c9b19beb872618ee88aa8fef62c9498fa1e0562`; no immutable Git commit was independently resolved.

Both sources were retrieved through the project broker and remain behind resource handles. The paper response hash is `3c007f38a03f762e57cd31d7daa3337a79f8c153766aa96eb6cd1f524e3a0794`. [Source exchange receipt](../../artifacts/runtime-debugging/depth-one-source-exchanges-20260924.json) records URLs, status, timestamps, bytes and hashes. [Selected evidence and REPL trajectory](../../artifacts/runtime-debugging/depth-one-sources-repl-20260924.json) records the comparison and retention checks.

The existing production `_recursiveQuery` differs: it validates caller-supplied `options.depth` in 1–4, but does not derive ancestry from a host registry. Reusing depth 1 is not prevented by that check. Its timeout uses `Promise.race`, without cancellation of the provider. No production behavior was changed in this experiment.

## Capability boundary

The native `collaboration.spawn_agent` surface available to this task accepts name, prompt, fork history and model/reasoning overrides; it has no per-child tool-removal or enforced leaf parameter. Therefore a prompt asking a native child not to recurse cannot prove enforcement. No unsafe native-grandchild test was used as a substitute.

The [official subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents) and [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) document disabling multi-agent tools through `agents.enabled`/`features.multi_agent` and disabling shell execution features. The installed `0.155.0-alpha.16.4` app-server accepted invocation-only settings, and `config/read` verified effective values before the child turn.

The fallback is an **isolated ephemeral programmatic Codex conversation**, owned by the experimental parent host. It is not a native descendant of this Desktop task, and it is not identical to the paper's plain LM call. The normal native delegation route was disabled, along with shell/unified execution, apps, plugins, remote plugins, browser/computer use, configured user MCP servers, hooks, memories and web search. Temporary cwd/database/log paths isolated execution from project configuration. No credential files were read or edited by the prototype; the installed client used its existing authentication.

The code-mode host had to remain enabled to dispatch the one supplied dynamic diagnostic tool. An initial model-child attempt with it disabled produced dispatcher errors, not host depth denials. That failed attempt is preserved in the [dispatcher-failure receipt](../../artifacts/runtime-debugging/depth-one-dispatcher-failure-20260924.json). The retry retained all other restrictions. This proves enforcement of the tested host route and effective configuration of native routes; it is not a security audit of every internal Codex tool-dispatch implementation.

## Prototype and actual trajectory

[Depth gate](../../scripts/experiments/depth-one-gate.mjs), [opt-in isolated driver](../../scripts/experiments/depth-one-codex-probe.mjs), and [focused tests](../../test/depth-one-gate.test.mjs) are experiment fixtures, not production runtime imports.

The gate registers root/leaf identities as host-owned symbols. The actual app-server thread ID is bound to the registered leaf by the driver. The leaf's tool payload cannot select the calling identity. Requests with `depth` or `parentId` are rejected, and normal requests derive depth from the registered caller. Maximum depth is one. Total admitted model children and concurrent children have independent counters. The bounded investigation used two real model children, concurrency one: the dispatcher failure, then one corrected retry. A host-owned temporary ledger, seeded by the coordinator from the first receipt, carried the first real-child admission into the retry (total cap two); it is not a cross-process distributed quota service. The [preliminary sandbox startup failure](../../artifacts/runtime-debugging/depth-one-startup-failure-20260924.json) created no thread/model turn.

The full synthetic source remained in the existing Linked Science REPL: 16,703 bytes, with only the same 93-byte excerpt passed to the child. The parent completed selection before starting the child and waited outside the REPL.

Actual successful child thread: `01a0d503-787b-77c0-bd38-583a7817e07a`, turn `01a0d503-78bd-7fb1-ac3e-03ef1edf0e5e`, registered leaf depth 1. The model made both requested real dynamic tool calls:

| Actual leaf request | Host result | New child created |
| --- | --- | --- |
| `request_child({})` | `DEPTH_LIMIT` | No |
| `request_child({depth:0,parentId:"root"})` | `CALLER_IDENTITY_OVERRIDE` | No |

The leaf then returned the correct normal answer: total 18, absolute difference 4, violet larger, references A1/A2, and the two actual denial codes. The full app-server request/response events and effective feature values are in the [successful probe receipt](../../artifacts/runtime-debugging/depth-one-codex-probe-20260924.json). This is actual refusal by host code, not polite model compliance.

The parent independently checked the numeric answer against the pre-existing fixture oracle, then retained the 129-byte response and read it back in another actual REPL call. Source and result remained in epoch `a497d3c1-29c1-41cb-9825-8409cfd07052:parent-mediated-20260924-1790279438842:1`; the original sentinel was unchanged. The result's evidence class is synthetic model synthesis. Production recursion remained unavailable. The child had no Linked Science MCP route and did not need REPL access.

## Criteria and limits

| Criterion | Result | Evidence/limit |
| --- | --- | --- |
| Native Desktop parent spawns an enforceably restricted native leaf | **Blocked** | Available spawn schema lacks per-child restriction controls; prompt-only prohibition rejected as evidence. |
| Isolated parent host admits one level of real Codex leaf work | **Pass** | Actual thread/turn and registered leaf depth in receipt. |
| Actual nested call denied | **Pass, tested host route** | Model-issued request reached host and got `DEPTH_LIMIT`. |
| Forged/reset depth rejected | **Pass** | Actual reset/root-claim attempt denied; unit fixtures also test individual overrides and unknown identity. |
| Native recursion and alternative execution routes disabled | **Pass for effective configured controls** | `config/read` records false multi-agent/shell/apps/plugins/browser/MCP controls; no claim of exhaustive adversarial runtime audit. |
| Total-call and concurrency limits independent of depth | **Pass, bounded fixture** | Gate unit test distinguishes both errors; two real admitted children, one at a time, with host ledger between attempts. No concurrent multi-process stress test. |
| Normal answer returns to same retained REPL | **Pass** | Independent expected-answer match and later readback; full source preserved. |
| Existing provider timeout cancels provider | **Fail, observed** | Offline stub continued and completed after `RLM_TIMEOUT`; production timeout is waiting cancellation only. |
| Prototype timeout cancels model/server work end-to-end | **Untested** | Driver has a 60-second watchdog, interrupt request and local termination escalation; successful runs did not exercise it. Upstream inference cancellation is not established. |

## Verification and stop

Focused tests: 2/2 passed, including depth/identity/quota and actual late-provider completion after timeout. Final `npm test` with required fixture socket access: **316 tests, 315 passed, 1 failed, 0 skipped**. The sole failure remains the pre-existing unrelated registry status for `docs/experiments/scientific-trajectory-evidence.md`. The earlier sandbox-limited run also encountered fixture socket denials. `npm run smoke`, new run registry structural/receipt checks, Markdown link checks and `git diff --check` passed. `npm run evaluation:results:validate` encounters that same unrelated dossier failure. No unrelated registry status was changed.

Checkout `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`, branch `codex/checkpoint-runtime-fixes`, starting commit `13e43664e3313bc668221bbf8d72e522b8a60db3`; all task work remains uncommitted as requested. No integration or push. Local main remains two commits ahead from pre-existing work.

Smallest remaining work is a separately reviewed parent-owned adapter with immutable per-investigation identity and quotas, robust cancellation/late-result handling, stale-epoch rejection and result provenance. The prototype does not install one. A native-child adapter still needs an exposed enforceable per-child capability boundary; otherwise the isolated programmatic-child path is the demonstrated alternative. Stop after this experiment.
