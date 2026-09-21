---
{
  "schemaVersion": "1.0.0",
  "id": "wikipathways-membership-explicit-interactions",
  "title": "Separate WikiPathways membership from explicit interactions",
  "lessonKind": "procedure",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "Resolve a gene identifier, restrict pathway organism, and separately query membership and explicit involvement. Require an interaction type before counting: the initial involvement query also returned a Complex. Preserve source and target roles, and count distinct interaction IRIs rather than type-joined rows. Binding direction does not establish irreversibility.",
  "applicability": "WikiPathways gene-centered interaction subgraphs; default-graph assertions, not proof of direct physical interactions.",
  "competingExplanations": [
    "Results depend on the submitted query, endpoint default graph and source mapping conventions; this episode does not isolate the causal benefit of the procedure."
  ],
  "missingEvidence": [
    "No comprehensive subclass inference or independent biological validation.",
    "Interaction IRIs across pathways may describe the same biological mechanism."
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
      "unitId": "explicit-interaction",
      "evidenceIds": [
        "ontology",
        "examples",
        "schema-query",
        "membership",
        "interactions",
        "participants",
        "mappings",
        "identity"
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
# Separate WikiPathways membership from explicit interactions

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

Resolve a gene identifier, restrict pathway organism, and separately query membership and explicit involvement. Require an interaction type before counting: the initial involvement query also returned a Complex. Preserve source and target roles, and count distinct interaction IRIs rather than type-joined rows. Binding direction does not establish irreversibility.

## Applicability

WikiPathways gene-centered interaction subgraphs; default-graph assertions, not proof of direct physical interactions.

## Competing explanations

- Results depend on the submitted query, endpoint default graph and source mapping conventions; this episode does not isolate the causal benefit of the procedure.

## Missing evidence

- No comprehensive subclass inference or independent biological validation.
- Interaction IRIs across pathways may describe the same biological mechanism.

## Revalidation

Source or endpoint release, graph scoping, ontology serialization, identifier mappings or query objective changes.

## Evidence

- Corpus: artifacts/wiki-learning/corpus/wikipathways-20260921.json (SHA-256 09d9014808c2665e0ef66b4a0ce68436183b3ece547b891d852fa6082e086bf9); unit: explicit-interaction; events: event-1, event-2, event-3; evidence: ontology, examples, schema-query, membership, interactions, participants, mappings, identity; operations: op-000006.
