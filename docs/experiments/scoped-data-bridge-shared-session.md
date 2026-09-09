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

## Advancement

A failed or unavailable adapter blocks dependent claims for that adapter. Passing a graph subset does not clear the entire heterogeneous-data gate. Save diagnostic failures under new run identifiers; code changes produce a new source/harness fingerprint. Run results belong in the registry, separately from this methodology.

## E2 results

Six separately recorded attempts are registered. Attempt 1 had a malformed harness query. Attempts 2 and 3 failed in the oracle harness because its variable name collided with the Node global crypto accessor; switching to a task-specific module binding resolved it. These are harness failures, not measured bridge failures. Attempt 4 completed basic graph/bindings comparisons. Attempt 5 added scoped named-graph queries and residency checks but assumed resident profiles had a broker-residency field, stopping those two arms. Attempt 6 corrected that harness assumption and completed all four arms.

The [latest receipt](../../artifacts/scoped-data-bridge/e2-20260909-shared-types-06/receipt.json) and [checks](../../artifacts/scoped-data-bridge/e2-20260909-shared-types-06/checks.json) show 28 passed checks, four failed JSON-input checks and one unmeasured storage case. They include matching 24-quad graph fingerprints, named-graph query results, eight/257 binding rows including duplicates and unboundness, confirmed resident/broker binding tiers, and copied-handle rejection across both repetitions. All oracle and worker observations were captured before client/session closure. The JSON input publication checks failed with an invalid-handle error. Full named-graph broker storage remains unmeasured. The gate is therefore partial, not passed.

No production runtime code was changed by these experiments. E3 may cover the passing graph/bindings subset under explicit scope, but an end-to-end heterogeneous-data claim requires addressing the missing JSON adapter and named-graph storage fixture. E4 and E5 have not run. Current typed tests use mechanical worker adapters, not fresh Codex model runs or blinded semantic scoring. The receipts retain partial durability because complete transport accounting is unavailable.
