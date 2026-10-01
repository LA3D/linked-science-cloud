# Whole-resource conversion quota: 100 MB

Implemented October 1, 2026 in `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud` on `codex/resource-100mb`, starting at `b3fedf7d672ef62257fe966dd98261eec972a563` (`codex/managed-scientific-startup`). The user authorized this saved checkout after worktree startup failed. Existing source, configuration, registry and artifact changes remain unrelated and excluded from this task.

## Implementation

The facade default and configuration ceiling for `maxResidentResourceBytes` are now 100,000,000 decimal bytes. Configuration can tighten this ceiling. Acquisition capacity, mediated request budgets, heap admission, native per-graph/workspace quad quotas, and display/read limits retain their existing behavior. The live heap estimate can reject bodies below 100 MB; the limit does not promise every body fits memory.

Regression coverage includes broker-mediated disk RDF/XML above 4 MB, rejection above 100 MB before whole-body reads with no partial graph, tighter configuration, graph-capacity rejection, bounded inspection/reads, configuration-ceiling validation, and an actual MCP kernel refusing a 10 MiB resource with `LS_KERNEL_HEAP_BOUND` under a 256 MB heap. The previous MCP resource test now expects its 4,259,840-byte text conversion to succeed.

## Verification and activation

- Focused quota/RDF/XML tests: pass (13 tests); actual MCP resource tests: pass (2 tests, including heap admission).
- `npm run smoke`, `npm run linked-science:verify`, and `git diff --check`: pass.
- `npm test` with temporary local Unix sockets enabled: all quota tests pass; the only remaining failure is the existing untracked `docs/experiments/scientific-trajectory-evidence.md` lacking registry status. This task does not change that dossier or the unrelated registry edits. A sandboxed attempt also hit Unix-socket `EPERM`; the socket-enabled run removes that environmental failure.
- Relative links in the changed resource-storage document resolve; quota searches found no contradictory current default.

A fresh repository-owned `cleanroom-mcp.mjs` process, using the actual `js` JSON-RPC tool and private mediator, retrieved `http://purl.obolibrary.org/obo/envo.owl`. It resolved to `https://raw.githubusercontent.com/EnvironmentOntology/envo/master/envo.owl`, returned `text/plain`, and retained 9,614,229 bytes with SHA-256 `a0b919065d33a9cf975b74cadd16c75f32f512d17f4f6d5999b74216701df54c`. Explicit `application/rdf+xml` conversion retained 106,817 ontology quads. Its capabilities reported 100,000,000 resource bytes, 250,000 per-graph quads, 251,658 workspace quads and 32,768 display bytes. This was an implementation verification, not a scientific inference or a claim that ontology imports were loaded. The disposable verification workspace was released.

The mounted chat MCP separately demonstrated authoritative project identity and persistence across two calls, but still reports 4,000,000 bytes. Existing scientific kernels must reload the runtime in a fresh epoch to use the new default. Restarting an adapter that reuses an existing managed scientific service/session does not establish activation. Preserve needed session evidence before intentional epoch loss; old handles do not survive reset. No mounted-session reset or service shutdown was performed. This quota change does not address the unrelated CONSTRUCT timeout/reconnection failure.

## Git handoff

The task is retained on its named branch. Local `main` is at `e2e973bcde7b5ffa0edd0fa7182cfff799a78fc9`, equal to its upstream at verification time. The starting checkout is three pre-existing commits ahead of main and contains substantial unrelated edits. Fast-forward integration would include those pre-existing commits, while switching to main also crosses unrelated dirty files. Integration is therefore deferred; do not force it or sweep unrelated work into this commit. No packages were installed, no configuration was edited, and nothing was pushed.

Next action for live use: deliberately establish a fresh scientific kernel and verify `linkedScience.capabilities().budgets.maxResidentResourceBytes === 100000000` before reusing the ENVO loading procedure. Resolve the unrelated registry failure and prior-branch integration separately.
