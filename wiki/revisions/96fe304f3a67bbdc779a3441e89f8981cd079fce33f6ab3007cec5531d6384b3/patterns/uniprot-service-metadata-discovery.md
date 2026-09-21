---
{
  "schemaVersion": "1.0.0",
  "id": "uniprot-service-metadata-discovery",
  "title": "Discover UniProt graph identities through service metadata",
  "lessonKind": "procedure",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "A mediated service-description read followed by local SPARQL produced a complete graph-name inventory. Use the official catalog and per-graph documentation to orient queries; do not infer graph names solely from vocabulary namespaces. A catalog read is not schema extraction or proof of endpoint reasoning support.",
  "applicability": "Source-owned RDF service descriptions, native retained RDF and bounded local projections. Keep source version/hash and distinguish advertised metadata from queried data. Resource guide and retrospective limits: artifacts/wiki-learning/scientific/uniprot-discovery-20260920-capture/README.md (companion documentation, not additional validated corpus evidence).",
  "competingExplanations": [
    "One observed episode does not establish transfer or causal improvement."
  ],
  "missingEvidence": [
    "No independent transfer or counterexample evaluation.",
    "Complete core schema extraction and relation-specific inference not established."
  ],
  "revalidateWhen": "Recheck source release, exact graph IRIs, and runtime API before operational reuse.",
  "citations": [
    {
      "corpus": {
        "path": "artifacts/wiki-learning/corpus/uniprot-discovery-20260920-capture.json",
        "sha256": "7760e4206fcda2f35dc83503864f94753f9b2deeb582108fe5f90f0736a1a6ec",
        "hashDomain": "file-bytes",
        "pointer": ""
      },
      "unitId": "catalog-discovery",
      "eventIds": [
        "event-2",
        "event-3",
        "event-4"
      ],
      "evidenceIds": [
        "service",
        "catalog-query"
      ],
      "operationIds": [
        "op-000003"
      ]
    }
  ],
  "relations": {
    "supersedes": [],
    "contradicts": []
  }
}
---
# Discover UniProt graph identities through service metadata

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

A mediated service-description read followed by local SPARQL produced a complete graph-name inventory. Use the official catalog and per-graph documentation to orient queries; do not infer graph names solely from vocabulary namespaces. A catalog read is not schema extraction or proof of endpoint reasoning support.

## Applicability

Source-owned RDF service descriptions, native retained RDF and bounded local projections. Keep source version/hash and distinguish advertised metadata from queried data. Resource guide and retrospective limits: artifacts/wiki-learning/scientific/uniprot-discovery-20260920-capture/README.md (companion documentation, not additional validated corpus evidence).

## Competing explanations

- One observed episode does not establish transfer or causal improvement.

## Missing evidence

- No independent transfer or counterexample evaluation.
- Complete core schema extraction and relation-specific inference not established.

## Revalidation

Recheck source release, exact graph IRIs, and runtime API before operational reuse.

## Evidence

- Corpus: artifacts/wiki-learning/corpus/uniprot-discovery-20260920-capture.json (SHA-256 7760e4206fcda2f35dc83503864f94753f9b2deeb582108fe5f90f0736a1a6ec); unit: catalog-discovery; events: event-2, event-3, event-4; evidence: service, catalog-query; operations: op-000003.
