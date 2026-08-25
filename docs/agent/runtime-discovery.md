# Linked Science clean-room runtime discovery

## Fresh-task preflight

The active `.codex/config.toml` registers the user-owned `cleanroom_node_repl` server with this checkout as its explicit cwd. After any MCP configuration change, fully restart Desktop and open a fresh Local task in this saved checkout. Configuration text alone is not activation evidence.

Require exactly `js`, `js_reset`, and `js_add_node_module_dir`. In one compact preflight, observe the authoritative cwd and `codeact` mode and verify one top-level binding in a second call. Perform this once per fresh kernel; do not narrate each check as a separate scientific phase.

## Bootstrap once per kernel

Use the skill's conditional bootstrap only when `globalThis.linkedScience` is absent. It validates cwd, project/module roots, and declared dependency resolution; installs stable `linkedScience`/`ls`; delegates orientation to broker PEEK; and registers `linked-science:runtime`. Reuse those bindings, workspaces, and valid handles across later calls and turns.

The facade import resolves its declared dependencies from its own validated module location. `js_add_node_module_dir` is not part of this bootstrap and must not replace the explicit project/module validation. Reserve it for a separately justified interactive bare-package import.

The bootstrap detects the private parent mediator without exposing its bridge or Fetch closure. `nodeRepl.linkedScienceTraversal`, `fetch`, `Request`, and `Response` remain unavailable. Capabilities must report the expected protocol, anonymous read authority, standard Fetch, cumulative ceilings, and zero hidden transport retries. Explicit agent discovery/query iterations are a separate, receipted policy surface.

The MCP and workspace do not gain a document-fetch side channel. Obtain phase contracts from generated documentation. Grounding must still produce resident typed evidence, an attestation, and an immutable initial plan before the scientific timer starts; later immutable revisions require explicit enrollment in the same cumulative traversal.

## Discover before acting

Read the complete generated callable contract once after bootstrap:

```js
linkedScience.documentation.all()
```

Then use targeted recovery or route detail only when needed:

```js
linkedScience.documentation.get('recovery')
linkedScience.documentation.get('grounding')
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
- Scientific traversal cannot begin without resident schema, vocabulary, and dataset evidence, attested source/graph/predicate choices, an immutable enrolled initial plan, and registered compact grounding context. Explicit attempts and later plan revisions remain visible and cumulative; evaluations may separately choose a single-shot policy.
- Keep REPL-resident native RDF/JS handles, RLM external context, broker PEEK orientation, Codex goal state, and durable artifacts distinct. Live retrieval never updates PEEK automatically.
