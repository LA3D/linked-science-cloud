# REPL environment and persistence

## Tool contract

Keep these names distinct:

- `node_repl` is the client-provided MCP surface exposed when that capability is available;
- `mcp__node_repl__js` is the tool an agent calls to execute JavaScript;
- `mcp__node_repl__js_add_node_module_dir` adds an absolute `node_modules` search root; and
- `mcp__node_repl__js_reset` destroys the JavaScript kernel and its resident bindings.

`js_repl` is a deprecated configuration label retained only in historical records. Do not look for a callable tool by that name or restore its former configuration recipe. Use the client-provided `node_repl` MCP `js` tool whenever this skill says to use the REPL. This repository must not package or register a replacement Node REPL server.

## Required preflight

Before creating scientific state, perform this preflight in order:

1. Confirm the `node_repl` MCP `js` tool is callable with `nodeRepl.write(nodeRepl.cwd)`.
2. Require `nodeRepl.cwd` to equal this repository's intended project root. A shell `cd` is not evidence of the REPL cwd. If it differs, stop and report a task-launch/cwd failure rather than silently attaching another project's dependencies.
3. In the REPL, run `await import.meta.resolve('@comunica/query-sparql')`. A failure here is module resolution, not missing network access.
4. Only when the cwd is correct and the dependency is already installed, use `js_add_node_module_dir` with the exact project `node_modules` path as an explicit recovery. Report that recovery. Do not install anything or guess another module directory.
5. Create a trivial top-level `var` binding, then inspect it in a second `js` call before claiming persistence.
6. When the authorized task needs live data, make one bounded, approved, guarded network preflight. Treat DNS, socket, timeout, and HTTP failures as transport evidence distinct from tool exposure, cwd, module resolution, and persistence.

The visible three-tool MCP surface does not prove its activation provenance or the filesystem, sandbox, network, native-pipe, or module metadata supplied to the session. Report those dimensions separately and leave activation unresolved unless current task metadata establishes it; never change global Codex configuration from this skill.

Use dynamic imports and top-level `var` for reusable bindings. Package imports use the REPL-wide roots and cwd; do not import package entrypoints through `./node_modules/...`. Prefer `nodeRepl.write(...)` for compact text output.

`js_reset` clears JavaScript bindings and resident handles. Module search roots added with `js_add_node_module_dir` survive for the MCP server lifetime. Treat reset as recovery, not routine cleanup, and follow [retained-state reset semantics](retained-state-and-presentation.md#reset-and-stale-state).
