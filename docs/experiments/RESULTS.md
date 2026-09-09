# Experiment result registry

This is the durable index of executed experiment results. Methodology dossiers describe questions and protocols; they are not result artifacts. The machine-readable source of truth is [the result registry](../../artifacts/experiment-results/registry.json), validated by `npm run evaluation:results:validate`.

## Evidence grades

| Grade | Meaning |
| --- | --- |
| `machine-receipt` | A contemporaneous generated receipt is committed. |
| `resident-audited` | A compact receipt was captured by re-inspecting still-resident REPL state without re-querying. |
| `machine-audit` | A generated filesystem, provenance, or leakage audit is committed. |
| `trace-derived-partial` | A later artifact was reconstructed from a task trace after some resident evidence disappeared. Missing fields remain explicit. |
| `retrospective-summary` | Only committed prose survived. The new record indexes that prose and names the unavailable original evidence; it is not promoted to a contemporaneous receipt. |

`complete` means the intended compact result artifact is durable, not that the experiment proves a broad scientific or architectural claim. `summary-only` means the outcome is still described but cannot be independently replayed from a complete receipt.

## Executed runs

| Date | Run | Outcome | Durability | Durable record |
| --- | --- | --- | --- | --- |
| 2026-09-09 | E1 fixture preparation | Failed | Partial | [Receipt](../../artifacts/scoped-data-bridge/20260909-e1-worker-01/receipt.json) |
| 2026-09-09 | E1 fresh worker 1 | Passed: namespace probe | Partial | [Receipt](../../artifacts/scoped-data-bridge/bridge-20260909-e1-worker-01-retry/receipt.json) |
| 2026-09-09 | E1 fresh worker 2 | Passed: namespace probe | Partial | [Receipt](../../artifacts/scoped-data-bridge/bridge-20260909-e1-worker-02/receipt.json) |
| 2026-09-09 | E1 fresh worker 3 | Passed: namespace probe | Partial | [Receipt](../../artifacts/scoped-data-bridge/bridge-20260909-e1-worker-03/receipt.json) |
| 2026-08-15 | Single-turn Identifiers.org context-map recovery | Passed | Complete | [Receipt](../../artifacts/context-map-runs/context-map-2026-08-15T11-46-20-605Z.json) |
| 2026-08-15 | Two-turn coordinator-selected context-map recovery | Passed | Complete | [Turn 1](../../artifacts/context-map-runs/two-turn-turn-1-2026-08-15T11-53-16-471Z.json), [turn 2](../../artifacts/context-map-runs/two-turn-turn-2-2026-08-15T11-54-52-829Z.json) |
| 2026-08-15 | Open-goal UniProt P00338 `SELECT` navigation | Partial | Partial | [Trace-derived receipt](../../artifacts/open-goal-runs/2026-08-15-p00338-select.json) |
| 2026-08-15 | Open-goal UniProt P00533 `CONSTRUCT` navigation | Passed | Complete | [Resident-audited receipt](../../artifacts/open-goal-runs/2026-08-15-p00533-construct.json) |
| 2026-08-15 | Constrained clean-worker balanced-groups evaluation | Passed | Summary only | [Retrospective record](../../artifacts/experiment-results/retrospective-runs.json) |
| 2026-08-15 | Prior-grounding baseline arm | Passed | Summary only | [Retrospective record](../../artifacts/experiment-results/retrospective-runs.json) |
| 2026-08-15 | Prior-grounding method arm | Passed | Summary only | [Retrospective record](../../artifacts/experiment-results/retrospective-runs.json) |
| 2026-08-15 | Prior-grounding method-plus-pack arm | Passed | Summary only | [Retrospective record](../../artifacts/experiment-results/retrospective-runs.json) |
| 2026-08-15 | Guarded UniProt rendered-schema discovery | Passed | Summary only | [Retrospective record](../../artifacts/experiment-results/retrospective-runs.json) |
| 2026-08-15 | Fresh real-UniProt schema-fetch failure | Failed | Summary only | [Retrospective record](../../artifacts/experiment-results/retrospective-runs.json) |
| 2026-08-15 | Clean-worker preflight without a persistent-REPL receipt | Inconclusive | Summary only | [Retrospective record](../../artifacts/experiment-results/retrospective-runs.json) |
| 2026-08-15 | Clean-worker preflight answered from source rather than execution | Inconclusive | Summary only | [Retrospective record](../../artifacts/experiment-results/retrospective-runs.json) |
| Before 2026-08-20 | Historical coordinator-versus-worker Node REPL permission comparison | Inconclusive | Summary only | [Retrospective record](../../artifacts/experiment-results/retrospective-runs.json) |
| 2026-08-20 | Multi-turn clean-room context recovery and reset | Passed | Summary only | [Retrospective record](../../artifacts/experiment-results/retrospective-runs.json) |
| 2026-08-20 | Fresh Local clean-room bootstrap, persistence, and reset verification | Passed | Summary only | [Retrospective record](../../artifacts/experiment-results/retrospective-runs.json) |
| 2026-08-20 | Fresh-task broker activation and UniProt `ASK` preflight | Passed | Complete | [Resident-audited receipt](../../artifacts/experiment-results/2026-08-20-cleanroom-broker-preflight.json) |
| 2026-08-20 | Approved UniProt official-example catalog capture | Passed | Complete | [Capture receipt](../../artifacts/experiment-results/2026-08-20-uniprot-catalog-capture.json) |
| 2026-08-20 | Evaluator-private boundary and leakage audit | Passed | Complete | [Audit receipt](../../artifacts/experiment-results/2026-08-20-uniprot-evaluator-boundary-audit.json) |
| 2026-08-20 | First guarded UniProt and GO orientation-profile preflight | Partial | Partial | [Machine receipt](../../artifacts/experiment-results/2026-08-20-orientation-profile-preflight-attempt-1.json) |
| 2026-08-20 | Guarded UniProt core ontology source discovery | Failed | Complete | [Machine receipt](../../artifacts/experiment-results/2026-08-20-uniprot-core-source-discovery.json) |
| 2026-08-20 | Guarded UniProt core PURL redirect inspection | Passed | Complete | [Machine receipt](../../artifacts/experiment-results/2026-08-20-uniprot-core-redirect-inspection.json) |
| 2026-08-20 | RDF-negotiated UniProt core PURL redirect inspection | Passed | Complete | [Machine receipt](../../artifacts/experiment-results/2026-08-20-uniprot-core-rdf-redirect-inspection.json) |
| 2026-08-21 | Guarded UniProt core RDF acquisition and marker validation | Partial | Complete | [Machine receipt](../../artifacts/experiment-results/2026-08-21-uniprot-core-acquisition.json) |
| 2026-08-21 | UniProt core graph provenance and Turtle negotiation discovery | Partial | Complete | [Machine receipt](../../artifacts/experiment-results/2026-08-21-uniprot-core-provenance-discovery.json) |
| 2026-08-21 | Neutral consumer-owned mediated traversal live preflight | Failed | Complete | [Machine receipt](../../artifacts/experiment-results/2026-08-21-neutral-mediated-traversal-preflight.json) |
| 2026-08-22 | Neutral protocol 3.0.0 standard-Fetch live preflight | Partial | Complete | [Machine receipt](../../artifacts/experiment-results/2026-08-22-neutral-standard-fetch-preflight.json) |
| 2026-08-25 | First protocol 3.2.0 UniProt tier-0 baseline | Failed | Partial | [Trace-derived receipt](../../artifacts/experiment-results/2026-08-25-uniprot-tier0-baseline.json) |
| 2026-08-25 | Fresh UniProt tier-0 grounding-gate evaluation | Failed | Partial | [Trace-derived receipt](../../artifacts/experiment-results/2026-08-25-uniprot-tier0-grounded-gate.json) |
| 2026-08-25 | Non-clean-room UniProt tier-0 grounding diagnostic | Failed | Partial | [Trace-derived receipt](../../artifacts/experiment-results/2026-08-25-uniprot-tier0-observational-grounding.json) |
| 2026-08-25 | Persistent-harness UniProt tier-0 grounding evaluation | Partial | Partial | [Trace-derived receipt](../../artifacts/experiment-results/2026-08-25-uniprot-tier0-persistent-grounding.json) |

