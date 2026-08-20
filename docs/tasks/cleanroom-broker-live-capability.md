# Task: Enforce the Linked Science live capability in the clean-room broker

- **Status:** Blocked on external-checkout authorization
- **Owner/task:** Unassigned
- **Scope:** Implement the broker half of the checked-in Linked Science named-profile capability in the separately saved `node-repl-network-probe` project. Keep all verification offline. Do not execute live requests, install packages, change global Codex configuration, or push.
- **Authorization boundary:** The current repository task did not authorize writes to `/Users/cvardema/dev/git/LA3D/linked-science-cloud/node-repl-network-probe`. Source-specific profile acquisition and live trials require separate exact approvals.

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

### Remaining work

- Read the external checkout's own `AGENTS.md`, README, and verification contract after authorization.
- Implement the capability and denial boundary in the broker process, not in child-importable repository code.
- Add immutable, reviewed VoID, machine-readable UniProt core, and GO acquisition profiles only after their exact sources and formats are established under current approval.
- Reverify the saved MCP in a fresh Codex task; configuration text is not activation evidence.

### Exact next action

Obtain explicit user authorization to edit `/Users/cvardema/dev/git/LA3D/linked-science-cloud/node-repl-network-probe`, then inspect that checkout read-only, create its required task branch, and implement the capability plus offline denial tests. Do not fetch UniProt or GO.

## Handoff state

- **Git:** The consumer contract is on `codex/uniprot-eval-hardening` at `1a78ff1`; no external checkout was modified.
- **Verification:** Repository offline broker tests pass. External enforcement is untested because it does not yet exist in the authorized checkout.
- **Live evidence:** None; no endpoint or documentation request occurred.
