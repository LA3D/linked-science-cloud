# Agent guide

This repository is an experimental persistent Linked Data REPL surface, not a general data client or production system. Begin with the [README](README.md), then use the [context router](docs/agent/context-routing.md) to load only the material needed for the current task.

## Always-on contract

- Keep source code and documentation, generated receipts or artifacts, and REPL-resident state distinct. A handle is not an artifact; a bounded display model is not a full result.
- Default to local synthetic RDF. Live work requires current, explicit user approval for the exact endpoint or documentation profile. Never substitute hosts, provider URLs, REST routes, or federation targets.
- Route approved live SPARQL and evidence acquisition through the project guards. Preserve read-only operations, explicit bounds, pinned sources, redirect and timeout policy, retry limits, provenance, retained handles, and bounded presentation.
- Separate prior belief, retrieved source evidence, query-result evidence, and synthesis. An unavailable source or empty result is not evidence of global absence.
- Keep bulk documents and results behind REPL handles; expose only bounded views, metadata, provenance, and calibrated uncertainty.
- Do not change global Codex configuration, install packages, export data, push, change remotes, or make other external writes without explicit authorization. Authorized exports use a controlled project artifact area and do not overwrite by default.
- Preserve unrelated work. For substantive repository changes, follow the [Git and durable handoff procedure](docs/agent/git-handoff.md) and the [verification contract](docs/agent/verification.md).
- Codex owns goals and worker lifecycle. This project contributes a goal-attached Linked Data evidence/session layer, not a competing workflow state machine. The current map and receipt surfaces are transitional instrumentation; architecture changes must preserve the invariants in the [goal-loop dossier](docs/experiments/goal-loop-state-graph.md).

The [roadmap](docs/ROADMAP.md), experiment dossiers, journals, and task briefs describe evidence or planned work; they do not authorize live access, exports, configuration changes, or execution of future slices.
