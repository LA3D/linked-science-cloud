# Linked Data REPL experiment

This is a small Codex Desktop experiment for running in-memory RDF/SPARQL work with a persistent Node JavaScript REPL. The local Communica engine and RDF store belong to a worker task; a conversational coordinator delegates a bounded task and receives its evidence-backed result.

## Required Codex Desktop setup

Edit `~/.codex/config.toml` yourself. Add or update these settings for live network or browser-style REPL work:

```toml
sandbox_mode = "danger-full-access"

[features]
js_repl = true
```

After changing the configuration, restart Codex Desktop **and create a fresh worker task**. Existing sessions and workers do not pick up the changed REPL or sandbox settings.

## Danger, danger, Will Robinson

`sandbox_mode = "danger-full-access"` is a **global, unrestricted sandbox setting**. It affects new Codex sessions beyond this project, not just this repository. Enable it only for the short, approved live experiment; never treat it as a project-local permission.

When finished, revert the configuration:

```toml
sandbox_mode = "workspace-write"
```

Then restart Codex Desktop again and create a fresh worker task before doing ordinary work.

## Worker pattern

1. The coordinator keeps the conversation, scope, and approval boundary.
2. A worker opens the persistent JavaScript REPL from this project directory, initializes the local Communica engine and synthetic RDF state once, then reuses that state across calls.
3. The worker verifies a query in a second REPL call and reports only what was actually observed. Resetting the REPL discards that state.

Run the disposable local check with:

```sh
npm run smoke
```

For the tested REPL initialization and persistence check, use the project-local [Linked Data REPL skill](.codex/skills/linked-data-repl/SKILL.md).

## Capability map and next work

- **Synthetic session:** local in-memory RDF is materialized under a symbolic handle and can be profiled, paged, or derived without printing the full result.
- **Guarded live table:** the separate Identifiers.org demonstration profile pins one SPARQL endpoint and permits only bounded read-only registry tables through Communica.
- **Atomic typed live retention:** `queryToHandleGuarded` preflights the session and handle before network access, runs one guarded read operation, retains bindings, boolean, or quad results, and returns one compact receipt containing all transport attempts and the result shape.
- **Guarded federation:** the `uniprotRheaWikidataFederation` profile starts at UniProt and permits bounded `SELECT` federation only to the exact Rhea and Wikidata SPARQL endpoints. It remains read-only, result-capped, redirect-free, and profile-bound.
- **Evidence manifests:** a small versioned manifest points a worker to authoritative ontology, examples, named-graph description, and an approved query-policy reference. It is not a planner or fallback query library. See the [goal-loop dossier](docs/experiments/goal-loop-state-graph.md).
- **Documentation discovery:** a separate, pinned UniProt schema-document profile retrieves the canonical rendered RDF schema with compact hash provenance. It does not permit data-endpoint queries. See the [schema-discovery experiment](docs/experiments/uniprot-schema-discovery.md).
- **Prior grounding evaluation:** workers may use pretrained knowledge as hypotheses, but must ground, correct, reject, or leave it unresolved before it enters a plan. The evaluation separately diagnoses methodology, tool-surface, environment, and source failures. See the [dossier](docs/experiments/prior-grounding-tool-surface-evaluation.md).
- **New direction — Codex-goal-compatible evidence state:** the earlier checklist-style worker guidance is now transitional. Codex continues to own goals and worker lifecycle; this project will attach only tool-generated Linked Data session, schema, plan, result, and handle evidence to that lifecycle. See the [decision and experiment dossier](docs/experiments/goal-loop-state-graph.md).
- **Presentation handoff:** a retained handle can yield a typed, bounded table model with source handle and compact provenance. It is not HTML, a full result, or a UniProt record browser.

Read the living [roadmap](docs/ROADMAP.md), dated [work logs](docs/journal/), [experiment dossiers](docs/experiments/), and generated [context-map receipts](artifacts/context-map-runs/) for scope and evidence. The [clean-worker map evaluation](docs/experiments/clean-worker-map-evaluation.md) now has one successful constrained local run: a real REPL preflight, retained-handle reuse under coordinator steering, and reset honesty. It does not establish open-ended or endpoint navigation. The [large-result export protocol](docs/experiments/large-result-export.md) remains documentation only, with no exporter or generated export artifact.

## Current live-navigation boundary

Live use remains explicitly approved and profile-bound. Approved profiles are the exact Identifiers.org SPARQL endpoint and the three exact federation targets—UniProt, Rhea, and Wikidata—defined above. They permit bounded read-only queries and recorded transport provenance only. They do not authorize provider URLs, REST access, any other endpoint, mutation-capable methods, `SERVICE SILENT`, or unbounded result handling. Do not substitute another endpoint or runtime without explicit approval.
