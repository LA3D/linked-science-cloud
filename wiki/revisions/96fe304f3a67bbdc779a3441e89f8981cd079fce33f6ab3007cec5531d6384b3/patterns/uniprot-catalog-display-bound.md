---
{
  "schemaVersion": "1.0.0",
  "id": "uniprot-catalog-display-bound",
  "title": "Respect bounded projections when inspecting a graph catalog",
  "lessonKind": "procedure",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "A display limit of 30 was rejected with LS_BOUND_EXCEEDED (maximum 10). A subsequent fresh capture paged in batches of ten and checked all catalog rows. The first kernel was closed; this is NOT evidence of same-handle recovery or that an earlier remote query succeeded.",
  "applicability": "Distinguish presentation-bound errors from network timeouts. Inspect typed repair information; page within the documented limit without adding SPARQL LIMIT merely to fit the prompt.",
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
        "path": "artifacts/wiki-learning/corpus/uniprot-discovery-20260920.json",
        "sha256": "9c60bd726c2c73b38b7663690925e8f470c798f9a4c25f14f600493372e74ef6",
        "hashDomain": "file-bytes",
        "pointer": ""
      },
      "unitId": "display-bound",
      "eventIds": [
        "event-2",
        "event-3"
      ],
      "evidenceIds": [
        "service"
      ],
      "operationIds": []
    },
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
# Respect bounded projections when inspecting a graph catalog

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

A display limit of 30 was rejected with LS_BOUND_EXCEEDED (maximum 10). A subsequent fresh capture paged in batches of ten and checked all catalog rows. The first kernel was closed; this is NOT evidence of same-handle recovery or that an earlier remote query succeeded.

## Applicability

Distinguish presentation-bound errors from network timeouts. Inspect typed repair information; page within the documented limit without adding SPARQL LIMIT merely to fit the prompt.

## Competing explanations

- One observed episode does not establish transfer or causal improvement.

## Missing evidence

- No independent transfer or counterexample evaluation.
- Complete core schema extraction and relation-specific inference not established.

## Revalidation

Recheck source release, exact graph IRIs, and runtime API before operational reuse.

## Evidence

- Corpus: artifacts/wiki-learning/corpus/uniprot-discovery-20260920.json (SHA-256 9c60bd726c2c73b38b7663690925e8f470c798f9a4c25f14f600493372e74ef6); unit: display-bound; events: event-2, event-3; evidence: service; operations: none.
- Corpus: artifacts/wiki-learning/corpus/uniprot-discovery-20260920-capture.json (SHA-256 7760e4206fcda2f35dc83503864f94753f9b2deeb582108fe5f90f0736a1a6ec); unit: catalog-discovery; events: event-2, event-3, event-4; evidence: service, catalog-query; operations: op-000003.
