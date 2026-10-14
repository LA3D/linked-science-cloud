# Fabry presentation handoff — saved investigation

This is a saved, previously executed investigation from September 25–27, 2026. Explain the results; no new or live execution is required. The fresh voice chat must not imply it has rerun the queries or recovered old live handles.

## Scientific question and starting point

Can we start with a structured Fabry disease mechanism, connect it to the normal enzyme chemistry, then examine the evidence linking substrate accumulation to kidney-cell injury?

DisMech is a structured disease-mechanism knowledge base. Its Fabry record describes pathogenic GLA variants, reduced alpha-galactosidase A activity, lysosomal Gb3/lyso-Gb3 accumulation and organ-specific mechanisms. It includes identifiers, causal-link assertions, cell/anatomy annotations and cited evidence snippets. It is a curated source to inspect, not an automatic proof that every asserted edge is established.

We used the complete Fabry record pinned to DisMech commit 090fcc12aafac22e5e2b8454aab44ce6735579cb. The saved conversion contains 2,834 disease triples, 16 mechanism objects, 49 causal-edge objects and 175 evidence items. It used an explicitly adapted LinkML conversion, not an official native RDF release or a claim of complete OWL reasoning. Separate application links resolve literal causal-target names by exact unique matching.

## Identifier route and actual federation

The record's alpha-galactosidase deficiency mechanism names HGNC:4296. HGNC maps that gene to GLA and human UniProt P06280. UniProt links the protein's catalytic annotations to Rhea reactions 21112 and 48020 and physiological directional forms 21113 and 48021. Rhea supplies substrate/product roles and ChEBI identifiers.

