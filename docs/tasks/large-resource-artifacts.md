# Large scientific resources and durable artifact handoff

## Scope and implementation

Authorized local checkout: `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`. Started at `45bc6a1bfc79efb2ca4d132849edc8804db7abc6`, on task branch `codex/large-resource-artifacts`. Existing wiki-learning work and `.codex/config.toml` modifications were present before this task and remain outside its changes. No remote project, package installation, global configuration or push is involved.

[Storage architecture and usage](../architecture/large-resource-storage.md) describes disk-backed acquisition through the private mediator, independent capacity/working-memory/output budgets, progress and cancellation, bounded random access and async chunk iteration, checksums and explicitly authorized durable artifacts. Memory resources retain their existing small-resource path. Large RDF whole-body parsing remains memory-admitted; disk byte capacity does not imply arbitrary algorithms or RDF parsers can run out of core.

## Acceptance evidence

The requested MDposit default PDB/XTC pair for MD-A007YH was acquired through a freshly started local `KernelBroker`. This is distinct from the already-mounted Desktop MCP parent, which has not been restarted. Only project metadata and the two default file endpoints were read. No trajectory ensemble was downloaded.

- [Machine receipt](../../artifacts/large-resources/mdposit-20260923/2026-09-23T18-52-46-638Z/receipt.json): PDB 173,213 bytes; XTC 3,683,576 bytes.
- PDB SHA-256 `00a81322dcb7be6c5392c1f2f5091f0ce82d8b78af837680c8f4484e955b619d` matches the earlier acquisition supplied by the coordinator.
- XTC SHA-256 `07958cbbf451be8a2084618d97fe12bf1bf19929c24529afe4acb09b2bd053f6`.
- Bounded REPL reads verified 2,138 PDB atoms, 141 residues, 450 XTC frame headers, matching atom counts in every frame, and exact end-of-file framing. A full scan used 57 chunks, each at most 65,536 bytes. Header indexing read 41,400 bytes. Compressed coordinate values and atom ordering were not independently decoded.
- [Durability observation](../../artifacts/large-resources/mdposit-20260923/2026-09-23T18-52-46-638Z/durability.json): both exported files remained after workspace disposal and kernel reset.
- [Offline scale fixture](../../artifacts/large-resources/scale-1gib.json): 1 GiB streamed to private storage with approximately 14 MB RSS growth; verified checksum, last-byte access and cleanup. This was synthetic transport, not a public-server throughput test.

Viewer-ready companion paths:

```text
/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud/artifacts/resources/resource-xkBzKW/content/structure.pdb
/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud/artifacts/resources/resource-xkBzKW/content/trajectory.xtc
```

The initial XTC artifact remains at `artifacts/resources/resource-feZXBI/content/trajectory.xtc`. The coordinator explicitly authorized a checksum-verified, no-overwrite companion copy beside the opened PDB. Its separate `trajectory.xtc.receipt.json` preserves the source provenance; the PDB and its receipt are unchanged.

The originating task reports that the PDB rendered, but companion loading fails even in the same directory: `structure.browse_related_data` reports that workspace roots were not bound to the viewer session. This is coordinator-reported evidence, not a viewer tool run by this task. End-to-end playback remains blocked by that separate viewer-host capability issue. No viewer permission or code was changed. Same-directory placement alone did not repair the failure.

## Verification and residual work

Seven new broker/MCP tests cover large transfers, bounded reads, whole-body memory rejection, identity stripping, ownership, capacity, tighter caller budgets, cancellation, deadlines, disposal/reset during active transfers, checksum-verified non-overwriting exports, and artifact lifetime.

Implementation commit: `7d42b34`. [Verification record](../../artifacts/large-resources/verification/summary.json): final `npm test` reports 299 passed / 2 failed (301 total); smoke, offline identity/runtime verification, seven focused tests, relative Markdown links and diff whitespace checks pass. The new registry entry and its paths validate, but the repository-wide result validator encounters the unrelated dossier noted below. Full repository testing has two pre-existing failures: a bootstrap test hardcodes the old `codex-repl` configuration path while this checkout's existing configuration points here; and the unrelated untracked `docs/experiments/scientific-trajectory-evidence.md` lacks a registry status. Those unrelated files are preserved.

Next actions outside this implementation: restart the Desktop project broker to expose these APIs in an existing task; resolve the viewer's workspace-root binding before retrying playback. Multi-file artifact bundles, resumable acquisition, streaming large RDF parsing and hard broker-process-crash scavenging remain unimplemented. A forced broker termination can leave its private temporary directory until host temporary-file cleanup; ordinary cancellation, kernel reset and disposal are covered. No automatic durable-handle reattachment is claimed.
