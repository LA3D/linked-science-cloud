# Agent guide

This repository is an experimental persistent Linked Data REPL surface, not a general data client or production system. Start with the [README](README.md), [roadmap](docs/ROADMAP.md), and [experiment dossiers](docs/experiments/).

- Keep source code/docs, generated receipts/artifacts, and REPL-resident result state distinct. A handle is not an artifact; a display model is not a full result.
- Default to local synthetic RDF. Live work requires current, explicit user approval for the named endpoint/profile; do not substitute hosts, provider URLs, REST routes, or federation.
- Use the project guard for approved live SPARQL work. Preserve its read-only, bounded, pinned-endpoint, redirect, timeout, retry, provenance, result-handle, and presentation constraints.
- Do not change global Codex configuration or install packages without approval. Export only with explicit user authorization, to a controlled project artifact area, without overwriting by default.
- Preserve unrelated work. Do not make implicit commits, remotes, configuration changes, or external writes.
- Treat the current map/receipt workflow as transitional instrumentation, not a required reasoning script. Codex owns the goal and worker lifecycle; this project may add only a goal-attached Linked Data evidence/session layer. Follow the minimal invariants in `docs/experiments/goal-loop-state-graph.md` when extending agent behavior.

Before handing off changes, run:

\`\`\`sh
npm test
npm run smoke
git diff --check
\`\`\`

The roadmap and experiment docs define planned work; they do not authorize its execution.
