# Fabry kidney-cell selection: bounded checkpoint

**Result: the proposed selection-rule claim works in the actual Linked Science REPL.** Eyeron 0.5.13 completed one explicit N3 rule, derived exactly one candidate classification, and did not select either synthetic control. A separate subsequent SPARQL query retrieved the selected mechanism's two directly linked supporting evidence records. This validates the supplied claim for slide 30; the slide itself was not inspected or edited in this checkpoint.

## Current source verified

Retrieved [DisMech Fabry_Disease.yaml](https://raw.githubusercontent.com/monarch-initiative/dismech/main/kb/disorders/Fabry_Disease.yaml) on 2026-09-25. Full source: 146,859 bytes, SHA-256 `9c804539eb3e6a465ec341a7d18399a07576988a2e9305cc0be6b4c19fcbacbc`. `main` is mutable; this byte hash, the independent saved source file, and its broker receipt identify the observed version. Their paths are in `checkpoint.json`.

The exact named node **Renal glycosphingolipid storage and podocyte injury** contains:

- Cell type `CL:0000653`, label podocyte.
- Location `UBERON:0002113`, label kidney.
- [PMID:27129690](https://pubmed.ncbi.nlm.nih.gov/27129690/), marked `SUPPORT`, `HUMAN_CLINICAL`. The source's biopsy snippet describes GL-3 accumulation and podocyte structural abnormalities.
- [PMID:36334424](https://pubmed.ncbi.nlm.nih.gov/36334424/), marked `SUPPORT`, `OTHER`, a review concerning tissue storage and damage.

These are verified **current DisMech annotations**, not an independent reassessment of the cited articles. No PubMed paper was fetched during this checkpoint. Downstream-edge evidence was deliberately excluded from this node-level projection.

## Explicit application-owned mapping

`urn:fabry-demo:` is a local application namespace, not a DisMech vocabulary or native RDF export. `source-node.yaml` preserves the exact selected source block. `source-projection.ttl` is the small hand-designed projection:

| YAML field | Application RDF mapping |
|---|---|
| Selected pathophysiology node | `app:renal a app:Mechanism`; name → `rdfs:label` |
| `cell_types[].term.id` | `app:cellType obo:CL_0000653` |
| `locations[].term.id` | `app:location obo:UBERON_0002113` |
| Node-level `evidence[]` | `app:hasEvidence app:evidence0` / `app:evidence1` |
| Evidence `reference` | `app:reference` → corresponding PubMed URL |
| Evidence `supports`, `evidence_source`, title, snippet | Literal-valued application properties and `rdfs:label` |
| Source URL | `app:projectedFrom`; immutable byte hash retained in checkpoint metadata |

Ontology IDs are expanded to OBO IRIs by the application. CL and UBERON ontologies were not loaded and no ontology axioms were inferred. The targeted extraction uses the exact YAML block delimiters and fields visible in this source, not a general YAML parser. Attempts to import YAML parsers found no installed package; none was installed. The saved replay checks the selected source identifiers and is intended only for this narrow checkpoint.

## Actual rule and result

The exact rule is saved as `rule.n3`:

```n3
@prefix app: <urn:fabry-demo:> .
@prefix obo: <http://purl.obolibrary.org/obo/> .
{ ?m a app:Mechanism;
     app:cellType ?cell;
     app:location obo:UBERON_0002113 . }
=> { ?m a app:KidneyCellEvidenceSelectionCandidate . } .
```

The rule does not require the cell annotation to be podocyte specifically; any present cell-type annotation satisfies that premise. It does not require supporting evidence in the antecedent. Evidence selection is the separate retrieval step below.

One derived triple, preserved in `derived.nt`:

```turtle
<urn:fabry-demo:renal> a <urn:fabry-demo:KidneyCellEvidenceSelectionCandidate> .
```

| Input | Cell annotation | Location | Derived candidate |
|---|---|---|---|
| DisMech renal node projection | Podocyte | Kidney | Yes |
| `app:controlOtherOrgan`, explicitly synthetic | Synthetic cell | Synthetic other organ | No |
| `app:controlKidneyNoCell`, explicitly synthetic | No annotation supplied | Kidney | No |

The two controls are saved separately in `synthetic-controls.ttl`, each typed `app:SyntheticControl`. Neither is a scientific DisMech assertion. Failure to select the second control means the rule lacks a premise; it does not establish that a real kidney mechanism lacks cells. No negative biological fact was inferred.

## Inference versus retrieval

Source projection and controls were retained as separate graphs. An explicit local `CONSTRUCT` merged them into a default-graph input because the first Eyeron profile accepts exactly one source. `ws.reasoning.run({sources:[fabInput], graphPolicy:'default-graph-only', rules:fabRule, proof:true})` executed the rule. Assertions were not overwritten; the classification resides in `fabRun.derived`.

Only **after** Eyeron completed, `evidence-query.rq` queried `[fabSource, fabRun.derived]`. It joined the candidate class to the source label and `app:hasEvidence`, requiring the source evidence status `SUPPORT`. The two returned rows are the renal mechanism with PMID:27129690 / HUMAN_CLINICAL and PMID:36334424 / OTHER. It did not infer either evidence relationship or its support status. `controls-query.rq` inspected membership in the derived graph for all three inputs.

This is an application selection policy with a traceable rule execution. It is not novel causal inference, a new kidney/podocyte relationship, a clinical conclusion, or evidence that SPARQL cannot express the same selection.

## Proof, runtime and reproducibility

`ws.reasoning.capabilities()` reported Eyeron 0.5.13 available in the mounted `cleanroom_node_repl`, authoritative saved checkout. The run completed in approximately 58 ms, with one derived triple, 2,760 serialized input bytes and a 936-byte N3 proof. Default execution bounds were 10 seconds, 1 MiB input/output/proof, 128 MiB Wasm linear memory and 64 MiB worker old-generation heap. No inference was substituted with model prose or SPARQL alone.

`proof.n3` contains the complete raw trace: `truncated:false`, `verified:false`. It records the binding `m=app:renal`, `cell=obo:CL_0000653`, and the three used premises. The engine labels leaf facts `<unknown>`; the application checkpoint supplies the source projection, exact YAML block, source hash and input hashes needed to trace their origin. The proof has not been independently checked, and is not a claim of scientific truth.

`checkpoint.json` retains capabilities, engine and transformed-Wasm hashes, rule/input/output/proof hashes, graph profiles, complete proof, selected source values, query rows and controls. `replay-cells.js` records source retrieval, explicit projection, Eyeron call and subsequent queries for the project MCP. Run cells in order in a uniquely named workspace; changing the public source is a new checkpoint. Current bindings remain resident under `fabWs`, `fabSource`, `fabControls`, `fabInput`, `fabRun`, `fabAnswer`, and `fabCheckpoint`. No session was reset.

Suggested precise slide wording: **“An explicit Eyeron rule classifies mechanisms annotated with a cell type and kidney location as candidates for kidney-cell evidence selection; a subsequent graph query retrieves their linked supporting evidence.”**

No worktree, branch switch, infrastructure repair, dependency installation, global configuration change, slide edit, simulation, or external mutation occurred. The checkpoint ends here.

Validation: saved source, rule and proof bytes match their recorded SHA-256 values; exactly one derived classification, two evidence rows and the expected three control outcomes were checked. The run is registered and registry schema validation passes. Full `npm run evaluation:results:validate` still reports the existing unrelated unregistered dossier `docs/experiments/scientific-trajectory-evidence.md`; no repair was attempted.
