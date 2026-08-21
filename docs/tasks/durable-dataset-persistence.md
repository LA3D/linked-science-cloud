# Task: Add durable dataset persistence to the clean-room runtime

- **Status:** Deferred until the bounded UniProt preflight and first frozen baseline are assessed
- **Owner/task:** Unassigned
- **Scope:** Design and implement an explicit host-mediated artifact layer for RDF datasets constructed or retrieved in the project-owned clean-room REPL. Do not broaden child filesystem authority or alter evaluation isolation.
- **Authorization boundary:** This brief is planning only. Implementation, artifact creation/deletion, live traversal, dependency changes, and exports require separate authorization.
- **Starting point:** Consumer-owned Linked Science runtime version 2 on local `main`; post-restart ownership, dependency resolution, mediated traversal capability, and reset clearing are already verified.

## Outcome and acceptance evidence

The consumer-owned runtime exposes a narrow dataset persistence contract such as `save`, `load`, `list`, and `remove`. The parent owns all filesystem operations; the child receives no ambient filesystem access. The globally bundled `node_repl` is prohibited for Linked Science production and evaluation work and is outside this task.

An explicitly saved dataset version must preserve:

- canonical RDF serialization suitable for named graphs and datasets, such as canonical N-Quads or TriG;
- immutable content-addressed identity and hashes, plus optional human aliases;
- media type, graph/quad/byte counts, runtime and artifact-schema versions;
- retrieved source and per-hop receipts; and
- construction, query, and derivation lineage.

Reset semantics are explicit: transient variables, native handles, workspaces, RLM context, and the facade clear on `js_reset`; saved dataset versions survive; loading creates fresh epoch-bound handles; and all pre-reset handles remain stale and invalid.

Acceptance requires offline tests for canonical round trips, named-graph fidelity, save-reset-load with a fresh handle, stale-handle rejection, alias/version lookup, bounded listing, atomic writes, storage-root confinement, quotas and size ceilings, format/hash validation, corrupt or untrusted content, concurrent attempts, and authorized retention/removal. Deletion must never be implied by reset or ordinary loading.

## Current state

### Completed evidence

- The consumer-owned clean-room runtime and module dependency roots are verified after Desktop restart.
- Runtime version 2 exposes mediated public-HTTPS traversal without child raw networking.
- Kernel reset clears variables, facade state, RLM context, workspaces, and native handles while preserving only broker-owned orientation state.

### Decisions

- This is the missing durable dataset artifact layer, not a networking, dependency-resolution, runtime-ownership, or reset-detection task.
- Persistence is explicit and host-mediated; no ambient child filesystem access is allowed.
- Immutable content versions and provenance are authoritative; aliases are references, not mutable dataset identity.
- Persisted RDF is untrusted data and must never become instructions, RLM context, PEEK content, or evaluator-private state automatically.
- This task remains behind the immediate UniProt preflight and first frozen baseline/private-evaluation sequence.

### Remaining work

- Design and version the parent/child persistence API and artifact metadata schema.
- Select and justify the canonical dataset serialization and deterministic hashing procedure.
- Define the confined storage root, atomic write protocol, quotas, retention policy, and separately authorized removal semantics.
- Implement the host service, runtime facade, receipts, documentation, and offline adversarial tests in a future authorized task.

### Exact next action

Do not implement yet. After the first frozen UniProt baseline is assessed, draft the versioned host API and artifact schema for review before changing runtime code or storage.

### Blockers or required decisions

- Canonicalization algorithm and permitted serialization variants need design review.
- Storage quota, retention duration, alias collision behavior, and removal authorization must be fixed before implementation.

## Handoff state

- **Git:** Planning record only on consumer local `main`; no implementation branch or worktree exists.
- **Verification:** Documentation links and task-index conventions only; no runtime, persistence, network, or baseline behavior is claimed by this brief.
- **Ephemeral state:** None.
- **Durable artifacts/receipts:** None; this brief is not a dataset artifact or experiment result.
