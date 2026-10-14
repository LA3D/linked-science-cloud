# Fabry through durable RLM handoffs — 29 September 2026

The actual project MCP completed the Fabry route with Codex-owned model work, an explicit parent computation and two nested review computations. All three finished; no requests remain pending. Runtime source code and client configuration were not changed.

## Scientific replay

| Operation | Observed result | Freshness / meaning |
|---|---|---|
| Disease and ontology loading | 2,834 + 65 + 154 + 141 triples; all four source hashes verified | Saved DisMech conversion and CL/Uberon excerpts, 25 September |
| Substrate anchor / renal chain / ontology | 1 / 5 / 4 rows | New local execution over saved graphs |
| UniProt reaction-domain probe | 2 mappings, on catalytic-activity annotations | Fresh remote query |
| UniProt–Rhea SERVICE federation | 8 participant rows | Fresh remote; two reaction representations, not sequential reactions |
| Exact / subclass kidney-epithelial match | 0 / 1 | Explicit SPARQL paths; not full OWL inference |
| Eyeron selection | 1 candidate; both controls excluded | Fresh explicit N3 rule execution on historical projection plus synthetic controls; raw proof not independently verified |
| UniProt–ChEMBL SERVICE federation | Human GLA IC50 = 70 nM, original 0.07 µM | Fresh remote inhibition measurement; not affinity or clinical benefit |
| PubChem crosswalk/descriptors | 2 rows; CID176077, C6H13NO4, molecular-weight descriptor 163.17 | Fresh remote; generic molar-mass unit; normalization/seeAlso does not imply owl:sameAs |
| Literature review | Public review, biopsy-case citation, engineered-cell passages | Historical 27 September excerpts, not fresh literature retrieval |

CHEBI:18313 joins the normal GLA substrate annotation to the saved accumulation mechanism. The curated main chain reaches renal storage/podocyte injury. The autophagy edge remains qualified: background discussion is not a direct flux measurement or demonstrated injury-to-autophagy causal direction. Its two result rows expand two intermediates from the same evidence rather than supplying independent studies. Model findings are synthesis, separate from source assertions and deterministic selection.

## New REPL behavior exercised

A new Fabry activity (e2f0d74c-afdf-4c4b-b0e1-7a3adfd4ec9e) excludes the earlier synthetic test and unused GSD activity. Fourteen complete bounded result/JSON snapshots were saved; the full source graphs remain retained native objects plus their preexisting source artifacts, not full durable graph checkpoints.

The parent yielded; Codex launched two workers with scoped saved-input grants. Each read actual native bindings and JSON through the session bridge, deposited a review, and was accepted. Chemistry and renal child computations resumed to completion before parent synthesis was accepted and resumed. All acceptance receipts report cleanup complete. An identical parent acceptance retry returned the same receipt. Model calls ran between completed MCP evaluations.

Fresh-workspace restoration reproduced the eight chemistry rows and five chain rows exactly with new handles. The original session subsequently became unavailable, consistent with the service's five-minute idle expiry. A fresh MCP owner connection recreated the same session ID, restored all 14 snapshots and recovered all three completed computations, with zero pending requests. Runtime-restored chemistry and chain rows and columns exactly matched the saved results. This verifies recovery after session loss; the service process was not restarted. PEEK's durable map records only selected saved references and loaded status; it does not restore permissions or choose historical activities.

This exposed a usability gap: the original MCP adapter remains attached to its closed session and has no detach/reconnect operation. Recovery required a fresh connection. The original full native graphs and handles are no longer live; their source artifacts and selected durable snapshots remain. The session ID and a numeric epoch alone do not distinguish kernel incarnations; new workspace and activity epochs are recorded in the recovery receipt.

## Evidence and reuse

- [receipt.json](receipt.json): identities, exact queries, source fingerprints, fresh broker receipts, rule/proof report, parent/child receipts and model syntheses.
- [results.json](results.json): complete bounded scientific result tables.
- `historical-literature.json`: dated source subset reviewed by the renal worker; preserved only in the laptop scientific-file area, excluded from repository synchronization.
- [restore-manifest.json](restore-manifest.json): exact session/activity/version references; no capability tokens.
- [restore.mjs](restore.mjs): selected durable loading into a fresh workspace, without remote reads or resetting any existing workspace.
- [recovery-check.json](recovery-check.json): actual new-owner-session recovery after the original session closed.

While attached as owner to the same scientific session, run in the actual project REPL:

```js
var fabRestoreModule=await import('file://'+nodeRepl.cwd+'/artifacts/scientific-inspections/fabry-durable-demo-20260929/restore.mjs');
var fabRestored=await fabRestoreModule.restoreFabry(linkedScience,nodeRepl);
nodeRepl.write(fabRestored.check);
```

Expected chemistryRows 8 and chainRows 5. This loader was successfully executed through the fresh MCP owner connection after session loss. Keep returned handles to inspect further. After a service restart, start it against the same private durable root and explicitly recreate/attach the recorded session ID before calling this loader. Owner capabilities are new and are deliberately not in these artifacts. No startup automation or service-process restart test was performed here.

The initial renal-worker read approval was resolved by inspecting public-source provenance; no boundary bypass occurred. Receipt output truncation was repaired by bounded capture. No source query was rerun merely for formatting. Memory consultation is recorded; incremental benefit is unknown. Registry validation retains the preexisting unrelated dossier-registration gap (see VALIDATION.md).
