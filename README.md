# Linked Data REPL experiment

This is a small Codex Desktop experiment for running in-memory RDF/SPARQL work with a persistent Node JavaScript REPL. The local Communica engine and RDF store belong to a worker task; a conversational coordinator delegates a bounded task and receives its evidence-backed result.

## Current Codex runtime boundary

The Node REPL is supplied by the Codex client; this repository does not package or register it as an MCP server. Tool exposure, project filesystem access, dependency resolution, cross-call persistence, sandbox behavior, and guarded network reachability are separate runtime properties and must be observed rather than inferred from one another.

The project's historical unrestricted-sandbox and legacy feature-flag recipe is no longer current setup guidance. Do not change global Codex configuration to make this experiment run. A high-priority [read-only diagnosis task](docs/tasks/node-repl-permission-reverification.md) will re-verify coordinator-versus-worker behavior against current official documentation and the current permission model before any fix is proposed.

## Worker pattern

1. The coordinator keeps the conversation, scope, and approval boundary.
2. A worker opens the persistent JavaScript REPL from this project directory, initializes the local Communica engine and synthetic RDF state once, then reuses that state across calls.
3. The worker verifies a query in a second REPL call and reports only what was actually observed. Resetting the REPL discards that state.

Run the disposable local check with:

```sh
npm run smoke
```

For the tested REPL initialization and persistence check, use the project-local [Linked Data REPL skill](.agents/skills/linked-data-repl/SKILL.md).

## Capability map and next work

- **Synthetic session:** local in-memory RDF is materialized under a symbolic handle and can be profiled, paged, or derived without printing the full result.
- **Guarded live table:** the separate Identifiers.org demonstration profile pins one SPARQL endpoint and permits only bounded read-only registry tables through Communica.
- **Atomic typed live retention:** `queryToHandleGuarded` preflights the session and handle before network access, runs one guarded read operation, retains bindings, boolean, or quad results, and returns one compact receipt containing all transport attempts and the result shape.
- **Open-goal operation choice:** two fresh live UniProt workers used the same guarded surface without query templates. A factual goal produced bounded `SELECT` handles; a graph-shaped goal independently produced a six-quad `CONSTRUCT` handle. See the [operation-selection experiment](docs/experiments/open-goal-uniprot-operation-selection.md) and its [compact receipts](artifacts/open-goal-runs/).
- **Guarded federation:** the `uniprotRheaWikidataFederation` profile starts at UniProt and permits bounded `SELECT` federation only to the exact Rhea and Wikidata SPARQL endpoints. It remains read-only, result-capped, redirect-free, and profile-bound.
- **WikiPathways and ChEBI:** the `wikiPathwaysRead` profile permits bounded reads from the exact WikiPathways endpoint, including ChEBI-linked data nodes. Exact ChEBI compound enrichment uses a validated official EMBL-EBI JSON URL per accession; ChEBI is not modeled as a SPARQL service and its full ontology is not fetched by default.
- **Evidence manifests:** a small versioned manifest points a worker to authoritative ontology, examples, named-graph description, and an approved query-policy reference. It is not a planner or fallback query library. See the [goal-loop dossier](docs/experiments/goal-loop-state-graph.md).
- **Source orientation index:** [resources/index.md](resources/index.md) is a deliberately small directory of scientific roles, candidate entry points, and identifier anchors. It helps an agent choose where to investigate; it is not endpoint code, an allowlist, a health claim, or a query plan.
- **Documentation discovery:** a separate, pinned UniProt schema-document profile retrieves the canonical rendered RDF schema with compact hash provenance. It does not permit data-endpoint queries. See the [schema-discovery experiment](docs/experiments/uniprot-schema-discovery.md).
- **Prior grounding evaluation:** workers may use pretrained knowledge as hypotheses, but must ground, correct, reject, or leave it unresolved before it enters a plan. The evaluation separately diagnoses methodology, tool-surface, environment, and source failures. See the [dossier](docs/experiments/prior-grounding-tool-surface-evaluation.md).
- **Adaptive evidence acquisition:** an exact approved ontology or document can be content-sniffed and retained behind a handle even when its suffix and HTTP metadata disagree. Failed requests become typed attempt evidence, not claims of absence.
- **Symbolic orientation cache:** a bounded PEEK-aligned map retains stable sources, parsing facts, failures, identifiers, and reusable result handles while bulk evidence remains in the REPL. It is not a task-answer store or a competing workflow engine.
- **Codex-goal-compatible evidence state:** the earlier checklist-style worker guidance is transitional. Codex owns goals and worker lifecycle; the first project-local slice now attaches guarded acquisition and symbolic orientation events to retained Linked Data state. See the [decision and experiment dossier](docs/experiments/goal-loop-state-graph.md).
- **Presentation handoff:** a retained handle can yield a typed, bounded table model with source handle and compact provenance. It is not HTML, a full result, or a UniProt record browser.

Use the [agent context router](docs/agent/context-routing.md) to load project guidance by task type. Read the living [roadmap](docs/ROADMAP.md), [active task queue](docs/tasks/README.md), dated [work logs](docs/journal/), [experiment dossiers](docs/experiments/), and generated [context-map receipts](artifacts/context-map-runs/) for scope and evidence. The [clean-worker map evaluation](docs/experiments/clean-worker-map-evaluation.md) now has one successful constrained local run: a real REPL preflight, retained-handle reuse under coordinator steering, and reset honesty. It does not establish open-ended or endpoint navigation. The [large-result export protocol](docs/experiments/large-result-export.md) remains documentation only, with no exporter or generated export artifact.

## Current live-navigation boundary

Live use remains explicitly approved and profile-bound. Named SPARQL profiles pin Identifiers.org, UniProt, WikiPathways, Rhea, and Wikidata as described above. Exact ChEBI compound acquisition pins one validated public EMBL-EBI API URL at a time. These surfaces permit bounded read-only operations and recorded transport provenance only. They do not authorize arbitrary provider URLs, other REST routes or endpoints, mutation-capable methods, `SERVICE SILENT`, or unbounded result handling. Do not substitute another endpoint or runtime without explicit approval.
