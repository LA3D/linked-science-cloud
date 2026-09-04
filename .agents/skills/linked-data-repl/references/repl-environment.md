# REPL environment and persistence

The project `cleanroom_node_repl` exposes exactly `js`, `js_reset` and `js_add_node_module_dir`. The authoritative project broker initializes `linkedScience` / `ls` before the first evaluation. Use dynamic imports, top-level `var` for reusable bindings and `nodeRepl.write` for bounded output.

Normal work reuses a workspace and its handles. `inventory`, `release` and `dispose` manage retained state without replacing the kernel. Release/disposal must be awaited for storage cleanup. Whole-kernel reset loses all bindings and epoch-owned results; the next evaluation prepares a fresh facade while broker source orientation remains advisory.

Use [runtime discovery](../../../../docs/agent/runtime-discovery.md) for an explicit fallback bootstrap, wrong-runtime diagnosis, activation checks or a suspected missing effect. A passing shell check does not establish which MCP a Codex task mounted. The sibling probe and bundled generic REPL are not fallback implementations.

Facade imports resolve declared dependencies from the validated project module root. `js_add_node_module_dir` is only for independently justified interactive package resolution. Do not add guessed roots or import package entrypoints through `./node_modules/...`.

Malformed calls should be repaired from generated documentation or structured errors. Source/handle loss does not by itself invalidate the facade. `LS_RELEASED_HANDLE`, stale-epoch errors and `KERNEL_OOM` distinguish explicit release, workspace replacement and whole-kernel loss.

Text output is aggregate-bounded per evaluation. Prefer bounded observations; request a larger `max_output_bytes` only when the task needs it. See [retained state](retained-state-and-presentation.md) for the distinction between native state, orientation and presentation.
