# Durable RLM yield and resume

`nodeRepl.rlm.handoff` is an explicit, host-mediated data and computation handoff protocol. It sits beside the optional `nodeRepl.rlm.query` provider callback. It does not call a model, schedule an agent, select a model, revive workers, or cancel Codex work. The MCP still has exactly three tools. Codex performs model work between completed JavaScript evaluations.

## Named computation boundary

Register a replayable function under a name/version. The host records its source digest and rejects another digest under that identity. A function receives `{state, result, inputs}` and returns either `{type:'done', value}` or `{type:'yield', state, continuation:{name,version}, request:{context,contract}}`. Register every continuation before running. `start` creates a computation; `run` reads its committed revision, runs its registered function, and commits its outcome with a revision compare-and-swap.

Only names, versions, function-source digests and JSON state persist. Restore requires registering compatible code again. Closures, JavaScript stacks, captured bindings and external effects are not serialized. A digest checks the supplied function source, not imported dependencies or closure semantics; the author must bump the version when those change. This is a replayability contract, not a new sandbox. The first slice supports replayable computation only. External effects require a future effect-receipt/retry contract.

A yield transaction commits the continuation, state, immutable input references and a prepared request together. That transaction is the commit point, even if later code in the evaluation throws, times out, or prints truncated output. Finish the evaluation immediately after `run`. `dispatch` explicitly rejects a request prepared in the same evaluation. No callback waits for model work inside the broker. `activities`, `computations`, `pending` and `status` recover references independently of printed prose; they return bounded metadata. `computations(activity,{offset,limit})` lists ready, waiting, complete and cancelled computations with their ID, revision, step identity, parent/request links and creation time (at most 32 entries per page). This includes a start whose acknowledgement was lost and an accepted result awaiting continuation, even when `pending` is empty. After selecting the activity, register compatible steps and use `read`/`run` on the discovered IDs. They never automatically inject pending work into prompts.

## Example: separate evaluations

This example assumes an explicitly configured private host store. Model work takes place after the second evaluation finishes.

```js
var h = nodeRepl.rlm.handoff;
var activity = await h.open({label:'sample-analysis'});
var ws = linkedScience.open({contextKey:'sample-analysis'});
var graph = await ws.graphs.load({name:'sample',kind:'instance-data',
  text:'<urn:s> <urn:p> 42.'});
var graphRef = await h.save(activity, ws, graph);
var jsonRef = await h.saveJson(activity, {question:'Describe the measurement'});
await h.register({name:'select',version:'1'}, async ({state,inputs}) => ({
  type:'yield', state, continuation:{name:'compose',version:'1'},
  request:{context:{question:state.question,evidence:inputs},
    contract:{type:'object',required:['text'],properties:{text:'string'},maxBytes:4096}},
}));
await h.register({name:'compose',version:'1'}, async ({result}) => ({
  type:'done', value:{kind:'model-synthesis',text:result.text},
}));
var computation = await h.start(activity, {step:{name:'select',version:'1'},
  state:{question:'Describe the measurement'},inputs:[graphRef,jsonRef]});
nodeRepl.write(await h.run(activity, computation.id));
```

In a later evaluation, inspect `await h.pending(activity)` and claim the request with `await h.dispatch(activity, requestId)`. This commits **dispatch intent**, not proof that a child exists. Finish this evaluation, then Codex may dispatch actual model work. A subsequent `h.dispatched(activity, requestId, childId)` records a caller-reported child identity; it does not attest native execution. To decompose further, `start(activity,{...,parentRequest:requestId})` creates a registered nested computation. Depth derives from that parent's recorded identity. Complete nested computations before accepting the parent request.

When Codex has a result, submit in a later evaluation:

```js
var receipt = await h.accept(activity, requestId, [graphRef,jsonRef],
  {text:'The returned model synthesis, with its evidence qualifications.'});
nodeRepl.write(receipt);
// A separate replayable computation step composes the accepted result.
nodeRepl.write(await h.run(activity, computation.id));
```

`accept` validates the exact ordered input references, activity, result contract, size, cancellation state and completed nested computations. A transaction atomically stores the result, acceptance receipt and ready continuation revision. Identical retries return the same durable acceptance fields; conflicting retries fail. The runtime adds transient cleanup status to that receipt. A crash after acceptance but before acknowledgement is recovered by retry or `status`. A crash after computation but before advancement may cause computation to run again. Only committed advancement is once-only; physical execution is not exactly-once.

