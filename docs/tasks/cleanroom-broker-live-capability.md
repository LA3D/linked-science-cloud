# Task: Enforce the Linked Science live capability in the clean-room broker

- **Status:** Offline implementation complete; blocked on fresh-task activation evidence and source-specific approvals
- **Owner/task:** External implementation completed in the current task; fresh-task verification unassigned
- **Scope:** Implement the broker half of the checked-in Linked Science named-profile capability in the separately saved `node-repl-network-probe` project. Keep all verification offline. Do not execute live requests, install packages, change global Codex configuration, or push.
- **Authorization boundary:** The user authorized the external checkout modifications completed here. Source-specific profile acquisition and live trials still require separate current approval for each exact source or endpoint. No live request, package installation, global configuration change, push, or export was authorized or performed.

## Outcome and acceptance evidence

The broker injects `nodeRepl.linkedScienceBroker` with exactly `capabilities`, `acquire`, and `query`. It retains immutable endpoint/document profiles, fetch, the network-capable Communica engine, credentials, redirect/timeout/retry policy, and byte/result limits outside the child. The child cannot open raw network sockets, construct a profile, substitute an endpoint, or read evaluator-private storage.

Offline tests must establish:

- capability and operation receipts conform to `docs/runtime/linked-science-broker-capability.schema.json`;
- profile descriptors reveal IDs, operation kinds, digests, and ceilings only;
- caller-supplied endpoints, profile objects, transports, credentials, and redirects are rejected before transport;
- injected acquisition/query results reach native Linked Science handles through `workspace.live.*`;
- raw child HTTP/DNS/socket routes are denied;
- a honeytoken in evaluator-private storage produces a broker `read-denied` boundary attestation and cannot be read from the worker root; and
- timeout, redirect, oversized body/result, malformed receipt, and injected partial-failure cases remain attributable without retries or absence claims.

## Current state

### Completed evidence

- Local commit `1a78ff1` (`feat: add broker-owned native live handles`) implements the child-facing contract, native evidence/result retention, RDF evidence parsing, bounded evidence search/inspection, profile and receipt hash validation, and offline Tier 0–2 injected-broker tests.
- Raw guarded transport helpers are no longer exposed under `linkedScience.compatibility`.
- `linkedScience.capabilities().brokerOwnedLive` is false unless the external broker is actually injected; live calls otherwise fail with `LS_BROKER_UNAVAILABLE`.
- External local commit `a18934f` (`feat: enforce broker-owned linked science operations`) implements the parent-owned immutable profile broker and injects exactly `capabilities`, `acquire`, and `query` into the evaluator child.
- The child is launched under Node's permission model with reads limited to the worker root and kernel entry file; raw HTTP, DNS, sockets, filesystem writes, and evaluator-private reads are denied. Parent host calls also require a random per-kernel capability token, preventing imported modules from forging IPC requests.
- Offline external tests establish bounded acquisition/query receipts, descriptor non-disclosure, pre-transport injection denial, timeout/redirect/body/result bounds without retry, and a real honeytoken `ERR_ACCESS_DENIED` attestation.
- A cross-repository offline check used the real external broker with injected synthetic responses and confirmed that this runtime retained native evidence and bindings handles with broker-owned provenance.

### Remaining work

- Add immutable, reviewed VoID, machine-readable UniProt core, and GO acquisition profiles only after their exact sources and formats are established under current approval.
- Fully restart Desktop and reverify the saved MCP in a fresh Codex task; checked-in configuration and process-local unit tests are not activation evidence.
- Perform any real profile operation only after current approval for that exact source or endpoint. A checked-in profile is capability metadata, not authorization to use it.

### Exact next action

After a full Desktop restart, open a fresh trusted-project task for `/Users/cvardema/dev/git/LA3D/linked-science-cloud/node-repl-network-probe`; verify the separately named MCP still lists exactly three tools, then inspect `nodeRepl.linkedScienceBroker.capabilities()` and repeat only the offline persistence and denial checks. Do not invoke a live profile during activation verification.

## Handoff state

- **Git:** External checkout `/Users/cvardema/dev/git/LA3D/linked-science-cloud/node-repl-network-probe` local `main` contains `a18934f`; the focused task branch is retained and nothing was pushed. The consumer handoff update starts from local `main` at `9e612a5`.
- **Verification:** External `npm run check` passed, external `npm test` passed 20/20, and the real external broker-to-consumer native-handle integration check passed with injected synthetic responses. Fresh Desktop task activation remains unverified.
- **Live evidence:** None; no endpoint or documentation request occurred.
