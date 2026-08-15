# Open-goal UniProt operation-selection experiment

## Question

Can a fresh Codex worker use authoritative UniProt evidence and the persistent Linked Data REPL to answer a natural scientific question without a prescribed query trajectory? When the goal is naturally graph-shaped, will it select a graph-producing SPARQL operation rather than defaulting to a table?

## Design

Two fresh worker tasks ran directly in the saved `codex-repl` project. Both received only a scientific goal plus the existing read-only UniProt approval boundary. Neither prompt named a SPARQL operation, query, accession, ontology path, expected answer, or handle name.

| Run | Natural goal | Worker task |
| --- | --- | --- |
| P00338 factual navigation | Find one human protein with a documented catalytic activity and explain its protein → annotation → activity → reaction relationship. | `01a00632-679c-7e63-be22-983dd57ecabd` |
| P00533 relationship subgraph | Produce a compact relationship subgraph for one human protein, its catalytic-activity annotation, catalytic activity, and reaction. | `01a00678-64be-7531-8073-b15a6d760efb` |

Live access was limited to the pinned UniProt documentation profile and `uniprotRead` SPARQL profile. Workers were forbidden to contact other endpoints, modify files or configuration, install packages, commit, or push.

## Run 1 — factual navigation selected tables

The first worker used pretrained knowledge to propose UniProt `P00338` (`LDHA_HUMAN`) as a candidate, then verified it against the retrieved UniProt schema and live UniProt RDF. It made three bounded `SELECT` operations and retained three bindings handles:

- `human-catalytic-protein`: one row linking P00338 through a catalytic-activity annotation and activity to Rhea 23444;
- `catalytic-annotation-details`: a capped 10-row view of the exact annotation, activity, and reaction nodes;
- `catalyzed-reaction-equation`: one row giving the reaction equation.

The worker reported the reaction `(S)-lactate + NAD(+) = pyruvate + NADH + H(+)` and explicitly limited the claim to this verified candidate and bounded path. It did not contact Rhea directly.

This is a successful factual answer and a valid use of `SELECT`. It does not demonstrate source-driven discovery of the accession or operation diversity: the accession began as a prior hypothesis, and all three operations returned tables.

The worker verified the three handles at run completion. By the later artifact-capture turn, its REPL state was unavailable. Therefore the saved [P00338 receipt](../../artifacts/open-goal-runs/2026-08-15-p00338-select.json) is explicitly trace-derived and leaves unavailable per-query timestamps, methods, and hashes unknown.

## Run 2 — graph-shaped goal selected a graph

The second prompt asked for a relationship subgraph but did not name `CONSTRUCT`. The worker independently selected a bounded `CONSTRUCT` centered on candidate `P00533` and retained six quads under `human-egfr-catalytic-subgraph`. The observed graph states:

```text
P00533 rdf:type up:Protein
P00533 up:organism taxon:9606
P00533 up:annotation P00533#SIP5F6B6005642E54E6
P00533#SIP5F6B6005642E54E6 rdf:type up:Catalytic_Activity_Annotation
P00533#SIP5F6B6005642E54E6 up:catalyticActivity P00533#SIP5A6CD89DB205C09A
P00533#SIP5A6CD89DB205C09A up:catalyzedReaction Rhea:10596
```

It then used one bounded `SELECT` to verify the name `Epidermal growth factor receptor` and mnemonic `EGFR_HUMAN`. The exact live receipts and resident-handle audit are saved in the [P00533 receipt](../../artifacts/open-goal-runs/2026-08-15-p00533-construct.json).

The worker correctly stated that this one path does not establish the reaction equation, participants, direction, physiological status, or an exhaustive account of P00533 annotations. Rhea was not contacted.

## Trajectory assessment

The experiment supports these narrow conclusions:

- The persistent REPL, guarded query-to-handle operation, and worker-return path worked in fresh tasks.
- A natural factual goal elicited bounded tabular navigation; a natural graph-shaped goal elicited a bounded `CONSTRUCT` without operation-level prompting.
- Both workers retained large source/result state in the REPL, inspected only bounded views, and reported uncertainty.
- Pretrained accession knowledge functioned as a candidate hypothesis and was verified before it became the answer.

The experiment does **not** establish:

- exhaustive accession discovery;
- independent use of the official UniProt examples;
- actual worker use of the minimal evidence manifest—the second worker said the manifest confirmed its sources, but its visible trace contains no manifest read;
- an advantage over another method or prompt;
- behavior for `ASK`, `DESCRIBE`, federation, reset recovery, or large live results.

The HTML schema was inspected through string/anchor snippets. That was sufficient here but remains a potentially awkward tool surface; one successful trajectory is not enough evidence to replace it.

## Interpretation

No additional reasoning script or query template is warranted from these runs. The open goal plus minimal safety/evidence invariants allowed the worker to choose an operation appropriate to the requested result shape. Future experiments should continue to vary the natural information need and observe failures before tightening guidance.

The receipt-loss difference is operationally important: REPL handles are ephemeral, while Git artifacts are durable. When a run is intended as a recorded experiment, compact receipts should be captured before the worker session disappears; raw documents and full results should remain out of the artifact.
