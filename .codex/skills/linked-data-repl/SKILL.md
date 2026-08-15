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

## Persistent REPL preflight — hard gate

Any task that invokes this agentic-REPL workflow must begin with this preflight **before source-level analysis, a fixture, or repository prose can satisfy the goal**. Verify that the persistent JS REPL tool is available and make an **actual JS REPL call** that emits a state receipt. The receipt must name the tool/capability, explicit execution mode `persistent-js-repl`, Communica module resolution, session and map binding states, and actual operation IDs. A compact shape is:

```js
{
  tool: 'mcp__node_repl__js',
  capability: 'persistent-js-repl',
  executionMode: 'persistent-js-repl',
  moduleResolution: { '@comunica/query-sparql': '...' },
  bindings: {
    session: { state: 'present' | 'absent', name: '...' },
    map: { state: 'present' | 'absent', name: '...' },
  },
  operations: [{ id: '...', kind: 'materialize' | 'handle-inspection' | 'recover' | 'rematerialize', handle: '...', actual: true }],
}
```

If the tool is unavailable, stop with `missing-persistent-repl`. Do not fall back to a terminal/CLI script, and do not infer an execution-backed conclusion or retained state from repository source, a fixture, or conversation history. Source/fixture inspection may satisfy a goal only when the user explicitly requests **static source inspection**. CLI scripts such as `npm run session:synthetic` are deterministic fixtures only, never evidence of a retained session. Every stateful claim must cite a prior operation ID from an actual REPL-state receipt; a coordinator must reject uncited claims and source-only conclusions for an agentic-REPL task.

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

Use `lib/guarded-sparql-transport.mjs` for live queries. It is the enforcement point: it parses one bounded read query, rejects updates, pins the endpoint profile, blocks redirects, sets timeout/retry controls, and records provenance. Pass its options directly to `QueryEngine`; do not nest them under `context`.

The standard `identifiersOrg` profile pins `https://sparql.api.identifiers.org/sparql`. The separate `identifiersOrgLiveTable` demonstration profile pins the same endpoint but permits only `SELECT` and caps materialization at 20 rows. It is not a replacement for the standard profile. Run the UniProt example with `npm run query:identifiers-uniprot`; it uses Communica only. Read [the Identifiers.org schema reference](references/identifiers-org-sparql.md) before changing its query.

GET and POST are both accepted only for a syntactically valid `SELECT`, `ASK`, `CONSTRUCT`, or `DESCRIBE` query. Keep results at the profile cap and report its provenance; a transport attempt or empty result is not proof of registry semantics.

The approved `uniprotRheaWikidataFederation` profile starts at `https://sparql.uniprot.org/sparql` and permits only `SELECT` with `LIMIT 1-10`. Its only permitted `SERVICE` targets are exactly `https://sparql.rhea-db.org/sparql` and `https://query.wikidata.org/sparql`; all three endpoints are exact HTTPS path pins. `SERVICE SILENT`, variables in `SERVICE`, every other host/path, updates, and unbounded queries remain blocked. Treat each federated query as a single bounded navigation turn and return per-request transport provenance. Do not add another endpoint, dereference provider URLs, or enable federation under another profile without explicit approval.

## Schema affordances before query construction

For UniProt/Rhea/Wikidata work, consult `lib/linked-data-affordances.mjs` before composing a query. In the persistent REPL, bind one catalog module and checkpoint:

```js
var affordanceModule = await import('./lib/linked-data-affordances.mjs');
var affordances = affordanceModule.uniprotRheaWikidataAffordances;
var affordanceCheckpoint = affordances.catalogCheckpoint();
var lookup = affordances.lookupAffordances({ tags: ['protein', 'rhea', 'wikidata', 'drug', 'federated'] });
var plan = affordances.createAffordancePlan({ motifId: lookup.motifs[0].id, limit: 5 });
affordances.validateAffordancePlan(plan);
```

Treat prefixes as typed affordances: each has a namespace, endpoint role, terms, and official-source provenance. Select a motif by task concepts, cite its source URL, and retain only pack ID/version, motif ID, prefixes, service targets, and limit in the compact map. A plan is documentation guidance, not a query result or authorization to execute. Write the actual query only after plan validation, then pass it through the guarded transport. Do not invent a `SERVICE` target or use catalog contents as proof of live ontology behavior.

