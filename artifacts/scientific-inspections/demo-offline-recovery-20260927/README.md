# Offline GSD III and Fabry demo — rehearsed recovery

Ready for a local, offline demonstration. This is fresh local computation over saved September 25–27 evidence, not fresh remote retrieval and not restoration of the old kernel. No endpoint is required by the recovery script.

## Load after a kernel loss

Run this cell in the actual project `cleanroom_node_repl`, from the verified project checkout. Each invocation makes uniquely named workspaces and preserves existing contexts. Do not repeatedly reload during the same demo; reuse `demoRecovery`.

```js
var demoRecoveryModule = await import('file://' + nodeRepl.cwd + '/artifacts/scientific-inspections/demo-offline-recovery-20260927/recover.mjs');
var demoRecovery = await demoRecoveryModule.recover(linkedScience, nodeRepl.cwd);
nodeRepl.write({runId:demoRecovery.runId,gsdRows:demoRecovery.gsdPage.total,fabryRows:Object.fromEntries(Object.entries(demoRecovery.fabryPages).map(([k,p])=>[k,p.total]))});
```

Expected: GSD 7; Fabry anchor 1, chain 5, ontology 4. The loader verifies all 22 GSD resource hashes and the four Fabry graph hashes against existing manifests; its receipt fingerprints every loaded input. This invocation was actually executed successfully, and results remained readable on a second call. Newly generated context keys and exact epochs/handles are in [receipt.json](receipt.json).

## Four-minute Fabry route (primary)

1. State the question: connect deficient GLA chemistry and stored substrate to renal injury evidence. Explain that source bytes are historical; the local queries are executable now.
2. Show saved normal-enzyme chemistry, explicitly labeled historical federation:

```js
nodeRepl.write(demoRecovery.federation.results.bindings.map(r=>({reaction:r.physiologicalReaction.value,role:r.role.value,chemical:r.chebi.value})));
```

3. Execute the chemical-anchor query against the recovered graphs:

```js
var demoAnchorNow = await demoRecovery.fabryWs.query.run({sources:Object.values(demoRecovery.fabryGraphs),sparql:demoRecovery.fabryQueries.anchor});
nodeRepl.write((await demoRecovery.fabryWs.results.page(demoAnchorNow,{limit:2})).rows);
```

It returns CHEBI:18313 on the lysosomal accumulation mechanism. The earlier rehearsal's equivalent query is retained as `demoRecovery.fabryResults.anchor`.

4. Show the retained edge-level result in a compact view:

```js
nodeRepl.write(demoRecovery.fabryPages.chain.rows.map(r=>({from:r.sourceName.value,to:r.targetName.value,type:r.type.value,reference:r.reference?.value})));
```

Explain the main chain through renal storage/injury. The autophagy edge is a caveat: the cited model paper's background discussion is not its own direct flux measurement. The ontology result supplies named cell ancestry and labels; it does not establish biological causation. Historical EYE selection is saved, not rerun in this recovery.

Use the [original presentation handoff](../fabry-renal-literature-20260927/PRESENTATION-HANDOFF.md) for wording and literature qualifications.

## GSD III alternative (same scientific subject as original deck)

```js
nodeRepl.write((await demoRecovery.gsdWs.results.page(demoRecovery.gsdResult,{limit:10})).rows);
```

Seven links connect P35573 to HGNC, gene/phenotype MIM identifiers, PDB 8ZEQ, AlphaFold and Reactome. The 3,981-triple source graph is live as `demoRecovery.gsdGraph`. Original structure and pathway responses and both coordinate files remain available as saved bytes in `demoRecovery.gsdBytes`; no viewer or alignment was rehearsed. Explain the separate transferase and glucosidase activities using the [original GSD handoff](../sai-gsd3-20260925/README.md). Keep the source-specific 3.23/3.36 Å discrepancy and avoid clinical severity claims.

## Reliable fallback and limits

If REPL access fails, open [receipt.json](receipt.json): it contains complete small result pages and all eight saved federation rows. Present these explicitly as saved output, using the original Fabry briefing above. Do not use the old federation `replay.js` for the offline route: it attempts network access.

This is not a full kernel snapshot, a fresh literature review or a guarantee of future remote federation. Recovery uses local files and the installed project runtime. Old contexts were neither reset nor disposed. The script creates no files and performs no resource/traversal calls; receipt persistence was a separate authorized artifact write.
