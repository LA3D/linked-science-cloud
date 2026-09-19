# MCP setup on another machine

The laptop checkout is `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`; the tracked MCP config points to the original workstation's different directory. A required MCP server with a nonexistent working directory prevents task creation. The laptop reports Node v26.9.0 in Terminal; its desktop executable lookup has not been directly observed.

Added `npm run codex:configure` to derive the checkout from the setup script and use the absolute Node executable running it. Setup changes only the project's three launch fields, preserves tool settings, checks manifest/entrypoint/executable and SQLite availability, and never edits global configuration or installs dependencies. Each clone runs setup before task creation, and again after moving the project or changing Node. The checked-in workstation config remains a seed; generated machine paths remain local.

Regression coverage relocates config and repository boundary inputs into a directory containing spaces, verifies corrected paths, preserved approvals/required status, repeat-run stability and no partial update for malformed config. This is a configuration test; laptop live activation remains to be checked there after setup and restart.

Work began in the authoritative checkout on `codex/portable-mcp-startup` from `c876961`. Existing `.codex/config.toml` tool approval settings and the untracked structure-viewer file are unrelated and excluded. No E5 experiment was run.

Verification passed on the original workstation: 219 tests, smoke, offline identity/broker/runtime verification, and whitespace/changed-document links. The relocated configuration regression also passed. Original local MCP settings are unchanged. Laptop live activation remains unverified.
