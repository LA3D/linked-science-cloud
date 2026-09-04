# Task: RLM/Prime symbolic graph realignment

- **Status:** Complete
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
- Runtime 5.1.0 separates execution, residency, and projection capability planes. The compatibility `maxGraphQuads` setup key maps to `maxResidentGraphQuads`, while graph, workspace, and resident-resource ceilings remain explicit operational controls.
- Retained graph records now keep a private, indexed N3 query source for repeated single-graph Communica queries. Native quad arrays remain available for RDF/JS compatibility, ordering, duplicate behavior, and fingerprints.
- The actual repository JSON-RPC MCP loopback test acquires one 12,050-quad Turtle representation once, retains and indexes it, executes two local subgraph queries through the same graph handle, emits only bounded profiles/pages, and records exactly one HTTP request.
- Local graph-name, RDF-format, projection-budget, and result-page failures expose structured repair. Genuine residency failures identify residency—not prompt projection—as the constrained plane and recommend direct subgraph query, a smaller source, or a separately authorized durable/bulk route.
- `nodeRepl.rlm.capabilities()` reports the persistent JavaScript control environment, external-context operations, recursion availability, maximum depth, and the current provider seam's non-durable one-shot compatibility status.
- `npm test` passed all 140 tests; `npm run smoke`, `npm run linked-science:verify`, skill validation, documentation-link validation, and Git diff checks passed.

### Decisions

- Persistent JavaScript is the RLM control environment, not the defining CodeAct architecture.
- RDF quad count is not a prompt budget. Physical execution/residency safety and prompt projection are separate planes.
- The existing synchronous provider seam will be characterized honestly; this slice will not fake the planned durable asynchronous child contract.

### Remaining work

- None for this focused slice. Durable cross-restart graph reload, bulk ingestion/export, live evaluation, and the full durable asynchronous recursive-child runtime remain separately scoped and separately authorized work.

### Exact next action

Start a fresh Codex task or restart the Desktop project MCP when task-level metadata should advertise runtime 5.1.0. Any formal live evaluation remains subject to its own authorization and result-receipt procedure.

### Blockers or required decisions

- None.

## Handoff state

- **Git:** Authoritative checkout `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`; task branch `codex/rlm-linked-science-symbolic-runtime`; start `b70b25d`; architecture commit `5aa9955`; implementation commit `a0f2de1`; unrelated `artifacts/structure-viewer/` remains untracked and out of scope.
- **Verification:** `npm test` (140/140), `npm run smoke`, `npm run linked-science:verify`, Linked Data REPL skill validation, changed-document link validation, and `git diff --check` passed on 2026-09-04.
- **Ephemeral state:** No experiment REPL state is claimed or required by this brief.
- **Durable artifacts/receipts:** No new experiment result artifact; this is implementation work using controlled fixtures.
