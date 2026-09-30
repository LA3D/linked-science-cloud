---
{
  "schemaVersion": "1.0.0",
  "id": "registry-crosswalk-lower-bounds",
  "title": "Treat registry overlap as a verified lower bound when crosswalks are incomplete",
  "lessonKind": "procedure",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "Verify explicit identifier-prefix crosswalks against the registry and investigate aliases or entity-specific namespaces using source-owned metadata. Count distinct databases separately from endpoint URLs and database–endpoint pairs. Separate non-deprecated, deprecated and unresolved matches. A missing Wikidata cross-reference or exact-prefix match does not establish absence from Identifiers.org. This candidate records the user-guided workflow; historical counts are not a current catalog.",
  "applicability": "Cross-check explicit mappings against registry namespaces and provider metadata; report lower bounds, aliases and deprecation separately.",
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
      "unitId": "registry-crosswalk-lower-bound",
      "evidenceIds": [
        "selected-trajectory",
        "retained-projection"
      ],
      "eventIds": [
        "event-1",
        "event-14",
        "event-15",
        "event-16",
        "event-17"
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
# Treat registry overlap as a verified lower bound when crosswalks are incomplete

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

Verify explicit identifier-prefix crosswalks against the registry and investigate aliases or entity-specific namespaces using source-owned metadata. Count distinct databases separately from endpoint URLs and database–endpoint pairs. Separate non-deprecated, deprecated and unresolved matches. A missing Wikidata cross-reference or exact-prefix match does not establish absence from Identifiers.org. This candidate records the user-guided workflow; historical counts are not a current catalog.

## Applicability

Cross-check explicit mappings against registry namespaces and provider metadata; report lower bounds, aliases and deprecation separately.

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

- Corpus: artifacts/wiki-learning/corpus/discovery-trajectory-20260923.json (SHA-256 d1104d39084b1331acfda8baa65ff98710c931b39fbe160ff95eb4e6f47a11e6); unit: registry-crosswalk-lower-bound; events: event-1, event-14, event-15, event-16, event-17; evidence: selected-trajectory, retained-projection; operations: none.