We adapted the protein–reaction–participant pattern from published UniProt example 49 (https://sparql.uniprot.org/.well-known/sparql-examples/?offset=43). That published example currently targets N-acylsphingosine and includes Bgee; our Fabry adaptation explicitly starts from P06280, removes Bgee and uses directional reaction annotations. It is not the unchanged published example.

One SPARQL request went through the actual Linked Science REPL to the UniProt coordinator, containing SERVICE <https://sparql.rhea-db.org/sparql>. UniProt executed the Rhea service join using shared reaction IRIs. The first version, without explicit reaction pairs inside SERVICE, hit the 45-second deadline. The bounded revision included both verified GLA reaction/direction pairs and returned eight complete participant rows in 0.888 seconds. Preparation and diagnosis took substantially longer than that execution.

Preparation probes established mappings and predicate meanings. They were separate from the successful federation. Local SPARQL subsequently queried the saved disease and ontology graphs; that also was not remote federation.

## Verified chemistry

All rows concern human GLA/P06280:

| Rhea physiological reaction | Substrates | Products |
|---|---|---|
| 21113, directional form of 21112 | Gb3Cer class CHEBI:18313; water CHEBI:15377 | Corresponding lactosylceramide CHEBI:17950; D-galactopyranose CHEBI:4139 |
| 48021, directional form of 48020 | Broader Gb3Cer class CHEBI:88154; water CHEBI:15377 | Broader lactosylceramide CHEBI:79208; D-galactopyranose CHEBI:4139 |

There are four participant rows per reaction. The first equation specifies a d18:1(4E) sphingoid base; the second uses broader lipid classes. These are differently specified representations of Gb3 hydrolysis, not two consecutive pathway steps. Their chemical identifiers remain distinct. Direction comes from UniProt's physiological-reaction assertion and Rhea's explicit substrates/products predicates, not a guess from reaction numbering or left/right suffixes.

Interpretation: normal GLA chemistry removes a terminal galactose from Gb3Cer using water. The disease record describes deficient activity and substrate accumulation. The federation connects these annotations; it does not measure a patient's enzyme activity, tissue flux, variant severity or lyso-Gb3 turnover.

## Return to renal disease evidence

CHEBI:18313 is also explicitly attached to DisMech's “Lysosomal Gb3 and lyso-Gb3 accumulation” mechanism. The shared identifier anchors this source-asserted chain:

GLA deficiency → lysosomal accumulation → tissue-specific storage → renal glycosphingolipid storage and podocyte injury.

The three edges are classified DIRECT by DisMech. That classification does not mean our inspection found controlled human causal proof for every arrow. The renal node explicitly names podocyte CL:0000653 and kidney UBERON:0002113. The chemical annotation sits on the accumulation node, not directly on the renal node; the intervening edges must remain visible.

Three attached publications were inspected:

1. **Clinical relevance of globotriaosylceramide accumulation in Fabry disease and the effect of agalsidase beta in affected tissues** (2022), PMID:36334424, https://pubmed.ncbi.nlm.nih.gov/36334424/. Public abstract; review. It supports the broad association of reduced enzyme activity, GL3 accumulation and tissue damage. The same review is attached to the first two edges; it is not two independent experiments.
2. **Significant improvement in Fabry disease podocytopathy after 3 years of treatment with agalsidase beta** (2016), PMID:27129690, https://pubmed.ncbi.nlm.nih.gov/27129690/. Public abstract; one human case. A 10-year-old boy had normal renal function/urinalysis but podocyte GL-3 deposits, foot-process effacement and reduced nephrin on biopsy. Repeat biopsy after three years of treatment showed improvement. This supports observed storage and structural injury in that patient, not population-wide causal or treatment-effect estimates. The source passage includes “marked accumulation of GL-3 in podocytes, partial effacement of foot processes.”
3. **Genome-wide expression analysis in a Fabry disease human podocyte cell line** (2024), PMID:39100494 / PMC11295972, https://europepmc.org/articles/PMC11295972. Open full text; engineered immortalized human podocytes, not patient biopsies. GLA-edited cultures had reduced enzyme activity, increased total Gb3 and 247 differentially expressed genes. This supports a model-level enzyme/storage perturbation and pathway-associated expression changes. It does not resolve the exact CHEBI lipid class measured by the total-Gb3 assay.

The third paper is attached to a separate renal-injury → autophagy-impairment edge classified INDIRECT_KNOWN_INTERMEDIATES. Its attached snippet is background. The paper's own work is biochemical measurement plus transcriptomics; its discussion cites earlier studies for impaired autophagic flux. Do not present it as direct flux measurement or proof that injury causes autophagy impairment. The autophagy node has another citation, PMID:37014703, which was not retrieved within this three-paper scope. The defensible main chain ends at renal storage/structural injury.

## Ontology and rule contributions

The CL excerpt supplies labels and asserted named-parent relationships: podocyte CL:0000653 is a subclass of renal filtration cell CL:0002522 and epithelial cell of glomerular capsule CL:1000450. Uberon supplies the kidney identifier/label. Disease annotations provide the kidney location; no new part_of relation was inferred. These excerpts retain selected labels, definitions and is_a ancestry, not all imports, restrictions or ontology semantics.

The earlier EYE-family engine, Eyeron 0.5.13, executed this application-owned N3 rule on a small renal projection:

{ ?m a app:Mechanism; app:cellType ?cell; app:location obo:UBERON_0002113. }
=> { ?m a app:KidneyCellEvidenceSelectionCandidate. }

It derived exactly one candidate; two synthetic controls were not selected. The rule requires any cell annotation plus kidney location, not specifically podocytes or supporting evidence. A separate query retrieved evidence afterward. This is deterministic selection reasoning, not discovery of a biological mechanism, citation validation or full OWL inference. The saved result is reused; it was not rerun for the literature continuation.

## Workspace and memory

The actual project REPL retained JavaScript bindings, RDF/JS graphs, query results and resources, allowing bounded views without putting whole datasets in the conversation. Live state is temporary. When earlier Fabry bindings were absent, saved RDF and ontology excerpts were reloaded; old handles were not claimed restored. Durable raw resources, queries, receipts and reports are separate from that live state.

Repository memory was consulted selectively as advisory prior experience, not scientific authority. Current source probes and publication inspection supplied the evidence. Tomorrow's voice chat should use this briefing and saved results as its context, without assuming the old kernel still exists.

Keep three categories distinct: source-asserted disease/ontology claims; retrieved query and publication evidence; and rule-derived selection. The final biological interpretation is a qualified synthesis of them.

## Five-minute conversational walkthrough

- **Minute 1:** “We began with Fabry, not an arbitrary protein. The disease record gives us GLA and a substrate-storage mechanism.” Explain DisMech and the HGNC→UniProt mapping.
- **Minute 2:** “Shared reaction identifiers let a single query combine UniProt protein annotations with Rhea chemistry.” Show the saved eight-row result. Say it previously ran in 0.89 seconds after a broader version timed out; no live run is needed.
- **Minute 3:** Focus on Gb3 CHEBI:18313 as substrate, then return to the same identifier in the disease graph. Follow the asserted renal chain to podocyte/kidney.
- **Minute 4:** Contrast the human biopsy observation with the engineered-cell study. Explain why the latter does not automatically prove the autophagy arrow.
- **Minute 5:** Explain how ontology labels/hierarchy aid interpretation and how the rule selects relevant evidence without proving biology. End with: “What additional evidence would distinguish substrate-associated injury from a causal autophagy defect in human podocytes?”

Likely questions: Is the 0.89-second result the whole investigation? No, only the successful bounded request. Was it real federation? Yes, a SERVICE query coordinated at UniProt. Are the eight rows eight reactions? No, four participants for each of two reaction representations. Are these patient measurements? No; chemistry is curated, one paper is a human case, another is an engineered-cell experiment. Did reasoning prove causality? No, it derived an evidence-selection candidate. Is this a new Fabry mechanism? No, it connects and audits existing assertions.

## Optional backups

- Fabry federation/demo: artifacts/scientific-inspections/fabry-gla-federation-20260927/README.md
- Exact query, saved result, optional replay: same folder/query.rq, saved-result.json, replay.js
- Renal chain, publication passages and exact evidence IDs: artifacts/scientific-inspections/fabry-renal-literature-20260927/README.md and checkpoint.json
- Full RDF conversion/ontology audit: artifacts/scientific-inspections/fabry-full-graph-20260925/README.md
- Rule audit: artifacts/scientific-inspections/fabry-selection-20260925/README.md

No slides or infrastructure were changed. Scientific artifact checks passed; the broader registry validator retains an unrelated pre-existing missing-registration error for docs/experiments/scientific-trajectory-evidence.md.
