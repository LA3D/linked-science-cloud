# Session recovery for laptop sleep

Implemented in the authoritative checkout on `codex/session-sleep-recovery`, starting from `f92374063cf85834e5d7bb8ec9c7ccac04cd4a98`. The Fabry run exposed a five-minute idle expiry and an MCP adapter that could only route into its closed owner kernel.

## Result

- Owner-connected sessions no longer expire due to inactivity; detached idle grace defaults to 24 hours and is configurable with `--idle-ttl-ms`.
- Worker grant TTL remains independent (60-second default, five-minute maximum); existing capacity ceilings remain.
- `js` has optional host `session` controls requiring empty code: status, create, attach, detach, reconnect, recover, bookmark and restore. The MCP still has three tools.
- Host controls work independently of kernel liveness. Owner evaluations check instance/epoch first; lost connections do not fall back to scratch and interrupted code is never automatically replayed.
- Recovery preserves surviving bindings or explicitly reports loss. It cannot replace an occupied session ID, elevate a worker, or revive expired grants.
- A bounded activity/version bookmark survives sleep and service restart in adapter memory. Explicit restore uses a fixed loader, fresh workspace and fresh handles, and reports pending/completed work without running continuations. It neither restores arbitrary JavaScript nor auto-selects historical activities.
- Session instance IDs distinguish new instances whose numeric epochs repeat. Stale restore-binding metadata is cleared on epoch changes.

The [operating guide](../architecture/session-sleep-recovery.md) covers controls, exact scope and limitations. Bookmarks and credentials are not automatically persisted across Desktop/MCP-process restart; nonsecret artifact manifests remain the recovery route in that case.

## Verification

- Full `npm test`: 353 tests, 352 passed, 1 failed. The failure is the unchanged missing registry status for `docs/experiments/scientific-trajectory-evidence.md`.
- Final targeted session recovery and handoff runtime tests: 14 passed (see local test log `/private/tmp/linked-science-sleep-targeted.log`). Coverage includes idle/detached behavior, service restart and selected snapshots, lost acknowledgements, no execution replay, dead kernels, old grants, occupied IDs, malformed controls, epoch changes and stale binding cleanup.
- `npm run smoke` and `npm run linked-science:verify` passed. Module syntax, documentation links and `git diff --check` passed.
- Socket tests ran with sandbox escalation because the default sandbox denies Unix-domain listen. Tests use disposable local services/kernels and synthetic data; they did not restart the user's service or make scientific network reads.

## Deployment and handoff

The currently running service and MCP adapter have not been hot-patched or restarted. After preserving required unsaved work, restart the independent service with the same socket and private `--handoff-root`, then reload the project MCP once. New service readiness reports `idlePolicy: detached-only` and `idleTtlMs: 86400000` by default. Follow the operating guide to reconnect/recover and select saved versions. The prior Fabry restore manifest remains usable; old live handles do not.

No dependencies, global/client configuration, remotes or unrelated working changes were edited. No push is authorized or performed.

Implementation commit `d4b2769` was fast-forwarded from `codex/session-sleep-recovery` into local `main`; `git merge-base --is-ancestor d4b2769 main` passed. The checkout is `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`. Local `main` was eight commits ahead of `origin/main` after implementation integration (nine including this completion record). Unrelated tracked changes and untracked scientific artifacts remain in the working tree, excluded from these commits. Activation and a live reconnect check are the remaining deployment steps; passing synthetic tests does not establish activation in the current chat.
