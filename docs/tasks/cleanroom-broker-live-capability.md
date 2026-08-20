# Task: Enforce the Linked Science live capability in the clean-room broker

- **Status:** Runtime boundary and two orientation profiles verified; blocked on a machine-readable UniProt core profile
- **Owner/task:** External implementation, activation, VoID, and GO profile verification completed; core-source discovery remains unassigned
- **Scope:** Implement and verify the broker half of the checked-in Linked Science named-profile capability in the separately saved `node-repl-network-probe` project. Keep live operations exact, bounded, explicitly approved, and broker-owned.
- **Authorization boundary:** The user authorized the completed external checkout modifications, the exact catalog acquisition, one exact bounded UniProt endpoint-existence `ASK` preflight, the three-source orientation preflight, and the two exact bounded core-source discovery GETs recorded below. No competency query, unlisted source acquisition, federation, package installation, global configuration change, push, or other external write was authorized or performed.

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
- The first authorized acquisition-profile preflight succeeded for `https://sparql.uniprot.org/uniprot` and `https://geneontology.org/docs/ontology-documentation/`. The proposed `https://ftp.uniprot.org/pub/databases/uniprot/current_release/rdf/core.owl` source returned HTTP 404 on its only attempt and was not retried or substituted; the [machine receipt](../../artifacts/experiment-results/2026-08-20-orientation-profile-preflight-attempt-1.json) preserves all three outcomes.
- External local commit `2cbbd98` (`feat: add validated competency acquisition profiles`) places the validated `uniprot-void-description` and `go-orientation` profiles on the external checkout's local `main` and removes the failed core source from the defaults.
- A second authorized discovery run made one guarded GET each to the exact FTP RDF directory and HTTPS core PURL. The directory returned HTTP 404, while the zero-redirect guard refused the PURL redirect and surfaced `BROKER_TRANSPORT_ERROR`. The [machine receipt](../../artifacts/experiment-results/2026-08-20-uniprot-core-source-discovery.json) records the fixed one-attempt, zero-retry, eight-second policy. No redirect was followed and no replacement source was inferred or contacted.

### Remaining work

- Establish an exact machine-readable UniProt core source and immutable acquisition profile under a new source-specific approval.
- Perform any real profile operation only after current approval for that exact source or endpoint. A checked-in profile is capability metadata, not authorization to use it.

### Exact next action

Obtain explicit approval for one bounded, non-following redirect-metadata inspection of `https://purl.uniprot.org/core/`, or for another exact official machine-readable core URL supplied by the user. Record the canonical target without following it, then request separate approval before acquiring that target or adding its immutable profile.

## Handoff state

- **Git:** External checkout `/Users/cvardema/dev/git/LA3D/linked-science-cloud/node-repl-network-probe` local `main` contains the broker implementation through `2cbbd98`. This discovery continuation began from consumer local `main` at `618773f`; result milestone `10b80bd` is on `codex/uniprot-core-source-discovery` pending verified fast-forward integration. Nothing was pushed.
- **Verification:** External profile tests passed before `2cbbd98` was integrated. For this consumer result milestone, `npm test` passed 79/79, `npm run smoke` passed, `npm run evaluation:results:validate` passed with 20 registered runs, and `git diff --check` passed.
- **Live evidence:** One endpoint-existence `ASK`, two successful orientation acquisitions, and three failed core-source attempts now have durable records. None is a competency answer. No exact machine-readable core source has been established.
