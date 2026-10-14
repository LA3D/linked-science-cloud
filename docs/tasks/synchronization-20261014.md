# Linked Science synchronization candidate — 14 October 2026

Status: reviewed local candidate committed; publication and saved-checkout updates await approval. No push, saved-checkout update, global configuration change, package installation, service restart, scientific reset or export was performed.

## Checkout and history

- Authoritative laptop saved checkout: `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`, branch `codex/resource-100mb`, starting HEAD `892cd7667d78b287782c731960289038a8c08319`. Its original index, dirty source, local configuration, scientific files and live sessions are preserved.
- Isolated managed worktree: `/Users/cvardema/.codex/worktrees/sync-reviewed-candidate/linked-science-cloud`, named branch `codex/sync-reviewed-candidate`, starting local main `e2e973bcde7b5ffa0edd0fa7182cfff799a78fc9`.
- Local main still equals cached origin/main at the starting revision (0 ahead / 0 behind); candidate commits are not reachable from main. Refresh upstream read-only before publication to detect concurrent changes. No force push is proposed.
- Startup implementation already published as `e2e973b` is retained once. The laptop's equivalent `b3fedf7` is not duplicated. Main's newer startup completion record is retained.
- Laptop-only commits are preserved as `dbf8a53` / `f8ae5e7` (OKN records), `d11e513` (100 MB conversion bound) and `5cc1f3a` (runtime-generation isolation).
- New milestones: `76fe950` provider diagnostics; `a8d7a27` selected-trajectory implementation; `5b22d64` current MCP refresh guidance; `8a57f83` durable evidence/task reconciliation; `5f2f9f5` artifact classification and historical byte preservation. This task and its exact scope manifest are a final separate handoff commit.

## Inclusion and exclusions

The [exact manifest](synchronization-scope.json) enumerates 397 included working paths and 255 excluded paths, with hashes and sizes for every preserved exclusion. Included source/tests/schemas, research methodology, authored proposals, queries/replay scripts, bounded result records, runtime receipts, wiki evidence/revisions/consultations and task handoffs implement the user's clarified scope. The manifest separately names small review corrections and additional candidate paths.

Excluded: machine `.codex/config.toml` and installation receipt; resource downloads; molecular/rendered structure assets; scientific RDF/ontology/DisMech inputs, downloaded schemas/model, compiled Python cache, raw response bodies/headers, source literature subset and full saved source-result files. These remain byte-for-byte in the saved laptop checkout. Committed evidence does not make excluded source inputs portable: replay scripts may require those local files, private durable state or separately authorized reacquisition. No live scientific findings were rerun for synchronization.

Receipt hashes and exact historical query bytes are preserved; explicit Git attributes retain their existing final blank lines. Authored reports and replay source received trivial whitespace cleanup. PDFs are marked binary. No scientific-truth or transfer-performance claim follows from citation-integrity validation.

Review corrections: assistant analysis messages cannot be selected as trajectory evidence; generic tool calls qualify only for selected trajectories, preserving direct-runtime witness requirements. Stale runtime-debugging status now recognizes delivery `485cb27`. The scientific-trajectory dossier has explicit result-registry coverage. No optional recursive provider was attached, and performance investigation remains deferred.

## Verification

- Final `npm test`: 368 passed, 0 failed, 0 skipped; initial isolated run failed because symlinked dependencies resolved outside the checkout. Existing dependencies were copied locally, without installation or network use, before successful reruns.
- `npm run smoke`: passed (synthetic Comunica SELECT).
- `npm run linked-science:verify`: passed against isolated checkout and its own synthetic broker; no saved service reset.
- `npm run evaluation:results:validate`: passed, 91 runs / 17 experiment dossiers.
- Every saved corpus record inspected: scientific units have complete required evidence; engineering exclusion remains ineligible. Current wiki validation passed, 20 patterns at revision `0d15ee85f7ff899d53aeba25ec44fe212201fc7266e7b612b0083004e562466a`.
- Maintainer skill passed current quick validator using existing cached PyYAML, with no installation.
- Full candidate `git diff main...HEAD --check` and relative Markdown link checks passed. Credential-pattern scan found no candidate artifact matches; source matches were implementation symbols and synthetic test literals. This bounded check is not a guarantee of anonymization.
- Actual laptop project MCP identity observed twice with expected saved checkout/project/broker; a new diagnostic binding survived separate calls from 41 to 42. Existing scientific state was not reset. Optional recursion remains unavailable.

## Studio safety and local configuration

Read-only Studio coordination used chat `01a13aa3-03a7-7ed3-9177-452cf8bd2db3` on host `remote-control:env_e_6a849b6402a4832dac6ad58573bad7ac`. Saved checkout `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl` remains at `45bc6a1bfc79efb2ca4d132849edc8804db7abc6`, with its existing local config edit and two artifacts. Earlier actual MCP identity/persistence checks passed. Its installed legacy launcher matches that source; live scratch session has a surviving diagnostic binding.

Studio process inventory found seven legacy brokers referencing the saved source, one kernel child under broker PID 27566, and no process matching standard managed/scientific-session entrypoints. This is a process-name inventory, not proof of absence of differently launched services. Bootstrap and later imports can read source lazily. Generation isolation in the new runtime cannot retroactively pin those legacy processes. Updating their source or restarting them has no proven state-preservation guarantee.

For a future approved managed installation, the local executable is `/opt/homebrew/bin/node` (stable symlink, currently the same working Node 26.8.2), with `args` equal to that installation's absolute `packages/cleanroom-node-repl/src/managed-scientific-mcp.mjs`, and `cwd` equal to that installation root. Preserve `approval_mode = "approve"`, enabled/required flags, tool restrictions and timeouts. The generator changes only command/args/cwd; machine settings stay out of Git.

Current [official MCP guidance](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) supports trusted project config and the desktop Save → Restart workflow. The [app-server API](https://learn.chatgpt.com/docs/app-server) also provides `config/mcpServer/reload`; installed-host support must be verified. A full app restart is not the only documented refresh route and can lose legacy scratch state. Current [plugin packaging](https://developers.openai.com/plugins/build/plugins) does not require converting this working project MCP into a plugin; no conversion was attempted.

## Exact next actions requiring approval

1. Review the candidate tip on `codex/sync-reviewed-candidate` and the scope manifest. Recheck the expected published main revision. Fast-forward local main to that exact reviewed tip without switching or rewriting the dirty saved checkout, then publish that tip to GitHub main with an ordinary fast-forward push only if the upstream precondition still holds. If upstream changed, reconcile and revalidate locally first.
2. For Studio adoption, stage the same approved revision in a separate stable checkout, proposed `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl-sync-20261014`, if absent. Keep the original saved source, dependencies, settings and processes untouched. Reuse compatible existing dependencies by copy when complete; any missing dependency installation needs explicit authority. Generate that new checkout's machine-local launcher only, verify isolated checkout/generation/socket/store identity offline, then verify a fresh project chat with actual identity, cross-call persistence and managed attachment. This proposed new root is a destination, not an already-created or verified installation.
3. Updating either original saved checkout remains deferred until its active-session owners finish and authorize closure or an independently verified immutable-source/state-preservation method is available. Do not infer safety from process survival or generation isolation. Reconcile the laptop's already-captured dirty source to the approved candidate while preserving every excluded path and local setting; do not blanket discard or stash scientific state.

The earlier broad publication/saved-update proposal was rejected by automatic approval review before dirty scope was resolved. This candidate resolves the inclusion scope; it does not bypass the remaining concrete publication/update approval gate. Studio source replacement remains a separate lifecycle risk even after publication approval.
