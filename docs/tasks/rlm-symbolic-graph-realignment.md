# Task: RLM/Prime symbolic graph realignment

- **Status:** Active
- **Owner/task:** Codex task `01a069f1-1b3c-7263-87e0-2dffb2142b6d`
- **Scope:** Make the RLM/Prime architecture normative, separate execution/residency/projection budgets, remove the ordinary 10,000-quad graph-admission failure, add structured repair and size-aware agent guidance, and verify repeated symbolic subgraph queries without reacquisition. Excludes live evaluation, bulk ingestion, durable graph reload, and the full durable recursive-child implementation.
- **Authorization boundary:** User authorized repository-local documentation, plan, runtime, skill, tests, focused commits, and local-main integration on 2026-09-04. No live evaluation, dependency installation, export, global configuration change, push, authenticated access, mutation, or bulk ingestion is authorized.
- **Starting point:** `codex/rlm-linked-science-symbolic-runtime` from `b70b25d`

## Outcome and acceptance evidence

The normative architecture and active guidance identify Linked Science as an RDF-specialized RLM/Prime environment rather than a CodeAct/browser derivative. A controlled graph larger than 10,000 quads is retained once and reused by multiple local subgraph queries, while prompt-visible observations remain independently bounded and the broker records no reacquisition.

## Current state

### Completed evidence

- Prior task-level MCP observation showed that a 499,656-byte UniProt Turtle graph was queryable directly through Communica, while `resource.rdf()` rejected retention only because `maxGraphQuads` defaulted to 10,000.
- Prior observation also showed that `HEAD` may omit `Content-Length`, so it cannot be a required size preflight.
- RLM and Prime Agent primary references were rechecked before this slice and are recorded in the plan and normative architecture.
- The plan, architecture routes, README, roadmap, and Linked Data REPL guidance now make RLM/Prime normative and separate execution, residency, and projection concerns.

### Decisions

- Persistent JavaScript is the RLM control environment, not the defining CodeAct architecture.
- RDF quad count is not a prompt budget. Physical execution/residency safety and prompt projection are separate planes.
- The existing synchronous provider seam will be characterized honestly; this slice will not fake the planned durable asynchronous child contract.

### Remaining work

- Implement native symbolic graph retention above 10,000 quads with operational residency controls.
- Add structured local repair for graph and projection call-shape failures.
- Add controlled broker/runtime tests for acquire-once and two-query reuse.
- Run required verification, commit coherent milestones, and integrate to local `main` when safe.

### Exact next action

Update `lib/linked-science-runtime.mjs` and its generated API schema so graph residency is no longer capped by the prompt-oriented 10,000-quad default.

### Blockers or required decisions

- None.

## Handoff state

- **Git:** Authoritative checkout `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`; task branch `codex/rlm-linked-science-symbolic-runtime`; start `b70b25d`; local `main` was 18 commits ahead of `origin/main`; unrelated `artifacts/structure-viewer/` remains untracked and out of scope.
- **Verification:** Pending for this slice.
- **Ephemeral state:** No experiment REPL state is claimed or required by this brief.
- **Durable artifacts/receipts:** No new experiment result artifact; this is implementation work using controlled fixtures.
