# Validation

Actual project cleanroom REPL: offline recovery executed successfully; all four local SELECT results had expected counts, and exact presentation cells were rehearsed. Second-call access confirmed persistence. The fresh anchor rehearsal adds Fabry handle h-000008; see rehearsal.json for final inventory. Source hashes: 22/22 GSD resources and 4/4 Fabry graphs matched prior records. No remote calls in recovery code; source files read locally. Script syntax, relative Markdown links, registry schema, and git diff --check passed. Synthetic smoke passed.

Full npm test: 317 tests, 275 passed, 21 failed, 21 skipped. Socket-listening EPERM restrictions account for runtime test failures; the experiment registry also fails for the pre-existing unregistered docs/experiments/scientific-trajectory-evidence.md. Separate evaluation:results:validate reports that same omission. No unrelated repairs made and no full-suite pass claimed.

Changed paths: recover.mjs, README.md, receipt.json, rehearsal.json and this VALIDATION.md in this directory; docs/tasks/demo-offline-recovery-20260927.md; one run appended to artifacts/experiment-results/registry.json. Existing unrelated modifications preserved. No commits, pushes, branch changes, resets, restarts or disposal. Run began on main at 485cb2786850e02414fcbfce9856f05d2a2cc51f.
