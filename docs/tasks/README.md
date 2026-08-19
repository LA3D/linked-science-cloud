# Active task queue and durable next steps

This directory holds a small queue of material work that is ready, active, or deliberately blocked. It is the durable semantic handoff layer between Codex sessions; it is not a generic ideas file or a copy of the roadmap.

## Queue

| Task | Status | Outcome sought | Exact next action |
| --- | --- | --- | --- |
| [Re-verify Node REPL permissions](node-repl-permission-reverification.md) | Ready · high priority | Current evidence for coordinator-versus-worker sandbox and guarded network behavior under the present Codex permission model. | Verify the present official Codex documentation, record its URLs and access date, then run the brief's no-network capability preflights; do not probe Identifiers.org until current approval is confirmed. |
| [Multi-turn context recovery sanity check](context-recovery-sanity-check.md) | Ready | Fresh-worker evidence for ambiguity, bounded reuse, stale state, and reset honesty before the curated demo. | Launch one fresh local-only Codex task with the evaluator prompt in the brief and capture its preflight receipt before any scenario conclusion. |

## When to create or update a task brief

- Continue the same unit of work in the same Codex task when practical.
- Create or update a brief when material unfinished work must survive the session, when a later task needs decisions or evidence that Git cannot express, or when a blocker requires a durable restart point.
- Transfer to another Codex task or agent by giving it the repository brief. The brief records status, completed evidence, decisions, remaining work, exact next action, blockers, Git state, and verification state.
- Codex Handoff between a managed worktree and Local transfers environment and Git state. It does not replace the semantic task brief.
- Do not promote incidental ideas, speculative improvements, or already captured roadmap entries into noisy tasks. Only material selected work belongs here.

Use [TASK_TEMPLATE.md](TASK_TEMPLATE.md) for new entries. Keep one brief per coherent unit of work. When work completes, record its evidence in the relevant implementation, test, roadmap row, or experiment dossier, mark the brief complete, and remove it from the active queue once the durable evidence no longer depends on the brief.
