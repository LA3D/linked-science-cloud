# Linked Science clean-room runtime discovery

## Fresh-task preflight

The authoritative saved checkout is `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`. Its active `.codex/config.toml` registers the repository-owned `cleanroom_node_repl` broker from `packages/cleanroom-node-repl` with that checkout as its explicit cwd. The sibling `node-repl-network-probe` checkout and Desktop's bundled `node_repl` have no production role here.

Run `npm run linked-science:verify` from the saved checkout for the offline repository identity, broker, and synthetic runtime proof. After any MCP configuration change, fully restart Desktop and open a fresh Local task in this saved checkout. The shell proof and configuration text are necessary repository evidence, not activation evidence for the task.

Require server `cleanroom_node_repl` with exactly `js`, `js_reset`, and `js_add_node_module_dir`. In one compact preflight, observe the authoritative cwd and `codeact` mode and verify one top-level binding in a second call. After bootstrap, require `environment.project.id === '@linked-science/runtime'`, role `authoritative-production-implementation`, and broker package `@linked-science/cleanroom-node-repl`. Perform this once per fresh kernel; do not narrate each check as a separate scientific phase.

## Bootstrap once per kernel

Use the skill's conditional bootstrap only when `globalThis.linkedScience` is absent. It validates cwd, project/module roots, and declared dependency resolution; installs stable `linkedScience`/`ls`; delegates orientation to broker PEEK; and registers `linked-science:runtime`. Reuse those bindings, workspaces, and valid handles across later calls and turns.

Inspect the self-identifying environment once with the rest of the preflight:

```js
const environment = linkedScience.capabilities().environment
nodeRepl.write({ cwd: nodeRepl.cwd, mode: nodeRepl.rlm.mode, project: environment.project, broker: environment.broker })
```

Do not proceed as Linked Science if any identity, root, broker package, server name, or tool contract differs. A generic persistent REPL is not an acceptable substitute.

The facade import resolves its declared dependencies from its own validated module location. `js_add_node_module_dir` is not part of this bootstrap and must not replace the explicit project/module validation. Reserve it for a separately justified interactive bare-package import.

The bootstrap detects the private parent mediator without exposing its bridge or Fetch closure. `nodeRepl.linkedScienceTraversal`, `fetch`, `Request`, and `Response` remain unavailable. Capabilities report anonymous read authority, standard Fetch, hard per-call ceilings, and zero hidden transport retries. Explicit agent queries are recorded in bounded workspace history.

The MCP and workspace do not gain a document-fetch side channel. RDF documents, service descriptions, and scientific queries use the same direct `workspace.traversal.query(options)` operation. The skill guides evidence orientation; the runtime does not encode a grounding or planning state machine.

## Discover before acting

Read the complete generated callable contract once after bootstrap:

```js
linkedScience.documentation.all()
```

Then use targeted recovery or route detail only when needed:

```js
linkedScience.documentation.get('recovery')
linkedScience.documentation.get('traversal.query')
```

The checked-in [API schema](../runtime/linked-science-api.schema.json) and [route index](../runtime/routes.json) support machine discovery. Do not invent a method when lookup fails; inspect the error receipt’s matches or return to the route list.

## Open a goal workspace

Use a compact context key and explicitly start its broker PEEK map before retaining local graph objects:

```js
var ws = linkedScience.open({ contextKey: 'measurement-goal' })
await ws.orientation.bootstrap()
```

Follow generated method documentation. `graphs.load` is asynchronous because successful retention also records a compact broker-owned orientation reference. Keep ontology/schema/SHACL graphs behind handles. PEEK is orientation only, RLM holds external discovery context, and neither is a result store or Codex goal state.

## Reset recovery

Repair local validation failures in place from structured `error.repair` feedback. A missing or stale scoped object does not invalidate the runtime binding. Read the targeted `recovery` contract before resetting.

`js_reset` replaces the whole child kernel. It destroys JavaScript bindings, RLM contexts, Linked Science workspaces, and resident handles. The clean-room broker preserves PEEK maps. Bootstrap again, reopen the context, and inspect:

```js
var recovered = linkedScience.open({ contextKey: 'measurement-goal' })
await recovered.orientation.status()
```

Old references must report stale and old handles must not be reused. PEEK may guide explicit rematerialization but cannot prove residency or authorize a source.

## Invariants

- Use only `cleanroom_node_repl`; the bundled `node_repl` is obsolete for this project.
- Require exactly the three MCP tools above; never invent a document-acquisition MCP tool or a parallel graph/dataset facade.
- Keep output bounded by rows/cells or nodes/edges and bytes.
- Preserve provenance and operation IDs through query, derivation, and view.
- Without an observed traversal capability, use only local-synthetic data; `workspace.traversal.query` must fail with `LS_TRAVERSAL_UNAVAILABLE`.
- Even with an observed traversal capability, live use requires current explicit approval for the traversal scope and effective budgets, plus an aggregate mediator receipt.
- Before constructing a scientific query, the agent should inspect appropriate source-owned schema, vocabulary, dataset, service, or documentation evidence and retain useful evidence/result handles. The runtime records cited handles but does not prescribe the route or enforce a planning ceremony.
- Each direct query is one bounded, receipted attempt. Corrections and later queries remain visible in `workspace.traversal.history()`; evaluation counts them without controlling the runtime.
- Keep REPL-resident native RDF/JS handles, RLM runtime discovery, broker PEEK orientation, Codex goal state, and durable artifacts distinct. PEEK receives only compact handle references, never source or result payloads.
