# Large scientific resources and durable artifacts

`workspace.resources.get(url, {storage: 'disk'})` retains complete bytes in private broker storage. Memory remains the compatibility default for small resources. Both use the same private anonymous Fetch mediator, identity stripping, exchange hashes and provenance. No raw transport or general filesystem-write capability is added to the kernel. Acquisition does not interpret the scientific format.

```js
var transfer = ws.resources.start(url, { maxBytes: 8 * 1024 ** 3, timeoutMs: 3600000 });
// The transfer continues after this evaluation. Later calls can inspect or cancel it:
nodeRepl.write(await transfer.status());
// await transfer.cancel(); // aborts transport and removes partial storage
var resource = await transfer.done; // await once completion is near/observed
var header = await resource.read({offset: 0, length: 128});
var count = 0;
for await (var chunk of resource.chunks({chunkBytes: 65536})) count += chunk.length;
nodeRepl.write({count, metadata: await resource.inspect()});
```

Three budgets remain separate:

- **Acquisition and storage:** disk mode defaults to half currently available filesystem bytes after a 256 MiB reserve and an optional host-configured shared quota. An explicit safe integer `maxBytes` can use up to currently available capacity. Actual free space and quota are checked while writing. GET streams directly to private storage; no HEAD assumption or base64 whole-body IPC. Default deadline is one hour, configurable up to one day. Optional `budgets` can tighten ordinary mediator limits. Other mediator request/fan-out controls remain active; disk acquisitions are one GET per session.
- **Computational working memory:** `read` and async `chunks` return at most 1 MiB per operation. Callers can perform incremental analysis and random access. `text`, `json`, `arrayBuffer` and RDF parsing require whole-body memory admission under the kernel's existing resident quota and heap headroom. Retaining a large object does not promise that a whole-object parser or arbitrary algorithm fits memory.
- **Model output:** resource inspection and ordinary tool output keep their existing bounded projections. A disk handle is neither a display nor an exported file.

A successful handle is published only after stream completion, checksum finalization, file synchronization and atomic rename. Failed, cancelled, timed-out and over-limit transfers remove partial storage. Progress includes received bytes, optional Content-Length, elapsed time and effective ceiling. Content-Length is advisory; decoded bytes are enforced even when the header is absent or misleading. Capacity is a snapshot rather than a promise against unrelated disk users. No retries or resumption occur automatically.

## Explicit durable handoff

After user authorization for export:

```js
var artifact = await resource.materialize({name: 'trajectory.xtc', authorized: true});
nodeRepl.write(artifact); // exact local path, receiptPath, bytes and SHA-256
await ws.release(resource); // artifact remains
```

The broker writes a fresh unique directory under the configured project's `artifacts/resources/`, with the requested plain filename and `receipt.json`. It never accepts a caller-selected directory or overwrites a prior artifact. A temporary directory holds the copy and receipt until checksum verification and publication. The artifact's receipt retains the requested/final URLs, media type, exchange and acquisition receipt. Artifact lifetime is independent of handle release, workspace disposal, kernel reset and process exit. Subsequent user deletion or external modification is outside this guarantee; the checksum permits verification. Export is an explicit operation with separately required user authority, not an automatic side effect of acquisition.

Disk handles retain private IDs, not filesystem paths. Release/disposal/reset reclaim ephemeral storage. Exports currently require disk acquisition; memory resources do not silently re-fetch or cross into export. Each call produces an independent artifact directory; multi-file bundles are not yet a native operation. External programs consume the artifact paths. They do not acquire authority to access live REPL handles.

## Boundaries and verification

Synthetic tests cover transfers larger than the old 2 MB cap, anonymous mediation, unknown-length overflow, capacity admission, stalled-body cancellation, checksums, bounded reads, ownership, non-overwrite, release and reset through the actual MCP child. The separate `node scripts/check-large-resource-storage.mjs 1073741824` offline fixture streamed 1 GiB with approximately 14 MB RSS growth on the recorded machine. This does not establish multi-gigabyte public-server throughput, every format decoder, or power-loss recovery. Incremental binary inspection is available; a streaming RDF parser and durable artifact reattachment are not implemented by this change.

Broker source changes require a broker restart. Resetting only the JavaScript kernel cannot load a changed parent. A fresh locally launched integration broker establishes the new implementation separately from an already-mounted Desktop MCP.
