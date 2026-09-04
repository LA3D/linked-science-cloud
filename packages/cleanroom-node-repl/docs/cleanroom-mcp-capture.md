# Clean-room Node REPL capture

The project-scoped `cleanroom_node_repl` server is the Linked Science-owned observed-contract compatibility implementation of Desktop's bundled Node REPL. It is separately named and neither replaces nor configures the Desktop-managed server.

The MCP broker exposes only:

- `js({code, timeout_ms?, title?})`
- `js_reset({})`
- `js_add_node_module_dir({path})`

The broker launches a disposable child kernel under Node's permission model. JavaScript bindings persist across `js` calls. A timeout, crash, or explicit reset replaces that kernel. Registered module directories and broker-owned PEEK maps survive replacement. Module directories must remain inside the worker root.

## Fresh-task verification

The project `.codex/config.toml` already contains the registration. Fully restart Desktop after changing it, then create a fresh task in this trusted checkout.

1. Confirm the MCP list shows `cleanroom_node_repl` with exactly the three tools above.
2. Run `npm test` and `npm run check`.
3. Call `js` with `var sentinel = 40`.
4. In a separate call, run `nodeRepl.write(await Promise.resolve(sentinel + 2))` and expect `42`.
5. Run `nodeRepl.write({rlm: nodeRepl.rlm.capabilities(), cwd: nodeRepl.cwd})`. The result must identify the `recursive-language-model` architecture, persistent-JavaScript control environment, external context, and whether a recursive provider is actually available.
6. Register and inspect external context entirely through JavaScript:

   ```js
   nodeRepl.rlm.registerContext("demo", "abcdefghij");
   nodeRepl.write(nodeRepl.rlm.inspect("demo", {start: 2, end: 6}));
   ```

   Expect the bounded slice `cdef`.
7. Start a PEEK-compatible map, add an orientation entry, and inspect it:

   ```js
   await nodeRepl.peek.begin("demo");
   await nodeRepl.peek.edit("demo", [{
     action: "ADD",
     entry: {section: "domain-constants", text: "alpha", score: 0.9}
   }]);
   nodeRepl.write(await nodeRepl.peek.current("demo"));
   ```
8. Call `js_reset`, verify `nodeRepl.write(typeof sentinel)` emits `undefined`, then verify `nodeRepl.write(await nodeRepl.peek.current("demo"))` still contains `alpha`.
9. Bootstrap and inspect the optional Linked Science boundary without performing a live operation:

   ```js
   var { bootstrapLinkedScience } = await import('file:///Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl/lib/cleanroom-linked-science-bootstrap.mjs');
   await bootstrapLinkedScience({ host: globalThis, cleanroom: nodeRepl });
   nodeRepl.write({
     mcpSurface: ['js', 'js_reset', 'js_add_node_module_dir'],
     traversalBridge: typeof nodeRepl.linkedScienceTraversal,
     rawFetch: typeof fetch,
     capability: linkedScience.capabilities().traversal,
   });
   ```

   The bridge and raw Fetch must both be `undefined`. The capability must report mediator protocol 3.2.0, authority `anonymous-linked-data-read` 1.0.0, standard Fetch, zero retries, per-operation aggregate receipts, bounded HTTP navigation evidence, and default/hard budgets. It must not contain capability tokens, credentials, cookies, endpoint allowlists, hidden evaluation paths, or a callable transport object.

## Semantics and limits

This is an RLM-style JavaScript control environment: the model writes the control program and manipulates external context symbolically. CodeAct-style execution is one technique inside it. Recursive `nodeRepl.rlm.query` calls are optional and return `RLM_PROVIDER_UNAVAILABLE` when the trusted host has no provider configured.

The PEEK runtime is explicitly **PEEK-compatible**, not canonical PEEK. It provides context-scoped bounded maps, structured edits, deterministic eviction, observable-trajectory commits, and optional checkpoints. An MCP server cannot inject a changing map into the root model's system prompt or infer complete query boundaries, so callers must bootstrap the map explicitly.

Registered `node_modules` roots participate only in locating package entry imports made from outside those roots. After an entry package is found, its relative imports, package `imports`, conditional `exports`, and transitive bare imports use Node's native parent-scoped ESM resolution. This intentionally stops undeclared transitive dependencies from being flattened across registered roots; a package that relied on that accidental behavior must declare or colocate its dependency. Registration still grants no read authority beyond the broker's existing worker-root permission.

The REPL context alone is not treated as a security sandbox. The child process is separately confined with Node's permission model: it may read the worker root and kernel entry file, but receives no raw network, child-process, worker-thread, native-addon, or filesystem-write authority. Parent host calls also require a random per-kernel capability token held only by the broker facade's closed-over IPC path, so an imported module cannot forge a host request with `process.send`. The broker scrubs inherited environment variables, caps code/output/image sizes and memory, serializes execution, and kills a child that exceeds its timeout.

Linked Science mediation is parent-owned. A module-private bridge begins a token/epoch-bound session for general `linkedScience.resources` reads and private Communica traversal. The parent accepts anonymous public-resource `GET`/`HEAD` plus read-only SPARQL POST; rejects URL credentials, arbitrary POST, and mutations; strips ambient identity; applies request/time/fan-out/concurrency/byte/item bounds; and returns sanitized responses with attributable exchange and aggregate receipts. Standard Fetch owns DNS, TLS, sockets, certificates, and redirects; receipts record requested URL, final URL, and the redirected flag rather than inventing intermediate hops. A reset, timeout, crash, or replacement aborts the former kernel's sessions. Ordinary goal-relevant anonymous reads use the broker defaults; authenticated, sensitive, mutating, bulk, export, and evaluation actions remain separately governed.

Evaluator-private filesystem attestation is a parent-side API, not an MCP tool. `KernelBroker.attestFilesystemBoundary({workerRoot, evaluatorRoot, probePath})` verifies non-overlap, asks the real child to read a pre-created honeytoken, and emits an attestation only when the permission layer returns `ERR_ACCESS_DENIED`.

Private Desktop capabilities—including trusted Browser/Chrome native-pipe bridges—are intentionally absent. The Linked Science design uses the general Browser/Playwright lesson of a persistent JavaScript object model above a trusted broker, not OpenAI-private internals or a claim of byte-for-byte equivalence.