## Durable data and retention

The host owns a private SQLite database with format version 1, `BEGIN IMMEDIATE` transactions, full synchronous commits, SHA-256 integrity checks and a bounded page count. Storage paths are host configuration, never JavaScript arguments. The root must be user-owned, mode 0700, outside the child-readable checkout/runtime roots; final root/database symlinks and database hardlinks are rejected. The database is created mode 0600. Parent-directory aliases are resolved and confinement is checked before creating directories. Database sidecars are checked for symlinks/hardlinks, physical size is checked before opening, and the bounded payload length/envelope is checked before parsing/loading. Startup sets a five-second SQLite busy timeout before any schema query or journal-mode change. Newly created directory entries are synced before initialization is acknowledged. These protections do not defend against a malicious process running as the same OS user.

Supported snapshots are deliberately bounded: 128 KiB per encoded snapshot, up to 10,000 items; the default total logical ledger limit is 32 MiB, with a physical database ceiling allowing transaction/page overhead. There are at most 64 activities, 256 data versions and 128 registered steps per kernel. Each pending request reserves space for its maximum accepted result and terminal receipt/cancellation, so later saves cannot consume that space. Quota exhaustion fails before publication; no truncated dataset is published. JSON copying also has structural/depth/node bounds. Large existing result spools remain **epoch-scoped**, not durable. Streaming multi-gigabyte persistence is outside this first slice.

| Type | Preserved semantics |
| --- | --- |
| Source graphs | Ordered duplicate-aware evidence sequence; restored query source uses RDF set semantics |
| Quad results | RDF set, including named graphs |
| SPARQL bindings | Ordered solution bag, declared columns (including empty/all-unbound projections), duplicates and unbound-variable absence |
| JSON | Plain immutable saved value; arrays preserve order and duplicate values |

RDF encoding preserves named nodes, blank-node labels, default/named graphs, literal value/language/datatype. RDF-star terms and other result kinds are rejected. This is versioned RDF/JS term JSON, not canonical N-Quads or blank-node canonicalization. A version digest identifies exact encoded snapshot bytes including provenance, not universal RDF graph identity. Existing runtime source fingerprints are preserved as metadata, not repurposed as canonical identity.

`save(activity,ws,handle)` captures a complete supported snapshot, including provenance, lineage and fingerprints. `saveJson` captures explicit JSON. `load(activity,ref,ws)` restores a fresh epoch-bound native handle. JSON restores as retained evidence; `h.readJson(ws,handle,{path,offset,limit})` returns a detached projection capped at 16 KiB (array pages at most 128 items). A saved object does not pin the original live handle. Requests own independent immutable saved inputs; normal source release and unpublication still invalidate the original objects. Computation input references pin saved versions against removal until their activity is explicitly removed. A workspace reset/kernel loss invalidates old native handles without deleting saved versions.

Retention is independent of activity scope. `open({id,shared:[exactRefs]})` selects one activity and only explicitly named shared versions; other historical data is excluded. Shared inputs must be selected again on restart. Activity discovery reveals labels/IDs, not historical payloads. `remove(activity,ref)` removes an unpinned version owned by that activity. `removeActivity(activity)` requires no pending requests and no cross-activity input pins. Removal is explicit, never implied by reset, loading or cancellation. SQLite deletion is not secure erasure, and the database may retain allocated pages for reuse.

`nodeRepl.peek.durable(activity,{offset,limit})` and `h.map(...)` provide the same bounded advisory metadata projection: version references, saved timestamps, type/semantics, and saved-versus-loaded status. Neither stores payloads in PEEK nor restores authority. Loaded RDF and JSON handle status is checked against the current workspace; released/stale handles are shown as saved.

## Worker grants and recovery

`h.grant(activity,requestId,workspace,{ttlMs})` publishes independent copies of the selected saved inputs through the existing scientificSession bridge. Workers keep independent scratch kernels and attach with a scoped, expiring grant. They can read/query those objects and deposit one output in the request slot. The existing deposit continues to reject duplicates; it is not the durable acceptance operation. The owner reads that result and calls `accept` separately.

