# Task: Build the UniProt competency evaluation manifest

- **Status:** Neutral live preflight failed at the DNS-pinned HTTPS handoff; baseline gate closed
- **Owner/task:** Repository/private freeze, leakage boundary, and offline mediated-traversal verification completed; a future baseline requires a fresh authorization and frozen commit
- **Scope:** Implement the split worker-visible and evaluator-private manifest for the first three staged UniProt competency shapes, plus leakage validation. Do not execute the competency evaluation.
- **Authorization boundary:** Historical source-discovery operations are recorded in the result registry. One separately authorized neutral live infrastructure preflight ran on 2026-08-21; no competency query, baseline worker, evaluator-private access, remote write, or push was performed.
- **Starting point:** Begin from the then-current clean local `main` and record its commit.

## Outcome and acceptance evidence

Produce a versioned worker manifest containing only opaque case IDs, natural questions, generic resource roles, and traversal budgets; an evaluator-only reference bundle outside the worker-readable checkout containing official locators, queries, hashes, metadata, and semantic invariants; and an automated leakage audit proving the worker view contains no target query, official example identifier, distinctive query fragment, expected answer, endpoint hint, or hidden query path.

The initial selection must cover VoID/current-release discovery, fixed-accession name/domain/component navigation, and GO process/function/component classification. Manifest validation must not contact a live endpoint.

## Current state

### Completed evidence

- The [methodology dossier](../experiments/uniprot-competency-question-evaluation.md) defines the corpus split, staged capabilities, rubric, protocol, selection principles, limits, and source boundary.
- The official catalog and core ontology roles were reviewed on 2026-08-20 without executing a SPARQL query.
- `evaluation/uniprot/worker-manifest.draft.json` records three opaque, explicitly non-dispatchable tier shapes with the same generic mediated-public-HTTPS access class and traversal budgets. It contains no task-specific endpoint or profile name.
- The exact catalog snapshot is frozen in evaluator-private storage with HTTP metadata and SHA-256 `9b9cccf7d5863c0c6a2a79385790a11720ea7e9fa4f2266cb0d802f69ad48f38`.
- The three exact official questions are exposed in the public draft while the official locators, queries, query hashes, semantic invariants, rubric applicability, and leakage markers remain evaluator-private. The private selection digest is `5dc42c39aa40f72afe70458803e5bcc70d5a0b2ba93506a822cb7d04687d9616`.
- Public worker and evaluator-private JSON schemas now separate exact questions/bounds from official locators, queries, hashes, semantic invariants, rubric applicability, and leakage markers.
- `lib/competency-evaluation-manifest.mjs` validates both views, canonical selection hashes, an allowlisted worker export, and broker filesystem-boundary attestations.
- The synthetic evaluator bundle is created only in an OS temporary directory during tests. Honeytoken injection is detected, and a merely separate directory without a broker read-denial receipt fails the audit.
- A real worker export and broker-enforced evaluator-private probe passed the leakage audit; an independent attempt from the active clean-room child also failed with `ERR_ACCESS_DENIED`.
- A separately approved broker-owned endpoint-existence `ASK` returned HTTP 200 and a native boolean handle in one attempt with no retry. It is activation evidence, not a competency result.
- Exact VoID-description and GO-orientation acquisitions succeeded and their immutable external profiles are on the external checkout's local `main` at `2cbbd98`.
- The proposed FTP `core.owl` and RDF-directory paths returned HTTP 404. The exact core PURL redirected, and the zero-redirect guard correctly stopped without following or substituting it. Both rounds have durable machine records in the result registry.
- A metadata-only retry preserved the PURL's HTTP 303 fallback target as `https://purl.uniprot.org/html/index-en.html#`, with no body read or redirect followed. Because the safety probe deliberately requested a non-matching media type, it did not establish the RDF-negotiated target and did not unblock the core profile.
- A separately approved RDF-`Accept` metadata inspection identified the exact target as `https://sparql.uniprot.org/sparql/?query=PREFIX%20up:%3chttp://purl.uniprot.org/core/%3e%20DESCRIBE%20up:%20FROM%20up:`. The target was not contacted, so it is source-discovery evidence rather than a validated acquisition profile.
- The subsequently approved exact acquisition returned valid RDF/XML ontology metadata (3,876 bytes, 25 parsed quads, matching broker/content hash) but lacked every term-level marker required by tiers 1 and 2. The profile and worker manifest were therefore not promoted.
- The graph-model correction is now durable: `http://purl.uniprot.org/core/` is the core ontology named graph. `FROM up:` selected it as the active default graph, but `DESCRIBE up:` described only the ontology IRI; the 25-quad RDF/XML and Turtle results do not bound the graph. The [provenance receipt](../../artifacts/experiment-results/2026-08-21-uniprot-core-provenance-discovery.json) records the distinction.
- The official dataset description exposes a core-term schema, while official GitHub inspection found documentation and derived VoID/SHACL tooling but no authoritative ontology file or public build pipeline. UniProt's maintained manual links the external `core.owl` release artifact, whose official HTTPS URL currently returns 404.
- A broader public search found no inspected direct question or first-party answer resolving the missing artifact. Bioregistry repeats the unavailable official URL, BioPortal exposes a 2026 upload of the historical `v2012-10-03` ontology, Archivo records a failed 2025 versioning attempt, and a 2011 SIB tutorial points to an obsolete `core.rdf` URL. None is authoritative current-source evidence.
- One historical marker-only query against the core graph timed out before a result or broker receipt crossed the clean-room boundary. It was not retried and does not support a term-absence claim. Its proposed fixed-profile replacement was rejected and is preserved only as superseded design history.
- The production clean-room runtime now exposes behavior-bounded mediated traversal: local Communica can dereference dynamically discovered public HTTPS RDF sources and govern `SERVICE` federation one request at a time. Synthetic two-source and two-service fixtures prove retained handles and complete lineage without live access.
- The first separately authorized neutral live preflight used the W3C Tim Berners-Lee FOAF card and DBpedia Ada Lovelace Turtle document. Its single attempt failed before any HTTP hop with `ERR_INVALID_IP_ADDRESS`; the [machine receipt](../../artifacts/experiment-results/2026-08-21-neutral-mediated-traversal-preflight.json) records two scheduled origins, zero hops, zero bytes, zero retries, abort/closure, and no retained handle. No competency question, worker, baseline, or evaluator-private material ran.
- Local commit `bc3b7a3` (`feat: add isolated competency manifest contract`) contains the repository-local manifest milestone.

