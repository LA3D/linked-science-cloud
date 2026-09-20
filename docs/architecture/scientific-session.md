# Shared scientific sessions

The registered MCP entrypoint now creates a session-capable adapter. Before explicit attachment it behaves as an independent scratch REPL. An independently running local session service owns the scientific kernel, native RDF/JS objects and retained query results. MCP disconnect closes a client and its scratch kernel; it does not close the scientific session.

Codex still owns model calls, worker dispatch and continuation. This implementation supplies the scoped data/result bridge, not automatic recursive model execution or a second agent scheduler.

## Ownership and lifetime

An owner creates a session and receives an owner capability. A worker attaches using an expiring grant for selected published objects, operations and an output slot. Owner code runs in the canonical kernel. Worker code runs in its own scratch kernel; fixed data operations run against the owner's objects through the service. Ordinary JavaScript globals are deliberately not shared with workers.

The service serializes operations per scientific session. Owner reset invalidates grants and native objects. Source release/unpublish invalidates later scoped access and deposits depending on that source. A worker timeout before dispatch preserves the owner session; a timeout during shared-kernel work closes it because evaluation cannot safely be cancelled independently. Client detach preserves state; idle cleanup (five minutes by default), service shutdown, kernel failure and execution timeout can end it. This is process persistence, not disk recovery. Reconnecting requires retaining the session identity and capability; a repository path is not session identity.

Capabilities enforce the bridge protocol between cooperative agents. This is a same-user local service, not isolation from arbitrary code running with the user's filesystem/process authority. Socket directories must be owned by that user with mode 0700; sockets have mode 0600. Do not put owner capabilities in worker prompts or checked-in receipts.

## Native objects and bounded transport

Owner code publishes a native workspace handle through `nodeRepl.scientificSession.publish(workspace, handle)`. A published reference is an identifier for that retained object, not a serialized graph. `source(reference.object).match()` returns native RDF/JS quads to worker code, and `bindings(reference.object)` returns native Maps of RDF terms. Language, datatype, blank nodes and graph terms survive the bridge. Only bounded operation responses cross the socket; there is no implicit printing of full data to the parent model.

Remote `query(object, sparql)` accepts local queries over the granted source. Dataset clauses and SERVICE are rejected. Derived results are retained and added to that grant; their source lifetime remains a dependency. Grants may separately allow describe, match, bindings, query, JSON reads, deposit and result. Deposits are bounded JSON objects/arrays, copied into one result slot and rejected on replay. Slots remain exclusively reserved for the session epoch, including after grant expiry. A grant retains at most 1,024 object references including derived results. The owner reads `result(slot)` and explicitly continues its computation.

Paging currently repeats a stream scan up to the requested offset. It supports complete iteration without display-page truncation, but is not a scalable cursor store. Concurrent mutation between pages does not provide snapshot isolation. Page limit is 128 items, individual result/deposit limit 128 KiB, wire frame limit 512 KiB; exceeding a bound is an error, never evidence of complete results. Large values, richer result schemas, cursor efficiency and further object adapters remain future work.

## Activation after saving changes

Keep the service in a separate terminal/process if it must survive a desktop restart. Start it with a new private socket directory:

```sh
node packages/cleanroom-node-repl/src/scientific-session-server.mjs /private/tmp/linked-science-session/session.sock
```

The launcher prints readiness and the canonical socket path. It will not replace an existing socket. The project MCP registration stays at its existing entrypoint; a freshly loaded entrypoint selects the adapter. Restart the desktop after saving this implementation, then perform the project [runtime discovery](../agent/runtime-discovery.md). Shell tests alone do not prove the mounted MCP changed.

In a fresh owner REPL, create and retain the returned connection information:

```js
var connection = await nodeRepl.scientificSession.create({
  socketPath: '/private/tmp/linked-science-session/session.sock'
});
nodeRepl.write(connection);
```

Creation happens in the scratch kernel; **subsequent calls** run in the scientific kernel. Load/publish scientific objects there, then create grants. A fresh worker calls `attach({socketPath, sessionId, capability})` with its worker grant. Keep a separate protected copy of the owner connection information if owner reconnection is needed. Do not recreate a session and assume old variables will return.

The external client API supports owner `closeSession()`; closing an MCP connection only detaches. Owner and worker scratch resets have different scope. A worker cannot request a shared reset or execute arbitrary code in the owner's kernel through this protocol.