The first neutral preflight remains an immutable failed result whose `ERR_INVALID_IP_ADDRESS` cause belongs to the removed custom DNS/TLS connector. The protocol 3.0.0 replacement preflight completed one W3C Turtle exchange through standard Fetch, but the DBpedia exchange failed before a response completed. It therefore proves one real public RDF dereference and bounded exchange provenance, not a two-source join. No competency baseline ran.

The current inventory therefore contains 30 executed run records. The missing evidence and durability grade are enumerated per run in the machine registry. A complete artifact can preserve a failed or partial experiment; durability does not imply a successful outcome.

## Confirmed loss and recovery limits

- The P00338 resident state disappeared before artifact capture. Its per-query timestamps, methods, retries, and query hashes were not reconstructed.
- The eleven summary-only runs have no contemporaneous machine receipt in the repository. Their prose-backed summaries are durable now, but the original tool chronology and resident state are unavailable.
- The multi-turn context-recovery run deliberately reset its kernel; its task brief previously stated that no artifact was created.
- Attempts on 2026-08-20 to read the known historical Codex task IDs returned `Dynamic tool call belongs to a stale thread`. Old task history is therefore not treated as a recovery source unless it becomes readable later.
- Raw documents, full query results, and expired handles are intentionally not copied into this registry. Their absence is expected; losing the compact receipt is not.

## Capture rule for future experiments

Before resetting a kernel, closing a worker, or declaring an intentional experiment complete:

1. capture the compact tool/transport/result receipt while state is still resident;
2. write it under `artifacts/` without raw bulk data or secrets;
3. add one run entry to the machine registry with evidence grade, durability, documentation links, and explicit missing fields;
4. classify every experiment dossier as results-recorded, planned-only, fixture-only, offline-contract-only, decision-record, or preparation-only; and
5. run `npm run evaluation:results:validate` before committing.

If capture was missed, create a `retrospective-summary` record from durable sources and leave unavailable fields missing. Never upgrade prose reconstruction to a machine receipt.

Post-restart live activation: [passed scoped worker round trip](../../artifacts/scoped-data-bridge/live-20260909-session-activation-01/receipt.json), partial accounting durability.

E2 shared-session typed data: [latest partial result](../../artifacts/scoped-data-bridge/e2-20260909-shared-types-06/receipt.json). Attempts 1–3 recorded harness failures, attempt 4 basic equality checks, attempt 5 added scoped-query checks but hit a resident-profile harness assumption, and attempt 6 completed the comparisons. JSON input remains unsupported; named-graph broker-tier coverage remains unmeasured.

E2 after adapter additions: [48 checks passed](../../artifacts/scoped-data-bridge/e2-20260909-adapters-fixed-03/receipt.json), covering JSON inputs and native named-graph broker storage. Earlier partial attempts remain historical records.
