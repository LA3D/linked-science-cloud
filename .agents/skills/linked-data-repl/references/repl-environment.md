# REPL environment and persistence

## Tool contract

Keep these names distinct:

- `cleanroom_node_repl` is the project-registered, user-owned MCP surface;
- `mcp__cleanroom_node_repl__js` executes JavaScript in its persistent child kernel;
- `mcp__cleanroom_node_repl__js_add_node_module_dir` adds an absolute `node_modules` root for interactive bare-package imports; and
- `mcp__cleanroom_node_repl__js_reset` replaces the child kernel, clearing JavaScript bindings and RLM contexts while preserving broker-owned PEEK maps and registered module roots.

The bundled `node_repl` and deprecated `js_repl` label are obsolete for this project. Do not call them, restore their former configuration recipe, or infer clean-room availability from their presence.

## Required preflight

Before creating scientific state, perform this preflight in order:

1. Start a fresh Local task after project MCP configuration changes. Confirm `cleanroom_node_repl` exposes exactly `js`, `js_reset`, and `js_add_node_module_dir`.
2. Call `js` with `nodeRepl.write({ cwd: nodeRepl.cwd, mode: nodeRepl.rlm.mode })`. Require the cwd to equal `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl` and the mode to be `codeact`. A shell directory is not REPL evidence.
3. Create a trivial top-level `var` binding, then inspect it in a second `js` call before claiming persistence.
4. Run the exact bootstrap from the skill. `linkedScience.capabilities().environment` must report the explicit project root, module root, clean-room runtime, and resolved declared dependencies. This module-scoped resolution is the authoritative Linked Science dependency preflight.
5. Inspect a bounded slice of `nodeRepl.rlm.inspect('linked-science:runtime', ...)` to verify bootstrap discovery registration.
6. Start a context with `await workspace.orientation.bootstrap()`. The Linked Science runtime delegates this state to `nodeRepl.peek`; it does not create a second clean-room orientation cache.
7. When the authorized task needs live data, make one bounded, approved, guarded network preflight. Treat transport evidence as distinct from tool exposure, roots, dependency resolution, persistence, RLM state, and PEEK state.

The visible three-tool surface and project configuration text do not prove fresh-task activation. Report actual tool calls separately from offline server tests. Never change global Codex configuration from this skill.

Use dynamic imports and top-level `var` for reusable bindings. The Linked Science facade uses an absolute module URL and normal module-scoped ESM resolution from its validated project root. Do not import package entrypoints through `./node_modules/...` or add a guessed module directory. Use `js_add_node_module_dir` only when an interactive bare-package import genuinely needs it and verify that path independently. Prefer `nodeRepl.write(...)` for compact output.

After `js_reset`, bootstrap Linked Science again. JavaScript bindings, RLM contexts, Linked Science workspaces, and resident handles are gone. Broker-owned PEEK maps remain as orientation only. Treat reset as recovery, not routine cleanup, and follow [retained-state reset semantics](retained-state-and-presentation.md#reset-and-stale-state).
