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

## Current live-navigation boundary

The first approved live endpoint trial is **Identifiers.org only**. It permits narrowly bounded, read-only navigation: the resolver route for `taxonomy:9606` and the registry route for the `taxonomy` namespace. It does not authorize Wikidata, UniProt, WikiPathways, PubChem, any other endpoint, or any mutation-capable method or SPARQL form.

The current REPL trial reached neither Identifiers.org host because DNS lookup failed before HTTP. Its exact requests, controls, and limitation are recorded in [the trial provenance](docs/identifiers-org-readonly-trial.md). Do not substitute another endpoint or runtime without explicit approval.
