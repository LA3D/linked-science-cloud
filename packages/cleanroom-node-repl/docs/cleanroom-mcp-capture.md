# Clean-room Node REPL capture

The project-scoped `cleanroom_node_repl` server is an observed-contract compatibility implementation of Desktop's bundled Node REPL. It is separately named and user-owned; it neither replaces nor configures the Desktop-managed server.

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
5. Run `nodeRepl.write({mode: nodeRepl.rlm.mode, cwd: nodeRepl.cwd})`. The default mode must be `codeact`.
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
9. Inspect the optional Linked Science boundary without performing a live operation:

   ```js
   nodeRepl.write(JSON.stringify({
     methods: Object.keys(nodeRepl.linkedScienceBroker).sort(),
     capability: await nodeRepl.linkedScienceBroker.capabilities(),
   }, null, 2));
   ```

   The methods must be exactly `acquire`, `capabilities`, and `query`. Profile descriptors may contain only an ID, operation kind, SHA-256 digest, and ceilings; they must not contain endpoints, sources, credentials, or transport objects.

## Semantics and limits

This is a CodeAct-style JavaScript environment: the model writes the control program and manipulates external context symbolically. Recursive `nodeRepl.rlm.query` calls are optional and return `RLM_PROVIDER_UNAVAILABLE` in the default CodeAct mode.

The PEEK runtime is explicitly **PEEK-compatible**, not canonical PEEK. It provides context-scoped bounded maps, structured edits, deterministic eviction, observable-trajectory commits, and optional checkpoints. An MCP server cannot inject a changing map into the root model's system prompt or infer complete query boundaries, so callers must bootstrap the map explicitly.

Registered `node_modules` roots participate only in locating package entry imports made from outside those roots. After an entry package is found, its relative imports, package `imports`, conditional `exports`, and transitive bare imports use Node's native parent-scoped ESM resolution. This intentionally stops undeclared transitive dependencies from being flattened across registered roots; a package that relied on that accidental behavior must declare or colocate its dependency. Registration still grants no read authority beyond the broker's existing worker-root permission.

The REPL context alone is not treated as a security sandbox. The child process is separately confined with Node's permission model: it may read the worker root and kernel entry file, but receives no raw network, child-process, worker-thread, native-addon, or filesystem-write authority. Parent host calls also require a random per-kernel capability token held only by the broker facade's closed-over IPC path, so an imported module cannot forge a host request with `process.send`. The broker scrubs inherited environment variables, caps code/output/image sizes and memory, serializes execution, and kills a child that exceeds its timeout.

Linked Science acquisition and SPARQL are parent-owned operations. The child supplies only an immutable profile ID, an optional exact source selector for acquisition, or bounded SPARQL for query. The parent validates the operation before transport, uses redirect mode `error`, applies one-attempt timeout and byte/result ceilings, and returns a payload plus attributable receipt. Do not invoke a live profile without current explicit approval for that exact source or endpoint.

Evaluator-private filesystem attestation is a parent-side API, not an MCP tool. `KernelBroker.attestFilesystemBoundary({workerRoot, evaluatorRoot, probePath})` verifies non-overlap, asks the real child to read a pre-created honeytoken, and emits an attestation only when the permission layer returns `ERR_ACCESS_DENIED`.

Private Desktop capabilities—including trusted Browser/Chrome native-pipe bridges—are intentionally absent. This project claims compatibility with the observed public tool contract, not byte-for-byte equivalence with OpenAI's private implementation.
