# Verification and completion evidence

Verification should prove behavior and boundaries in proportion to the change. Do not treat a passing command as evidence for live access, REPL residency, or scientific claims it did not observe.

## Required repository checks

Run these before handing off any repository change:

```sh
npm test
npm run smoke
git diff --check
```

For documentation or skill routing changes, also:

- check relative Markdown links resolve to existing repository paths;
- search for stale paths and contradictory guidance;
- run the current Codex skill creator's `scripts/quick_validate.py` against each changed skill, when that validator is available; and
- inspect the complete diff for accidental history rewrites, duplicated contracts, and unrelated files.

For runtime changes, add the narrowest meaningful tests for the changed invariant and run the relevant direct script or fixture when one exists. External-network success is never part of default repository verification: ordinary goal-relevant anonymous reads use the broker when a task needs them, while authenticated, sensitive, mutating, bulk, export, and evaluation operations remain separately governed. Synthetic transport fixtures must prove each actual mediated resource or Communica request crosses the broker.

For an intentional experiment run or a change to its result record, also run `npm run evaluation:results:validate`. Capture the compact machine receipt before resetting or closing resident state. A later prose reconstruction must remain labeled `retrospective-summary` with every unavailable field or trace segment named explicitly.

## Evidence to record

A completion or task-handoff record states:

- commands run and pass/fail outcomes;
- observed receipts or artifact paths, if the task intentionally produced them;
- untested boundaries and why they remain untested;
- current Git branch, task commits, integration status, and uncommitted state; and
- the exact next action when material work remains.

REPL state claims require tool-generated operation evidence. Git status cannot prove that a handle is resident, and a saved receipt cannot by itself restore an expired session.