The planning surface is resource-neutral. `UNIPROT_RHEA_WIKIDATA_AFFORDANCE_PACK` is an exemplar passed to `createAffordanceCatalog`; it is not built into generic lookup, planning, or validation. Add a new Linked Data resource through a reviewed versioned pack plus an explicit endpoint profile, then use the same workflow. Read [the affordance experiment](../../../docs/experiments/affordance-catalog.md) for the pack contract and initial motifs.

## Context-map recovery experiment

Run `npm run experiment:context-map` for the one-step recovery slice, `npm run experiment:context-map-two-turn` for turn one, or `npm run experiment:context-map-two-turn-turn2` after a coordinator records a selection from the saved frontier. They preserve the guarded profile, write timestamped receipts under `artifacts/context-map-runs/`, and record only the assigned goal, bounded worker report, transport provenance, compact checkpoint, and explicit coordinator decision—not coordinator conversation history. Read [the experiment protocol](../../../docs/experiments/coordinator-worker-context-map.md) before extending its scenario.

## Persistent result handles

For local synthetic navigation, initialize `LinkedDataReplSession` once in the persistent REPL and materialize a result under a symbolic handle. Put only `checkpoint()` metadata in a context map: handles, profile, bounded sample, provenance, and lineage—not table rows or query text. Use bounded `profile`, `page`, `deriveFilter`, or `deriveCountBy`; never dump a handle's full result. A visualization, table, or export is a future consumer: build it only from an explicit bounded page or derived view, retaining its source handle and provenance. Never pass a whole endpoint result to a visualization or coordinator context. A REPL reset invalidates resident handles, so call `recover(checkpoint)` only to recognize what must be rematerialized. `npm run session:synthetic` is a deterministic CLI fixture, not a persistent-state demonstration.

For an explicitly approved live-table demonstration, create a retention-only session (`sources: []`, `maxRows: 20`), execute exactly one `queryBindingsGuarded` call with `identifiersOrgLiveTable`, then pass its already-guarded bindings to `materializeBindings`. Do not call session query materialization for a live endpoint. In a second REPL call, reuse that same handle for `profile` and a page of at most 10 rows; it must not query again.

For inline presentation, call `displayTable({ handle, title, columns, offset, limit })` on a retained handle. It emits a typed table model—not HTML—with `kind`, selected column descriptors, at most 10 scalar-only rows, page metadata, and `source.handle` plus a compact provenance summary. It excludes query text, hashes, and all unpaged rows. Keep chart kinds as a future extension; any future display/export consumer must start from the same bounded handle page or derived view.

For future large-result export, require explicit user authorization and stream a retained handle only to a controlled project artifact area, never coordinator context. Avoid overwrite by default and keep the export distinct from the in-memory handle. Its context-map entry must record artifact path and format, schema, row count, hash, provenance, and lineage. This skill does not implement or perform exports.

## Mandatory navigation-turn loop

For every navigation turn, follow this loop and make it visible in the compact worker report:

1. **Orient:** satisfy the persistent-REPL preflight before any stateful claim, then inspect compact map and session state (`checkpoint`, `recognize`, `profile`, or an equivalent bounded state view).
2. **Justify one action:** name one bounded next action and cite the map fields, handle status, and remaining query/result budget that permit it.
3. **Act:** perform only that action through the applicable local or guarded path.
4. **Update:** record the resulting handle/session status, budget consumption, compact provenance/evidence, and any invalidation or rematerialization need.
5. **Report:** state handle reuse or rematerialization, budget, observed evidence, uncertainty, and a symbolic frontier for the coordinator.

Conversation memory is not map state. Raw result dumps are not map state. The map contains only compact profile, handle, count/sample, provenance, lineage, safe-operation, and budget metadata; it never substitutes for an explicit session check.

## Verification

Run `npm run smoke` for the disposable command-line check. It queries the same kind of in-memory synthetic graph and must return `synthetic Communica SELECT passed: Alex`.

This baseline was verified in this project on 2026-08-15 with the local `@comunica/query-sparql` and `n3` packages, an in-memory `SELECT`, and a second REPL call that retained the engine and store. Reconfirm in a new session before relying on it.
