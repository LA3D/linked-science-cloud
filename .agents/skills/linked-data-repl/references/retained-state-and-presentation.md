# Retained state and bounded presentation

## Results behind handles

Use `lib/repl-linked-data-session.mjs` when results should survive across REPL calls. For live results, prefer `queryToHandleGuarded`; use direct materialization methods only for values already obtained through another verified guard. Materialize once under a symbolic handle, then inspect with bounded `profile`, `page`, `deriveFilter`, or `deriveCountBy` operations rather than rerunning or dumping the source result.

A handle name is not residency evidence. Cite current tool-generated operations for its type, count, and state. Keep raw documents, full rows, and quads resident; return only the bounded evidence needed for the task.

## Symbolic orientation cache

Use `createOrientationMap`, `recordAcquisitionOrientation`, `recordResultOrientation`, and `recordOrientation` from `lib/context-map-recovery.mjs` when a task needs a compact context map. This is the PEEK-style orientation cache beside the REPL's bulk state:

- `context-roadmap`: available or attempted sources;
- `context-understanding`: grounded relations and known failures;
- `domain-constants`: stable IRIs and identifiers;
- `parsing-schema`: detected formats and reusable parsing facts; and
- `reusable-results`: named retained handles and their roles.

The map is bounded, stable-ID, JSON-compatible symbolic state. It may point to evidence handles but must not contain raw documents, rows, SPARQL text, task answers, prose reasoning, or a competing goal/workflow state machine. Add only reusable orientation that reduces later search or prevents a repeated failure. Priority eviction keeps the map compact; the REPL handles retain the inspectable evidence.

## Reset and stale state

Reset destroys JavaScript bindings and resident handles. A pre-reset orientation entry may retain lineage or a known failed route, but it cannot prove that a handle remains available. Check the current session and report a referenced handle as missing or invalidated when appropriate.

Rematerialization is a new guarded operation, not reuse or automatic recovery. It requires the original source path to remain authorized and yields new provenance. If the source, approval, or tool is unavailable, stop honestly rather than reconstructing state from the map.

## Presentation

Use `displayTable` for an inline table model of at most 10 scalar rows. A display model is a bounded projection, not the result itself. It identifies the source handle, selected columns, page, and compact provenance. Any future chart must consume an explicit bounded page, aggregate, or derived handle rather than a whole result. Export requires separate user authorization and is not implemented by this skill.

## Reporting

Report at the scale of the question. Include enough compact evidence to distinguish:

- which source or query was actually used;
- which state is currently verified as resident;
- what the bounded result supports; and
- what remains uncertain or requires another source or permission.

Do not manufacture a map, receipt, frontier, or operation narrative merely to satisfy a template. See the repository architecture notes for the stable [session](../../../../docs/architecture/persistent-session-and-handles.md), [orientation/reset](../../../../docs/architecture/orientation-cache-and-reset.md), and [presentation](../../../../docs/architecture/bounded-presentation-handoff.md) boundaries.
