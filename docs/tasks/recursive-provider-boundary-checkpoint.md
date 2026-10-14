# Recursive provider boundary — checkpoint one

Date: 2026-09-24. Parent authorization: investigate the installed Codex/MCP boundary, save findings, and propose the smallest real-child test. No provider activation, existing-session restart, credentials/configuration changes, commits, or broad implementation. This checkpoint did not run a model turn or spawn a new child.

## Conclusion

The supported path to test next is **parent-mediated native Codex delegation between completed REPL calls**. The parent reads a bounded selected context from the Linked Science REPL, invokes its native subagent tool, receives the child result, and retains that result with another REPL call. This uses existing surfaces without enabling `nodeRepl.rlm.query`.

A direct **server-requested MCP sampling** callback is not negotiated by the installed client in the isolated handshake: its capabilities contain elicitation only, with no `sampling`. A direct **KernelBroker host callback** exists in project code, but is unattached and has no implemented Codex-child bridge. These are three different interfaces. Native subagent availability does not automatically make a callback callable from the MCP server.

## Observed installation and protocol

- Installed app: `/Applications/ChatGPT.app`, version `26.917.71314`, build `10954` (bundle metadata).
- Bundled executable: `/Applications/ChatGPT.app/Contents/Resources/codex`, `codex-cli 0.155.0-alpha.16.4` (`--version`).
- A fresh isolated app-server process initialized a minimal stdio probe via `mcpServerStatus/list`. It advertised protocol `2025-06-18`, client `codex-mcp-client` version `0.155.0-alpha.16.4`, capabilities `{"elicitation":{"form":{},"url":{}}}`. No sampling capability was advertised.
- The installed CLI generated its experimental app-server JSON schema. Its server-request methods include elicitation and client tool requests, but no sampling request. Its client methods include thread/turn lifecycle; no direct native subagent-spawn RPC was found. This describes this generated protocol, not all possible internal interfaces.
- The mounted project REPL reports the expected project/cwd, external context available, and recursion unavailable. Its old recovery wording confirms that the mounted process has not loaded the saved capability-message fix. No reset was performed.

Machine evidence: [isolated handshake and generated method inventory](../../artifacts/runtime-debugging/codex-mcp-boundary-20260924.json), [mounted capabilities](../../artifacts/runtime-debugging/recursive-provider-mounted-capabilities-20260924.json).

Probe isolation: temporary cwd/database/log paths and process-only CLI overrides disabled user-configured MCP servers and added the probe. No saved configuration was edited. Built-in/plugin inventory was also automatically listed by app-server; it was excluded from the bounded receipt, and no plugin tool was invoked. Initial sandbox launches failed before initialization; the successful probe used approved execution escalation. No thread or model turn was started. The probe process was terminated afterward. This is a fresh installed-binary handshake, not a wire capture of the existing Desktop session.

Reproduction outline: generate schema with `codex app-server generate-json-schema --experimental --out <temporary-directory>`; launch app-server with temporary `sqlite_home`/`log_dir` and invocation-only MCP overrides; send app-server `initialize`, then `initialized`, then `mcpServerStatus/list`; retain the stdio probe's incoming MCP `initialize`. Do not enable a provider or send a sampling request when the client has not advertised support.

## Official documentation checked

The [MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) describes stdio/HTTP servers and initialization instructions; it does not establish sampling support. Absence from this page alone was not used as evidence of unsupported behavior.

The [subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents) establishes native Codex delegation and parent coordination. The currently exposed `collaboration.spawn_agent`, messaging and wait tools independently establish a parent orchestration surface in this task. They are not methods on `nodeRepl` or functions available inside the broker process.

