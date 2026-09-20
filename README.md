# Linked Science runtime

Linked Science is a persistent scientific JavaScript REPL using RDF/JS, N3 and Comunica. Resources, graphs and complete query results stay outside the prompt behind handles. A small workspace API manages their lifetime and provenance; the project broker manages transport, bounds and private result storage.

This checkout is the authoritative implementation at `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`. The separate `node-repl-network-probe` repository and Codex's bundled generic REPL are not substitutes for this runtime.

## Use the REPL

On **each new machine or checkout**, first run these commands in the folder containing this `package.json`:

```sh
npm ci
npm run codex:configure
npm run linked-science:verify
```

Then restart the desktop app and open the project. Setup rewrites only the project MCP's `command`, `args`, and `cwd` using this checkout and the absolute Node executable running setup. It preserves tool approvals and the required-server setting; it does not edit global configuration or install anything itself. Keep these machine-specific config edits local, and rerun setup after moving the checkout or replacing Node. Use a Node version with `node:sqlite` available without extra flags; setup checks that import before writing. Dependencies must be installed locally; Git does not carry `node_modules`.

The checked-in config contains the original workstation paths. Without setup, another checkout can fail before task creation with `cleanroom_node_repl: No such file or directory (os error 2)`. A missing configured working directory or a Node executable unavailable to the desktop app can cause this startup failure. See [runtime discovery](docs/agent/runtime-discovery.md) for the live check.

The project `cleanroom_node_repl` broker initializes `linkedScience` / `ls` before the first evaluation in each kernel:

```js
var ws = linkedScience.open({ contextKey: 'scientific-question' });
var graph = await ws.graphs.load({
  name: 'local-example', kind: 'instance-data',
  text: '<urn:sample> <urn:measurement> 42 .',
});
var result = await ws.query.run({ sources: [graph], sparql: 'SELECT * WHERE { ?s ?p ?o }' });
nodeRepl.write(await ws.results.page(result));
await ws.release(result);
```

Reuse workspaces and handles across calls. `ws.inventory()` lists retained handles. `await ws.dispose()` releases a workspace and its stored results; `await linkedScience.reset({ contextKey })` performs the same cleanup and advances the epoch. Other workspaces remain intact. Kernel reset clears all bindings and epoch-owned storage; the next evaluation rebuilds the facade.

Use `ws.rdf.source(handle)` for native streaming RDF/JS composition. `ws.rdf.clone(handle)` explicitly copies a resident graph into a mutable N3 dataset; `rdf.dataset` remains a compatibility alias. A stored graph is an indexed source for native reads or later local SPARQL, without whole-result cloning.

Public resource reads use `ws.resources.get(url)`. Its response-like object supports in-kernel text/JSON/binary composition and `resource.rdf({ name })`. General remote RDF queries and federation use `ws.traversal.query({ sources, sparql })`; specify a SPARQL service as `{ type: 'sparql', value: serviceUrl }`. The broker discovers destinations dynamically and records each exchange.

Read the [Linked Data REPL skill](.agents/skills/linked-data-repl/SKILL.md) for normal use, [runtime discovery](docs/agent/runtime-discovery.md) for diagnostics, or the [generated API schema](docs/runtime/linked-science-api.schema.json) for exact signatures.

Optional [deterministic N3 reasoning](docs/architecture/deterministic-reasoning.md) runs through a bounded host adapter and retains inferred RDF separately. Inspect `ws.reasoning.capabilities()` before use; installation is machine-specific and no model provider is embedded.

## What the runtime preserves

