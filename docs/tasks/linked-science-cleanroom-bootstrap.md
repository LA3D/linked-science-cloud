# Linked Science clean-room bootstrap

- **Status:** Complete; implemented and verified in the saved checkout
- **Scope:** Project-local registration and bootstrap for the separately saved `cleanroom_node_repl`; local-synthetic verification only.
- **Authorization boundary:** No live endpoints, network probes, package changes, global configuration, exports, pushes, remote changes, or edits to the clean-room repository.

## Outcome

Replace the obsolete bundled-REPL path with one active project MCP registration, explicit Linked Science project/module roots, one-time facade bootstrap, RLM discovery registration, and broker-owned PEEK orientation across kernel replacement.

## Decisions

- The MCP launches the clean-room server by absolute source path with the Linked Science checkout as its cwd.
- The facade bootstrap imports by absolute module URL and validates all declared dependency resolutions from the exact project `node_modules` root.
- Linked Science workspaces own bulk handles; RLM owns kernel-resident external discovery context; the clean-room broker owns PEEK orientation; Codex owns goals.
- The disabled restricted network profile remains tracked only as reference.
- The clean-room repository was not changed. Its registered module-root hook timed out on the real Communica graph, but Linked Science does not require that hook: native module-scoped ESM resolution from the absolute facade import is validated and succeeds.

## Current evidence

- The clean-room server launched offline with the Linked Science checkout as cwd.
- Cross-call JavaScript persistence and CodeAct mode were observed through its real JSON-RPC broker.
- Direct absolute import of `lib/linked-science-runtime.mjs` resolved the existing Linked Science dependency graph without network access.
- Focused tests cover active configuration, explicit roots, declared dependency resolution, one-time stable facade bindings, RLM registration, broker PEEK persistence across facade recreation, and stale old handles.
- `npm run runtime:cleanroom-synthetic` exercised the actual clean-room JSON-RPC server and passed persistence, bootstrap, bounded synthetic query, RLM, PEEK, reset, and stale-reference checks.
- A genuinely fresh Local Desktop task (`01a01fa3-4f31-7f72-8b3c-6d8d4694c733`) loaded the project MCP and observed exactly `js`, `js_reset`, and `js_add_node_module_dir`; cwd and CodeAct mode; a binding persisting from 41 to 42; all three declared dependencies resolving from the explicit module root; idempotent bootstrap; a two-row/four-cell/1,205-byte local-synthetic result; 2,613 bytes of bounded RLM discovery context; four resident PEEK references; reset epoch 2 clearing bindings and RLM; the same four PEEK entries surviving; re-bootstrap; and all four old references stale. It did not call `js_add_node_module_dir`, the bundled REPL, or a network endpoint.

## Exact next action

No implementation work remains. Preserve the verification evidence above when using or revising the clean-room bootstrap; any live source work still requires separate exact-profile approval.
