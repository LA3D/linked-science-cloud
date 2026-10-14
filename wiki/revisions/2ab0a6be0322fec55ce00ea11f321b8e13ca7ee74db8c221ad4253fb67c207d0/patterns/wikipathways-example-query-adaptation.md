---
{
  "schemaVersion": "1.0.0",
  "id": "wikipathways-example-query-adaptation",
  "title": "Adapt WikiPathways examples with ontology checks",
  "lessonKind": "procedure",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "Use source-owned membership and interaction examples to select predicates, then inspect the ontology before adapting them. This trajectory used dcterms:isPartOf for membership and explicit wp:source|wp:target|wp:participants for involvement. The saved ontology uses rdfs:subClassOf between source/target and participants, not rdfs:subPropertyOf; do not silently treat those statements as property inference. DataNode is marked deprecated.",
  "applicability": "WikiPathways schema exploration and SPARQL query construction; exact saved ontology only.",
  "competingExplanations": [
    "Results depend on the submitted query, endpoint default graph and source mapping conventions; this episode does not isolate the causal benefit of the procedure."
  ],
  "missingEvidence": [
    "No comparison against ontology-only query design.",
    "No transfer to another gene or endpoint.",
    "Original example inspection envelopes not captured; retained source fingerprint and excerpt preserved."
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
      "unitId": "example-query",
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
# Adapt WikiPathways examples with ontology checks

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

Use source-owned membership and interaction examples to select predicates, then inspect the ontology before adapting them. This trajectory used dcterms:isPartOf for membership and explicit wp:source|wp:target|wp:participants for involvement. The saved ontology uses rdfs:subClassOf between source/target and participants, not rdfs:subPropertyOf; do not silently treat those statements as property inference. DataNode is marked deprecated.

## Applicability

WikiPathways schema exploration and SPARQL query construction; exact saved ontology only.

## Competing explanations

- Results depend on the submitted query, endpoint default graph and source mapping conventions; this episode does not isolate the causal benefit of the procedure.

## Missing evidence

- No comparison against ontology-only query design.
- No transfer to another gene or endpoint.
- Original example inspection envelopes not captured; retained source fingerprint and excerpt preserved.

## Revalidation

Source or endpoint release, graph scoping, ontology serialization, identifier mappings or query objective changes.

## Evidence

- Corpus: artifacts/wiki-learning/corpus/wikipathways-20260921.json (SHA-256 09d9014808c2665e0ef66b4a0ce68436183b3ece547b891d852fa6082e086bf9); unit: example-query; events: event-1, event-2, event-3; evidence: ontology, examples, schema-query, membership, interactions, participants, mappings, identity; operations: op-000006.
