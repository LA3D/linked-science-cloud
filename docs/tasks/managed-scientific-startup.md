# Managed scientific startup repair — 2026-10-01

Authorized projectless repair of `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`; do not initialize repair work inside its required-MCP project. Starting branch `codex/okn-exploration-memory`, commit `aeb5c2d76db7a5561d7de2edb6597d868a4931af`. Task branch `codex/managed-scientific-startup` preserves pre-existing dirty work and history. Local main is not the starting revision; integration must not force unrelated changes.

The old project registration pinned missing Node 26.9.0. Its generator now preserves the existing executable PATH symlink, selecting `/opt/homebrew/bin/node` locally. The project registration points at the managed entrypoint; machine-specific config remains uncommitted.

Implemented separate detached managed service, compatibility handshake, source fingerprint, private startup/chat locks, automatic first-tool attachment using verified Codex host `_meta.threadId`, private owner reconnect storage, and explicit recovery after epoch/service loss. Scoped worker attach retains scratch/worker authority. Existing live `/private/tmp/linked-science-session/session.sock` and `~/Library/Application Support/LinkedScience/handoff` were not stopped, reset, attached to, replaced, unlinked, or read/modified.

Verification and remaining activation status are recorded at completion below. Any deliberate upgrade/cutover of existing live service remains a separate preservation step; managed defaults use a different socket/store.

## Completion evidence

- Managed startup tests: 7 passed, including cold start, concurrent service/session reuse, separate chats, EOF reconnect, explicit service-loss recovery and durable selected restore.
- Final full suite: 361 tests, 360 passed, 1 known unrelated failure: experiment dossiers missing registry status for `docs/experiments/scientific-trajectory-evidence.md`. No tests skipped.
- `npm run smoke`, `npm run linked-science:verify`, syntax/import checks, `git diff --check`, and relative links in changed documentation passed.
- Installed Codex Desktop app-server 0.159.2 mounted the real managed MCP in two disposable project chats, overrode spoofed `_meta.threadId`, separated their state, and preserved a binding after host-process restart. Disposable test processes/stores were cleaned.
- Fresh real desktop project chat `01a0f823-71f4-7553-92bb-c8e27b3ce2fb` mounted exactly the expected tools, verified checkout/project identity, retained a binding from 41 to 42, and reported owner attachment, instance `7e9f524c-0a10-4273-863b-da9e4d69b6db`, epoch 1, kernel alive. No errors; that new managed session remains open. Optional recursive provider remains unavailable.
- Existing manually running service/socket/handoffs remain untouched. Managed defaults use separate paths. No existing live sessions were migrated; no old-service cutover was attempted.
- User explicitly approved focused local-main integration on 2026-10-01. The startup repair from `b3fedf7` was applied onto local main using a temporary Git index, with every original repair blob verified before updating this completion record. Only the repair changes were integrated; unrelated OKN commits (`c4ce0dc`, `aeb5c2d`), the working checkout branch, index, and dirty work were preserved. The original repair commit remains on `codex/managed-scientific-startup`; the equivalent focused integration commit is reachable from main and `codex/managed-scientific-startup-integration`. Local main is now one commit ahead of upstream; no push occurred.
- Machine-specific project command/root paths and all pre-existing dirty work remain local. The committed config seed changes only the registered entrypoint; setup regenerates local paths.

No startup implementation work remains. Existing older desktop chats may need a fresh chat/reconnection to load their project MCP configuration. Runtime source changes require deliberate service preservation/cutover; incompatible occupied services are never replaced automatically.

The user personally stopped the old manually launched terminal service and canceled optional memory auditing/extraction. No additional scientific memories or records were changed. The separate managed service remains untouched. Fresh Codex Desktop project chats already passed activation; no full Desktop restart is required for a fresh chat. Older loaded chats may retain their previous MCP connection until reloaded.
