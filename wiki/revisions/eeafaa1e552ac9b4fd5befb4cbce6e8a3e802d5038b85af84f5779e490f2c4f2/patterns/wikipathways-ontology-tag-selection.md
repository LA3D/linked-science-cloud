---
{
  "schemaVersion": "1.0.0",
  "id": "wikipathways-ontology-tag-selection",
  "title": "Choose the WikiPathways tag predicate for the classification question",
  "lessonKind": "procedure",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "Do not interpret all wp:ontologyTag values as Pathway Ontology terms. The independent retained TP53 query observed generic tags in 92 pathways and specific wp:pathwayOntologyTag values in 90. All 204 specific pathway-tag assertions also appeared under the generic predicate; do not add these as unique classifications. Generic tags also include curation and cell-type identifiers.",
  "applicability": "WikiPathways classification queries over the saved TP53 pathway scope; generic vs specific tag selection.",
  "competingExplanations": [
    "Results depend on the submitted query, endpoint default graph and source mapping conventions; this episode does not isolate the causal benefit of the procedure."
  ],
  "missingEvidence": [
    "No transfer to another pathway collection.",
    "Subagent capture/profile is cited separately; it is not a reconstructed original host event or a verified local-query join.",
    "No tag ontology labels or inferred classification closure validated."
  ],
  "revalidateWhen": "Source or endpoint release, graph scoping, ontology serialization, identifier mappings or query objective changes.",
  "citations": [
    {
      "corpus": {
        "path": "artifacts/wiki-learning/corpus/wikipathways-20260921.json",
        "sha256": "09d9014808c2665e0ef66b4a0ce68436183b3ece547b891d852fa6082e086bf9",
        "hashDomain": "file-bytes",
        "pointer": ""
      },
      "unitId": "tag-selection",
      "evidenceIds": [
        "ontology",
        "examples",
        "schema-query",
        "membership",
        "interactions",
        "participants",
        "mappings",
        "identity",
        "tag-profile",
        "tag-capture"
      ],
      "eventIds": [
        "event-1",
        "event-2",
        "event-3"
      ],
      "operationIds": [
        "op-000006"
      ]
    }
  ],
  "relations": {
    "supersedes": [],
    "contradicts": []
  }
}
---
# Choose the WikiPathways tag predicate for the classification question

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

Do not interpret all wp:ontologyTag values as Pathway Ontology terms. The independent retained TP53 query observed generic tags in 92 pathways and specific wp:pathwayOntologyTag values in 90. All 204 specific pathway-tag assertions also appeared under the generic predicate; do not add these as unique classifications. Generic tags also include curation and cell-type identifiers.

## Applicability

WikiPathways classification queries over the saved TP53 pathway scope; generic vs specific tag selection.

## Competing explanations

- Results depend on the submitted query, endpoint default graph and source mapping conventions; this episode does not isolate the causal benefit of the procedure.

## Missing evidence

- No transfer to another pathway collection.
- Subagent capture/profile is cited separately; it is not a reconstructed original host event or a verified local-query join.
- No tag ontology labels or inferred classification closure validated.

## Revalidation

Source or endpoint release, graph scoping, ontology serialization, identifier mappings or query objective changes.

## Evidence

- Corpus: artifacts/wiki-learning/corpus/wikipathways-20260921.json (SHA-256 09d9014808c2665e0ef66b4a0ce68436183b3ece547b891d852fa6082e086bf9); unit: tag-selection; events: event-1, event-2, event-3; evidence: ontology, examples, schema-query, membership, interactions, participants, mappings, identity, tag-profile, tag-capture; operations: op-000006.
