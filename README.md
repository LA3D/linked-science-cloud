# Node REPL network probe

This deliberately tiny, dependency-free fixture compares the same bounded network checks in an ordinary sandboxed Node process and the platform-provided persistent Node REPL. It targets only `example.com`: DNS lookup, raw TCP port 443, TLS handshake, and HTTPS `HEAD`.

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

The fixture has no dependencies, credentials, linked-science imports, alternate hosts, mutation requests, or writes outside its repository. The probe uses short bounded timeouts and reports sanitized JSON. It does not disable guards, invoke an internal sandbox bypass, change global Codex configuration, install packages, create remotes, or run unrestricted access automatically.

The project profile extends `:workspace`, enables the beta network proxy/profile network switch, and allows only `example.com`. Selecting or trusting this folder in ChatGPT Desktop is a user action; permission profiles do not establish trust by themselves.
