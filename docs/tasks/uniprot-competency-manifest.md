# Task: Build the UniProt competency evaluation manifest

- **Status:** Blocked after repository-local contract implementation
- **Owner/task:** Repository-local slice completed; evaluator-private completion unassigned
- **Scope:** Implement the split worker-visible and evaluator-private manifest for the first three staged UniProt competency shapes, plus leakage validation. Do not execute the evaluation or a live SPARQL query.
- **Authorization boundary:** Repository documentation/data-fixture edits only. Any official catalog acquisition needs current approval for that exact documentation source. No SPARQL, federation, export, package, configuration, remote, or push authorization is implied.
- **Starting point:** Begin from the then-current clean local `main` and record its commit.

## Outcome and acceptance evidence

Produce a versioned worker manifest containing only opaque case IDs, natural questions, approved-resource roles, profiles, and bounds; an evaluator-only reference bundle outside the worker-readable checkout containing official locators, queries, hashes, metadata, and semantic invariants; and an automated leakage audit proving the worker view contains no target query, official example identifier, distinctive query fragment, or expected answer.

The initial selection must cover VoID/current-release discovery, fixed-accession name/domain/component navigation, and GO process/function/component classification. Manifest validation must not contact a live endpoint.

## Current state

### Completed evidence

- The [methodology dossier](../experiments/uniprot-competency-question-evaluation.md) defines the corpus split, staged capabilities, rubric, protocol, selection principles, limits, and source boundary.
- The official catalog and core ontology roles were reviewed on 2026-08-20 without executing a SPARQL query.
- `evaluation/uniprot/worker-manifest.draft.json` records three opaque, explicitly non-dispatchable tier shapes. Pending profile names cannot be mistaken for approved profiles.
- Public worker and evaluator-private JSON schemas now separate exact questions/bounds from official locators, queries, hashes, semantic invariants, rubric applicability, and leakage markers.
- `lib/competency-evaluation-manifest.mjs` validates both views, canonical selection hashes, an allowlisted worker export, and broker filesystem-boundary attestations.
- The synthetic evaluator bundle is created only in an OS temporary directory during tests. Honeytoken injection is detected, and a merely separate directory without a broker read-denial receipt fails the audit.
- Local commit `bc3b7a3` (`feat: add isolated competency manifest contract`) contains the repository-local manifest milestone.

### Decisions

- Official queries and example metadata are evaluator-only references, never worker templates.
- Worker-visible case IDs are opaque and do not expose official example numbers.
- The official examples catalog is held out during default worker trials.
- Federation and live execution are outside this task.
- A checked-in draft is not dispatchable. `corpusSnapshotDigest: pending` and `status: draft` fail dispatch validation by design.
- Durable isolation requires a broker-enforced filesystem authority receipt; path separation alone is not accepted as evidence.

### Remaining work

- Select the three official reference records in evaluator-only state and record source provenance and hashes.
- Replace the three draft paraphrases with the exact official human-readable questions while preserving opaque public IDs.
- Materialize the allowlisted worker export under broker-enforced filesystem authority and run the real leakage audit.
- Review and replace the pending VoID and GO profile names only after exact immutable profiles exist.

### Exact next action

After current explicit approval for `https://sparql.uniprot.org/.well-known/sparql-examples/` and after the external broker can deny evaluator-private reads, capture the official catalog snapshot directly into evaluator-private storage, freeze the three references and hashes, update the public draft, and run `npm run evaluation:uniprot:validate` plus the private honeytoken audit. Do not execute SPARQL.

### Blockers or required decisions

- Current approval does not authorize acquiring the exact official catalog source.
- The current `cleanroom_node_repl` broker has not exposed a filesystem read-denial attestation surface, so evaluator-private authority is not yet proven.
- The draft VoID and GO profile names are placeholders, not reviewed or executable profiles.

## Handoff state

- **Git:** Repository-local contract begins at `bc3b7a3`; the hardening series was fast-forwarded into local `main` after verification. Nothing was pushed.
- **Verification:** `npm test` passed 76/76, `npm run smoke` passed, `npm run evaluation:uniprot:validate` passed, all relative Markdown links resolved, stale-contract search was empty, and `git diff --check` passed.
- **Ephemeral state:** None; no REPL state or live result is claimed.
- **Durable artifacts/receipts:** None yet.
