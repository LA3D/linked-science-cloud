# Agent guide

This repository is an experimental persistent Linked Data REPL surface, not a general data client or production system. Start with the [README](README.md), [roadmap](docs/ROADMAP.md), and [experiment dossiers](docs/experiments/).

- Keep source code/docs, generated receipts/artifacts, and REPL-resident result state distinct. A handle is not an artifact; a display model is not a full result.
- Default to local synthetic RDF. Live work requires current, explicit user approval for the named endpoint/profile; do not substitute hosts, provider URLs, REST routes, or federation.
- Use the project guard for approved live SPARQL work. Preserve its read-only, bounded, pinned-endpoint, redirect, timeout, retry, provenance, result-handle, and presentation constraints.
- Do not change global Codex configuration or install packages without approval. Export only with explicit user authorization, to a controlled project artifact area, without overwriting by default.
- Preserve unrelated work. Do not change remotes, push, modify global configuration, or make external writes without explicit user approval. Follow the repository-local Git handoff policy below for commits and branch integration.
- Treat the current map/receipt workflow as transitional instrumentation, not a required reasoning script. Codex owns the goal and worker lifecycle; this project may add only a goal-attached Linked Data evidence/session layer. Follow the minimal invariants in `docs/experiments/goal-loop-state-graph.md` when extending agent behavior.

## Experimental Git workflow and durable handoff

This repository expects significant revision and experimental churn. Prefer reversible, well-scoped Git commits over avoiding useful changes. The normal recovery path is branch and commit history; Codex-managed worktrees and `refs/codex/turn-diffs/**` snapshots are temporary recovery mechanisms, not delivery locations. Never report requested implementation work as complete while its only durable copy is an uncommitted worktree, detached `HEAD`, internal Codex ref, temporary directory, generated preview area, or chat attachment.

- Treat the normal local checkout as the authoritative working location. For substantive work, start from local `main` and create a short-lived `codex/<task>` branch in that checkout. Do not use a separate worktree merely to obtain branch isolation.
- Before substantive edits, record the checkout path, branch or detached state, `git status --short`, and the starting commit. If `main` already has unrelated uncommitted changes, preserve them, identify them in the task record, and never sweep them into the task branch's commits.
- User-requested source, test, documentation, skill, or plugin implementation work is authorization to create focused repository-local commits containing only that work. It is not authorization to push, rewrite history, delete unmerged branches/worktrees, or include unrelated changes.
- Commit at coherent milestones so useful work does not remain only in a working tree across a long pause, handoff, or completed task. Experimental or later-revised commits are acceptable; keep each commit scoped and use follow-up or revert commits rather than destructive history rewriting.
- The default delivery target is local `main`. After verification, fast-forward the task branch into local `main` when possible. Confirm that `git merge-base --is-ancestor <commit> main` succeeds before calling the work integrated. Keep the task branch until that check succeeds; a merged local task branch may then be removed as routine cleanup.
- Pushes still require explicit user approval. When local `main` is ahead of its upstream, report that clearly and ask whether to push so the remote can serve as an off-machine backup.
- Use a separate worktree only for genuinely concurrent tasks, scheduled/background work, a deliberately disposable experiment, or isolation that the user requests or that materially reduces risk. A worktree is not the default safety mechanism for ordinary sequential development.
- If work starts in a Codex-managed or detached worktree, create a named `codex/<task>` branch before substantive edits or, if the environment prevents that, at the earliest safe opportunity before handoff. Make checkpoint commits there, then use Codex Handoff to Local or another explicit Git integration into local `main`. Do not rely on detached commits or Codex snapshot refs.
- Never force integration through unrelated dirty changes or conflicts. If safe integration into `main` is blocked, keep the work committed on the named branch, report the branch, commit hash, worktree path, and exact blocker, and ask the user how to proceed.
- Before ending a task that changed files, report the checkout path, branch, starting commit, task commit hash(es), whether each task commit is reachable from local `main`, whether local `main` is ahead of its upstream, verification results, and anything that remains uncommitted. Never archive or discard a worktree until its intended changes are reachable from a named branch and preferably from `main`.

This policy follows Codex's documented worktree model: managed worktrees begin in detached `HEAD`; durable options are to create a branch and commit or use Handoff to move the work to Local. See <https://developers.openai.com/codex/app/worktrees>.

Before handing off changes, run:

\`\`\`sh
npm test
npm run smoke
git diff --check
\`\`\`

The roadmap and experiment docs define planned work; they do not authorize its execution.
