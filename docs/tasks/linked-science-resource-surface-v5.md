# Task: Composable Linked Science resource surface v5

- **Status:** Complete
- **Owner/task:** Codex
- **Scope:** Broker-mediated public resource responses, RDF/JS composition, Communica reuse, and the matching agent/broker guidance. Excludes authenticated or mutating effects, durable request contexts, additional RDF parser dependencies, and fresh-agent usability evaluation.
- **Authorization boundary:** Repository-local implementation and documentation only. Controlled loopback fixtures were used; no external live source, export, configuration change, remote change, or push occurred.
- **Starting point:** Local `main` at `17c5eff` for the implementation; guidance follow-up from `233b1af`.

## Outcome and acceptance evidence

`linkedScience.resources`, `linkedScience.rdf`, and `linkedScience.traversal` now form the stable persistent JavaScript surface above the private effect-based broker. Ordinary goal-relevant anonymous public reads use broker defaults and automatic provenance; higher-risk effects remain separately governed.

### Completed evidence

- `233b1af` added response-like resource reads, bounded non-RDF inspection, direct RDF parsing, native dataset retain/reuse, effect denial, stale behavior, and actual JSON-RPC broker loopback composition tests.
- `e8ad8e8` aligned root instructions, skill/references, runtime discovery, broker instructions, package documentation, and roadmap with that surface.
- `npm test` passed 138 tests; `npm run linked-science:verify`, `npm run smoke`, skill validation, and diff checks passed.

### Decisions

- Preserve the exact three MCP tools; the general capability lives on the persistent `linkedScience` object.
- Keep ambient raw Fetch and the private traversal bridge unavailable to agent code.
- Treat clean-room as an internal broker boundary; user-facing operational guidance leads with the Linked Science/Linked Data REPL.

### Remaining work

- Authenticated/sensitive/mutating effects, additional RDF parsers, durable request contexts, and fresh-agent usability evaluation are separate future slices.

### Exact next action

Run a fresh-agent usability evaluation before expanding the authority or parser surface.

### Blockers or required decisions

- New authority classes or external writes require explicit authorization.

## Handoff state

- **Git:** `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`, local `main`; v5 implementation `233b1af` and guidance alignment `e8ad8e8` are reachable from `main`; no push.
- **Verification:** `npm test`, `npm run linked-science:verify`, `npm run smoke`, and skill validation passed before this completed record.
- **Ephemeral state:** None claimed; the loopback resource composition was test-scoped.
- **Durable artifacts/receipts:** No new experiment artifact. The roadmap records the offline fixture evidence; historical experiment receipts remain unchanged.
