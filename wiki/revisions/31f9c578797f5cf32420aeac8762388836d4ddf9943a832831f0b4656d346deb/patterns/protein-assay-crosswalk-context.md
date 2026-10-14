---
{
  "schemaVersion": "1.0.0",
  "id": "protein-assay-crosswalk-context",
  "title": "Join protein and assay evidence while preserving measurement context",
  "lessonKind": "procedure",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "Follow explicit protein cross-references to combine annotation with assay evidence, retaining relationship type, organism, assay provenance, units and qualifiers. Keep greater-than values as bounds and preserve unresolved isoform or mutation alignment. Cross-references are not automatically identity assertions or proof a destination graph is loaded. An illustrative LIMIT sample is not a comprehensive survey or comparable potency ranking. PubChem EGFR and UniProt P00533 provide the worked example.",
  "applicability": "Cross-source biological interpretation joining protein annotations to compound–assay–measurement records.",
  "competingExplanations": [
    "Matching protein-record identity can coexist with different experimental constructs and assay systems.",
    "Different values for the same compound may reflect assay conditions rather than conflicting evidence."
  ],
  "missingEvidence": [
    "No verified isoform or mutation alignment for every assay.",
    "No independent biological validation or comprehensive inhibitor survey.",
    "Assay systems differ; no normalized cross-assay potency comparison or selectivity claim."
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
    }
  ],
  "relations": {
    "supersedes": [],
    "contradicts": []
  }
}
---
# Join protein and assay evidence while preserving measurement context

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

Follow explicit protein cross-references to combine annotation with assay evidence, retaining relationship type, organism, assay provenance, units and qualifiers. Keep greater-than values as bounds and preserve unresolved isoform or mutation alignment. Cross-references are not automatically identity assertions or proof a destination graph is loaded. An illustrative LIMIT sample is not a comprehensive survey or comparable potency ranking. PubChem EGFR and UniProt P00533 provide the worked example.

## Applicability

Cross-source biological interpretation joining protein annotations to compound–assay–measurement records.

## Competing explanations

- Matching protein-record identity can coexist with different experimental constructs and assay systems.
- Different values for the same compound may reflect assay conditions rather than conflicting evidence.

## Missing evidence

- No verified isoform or mutation alignment for every assay.
- No independent biological validation or comprehensive inhibitor survey.
- Assay systems differ; no normalized cross-assay potency comparison or selectivity claim.

## Revalidation

Source versions, ontology imports, dataset release, question scope or assay/identifier alignment changes.

## Evidence

- Corpus: artifacts/wiki-learning/corpus/pubchem-20260921.json (SHA-256 3bb81ff94d3779e7a7e06942c7c1ae72815e42e1fb562a52d77c9e1c401d7e68); unit: crosswalk-assay; events: event-6; evidence: schema, sio, cheminf, uniprot, assay, local-query; operations: op-000045.
