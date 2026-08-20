# Task: Sanity-check multi-turn context recovery before the demo

- **Status:** Complete
- **Owner/task:** Evaluate clean-room context recovery
- **Scope:** One fresh-worker, local-synthetic evaluation of orientation, bounded handle reuse, ambiguity, stale state, and reset recognition. No new runtime feature is implied.
- **Authorization boundary:** Repository reads and persistent local REPL execution only. No network, live endpoint, export, package installation, configuration change, or repository edit during the evaluation.
- **Starting point:** Local `main` at `65f4284f48dcafae8db0e43d77906b588bc46164`.

## Outcome and acceptance evidence

Establish whether a fresh worker can recover useful context across turns without raw-result history and without trusting stale symbolic state. A passing trace must show:

1. an actual persistent-REPL preflight before any execution-backed conclusion;
2. creation or inspection of the bounded orientation cache before result navigation;
3. one local synthetic result retained behind a handle and summarized through a display of at most 10 rows;
4. a second turn that reuses or derives from the verified handle without silently rematerializing it;
5. an ambiguous candidate or identifier represented as bounded alternatives or an explicit request for clarification, not an invented resolution;
6. a stale cache reference after deliberate reset, followed by a current session check that reports the handle missing or invalidated; and
7. no network, full-result dump, export, file mutation, or unsupported residency claim.

**Result:** Passed all seven criteria on 2026-08-20. The detailed trace and interpretation are recorded in the [clean-worker evaluation](../experiments/clean-worker-map-evaluation.md#recorded-multi-turn-context-recovery-run--2026-08-20).

Use actual tool-event IDs and compact receipts. Score the trace against the existing [clean-worker evaluation](../experiments/clean-worker-map-evaluation.md) and the reset/stale-state contract in [orientation cache and reset](../architecture/orientation-cache-and-reset.md). A failure is useful evidence if its scope is recorded honestly.

## Evaluator prompt

Give a fresh Codex task this prompt and no expected answer, query, handle name, or raw prior trace:

> Using the persistent JS REPL and only local synthetic RDF, determine whether a bounded set of scientific records can support one unambiguous demo row or whether multiple candidates remain. Keep the source result behind a symbolic handle, return only a bounded table with provenance, and preserve compact orientation for a second turn. Do not contact a network or change files. If the persistent REPL is unavailable, stop with `missing-persistent-repl`.

After the worker returns its first bounded result, ask it to derive one narrower bounded view using the existing session and to explain any unresolved candidate ambiguity. Then deliberately reset the REPL and ask it to recover from its compact orientation without claiming that old handles remain resident.

## Current state

### Completed evidence

- The worker passed the actual `cleanroom_node_repl` preflight, including exact cwd, CodeAct mode, cross-call persistence, declared dependency resolution, Linked Science bootstrap, and initial RLM, PEEK, and session state.
- Phase one retained one local-synthetic source and one two-candidate result behind handles. Its two-row table preserved the ambiguity between otherwise equal scientific records from different source batches.
- Phase two reused the resident candidate handle across a genuine task turn and derived a two-row comparison without reloading the graph, rerunning the query, or rematerializing a handle.
- The final `js_reset` replaced the kernel. JavaScript bindings, RLM discovery, workspaces, and resident handles disappeared; broker-owned PEEK survived, and the reopened workspace classified all three old handle references as stale.
- No network, full-result dump, export, file mutation, package installation, configuration change, or unsupported residency claim occurred during the evaluation.
- Offline tests continue to cover stable orientation entries, eviction, raw-query exclusion, guarded acquisition failures, and bounded display models.

### Decisions

- Keep the scenario synthetic and local so environment, source availability, and live authorization do not confound context recovery.
- Test ambiguity, stale state, reset, and boundedness in the worker trajectory; do not prescribe a SPARQL operation or expected scientific answer.
- Treat the orientation cache as advisory and current session receipts as authoritative.

### Remaining work

- None for this evaluation.

### Exact next action

None. Any broader open-ended or live-source evaluation is a separately selected task with its own authorization.

### Blockers or required decisions

- None for the local evaluation. Any proposal to use live Linked Science Cloud sources is a separate task requiring current approval for exact profiles.

## Handoff state

- **Git:** The evaluation itself changed no files; its completion record is included in the accompanying focused documentation commit on local `main`.
- **Verification:** The recorded trace passed all seven acceptance criteria. Repository documentation checks are recorded with the completion commit.
- **Ephemeral state:** The clean-room kernel was reset. The former source, candidate, and derived handles are not resident; their surviving PEEK references are stale orientation only.
- **Durable artifacts/receipts:** No artifact was created. Durable evidence is summarized in the linked experiment record.
