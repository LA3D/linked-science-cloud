---
{
  "schemaVersion": "1.0.0",
  "id": "federation-failure-hop-diagnosis",
  "title": "Locate federation failures at the broker, coordinator or downstream hop",
  "lessonKind": "procedure",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "Audit the published query against extraction and every modification before blaming infrastructure: endpoint spelling, prefixes, scope, VALUES, normalization and limits. Identify where SERVICE executes from exchanges; a single-source client may delegate the whole query. Preserve the exact query and full error body when available. When separately authorized, compare the identical query, coordinator, method and equivalent headers with curl, retaining redirects, HTTP status, timing and client differences. Distinguish a broker deadline/budget error from a coordinator response that embeds a downstream failure. Use minimal SERVICE and equivalent direct-component queries as diagnostics, not replacement federation. On 2026-09-27, independent curl exposed UniProt reporting Bgee 403 inside its own 400 response; direct Bgee queries worked. Treat that as a dated access observation, not a universal endpoint rule or evidence of migration. If a body is unavailable or empty, keep the cause unresolved rather than inventing it.",
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

Audit the published query against extraction and every modification before blaming infrastructure: endpoint spelling, prefixes, scope, VALUES, normalization and limits. Identify where SERVICE executes from exchanges; a single-source client may delegate the whole query. Preserve the exact query and full error body when available. When separately authorized, compare the identical query, coordinator, method and equivalent headers with curl, retaining redirects, HTTP status, timing and client differences. Distinguish a broker deadline/budget error from a coordinator response that embeds a downstream failure. Use minimal SERVICE and equivalent direct-component queries as diagnostics, not replacement federation. On 2026-09-27, independent curl exposed UniProt reporting Bgee 403 inside its own 400 response; direct Bgee queries worked. Treat that as a dated access observation, not a universal endpoint rule or evidence of migration. If a body is unavailable or empty, keep the cause unresolved rather than inventing it.

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