Acceptance/cancellation revokes request-specific grants, unpublishes bridge copies and releases their native handles. Grant allocations are tracked while in flight; terminal requests fence late allocations and revoke them before they can be returned. Cleanup is serialized per request and records partial progress, so retries do not re-release completed resources. Acceptance and cancellation report `cleanup:'pending'` while an allocation is still settling or cleanup needs a retry. The durable terminal transition remains committed; retry `h.cleanup(requestId)`. A late revocation failure remains in the ephemeral cleanup registry for repair, and grants also retain the existing service TTL. Cleanup touches only leases belonging to the selected activity. `scientificSession.revoke({capability})` is an owner operation and keeps output slots reserved to prevent duplicate deposits. Existing grants expire normally. Kernel/session loss invalidates all grants; no grant, capability token or worker authority is persisted. After kernel-only reset, surviving host dispatch intent remains an intent and no automatic dispatch occurs. After host restart, intent/reported-dispatch records become `dispatch-uncertain`.

Codex reconciles an uncertain record explicitly with `reconcile(activity,id,'child-reported',childId)` or `reconcile(activity,id,'not-dispatched')`. The latter permits a new dispatch intent only after the caller has resolved the uncertainty. Neither decision is proof of actual agent execution. Pending records never revive agents or credentials. Codex owns actual cancellation; `cancel` rejects later results and cancels unresolved descendant protocol records while preserving accepted receipts.

Default protocol limits per activity: depth 4, lifetime model-work requests 64, outstanding requests 8. `open({label,budgets:{maxDepth,maxCalls,maxPending}})` can tighten them. Depth is derived from registered parent links, not a caller depth assertion. The broker enforces context (16 KiB), result (contract maximum, at most 32 KiB), state/step outcome (64 KiB), and structural bounds. These limits govern this protocol only. Native Codex workers have no enforceable leaf-tool restriction here, and native token budgets/model behavior are not measured or enforced.

## Activation and verification

No client configuration or active session is changed by this implementation. Without a trusted host `handoffRoot`, `await h.capabilities()` reports `HANDOFF_STORAGE_UNCONFIGURED`; direct-provider recursion remains independently unavailable by default.

For an explicitly authorized new shared service, run the checked-in launcher with an absolute private durable directory **outside the checkout**:

```text
node packages/cleanroom-node-repl/src/scientific-session-server.mjs /absolute/private/session.sock --handoff-root /absolute/private/durable
```

The launcher derives the installation checkout from its source location. It namespaces durable stores by SHA-256 of the explicit session ID. Create the same session ID after a service restart, register compatible code, select the activity with `open({id,...})`, inspect `computations` as well as `pending`, explicitly load selected inputs, and reconcile uncertain dispatches. Recovery needs no externally retained computation/request IDs; `activities` provides bounded identity discovery. Do not automatically select an unrelated historical activity or execute code from saved data. Owner/worker attachment capabilities are new each time. Restarting a broker does not recreate the old scientific session. A programmatic standalone host may use `new KernelBroker({cwd,handoffRoot})`; no provider or credentials are required. Reload the MCP code only when separately authorized; do not reset a user's running scientific session as an activation shortcut.

The tests in `packages/cleanroom-node-repl/test/handoff-{store,runtime,races,launcher}.test.mjs` cover deterministic composition and data recovery, real host SIGKILL around transaction boundaries, retries/conflicts, isolation, input pins, named-graph/sequence/bag fidelity, code mismatch, cancellation, scratch-worker grant revocation and late-allocation/cleanup races. They also test four-process first-accept contention, busy startup, corrupted/oversized storage, terminal quota reservation, loss of all volatile computation IDs, declared binding columns, and the opt-in launcher across actual service restarts with separate session stores. They do not establish live Codex model quality, native scheduling integration, exactly-once external execution or a universal recursion sandbox.

## Reference comparison

The upstream [LocalREPL implementation](https://github.com/alexzhang13/rlm/blob/main/rlm/environments/local_repl.py), inspected through the project public-read mediator on 2026-09-29, exposes in-REPL model helpers, persistent context and recursive subcall callbacks; its batched helper waits for futures during execution. This adaptation keeps context selection, decomposition, nested model work and result composition, but moves model work across completed MCP evaluations. It does not claim syntax or execution equivalence. The inspected `main` URL is mutable, so this comparison describes the observed file, not a pinned upstream release.
