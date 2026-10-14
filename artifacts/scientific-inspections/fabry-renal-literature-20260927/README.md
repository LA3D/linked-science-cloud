# Fabry demo continuation: substrate chemistry to renal injury

**Question:** “Where does the Gb3 substrate from our GLA reaction appear in the disease graph, and what evidence connects it to podocyte injury?”

The defensible chain is **GLA deficiency → lysosomal Gb3 accumulation → tissue-specific storage → renal podocyte storage and structural injury**. These arrows are explicit DisMech assertions, with different evidence behind them. The normal-enzyme reaction does not itself prove the disease chain.

## The small chain and exact relationship meanings

| Step | Represented relationship | Attached evidence and what was checked |
|---|---|---|
| Federated GLA reaction → CHEBI:18313 | Rhea lists CHEBI:18313 as a **substrate** of physiological reaction 21113. The disease graph independently uses the **same IRI** in `dm:chemical_entities/dm:term` on “Lysosomal Gb3 and lyso-Gb3 accumulation.” | Shared chemical identity is a cross-source join, not a causal edge. CHEBI:88154 from the broader reaction stays distinct. |
| Alpha-galactosidase A deficiency → lysosomal accumulation | Source `dm:downstream` CausalEdge, classified **DIRECT**; description says reduced activity prevents normal lysosomal clearance. | Edge `/pathophysiology/0/downstream/0`, evidence `/evidence/0`: **PMID:36334424**, SUPPORT, OTHER. Retrieved review abstract connects reduced enzyme activity and storage; it is secondary synthesis. |
| Lysosomal accumulation → tissue-specific storage | Source CausalEdge, **DIRECT**; description contextualizes the shared storage lesion across organs. | Edge `/pathophysiology/1/downstream/2`, evidence `/evidence/0`: **PMID:36334424**. Its abstract reports storage correlating with cellular/organ damage. This is not an independent intervention proving this arrow. |
| Tissue-specific storage → renal storage and podocyte injury | Source CausalEdge, **DIRECT**; description identifies kidney/podocyte storage as the renal branch. | Edge `/pathophysiology/2/downstream/0`, evidence `/evidence/0`: **PMID:27129690**, SUPPORT, HUMAN_CLINICAL. Human biopsy observations directly establish co-occurring deposits and podocyte structural abnormalities in the reported patient. |

Paths above are source JSON-pointer suffixes. Exact artifact IRIs are `https://example.org/fabry-checkpoint/node/` plus the percent-encoded pointer, with `/evidence/0` appended **before** encoding. All complete edge/evidence IRIs, snippets and descriptions are in `checkpoint.json` and returned by `chain.rq`. These are checkpoint-local identifiers, not official publication IDs.

`dm:target` is originally a literal name. The separate application graph's `app:resolvedTarget` connects it to the unique matching node. This resolution makes the source assertion traversable; it does not infer or strengthen causality. “DIRECT” is the source's classification, not our assessment that a controlled human causal experiment proves the edge.

## Three publications: what they support

