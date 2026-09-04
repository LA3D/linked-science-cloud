# Retained state and bounded presentation

## Results behind handles

Use `lib/repl-linked-data-session.mjs` for offline compatibility work. In the production clean-room runtime, use `workspace.evidence.load` for local declarative material, `workspace.resources.get` for bounded representations, and `workspace.traversal.query(options)` for SPARQL/Communica reads. Resource responses retain native bytes with aggregate lineage; `resource.rdf()` creates a graph handle directly, while JSON/text/arrayBuffer methods compose inside the REPL. Materialize once under a symbolic handle, then inspect with bounded `resources.inspect`, `profile`, `page`, or `derive` operations rather than rerunning or dumping the source result. PEEK receives only compact handle metadata, never the query or result payload.

A handle name is not residency evidence. Cite current tool-generated operations for its type, count, and state. Graph quad count and result row count are resident-state facts, not prompt budgets. Keep raw documents, full rows, and quads resident; return only the bounded profile, subquery, neighborhood, page, aggregate, or provenance needed for the task.

## Symbolic orientation cache

The active Linked Science facade uses the clean-room broker's `nodeRepl.peek` operations through `workspace.orientation`; do not also instantiate `lib/orientation-map.mjs` for the same runtime context. The library map and its `context-map-recovery.mjs` re-export remain for compatibility and offline standalone work. Both use these sections:

- `context-roadmap`: available or attempted sources;
- `context-understanding`: grounded relations and known failures;
- `domain-constants`: stable IRIs and identifiers;
- `parsing-schema`: detected formats and reusable parsing facts; and
- `reusable-results`: named retained handles and their roles.

The map is bounded, stable-ID, JSON-compatible symbolic state. It may point to evidence handles but must not contain raw documents, rows, SPARQL text, task answers, prose reasoning, or a competing goal/workflow state machine. Add only reusable orientation that reduces later search or prevents a repeated failure. Priority eviction keeps the map compact; the REPL handles retain the inspectable evidence.

## Reset and stale state

Clean-room `js_reset` destroys JavaScript bindings, RLM contexts, Linked Science workspaces, and resident handles while broker-owned PEEK orientation survives. Bootstrap again before inspecting the map. A pre-reset orientation entry may retain lineage or a known failed route, but it cannot prove that a handle remains available. Check the current workspace and report the reference stale or missing.

Rematerialization is a new mediated operation, not reuse or automatic recovery. It requires current traversal authorization and yields new provenance. If the source, approval, or mediator is unavailable, stop honestly rather than reconstructing state from the map.

## Presentation

Use `displayTable` for an inline table model of at most 10 scalar rows. A display model is a bounded projection, not the result itself. It identifies the source handle, selected columns, page, and compact provenance. Any future chart must consume an explicit bounded page, aggregate, or derived handle rather than a whole result. Export requires separate user authorization and is not implemented by this skill.

## Reporting

Report at the scale of the question. Include enough compact evidence to distinguish:

- which source or query was actually used;
- which state is currently verified as resident;
- what the bounded result supports; and
- what remains uncertain or requires another source or permission.

Do not manufacture a map, receipt, frontier, or operation narrative merely to satisfy a template. See the repository architecture notes for the stable [session](../../../../docs/architecture/persistent-session-and-handles.md), [orientation/reset](../../../../docs/architecture/orientation-cache-and-reset.md), and [presentation](../../../../docs/architecture/bounded-presentation-handoff.md) boundaries.
