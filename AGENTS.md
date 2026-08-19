# Agent guide

This repository is an experimental persistent Linked Data REPL surface, not a general data client or production system. Start with the [README](README.md), [roadmap](docs/ROADMAP.md), and [experiment dossiers](docs/experiments/).

- Keep source code/docs, generated receipts/artifacts, and REPL-resident result state distinct. A handle is not an artifact; a display model is not a full result.
- Default to local synthetic RDF. Live work requires current, explicit user approval for the named endpoint/profile; do not substitute hosts, provider URLs, REST routes, or federation.
- Use the project guard for approved live SPARQL work. Preserve its read-only, bounded, pinned-endpoint, redirect, timeout, retry, provenance, result-handle, and presentation constraints.
- Do not change global Codex configuration or install packages without approval. Export only with explicit user authorization, to a controlled project artifact area, without overwriting by default.
- Preserve unrelated work. Do not change remotes, push, modify global configuration, or make external writes without explicit user approval. Follow the repository-local Git handoff policy below for commits and branch integration.
- Treat the current map/receipt workflow as transitional instrumentation, not a required reasoning script. Codex owns the goal and worker lifecycle; this project may add only a goal-attached Linked Data evidence/session layer. Follow the minimal invariants in `docs/experiments/goal-loop-state-graph.md` when extending agent behavior.

## Durable Git handoff

Codex-managed worktrees and `refs/codex/turn-diffs/**` snapshots are temporary recovery mechanisms, not delivery locations. Never report requested implementation work as complete while its only durable copy is an uncommitted worktree, detached `HEAD`, internal Codex ref, temporary directory, generated preview area, or chat attachment.

- Prefer working in the repository's local checkout on `main` for ordinary sequential work. Use a separate worktree only when the user requests isolation or parallel work, or when isolation is materially necessary.
- Before substantive edits, record the current checkout path, branch or detached state, and `git status --short`. Continue to preserve all pre-existing unrelated changes.
- User-requested source, test, documentation, skill, or plugin implementation work is authorization to create focused repository-local commits containing only that work. It is not authorization to push, rewrite history, delete branches/worktrees, or include unrelated changes.
- If work starts in a Codex-managed or detached worktree, create a named `codex/` branch before handoff and commit the intended files there. Do not rely on detached commits or Codex snapshot refs.
- The default delivery target is local `main`. After verification, integrate the focused commit into local `main` by direct commit, Codex Handoff to Local, fast-forward, or cherry-pick as appropriate. Confirm that `git merge-base --is-ancestor <commit> main` succeeds before calling the work integrated.
- Never force integration through unrelated dirty changes or conflicts. If safe integration into `main` is blocked, keep the work committed on the named branch, report the branch, commit hash, worktree path, and exact blocker, and ask the user how to proceed.
- Before ending a task that changed files, report the checkout path, branch, commit hash(es), whether each commit is reachable from local `main`, verification results, and whether anything remains uncommitted. Never archive or discard a worktree until its intended changes are reachable from a named branch and preferably from `main`.

This policy follows Codex's documented worktree model: managed worktrees begin in detached `HEAD`; durable options are to create a branch and commit or use Handoff to move the work to Local. See <https://developers.openai.com/codex/app/worktrees>.

Before handing off changes, run:

\`\`\`sh
npm test
npm run smoke
git diff --check
\`\`\`

The roadmap and experiment docs define planned work; they do not authorize its execution.
