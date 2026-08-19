# Task: Sanity-check multi-turn context recovery before the demo

- **Status:** Ready
- **Owner/task:** Unassigned
- **Scope:** One fresh-worker, local-synthetic evaluation of orientation, bounded handle reuse, ambiguity, stale state, and reset recognition. No new runtime feature is implied.
- **Authorization boundary:** Repository reads and persistent local REPL execution only. No network, live endpoint, export, package installation, configuration change, or repository edit during the evaluation.
- **Starting point:** Begin from the then-current local `main`; record its commit in the run receipt.

## Outcome and acceptance evidence

Establish whether a fresh worker can recover useful context across turns without raw-result history and without trusting stale symbolic state. A passing trace must show:

1. an actual persistent-REPL preflight before any execution-backed conclusion;
2. creation or inspection of the bounded orientation cache before result navigation;
3. one local synthetic result retained behind a handle and summarized through a display of at most 10 rows;
4. a second turn that reuses or derives from the verified handle without silently rematerializing it;
5. an ambiguous candidate or identifier represented as bounded alternatives or an explicit request for clarification, not an invented resolution;
6. a stale cache reference after deliberate reset, followed by a current session check that reports the handle missing or invalidated; and
7. no network, full-result dump, export, file mutation, or unsupported residency claim.

Use actual tool-event IDs and compact receipts. Score the trace against the existing [clean-worker evaluation](../experiments/clean-worker-map-evaluation.md) and the reset/stale-state contract in [orientation cache and reset](../architecture/orientation-cache-and-reset.md). A failure is useful evidence if its scope is recorded honestly.

## Evaluator prompt

Give a fresh Codex task this prompt and no expected answer, query, handle name, or raw prior trace:

> Using the persistent JS REPL and only local synthetic RDF, determine whether a bounded set of scientific records can support one unambiguous demo row or whether multiple candidates remain. Keep the source result behind a symbolic handle, return only a bounded table with provenance, and preserve compact orientation for a second turn. Do not contact a network or change files. If the persistent REPL is unavailable, stop with `missing-persistent-repl`.

After the worker returns its first bounded result, ask it to derive one narrower bounded view using the existing session and to explain any unresolved candidate ambiguity. Then deliberately reset the REPL and ask it to recover from its compact orientation without claiming that old handles remain resident.

## Current state

### Completed evidence

- The constrained 120-item clean-worker experiment already proves one narrow multi-turn reuse and reset-honesty path under coordinator steering.
- Offline tests cover stable orientation entries, eviction, raw-query exclusion, guarded acquisition failures, and bounded display models.

### Decisions

- Keep the scenario synthetic and local so environment, source availability, and live authorization do not confound context recovery.
- Test ambiguity, stale state, reset, and boundedness in the worker trajectory; do not prescribe a SPARQL operation or expected scientific answer.
- Treat the orientation cache as advisory and current session receipts as authoritative.

### Remaining work

- Choose or generate the local synthetic fixture in REPL memory without changing repository files.
- Run the first-turn prompt in a fresh task and capture chronological tool evidence.
- Run the bounded second turn, ambiguity check, and deliberate reset challenge.
- Record a compact evaluator result in the appropriate experiment dossier; update the roadmap status only if the evidence changes it.

### Exact next action

Launch one fresh local-only Codex task with the evaluator prompt above. Before accepting any scenario conclusion, capture its REPL tool name, cwd, module-resolution result, persistence proof, and initial session/cache binding state.

### Blockers or required decisions

- None for the local evaluation. Any proposal to use live Linked Science Cloud sources is a separate task requiring current approval for exact profiles.

## Handoff state

- **Git:** Not started; use a named `codex/<task>` branch only if the evaluation produces authorized repository changes.
- **Verification:** Protocol review only. No new evaluation run has occurred.
- **Ephemeral state:** None; no REPL handles are claimed resident.
- **Durable artifacts/receipts:** Existing evidence is linked above; the new run has none yet.
