# REPL environment and persistence

## Tool contract

Keep these names distinct:

- `cleanroom_node_repl` is the project-registered, user-owned MCP surface;
- `mcp__cleanroom_node_repl__js` executes JavaScript in its persistent child kernel;
- `mcp__cleanroom_node_repl__js_add_node_module_dir` adds an absolute `node_modules` root for interactive bare-package imports; and
- `mcp__cleanroom_node_repl__js_reset` replaces the child kernel, clearing JavaScript bindings and RLM contexts while preserving broker-owned PEEK maps and registered module roots.

The bundled `node_repl` and deprecated `js_repl` label are obsolete for this project. Do not call them, restore their former configuration recipe, or infer clean-room availability from their presence.

## Compact normal bootstrap

On a fresh task or replaced kernel, use the skill's conditional bootstrap and reuse the persistent bindings. Inspect `linkedScience.capabilities()` or targeted documentation only when the task needs a route, effect, bound, or recovery detail. Configuration prose or a shell cwd is not activation evidence, but normal scientific work does not need a full activation audit.

For activation, diagnostics, evaluation, or a suspected wrong runtime, follow [runtime discovery](../../../../docs/agent/runtime-discovery.md) to verify the exact three-tool MCP surface, cwd, mode, cross-call persistence, identity, and raw-transport boundary.

Bootstrap broker-owned orientation only when the goal workspace needs it. Ordinary anonymous public reads use the mediated capability and broker defaults; no separate permission or network probe ceremony is needed unless the task or evaluation policy explicitly calls for one.

Use dynamic imports and top-level `var` for reusable bindings. The Linked Science facade uses an absolute module URL and normal module-scoped ESM resolution from its validated project root. Do not import package entrypoints through `./node_modules/...` or add a guessed module directory. Use `js_add_node_module_dir` only when an interactive bare-package import genuinely needs it and verify that path independently. Prefer `nodeRepl.write(...)` for compact output. Text output is aggregate-bounded per evaluation; use bounded result projections first, and request a larger `max_output_bytes` only when the task genuinely needs it.

For malformed calls, stale local bindings, or missing selections, inspect the generated `recovery` contract and repair or reacquire the scoped object in place. Use `js_reset` only after actual kernel invalidation. After reset, bootstrap again; JavaScript bindings, RLM contexts, workspaces, symbolic handles, and epoch-owned result spools are gone while broker PEEK remains orientation only. Follow [retained-state reset semantics](retained-state-and-presentation.md#reset-and-stale-state).