The [app-server documentation](https://learn.chatgpt.com/docs/app-server) establishes a separate JSON-RPC thread/turn integration and version-specific schema generation. Building a host around it is a possible future integration, not an existing bridge to this parent's native child lifecycle. Starting a separate root conversation is not proof of spawning a native child of the current task.

## Project-code boundary and deadlock analysis

- [Broker](../../packages/cleanroom-node-repl/src/cleanroom-mcp.mjs): `_recursiveQuery` invokes an injected `provider({prompt, context, budget})`; no MCP `sampling/createMessage` sender or Codex child API is present. The default provider is null. Depth is bounded to 1–4, timeout to at most 60 seconds, and output bytes are checked. `maxOutputTokens` is passed to the callback, not independently enforced; timeout races do not cancel the underlying callback.
- [Production adapter](../../packages/cleanroom-node-repl/src/scientific-session-mcp.mjs): constructs a scratch `KernelBroker` without a provider. Each MCP connection starts with independent scratch state; explicit session attachment is required for shared state.
- [Kernel context API](../../packages/cleanroom-node-repl/src/repl-kernel-child.mjs): `rlm.query` selects context and waits on the broker's host call. `registerContext`/`inspect` work without recursion.
- **Deadlock risk, inferred from code:** `KernelBroker.execute` serializes evaluations through `_enqueue`. If a provider waits for a child that needs a second evaluation on the same broker, that evaluation waits behind the first evaluation, which is waiting for the child. A timeout can end the wait or replace the kernel; it does not make this a sound reentrant design. Do not hold an active REPL evaluation open while requesting parent-mediated work.
- A child using its own scratch MCP connection cannot assume the parent's variables/handles exist. This was also observed during earlier fix delegation. For checkpoint two, pass only the selected value and forbid child access to the parent's REPL. Shared-session grants/deposits are a separate, larger test.

## Checkpoint-two plan recorded before execution

1. In the parent REPL, retain a tiny synthetic context with two explicitly labelled assertions and a unique run ID. Select at most 2 KiB with the context inspection API; return only that projection and metadata. Finish the MCP call before delegation.
2. Parent invokes one native child with `fork_turns="none"`, the selected context and a narrow question that requires synthesis. Require a compact JSON answer (at most 2 KiB), referencing assertion IDs and separating inference from supplied facts. Ask for no tools, network, recursive delegation, or parent REPL access. Project instructions/tool metadata may still be inherited; this is context minimization, not an enforced child sandbox.
3. Parent waits with a fixed wall-clock bound (for example 60 seconds), interrupts on overrun, and records the real child ID/status. A tool-usage audit is required before claiming tool isolation. No strict native-child token/output budget is exposed in this task's spawn schema; validate returned bytes and reject oversized output before retention.
4. After child completion, parent makes a separate REPL call, validates result shape/size, and retains `{runId, inputAssertionIds, childId, result, evidenceClass:'model-synthesis'}`. Read it back in a second call to prove residency, with the original context still present. Do not label the child result as retrieved scientific evidence or enable `rlm.query`.
5. Acceptance: real native child lifecycle observed; bounded selected input delivered; result returned and retained across REPL calls; original context remains; no evaluation overlaps the child wait; no reset, source retrieval, provider attachment or dependency on child access to parent handles. Capture a compact receipt before closing any intentional test state.

## Remaining evidence gaps and stop condition

The full parent → child → REPL round trip is proposed, not demonstrated. Existing Desktop client initialization was not intercepted. Feature-gated variants/other Codex versions may differ. No server-requested sampling was attempted, no real `KernelBroker.provider` was attached, and no app-server model turn or nested access/deadlock experiment was run. The current direct callback cannot be described as a Codex subagent provider.

Checkpoint one was complete; checkpoint two was subsequently authorized and executed below. A coordinated restart and preservation of all old runtime state are not prerequisites for the proposed parent-mediated test. Existing sessions remain untouched.


## Checkpoint two — actual parent-mediated round trip

**Passed, 2026-09-24.** User authorized the smallest real-child test. Run `parent-mediated-20260924-1790279438842`, native child `/root/roundtrip_child`, parent task `01a0d47f-8875-7270-82d6-0e8e95b1d78b`. [Machine receipt with exact prompts, responses and parent-observed trajectory](../../artifacts/runtime-debugging/parent-mediated-roundtrip-20260924.json).

The actual mounted Linked Science REPL retained a generated synthetic document (16,703 bytes). Only a 93-byte selected prefix was emitted and supplied to the child:

```text
SYNTHETIC FIXTURE; not scientific evidence.
A1: amber has 7 tokens.
A2: violet has 11 tokens.
```

The question requested combined tokens, absolute difference, larger sample and source assertion IDs. A real native child was spawned with `fork_turns="none"`, instructions to use only the excerpt and no tools/REPL/network/delegation, and a 2 KiB output bound. It returned:

```json
{"total":18,"difference":4,"larger":"violet","assertionIds":["A1","A2"]}
```

Independent Python arithmetic from the fixture values, run before receiving child completion, gave the same answer. The parent also checked the response against the oracle retained before delegation. After child completion, a new REPL call validated and retained the 72-byte answer with run/child identity and evidence class `synthetic-model-synthesis`. A further REPL call read back the complete 352-character result record.

All three REPL calls reported the same sentinel and workspace epoch `a497d3c1-29c1-41cb-9825-8409cfd07052:parent-mediated-20260924-1790279438842:1`. The full source remained resident (16,703 characters). No REPL evaluation was held open during child work. Recursion remained unavailable. No provider, restart, configuration change or production adapter was introduced.

The selected task did not require child REPL access: only the bounded text was needed, and the parent performed all retention. The parent-observed spawn/completion is recorded; there was no separate child-internal tool trace available for independent auditing. Thus this proves the round trip and correct result, not an enforced zero-tool child sandbox. The full generated appendix was never emitted to either prompt.

The run is registered in `artifacts/experiment-results/registry.json`. `npm run evaluation:results:validate` reached the pre-existing unrelated failure: `docs/experiments/scientific-trajectory-evidence.md` lacks registry status. The new registry entry passes structural validation and its receipt parses; no unrelated entry was changed. Markdown links and `git diff --check` pass.

### Smallest remaining adapter work — not implemented

A parent-owned orchestration helper could package a bounded context projection with run/epoch identity, return control, delegate using native Codex tools, then validate and retain the result in a later REPL call. It needs explicit timeout/interruption, output checks, provenance, stale-epoch rejection and idempotent result acceptance. Keep Codex responsible for child lifecycle and do not create a competing runtime scheduler. This helper would formalize the demonstrated sequence; it would not make synchronous `rlm.query` automatic. A direct callback requires an independently supported host integration and a reentrancy/cancellation design.

Stop after this checkpoint. Existing live state remains retained; replay is permitted, so complete state export is not a prerequisite for later work.

## Authorized depth-one follow-up

[Bounded recursion experiment](depth-one-recursion-experiment.md): native leaf restriction remains blocked by the available spawn surface; the isolated programmatic fallback demonstrated real nested-call and forged-depth denials, then retained a correct answer in the same REPL. No production adapter/provider was enabled.
