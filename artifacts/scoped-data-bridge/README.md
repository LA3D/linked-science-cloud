# Scoped data bridge result storage

Four E1 attempts are recorded: one fixture preparation failure and three fresh-worker probes. See the [experiment protocol and observations](../../docs/experiments/scoped-data-bridge.md). No shared bridge round trip is established by those probes.

## Layout for each executed attempt

Use a unique, non-overwriting directory `artifacts/scoped-data-bridge/<run-id>/`, where the run ID includes UTC date/time, experiment, arm and attempt suffix.

| File | Purpose |
| --- | --- |
| `plan.json` | Frozen protocol/revision, fixtures, permitted actions, budgets, expected checks and repetition assignment before dispatch |
| `receipt.json` | Compact result based on the [template](../../docs/experiments/scoped-data-bridge/receipt.template.json) |
| `events.jsonl` | Sequential tool/bridge observations with actor, timestamp, operation, scoped object reference, status and byte counts |
| `checks.json` | Expected versus observed checks, pass/fail/not-measured, and pointers to event sequences |
| `fixture-manifest.json` | Fixture IDs, hashes, types and sizes; evaluator keys stay outside worker-visible material |

Optional bounded action-code and diagnostic JSON files may be linked from the receipt. Never save capability secrets, authentication material, hidden reasoning, or full conversation transcripts. Synthetic payload snapshots require explicit run scope and must be labeled as snapshots, not live handles. Preserve the fixture-generating recipe in the eventual test harness; do not expose hidden labels via a worker-readable artifact directory.

## Capture sequence

1. Allocate a fresh directory with exclusive creation. Freeze `plan.json` before execution. A plan alone is not a result and has no entry in `registry.runs`.
2. Append observations as operations occur. Record an explicit failed/incomplete state if dispatch, capture or execution stops. Persist compact evidence before closing workers or resetting their data.
3. Fill `receipt.json` and `checks.json` from observed evidence, using null for unavailable values and naming every material gap in `missingEvidence`. Finalize files atomically. Do not fabricate timestamps, model usage or host identity.
4. Add one entry per executed attempt to [the existing registry](../experiment-results/registry.json). Its `recordPaths` lists JSON receipt/check/manifest files; JSONL is referenced inside the receipt because the registry validator expects JSON documents. Link the methodology in `documentationPaths`.
5. Run `npm run evaluation:results:validate`, inspect referenced evidence, and update [the human result index](../../docs/experiments/RESULTS.md). The current validator checks registry structure, paths and JSON parsing; it does **not** validate this template's scientific assertions or check completeness. Receipt-specific automated validation belongs in the execution harness before its first run.
6. Commit receipts with the focused experiment change. Correct or reinterpret by adding a new linked record, never silently editing finalized observations. Keep the declared source revision of the tested code separate from the later receipt commit.

Use existing outcomes `passed`, `failed`, `partial`, `inconclusive`; evidence grades and durability follow the [registry contract](../../docs/experiments/RESULTS.md). A fully captured failure can have complete durability. A worker's prose answer without a transport audit cannot establish the no-parent-relay property.

## Event and check fields

Each event has `seq`, `observedAt`, `actor`, `operation`, `objectRef`, `status`, `inputBytes`, `outputBytes`, `parentVisibleBytes`, `childVisibleBytes`, `evidencePath`, and `error`. Unavailable measurements are null, not zero. `objectRef` is non-redeemable metadata. Distinguish runtime-observed facts from evaluator inference.

Each check has `id`, `expected`, `observed`, `status` (`passed`, `failed`, `not-measured`), `eventSequences`, and `limitation`. An experiment passes only when its required checks are measured and pass. Missing prerequisite evidence is inconclusive, not a passing assumption.
