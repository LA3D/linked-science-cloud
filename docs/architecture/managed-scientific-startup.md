# Managed scientific startup

The project registration launches `managed-scientific-mcp.mjs` through a stable Node executable path. Startup validates the authoritative checkout, starts or reuses a compatible detached scientific service, waits for its identity handshake, and exposes exactly the existing three MCP tools. No terminal command is needed for ordinary project-chat startup. The low-level `cleanroom-mcp.mjs` and explicit `scientific-session-server.mjs` remain available for standalone diagnostics and legacy sessions.

## Host identity and automatic attachment

The installed Codex Desktop app-server 0.159.2 was probed with two disposable chats. MCP processes received neither `CODEX_THREAD_ID` nor `CODEX_SESSION_ID`. Tool calls received host `_meta.threadId`, equal to their chat ID; a caller-supplied spoofed value was replaced by the host. Managed attachment uses this observed tool-call identity, not cwd, environment guesses, or prompts. Missing or changed chat identity fails before scientific code executes. Other clients require their own verified integration.

On the first tool call, a SHA-256 chat key selects a session and a private connection record. A new chat creates its own canonical kernel. A resumed chat attaches with the saved owner capability and checks the live instance and epoch. Adapter/desktop closure detaches; the detached service retains bindings for the existing 24-hour detached-only idle grace. A running service is required for live JavaScript continuity. Service loss is explicit: no silent recreation, code replay, bulk restore, or scratch fallback. `session.action: recover` explicitly permits recreation; bookmark and restore select durable snapshots using the existing protocol. Recovery selections remain adapter-resident and must be supplied explicitly after adapter loss.

An explicit first create/attach still follows the original protocol. Workers attach using scoped grants, execute in scratch namespaces, and cannot acquire owner authority through automatic selection. Session/grant and recovery contracts are unchanged.

## Host paths and compatibility

Default socket: `/private/tmp/linked-science-managed-UID-CHECKOUT_HASH/session.sock`. Default store: `~/Library/Application Support/LinkedScience/managed/CHECKOUT_HASH/`, with separate `handoff` and `connections` directories. These are distinct from the existing manually launched service and its private handoffs; old sessions are not migrated or modified. Host-only programmatic configuration can select disposable absolute paths for tests.

Directories require ownership by the current user, mode 0700, and no final symlink. Sockets and connection records require mode 0600. Owner credentials never enter MCP responses, prompts, source control, or diagnostic receipts. This remains a cooperative same-user service rather than protection against arbitrary code with that user's filesystem authority.

Reuse requires matching protocol, canonical checkout path, runtime source/dependency-lock fingerprint, canonical handoff root, and idle policy. A source change fails reuse rather than replacing an occupied service. Startup and chat record locks serialize concurrent launches/creation. Occupied files, incompatible services, abandoned locks, and bounded readiness failures are errors; no socket is unlinked or service restarted implicitly. Inspect abandoned locks explicitly. Runtime upgrades need deliberate preservation and service cutover.

## Verification

`packages/cleanroom-node-repl/test/managed-scientific-startup.test.mjs` uses disposable sockets/stores to cover cold startup, simultaneous launches, compatible reuse, separate chats, concurrent same-chat attachment, adapter EOF survival, private reconnect records, resets, missing identity, incompatible/occupied sockets, lock timeout, worker authority, service loss, and selected durable recovery. The existing standalone synthetic broker check remains useful but does not prove managed host mounting. A real Codex task must additionally perform the [runtime discovery](../agent/runtime-discovery.md) identity/persistence check.
