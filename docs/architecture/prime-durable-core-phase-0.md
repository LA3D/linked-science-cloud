# Prime durable core Phase 0 decision

- **Status:** Accepted for Stage 1 implementation
- **Date:** 2026-08-27
- **Scope:** Experimental single-host durable RLM, context, and reviewed-refinement substrate
- **Plan:** [Prime-inspired durable RLM, context, and continual-harness research plan](../../PLAN.md)

## Decision

Build the Prime-inspired foundation as a small extension of the consumer-owned clean-room package. Codex continues to own top-level goals, worktrees, delegation, and task completion. The package owns restricted root/child execution, durable session and context state, reviewed continual-harness state, and mediated capability integration.

The authorized implementation has five reviewable modules. Stage 1 begins with `durable-store.mjs`, then integrates `rlm-session.mjs` and `context-manager.mjs`. Stage 2 adds `continual-harness.mjs`. Stage 3 adds one narrow `linked-science-artifact-codec.mjs`. No daemon, lease/adoption protocol, branch graph, mailbox, scheduler, automatic promotion, or user-global state is authorized.

## Root and writer boundary

The trusted caller supplies an absolute durable root. It must be outside the worker cwd, worker-readable roots, registered module roots, evaluator-private roots, and the repository checkout. Children receive stable IDs only; no child API accepts a path.

One host is the only writer for an open session. Stage 1 uses a create-exclusive session writer marker. Clean close removes it. An orphaned marker fails closed and requires an explicit operator recovery after confirming that the former host is gone; there is no expiry, renewal, takeover, or automatic adoption.

The on-disk layout is:

```text
<durable-root>/
  sessions/<session-id>/manifest.json
  sessions/<session-id>/events.jsonl
  sessions/<session-id>/head.json
  sessions/<session-id>/writer.json
  artifacts/sha256/<first-two-hex>/<digest>
  artifacts/manifests/<artifact-id>.json
  harness/project/manifest.json
```

Temporary files stay beneath the same confined durable root. Published artifacts are content-addressed and never overwritten.

## Commit and recovery protocol

Every mutation uses a host-minted command ID and caller-scoped idempotency key:

1. Validate the actor, session, expected head, request digest, quotas, and policy.
2. Write and verify immutable bytes in a confined temporary file.
3. Publish the artifact with no-overwrite atomic rename and flush its directory.
4. Append and flush one event containing every authoritative descriptor or reference.
5. Atomically replace and flush `head.json`.
6. Return success only after the head is durable.

An artifact lacking a committed event is an unreferenced orphan. A committed event may not reference missing or unverified bytes. Recovery accepts only the event prefix anchored by `head.json`; an unanchored tail is ignored and reported. External or provider work with an unknown outcome commits an `*.uncertain` event and is never automatically retried.

Recovery reports event, descriptor, and payload recovery separately. A digest, summary, orientation entry, or stale handle never substitutes for unavailable payload bytes.

## Canonical encoding and identity

Digest inputs use UTF-8 JSON with these rules:

- object keys are sorted by Unicode code-point order at every depth;
- arrays retain order;
- strings, booleans, null, and finite JSON numbers use ECMAScript `JSON.stringify` encoding;
- duplicate keys, sparse arrays, non-finite numbers, `undefined`, functions, symbols, and non-JSON values are rejected before hashing; and
- no insignificant whitespace or trailing newline is included.

Digests are lowercase hexadecimal SHA-256. Event digests cover the complete canonical event with `eventDigest` omitted. Artifact digests cover the exact published bytes. The frozen vectors live in `packages/cleanroom-node-repl/test/fixtures/prime-core/contracts.json`.

## Experimental quotas

These are Stage 1 ceilings, not production sizing claims. A caller may select lower values.

| Resource | Ceiling |
| --- | ---: |
| Events per session | 10,000 |
| Public event payload | 32 KiB |
| Artifacts per session | 512 |
| One artifact | 16 MiB |
| All committed artifact bytes per session | 128 MiB |
| Context objects per session | 128 |
| Projections per session | 2,000 |
| One rendered projection | 64 KiB |
| Estimated tokens in one child projection | 16,384 |
| Child depth | 1 |
| Active children per root | 1 |
| Total children per Stage 1 session | 1 |
| Child wall time | 60 seconds |
| Child output | 64 KiB |
| Child provider calls | 4 |

Admission checks occur before provider work whenever the needed bound is knowable. Observed provider accounting remains distinct from estimates.

## Baseline characterization

