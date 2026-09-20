---
{
  "schemaVersion": "1.0.0",
  "id": "hemoglobin-go-overlap-20260919",
  "title": "Asserted GO overlap in two saved UniProt representations",
  "lessonKind": "scientific-finding",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "The captured source versions contain 20 asserted GO identifiers for P69905 and 25 for P68871, 45 distinct protein-GO memberships, and 18 shared identifiers. Native matching agreed with the local query.",
  "applicability": "Only the two protein source hashes recorded by the cited episode and the classifiedWith relation at the recorded observation time. This is annotation overlap, not ontology closure, functional equivalence or a procedure.",
  "competingExplanations": [
    "Different source versions, annotation choices or relation semantics can change the counts."
  ],
  "missingEvidence": [
    "No current-source reacquisition; source payload hashes identify an old snapshot, not present-day truth.",
    "No ontology hierarchy, evidence-code or functional-equivalence analysis."
  ],
  "revalidateWhen": "Reacquire current representations and check source hashes and relation semantics before making a current scientific claim.",
  "citations": [
    {
      "corpus": {
        "path": "artifacts/wiki-learning/corpus/ontology-membership.json",
        "sha256": "df4865ed31b60929bf2927e6ec3eb632435393d8f9dc69db9a10873740b1a1a1",
        "hashDomain": "file-bytes",
        "pointer": ""
      },
      "unitId": "asserted-go-finding",
      "eventIds": [
        "event-3",
        "event-6",
        "event-7"
      ],
      "evidenceIds": [
        "alpha",
        "beta",
        "shared-query",
        "outcome-check"
      ],
      "operationIds": [
        "op-000010"
      ]
    }
  ],
  "relations": {
    "supersedes": [],
    "contradicts": []
  }
}
---
# Asserted GO overlap in two saved UniProt representations

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

The captured source versions contain 20 asserted GO identifiers for P69905 and 25 for P68871, 45 distinct protein-GO memberships, and 18 shared identifiers. Native matching agreed with the local query.

## Applicability

Only the two protein source hashes recorded by the cited episode and the classifiedWith relation at the recorded observation time. This is annotation overlap, not ontology closure, functional equivalence or a procedure.

## Competing explanations

- Different source versions, annotation choices or relation semantics can change the counts.

## Missing evidence

- No current-source reacquisition; source payload hashes identify an old snapshot, not present-day truth.
- No ontology hierarchy, evidence-code or functional-equivalence analysis.

## Revalidation

Reacquire current representations and check source hashes and relation semantics before making a current scientific claim.

## Evidence

- Corpus: artifacts/wiki-learning/corpus/ontology-membership.json (SHA-256 df4865ed31b60929bf2927e6ec3eb632435393d8f9dc69db9a10873740b1a1a1); unit: asserted-go-finding; events: event-3, event-6, event-7; evidence: alpha, beta, shared-query, outcome-check; operations: op-000010.
