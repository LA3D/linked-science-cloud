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

The only initial profile is `https://sparql.api.identifiers.org/sparql`. Run the UniProt example with `npm run query:identifiers-uniprot`; it uses Communica only. Read [the Identifiers.org schema reference](references/identifiers-org-sparql.md) before changing its query.

GET and POST are both accepted only for a syntactically valid `SELECT`, `ASK`, `CONSTRUCT`, or `DESCRIBE` query. Keep results at the profile cap and report its provenance; a transport attempt or empty result is not proof of registry semantics.

## Context-map recovery experiment

Run `npm run experiment:context-map` for the one-step coordinator-worker recovery slice. It preserves the guarded profile, writes a timestamped receipt under `artifacts/context-map-runs/`, and records only the assigned goal, bounded worker report, transport provenance, and compact checkpoint—not coordinator conversation history. Read [the experiment protocol](../../../docs/experiments/coordinator-worker-context-map.md) before extending its scenario.

## Verification

Run `npm run smoke` for the disposable command-line check. It queries the same kind of in-memory synthetic graph and must return `synthetic Communica SELECT passed: Alex`.

This baseline was verified in this project on 2026-08-15 with the local `@comunica/query-sparql` and `n3` packages, an in-memory `SELECT`, and a second REPL call that retained the engine and store. Reconfirm in a new session before relying on it.
