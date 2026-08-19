# Coordinator-worker context-map recovery experiment

> Historical compatibility experiment. The fixed two-turn Identifiers.org map remains tested, but new agent-facing work uses the bounded PEEK-aligned orientation cache in `lib/context-map-recovery.mjs` rather than prescribing this frontier workflow.

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

## Persistent result-handle slice

For large local results, the persistent worker session owns materialized bindings. The context map stores a symbolic handle, columns, count, bounded sample, provenance, safe operations, and derived-handle lineage. It never stores the raw table or query text. An agent should orient map-first, inspect a bounded page or sample, and create derived handles for filter or aggregation operations. Visualization, tabular display, and export are future consumer capabilities: each must consume an explicit bounded page or derived view and retain its source handle and provenance. A whole endpoint result must never enter a visualization or coordinator context. A REPL reset removes resident rows; checkpoint recovery can only recognize a ready, missing, or invalidated handle and must not pretend to restore the data.

## Separate live-table demonstration

An explicitly approved live demonstration uses the separate `identifiersOrgLiveTable` profile: the same pinned Identifiers.org endpoint, `SELECT` only, 8-second timeout, no redirects or retries, and a hard 20-row materialization cap. It is distinct from the local synthetic session and does not broaden the general profile. The guarded query produces bindings once; a retention-only REPL session records them under a symbolic handle using `materializeBindings`. A later REPL call may profile that handle and return a page of at most 10 rows without rerunning the endpoint query. The checkpoint remains metadata-only, and any reported table remains a bounded page with source-handle and transport provenance.

## Presentation handoff

`displayTable` converts a retained handle page into a typed display model, not HTML: `{ kind: 'table', title, source: { handle, provenance }, columns, rows, page }`. It accepts only known selected columns, a title, scalar cells, and a page of at most 10 rows. Its provenance summary carries only operational fields such as profile, endpoint, method, query type/limit, status, and timeout; it excludes query text, query hashes, and unpaged rows. The presentation layer may render that model inline, but it must not treat the model as the full endpoint result. Charts remain a future kind and must likewise consume an explicit bounded page or derived handle.

For a future large-result export, the worker may stream a retained handle to a user-authorized local artifact in a controlled project artifact area. It must avoid overwrite by default and remain distinct from the in-memory handle and coordinator context. The map would retain only artifact path/format, schema, row count, hash, provenance, and lineage. No exporter is implemented or exercised by this experiment.
