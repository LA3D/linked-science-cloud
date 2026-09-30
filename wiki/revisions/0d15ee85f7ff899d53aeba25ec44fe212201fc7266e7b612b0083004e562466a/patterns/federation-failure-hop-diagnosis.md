---
{
  "schemaVersion": "1.0.0",
  "id": "federation-failure-hop-diagnosis",
  "title": "Locate federation failures at the broker, coordinator or downstream hop",
  "lessonKind": "procedure",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "Audit the published query against extraction and every modification before blaming infrastructure: endpoint spelling, prefixes, scope, VALUES, normalization and limits. Identify where SERVICE executes from exchanges; a single-source client may delegate the whole query. Preserve the exact query and full error body when available. When separately authorized, compare the identical query, coordinator, method and equivalent headers with curl, retaining redirects, HTTP status, timing and client differences. Distinguish a broker deadline/budget error from a coordinator response that embeds a downstream failure. Use minimal SERVICE and equivalent direct-component queries as diagnostics, not replacement federation. On 2026-09-27, independent curl exposed UniProt reporting Bgee 403 inside its own 400 response; direct Bgee queries worked. Treat that as a dated access observation, not a universal endpoint rule or evidence of migration. If a body is unavailable or empty, keep the cause unresolved rather than inventing it. In the user-guided OSM episode, check feature tags and geometry paths and compare endpoint-native execution before treating an empty mediated spatial result as absence. A revised direct QLever query using geometry variables and full geometry returned features after empty results/timeouts; a centroid variant was empty. Multiple details changed, so no single root cause was isolated. Preserve failed attempts and successful query shape without claiming causality.",
  "applicability": "SPARQL SERVICE federation HTTP 400/403, endpoint/broker troubleshooting, exact-query audits and remote access diagnosis after unexpected failures.",
  "competingExplanations": [
    "Matching HTTP status alone does not establish matching causes; minimal tests may have empty bodies.",
    "The downstream protection rule, remote client identity and policy-change date were not established."
  ],
  "missingEvidence": [
    "One dated trajectory; no general Bgee availability conclusion.",
    "This corpus certifies selected process eligibility, not a direct-runtime machine outcome or curl authorization for future tasks."
  ],
  "revalidateWhen": "Endpoint policy, coordinator engine/planning, transport, query syntax or source release changes; recheck before reusing a dated failure diagnosis.",
  "citations": [
    {
      "corpus": {
        "path": "artifacts/wiki-learning/corpus/fabry-trajectory-20260927.json",
        "sha256": "88d9a3a5d15bfe7f145e82014922767afcdebd1513d7fa13def4f58c30d9b3ad",
        "hashDomain": "file-bytes",
        "pointer": ""
      },
      "unitId": "coordinator-failure-localization",
      "eventIds": [
        "event-1",
        "event-2",
        "event-3"
      ],
      "evidenceIds": [
        "selected-trajectory",
        "curl-exception",
        "query-audit",
        "failure-comparison"
      ],
      "operationIds": []
    },
    {
      "corpus": {
        "path": "artifacts/wiki-learning/corpus/okn-exploration-20260930.json",
        "sha256": "bf2d05342d9d5690093619c5114085487b57bffdee7f83f73746d3f2a6372b05",
        "hashDomain": "file-bytes",
        "pointer": ""
      },
      "unitId": "guided-introspection",
      "eventIds": [
        "event-4",
        "event-5",
        "event-6",
        "event-7",
        "event-8",
        "event-9",
        "event-10",
        "event-11",
        "event-12",
        "event-13",
        "event-14"
      ],
      "evidenceIds": [
        "selected-trajectory"
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
# Locate federation failures at the broker, coordinator or downstream hop

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

Audit the published query against extraction and every modification before blaming infrastructure: endpoint spelling, prefixes, scope, VALUES, normalization and limits. Identify where SERVICE executes from exchanges; a single-source client may delegate the whole query. Preserve the exact query and full error body when available. When separately authorized, compare the identical query, coordinator, method and equivalent headers with curl, retaining redirects, HTTP status, timing and client differences. Distinguish a broker deadline/budget error from a coordinator response that embeds a downstream failure. Use minimal SERVICE and equivalent direct-component queries as diagnostics, not replacement federation. On 2026-09-27, independent curl exposed UniProt reporting Bgee 403 inside its own 400 response; direct Bgee queries worked. Treat that as a dated access observation, not a universal endpoint rule or evidence of migration. If a body is unavailable or empty, keep the cause unresolved rather than inventing it. In the user-guided OSM episode, check feature tags and geometry paths and compare endpoint-native execution before treating an empty mediated spatial result as absence. A revised direct QLever query using geometry variables and full geometry returned features after empty results/timeouts; a centroid variant was empty. Multiple details changed, so no single root cause was isolated. Preserve failed attempts and successful query shape without claiming causality.

## Applicability

SPARQL SERVICE federation HTTP 400/403, endpoint/broker troubleshooting, exact-query audits and remote access diagnosis after unexpected failures.

## Competing explanations

- Matching HTTP status alone does not establish matching causes; minimal tests may have empty bodies.
- The downstream protection rule, remote client identity and policy-change date were not established.

## Missing evidence

- One dated trajectory; no general Bgee availability conclusion.
- This corpus certifies selected process eligibility, not a direct-runtime machine outcome or curl authorization for future tasks.

## Revalidation

Endpoint policy, coordinator engine/planning, transport, query syntax or source release changes; recheck before reusing a dated failure diagnosis.

## Evidence

- Corpus: artifacts/wiki-learning/corpus/fabry-trajectory-20260927.json (SHA-256 88d9a3a5d15bfe7f145e82014922767afcdebd1513d7fa13def4f58c30d9b3ad); unit: coordinator-failure-localization; events: event-1, event-2, event-3; evidence: selected-trajectory, curl-exception, query-audit, failure-comparison; operations: none.
- Corpus: artifacts/wiki-learning/corpus/okn-exploration-20260930.json (SHA-256 bf2d05342d9d5690093619c5114085487b57bffdee7f83f73746d3f2a6372b05); unit: guided-introspection; events: event-4, event-5, event-6, event-7, event-8, event-9, event-10, event-11, event-12, event-13, event-14; evidence: selected-trajectory; operations: none.
