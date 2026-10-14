---
{
  "schemaVersion": "1.0.0",
  "id": "schema-meaning-versus-endpoint-usage",
  "title": "Test endpoint term usage separately from schema meaning",
  "lessonKind": "procedure",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "Separate a term's schema definition from its occurrence in the actual endpoint dataset. A broad term-usage query timing out leaves usage unresolved. Focused existence probes can answer narrower questions, but a false answer covers only the tested pattern. Imported parent concepts can remain semantically relevant even when not directly instantiated. In the PubChem example, focused IAO and CHEMINF checks were positive and two particular CDK type checks were negative. Also inspect documented service execution semantics before treating predicate enumeration as a capability inventory: virtual relationships may be generated only for supported bound query patterns. In the Identifiers.org trajectory, the assistant initially overlooked already retrieved documentation; user corrections and a supplied paper prompted recovery.",
  "applicability": "Checking actual scientific dataset vocabulary use after ontology or SHACL inspection, especially after a broad endpoint query times out.",
  "competingExplanations": [
    "Probe outcomes depend on endpoint release, triple position and exact pattern.",
    "The broad query may fail because of plan cost rather than vocabulary size alone."
  ],
  "missingEvidence": [
    "No complete term-use enumeration or global absence claim.",
    "No comparative query-performance experiment; narrowed queries changed scope.",
    "Historical timeout recovery is reported in the selected transcript; later capture does not reconstruct a missing failed broker receipt.",
    "The Identifiers.org extension is supported as a user-guided process observation, not an independent scientific finding or autonomous transfer test."
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
      "unitId": "term-usage",
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
        "path": "artifacts/wiki-learning/corpus/discovery-trajectory-20260923.json",
        "sha256": "d1104d39084b1331acfda8baa65ff98710c931b39fbe160ff95eb4e6f47a11e6",
        "hashDomain": "file-bytes",
        "pointer": ""
      },
      "unitId": "ontology-and-service-behavior",
      "evidenceIds": [
        "selected-trajectory",
        "retained-projection"
      ],
      "eventIds": [
        "event-1",
        "event-2",
        "event-3",
        "event-4",
        "event-5",
        "event-6",
        "event-7"
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
# Test endpoint term usage separately from schema meaning

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

Separate a term&#39;s schema definition from its occurrence in the actual endpoint dataset. A broad term-usage query timing out leaves usage unresolved. Focused existence probes can answer narrower questions, but a false answer covers only the tested pattern. Imported parent concepts can remain semantically relevant even when not directly instantiated. In the PubChem example, focused IAO and CHEMINF checks were positive and two particular CDK type checks were negative. Also inspect documented service execution semantics before treating predicate enumeration as a capability inventory: virtual relationships may be generated only for supported bound query patterns. In the Identifiers.org trajectory, the assistant initially overlooked already retrieved documentation; user corrections and a supplied paper prompted recovery.

## Applicability

Checking actual scientific dataset vocabulary use after ontology or SHACL inspection, especially after a broad endpoint query times out.

## Competing explanations

- Probe outcomes depend on endpoint release, triple position and exact pattern.
- The broad query may fail because of plan cost rather than vocabulary size alone.

## Missing evidence

- No complete term-use enumeration or global absence claim.
- No comparative query-performance experiment; narrowed queries changed scope.
- Historical timeout recovery is reported in the selected transcript; later capture does not reconstruct a missing failed broker receipt.
- The Identifiers.org extension is supported as a user-guided process observation, not an independent scientific finding or autonomous transfer test.

## Revalidation

Source versions, ontology imports, dataset release, question scope or assay/identifier alignment changes.

## Evidence

- Corpus: artifacts/wiki-learning/corpus/pubchem-20260921.json (SHA-256 3bb81ff94d3779e7a7e06942c7c1ae72815e42e1fb562a52d77c9e1c401d7e68); unit: term-usage; events: event-6; evidence: schema, sio, cheminf, uniprot, assay, local-query; operations: op-000045.
- Corpus: artifacts/wiki-learning/corpus/discovery-trajectory-20260923.json (SHA-256 d1104d39084b1331acfda8baa65ff98710c931b39fbe160ff95eb4e6f47a11e6); unit: ontology-and-service-behavior; events: event-1, event-2, event-3, event-4, event-5, event-6, event-7; evidence: selected-trajectory, retained-projection; operations: none.
