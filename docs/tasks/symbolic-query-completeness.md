# Task: Preserve symbolic SPARQL query completeness

- **Status:** Complete
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
- Runtime 6.0.0 accepts all four read forms without a harness-imposed SPARQL `LIMIT`; `SELECT` retains bindings, `ASK` a boolean, and `CONSTRUCT`/`DESCRIBE` RDF/JS quad stores.
- DESCRIBE normalization preserves explicit IRIs, selected variables, `DESCRIBE *`, mixed targets, `ORDER BY`, `OFFSET`, and `LIMIT`, while declaring the outgoing-subject-triples policy and retaining the original query type/hash.
- Successful query profiles and mediated receipts report atomic semantic completion. A deliberately over-ceiling mediated DESCRIBE aborts and the next retained object receives the first handle ID, proving no hidden partial handle was allocated.
- The actual repository JSON-RPC MCP retained a complete 12,050-quad no-LIMIT DESCRIBE result, returned all four native result types, preserved a solution-modified DESCRIBE, and made only one loopback resource request.
- The currently mounted project MCP independently returned runtime 6.0.0, all four native result types, five complete profiles, the declared description policy, and a 1,005-quad no-LIMIT DESCRIBE despite a binding-item quota of two.
- `npm test` passed 142/142 tests; `npm run linked-science:verify`, `npm run smoke`, `npm ls sparqlalgebrajs --depth=0`, and `git diff --check` passed.

### Decisions

- Never impose or inject a SPARQL `LIMIT` to control retention.
- A published query handle is complete; resource exhaustion is an attributable failure and publishes no handle.
- Preserve the caller's original query type and hash in provenance.
- Declare the current DESCRIBE algorithm as outgoing subject triples and normalize that form to one equivalent CONSTRUCT execution so valid solution modifiers remain supported.
- This slice does not claim infinite physical resources or durable result persistence.

### Remaining work

- None for this slice. Durable result storage across kernel reset remains separately staged work.

### Exact next action

No implementation action remains. Restart or open a fresh task only when the default mounted facade itself must advertise runtime 6.0.0 without a cache-busted verification import.

### Blockers or required decisions

- None.

## Handoff state

- **Git:** Authoritative checkout `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`; branch `codex/symbolic-query-completeness`; starting commit `deace4c`; task commits `a32d1c8`, `a515172`, and `4f2ffe9` are reachable from local `main`; unrelated untracked `artifacts/structure-viewer/` is preserved and excluded.
- **Verification:** `npm test` 142/142 passed; `npm run linked-science:verify`, `npm run smoke`, dependency resolution, and diff checks passed. Repository-spawned and mounted MCP observations both passed.
- **Ephemeral state:** The mounted-MCP verification used an isolated cache-busted runtime 6.0.0 facade and left the pre-existing mounted facade and resident state untouched. Its 1,005-quad synthetic handle remains ephemeral and is not a durable artifact.
- **Durable artifacts/receipts:** This task record and focused Git commits; no experiment receipt is required because this is implementation verification, not an intentional scientific evaluation run.
