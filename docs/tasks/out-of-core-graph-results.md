# Task: complete out-of-core graph-query results

- **Status:** Complete
- **Owner/task:** Current Codex task
- **Scope:** Fix stale sample configuration, structural local `SERVICE` detection, aggregate text egress, and complete storage-backed `CONSTRUCT`/`DESCRIBE` results. Record—but do not activate—the evidence-first Prime/PEEK path.
- **Authorization boundary:** Repository-local source, tests, documentation, focused commits, and local-main integration were authorized. Provider activation, live evaluation, dependency installation, export, global configuration, and push were not authorized by this slice.
- **Starting point:** `codex/out-of-core-query-results` from local `main` at `1ce9801`.

## Outcome and acceptance evidence

Runtime 6.1.0 uses structural parsed-query traversal for local `SERVICE` rejection, aggregate-bounds `nodeRepl.write`, and retains complete large graph-query results in a private broker-owned SQLite spool. The public handle is published only after commit; quota failure aborts provisional state and reports that no partial handle was retained. Stored results are awaitably pageable and reusable as streaming sources for later local SPARQL without exposing a filesystem path or loading the whole result into the child.

The actual repository JSON-RPC MCP test acquires a 12,050-quad graph once, exercises all four SPARQL read forms, spills the full no-`LIMIT` `DESCRIBE`, queries the stored handle again with `ASK`, and verifies cleanup on reset. A separate mediated 600-quad `CONSTRUCT` proves the live-query result also spills and can feed local SPARQL after exactly one brokered request. A low-quota MCP test proves complete-or-fail cleanup. Unit coverage verifies graph set semantics, bounded paging, ownership, byte quotas, and owner release.

## Current state

### Completed evidence

- Focused package/runtime tests pass, including the actual MCP large-`DESCRIBE`, mediated-result symbolic reuse, quota-failure, reset-cleanup, structural-`SERVICE`, and aggregate-output cases.
- The sample MCP configuration points only at the authoritative checkout and uses the runtime-appropriate timeout.
- The [Prime context-management architecture](../architecture/prime-linked-data-context-management.md) makes depth-one handle grants and a real PEEK policy evidence gates before durable machinery.

### Decisions

- Graph-query results use hybrid residency: small native N3 stores, large broker SQLite spools.
- Storage quotas remain physical safety controls. They cause explicit failure, never successful truncation.
- Broker-stored quad results support bounded page/table projection and later local SPARQL. Whole-result `rdf.dataset` and JavaScript `derive` are rejected.
- The spool is kernel-epoch state, not a durable artifact.
- Runtime `6.1.0` is a backward-compatible facade-capability increment from the already-integrated `6.0.0` query-completeness contract; broker `0.5.0` independently identifies its new spool and aggregate-output capability. The root package remains private at `0.0.0`; none of these identifiers represents a public package release train.
- Prime provider, PEEK policy, and durable-harness implementation remain unstarted pending the documented experiment gates.

### Remaining work

- No implementation work remains in this task after final repository verification and Git integration.

### Exact next action

For Prime work, freeze the Gate A synthetic depth-one protocol described in the architecture note; obtain separate authorization before configuring a provider or running it.

### Blockers or required decisions

- A provider/model and evaluation budget must be selected before Gate A can run.
- Gate A results determine whether durable child/session work proceeds; Gate B results determine whether PEEK-derived memory becomes durable.

## Handoff state

- **Git:** Authoritative checkout on `codex/out-of-core-query-results`; starting commit `1ce9801`; implementation commit `b26c18a`; the planning/handoff commit contains this completion record. Local-main reachability is confirmed after integration.
- **Verification:** `npm test` passed 149/149; `npm run smoke`, `npm run linked-science:verify`, Linked Data REPL skill validation, relative Markdown-link validation across 58 files, and `git diff --check` passed on 2026-09-04.
- **Ephemeral state:** Test kernels and spools close/reset during tests; no runtime handle is claimed as durable.
- **Durable artifacts/receipts:** No experiment result artifact was produced. This task brief and code/tests are implementation evidence, not a live experiment receipt.
