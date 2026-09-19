# Scientific REPL: current plan

**Status:** Simplification implemented and verified, 2026-09-04. The user accepted the architecture review and authorized the repository-local implementation described in [the task brief](docs/tasks/repl-simplification.md).

## Product and ownership

The product is a persistent scientific JavaScript REPL with composable RDF/JS objects, Comunica queries and bounded observations. The session layer owns handles, provenance and lifetime. N3 and other installed RDF/JS libraries own graph operations; Comunica owns query execution; the project broker owns mediated transport, authority, output limits and physical storage.

Codex owns goals and worker lifecycle. Durable child sessions, event sourcing and continual-harness refinement are optional research directions, not prerequisites for useful scientific work.

The authoritative checkout is `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`. The sibling experimental probe and the bundled generic REPL do not substitute for its broker or facade.

## Current implementation scope

1. **Explicit lifetime:** `workspace.release(handle)` reclaims one retained object; `workspace.dispose()` and `linkedScience.reset()` invalidate a workspace and reclaim its broker storage, including allocations already in flight. Await cleanup. Late work cannot publish a successful handle in the old workspace.
2. **Native composition:** `rdf.source(handle)` exposes a streaming RDF/JS Source with indexed matching/counts. `rdf.clone(handle)` explicitly creates a mutable resident dataset; `rdf.dataset` remains its compatibility alias. Avoid unnecessary intermediate arrays and term copies. Preserve source ordering, duplicates, named graphs and provenance where promised.
3. **Simple startup:** the project broker initializes the validated facade before the first evaluation in each kernel. Routine work opens a workspace directly. Explicit bootstrap and full identity checks remain diagnostic tools.
4. **Small orientation:** `inventory()` describes currently retained handles. The orientation map holds reusable source descriptions, versions and evidence references; query results do not automatically fill it. An optional `orientationContext: { id, version }` shares orientation across questions about the same context.
5. **Proportionate checks:** validate actual server identities while allowing nested tool settings. Use targeted lifecycle/native-source tests and the repository verification contract.

The inherited heap, query-completeness and indexed-spool corrections are preserved. A successful query remains complete under the caller's SPARQL and the declared DESCRIBE policy. Projection bounds never silently change a query. Stored results remain an optional backend behind the existing private adapter; an in-memory N3 store does not replace disk-backed result storage.

## Evidence and acceptance

- Release returns graph capacity, removes stored results and prevents new access through old handles/views.
- Reset of workspace A leaves workspace B intact and reclaims A's private stored results without a whole-kernel reset.
- Reset racing with spool creation/commit cannot leak newly allocated storage or publish an old-epoch result.
- Native Source composition preserves RDF terms and supports resident/stored queries without whole-result cloning; mutable clones cannot change retained evidence.
- A first project MCP call can use `linkedScience`; after kernel reset the facade is rebuilt and old bindings remain absent.
- Recurring contexts can share source orientation while their handle inventories and authority stay separate.
- Existing mediated traversal, result bag/set semantics, all four SPARQL read forms, bounded projections and identity tests continue to pass.

Verification: `npm test`, `npm run smoke`, `npm run linked-science:verify`, `git diff --check`, plus relative-link and changed-skill validation. Tests establish their exercised behavior, not live scientific competence or a guarantee of bounded memory for every query operator.

## Optional research

The [wiki-memory implementation plan](docs/tasks/wiki-memory-continual-learning.md) specifies an independent repository-owned Science Cloud wiki, reuse of Codex history, skill validation and release/rollback. It is separate from the user's Obsidian wikimemory. The engineering import fixture is excluded from learning. A versioned scientific-workflow eligibility filter and one actual broker-mediated UniProt annotation-overlap/recovery episode are implemented. A repository-owned [scientific wiki](wiki/README.md), bounded proposal coordinator and maintainer skill are now implemented. The two seed patterns remain proposed; independent counterexample and transfer evidence are missing. Runtime scientific memory, skill evolution and learning evaluations remain proposed.

The [RLM paper](https://arxiv.org/html/2512.24601v2) motivates keeping large context external and inspecting it programmatically. Its REPL-only ablation is a useful baseline; depth-one model calls should first demonstrate value on semantic work that SPARQL does not finish, such as interpreting annotations. Durable asynchronous child sessions are a separate hypothesis.

The [PEEK paper](https://arxiv.org/html/2605.19932v1) motivates reusable orientation across questions over recurring context. First compare the current small map with no-map/manual-map controls. A Distiller/Cartographer/Evictor policy needs its own measured gain and authorization; it is not implemented by maintaining a handle catalog.

If useful evidence and a concrete user need justify durability, test the smallest recovery capability needed. A successful recursion or orientation experiment does not automatically authorize the broader Prime program. See [optional context research](docs/architecture/prime-linked-data-context-management.md).

## Historical records

The [earlier Prime research plan](docs/architecture/prime-research-plan-2026-09-04.md), [Phase 0 decision](docs/architecture/prime-durable-core-phase-0.md), experiment dossiers, journals and registered receipts remain historical evidence. They do not define the minimum product or authorize future work.

## Authorization

This slice authorizes local source, tests, documentation, focused commits and safe local-main integration. It does not activate providers, learned policy, live/formal evaluation, exports, package installation, global configuration changes, authenticated access, mutation, bulk ingestion or push. Ordinary goal-relevant anonymous public reads remain governed by the existing mediator contract.
