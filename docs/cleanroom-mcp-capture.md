# Clean-room Node REPL capture

The project-scoped `cleanroom_node_repl` server is an observed-contract compatibility implementation of Desktop's bundled Node REPL. It is separately named and user-owned; it neither replaces nor configures the Desktop-managed server.

The MCP broker exposes only:

- `js({code, timeout_ms?, title?})`
- `js_reset({})`
- `js_add_node_module_dir({path})`

The broker launches a disposable child kernel. JavaScript bindings persist across `js` calls. A timeout, crash, or explicit reset replaces that kernel. Registered module directories and broker-owned PEEK maps survive replacement.

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

## Semantics and limits

This is a CodeAct-style JavaScript environment: the model writes the control program and manipulates external context symbolically. Recursive `nodeRepl.rlm.query` calls are optional and return `RLM_PROVIDER_UNAVAILABLE` in the default CodeAct mode.

The PEEK runtime is explicitly **PEEK-compatible**, not canonical PEEK. It provides context-scoped bounded maps, structured edits, deterministic eviction, observable-trajectory commits, and optional checkpoints. An MCP server cannot inject a changing map into the root model's system prompt or infer complete query boundaries, so callers must bootstrap the map explicitly.

The child process has the filesystem and network authority of the MCP launch environment. The VM context is a compatibility boundary, not a security sandbox. The broker scrubs inherited environment variables, caps code/output/image sizes and memory, serializes execution, and kills a child that exceeds its timeout.

Private Desktop capabilities—including trusted Browser/Chrome native-pipe bridges—are intentionally absent. This project claims compatibility with the observed public tool contract, not byte-for-byte equivalence with OpenAI's private implementation.
