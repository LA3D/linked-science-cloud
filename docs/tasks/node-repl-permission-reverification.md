# Task: Re-verify Node REPL sandbox and network permissions

- **Status:** Ready
- **Priority:** High
- **Owner/task:** Unassigned
- **Scope:** Read-only diagnosis of current coordinator-versus-worker Node REPL behavior under the current Codex permission model. Do not implement a permission fix in this task's diagnosis phase.
- **Authorization boundary:** Local repository and configuration inspection is read-only. Any live check requires current explicit approval for the exact existing Identifiers.org profile. Use only the project guard; never use direct HTTP as a bypass. Do not change configuration, install packages, add an MCP server, export, or write externally.
- **Starting point:** Begin from the then-current local `main`; record its commit and the Codex app/version context available to the task.

## Why this must be re-measured

The pre-reinstall read-only memory archive records historical observations, not current proof:

1. The coordinator Node REPL loaded this project and completed a guarded Identifiers.org Communica `SELECT LIMIT 1` with HTTP 200.
2. An independently spawned `workspace-write` worker loaded the project and dependencies, but its guarded request failed before HTTP; separate attempts recorded DNS `ENOTFOUND` and socket `EPERM` to port 443.
3. Tool exposure, filesystem access, dependency resolution, cross-call persistence, observed sandbox/configuration, and guarded network reachability are independent dimensions.

The current Codex client and permission model may differ. Treat each historical result as a hypothesis to test, not a configuration prescription. `node_repl` is client-provided and must not be packaged or registered by this repository as a new MCP server. Do not restore legacy `js_repl` activation guidance or unrestricted `danger-full-access` guidance.

## Diagnosis sequence

### 1. Verify current official guidance

Consult current official Codex documentation before interpreting the runtime. Record the exact official URLs, access date, and what they say about client-provided Node REPL availability, worktree/worker permissions, sandbox/network controls, and configuration. Note any gap between documented and observed behavior. Do not use historical memory or repository prose as the authority for current Codex configuration.

### 2. Coordinator test case

In the coordinator's Node REPL, record these dimensions separately before any live request:

- tool names actually exposed and whether activation provenance is known;
- reported REPL cwd and readable project root;
- project dependency resolution for `@comunica/query-sparql`;
- a top-level `var` binding verified in a second REPL call;
- observable sandbox/configuration metadata, distinguishing declared settings from inferred behavior; and
- project guard/profile availability.

Only after current approval for `identifiersOrg` is confirmed, run one guarded bounded `SELECT LIMIT 1` through the maintained transport and record the full compact attempt receipt. Do not retry automatically and do not fall back to `fetch`, direct HTTP, another host, provider URL, or REST route.

### 3. Independent worker test case

Launch a fresh independent worker with the intended current `workspace-write` boundary and the same saved project. Repeat the same no-network dimensions and, only under the same current live approval, the same guarded Identifiers.org probe. Do not silently repair module paths, change configuration, or inherit the coordinator's claimed state.

If the request fails before HTTP, preserve the exact stage and error class. Distinguish DNS resolution (`ENOTFOUND` or equivalent), socket denial (`EPERM` or equivalent), timeout, guard rejection, and HTTP response. One failure class does not establish the others.

### 4. Compare without fixing

Compare coordinator and worker observations dimension by dimension. State the narrowest supported conclusion about current behavior and list any missing evidence. Stop after diagnosis. A proposed configuration, permission, client, or documentation change becomes a separately authorized implementation task.

## Evidence matrix

Complete this table from current tool output rather than expectations:

| Dimension | Coordinator evidence | Independent worker evidence |
| --- | --- | --- |
| Codex/app/version context | Pending | Pending |
| Exposed Node REPL tools and activation provenance | Pending | Pending |
| REPL cwd and project filesystem access | Pending | Pending |
| Dependency resolution | Pending | Pending |
| Cross-call persistence | Pending | Pending |
| Declared/observed sandbox and configuration | Pending | Pending |
| Guard/profile preflight | Pending | Pending |
| DNS result | Pending | Pending |
| Socket/connect result | Pending | Pending |
| HTTP/guard receipt | Pending | Pending |
| Official-doc agreement or discrepancy | Pending | Pending |

## Acceptance criteria

- Current official Codex sources are cited with access date and separated from runtime inference.
- Coordinator and fresh-worker evidence use the same repository commit, dependency, profile, bounded query shape, and guard path where the environments permit it.
- Tool exposure, filesystem access, dependency resolution, persistence, sandbox/configuration, DNS, socket connection, guard behavior, and HTTP outcome are reported independently.
- Every live attempt has a guarded receipt or an exact pre-HTTP/guard failure record; there is no direct-network bypass or substituted source.
- The conclusion does not generalize one environment's result to the other or treat a transport failure as source absence.
- No package, repository-provided MCP server, global configuration, permission fix, export, or unrestricted sandbox guidance is added.
- Any recommended fix is deferred to a new, explicitly authorized task with the diagnosis attached.

## Current state

### Completed evidence

- Historical coordinator success and workspace-write worker failures are summarized above as hypotheses from the pre-reinstall read-only archive.
- The repository README's former unrestricted-sandbox and legacy feature-flag recipe has been removed from current setup guidance pending this diagnosis.
- No current permission-model run has been performed for this brief.

### Decisions

- Diagnose before proposing or applying a permission change.
- Compare coordinator and worker with the same guarded bounded probe.
- Treat `node_repl` as client-provided and keep it outside repository packaging.
- Do not restore deprecated `js_repl` or `danger-full-access` guidance.

### Remaining work

- Verify current official Codex documentation and record the source details.
- Run coordinator and independent-worker no-network preflights.
- Obtain or confirm current approval before the exact guarded Identifiers.org probes.
- Populate the evidence matrix and record the scoped diagnosis.
- If a fix is warranted, create a separate implementation brief rather than applying it here.

### Exact next action

Open the current official Codex documentation for Node REPL/tool availability and sandbox/network permissions. Record URLs, access date, and relevant current claims, then capture the coordinator's no-network tool/cwd/module/persistence preflight. Stop before live network access unless approval for the exact `identifiersOrg` profile is current.

### Blockers or required decisions

- The live comparison is blocked until current explicit approval for the exact Identifiers.org profile is confirmed. Official-doc review and local preflights are not blocked.

## Handoff state

- **Git:** Not started; use a named `codex/<task>` branch only if a later authorized documentation or implementation change is made.
- **Verification:** Protocol review only. No current official-doc audit or runtime comparison has occurred.
- **Ephemeral state:** None; no coordinator or worker REPL binding is claimed resident.
- **Durable artifacts/receipts:** Historical observations are summarized from the read-only archive; no current run receipt exists.
