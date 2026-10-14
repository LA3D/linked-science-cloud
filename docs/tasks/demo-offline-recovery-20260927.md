# GSD III / Fabry offline demo recovery

The actual project REPL successfully reconstructed both routes from saved bytes in fresh workspaces. See the [tested demo and exact recovery steps](../../artifacts/scientific-inspections/demo-offline-recovery-20260927/README.md) and [machine receipt](../../artifacts/scientific-inspections/demo-offline-recovery-20260927/receipt.json).

GSD: 3,981 graph triples, seven cross-references. Fabry: four graphs totaling 3,194 triples; chemical-anchor 1 row, chain 5 rows, ontology 4 rows; eight historical federation rows. Handles persisted across a second call. Source hashes were verified locally. No remote request, reset, restart, disposal, package installation or commit was performed.

Recovery adds new epochs; it does not restore historical handles. The original evidence qualifications and source dates remain. N3 reasoning is available as saved rule/output/proof, not newly executed. Branch main, starting HEAD 485cb2786850e02414fcbfce9856f05d2a2cc51f; changes left uncommitted and unrelated work preserved. Verification results are recorded in the artifact area's VALIDATION.md.
