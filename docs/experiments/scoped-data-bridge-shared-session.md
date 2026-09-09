# Shared-session experiment amendment

Protocol: `scoped-data-bridge/shared-session-v2`. This supplements the [original suite](scoped-data-bridge.md); it does not overwrite E1 evidence or relabel implementation tests as experiment runs.

## Common boundary

Use an isolated scientific session service for destructive lifetime tests. Owners retain native objects; mechanical worker clients run separate scratch kernels with explicit grants. Codex workers are required for semantic processing, but deterministic client code is appropriate for equality and transport tests. No provider API is added. Freeze source/harness hashes, synthetic fixtures, budgets and checks before execution. Preserve receipts before closure; never save redeemable capabilities. Unavailable accounting stays null.

## E2: typed data

The executable [harness](../../scripts/scoped-bridge-e2.mjs) freezes its plan before allocating fixture sessions. It runs owner-oracle, scoped-worker and copied-handle-negative arms twice per configured bindings tier. The ontology has 24 quads including a subclass chain, shared blank-node restriction, language and datatype literals, and two named graphs. Eight and 257 SELECT rows test duplicates and unbound cells with batches of 32, independently of display limits. Broker bindings admission uses an isolated facade's low result threshold; no global configuration changes.

Compare fingerprints of native RDF terms between an owner and proxy over the same retained graph; preserve shared blank-node occurrences and graph identity. This is not a general graph-isomorphism benchmark. Report graph, bindings and JSON separately. General JSON input publication and forced broker storage of the full named-graph fixture may be unsupported; do not substitute output deposits or flattened graphs and call those cases passed. Record each configured tier's profile as evidence of actual storage.

## E3: scope and lifetime

Only passing E2 adapter/tier pairs may enter. Allocate two worker grants with disjoint published objects and output slots. The current service grants whole published objects, not arbitrary selectors: test selector narrowing only after it exists, otherwise mark it unsupported. Test unauthorized object, operation and query-source access; malformed and duplicate deposits; source release, disposal, expiry, isolated reset, delayed completion and concurrent returns. Record each rejection, surviving unrelated data and actual enforcement layer. Whole-kernel timeout can destroy a session; it is not recovery. No claimed protection against arbitrary same-user filesystem/process authority.

## E4: semantic processing

Requires relevant E2 and E3 gates. Retain the original twelve-annotation fixture and three arms with three fresh repetitions each, a frozen rubric and randomized order. Codex workers read references through the bridge and deposit fixed-schema evidence/uncertainty findings. Parent code validates every schema/reference and aggregates; worker completion alone is not success. The current generic JSON deposit only validates JSON shape and size, so experiment-specific schema validation must be added to the evaluator before scoring. Audit parent observations or explicitly leave no-relay unestablished. No semantic-quality claim follows from the activation counting probe.

## E5: scale and recovery

Requires E4. Retain sizes 32, 256 and 2,048, batch size 32, concurrency two and fixed budgets. Separate mechanical transport runs from the bounded real-worker case. Include interrupted workers, read timeout, completion replay and isolated reset. Measure exact coverage and duplicate acceptance, metadata growth and memory where available. The current offset-based proxies rescan prefixes, so record read amplification and timeout behavior; do not extrapolate constant cost or silently increase budgets. Recover only by an explicit new epoch/reacquisition when state is lost.

## Frozen E4 execution design

The [frozen plan](../../artifacts/scoped-data-bridge/e4-20260909-semantic/plan.json) records seeded order, budgets, fixture and evaluator fingerprints before any model dispatch. Each arm has three fresh attempts. A uses fresh direct-input evaluators as a proxy for root-only access because the coordinating conversation already knows the fixture. B uses fresh Codex workers and scoped JSON/native RDF reads through the mounted project MCP, followed by direct deposits. C computes subclass reachability and deliberately abstains on prose interpretation. The external repository client owns each isolated scientific REPL, admits A/C responses into a findings variable, and retrieves B deposits into that variable before aggregation. This is a declared change from resuming the mounted parent MCP; that working scratch namespace is left intact.

