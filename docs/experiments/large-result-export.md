# Large-result export experiment protocol

## Question

Can a persistent worker stream a retained large result to a controlled local dataset artifact while keeping raw rows out of coordinator context?

## Status and scope

**Planned only.** No exporter is implemented, no synthetic 10,000-row dataset has been created, and no live query or artifact write has been run under this protocol.

The first implementation slice is local synthetic data only. A live export trial would require a separate user approval, a named endpoint profile, and the existing guarded transport; it is not authorized by this document.

## Hypothesis and protocol

1. Materialize a synthetic 10,000-row result behind a resident handle without printing it.
2. With explicit export authorization, stream that handle into a controlled project artifact area using a non-overwriting target.
3. Emit a compact receipt/map entry containing artifact path and format, schema, row count, content hash, source provenance, and lineage.
4. Reopen the artifact only as a distinct local source; any page, aggregate, or display remains bounded and identifies the artifact and source-handle lineage.

## Acceptance evidence

- Deterministic tests prove streaming/bounded memory behavior, no overwrite by default, and a stable receipt.
- The receipt hash and row count verify an explicit artifact without placing its rows in coordinator context.
- Reopen/derived analysis validates schema and hash before exposing a bounded handle page.
- A reset marks resident handles unavailable; it must not imply that an artifact or source can be used without explicit authorization.

## Limits

The artifact is not an in-memory handle, a display model, or an authorization to query/export again. Export location, retention, access control, and format are future design choices. Provider dereferencing, REST access, federation, and endpoint expansion are outside this protocol.
