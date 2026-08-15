# Legacy schema-derived affordance catalog experiment

## Status

**Legacy experimental surface.** The catalog is retained as a record and compatibility code, but it is no longer agent-facing. It over-combined evidence locations, terms, example motifs, and trajectory selection. Its replacement is the minimal evidence manifest described in [the goal-loop dossier](goal-loop-state-graph.md).

## Original question

Can a worker shorten its query-construction trajectory by consulting a compact, source-backed catalog of ontology prefixes, terms, endpoint roles, and official query motifs before generating a SPARQL query?

## Implemented local surface

`lib/linked-data-affordances.mjs` provides a generic, versioned documentation-affordance surface. A resource pack supplies source-specific prefixes, terms, motifs, and endpoint roles; the reusable code supports only:

1. `lookupAffordances({ tags })` — select known prefixes and motifs by task concepts;
2. `createAffordancePlan({ motifId, limit })` — produce a bounded, non-executing plan; and
3. `validateAffordancePlan(plan)` — reject changes to profile, prefixes, service targets, or limit.

The compact plan identifies the primary endpoint, approved service targets, source example, prefixes, bound, and a conceptual join outline. It deliberately does **not** execute a query, infer ontology facts, or substitute a catalog entry for live endpoint evidence. The reusable surface has no UniProt-specific branching: the initial `uniprot-rhea-wikidata-exemplar` is a data pack passed to `createAffordanceCatalog`, and a later source adds another pack rather than changing the planning engine.

## Source basis

The initial catalog is intentionally small and manually curated from the [UniProt core ontology IRI](http://purl.uniprot.org/core/) and the official [UniProt SPARQL example catalog](https://sparql.uniprot.org/.well-known/sparql-examples/). It records motifs corresponding to the Rhea/InterPro combination example (44), the Rhea/UniProt/Wikidata federated drug example (45), and the accession-to-HGNC mapping example (58).

This is a source snapshot, not a downloaded or complete ontology. Each plan returns the exact official example URL for review and provenance.

## Resource-pack contract

A pack declares an ID, version, default approved profile, documentation sources, prefix records (`prefix`, `namespace`, `role`, optional endpoint/terms), and motifs. A motif declares task tags, its source ID, needed prefixes, service targets, and a conceptual join outline. The generic surface validates duplicate/unknown IDs, selected prefixes, service compatibility with the active endpoint profile, and the result bound. It does not know how any individual source models proteins, reactions, identifiers, or other domain content.

To add another Linked Data resource, provide a separately reviewed pack and an explicitly approved endpoint profile; then run the same lookup → plan → validate → guarded-query loop. No modification to the generic planner should be needed.

## Worker trajectory

1. Satisfy the persistent-REPL preflight.
2. Inspect `catalogCheckpoint()` and the current result/context map.
3. Look up affordances from the task concepts; name the selected motif and its source.
4. Create and validate a bounded plan before writing a SPARQL query.
5. Validate the actual query with the guarded transport and execute only under the named endpoint profile.
6. Keep the catalog version, motif ID, source URL, selected prefixes, service targets, and limit in the compact map; keep query text and result rows outside it.

## Acceptance evidence

Offline tests prove that a worker can select the documented UniProt/Rhea/InterPro motif, build a plan with only the two approved service targets, reject an altered target or out-of-profile limit, and keep documentation metadata distinct from endpoint results. The deterministic `npm run affordances:demo` command demonstrates the surface without a network request.

## Limits and next evaluation

This is not yet proof that a clean worker uses the catalog well, that a plan generates a valid complete query, or that the live federation executes successfully. The next test should give a clean worker a bounded UniProt question, require a catalog-plan receipt before query construction, and compare its trajectory to a no-catalog control. Any live query needs a separate deliberate run with the guarded profile.