| Property | Implementation |
| --- | --- |
| Persistent state | Native values and epoch-scoped workspace handles |
| Complete query answers | SELECT/ASK/CONSTRUCT/DESCRIBE without a harness-imposed LIMIT; operational exhaustion fails without a successful partial handle |
| Large retained results | Private SQLite spooling for bindings and graph results; bag/set semantics preserved; indexed graph matching and counts |
| Bounded observations | Independent page/table/schema/neighborhood limits and aggregate 32 KiB default text output |
| Explicit lifetime | Release/disposal reclaim registry ownership, graph accounting and broker storage, including pending allocations |
| Native composition | Streaming RDF/JS Sources and explicit mutable clones using N3/Comunica interfaces |
| Source orientation | Automatic source metadata and experimental agent-proposed RDF evidence entries; separate ephemeral inventory |
| Authority and provenance | Private broker-mediated anonymous reads, identity stripping, request/time/byte/fan-out bounds and automatic receipts |

For recurring contexts, `nodeRepl.write(await ws.orientation.bootstrap({ maxBytes: 4096 }))` explicitly displays a bounded map on opening/resuming; `open()` remains synchronous and does not inject host prompts. The experimental `orientation.update` validates bounded native RDF/JS quad citations and source dependencies, not semantic truth. Empty, rejected or unavailable orientation leaves ordinary scientific work available. See the [experimental scope and comparison plan](docs/tasks/uniprot-orientation-comparison.md).

Resident quotas use heap estimates and headroom checks. They do not prove every RDF term, query operator or arbitrary JavaScript program fits memory. Kernel OOM produces explicit epoch-loss recovery. Complete result storage does not imply bounded working memory for every join, sort or merge operation.

## Ownership

| Surface | Owner |
| --- | --- |
| Package identity | `@linked-science/runtime`, authoritative production implementation |
| Facade / bootstrap | `lib/linked-science-runtime.mjs`, `lib/cleanroom-linked-science-bootstrap.mjs` |
| Broker / persistent kernel | `packages/cleanroom-node-repl`, `@linked-science/cleanroom-node-repl` |
| Project MCP | `.codex/config.toml`, `cleanroom_node_repl`, exactly `js`, `js_reset`, `js_add_node_module_dir` |
| Goals / worker lifecycle | Codex |

The external-context design is informed by RLM and source orientation by PEEK. Optional model recursion is advertised separately. Durable Prime sessions and learned PEEK policy are [research extensions](docs/architecture/prime-linked-data-context-management.md), not prerequisites for the scientific REPL. See the [current architecture](docs/architecture/rlm-linked-science-runtime.md) and [plan](PLAN.md).

## Verification

```sh
npm test
npm run smoke
npm run linked-science:verify
git diff --check
```

`linked-science:verify` launches the actual local JSON-RPC broker and verifies repository identity, tools, persistence, bootstrap and synthetic query/reset behavior. It performs no live traversal. It does not prove which broker a particular Codex task mounted; use [diagnostic discovery](docs/agent/runtime-discovery.md) for that claim. An already-running broker must be restarted to load broker-code changes.

## Access and evidence boundaries

Ordinary goal-relevant anonymous public scientific reads use the mediator's defaults; callers may request tighter bounds. Authenticated, sensitive, mutating, bulk-ingestion, export and evaluation actions need their own authority. No ambient raw Fetch or credentials are exposed to model code. Standard Fetch owns DNS/TLS/sockets/redirects; the broker owns identity, effects, bounds and receipts.

A handle is not an artifact, a display is not a full result, and an orientation entry is not residency evidence. Empty queries and unavailable sources retain their exact scope. The disabled restricted network profile is historical and must not be re-enabled as an alternative transport path. PubChem-scale dumps require a separately authorized bulk-ingestion route.

## Project records

Use the [context router](docs/agent/context-routing.md), [task queue](docs/tasks/README.md), [roadmap](docs/ROADMAP.md), [source orientation index](resources/index.md) and [experiment result registry](docs/experiments/RESULTS.md). Historical dossiers and receipts remain evidence records. Summary-only trials do not establish open-ended navigation, and no successful UniProt competency answer is established. The large-result export protocol remains documentation only.

Shared live scientific state across agent connections is available through the explicit [scientific session service](docs/architecture/scientific-session.md). The service owns the native kernel; reconnecting clients need session capabilities.
