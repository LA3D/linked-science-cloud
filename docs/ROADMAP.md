# Linked Data REPL roadmap

This is a living experimental backlog. Status means project-local evidence only; it is not a production commitment or approval for future live access.

## Implemented foundations

| Slice | Hypothesis | Acceptance evidence | Status |
| --- | --- | --- | --- |
| Persistent synthetic session | A worker can retain materialized local bindings behind symbolic handles across REPL calls. | Offline tests plus a persistent-REPL demonstration of materialize, profile, page, derive, and reset recognition. | Implemented and validated. |
| Guarded Identifiers.org live table | A pinned, read-only profile can materialize a small registry table through Communica with provenance. | Guard tests; approved endpoint demonstrations with exact endpoint, timeout, redirect, retry, query-type, and row-cap evidence. | Implemented for the named 20-row demonstration profile. |
| Presentation handoff | A coordinator can receive a display-safe bounded view without raw result material. | Offline display-model tests and persistent-REPL proof from a retained live handle. | Implemented for typed tables only. |

## Next experimental slices

| Slice | Hypothesis | Acceptance evidence | Status |
| --- | --- | --- | --- |
| Blind clean-worker map evaluation | A fresh worker can use repository-local map/session guidance rather than prior conversation or raw rows. | Fresh-task trace proves map-first orientation, bounded handle reuse/derivation/display, provenance/budget reporting, and no external access. | Planned — no evaluation worker has run. See [protocol](experiments/clean-worker-map-evaluation.md). |
| Streamed large-result export | A retained handle can stream to a controlled local artifact without entering coordinator context. Start with a synthetic 10,000-row result; any live trial needs separate approval. | Deterministic synthetic 10k test; artifact path/format/schema/count/hash/provenance/lineage receipt; no-overwrite behavior; bounded reopening check. | Planned — no exporter or generated dataset exists. See [protocol](experiments/large-result-export.md). |
| Artifact re-open and derived analysis | An exported artifact can be reopened as a distinct local source and yield bounded derived handles without treating it as the original resident result. | Deterministic reopen, schema/hash verification, lineage link, bounded page/aggregate tests. | Planned. |
| Reset and rematerialization | A reset can be recognized honestly and a handle rematerialized only through its authorized source path. | Tests for invalidation, missing-handle reporting, explicit rematerialization receipt, and refusal when authorization/source is absent. | Planned. |
| Richer bounded presentation | Tables can gain additional typed bounded views, while future charts never consume whole results. | Scalar/budget/provenance tests per kind and persistent-REPL proof using a derived handle or explicit page. | Planned — charts are not implemented. |
| Additional endpoint profiles and federation | Explicit profiles can grow only after independent policy and transport evidence; federation must not weaken pinning or read-only controls. | Profile-specific tests, approval packet, provenance, and refusal of cross-endpoint delegation by default. | Deferred — no additional endpoints or federation are authorized. |

## Operating boundary

An in-memory handle, a bounded display model, and a future local export are different capabilities. Context maps retain only compact metadata. Any write, export, live trial, new endpoint, or federation work requires its own explicit authorization.
