# Clean-room Node REPL and network probe

This dependency-free project now contains three related experiments:

1. A bounded network probe comparing DNS, TCP, TLS, and HTTPS `HEAD` against `example.com` only.
2. A separately named, clean-room MCP implementing the observed `js`, `js_reset`, and `js_add_node_module_dir` contract of Desktop's persistent Node REPL.
3. A parent-owned Linked Science capability that accepts immutable profile names while keeping endpoints, transport policy, and network authority outside the evaluator child.

The clean-room server is CodeAct-style: the model writes JavaScript and manipulates persistent state and external context inside the REPL. `nodeRepl.rlm` supplies context registration, slicing, and an optional broker-mediated recursive-call seam; recursion is unavailable by default. `nodeRepl.peek` supplies a context-scoped, bounded PEEK-compatible orientation map. `nodeRepl.linkedScienceBroker` exposes only `capabilities`, `acquire`, and `query`; it does not expose endpoints, fetch, credentials, redirects, retries, or byte/result policy.

Start every row in a **fresh task opened from the intended project context**. Codex loads project configuration and establishes the REPL sandbox at task startup; this repository's profile cannot be proven by a task that started elsewhere.

## Test matrix

| Context | Shell control | Node REPL | Purpose |
| --- | --- | --- | --- |
| Projectless interactive chat | `npm run probe` only if the fixture is readable | metadata + imported probe | Negative control; no project profile expected |
| Trusted project, local checkout | `npm run probe` | metadata + imported probe | Profile loading in the saved project |
| Trusted project, worktree task | `npm run probe` | metadata + imported probe | Task/worktree policy propagation |
| Codex CLI (optional) | `npm run probe` | same capture if the tool is exposed | Desktop-versus-CLI comparison |
| Full access (optional, last) | `npm run probe` | same capture | Explicit user-chosen policy diagnostic only |

In each task, first run `npm test` and `npm run check` (offline checks), then follow [the Node REPL capture](docs/node-repl-capture.md) and run `npm run probe` for the shell control. Save a copy of [the result template](results/template.json) outside Git or under an ignored `results/*.json` filename.

For the separately launched, user-owned local MCP experiment, follow [the clean-room MCP capture](docs/cleanroom-mcp-capture.md) in a fresh trusted-project task. Its project config registers only `cleanroom_node_repl`; the former restricted permission profile remains disabled and the Desktop-managed `node_repl` registration is not modified.

## Interpretation

- **Both fail:** the project profile may be absent, untrusted, not loaded, or denied at a shared layer.
- **Shell succeeds / REPL fails:** the Node REPL wrapper may not have received the task's network policy.
- **HTTP succeeds / raw sockets fail:** likely proxy-mediated HTTP with direct DNS/socket access intentionally blocked.
- **Local succeeds / worktree fails:** task or worktree metadata/policy propagation is the likely difference.
- **Only full access succeeds:** Seatbelt or permission-profile translation is the likely boundary. Full access is an optional last diagnostic requiring explicit user choice, never the default fix.

These are classifications, not proof of root cause. Preserve exact stage and sanitized error code and compare otherwise-identical fresh tasks.

## Enforcement layers

Network behavior can differ across three independent layers:

1. Codex policy selects the permission profile, workspace boundary, proxy feature, and domain allowlist.
2. On macOS, Seatbelt enforces the command sandbox supplied by Codex.
3. The platform's Node REPL MCP wrapper receives per-turn metadata and establishes or resets its persistent kernel sandbox.

An HTTP proxy can also make allowed HTTPS work while raw DNS or sockets remain unavailable. Tool exposure, filesystem access, persistence, and network reachability must be recorded separately.

## Evidence and boundaries

Record the context label, fresh-task status, trust status, working directory, task source, sandbox implementation, sandbox mode/profile, cross-call persistence result, shell exit code, and all four probe stages for both surfaces. Do not record opaque runtime IDs.

The fixture has no dependencies or credentials. The network probe uses short bounded timeouts and reports sanitized JSON. The clean-room broker scrubs the child environment, starts the child with Node's permission model, grants reads only within the worker root and the kernel entry file, grants no raw network or filesystem-write authority, and supports opt-in, root-constrained PEEK checkpoints; checkpoints are disabled by default. It does not invoke an internal sandbox bypass, change global Codex configuration, install packages, create remotes, or run unrestricted access automatically.

The checked-in Linked Science query profile is a capability definition, not approval to contact its endpoint. Live acquisition or query still requires current, explicit approval for the exact operation. Acquisition profiles are intentionally absent until their exact sources and formats have been reviewed. All automated broker tests use injected synthetic responses and make no live requests.

The disabled `.codex/config.restricted-profile.toml.disabled` file preserves the former `:workspace` permission profile for reference; it is not active configuration. The clean-room MCP experiment uses an MCP-only project config and does not add project network permissions. Selecting or trusting this folder in ChatGPT Desktop is a user action; configuration files do not establish trust by themselves.
