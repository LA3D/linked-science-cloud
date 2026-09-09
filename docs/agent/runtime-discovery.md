# Linked Science runtime discovery

## Normal use

The project broker initializes the validated `linkedScience` / `ls` facade before the first evaluation in each kernel. Open and reuse a workspace directly:

```js
var ws = linkedScience.open({ contextKey: 'scientific-question' });
```

Use `linkedScience.documentation.get(name)` for an unfamiliar operation and `capabilities()` for effects or limits. `ws.inventory()` shows current retained handles; `results.profile(handle)` adds provenance. Source orientation is optional and initializes when useful source evidence is retained. No exhaustive activation ceremony is needed for ordinary use.

For native composition, prefer `ws.rdf.source(handle)`. `rdf.clone` explicitly creates a mutable copy and `rdf.dataset` is its compatibility alias. Release individual handles with `await ws.release(handle)`, or dispose the workspace with `await ws.dispose()`. `await linkedScience.reset({ contextKey })` uses the same storage cleanup. Await release/disposal before relying on reclaimed storage.

## Activation and diagnosis

For configuration, fresh-agent evaluation, suspected wrong runtime or an activation claim, observe:

- server `cleanroom_node_repl` and exactly `js`, `js_reset`, `js_add_node_module_dir`;
- `nodeRepl.cwd` equal to the authoritative checkout;
- project ID `@linked-science/runtime`, role `authoritative-production-implementation`, broker package `@linked-science/cleanroom-node-repl`;
- one binding surviving a second call, and structured `nodeRepl.rlm.capabilities()`; and
- the requested effect actually available through the private mediator.

```js
nodeRepl.write({
  cwd: nodeRepl.cwd,
  environment: linkedScience.capabilities().environment,
  rlm: nodeRepl.rlm.capabilities(),
});
```

The authoritative checkout is `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`. Its `.codex/config.toml` registers the project broker. The sibling experimental probe and bundled generic REPL cannot establish this project's identity or authority.

Run `npm run linked-science:verify` for offline repository/MCP checks. Configuration and shell results do not prove task-level mounting. Restart an already-running broker after broker-code changes; after MCP configuration changes, fully restart Desktop and use a fresh Local task in the saved checkout.

## Explicit fallback bootstrap

For an older broker or diagnostics, the same validated entrypoint remains available:

```js
var { bootstrapLinkedScience } = await import('file:///Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl/lib/cleanroom-linked-science-bootstrap.mjs');
await bootstrapLinkedScience({ host: globalThis, cleanroom: nodeRepl });
```

It validates the checkout, module roots and declared dependency resolution, installs stable bindings and registers compact discovery context. An explicit second bootstrap returns the installed facade. Wrong-runtime errors remain errors; do not substitute the sibling repository or generic REPL. `js_add_node_module_dir` is reserved for justified interactive package imports, not facade setup.

The broker only auto-initializes when its cwd is the authoritative project root. Standalone broker characterization can opt out with the host constructor option `bootstrapLinkedScience: false`; this grants no additional authority and is not a model-facing tool switch.

## Recovery and discovery

`js_reset` removes JavaScript bindings, contexts, workspaces and epoch-owned storage. The next evaluation prepares the facade, but old data is gone. Source orientation may survive; inspect it without claiming its handles are resident. Reacquisition is a new operation through a currently authorized source.

Repair malformed calls from `error.repair` or targeted documentation before considering a reset. `LS_RELEASED_HANDLE` means ownership was explicitly released; `LS_STALE_WORKSPACE` / `LS_STALE_HANDLE` refer to invalidated epochs. A surviving Source view cannot start new reads after release. `KERNEL_OOM` means the entire kernel epoch was lost.

The [API schema](../runtime/linked-science-api.schema.json), [route index](../runtime/routes.json), [architecture](../architecture/rlm-linked-science-runtime.md) and [session lifetime](../architecture/persistent-session-and-handles.md) provide conditional detail. Full query results stay behind handles, pages/tables are awaitable bounded views, and ordinary public reads use the broker's default authority and receipts.

## Shared scientific-session activation

A fresh project MCP connection exposes `nodeRepl.scientificSession`; its presence alone does not prove attachment. Before create/attach, it still owns a scratch kernel. Follow the [scientific-session activation guide](../architecture/scientific-session.md), and verify session role/epoch with `status()` after attachment. Owner create/attach changes the target of subsequent evaluations; it does not migrate existing scratch variables. Workers attach with scoped grants and retain separate scratch namespaces.

Record a fresh worker read/deposit and owner aggregation before claiming live shared-state activation. The earlier E1 namespace probes and offline adapter tests cannot substitute for that evidence. A desktop restart loads saved code but neither starts the independent service nor restores an old kernel automatically.
