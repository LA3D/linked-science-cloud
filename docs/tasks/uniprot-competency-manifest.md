# Task: Build the UniProt competency evaluation manifest

- **Status:** Ready
- **Owner/task:** Unassigned
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

### Decisions

- Official queries and example metadata are evaluator-only references, never worker templates.
- Worker-visible case IDs are opaque and do not expose official example numbers.
- The official examples catalog is held out during default worker trials.
- Federation and live execution are outside this task.

### Remaining work

- Define the public/private manifest schemas and storage boundary.
- Select the three official reference records in evaluator-only state and record source provenance and hashes.
- Add deterministic manifest and leakage validation.
- Document how a fresh worker checkout is constructed without the private bundle or contaminated legacy affordances.

### Exact next action

Draft the split manifest schemas and leakage-test fixture from the [methodology](../experiments/uniprot-competency-question-evaluation.md), using the three staged competency shapes and no live query execution.

### Blockers or required decisions

- Choose an evaluator-private storage location that is durable but absent from the worker-readable checkout before capturing any official query text.

## Handoff state

- **Git:** Not started.
- **Verification:** Methodology documentation only; manifest validation does not exist yet.
- **Ephemeral state:** None; no REPL state or live result is claimed.
- **Durable artifacts/receipts:** None yet.
