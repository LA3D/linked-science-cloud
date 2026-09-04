# Task: heap-aligned residency, bindings spill, and indexed spool

- **Status:** Complete
- **Owner/task:** Claude review follow-up (interactive session, 2026-09-04)
- **Scope:** Correct three defects found by probing runtime 6.1.0 through the actual broker: kernel death below the advertised residency ceiling, no out-of-core path for `SELECT` solutions, and whole-result re-streaming by the stored quad source. Reorder Gate D in the plan so ergonomics no longer wait on the recursion and PEEK gates. Excludes facade pre-injection, worker-guidance trimming, provider activation, PEEK policy, and durable state.
- **Authorization boundary:** The user asked for these issues to be fixed. Repository-local source, tests, and documentation changes on a task branch. No commit, push, dependency installation, live evaluation, export, or global configuration change was made.
- **Starting point:** `claude/resident-quota-spool-index` from local `main` at `10550cf`

## Outcome and acceptance evidence

Runtime 6.2.0 derives resident-graph quotas from the kernel heap, guards retention and copies with a live headroom check, runs local queries over lazy indexed sources, spills large solution sequences with bag semantics, and treats broker-stored quad results as indexed sources with pattern pushdown and exact counts. Broker 0.6.0 stores quads in a columnar SQLite table with SPO/POS/OSP indexes, serves keyset-paged pattern matches and counts, defaults the kernel heap to 1024 MB, and classifies heap-exhaustion exits as `KERNEL_OOM` with epoch-loss repair guidance.

Acceptance is established by unit tests for the spool (index shapes, keyset completeness, default-graph remaining column, bag-semantics bindings), actual JSON-RPC broker tests (stored bindings paging, indexed join with zero page calls, heap-derived quota refusal, `KERNEL_OOM` classification), runtime tests (heap basis reporting, RDF merge semantics across sources), and the repository verification contract.

## Current state

### Completed evidence

Measured through the actual broker on 2026-09-04, before and after:

| Probe | Before (6.1.0) | After (6.2.0) |
| --- | --- | --- |
| Two-pattern join over a 20,000-quad stored result | 15.8 s, 4,264 whole-result page calls | 0.24 s, 0 page calls, 102 indexed matches + 102 exact counts |
| Full scan of the same stored result | 42 page calls (two scans) | 21 indexed matches + 1 count |
| `SELECT` returning 20,000 rows at default budgets | failed at the 500-item quota | complete stored bindings handle |
| 256 MB heap: 50,000-quad load then full `CONSTRUCT` | SIGABRT during `CONSTRUCT` | completes; advertised quota 62,914 quads |
| 256 MB heap: 100,000-quad load | SIGABRT during load | refused by quota before retention |
| Default heap: 100,000-quad load, `CONSTRUCT`, join over stored result | not possible at 256 MB | 1.0 s / 4.2 s / 1.2 s |

- Post-GC measurement showed about 2.2 KiB of live heap per retained quad and no retained cost after a `CONSTRUCT`; the abort was N3's `match()` building a filtered index copy of the whole store during the scan. The lazy `readQuads` source removes that copy.
- The plan, architecture note, README, broker README, skill, references, roadmap, and API schema describe the new contract.

### Decisions

- Configured residency defaults are ceilings. The effective quota is the minimum of the ceiling and the heap-derived value; the derivation is reported, never hidden.
- The per-quad estimate (2,560 bytes) is a measured planning constant for IRI-heavy data, not a bound; the live headroom check covers data with longer terms.
- Stored bindings keep SPARQL bag semantics and are not query sources; stored graphs keep set semantics and are indexed sources.
- Multi-source local queries are an RDF merge over lazy sources with duplicate quads collapsed, matching the earlier merged-store semantics without the copy.
- The broker default heap is 1024 MB. It remains a constructor option, and the facade adapts its quotas to whatever heap it receives.
- Kernel exit classification reads the stderr tail on `close`, not `exit`, so the V8 abort message is complete before callers are told.

### Remaining work

- None for this slice. Facade pre-injection and worker-guidance trimming (Gate D) are documented as independent of Gates A-C and remain a separately authorized slice.

### Exact next action

Review the diff on `claude/resident-quota-spool-index`, run `npm test`, `npm run smoke`, and `npm run linked-science:verify`, then commit and fast-forward into local `main` per [git-handoff](../agent/git-handoff.md) if accepted.

### Blockers or required decisions

- None.

## Handoff state

- **Git:** Authoritative checkout `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`; task branch `claude/resident-quota-spool-index`; starting commit `10550cf`; changes are uncommitted in the working tree pending the user's review; unrelated untracked `artifacts/structure-viewer/` is preserved and excluded.
- **Verification:** On 2026-09-04, `npm test` passed 156/156 (including four new broker tests, two new spool tests, and one new runtime test), `npm run smoke` passed, `npm run linked-science:verify` passed with the mounted broker at 6.2.0, relative Markdown links across the twelve changed documents resolved, the Linked Data REPL skill validated, and `git diff --check` was clean. Live external sources were not contacted.
- **Ephemeral state:** Probe kernels and spools were closed; no runtime handle is claimed as durable.
- **Durable artifacts/receipts:** This task record, code, and tests; no experiment result artifact because this is implementation verification, not an intentional scientific evaluation run.
