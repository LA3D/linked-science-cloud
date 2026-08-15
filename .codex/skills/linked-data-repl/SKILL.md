---
name: linked-data-repl
description: Run small, read-only RDF and SPARQL experiments with a persistent Node JavaScript REPL and local Communica dependencies. Use when an in-memory synthetic graph must be queried across multiple REPL calls, or when verifying that local Communica resolution and REPL state persist.
---

# Linked Data REPL

Use this project-local experimental workflow for synthetic, read-only SPARQL work. It is not an endpoint client, a data-import workflow, or a write mechanism.

## Preconditions

1. Work from this project directory.
2. Before changing configuration, check local resolution in the persistent REPL:

   ```js
   await import.meta.resolve('@comunica/query-sparql')
   ```

3. If it does not resolve, stop and report the missing local dependency. Do not change `~/.codex/config.toml`, sandbox mode, or global module paths without approval.
4. Keep all test triples synthetic and in REPL memory. Do not contact an endpoint unless the user explicitly approves that endpoint for the current task.

## Persistent session pattern

Run the initialization cell once. Use top-level `var` so a later call can reuse or replace the bindings without declaration conflicts.

```js
var comunica = await import('@comunica/query-sparql');
var n3 = await import('n3');
var engine = new comunica.QueryEngine();
var store = new n3.Store([
  n3.DataFactory.quad(
    n3.DataFactory.namedNode('https://example.test/alex'),
    n3.DataFactory.namedNode('https://example.test/name'),
    n3.DataFactory.literal('Alex'),
  ),
]);
var rows = await (await engine.queryBindings(
  'SELECT ?name WHERE { <https://example.test/alex> <https://example.test/name> ?name }',
  { sources: [store] },
)).toArray();
nodeRepl.write(rows[0]?.get('name')?.value);
```

Make a second REPL call that uses the existing `engine` and `store`; do not reinitialize them. Verify both the retained state and a query result before claiming persistence.

```js
var persistedRows = await (await engine.queryBindings(
  'SELECT ?name WHERE { <https://example.test/alex> <https://example.test/name> ?name }',
  { sources: [store] },
)).toArray();
nodeRepl.write({ engineRetained: typeof engine?.queryBindings === 'function', name: persistedRows[0]?.get('name')?.value });
```

Treat a REPL reset as destructive to these bindings; initialize again afterward.

## Guarded Identifiers.org SPARQL

Use `lib/guarded-sparql-transport.mjs` for live registry queries. It is the enforcement point: it parses one bounded read query, rejects updates and `SERVICE`, pins the endpoint profile, blocks redirects, sets timeout/retry controls, and records provenance. Pass its options directly to `QueryEngine`; do not nest them under `context`.

The standard `identifiersOrg` profile pins `https://sparql.api.identifiers.org/sparql`. The separate `identifiersOrgLiveTable` demonstration profile pins the same endpoint but permits only `SELECT` and caps materialization at 20 rows. It is not a replacement for the standard profile. Run the UniProt example with `npm run query:identifiers-uniprot`; it uses Communica only. Read [the Identifiers.org schema reference](references/identifiers-org-sparql.md) before changing its query.

GET and POST are both accepted only for a syntactically valid `SELECT`, `ASK`, `CONSTRUCT`, or `DESCRIBE` query. Keep results at the profile cap and report its provenance; a transport attempt or empty result is not proof of registry semantics.

## Context-map recovery experiment

Run `npm run experiment:context-map` for the one-step recovery slice, `npm run experiment:context-map-two-turn` for turn one, or `npm run experiment:context-map-two-turn-turn2` after a coordinator records a selection from the saved frontier. They preserve the guarded profile, write timestamped receipts under `artifacts/context-map-runs/`, and record only the assigned goal, bounded worker report, transport provenance, compact checkpoint, and explicit coordinator decision—not coordinator conversation history. Read [the experiment protocol](../../../docs/experiments/coordinator-worker-context-map.md) before extending its scenario.

## Persistent result handles

For local synthetic navigation, initialize `LinkedDataReplSession` once in the persistent REPL and materialize a result under a symbolic handle. Put only `checkpoint()` metadata in a context map: handles, profile, bounded sample, provenance, and lineage—not table rows or query text. Use bounded `profile`, `page`, `deriveFilter`, or `deriveCountBy`; never dump a handle's full result. A visualization, table, or export is a future consumer: build it only from an explicit bounded page or derived view, retaining its source handle and provenance. Never pass a whole endpoint result to a visualization or coordinator context. A REPL reset invalidates resident handles, so call `recover(checkpoint)` only to recognize what must be rematerialized. Run `npm run session:synthetic` for the local demonstration.

For an explicitly approved live-table demonstration, create a retention-only session (`sources: []`, `maxRows: 20`), execute exactly one `queryBindingsGuarded` call with `identifiersOrgLiveTable`, then pass its already-guarded bindings to `materializeBindings`. Do not call session query materialization for a live endpoint. In a second REPL call, reuse that same handle for `profile` and a page of at most 10 rows; it must not query again.

For inline presentation, call `displayTable({ handle, title, columns, offset, limit })` on a retained handle. It emits a typed table model—not HTML—with `kind`, selected column descriptors, at most 10 scalar-only rows, page metadata, and `source.handle` plus a compact provenance summary. It excludes query text, hashes, and all unpaged rows. Keep chart kinds as a future extension; any future display/export consumer must start from the same bounded handle page or derived view.

For future large-result export, require explicit user authorization and stream a retained handle only to a controlled project artifact area, never coordinator context. Avoid overwrite by default and keep the export distinct from the in-memory handle. Its context-map entry must record artifact path and format, schema, row count, hash, provenance, and lineage. This skill does not implement or perform exports.

## Verification

Run `npm run smoke` for the disposable command-line check. It queries the same kind of in-memory synthetic graph and must return `synthetic Communica SELECT passed: Alex`.

This baseline was verified in this project on 2026-08-15 with the local `@comunica/query-sparql` and `n3` packages, an in-memory `SELECT`, and a second REPL call that retained the engine and store. Reconfirm in a new session before relying on it.
