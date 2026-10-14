---
{
  "schemaVersion": "1.0.0",
  "id": "pubchem-ontology-egfr-20260921",
  "title": "PubChem ontology and EGFR evidence snapshot (2026-09-21)",
  "lessonKind": "scientific-finding",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "Dated capture of the PubChem session: the SHACL model referenced 20 SIO and 29 CHEMINF identifiers; ontology inspection resolved labels and inspected selected CHEMINF dependencies. EGFR cross-references and illustrative assay measurements were retained separately from UniProt annotation. Exact counts, queries, qualifiers and source fingerprints belong to the cited capture, not timeless dataset guarantees.",
  "applicability": "The captured September 21 PubChem/QLever representations and submitted query scopes only.",
  "competingExplanations": [
    "Endpoint and ontology releases can change counts, annotations and mappings."
  ],
  "missingEvidence": [
    "No guarantee of present-day endpoint contents or complete ontology closure.",
    "No exhaustive assay retrieval or independent validation of all external references."
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
      "unitId": "source-snapshot",
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
# PubChem ontology and EGFR evidence snapshot (2026-09-21)

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

Dated capture of the PubChem session: the SHACL model referenced 20 SIO and 29 CHEMINF identifiers; ontology inspection resolved labels and inspected selected CHEMINF dependencies. EGFR cross-references and illustrative assay measurements were retained separately from UniProt annotation. Exact counts, queries, qualifiers and source fingerprints belong to the cited capture, not timeless dataset guarantees.

## Applicability

The captured September 21 PubChem/QLever representations and submitted query scopes only.

## Competing explanations

- Endpoint and ontology releases can change counts, annotations and mappings.

## Missing evidence

- No guarantee of present-day endpoint contents or complete ontology closure.
- No exhaustive assay retrieval or independent validation of all external references.

## Revalidation

Source versions, ontology imports, dataset release, question scope or assay/identifier alignment changes.

## Evidence

- Corpus: artifacts/wiki-learning/corpus/pubchem-20260921.json (SHA-256 3bb81ff94d3779e7a7e06942c7c1ae72815e42e1fb562a52d77c9e1c401d7e68); unit: source-snapshot; events: event-6; evidence: schema, sio, cheminf, uniprot, assay, local-query; operations: op-000045.
