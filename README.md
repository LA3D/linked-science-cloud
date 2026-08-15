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
- **Guarded live table:** the separate Identifiers.org demonstration profile pins one SPARQL endpoint and permits only bounded read-only registry tables through Communica. It is not a general endpoint client.
- **Presentation handoff:** a retained handle can yield a typed, bounded table model with source handle and compact provenance. It is not HTML, a full result, or a UniProt record browser.

Read the living [roadmap](docs/ROADMAP.md), dated [work logs](docs/journal/), [experiment dossiers](docs/experiments/), and generated [context-map receipts](artifacts/context-map-runs/) for scope and evidence. The planned [blind clean-worker map evaluation](docs/experiments/clean-worker-map-evaluation.md) requires an actual persistent-REPL state receipt before any retention claim and comes before export work; the [large-result export protocol](docs/experiments/large-result-export.md) remains documentation only, with no exporter or generated export artifact.

## Current live-navigation boundary

Live use remains explicitly approved and profile-bound. The guarded demonstration profile is limited to the exact Identifiers.org SPARQL endpoint, bounded read-only queries, and recorded transport provenance. It does not authorize provider URLs, REST access, other endpoints, federation, mutation-capable methods, or unbounded result handling. Do not substitute another endpoint or runtime without explicit approval.