The evaluator requires one fixed-schema finding per annotation, exact target identity, valid required references, and a matching verdict/uncertainty pair. Application schema validation happens before accepting the experiment result, outside the generic JSON deposit validator. The answer key is a separate evaluator artifact, excluded from worker prompts. Same-user filesystem access means this is not blinded or an enforced answer-key isolation test. The coordinator authored the fixture; complete transcript and token accounting is unavailable, so strict no-parent-relay and cost comparisons remain unestablished. Serialized fixture/findings and aggregate lengths are only payload measurements. Preserve all attempts, including failures; do not tune the rubric after results.

## Advancement

A failed or unavailable adapter blocks dependent claims for that adapter. Passing a graph subset does not clear the entire heterogeneous-data gate. Save diagnostic failures under new run identifiers; code changes produce a new source/harness fingerprint. Run results belong in the registry, separately from this methodology.

## E2 results

Six separately recorded attempts are registered. Attempt 1 had a malformed harness query. Attempts 2 and 3 failed in the oracle harness because its variable name collided with the Node global crypto accessor; switching to a task-specific module binding resolved it. These are harness failures, not measured bridge failures. Attempt 4 completed basic graph/bindings comparisons. Attempt 5 added scoped named-graph queries and residency checks but assumed resident profiles had a broker-residency field, stopping those two arms. Attempt 6 corrected that harness assumption and completed all four arms.

The [latest receipt](../../artifacts/scoped-data-bridge/e2-20260909-shared-types-06/receipt.json) and [checks](../../artifacts/scoped-data-bridge/e2-20260909-shared-types-06/checks.json) show 28 passed checks, four failed JSON-input checks and one unmeasured storage case. They include matching 24-quad graph fingerprints, named-graph query results, eight/257 binding rows including duplicates and unboundness, confirmed resident/broker binding tiers, and copied-handle rejection across both repetitions. All oracle and worker observations were captured before client/session closure. The JSON input publication checks failed with an invalid-handle error. Full named-graph broker storage remains unmeasured. The gate is therefore partial, not passed.

No production runtime code was changed by these experiments. E3 may cover the passing graph/bindings subset under explicit scope, but an end-to-end heterogeneous-data claim requires addressing the missing JSON adapter and named-graph storage fixture. E4 and E5 have not run. Current typed tests use mechanical worker adapters, not fresh Codex model runs or blinded semantic scoring. The receipts retain partial durability because complete transport accounting is unavailable.

## Adapter-completion rerun

After explicit user authorization, native JSON input publication/scoped reads and explicit native RDF broker retention were implemented. The unchanged logical fixtures now run with explicit resident or broker graph admission and a versioned JSON input reference. The [new receipt](../../artifacts/scoped-data-bridge/e2-20260909-adapters-fixed-03/receipt.json) records 48 passing checks: cross-tier graph fingerprints, named-graph query results, blank-node occurrences, exact bindings and JSON type-preserving reads, residency confirmation and copied-handle rejection. Both repetitions per tier passed. JSON has only a resident snapshot representation; this does not claim a JSON SQLite backend.

The tested E2 adapter gate now passes. Transport accounting remains incomplete, so evidence durability is partial. Earlier failed/partial attempts remain unchanged. E3 is the next experiment; unit tests for JSON path scope and stale reads are implementation validation, not a substitute for its full matrix.

The first adapter-completion rerun also passed 48 checks. Independent review then found that repeated JSON references could expand excessively before a final size check. Incremental byte/node checks were added with a regression test; the second completion rerun again passed 48 checks. A final preallocation length guard for large strings/property names was then added and the third completion rerun passed 48 checks. All three receipts remain registered.

## E3 scope and lifetime results

