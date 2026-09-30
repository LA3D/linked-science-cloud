---
{
  "schemaVersion": "1.0.0",
  "id": "protein-assay-crosswalk-context",
  "title": "Preserve experimental and claim context across biological joins",
  "lessonKind": "procedure",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "Follow explicit protein cross-references to combine annotation with assay evidence, retaining relationship type, organism, assay provenance, units and qualifiers. Keep greater-than values as bounds and preserve unresolved isoform or mutation alignment. Cross-references are not automatically identity assertions or proof a destination graph is loaded. An illustrative LIMIT sample is not a comprehensive survey or comparable potency ranking. PubChem EGFR and UniProt P00533 provide the worked example. For disease mechanism graphs, retrieve citations at their exact node/edge attachment, then inspect which passage is background, a measured result, review synthesis or interpretation. Record human case versus engineered in-vitro setting and abstract-only versus full-text access. In the Fabry renal inspection, a human biopsy case supported observed podocyte deposits/injury; a GLA-edited cell study measured enzyme activity/Gb3 and gene expression but cited earlier work for autophagic flux. Do not promote that background quote to a direct flux assay or proof of the injury-to-autophagy arrow. Distinguish source-asserted causality, identifier joins, ontology subclass traversal and an explicit EYE evidence-selection rule from biological inference. Deduplicate evidence items when ontology parents or intermediate mechanisms multiply query rows.",
  "applicability": "Cross-source biological interpretation joining protein annotations to compound–assay–measurement records. Also cell-specific disease mechanisms, renal/podocyte literature evidence, causal-edge citations, human versus model experiments, and autophagy interpretation.",
  "competingExplanations": [
    "Matching protein-record identity can coexist with different experimental constructs and assay systems.",
    "Different values for the same compound may reflect assay conditions rather than conflicting evidence.",
    "Storage and injury co-occurrence in one treated human case does not isolate causality; transcriptomic pathway annotation is not a functional flux measurement."
  ],
  "missingEvidence": [
    "No verified isoform or mutation alignment for every assay.",
    "No independent biological validation or comprehensive inhibitor survey.",
    "Assay systems differ; no normalized cross-assay potency comparison or selectivity claim.",
    "Only three Fabry publications were inspected; two at abstract level. The separate autophagy-node citation was not retrieved, and the prior selection-rule audit was reused rather than rerun."
  ],
  "revalidateWhen": "Source versions, ontology imports, dataset release, question scope or assay/identifier alignment changes.",
  "citations": [
    {
      "corpus": {
        "path": "artifacts/wiki-learning/corpus/pubchem-20260921.json",
        "sha256": "3bb81ff94d3779e7a7e06942c7c1ae72815e42e1fb562a52d77c9e1c401d7e68",
        "hashDomain": "file-bytes",
        "pointer": ""
      },
      "unitId": "crosswalk-assay",
      "evidenceIds": [
        "schema",
        "sio",
        "cheminf",
        "uniprot",
        "assay",
        "local-query"
      ],
      "eventIds": [
        "event-6"
      ],
      "operationIds": [
        "op-000045"
      ]
    },
    {
      "corpus": {
        "path": "artifacts/wiki-learning/corpus/fabry-trajectory-20260927.json",
        "sha256": "88d9a3a5d15bfe7f145e82014922767afcdebd1513d7fa13def4f58c30d9b3ad",
        "hashDomain": "file-bytes",
        "pointer": ""
      },
      "unitId": "renal-claim-evidence",
      "eventIds": [
        "event-1",
        "event-11",
        "event-12",
        "event-13",
        "event-14",
        "event-15"
      ],
      "evidenceIds": [
        "selected-trajectory",
        "renal-evidence",
        "rule-audit"
      ],
      "operationIds": []
    }
  ],
  "relations": {
    "supersedes": [],
    "contradicts": []
  }
}
---
# Preserve experimental and claim context across biological joins

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

Follow explicit protein cross-references to combine annotation with assay evidence, retaining relationship type, organism, assay provenance, units and qualifiers. Keep greater-than values as bounds and preserve unresolved isoform or mutation alignment. Cross-references are not automatically identity assertions or proof a destination graph is loaded. An illustrative LIMIT sample is not a comprehensive survey or comparable potency ranking. PubChem EGFR and UniProt P00533 provide the worked example. For disease mechanism graphs, retrieve citations at their exact node/edge attachment, then inspect which passage is background, a measured result, review synthesis or interpretation. Record human case versus engineered in-vitro setting and abstract-only versus full-text access. In the Fabry renal inspection, a human biopsy case supported observed podocyte deposits/injury; a GLA-edited cell study measured enzyme activity/Gb3 and gene expression but cited earlier work for autophagic flux. Do not promote that background quote to a direct flux assay or proof of the injury-to-autophagy arrow. Distinguish source-asserted causality, identifier joins, ontology subclass traversal and an explicit EYE evidence-selection rule from biological inference. Deduplicate evidence items when ontology parents or intermediate mechanisms multiply query rows.

## Applicability

Cross-source biological interpretation joining protein annotations to compound–assay–measurement records. Also cell-specific disease mechanisms, renal/podocyte literature evidence, causal-edge citations, human versus model experiments, and autophagy interpretation.

## Competing explanations

- Matching protein-record identity can coexist with different experimental constructs and assay systems.
- Different values for the same compound may reflect assay conditions rather than conflicting evidence.
- Storage and injury co-occurrence in one treated human case does not isolate causality; transcriptomic pathway annotation is not a functional flux measurement.

## Missing evidence

- No verified isoform or mutation alignment for every assay.
- No independent biological validation or comprehensive inhibitor survey.
- Assay systems differ; no normalized cross-assay potency comparison or selectivity claim.
- Only three Fabry publications were inspected; two at abstract level. The separate autophagy-node citation was not retrieved, and the prior selection-rule audit was reused rather than rerun.

## Revalidation

Source versions, ontology imports, dataset release, question scope or assay/identifier alignment changes.

## Evidence

- Corpus: artifacts/wiki-learning/corpus/pubchem-20260921.json (SHA-256 3bb81ff94d3779e7a7e06942c7c1ae72815e42e1fb562a52d77c9e1c401d7e68); unit: crosswalk-assay; events: event-6; evidence: schema, sio, cheminf, uniprot, assay, local-query; operations: op-000045.
- Corpus: artifacts/wiki-learning/corpus/fabry-trajectory-20260927.json (SHA-256 88d9a3a5d15bfe7f145e82014922767afcdebd1513d7fa13def4f58c30d9b3ad); unit: renal-claim-evidence; events: event-1, event-11, event-12, event-13, event-14, event-15; evidence: selected-trajectory, renal-evidence, rule-audit; operations: none.
