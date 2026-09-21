---
{
  "schemaVersion": "1.0.0",
  "id": "ontology-symbolic-context-selective-imports",
  "title": "Resolve scientific terms in symbolic context and inspect relevant ontology imports",
  "lessonKind": "procedure",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "For opaque scientific identifiers, load authoritative ontology definitions into symbolic context, inspect labels, textual definitions and structural relationships, enumerate imports, and selectively follow dependencies relevant to the question. Record unloaded or unresolved dependencies; do not claim full import closure. Distinguish identifier families even when they share a namespace. Missing prose definitions may require inspecting parent properties rather than inventing meaning. PubChem's SIO and CHEMINF term resolution is a worked example of this general method.",
  "applicability": "Scientific schema exploration and ontology-driven query design across domains, particularly when identifiers are opaque or definitions depend on imported modules.",
  "competingExplanations": [
    "Successful resolution may depend on these ontologies' annotation coverage and organization.",
    "A task needing only a few known terms may be served by a smaller authoritative representation."
  ],
  "missingEvidence": [
    "One PubChem trajectory does not demonstrate transfer or causal advantage across other scientific tasks.",
    "Full recursive import closure and reasoning completeness were not established.",
    "No controlled comparison against alternatives to symbolic ontology inspection."
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
      "unitId": "ontology-method",
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
# Resolve scientific terms in symbolic context and inspect relevant ontology imports

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

For opaque scientific identifiers, load authoritative ontology definitions into symbolic context, inspect labels, textual definitions and structural relationships, enumerate imports, and selectively follow dependencies relevant to the question. Record unloaded or unresolved dependencies; do not claim full import closure. Distinguish identifier families even when they share a namespace. Missing prose definitions may require inspecting parent properties rather than inventing meaning. PubChem&#39;s SIO and CHEMINF term resolution is a worked example of this general method.

## Applicability

Scientific schema exploration and ontology-driven query design across domains, particularly when identifiers are opaque or definitions depend on imported modules.

## Competing explanations

- Successful resolution may depend on these ontologies&#39; annotation coverage and organization.
- A task needing only a few known terms may be served by a smaller authoritative representation.

## Missing evidence

- One PubChem trajectory does not demonstrate transfer or causal advantage across other scientific tasks.
- Full recursive import closure and reasoning completeness were not established.
- No controlled comparison against alternatives to symbolic ontology inspection.

## Revalidation

Source versions, ontology imports, dataset release, question scope or assay/identifier alignment changes.

## Evidence

- Corpus: artifacts/wiki-learning/corpus/pubchem-20260921.json (SHA-256 3bb81ff94d3779e7a7e06942c7c1ae72815e42e1fb562a52d77c9e1c401d7e68); unit: ontology-method; events: event-6; evidence: schema, sio, cheminf, uniprot, assay, local-query; operations: op-000045.
