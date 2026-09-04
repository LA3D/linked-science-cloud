# Active task queue and durable next steps

This directory holds a small queue of material work that is ready, active, or deliberately blocked. It is the durable semantic handoff layer between Codex sessions; it is not a generic ideas file or a copy of the roadmap.

## Queue

| Task | Status | Outcome sought | Exact next action |
| --- | --- | --- | --- |
| [Symbolic SPARQL query completeness](symbolic-query-completeness.md) | Active | Make successful SELECT, ASK, CONSTRUCT, and DESCRIBE handles semantically complete while keeping operational failure distinct from bounded display projection. | Implement DESCRIBE normalization and atomic streamed materialization, then run the all-four-form runtime and MCP matrix. |
| [UniProt competency evaluation manifest](uniprot-competency-manifest.md) | Protocol 3.2.0 offline implementation complete; restart/live gate closed | Preserve the leakage-audited three-case public/private split while workers use only generic mediated traversal budgets and resource roles. | Restart Desktop, verify protocol 3.2.0 ownership and cumulative exploration offline, then decide whether to authorize one new neutral attempt before any baseline. |
| [Durable dataset persistence](durable-dataset-persistence.md) | Deferred until the first frozen baseline is assessed | Let explicitly saved RDF datasets survive kernel reset and reload as fresh epoch-bound handles without granting the child ambient filesystem access. | Do not start yet; after the UniProt preflight and first baseline, design the versioned host API and artifact schema for review. |
| [Wiki memory and continual-learning distillation](wiki-memory-continual-learning.md) | Deferred research after the first frozen baseline | Distill reviewed lessons from evidence-backed teaching trajectories into bounded wiki memory that skills can retrieve selectively without ingesting transcripts or hidden answers. | Do not start yet; after the UniProt preflight and first baseline, research the object model, review workflow, retrieval boundary, and skill-attachment contract. |
| [Clean-room broker live capability](cleanroom-broker-live-capability.md) | Superseded historical evidence | Preserve the fixed-profile experiments and source receipts without treating them as the production transport architecture. | Consult only when interpreting historical receipts; current transport work starts from the mediated-traversal architecture. |

## Completed records

| Task | Status | Durable outcome |
| --- | --- | --- |
| [RLM/Prime symbolic graph realignment](rlm-symbolic-graph-realignment.md) | Complete | Made RLM/Prime normative; separated execution, residency, and projection budgets; retained and indexed a controlled 12,050-quad graph from one acquisition for repeated bounded local subqueries; added structured repair and honest recursion capability reporting. |
| [Composable Linked Science resource surface v5](linked-science-resource-surface-v5.md) | Complete | Added the production resource/RDF/Communica programming surface and aligned active guidance with low-friction anonymous public reads. |

## When to create or update a task brief

- Continue the same unit of work in the same Codex task when practical.
- Create or update a brief when material unfinished work must survive the session, when a later task needs decisions or evidence that Git cannot express, or when a blocker requires a durable restart point.
- Transfer to another Codex task or agent by giving it the repository brief. The brief records status, completed evidence, decisions, remaining work, exact next action, blockers, Git state, and verification state.
- Codex Handoff between a managed worktree and Local transfers environment and Git state. It does not replace the semantic task brief.
- Do not promote incidental ideas, speculative improvements, or already captured roadmap entries into noisy tasks. Only material selected work belongs here.

Use [TASK_TEMPLATE.md](TASK_TEMPLATE.md) for new entries. Keep one brief per coherent unit of work. When work completes, record its evidence in the relevant implementation, test, roadmap row, or experiment dossier, mark the brief complete, and remove it from the active queue once the durable evidence no longer depends on the brief.
