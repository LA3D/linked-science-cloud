# Task: Enforce the Linked Science live capability in the clean-room broker

- **Status:** Runtime boundary verified; blocked only on reviewed acquisition profiles
- **Owner/task:** External implementation and fresh-task activation verification completed; source-profile review remains unassigned
- **Scope:** Implement and verify the broker half of the checked-in Linked Science named-profile capability in the separately saved `node-repl-network-probe` project. Keep live operations exact, bounded, explicitly approved, and broker-owned.
- **Authorization boundary:** The user authorized the completed external checkout modifications, the exact catalog acquisition, and one exact bounded UniProt endpoint-existence `ASK` preflight. No competency query, other source acquisition, federation, package installation, global configuration change, push, or other external write was authorized or performed.

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
- After a full Desktop restart, a fresh trusted-project task observed exactly the `js`, `js_add_node_module_dir`, and `js_reset` tools; `linkedScienceBroker.capabilities()` exposed exactly `acquire`, `capabilities`, and `query`; and bootstrap reported `brokerOwnedLive: true`.
- The restarted child preserved JavaScript state and denied raw HTTP, DNS, sockets, filesystem writes, and evaluator-private reads with `ERR_ACCESS_DENIED`.
- One separately authorized `ASK` against the exact `uniprot-read` profile returned HTTP 200, boolean `true`, a 41-byte response, one attempt, no retry, redirect-error policy, an 8-second timeout, broker receipt `lsb-000001`, and native boolean handle `h-000001`. This proves parent-broker connectivity and retention only.

### Remaining work

- Add immutable, reviewed VoID, machine-readable UniProt core, and GO acquisition profiles only after their exact sources and formats are established under current approval.
- Perform any real profile operation only after current approval for that exact source or endpoint. A checked-in profile is capability metadata, not authorization to use it.

### Exact next action

Review the exact source URLs, expected media types, bounds, redirect policy, and parsing contracts for the VoID, machine-readable UniProt core, and GO orientation resources. Obtain separate current approval before acquiring them or adding immutable profiles.

## Handoff state

- **Git:** External checkout `/Users/cvardema/dev/git/LA3D/linked-science-cloud/node-repl-network-probe` local `main` contains `a18934f`; the focused task branch is retained and nothing was pushed. The consumer handoff update starts from local `main` at `9e612a5`.
- **Verification:** External `npm run check` passed, external `npm test` passed 20/20, the synthetic cross-repository native-handle integration passed, and fresh-task activation, denial, bounded live-query, active-child private-read denial, and exported-worker boundary checks were observed.
- **Live evidence:** One endpoint-existence `ASK` receipt proves the exact broker transport path. No competency answer or source-orientation acquisition is claimed.
