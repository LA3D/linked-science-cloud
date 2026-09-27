# Runtime fixes delivery — 2026-09-27

The user authorized completing, committing and integrating the non-recursion fixes into local main. This supersedes earlier no-commit coordination notes for these fixes only. Starting checkout: `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`, branch `codex/checkpoint-runtime-fixes`, commit `13e43664e3313bc668221bbf8d72e522b8a60db3` (also local main).

## Delivered scope

- Retained RDF/XML parsing with native RDF/JS terms, response URL/XML base handling, language/datatype and blank-node fidelity. Malformed/truncated XML and DTDs reject without partial publication or retrieval. Collection stops immediately at the quad limit; workspace-capacity rejection and recovery after release are tested. The existing parser dependency is now declared directly; no installation occurred.
- Anonymous broker requests default to truthful `LinkedScience/1.0`, preserving explicit overrides and identity stripping.
- SELECT metadata preserves projected variables for empty/unbound results, including broker storage. Default zero-column paging succeeds while invalid explicit projections reject.
- Portable bootstrap guidance and tests derive expected paths from the selected checkout.
- Registry tests compare summary counts to the input records instead of stale hard-coded totals. Required dossier coverage checks remain unchanged.

## Verification

The selected Git index was exported into a temporary directory, without creating another Git worktree. Installed dependencies were copied locally because broker identity validation correctly rejects dependencies resolving through a symlink outside the checkout. Only that temporary copy's machine-local MCP configuration was generated using the existing setup script.

- Standalone candidate: `npm test` **309/309 passed**, no skips, with local fixture socket access; `npm run smoke` and `npm run linked-science:verify` passed. These are synthetic/offline checks, not live scientific retrieval or activation of an existing Desktop session.
- Shared working tree: `npm test` **316/317 passed**, no skips. Sole failure: unrelated untracked `docs/experiments/scientific-trajectory-evidence.md` lacks registry status. Its feature and records were not included merely to make this checkout green.
- Focused RDF/XML/paging tests: **13/13 passed**. Changed skill validation, relative Markdown links and `git diff --check` passed.

Recursion capability edits and experiments, trajectory/wiki changes, research artifacts, consultation logs, machine configuration and their existing handoffs remain outside this delivery. No live research session was restarted, no provider attached, and nothing pushed. Existing sessions need a separately coordinated restart before claiming they run the new code. Commit identity and local-main ancestry are recorded in the delivery response and Git history.