**1. PMID:36334424 — 2022 clinical review.** [Publication record](https://pubmed.ncbi.nlm.nih.gov/36334424/). The retrieved abstract describes enzyme reduction, GL3/metabolite accumulation and tissue damage; it supplies the broad biochemical/tissue context for the first two edges. Relevant source passage: “correlates to cellular damage and irreversible organ damage.” This is a review, not a new podocyte experiment. Europe PMC marked the full text non-open-access and supplied a subscription DOI; only its public abstract was inspected.

**2. PMID:27129690 — 2016 human case report.** [Publication record](https://pubmed.ncbi.nlm.nih.gov/27129690/). The public abstract reports a 10-year-old boy with low enzyme activity and a GLA variant. Renal function and urinalysis were normal, but biopsy showed podocyte deposits, foot-process effacement and reduced nephrin. Relevant passage: “marked accumulation of GL-3 in podocytes, partial effacement of foot processes.” A repeat biopsy after three years of enzyme replacement showed reduced deposits and structural improvement. This is longitudinal evidence from one patient, without a randomized comparator; it does not establish population-wide timing, treatment efficacy or storage as the sole cause of injury. Full text was not openly available in the retrieved metadata, so the assessment is abstract-based.

**3. PMID:39100494 / PMC11295972 — 2024 engineered human podocyte study.** [Open full text](https://europepmc.org/articles/PMC11295972), CC BY. The experiment used immortalized human podocytes edited at GLA with CRISPR/Cas9 and control cultures, not renal biopsies from Fabry patients. It measured markedly reduced alpha-galactosidase activity and increased total Gb3 in edited cells. Relevant results passage: “total Gb3 level was significantly higher in CRISPR/Cas9-modified podocytes compared to the controls.” RNA-seq identified 247 differentially expressed genes; the authors associated some with stress and autophagy pathways.

This third paper is attached in DisMech to a **different edge**: renal podocyte injury → autophagy impairment, classified **INDIRECT_KNOWN_INTERMEDIATES**, with lysosomal dysfunction in GLA-edited podocytes and a cellular stress response named as intermediates. The edge's quoted snippet is a background statement about Fabry pathogenesis. The paper's autophagy discussion cites earlier studies for disrupted flux; its own evidence here is enzyme/substrate measurement plus transcriptomic/functional analysis, not direct measurement of autophagic flux. Thus it supports the model context and altered pathway-associated expression, but does not by itself validate the directional claim that injury causes impaired autophagy.

The autophagy **node** has a separate attached reference, PMID:37014703. It was not retrieved in this bounded three-publication continuation and must not be treated as inspected support. The main demo chain therefore ends at renal storage/structural injury; autophagy is a clearly qualified follow-up branch.

## Cell and anatomy, without confusing ontology with disease evidence

The renal mechanism explicitly has cell type **podocyte, CL:0000653**, and location **kidney, UBERON:0002113**, through the disease graph's descriptor slots. The retained CL excerpt asserts podocyte `rdfs:subClassOf` **renal filtration cell, CL:0002522**, and **epithelial cell of glomerular capsule, CL:1000450**. These are class-hierarchy relations, not causal assertions or evidence of damage. Kidney location comes from DisMech; no new CL/Uberon `part_of` relation was inferred.

The local ontology/evidence query returns four rows because two parent classes cross with two node-level references. That is **two evidence items, not four independent studies**. The causal query similarly returns five rows for four edges because the autophagy edge names two intermediates.

The earlier [renal N3 selection result](../fabry-selection-20260925/README.md) is reused as saved evidence, without rerunning it. Its rule selected one mechanism because it had a kidney location and a cell-type annotation; it did not infer podocyte injury, establish causality, or validate citations. The new full-graph traversal and publication inspection are separate steps.

## What remains missing

- The graph's shared chemical annotation is on the accumulation node, not directly on the renal node. The connection to kidney is the explicit downstream chain and its literature, not a direct renal CHEBI assertion.
- The accumulation node names both Gb3 and lyso-Gb3, but CHEBI:18313 identifies the Gb3 term. The normal GLA reaction does not establish lyso-Gb3 chemistry or turnover.
- The human case establishes observed storage and structural injury; it does not isolate the causal contribution of storage from other mechanisms.
- The model measured total Gb3, not a class-resolved assay proving the exact CHEBI:18313 species assignment.
- The inspected model study does not independently prove the graph's injury → autophagy direction. No new mechanism assertion is added.

## Short demo continuation

1. From the successful GLA reaction, select substrate **CHEBI:18313**. Run `anchor.rq` to find the existing accumulation mechanism.
2. Show the three asserted arrows ending at podocyte/kidney injury, with **CL:0000653** and **UBERON:0002113**. Keep the source's arrow classification visible.
3. Open the **human case-report abstract** beside the biopsy edge, then contrast it with the **engineered-cell full text** beside the qualified autophagy branch. Ask what each study actually measured.
4. End with: **“What additional evidence would distinguish substrate-associated injury from a causal autophagy defect in human podocytes?”** This is a question for further work, not an answer inferred from the rule.

The older live graph bindings were absent in this kernel, so the saved full disease RDF, application links and CL/Uberon excerpts were reloaded into `renalWs`; no lost handles were claimed restored. Full publication responses remain in broker artifacts listed in the checkpoint. Queries and complete local result rows are saved alongside this report. No slides, infrastructure or disease assertions were changed.
