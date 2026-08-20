# Task: Build the UniProt competency evaluation manifest

- **Status:** Evaluator-private selection complete; blocked on reviewed orientation profiles before dispatch
- **Owner/task:** Repository and evaluator-private freeze completed in the current task; profile review remains unassigned
- **Scope:** Implement the split worker-visible and evaluator-private manifest for the first three staged UniProt competency shapes, plus leakage validation. Do not execute the competency evaluation.
- **Authorization boundary:** The user authorized repository modifications, the exact official catalog acquisition, durable evaluator-private construction, and one exact bounded UniProt `ASK` transport preflight. No competency-case query, federation, package, configuration, remote, push, or other source access was authorized or performed.
- **Starting point:** Begin from the then-current clean local `main` and record its commit.

## Outcome and acceptance evidence

Produce a versioned worker manifest containing only opaque case IDs, natural questions, approved-resource roles, profiles, and bounds; an evaluator-only reference bundle outside the worker-readable checkout containing official locators, queries, hashes, metadata, and semantic invariants; and an automated leakage audit proving the worker view contains no target query, official example identifier, distinctive query fragment, or expected answer.

The initial selection must cover VoID/current-release discovery, fixed-accession name/domain/component navigation, and GO process/function/component classification. Manifest validation must not contact a live endpoint.

## Current state

### Completed evidence

- The [methodology dossier](../experiments/uniprot-competency-question-evaluation.md) defines the corpus split, staged capabilities, rubric, protocol, selection principles, limits, and source boundary.
- The official catalog and core ontology roles were reviewed on 2026-08-20 without executing a SPARQL query.
- `evaluation/uniprot/worker-manifest.draft.json` records three opaque, explicitly non-dispatchable tier shapes. Pending profile names cannot be mistaken for approved profiles.
- The exact catalog snapshot is frozen in evaluator-private storage with HTTP metadata and SHA-256 `9b9cccf7d5863c0c6a2a79385790a11720ea7e9fa4f2266cb0d802f69ad48f38`.
- The three exact official questions are exposed in the public draft while the official locators, queries, query hashes, semantic invariants, rubric applicability, and leakage markers remain evaluator-private. The private selection digest is `5dc42c39aa40f72afe70458803e5bcc70d5a0b2ba93506a822cb7d04687d9616`.
- Public worker and evaluator-private JSON schemas now separate exact questions/bounds from official locators, queries, hashes, semantic invariants, rubric applicability, and leakage markers.
- `lib/competency-evaluation-manifest.mjs` validates both views, canonical selection hashes, an allowlisted worker export, and broker filesystem-boundary attestations.
- The synthetic evaluator bundle is created only in an OS temporary directory during tests. Honeytoken injection is detected, and a merely separate directory without a broker read-denial receipt fails the audit.
- A real worker export and broker-enforced evaluator-private probe passed the leakage audit; an independent attempt from the active clean-room child also failed with `ERR_ACCESS_DENIED`.
- A separately approved broker-owned endpoint-existence `ASK` returned HTTP 200 and a native boolean handle in one attempt with no retry. It is activation evidence, not a competency result.
- Local commit `bc3b7a3` (`feat: add isolated competency manifest contract`) contains the repository-local manifest milestone.

### Decisions

- Official queries and example metadata are evaluator-only references, never worker templates.
- Worker-visible case IDs are opaque and do not expose official example numbers.
- The official examples catalog is held out during default worker trials.
- Federation and live execution are outside this task.
- A checked-in draft is not dispatchable. `status: draft` fails dispatch validation by design, and a `ready` manifest now rejects pending, placeholder, or unreviewed profile names.
- Durable isolation requires a broker-enforced filesystem authority receipt; path separation alone is not accepted as evidence.

### Remaining work

- Establish exact immutable VoID, machine-readable UniProt core, and GO orientation acquisition profiles under current source-specific approvals.
- Replace the pending orientation profile names, revalidate the public/private correspondence, and only then change the public manifest to `ready`.
- Run the actual competency cases only in separately approved fresh tasks under the frozen commit, runtime, profiles, and evaluation protocol.

### Exact next action

Review the exact source URL, expected media type, byte ceiling, redirect policy, and parsing contract for each of the VoID, machine-readable UniProt core, and GO orientation resources. Obtain separate current approval before acquiring any of them or adding their immutable external broker profiles.

### Blockers or required decisions

- The draft VoID and GO profile names are placeholders, not reviewed or executable profiles.
- The existing `uniprotRdfSchema` repository profile retrieves rendered HTML and has not yet been accepted as the machine-readable core-orientation profile required by the competency protocol.

## Handoff state

- **Git:** This continuation started from clean local `main` at `a1830a0` on branch `codex/uniprot-private-bundle`. Nothing was pushed.
- **Verification:** Targeted manifest tests, private bundle validation, active-child read denial, and the real exported-worker leakage audit passed. Full repository verification is recorded in the completion commit handoff.
- **Ephemeral state:** The endpoint preflight's native handle belongs to the restarted clean-room kernel and is not a durable scientific result.
- **Durable artifacts/receipts:** Evaluator-private bundle, catalog snapshot/headers, provenance receipt, and filesystem-boundary attestation live under `/Users/cvardema/dev/git/LA3D/linked-science-cloud/evaluator-private/uniprot-competency/2026-08-20-223052Z`; the private official mappings and queries must not be copied into the worker checkout.