The [scope harness](../../scripts/scoped-bridge-e3.mjs) freezes 74 required checks before creating isolated sessions. Two mechanical clients hold disjoint graph, bindings and JSON references. Both resident and broker graph/bindings tiers are verified. Whole-object RDF grants and JSON path-prefix grants are the supported scope contract; arbitrary RDF selector grants and application-specific output schemas are not claimed.

[Attempt 1](../../artifacts/scoped-data-bridge/e3-20260909-scope-lifetime-01/receipt.json) recorded 71 passes and three harness-expectation failures: the resident graph profile uses its explicit dataset label, and a page limited to one row returns one row with more available. No unauthorized payload was observed. [Attempt 2](../../artifacts/scoped-data-bridge/e3-20260909-scope-lifetime-02/receipt.json) corrected those expectations and tightened lifecycle checks to require their specific rejection codes; all 74 checks passed.

Covered: authorized graph/bindings/JSON reads; foreign objects; widened JSON paths; external query sources; mutation/arbitrary-code/reset/close attempts; wrong output slots; scalar malformed deposits; concurrent returns and duplicate rejection; unchanged owner data after mutating a local transport copy; individual release of each type; workspace disposal with another workspace surviving; grant expiry; in-flight graph release; epoch reset and late reads/deposits. Each observation was saved before closing or resetting the associated state.

The in-flight test uses a test-only asynchronous source wrapper that releases its real underlying graph before yielding. It verifies the dispatcher's lifetime recheck and absence of a returned data payload; it does not simulate arbitrary transport timing. JSON reads are synchronous within the serialized kernel. Previously delivered bytes are not revocable. These tests establish the application protocol between cooperative same-user clients, not operating-system isolation or semantic model quality.

E3 passes for this supported contract. E4 semantic processing is next and requires its frozen rubric, schema validation, three arms and repetitions. E5 scale/recovery remains unrun. No production runtime change was required by E3.

## E4 semantic results

All nine frozen attempts completed in the recorded order. The [comparison](../../artifacts/scoped-data-bridge/e4-20260909-semantic/summary.json) reports:

| Arm | Repetition scores | Coverage | Valid references |
| --- | --- | --- | --- |
| A: fresh direct-input evaluator | 12/12, 12/12, 12/12 | 36/36 | 36/36 |
| B: scoped MCP worker and direct deposit | 12/12, 12/12, 12/12 | 36/36 | 36/36 |
| C: structural-only baseline | 6/12, 6/12, 6/12 | 36/36 | 36/36 |

All schemas and owner aggregates validated. Each B result was retrieved from its actual deposit slot into an owner REPL variable; worker completion alone was not accepted. Findings/checks/receipts were saved before session closure. Six fresh Codex evaluators used inherited settings; no separate provider was configured. Optional provider recursion remains unavailable; Codex performed delegation externally.

The first A collection rejected an extra reconnect field before reading findings. A [recorded correction](../../artifacts/scoped-data-bridge/e4-20260909-semantic/collection-amendment.json) normalized the private descriptor without changing the frozen rubric, response, or original harness. Its elapsed time includes recovery. Reproduction uses `scoped-bridge-e4-reconnect.mjs` between prepare and collect. This was one collection failure, not an additional model attempt.

The narrow semantic round-trip feasibility gate passes. The full original no-parent-relay audit gate remains partial. Worker read counts are reported; the owner independently captured deposits, not full tool transcripts. The coordinator created the fixture and key, and workers share filesystem authority. This is an unblinded twelve-item descriptive experiment with a deliberately limited structural control, not evidence of semantic superiority or general scientific reasoning quality. Input snapshot size was 2,175 bytes; model findings were 1,703 serialized bytes and their owner aggregate was 153 bytes. These are payload sizes, not total costs. Timing includes coordination and is not a latency benchmark.

The isolated service and all six workers were closed after capture; the working REPL was not reset. E5 remains unrun. Its prerequisite of a verified round trip is established; scale/recovery needs its own bounded execution and evidence.
