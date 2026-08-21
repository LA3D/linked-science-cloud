# Task: Enforce the Linked Science live capability in the clean-room broker

- **Status:** Historical external implementation milestone; production ownership migrated into Linked Science
- **Owner/task:** The external implementation and activation evidence remain historical; all current production work belongs to `packages/cleanroom-node-repl` in this repository.
- **Scope:** Preserve the evidence from the former named-profile broker implementation and its guarded live checks. The sibling `node-repl-network-probe` repository is no longer a production authority or runtime dependency.
- **Authorization boundary:** The user authorized the completed external checkout modifications, exact catalog acquisition, bounded UniProt endpoint-existence `ASK`, orientation preflight, core-source discovery and redirect inspections, and the exact bounded core RDF acquisition recorded below. No competency query, unlisted source acquisition, federation, package installation, global configuration change, push, or other external write was authorized or performed.

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
- External commits `ba6f710` and `d4bec58` make acquisition redirects observable without following them: 3xx bodies remain unread, compact failure receipts cross the child boundary, and future empty fragment markers are normalized away. Offline checks and all 23 external tests pass.
- The approved metadata-only PURL inspection observed HTTP 303 to `https://purl.uniprot.org/html/index-en.html#` with one request, no retry, no followed redirect, and no body read. The [receipt](../../artifacts/experiment-results/2026-08-20-uniprot-core-redirect-inspection.json) preserves the exact observation. Its deliberately non-matching `Accept` makes this fallback-route evidence, not RDF content-negotiation evidence.
- A separately approved repeat with the exact RDF `Accept` header observed HTTP 303 to `https://sparql.uniprot.org/sparql/?query=PREFIX%20up:%3chttp://purl.uniprot.org/core/%3e%20DESCRIBE%20up:%20FROM%20up:`. The [receipt](../../artifacts/experiment-results/2026-08-20-uniprot-core-rdf-redirect-inspection.json) records one request, no retry, no followed redirect, and no body read. The newly discovered target was not contacted.
- A separately approved guarded GET to that exact target returned HTTP 200, 3,876 bytes of `application/rdf+xml`, and SHA-256 `da31ab55135f0864b47d95d9943dc44fd406a6cfc7fcb886e5ba7854d872cc86` in one attempt with no retry or followed redirect. It parsed completely into 25 quads. The [receipt](../../artifacts/experiment-results/2026-08-21-uniprot-core-acquisition.json) records that `owl:Ontology` was present but all required term-level markers were absent, so no immutable core profile was added.
- A Turtle-only check observed the HTTPS core namespace redirect to the same exact DESCRIBE target and retrieved 2,697 bytes of valid `text/turtle`, again parsing to 25 quads. `FROM up:` selects the core ontology named graph as the active default graph; `DESCRIBE up:` returns an endpoint-selected description of the ontology IRI and does not enumerate or bound that graph.
- A bounded repeat of the official `https://sparql.uniprot.org/uniprot` dataset description reproduced the existing 105,630-byte payload hash and exposed the main named graph's statistics plus core classes and predicates. It is a dataset/schema description, not the ontology serialization.
- Official GitHub inspection found the maintained manual pages that link the external `core.owl` release artifact, but no checked-in ontology file, WIDOCO input, or public build pipeline. The active `ebi-uniprot/uniprot-core` repository is Java domain-model/parser code; active SIB repositories hold the competency corpus and VoID-derived orientation tooling. The exact official `core.owl` HTTPS URL returned 404, and no mirror was acquired.
- Public issue/forum/archive discovery found no inspected direct question or first-party relocation answer. The closest registry and archive records repeat the stale URL, expose historical ontology snapshots, or record archival failure; they do not justify adding a mirror-backed broker profile.
- One approved marker-only `SELECT` used `FROM <http://purl.uniprot.org/core/>`, the exact five marker IRIs, an `rdf:type`/`rdfs:label` allowlist, and `LIMIT 10`. The kernel timed out before a result or receipt crossed back and was not retried. The [provenance receipt](../../artifacts/experiment-results/2026-08-21-uniprot-core-provenance-discovery.json) records the unavailable outcome without an absence claim.

### Supersession

- The fixed-profile transport described here remains historical evidence while the consumer-owned runtime is redesigned around behavior-bounded, open-world mediation.
- No future implementation or production configuration belongs in the sibling repository.
- Any real operation still requires separate current authorization; this historical task grants none.

### Exact next action

Use the consumer-owned clean-room package for all implementation and offline verification. Preserve the receipts below as immutable historical observations and do not reinterpret them as open-world traversal evidence.

## Handoff state

- **Git:** External checkout `/Users/cvardema/dev/git/LA3D/linked-science-cloud/node-repl-network-probe` remains unmodified on local `main` at `c0ab57e`. This provenance continuation began from consumer local `main` at `b3a5021`; result commit `bc53651` is reachable from consumer local `main`. Nothing was pushed.
- **Verification:** The guarded acquisitions, graph-model correction, GitHub/public provenance trace, and timeout boundary are durable. Consumer `npm test` passed 79/79, `npm run smoke` passed, `npm run evaluation:results:validate` passed with 24 registered runs, the new receipt parsed as JSON, all three registry tests passed, and `git diff --check` passed.
- **Live evidence:** The exact RDF-negotiated target has now been contacted once under approval and produced valid ontology metadata. It did not produce the term descriptions needed for a core-orientation profile. None of this evidence is a competency answer.
