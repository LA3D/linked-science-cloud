---
{
  "schemaVersion": "1.0.0",
  "id": "wikidata-service-crosswalk",
  "title": "Discover candidate scientific services through Wikidata relationships",
  "lessonKind": "procedure",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "Use Wikidata property definitions to connect an external identifier property to its database item through main Wikidata property (P1687), then to its advertised SPARQL endpoint (P5305). Relevant instance-of/subclass paths can broaden the candidate pool. Check definitions and source statements before constructing the query; validate candidate services separately. The observed trajectory was guided by the user, including the UniProt item and classification traversal.",
  "applicability": "Follow identifier properties to database items and advertised endpoints; use relevant instance/subclass relationships for additional service candidates.",
  "competingExplanations": [
    "Useful results depend on metadata coverage and current service behavior",
    "User-provided hints shaped this trajectory; no autonomous discovery advantage established"
  ],
  "missingEvidence": [
    "No independent transfer or causal benefit evidence",
    "Voice corrections are frontend transcript excerpts",
    "Tool displays may be bounded; agent summaries do not establish scientific truth"
  ],
  "revalidateWhen": "Provider behavior, registry mappings, ontology definitions or Wikidata statements change",
  "citations": [
    {
      "corpus": {
        "path": "artifacts/wiki-learning/corpus/discovery-trajectory-20260923.json",
        "sha256": "d1104d39084b1331acfda8baa65ff98710c931b39fbe160ff95eb4e6f47a11e6",
        "hashDomain": "file-bytes",
        "pointer": ""
      },
      "unitId": "wikidata-service-discovery",
      "evidenceIds": [
        "selected-trajectory",
        "retained-projection"
      ],
      "eventIds": [
        "event-1",
        "event-8",
        "event-9",
        "event-10",
        "event-11",
        "event-12",
        "event-13"
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
# Discover candidate scientific services through Wikidata relationships

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

Use Wikidata property definitions to connect an external identifier property to its database item through main Wikidata property (P1687), then to its advertised SPARQL endpoint (P5305). Relevant instance-of/subclass paths can broaden the candidate pool. Check definitions and source statements before constructing the query; validate candidate services separately. The observed trajectory was guided by the user, including the UniProt item and classification traversal.

## Applicability

Follow identifier properties to database items and advertised endpoints; use relevant instance/subclass relationships for additional service candidates.

## Competing explanations

- Useful results depend on metadata coverage and current service behavior
- User-provided hints shaped this trajectory; no autonomous discovery advantage established

## Missing evidence

- No independent transfer or causal benefit evidence
- Voice corrections are frontend transcript excerpts
- Tool displays may be bounded; agent summaries do not establish scientific truth

## Revalidation

Provider behavior, registry mappings, ontology definitions or Wikidata statements change

## Evidence

- Corpus: artifacts/wiki-learning/corpus/discovery-trajectory-20260923.json (SHA-256 d1104d39084b1331acfda8baa65ff98710c931b39fbe160ff95eb4e6f47a11e6); unit: wikidata-service-discovery; events: event-1, event-8, event-9, event-10, event-11, event-12, event-13; evidence: selected-trajectory, retained-projection; operations: none.
