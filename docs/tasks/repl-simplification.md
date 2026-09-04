# Task: simplify the scientific REPL

- **Status:** Implementation and verification complete; local Git integration pending below.
- **Authorization:** The user accepted the architecture review and requested implementation in a new thread on 2026-09-04. Repository-local code, tests, documentation and focused local Git handoff are in scope.
- **Checkout:** `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`
- **Branch:** `codex/repl-simplification`, starting from local `main` / `claude/resident-quota-spool-index` at `10550cf`.

## Starting state

Inherited runtime 6.2.0 / broker 0.6.0 changes were reviewed and preserved separately in `8348ecd` (`Preserve reviewed heap and indexed-storage baseline`). The original uncommitted patch was also captured temporarily for comparison. The inherited task brief is [heap-aligned residency and indexed spool](heap-aligned-residency-indexed-spool.md).

The nested `.codex/config.toml` approval setting and unrelated `artifacts/structure-viewer/` remain outside task commits. No source changes from the preceding architecture review were assumed; its local probes found a workspace-reset spool leak and a configuration-validator false positive. At review end, 155/156 tests passed, with only that configuration test failing.

## Implementation

- Workspace release/disposal owns registry lifetime, graph accounting and broker storage cleanup, including allocations already in flight.
- Native RDF/JS streaming sources support composition without whole-dataset clones; explicit clones and the legacy dataset alias preserve mutable-copy access.
- The project broker initializes the validated facade before the first evaluation in each kernel.
- Handle inventory is ephemeral; source orientation is small, derived and optionally shared by context identity/version.
- Current guidance prioritizes the scientific REPL and classifies durable Prime, recursive-provider and learned PEEK work as optional research. The prior plan is preserved as an explicitly historical record, with only its banner/status label and relative links changed.
- Configuration validation distinguishes nested tool settings from actual server registrations. Compact source identifiers containing a SPARQL keyword remain valid orientation metadata; raw query forms remain excluded.

## Verification and limits

- `npm test`: **166/166 passed**, including inherited storage/semantic/authority tests and the new lifetime/native-source cases. Failed release/disposal keeps handles invalid, permits cleanup retry and leaves a reopened workspace's results intact.
- `npm run linked-science:verify`: **passed** against the actual local JSON-RPC broker, runtime 6.3.0; exact tool/project identity, cross-call persistence, automatic facade reconstruction, surviving advisory orientation and stale old handles were observed.
- `npm run smoke`: **passed** (`Alex`).
- `git diff --check`: **passed**. Relative Markdown links in changed documents resolve; historical-plan preservation and current routing were checked. The changed Linked Data REPL skill passed `quick_validate.py`.
- No provider activation, scientific/live evaluation, dependency installation, export, push or global configuration change was performed. Local synthetic tests are not scientific competency or current task-mounting evidence.

`linkedScience.reset()` is now asynchronous: await it before relying on reclaimed storage. Release cannot erase caller-owned JavaScript copies. Already-running native operations may unwind after invalidation, but cannot publish old-workspace results. Heap estimates and complete result spooling do not prove bounded working memory for every query operator. Keep the old workspace object if cleanup fails so `dispose()` can be retried. Existing broker processes need a restart to load the automatic-startup changes.

## Git handoff

The reviewed inherited baseline is commit `8348ecd`. The verified simplification will be committed on `codex/repl-simplification` and fast-forwarded into local `main` from `10550cf` if the checkout remains safe. The exact implementation commit and reachability will be recorded after integration. The existing `.codex/config.toml` setting and `artifacts/structure-viewer/` remain outside the commits. Push is not authorized.
