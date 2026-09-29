# Task: Add durable dataset persistence to the clean-room runtime

- **Status:** Bounded persistence implemented within the explicitly authorized durable RLM handoff slice; verified and integrated into local main
- **Owner/task:** [Durable RLM handoff](durable-rlm-handoff.md)
- **Scope:** Design and implement an explicit host-mediated artifact layer for RDF datasets constructed or retrieved in the project-owned clean-room REPL. Do not broaden child filesystem authority or alter evaluation isolation.
- **Authorization boundary:** The 2026-09-29 handoff implementation authorizes source/tests/docs and bounded synthetic recovery artifacts. Live activation, configuration, dependencies and unrestricted exports remain separately governed.
- **Starting point:** Consumer-owned Linked Science runtime version 2 on local `main`; post-restart ownership, dependency resolution, mediated traversal capability, and reset clearing are already verified.

## Outcome and acceptance evidence

The consumer-owned runtime exposes a narrow dataset persistence contract such as `save`, `load`, `list`, and `remove`. The parent owns all filesystem operations; the child receives no ambient filesystem access. The globally bundled `node_repl` is prohibited for Linked Science production and evaluation work and is outside this task.

The original broader persistence target was the following; the bounded implemented subset and revised identity decision are specified below:

- canonical RDF serialization suitable for named graphs and datasets, such as canonical N-Quads or TriG;
- immutable content-addressed identity and hashes, plus optional human aliases;
- media type, graph/quad/byte counts, runtime and artifact-schema versions;
- retrieved source and per-exchange receipts; and
- construction, query, and derivation lineage.

Reset semantics are explicit: transient variables, native handles, workspaces, RLM context, and the facade clear on `js_reset`; saved dataset versions survive; loading creates fresh epoch-bound handles; and all pre-reset handles remain stale and invalid.

Acceptance requires offline tests for canonical round trips, named-graph fidelity, save-reset-load with a fresh handle, stale-handle rejection, alias/version lookup, bounded listing, atomic writes, storage-root confinement, quotas and size ceilings, format/hash validation, corrupt or untrusted content, concurrent attempts, and authorized retention/removal. Deletion must never be implied by reset or ordinary loading.

## Current state — explicitly authorized 2026-09-29 slice

The user subsequently authorized durable RDF/JSON data as part of the general-purpose [RLM handoff implementation](durable-rlm-handoff.md). That authorization supersedes the earlier planning-only/deferred instruction for this bounded slice. It does not authorize global configuration changes, live activation, unrestricted exports or bulk ingestion.

The [implemented contract](../architecture/durable-rlm-handoff.md) uses versioned RDF/JS term JSON and exact encoding digests rather than claiming canonical RDF graph identity. It preserves source sequences, RDF sets, bindings bags, named graphs, provenance and fresh-handle restore. The initial complete snapshot ceiling is 128 KiB; larger streaming persistence, RDF canonicalization, aliases and additional result types remain deferred. Existing source fingerprints remain metadata, and epoch-scoped result spools remain ephemeral.

The host owns a confined private SQLite store, quotas, atomic transactions, integrity checks and explicit retention/removal. A restart loads only the selected activity and explicitly selected shared references. See the implementation task for verification and Git handoff status.

### Exact next action

Complete the authorized handoff slice's tests and review. Any later expansion beyond its documented supported types, quotas or activation boundary needs its own scope. Do not run a live evaluation or alter the active scientific session based on this brief.
