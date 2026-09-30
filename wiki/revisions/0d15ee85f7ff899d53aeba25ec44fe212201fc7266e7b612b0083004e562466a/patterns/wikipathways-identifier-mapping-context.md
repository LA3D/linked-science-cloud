---
{
  "schemaVersion": "1.0.0",
  "id": "wikipathways-identifier-mapping-context",
  "title": "Preserve context for WikiPathways identifier mappings",
  "lessonKind": "procedure",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "Use Identifiers.org IRIs as exact query keys and retain database mappings as source assertions. A human-pathway filter did not prevent the shared hgnc.symbol/TP53 node from returning both ENSG and ENSCAFG Ensembl mappings in the combined graph. Avoid treating every returned mapping as human or as exact gene/protein identity; use graph-specific provenance or independent validation before stronger claims.",
  "applicability": "WikiPathways cross-links, identifier joins and organism filtering over a combined default graph.",
  "competingExplanations": [
    "Results depend on the submitted query, endpoint default graph and source mapping conventions; this episode does not isolate the causal benefit of the procedure."
  ],
  "missingEvidence": [
    "Exact originating named graphs were not inspected.",
    "External UniProt, Ensembl and Wikidata destinations were not independently validated.",
    "No claim about Identifiers.org resolver normalization or equivalence of alternate URL spellings."
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
      "unitId": "identifier-context",
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
# Preserve context for WikiPathways identifier mappings

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

Use Identifiers.org IRIs as exact query keys and retain database mappings as source assertions. A human-pathway filter did not prevent the shared hgnc.symbol/TP53 node from returning both ENSG and ENSCAFG Ensembl mappings in the combined graph. Avoid treating every returned mapping as human or as exact gene/protein identity; use graph-specific provenance or independent validation before stronger claims.

## Applicability

WikiPathways cross-links, identifier joins and organism filtering over a combined default graph.

## Competing explanations

- Results depend on the submitted query, endpoint default graph and source mapping conventions; this episode does not isolate the causal benefit of the procedure.

## Missing evidence

- Exact originating named graphs were not inspected.
- External UniProt, Ensembl and Wikidata destinations were not independently validated.
- No claim about Identifiers.org resolver normalization or equivalence of alternate URL spellings.

## Revalidation

Source or endpoint release, graph scoping, ontology serialization, identifier mappings or query objective changes.

## Evidence

- Corpus: artifacts/wiki-learning/corpus/wikipathways-20260921.json (SHA-256 09d9014808c2665e0ef66b4a0ce68436183b3ece547b891d852fa6082e086bf9); unit: identifier-context; events: event-1, event-2, event-3; evidence: ontology, examples, schema-query, membership, interactions, participants, mappings, identity; operations: op-000006.
