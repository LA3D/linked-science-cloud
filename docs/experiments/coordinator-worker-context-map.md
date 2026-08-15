# Coordinator-worker context-map recovery experiment

## Question

Can a persistent Linked Data worker hand off a bounded second-turn frontier from a compact symbolic checkpoint rather than raw query history?

## Roles and observability boundary

The coordinator assigns the goal and decides whether to continue. The worker owns one persistent Communica engine, the pinned Identifiers.org profile, and the resulting receipt. The receipt observes only the assigned goal, bounded worker report, guarded transport provenance, and checkpoint state. It does **not** capture the parent coordinator's conversation, reasoning, approvals, or decision-making automatically.

## Protocol and budgets

1. Create a versioned map with one profile (`identifiersOrg`), one source, read-only scope, a two-query total ceiling, one result row per turn, and one named first-turn step.
2. Compact it with stable JSON ordering; raw SPARQL text is forbidden in the map. A checkpoint retains a step ID, query SHA-256, outcome, row count, and transport count.
3. Recover only when profile/scope/budget validation passes. A completed first turn with frontier candidates becomes `awaiting-coordinator`; only the coordinator may select one symbolic candidate for turn two. Record that decision, rationale, and prior-receipt path in a separate receipt field. A known failed step is never retried from the same map.
4. A worker turn runs at most one guarded SELECT or ASK through `queryBindingsGuarded`. Record observed transport evidence separately from synthesized recovery state.

## Scenario and measures

Turn-one scenario: retrieve the UniProt namespace's `idot:mirid` under `dcat:Dataset` and `idot:Namespace`, with `idot:prefix "uniprot"`, `LIMIT 1`. The worker reports candidate resource-link and provider-pattern questions but does not construct or issue turn two's query.

Measures are deterministic without network: compact-map byte stability, scope validation, query and result budgets, recovery state, and blocked repeat of a known failure. The live measure is limited to whether the guard recorded one compliant transport and the bounded row count.

## Evidence and interpretation

Observed evidence is the assigned goal, worker report, guarded method/status/provenance, and row count. The compact context map and recovery state are synthesized coordination aids. An empty result does not prove that the namespace or associated resources are absent; it only records the outcome of this exact bounded query.

## Limitations

This is a two-turn handoff scaffold, not a coordinator implementation, memory system, or evaluation of conversational judgment. It relies on callers using the existing guarded transport module. It neither federates sources nor captures unbounded stream history, provider dereferences, REST calls, or external state.
