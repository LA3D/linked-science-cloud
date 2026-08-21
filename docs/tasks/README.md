# Active task queue and durable next steps

This directory holds a small queue of material work that is ready, active, or deliberately blocked. It is the durable semantic handoff layer between Codex sessions; it is not a generic ideas file or a copy of the roadmap.

## Queue

| Task | Status | Outcome sought | Exact next action |
| --- | --- | --- | --- |
| [UniProt competency evaluation manifest](uniprot-competency-manifest.md) | Blocked on term-bearing core profile | Promote the frozen, leakage-audited three-case public/private split to a dispatchable manifest without exposing held-out references. | Review the failed marker gate and select a different exact official term-bearing source or bounded query before any new approval. |
| [Clean-room broker live capability](cleanroom-broker-live-capability.md) | Blocked on term-bearing core evidence | Complete the verified broker-owned orientation surface with the machine-readable UniProt terms required by the frozen competency cases. | Keep the validated 25-quad ontology metadata out of the profile; choose the next exact source/query without broadening live access implicitly. |

## When to create or update a task brief

- Continue the same unit of work in the same Codex task when practical.
- Create or update a brief when material unfinished work must survive the session, when a later task needs decisions or evidence that Git cannot express, or when a blocker requires a durable restart point.
- Transfer to another Codex task or agent by giving it the repository brief. The brief records status, completed evidence, decisions, remaining work, exact next action, blockers, Git state, and verification state.
- Codex Handoff between a managed worktree and Local transfers environment and Git state. It does not replace the semantic task brief.
- Do not promote incidental ideas, speculative improvements, or already captured roadmap entries into noisy tasks. Only material selected work belongs here.

Use [TASK_TEMPLATE.md](TASK_TEMPLATE.md) for new entries. Keep one brief per coherent unit of work. When work completes, record its evidence in the relevant implementation, test, roadmap row, or experiment dossier, mark the brief complete, and remove it from the active queue once the durable evidence no longer depends on the brief.
