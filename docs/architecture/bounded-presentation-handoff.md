# Bounded presentation and visualization handoff

Presentation consumes an explicit bounded view of retained state. It never receives an entire endpoint result by default.

`displayTable` produces a typed table model with at most 10 scalar rows, selected columns, paging metadata, source handle, and compact provenance. The model is a projection for display, not the resident result, an export, or an HTML application. A later inspection or derivation returns to the source or derived handle rather than treating the displayed rows as complete data.

Any future visualization kind must accept an explicit bounded page, aggregate, or derived handle and preserve its source lineage and budget. Charts must not materialize a whole result into coordinator context. Export is a distinct, separately authorized capability with a controlled non-overwriting artifact target; the [large-result export protocol](../experiments/large-result-export.md) remains planned only.

For the curated demo, the required endpoint is an evidence-backed bounded table. Chemistry depiction is optional and separately packaged so it cannot expand the core Linked Data session, guard, or presentation contract. The [JSmol static-render spike](../experiments/jsmol-static-render.md) records one local fixture experiment; it is not part of the table pipeline and adds no visualization runtime to this project.

The earlier context-map dossier contains the implemented table-model details and historical handoff rationale: [coordinator-worker context-map recovery](../experiments/coordinator-worker-context-map.md#presentation-handoff).