The consolidated Phase 0 broker test pins the existing three-tool MCP surface, cross-call bindings, reset loss, PEEK survival, default recursion failure, configured depth-one recursion, traversal-owner invalidation, timeout replacement, and epoch advance. Existing package tests remain the detailed evidence for child globals, raw-network denial, module resolution, request bounds, error envelopes, and Linked Science bootstrap. Phase 0 adds no alternate broker or transport.

## Focused Prime core matrix

| Prime-style mechanism | Phase 0 evidence or frozen contract | Authorized implementation stage |
| --- | --- | --- |
| L0 base policy and capability profile | Immutable manifest inputs and digests | Stage 1 |
| L1 bounded invocation context | Exact projection selectors, renderer/policy versions, bytes, digest, and token estimate | Stage 1 |
| L2 resident REPL state | Existing persistent bindings plus epoch-local handle rules | Stage 1 |
| L3 durable state | Append-only events, immutable artifacts, anchored head, and typed schemas | Stage 1 |
| Persistent root REPL | Existing broker baseline; durable identity and reopen contract frozen | Stage 1 |
| Asynchronous child handle | One depth-one child, stable ID before completion, terminal retrieval after restart | Stage 1 |
| Independent child state | Separate restricted kernel, history, context, authority, and budgets | Stage 1 |
| Context projection and compaction | Deterministic projection and source-preserving compaction contract | Stage 1 |
| Exact history and recovery | Verified committed prefix plus separate event/descriptor/payload claims | Stage 1 |
| Four harness kinds | Prompt, memory, skill, and worker-spec fixtures; latter two non-executable | Stage 2 |
| Refinement | Evidence-backed proposal with trusted apply/reject | Stage 2 |
| Prompt assembly | Pinned, ordered, bounded future projections | Stage 2 |
| Rollback | Atomic pin to a prior verified manifest without history rewrite | Stage 2 |

Prime product mechanisms outside this matrix are future options rather than missing core coverage.

## Epoch and child semantics

A kernel start or replacement creates a monotonically increasing epoch. Kernel loss makes all epoch-local native handles stale. Reopen never claims to resume an in-flight invocation. Verified artifact materialization creates a fresh identity in the new epoch and records its source descriptor.

Stage 1 permits exactly one depth-one asynchronous child. It has an independent restricted kernel, bindings, history, and context projection. It inherits no broader authority or budget than the root. The root receives a stable child ID before completion and may retrieve a committed terminal result after root-kernel or host restart. No shared mutable heap, grandchildren, sibling messages, or general worker specification is included.

## Context and compaction ownership

The host owns context descriptors and projections. A projection records exact ordered selectors, renderer and policy versions, rendered digest, byte count, token estimate, and omissions. Package-created child compaction may summarize a verified source range, but it never deletes or replaces source events and advances its pointer only after the summary and projection are committed.

L2-to-L3 serialization is explicit, typed, bounded, and receipted. L3-to-L2 materialization verifies the artifact and creates a fresh epoch-local handle. Release changes residency state; it does not erase provenance or committed bytes.

## Minimal schemas and transition model

Phase 0 freezes only these schema names: `session-manifest@1`, `session-event@1`, `artifact-manifest@1`, `context-object@1`, `context-projection@1`, `harness-entry@1`, and `refinement-receipt@1`. Hand-authored field fixtures and the Stage 1/2 reference transition model live beside the package tests. They are implementation inputs, not claims that a runtime validator already exists.

Each fixture maps every required field to a named Stage 1 or Stage 2 test observation. The Phase 0 suite checks that the mapping is exhaustive, so unused fields cannot enter implementation unnoticed.

Unknown schema versions, event kinds, or transitions fail closed. Historical events are never rewritten by migration.

## Refinement authority

Stage 2 may record all four Prime-style kinds: prompt, memory, skill, and worker specification. Only reviewed prompt and memory versions may enter future projections. Skill and worker-spec content remains non-executable. A model may propose a change but cannot apply, reject, or roll it back. A trusted operator action pins a new manifest atomically; rollback pins a prior verified manifest without rewriting history.

Base policy, capability ceilings, evaluator boundaries, and worker-readable roots are immutable refinement inputs.

## Evaluation boundary

The frozen local methodology is [Prime durable core evaluation](../experiments/prime-durable-core-evaluation.md). Public fixtures and rubrics are under `test/fixtures/prime-durable-core/public/`. Expected answers and honeytokens are under the evaluator-private `test/fixtures/prime-durable-core/private/` path, which is excluded from worker exports and must never enter runtime events, contexts, artifacts, harness entries, or projections.

No Phase 0 activity authorizes live traversal, exports, dependency changes, automatic refinement, or Stage 1 implementation.
