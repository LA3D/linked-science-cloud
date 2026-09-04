# Task: Preserve symbolic SPARQL query completeness

- **Status:** Active
- **Owner/task:** Current Codex task
- **Scope:** Correct local and mediated result materialization for all four SPARQL read forms; remove the harness-imposed local `LIMIT` requirement; normalize `DESCRIBE` while preserving its query semantics; expose explicit completion provenance; update tests, generated documentation, and guidance. Durable result storage across kernel reset is excluded.
- **Authorization boundary:** Repository-local documentation, source, tests, focused commits, and local-main integration are authorized. No live evaluation, dependency download, export, global configuration change, push, authenticated access, mutation, or bulk ingestion is authorized.
- **Starting point:** `codex/symbolic-query-completeness` at `deace4c`

## Outcome and acceptance evidence

A successful query handle is a complete symbolic result under the caller's query and the runtime's declared graph-description policy. SPARQL solution modifiers remain caller semantics, not harness storage controls. Operational exhaustion fails atomically before a handle is retained. Acceptance is established by local runtime and actual JSON-RPC MCP tests covering `SELECT`, `ASK`, `CONSTRUCT`, and `DESCRIBE`, including wildcard, variable, explicit-IRI, and solution-modified DESCRIBE cases; a no-partial-handle ceiling test; and the repository verification contract.

## Current state

### Completed evidence

- Task-level MCP tests established that local `SELECT`, `ASK`, and `CONSTRUCT` return their distinct native result types.
- Task-level MCP tests established that Comunica 5.3.0 executes a top-level `DESCRIBE` but rejects `DESCRIBE ... LIMIT ...` because its configured describe optimizer does not reach a describe nested below an algebra slice.
- The repository already separates model-visible projection bounds from graph residency, and mediated stream collection already fails instead of returning a partial handle.

### Decisions

- Never impose or inject a SPARQL `LIMIT` to control retention.
- A published query handle is complete; resource exhaustion is an attributable failure and publishes no handle.
- Preserve the caller's original query type and hash in provenance.
- Declare the current DESCRIBE algorithm as outgoing subject triples and normalize that form to one equivalent CONSTRUCT execution so valid solution modifiers remain supported.
- This slice does not claim infinite physical resources or durable result persistence.

### Remaining work

- Update architecture and generated runtime guidance.
- Implement semantic-preserving DESCRIBE normalization and streamed atomic materialization.
- Add completion metadata and structured residency failures.
- Add the four-form runtime and actual MCP acceptance matrix.
- Run all required verification, commit focused milestones, and integrate to local `main` if safe.

### Exact next action

Implement the query normalization and atomic collection helpers in `lib/linked-science-runtime.mjs`, then run the focused runtime tests.

### Blockers or required decisions

- None.

## Handoff state

- **Git:** Authoritative checkout `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`; branch `codex/symbolic-query-completeness`; starting commit `deace4c`; unrelated untracked `artifacts/structure-viewer/` is preserved and excluded.
- **Verification:** Not yet run for this slice.
- **Ephemeral state:** No completion claim depends on a resident REPL handle.
- **Durable artifacts/receipts:** This task record and focused Git commits; no experiment receipt is required because this is implementation verification, not an intentional scientific evaluation run.
