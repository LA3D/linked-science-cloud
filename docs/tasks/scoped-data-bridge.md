# Scoped data bridge investigation

- Status: experiment design complete; execution unrun.
- User constraint: Codex drives model work; no model provider embedded in or attached independently to the REPL.
- Methodology: [five gated experiments](../experiments/scoped-data-bridge.md).
- Evidence storage: [run contract](../../artifacts/scoped-data-bridge/README.md).

## Decisions

Preserve heterogeneous native structures: RDF graphs/ontologies, SELECT bindings and JSON evidence have distinct adapters and semantics. Do not flatten graphs into tables. Do not assume a child shares the parent kernel. An owner-bound handle is not a portable grant. Scope enforcement must be measured separately from connectivity.

Codex owns dispatch/lifecycle; the data layer supports selected reads and validated deposits, followed by explicit parent REPL continuation. The suite does not introduce another goal or worker scheduler.

## Completed work and boundaries

Prepared E1 topology discovery, E2 typed operations, E3 scope/lifetime, E4 semantic round trip and E5 bounded scale/recovery. Defined per-attempt plans, events, checks, receipts, fixture manifests and integration with the existing registry. No fixture run, worker test, bridge implementation or model-quality result is claimed. Earlier conversational source/capability observations are motivation, not registered suite runs.

## Exact next action

When E1 execution is requested, freeze its synthetic fixture, probe code and plan, add receipt-specific validation to the harness, then dispatch fresh Codex workers and capture identity/access evidence before cleanup. Select the topology from observations. E2 onward requires a minimal bridge implementation and its own frozen run scope; do not presume shared state, automatic MCP sampling or a provider API.

## Handoff

Design began in the authoritative checkout on local main at `d751422e92414475e51883dd323f7c37b8a564e0`, using branch `codex/scoped-bridge-experiments`. Existing changes to `.codex/config.toml` and untracked `artifacts/structure-viewer/` belong to other work and are excluded. See the focused design commit in Git history for verification and integration; experiment results remain empty until execution.
