# Retained state and bounded presentation

## Native state

Production work uses `workspace.resources`, `rdf`, `query` and `traversal`. `lib/repl-linked-data-session.mjs` remains an offline compatibility API. Resource reads retain bytes and provenance; `resource.rdf()` parses a reusable graph directly. Native terms preserve IRIs, datatypes, languages, blank nodes and graph names. Source evidence also preserves its promised ordering and duplicates.

`rdf.source(handle)` provides streaming matching/counts for resident or broker-stored graphs. `rdf.clone(handle)` explicitly copies a resident graph into a mutable N3 dataset; `rdf.dataset` is a compatibility alias. Stored results require streaming views, bounded observations or later symbolic queries. `rdf.retain` copies caller-owned RDF into the registry.

Successful SELECT/ASK/CONSTRUCT/DESCRIBE handles represent complete results under the submitted query and declared description policy. Small results stay resident; larger bindings and graphs spill to private indexed broker storage. Bag/set semantics remain distinct. A storage/operational ceiling fails without a successful partial handle. Query modifiers are caller semantics, independent of projection bounds.

## Lifetime and orientation

`inventory()` lists current retained handles. `await release(handleOrResource)` invalidates one object and reclaims its registry/storage ownership. Other results retain compact provenance and remain valid. Already copied JavaScript values are caller-owned.

`await dispose()` and `await linkedScience.reset({ contextKey })` invalidate a workspace, clean its broker state including pending allocations, and permit a fresh workspace. Other workspaces survive. Late work cannot publish results in the old workspace. Await cleanup; retry disposal if it reports cleanup failure.

The orientation map holds source descriptions and versions, not a query-result catalog. `orientationContext: { id, version }` optionally shares this advisory context across questions. Registries stay separate; references can be resident here, stale, or from an external workspace. No reference grants authority or establishes residency elsewhere. Use bounded `orientation.bootstrap` presentation on open/resume. Experimental semantic updates cite observed native quads and carry source-version flags; validation establishes references, not truth. Empty or failed orientation is an advisory fallback, and the learned PEEK policy remains optional research.

## Reset and stale state

`js_reset` removes all JavaScript bindings, workspaces and epoch-owned result storage. The next evaluation prepares the facade again. Source orientation may survive but cannot restore scientific data. Reacquisition is a new authorized source operation with fresh provenance. Unavailable sources and exact empty queries never establish global absence.

## Presentation

Use profile, page, table, schema search, neighborhood or query-selected aggregate views. Always await pages/tables across storage tiers. Keep bulk resources and native data outside model output; return only the evidence needed for the question with compact provenance and uncertainty. A display model is not an artifact or full result. Export requires separate authorization.

See [session lifetime](../../../../docs/architecture/persistent-session-and-handles.md), [orientation/reset](../../../../docs/architecture/orientation-cache-and-reset.md), and [bounded presentation](../../../../docs/architecture/bounded-presentation-handoff.md).
