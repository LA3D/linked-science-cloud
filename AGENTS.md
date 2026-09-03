# Agent guide

This repository is the authoritative production implementation of the Linked Science persistent RDF/Communica runtime and its project-owned clean-room REPL broker. The authoritative saved checkout is `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`. Begin with the [README](README.md), then use the [context router](docs/agent/context-routing.md) to load only the material needed for the current task.

## Authoritative project boundary

- This checkout owns the `linkedScience` facade, `lib/cleanroom-linked-science-bootstrap.mjs`, `packages/cleanroom-node-repl`, and the project-scoped `cleanroom_node_repl` registration.
- `/Users/cvardema/dev/git/LA3D/linked-science-cloud/node-repl-network-probe` is a separate experimental probe. Never import from it, point project configuration at it, use it as the Linked Science runtime, or treat its results as activation evidence for this checkout.
- Codex Desktop's bundled `node_repl` is also not the Linked Science runtime. A mounted generic JavaScript REPL does not establish this project's broker, facade, identity, persistence, or traversal boundary.
- Run `npm run linked-science:verify` for the repository-owned offline identity/broker/runtime check. For an actual Codex task, also follow [runtime discovery](docs/agent/runtime-discovery.md); configuration text and shell checks alone do not prove that the task received the project MCP.
- Historical experiment dossiers and artifacts remain evidence records. They do not redefine the repository's ownership role or authorize live work.

## Always-on contract

- Keep source code and documentation, generated receipts or artifacts, and REPL-resident state distinct. A handle is not an artifact; a bounded display model is not a full result.
- Use local synthetic RDF when it serves the goal. A request whose normal fulfillment needs goal-relevant anonymous public scientific retrieval authorizes broker-mediated public reads with the broker's defaults; the user may request tighter bounds. Authenticated, sensitive, mutating, bulk-ingestion, export, and evaluation actions need their own appropriate authority or confirmation. Destinations remain dynamically discovered rather than endpoint allowlisted.
- Route anonymous public resource reads and RDF/SPARQL requests through the consumer-owned mediator and its private standard-Fetch authority. Preserve effect-based authority, identity stripping, request/fan-out/concurrency/time/byte/item bounds, automatic per-exchange provenance and receipts, retained native RDF/JS handles, and bounded presentation. Do not expose ambient raw Fetch; use the composable `linkedScience` resources, RDF/JS, and traversal surface.
- Separate prior belief, retrieved source evidence, query-result evidence, and synthesis. An unavailable source or empty result is not evidence of global absence.
- Keep bulk documents and results behind REPL handles; expose only bounded views, metadata, provenance, and calibrated uncertainty.
- Do not change global Codex configuration, install packages, export data, push, change remotes, or make other external writes without explicit authorization. Authorized exports use a controlled project artifact area and do not overwrite by default.
- Preserve unrelated work. For substantive repository changes, follow the [Git and durable handoff procedure](docs/agent/git-handoff.md) and the [verification contract](docs/agent/verification.md).
- Treat experiment methodology and experiment results as separate durable records. Before an intentional run loses its REPL or worker state, capture a compact result receipt under `artifacts/`, register it in [the experiment result registry](artifacts/experiment-results/registry.json), and run `npm run evaluation:results:validate`. If only a prose summary survives, label the reconstruction `retrospective-summary` and enumerate missing evidence rather than inventing it.
- Codex owns goals and worker lifecycle. This project contributes a goal-attached Linked Data evidence/session layer, not a competing workflow state machine. The current map and receipt surfaces are transitional instrumentation; architecture changes must preserve the invariants in the [goal-loop dossier](docs/experiments/goal-loop-state-graph.md).

The [roadmap](docs/ROADMAP.md), experiment dossiers, journals, and task briefs describe evidence or planned work; they do not authorize live access, exports, configuration changes, or execution of future slices.
