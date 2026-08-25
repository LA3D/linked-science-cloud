# REPL environment and persistence

## Tool contract

Keep these names distinct:

- `cleanroom_node_repl` is the project-registered, user-owned MCP surface;
- `mcp__cleanroom_node_repl__js` executes JavaScript in its persistent child kernel;
- `mcp__cleanroom_node_repl__js_add_node_module_dir` adds an absolute `node_modules` root for interactive bare-package imports; and
- `mcp__cleanroom_node_repl__js_reset` replaces the child kernel, clearing JavaScript bindings and RLM contexts while preserving broker-owned PEEK maps and registered module roots.

The bundled `node_repl` and deprecated `js_repl` label are obsolete for this project. Do not call them, restore their former configuration recipe, or infer clean-room availability from their presence.

## Required preflight

On a fresh task or replaced kernel, verify the actual three-tool MCP surface, `nodeRepl.cwd`, CodeAct mode, and one cross-call binding. Then use the skill's conditional bootstrap and inspect `linkedScience.capabilities()` plus the registered runtime context. Do this once, reuse the persistent bindings, and keep the checks compact; configuration prose or a shell cwd is not activation evidence.

Bootstrap broker-owned orientation only when the goal workspace needs it. A live scientific operation still requires current approval and the mediated capability, but it does not require a separate ceremonial network probe unless the task or evaluation policy explicitly calls for one.

Use dynamic imports and top-level `var` for reusable bindings. The Linked Science facade uses an absolute module URL and normal module-scoped ESM resolution from its validated project root. Do not import package entrypoints through `./node_modules/...` or add a guessed module directory. Use `js_add_node_module_dir` only when an interactive bare-package import genuinely needs it and verify that path independently. Prefer `nodeRepl.write(...)` for compact output.

For malformed calls, stale local bindings, or missing selections, inspect the generated `recovery` contract and repair or reacquire the scoped object in place. Use `js_reset` only after actual kernel invalidation. After reset, bootstrap again; JavaScript bindings, RLM contexts, workspaces, and resident handles are gone while broker PEEK remains orientation only. Follow [retained-state reset semantics](retained-state-and-presentation.md#reset-and-stale-state).
