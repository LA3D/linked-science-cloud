# Linked Science CodeAct runtime v1

## Status

Implemented and verified on `codex/linked-science-runtime-v1`; the local commit is recorded in the task handoff.

## Outcome

Deliver the smallest production-oriented local vertical slice in which a fresh agent can discover one stable JavaScript facade, retain ontology/schema/SHACL/instance RDF objects, use Communica for bounded local queries, write a generic derivation callback, inspect bounded provenance-bearing results, and recover honestly across epoch reset.

## Decisions

- CodeAct-style persistent JavaScript remains the primary action space; no fixed scientific-domain MCP tool set was introduced.
- `lib/orientation-map.mjs` separates PEEK orientation from the older goal/step/frontier machinery. `context-map-recovery.mjs` re-exports the map API for compatibility.
- Opaque runtime handles retain RDF/JS terms privately and carry epochs. PEEK stores only symbolic references.
- Runtime v1 is local/synthetic. Existing live guards are reachable only as compatibility adapters and retain their prior approval boundary.
- Recursion, providers, charts, live source packs, and private browser bridge behavior are excluded.

## Acceptance evidence

The synthetic fixture contains two instance sources, one ontology, and one SHACL graph. Runtime tests cover ontology discovery, ontology-informed `SELECT`, raw Communica comparison, generic derivation, bounded table and neighborhood observations, RDF term fidelity, duplicate/order fingerprints, provenance, API/schema routing, executable examples, and stale-handle rejection after reset/recreation.

The fresh-agent fixture in `test/fixtures/runtime-discovery/` provides only a natural scientific goal plus a separate scoring rubric. The deterministic evaluator checks documentation-first discovery, orientation bootstrap, typed retention/reuse, bounded output, provenance, no unsupported API invention, and honest reset recovery. It is an evaluation fixture, not a claim that an external model trial was run.

## Verification evidence

- `npm test`: 64 passed.
- `npm run smoke`: passed.
- `npm run runtime:synthetic`: passed with a bounded derived table, neighborhood provenance, orientation checkpoint, and stale reset status.
- Linked-data-repl skill quick validation: passed.
- Relative Markdown links: 33 files validated.
- `git diff --check`: passed.

The separate pre-existing RDKit Python tests could not execute in the available Python environments because `rdkit` was not installed; no package installation was authorized. This runtime slice does not touch chemistry code. No live endpoint, recursive provider, or untrusted-child broker integration was tested in v1.
