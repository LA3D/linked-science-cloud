# Linked Science clean-room runtime discovery

## Fresh-task preflight

The active `.codex/config.toml` registers the user-owned `cleanroom_node_repl` server with this checkout as its explicit cwd. After any MCP configuration change, fully restart Desktop and open a fresh Local task in this saved checkout. Configuration text alone is not activation evidence.

Require the MCP to expose exactly `js`, `js_reset`, and `js_add_node_module_dir`. In `js`, verify:

```js
nodeRepl.write({ cwd: nodeRepl.cwd, mode: nodeRepl.rlm.mode })
```

The cwd must be `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl` and the mode must be `codeact`. Create a top-level `var` binding and inspect it in a second call before claiming persistence.

## Bootstrap once per kernel

Use this exact clean-room bootstrap. It does not rely on `process`, `process.cwd()`, a shell directory, or an undocumented bundled-REPL global:

```js
var { bootstrapLinkedScience } = await import('file:///Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl/lib/cleanroom-linked-science-bootstrap.mjs');
await bootstrapLinkedScience({
  host: globalThis,
  cleanroom: nodeRepl,
  projectRoot: '/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl',
  moduleRoot: '/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl/node_modules',
});
```

The bootstrap validates the clean-room cwd, the exact project and module roots, and module-scoped resolution of every declared dependency. It installs the stable global bindings `linkedScience` and `ls`, delegates orientation to broker-owned `nodeRepl.peek`, and registers compact discovery state as the RLM context `linked-science:runtime`. Normal use bootstraps once and reuses the globals across calls.

The facade import resolves its declared dependencies from its own validated module location. `js_add_node_module_dir` is not part of this bootstrap and must not replace the explicit project/module validation. Reserve it for a separately justified interactive bare-package import.

## Discover before acting

Start with:

```js
linkedScience.documentation()
linkedScience.capabilities()
linkedScience.examples()
nodeRepl.rlm.inspect('linked-science:runtime', { start: 0, end: 2048 })
```

Fetch conditional detail only when needed:

```js
linkedScience.documentation.get('graphs.load')
linkedScience.documentation.get('schema.search')
linkedScience.examples('ontology')
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

`await ws.orientation.commit()` returns a compact receipt for the broker map; it is not an artifact or a second checkpoint store. `linkedScience.reset({ contextKey })` advances only the Linked Science workspace epoch while retaining broker orientation.

`js_reset` replaces the whole child kernel. It destroys JavaScript bindings, RLM contexts, Linked Science workspaces, and resident handles. The clean-room broker preserves PEEK maps. Bootstrap again, reopen the context, and inspect:

```js
var recovered = linkedScience.open({ contextKey: 'measurement-goal' })
await recovered.orientation.status()
```

Old references must report stale and old handles must not be reused. PEEK may guide explicit rematerialization but cannot prove residency or authorize a source.

## Invariants

- Use only `cleanroom_node_repl`; the bundled `node_repl` is obsolete for this project.
- Keep output bounded by rows/cells or nodes/edges and bytes.
- Preserve provenance and operation IDs through query, derivation, and view.
- Use only local-synthetic data in the current facade; compatibility guards retain their explicit live-approval contract.
- Keep REPL-resident handles, RLM external context, broker PEEK orientation, Codex goal state, and durable artifacts distinct.
