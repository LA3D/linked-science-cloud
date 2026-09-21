# PubChem trajectory: pending WikiSkill proposal

Historical draft: direct user authorization and a later retained-runtime capture subsequently resolved the evidence gate. The applied proposal is [pubchem-20260921.json](pubchem-20260921.json). The text below preserves the earlier limitations and review block; it is not the current completion status.

Status: **draft, not applied**. Evidence class: **retrospective-summary**. All proposed lessons remain **candidate-not-generalized**. This document is not a validated wiki revision or active skill instruction.

Evidence: [selected originating-task handoff](../scientific/pubchem-20260921-retrospective/evidence.json). The read interface exposed scientific tool arguments/status and narrative, but omitted original MCP return payloads. Counts below are reported session observations, not independently reverified results.

## General methodology: resolve terms and inspect dependencies in symbolic context

When a scientific schema uses opaque identifiers, load the authoritative ontologies into the symbolic REPL, resolve labels and definitions, inspect relevant parent relationships, enumerate imports, and selectively load dependencies needed for the question. Record dependencies left unresolved; selective loading does not establish complete import closure. A shared namespace alone does not establish that two identifier families belong to the same ontology. Missing textual definitions can require inspecting structural axioms rather than inventing a definition.

The PubChem session is the worked example: its SHACL model reportedly referenced 20 SIO and 29 CHEMINF terms. SIO 1.61 and CHEMINF supplied labels; CHEMINF declared IAO, CDK, core, algorithms, and external imports. Four modules were inspected; IAO was not loaded. This supports the proposed general method, not a claim that its benefit has been demonstrated across independent tasks.

Applicability: ontology-backed scientific query design and interpretation. Revalidate when ontology versions, import graphs, question scope, or term definitions change. Missing evidence: original payloads/receipts, independent task transfer, comparison against other retrieval strategies, and complete import closure. Competing explanation: the ontology's organization and this task's vocabulary may account for the successful resolution.

## Separate schema meaning from observed endpoint usage

Ontology or SHACL occurrence does not establish use in a loaded dataset. The reported broad QLever usage query timed out; focused ASK probes then reported IAO is-about and the PubChem molecular-weight descriptor present, while two particular CDK rdf:type patterns were false. Treat timeout as unresolved, and false as scoped to the exact submitted pattern. A module can still matter indirectly through parent definitions even without directly asserted instances.

Applicability: checking whether a dataset uses a term or relationship. Missing evidence: raw ASK receipts, query timing/cost comparison, exhaustive usage testing. Revalidate for dataset releases and changed query patterns. Do not claim every CDK term is absent or that smaller probes are always faster.

## Preserve relationship semantics and experimental context across sources

Follow explicit cross-references to combine protein annotation with compound–assay–measurement evidence. Preserve the relationship type, organism, assay source, units, qualifiers, and unresolved isoform/mutation alignment. A cross-reference is not automatically owl:sameAs, and a link does not establish that a destination graph is already loaded. Greater-than measurements remain bounds. An illustrative LIMIT sample is not an exhaustive survey or potency ranking.

The reported EGFR example connects PubChem ACCP00533 to UniProt P00533, then joins assay endpoint values and qualifiers. Assay contexts differ and isoform/mutation matching was not established. Applicability: cross-database biological evidence synthesis. Missing evidence: original crosswalk/assay payloads and independent biological verification. Revalidate when source records, target identity, assay conditions, or units change.

## Dated source findings — September 21, 2026

The originating summary reports a 2,359-triple SHACL model, 14,675-triple SIO 1.61 ontology, and 2,882-triple CHEMINF ontology. It reports 30 external references and 351 PDB links for the EGFR record. The five-record assay sample includes different assays and qualified values; exact assay values remain in the evidence summary rather than being promoted into general guidance. These are retrospective claims pending original receipt capture.

## Existing patterns and omissions

The wiki already covers retained-result paging and WikiPathways identifier context. Do not create another generic display-limit recovery pattern from this summary. Parser repair on a text/plain Turtle resource and documentation links to Markdown are useful reported observations, but are omitted as separate patterns to keep this proposal focused and nonredundant.

## Completion boundary

No current wiki revision, skill behavior, or source runtime was changed. Original REPL state was not inspected or reset. No new scientific retrieval was performed. Before application, obtain a direct retained-evidence capture or eligible original tool evidence and build cited corpus records; preserve the difference between original observations and later capture. Do not relax the scientific eligibility validator to admit this summary.

Automatic approval review rejected the cross-task request to obtain a retained-evidence capture, citing insufficient trusted authorization for that request and downstream commit/push side effects. No retry or workaround was attempted. Commit and push have not been performed for this draft.