### Decisions

- Official queries and example metadata are evaluator-only references, never worker templates.
- Worker-visible case IDs are opaque and do not expose official example numbers.
- The official examples catalog is held out during default worker trials.
- Live execution remains outside this task. Federation support is verified only with offline synthetic fixtures.
- A checked-in draft is not dispatchable. `status: draft` fails dispatch validation by design; readiness requires a separately frozen run commit and authorization, not a case-specific transport profile.
- Durable isolation requires a broker-enforced filesystem authority receipt; path separation alone is not accepted as evidence.

### Remaining work

- Diagnose and fix the DNS-pinned HTTPS transport handoff offline. Do not infer successful live traversal from the offline fixture suite.
- After a verified fix, obtain separate authorization for one new neutral bounded live preflight; preserve its receipt without running a competency case.
- Freeze and review the exact production commit, effective generic traversal budgets, worker export, and evaluator-private correspondence.
- Run the first competency case only in a separately authorized fresh task. Record and privately evaluate the baseline before any prompt or transport tuning, then stop before additional cases.

### Exact next action

Diagnose the failed neutral preflight without rerunning it. After a fix and separately authorized new neutral preflight pass, freeze the implementation and seek separate authorization for exactly one fresh-worker baseline and private evaluation. Keep the worker manifest `draft` until those gates are satisfied.

### Blockers or required decisions

- The DNS-pinned HTTPS handoff is an implementation blocker. Diagnose and fix it offline; a new user decision is then required before another live preflight, and the baseline remains separately authorization-bound.

## Handoff state

- **Git:** The private-bundle milestone originated from clean local `main` at `a1830a0`. This provenance continuation began from consumer local `main` at `b3a5021`; result commit `bc53651` is reachable from consumer local `main`. Nothing was pushed.
- **Verification:** Targeted manifest tests, private bundle validation, active-child read denial, and the real exported-worker leakage audit passed previously. The 2026-08-21 neutral live preflight failed before an HTTP hop and is durably recorded as the 25th registered run; postflight verification for that receipt is recorded in its result commit.
- **Ephemeral state:** The failed neutral preflight retained no result handle. Its traversal session was aborted and unavailable before the clean-room kernel reset to epoch 3.
- **Durable artifacts/receipts:** Evaluator-private bundle, catalog snapshot/headers, provenance receipt, and filesystem-boundary attestation live under `/Users/cvardema/dev/git/LA3D/linked-science-cloud/evaluator-private/uniprot-competency/2026-08-20-223052Z`; the private official mappings and queries must not be copied into the worker checkout.