## Verification boundary

Automated synthetic integration tests exercise independent MCP adapters, native graph reads, local SELECT bindings, structured deposit, owner aggregation, disconnect/reconnect and grant/reset restrictions. Service tests cover lifecycle and wire bounds. The [topology experiment](../experiments/scoped-data-bridge.md) records the earlier live worker observations separately. A subsequent [live activation receipt](../../artifacts/scoped-data-bridge/live-20260909-session-activation-01/receipt.json) records a fresh Codex worker reading a granted graph and depositing a finding after desktop restart. That activation probe alone does not establish semantic model quality; see the later E4 result below.

## JSON inputs

`publishJson(workspace, value)` registers an immutable JSON snapshot owned by the workspace/session and returns a fresh object reference with version 1. Republish a changed value under a new reference; unpublish the old one to invalidate it. This is an explicit JSON copy, not a live reference to a mutable JavaScript object. Workspace disposal and kernel reset invalidate reads; unpublish also blocks deposits that depend on that input.

`readJson(object, {path, version:1, offset?, limit?})` reads only own properties and optionally slices a selected array. Path components are strings or nonnegative array indices. A grant can restrict JSON paths with `jsonPaths: {[object]: [['allowed', 'branch']]}`; each listed path permits that subtree. Without `jsonPaths`, the object grant permits the entire JSON object. Use `operations:['jsonRead']` for reads, adding deposit only when required. Read results are detached copies, and missing paths or oversized reads fail explicitly.

Publication rejects cycles, accessors, functions, undefined, non-finite numbers, class instances, sparse arrays and excessive nesting. Limits are 2 MiB per published JSON value, 8 MiB total JSON snapshot payload and 128 JSON objects per kernel; copying also stops at 65,536 visited nodes and applies a conservative incremental byte bound, including repeated shared references; read responses retain the 128 KiB cap, and array slices are at most 128 items. Unpublish releases registry capacity even after workspace disposal. Those are payload bounds, not measurements of total JavaScript memory. Session lifetime remains unchanged.

## Explicit native RDF broker storage

`await workspace.rdf.retain({name, dataset, storage:'broker'})` streams the input into the broker quad store and returns a `quads` result handle. The default remains resident storage and returns a graph handle. Broker retention preserves named graphs and RDF set semantics, requires broker storage availability, and never silently falls back to resident storage. Requested ontology/instance kind is recorded in provenance; graph-kind-only operations and whole-dataset cloning are not available on the returned result handle. Use native `rdf.source`, local queries and bounded result views. Release and workspace disposal reclaim its broker storage.

The [adapter-completion E2 receipt](../../artifacts/scoped-data-bridge/e2-20260909-adapters-fixed-03/receipt.json) records 48 passing checks across two repetitions in each graph/bindings storage tier, plus JSON inputs. This supersedes the earlier coverage gaps without altering those historical results. The subsequent [E3 scope/lifetime receipt](../../artifacts/scoped-data-bridge/e3-20260909-scope-lifetime-02/receipt.json) records 74 passing checks under the supported protocol. The [E4 comparison](../../artifacts/scoped-data-bridge/e4-20260909-semantic/summary.json) records three correct scoped semantic round trips on twelve synthetic items, matching the direct-input baseline. General quality, strict no-relay auditing and total costs are not established. E5 scale remains unrun.


## Scoped deterministic reasoning

Runtime 6.5.0 adds `nodeRepl.scientificSession.reason(object, {rules, graphPolicy:'default-graph-only', proof?, limits?})`. Grants must explicitly include `reason`; the worker receives `{derived, proof, report}` with published references, never native owner handles. `query`, `bindings`, `explain` and `deposit` remain separately granted operations. `explain(derived.object, {maxBytes?})` returns bounded unverified raw N3 proof text. No worker code is evaluated in the owner's kernel.

Derived/proof publications count against grant capacity and depend on the source publication. Deposits capture their granted-object dependencies; later source release or unpublication invalidates result reads as well as new deposits. Worker disconnection preserves session-owned outputs. The owner can read its result slot and query the deposited derived reference. Tests include a pinned real-engine two-step subclass inference across independent adapters; this is protocol validation, not a model-quality comparison. See [deterministic reasoning](deterministic-reasoning.md) for supported semantics, bounds, installation and remaining explanation limits.
