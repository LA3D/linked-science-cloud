# Scoped data bridge and scientific sessions

- Status: shared-session core implemented and verified; live desktop activation pending.
- User constraint: Codex drives model work; no independent model provider in the REPL.
- Methodology: [five gated experiments](../experiments/scoped-data-bridge.md).
- Evidence: [run contract and E1 attempts](../../artifacts/scoped-data-bridge/README.md).
- Implementation: [scientific session architecture and activation](../architecture/scientific-session.md).

## Decisions and completed work

E1 recorded one failed preparation and three independent worker probes. Workers did not see parent globals; that establishes unavailable shared namespace, not definitive broker process identity. Receipts are registered with missing accounting explicitly recorded. E2–E5 have not run.

The user selected a shared live session service instead of snapshot transfer and authorized the core refactor. The service owns a kernel independently of MCP clients. Owners publish native graph/result handles; workers run separate scratch kernels and access selected objects through expiring grants. Fixed operations preserve RDF terms and SELECT bindings, and structured results return through a scoped slot. Codex owns dispatch and explicit continuation. Full recursive model behavior is not claimed.

Native bindings now have a complete iterator for resident and broker-stored results. Integration tests exercise independent MCP adapters, graph/query access, deposit and parent aggregation, reconnect persistence and scope/reset rejection. Idle expiry, timeout, shutdown and crashes can still lose state; no disk recovery is promised.

## Exact next action

Implementation is ready for a desktop restart once its local integration is recorded below. After restart, discover the mounted project runtime, launch the independent service if needed, and record a fresh live worker round trip separately from deterministic tests. Existing pre-refactor globals are not migrated automatically. Do not silently resume E2–E5 or treat shell checks as live activation evidence.

## Handoff

Implementation began in the authoritative checkout on `codex/scoped-bridge-runs` at `e355c43b1b1cf90f7fec2b06e1744cae71af8516`. Existing `.codex/config.toml` edits and untracked `artifacts/structure-viewer/` are unrelated and excluded. The registered entrypoint remains unchanged; its new direct-launch adapter requires a fresh desktop MCP connection. Verification and integration outcomes will be recorded here before restart.

## Verification and remaining limits

- `npm test`: 206 passed, zero failed/skipped, including real stdio transport, service lifecycle, five integration/launcher tests and native iterator tests.
- `npm run smoke` and `npm run linked-science:verify`: passed with offline synthetic fixtures.
- `npm run evaluation:results:validate`: passed, 36 registered runs with explicit durability classifications.
- Markdown links and `git diff --check`: passed.
- E1 receipts saved in `d7cd03c`; implementation commit is the next focused commit in this branch's history.
- Large paged traversals rescan earlier rows. This is a bounded core implementation, not a scalability result. Worker timeouts during shared-kernel execution can close the session; timeouts before dispatch preserve it.
- No live activation or semantic RLM evaluation was run after refactoring. No service has been left running by tests. Existing pre-refactor REPL objects will not be migrated by restarting.
