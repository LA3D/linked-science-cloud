# Prime-inspired durable Linked Science harness research plan

**Status:** Proposed implementation plan; no runtime phase is authorized by this document.

**Canonical repository:** `LA3D/linked-science-cloud`

**Owning package:** `packages/cleanroom-node-repl`

**Baseline:** local `main` at `3a440b5` (`Simplify Linked Science persistent harness`), inspected 2026-08-27

**Primary references:** [Prime Agent paper](https://arxiv.org/abs/2608.23552), [Prime Agent repository](https://github.com/PrimeIntellect-ai/prime-agent), and its [persistent harness-state implementation](https://github.com/PrimeIntellect-ai/prime-agent/blob/main/prime-agent-runtime/src/rlm/harness.py)

## 1. Objective and thesis

Evolve `packages/cleanroom-node-repl` from one persistent-but-ephemeral clean-room JavaScript kernel into a durable, recoverable, recursively orchestrated research harness inspired by Prime Agent, while preserving and strengthening Linked Science's semantic-web neuro-symbolic architecture and trust boundaries.

The thesis is that the two systems are complementary at different layers:

- Prime Agent supplies useful session, continuation, recursive-work, recovery, accounting, and refinement patterns.
- Linked Science supplies a deliberately narrower and more epistemically structured scientific action space: source-owned RDF evidence, ontology-driven discovery, declarative SPARQL reasoning, programmatic CodeAct, resident native RDF/JS handles, and a parent-mediated least-privilege traversal boundary.

The intended result is not a port of Prime Agent. It is a durable substrate under the existing Linked Science runtime. Sessions and event history should make evidence-bearing scientific work recoverable and inspectable; they must not flatten ontologies into prompt notes, turn query templates into memorized strategies, give workers raw network or filesystem authority, or let self-refinement widen capabilities.

## 2. Scope, non-goals, and ownership

### In scope

- Host-owned durable session identity, append-only event history, bounded context serialization, artifact metadata, checkpoints, recovery, detach/reattach, and supervision.
- Durable recursive child sessions, asynchronous handles, direct typed messaging, lifecycle control, and root-plus-descendant accounting.
- Persistent goals, scheduled or heartbeat continuation, autonomous bounds, and independently evaluated completion gates.
- Typed, versioned supplemental prompts, memories, skill proposals, and worker specifications with quarantine, evidence-linked refinement, promotion, rollback, and immutable policy ceilings.
- Integration of those facilities with `lib/linked-science-runtime.mjs`, broker PEEK, resident RDF/JS handles, mediated traversal receipts, evaluator-private scoring, and existing experiment-result governance.
- Offline characterization, crash/restart, adversarial, contamination, and neuro-symbolic evaluation needed to support each phase.

### Non-goals

- Replacing Codex's user/task interface or creating a second user-facing workflow product. The package may own durable execution state for a delegated session; Codex remains the external task authority when it is the caller.
- Replacing Communica, N3, RDF/JS, RDF, SPARQL, SHACL, or source-owned vocabularies with an agent-memory abstraction.
- Encoding endpoint-specific query templates, ontology interpretations, standard-location search orders, or scientific planners in generic harness code.
- Adding raw Fetch, arbitrary sockets, ambient child filesystem writes, authenticated/private authority, SPARQL Update, mutation, or unrestricted federation.
- Treating PEEK orientation, an event record, a handle name, a bounded display, and a durable artifact as interchangeable.
- Making live endpoint success part of default tests. Every live traversal remains separately approved for scientific scope and effective budgets.
- Implementing runtime code in the PLAN-writing task.

### Repository and worktree policy

`LA3D/linked-science-cloud` is the sole canonical implementation repository. Production code, schemas, migrations, tests, release history, and planning for this harness live here. `packages/cleanroom-node-repl` owns the host, child-kernel, durability, supervision, orchestration, and capability-broker implementation. The root `lib/` Linked Science facade remains the semantic consumer/integration layer until an explicit phase decides otherwise.

The sibling `node-repl-network-probe` is not an implementation source, dependency, copy source, fallback runtime, or release authority. It may be used only for a separately authorized isolated spike or exact capture reproduction. Any finding worth adopting must be re-specified, independently implemented, tested, and committed here. `scripts/validate-repository-boundaries.mjs` and `test/repository-boundary.test.mjs` must continue to reject production references to that sibling.

Each implementation slice starts from current clean local `main` in a Codex worktree or named `codex/<slice>` branch, follows `docs/agent/git-handoff.md`, preserves unrelated work, records a focused commit, and does not push without separate authorization. Roadmap entries and this plan describe work; neither authorizes live access, exports, configuration changes, dependency installation, or future phases.

## 3. Current baseline

The current code is a strong Phase 0 substrate, not yet a durable harness:

| Surface | Implemented evidence | Missing durable-harness behavior |
| --- | --- | --- |
| MCP and kernel | `packages/cleanroom-node-repl/src/cleanroom-mcp.mjs` exposes exactly `js`, `js_reset`, and `js_add_node_module_dir`. `KernelBroker` serializes calls, starts one restricted child, replaces it on timeout/reset, increments an epoch, and aborts token/epoch-owned traversals. | Durable session IDs, daemon ownership, attach/detach, saved event history, recovery plans, multi-session supervision, and explicit lifecycle state. |
| Child action space | `packages/cleanroom-node-repl/src/repl-kernel-child.mjs` provides top-level-await JavaScript, persistent bindings, bounded text/images, `nodeRepl.rlm`, and `nodeRepl.peek`; raw `process`, Fetch globals, and network module imports are denied. | Versioned session/context/child/message/goal APIs and replay-safe correlation with durable events. |
| Recursive work | `KernelBroker._recursiveQuery()` optionally calls one configured provider with depth, output, and timeout bounds. Default CodeAct mode honestly reports recursion unavailable. | A child is not a durable session, asynchronous handle, independently recoverable worker, message target, or accounting descendant. |
| Broker state | `packages/cleanroom-node-repl/src/peek-runtime.mjs` owns bounded in-memory orientation maps and optional root-confined checkpoint/restore. PEEK survives kernel replacement because the broker object survives. | Automatic durable checkpoints, append-only versions, crash recovery, provenance-linked restoration, and separation of checkpoint state from authoritative event history. |
| Live authority | `packages/cleanroom-node-repl/src/mediated-traversal.mjs` protocol 3.2.0 provides anonymous read-only HTTP/HTTPS mediation, token/epoch ownership, cumulative request/fan-out/time/byte/item bounds, cancellation, navigation evidence, and aggregate/per-exchange receipts with zero hidden retries. | Goal/session/descendant attribution and durable accounting across kernel or host restart. Authority semantics themselves should remain stable. |
| Linked Science semantics | `lib/linked-science-runtime.mjs` 4.0.0 retains ontology/schema/SHACL/instance/evidence/results behind epoch-bound native handles; supports local Communica queries, mediated `traversal.query`, generic JavaScript derivation, bounded views, attempt history, provenance, fingerprints, lineage, and PEEK references. | Artifact-backed rehydration, durable handle descriptors, cross-session provenance, and session-level event linkage. Native in-memory objects cannot be reconstructed from a handle token alone. |
| Bootstrap and discovery | `lib/cleanroom-linked-science-bootstrap.mjs` validates project/module roots, registers generated runtime documentation in RLM context, detects only the private traversal seam, and installs stable `linkedScience`/`ls` bindings. | Durable-session discovery metadata, resume mode, harness-schema versions, and explicit compatibility negotiation. |
| Evaluation boundary | The clean-room broker can attest non-overlapping worker/evaluator roots; the UniProt methodology and public/private manifests separate worker context from hidden references and scoring. | Evaluator-private gates as independently executed durable records that never enter worker context. |
| Durable records | Git, task briefs, `artifacts/experiment-results/registry.json`, and compact experiment receipts are durable. `docs/tasks/durable-dataset-persistence.md` and `docs/tasks/wiki-memory-continual-learning.md` specify deferred needs. | A general session/event/artifact store. Current receipts are not a replayable session log, and current task briefs are not runtime state. |

Important compatibility facts:

1. The public MCP surface is intentionally three tools. Early phases must preserve it and place new facilities behind the host/child session API. Any future MCP expansion requires a separate decision and evaluation.
2. `js_reset` currently means destructive kernel replacement: variables, RLM context, workspaces, and handles disappear; module roots and broker PEEK survive. New durability must not make old handles appear resident.
3. `workspace.traversal.history()` retains at most 100 compact attempts in one workspace. It is scientific-attempt evidence, not a complete host event log.
4. `KernelBroker` is currently both MCP request broker and lifecycle owner. The first architectural extraction should preserve behavior before adding features.
5. Current checkpoint support is opt-in and PEEK-specific. It demonstrates host-owned confined writes but does not establish a general artifact format or rollback model.

## 4. Prime Agent adoption matrix

Prime Agent frames model weights as L0, active invocation context as L1, persistent computation and recursive sessions as L2, and disk-backed histories/memories/skills as L3. It also demonstrates daemon continuity, direct agent messaging, persistent goals, heartbeats/schedules, bounded autonomy and completion gates, descendant-inclusive accounting, and evidence-backed harness refinement. Linked Science adopts the substrate selectively.

| Prime-style mechanism | Decision | Linked Science treatment |
| --- | --- | --- |
| Explicit L0-L3 state hierarchy | **Adopt** | Make ownership, durability, trust, and serialization transitions explicit; add RDF/evidence-specific types inside L2/L3. |
| Persistent programmatic REPL | **Adopt and preserve** | Continue JavaScript/CodeAct and top-level state. Do not switch to Python or widen child authority. |
| Context as data and selective serialization | **Adapt** | Keep `nodeRepl.rlm` registration/slicing; persist only typed, bounded context descriptors or explicit snapshots. Bulk RDF and results remain handles/artifacts, not prompt text. |
| Daemon-owned session/event history and detach/reattach | **Adopt** | A host-owned supervisor and append-only store manage kernels. Detach changes observation, not authority or execution budgets. |
| Recursive durable child sessions | **Adopt and replace current seam** | Evolve optional `rlm.query` into durable child sessions with immutable worker specs, asynchronous handles, bounded ancestry, and private per-session kernels. Keep one-shot compatibility during migration. |
| Direct agent-to-agent messaging | **Adopt with types and bounds** | Store bounded messages in host-owned mailboxes with sender/recipient/session lineage. Messages convey data and coordination, never capabilities. |
| Goals, schedules, heartbeats, autonomous mode, completion gates | **Adapt** | Codex remains overall task authority. Package goals are goal-attached execution records; schedules may resume bounded work, and gates are independent evidence, not self-attestation. |
| Root-plus-descendant resource accounting | **Adopt** | Add an event-derived ledger spanning model, harness, scientific attempts, mediator exchanges, repairs, artifacts, and descendants without counting rollups as new usage. |
| Typed/versioned supplemental prompts, memory, skill, worker specs | **Adopt with stricter governance** | Separate declarative memory from executable skills/specs; quarantine proposals; require independent validation and promotion authority; exclude evaluator-private data. |
| Evidence-backed refinement and rollback | **Adapt** | Mutations cite immutable session events, receipts, tests, and applicability. Versions are append-only and reversible; capability profiles and base policy are immutable. |
| Executable skills promoted directly from successful trajectories | **Reject** | Factorio shows that goal success can reward an exploit. No trajectory can directly promote executable code or a capability-bearing worker spec. |
| Harness strategy encoded as domain-specific shortcuts | **Reject** | No memorized SPARQL templates, endpoint paths, expected answers, or evaluator mappings in generic memory/skills. Source-owned evidence must ground each scientific action. |
| User-permission execution model | **Reject for the worker** | Prime Agent warns its worker is not a security sandbox. Linked Science retains the Node permission boundary and parent-mediated capabilities. |
| Full conversation/history as automatically reusable memory | **Reject** | History is evidence for review. Only explicit bounded serialization or promoted typed memory may re-enter L1; contamination and prompt-injection audits apply. |

## 5. Target architecture and state ownership

### 5.1 Component boundaries

```text
Codex / operator / evaluator
          |
          | existing three-tool MCP + host control policy
          v
packages/cleanroom-node-repl (trusted host)
  SessionSupervisor ---- EventStore ---- ArtifactStore
       |       |              |               |
       |       +---- ResourceLedger           +-- immutable blobs/manifests
       |       +---- GoalScheduler / Gates
       |       +---- MessageBroker / child registry
       |       +---- HarnessRegistry / quarantine / promotion
       |
       +-- one restricted kernel per active session
              |
              | token + sessionId + epoch; bounded typed host calls
              v
     persistent JavaScript / nodeRepl.* (untrusted execution)
              |
              | private adapter only
              v
     linkedScience facade / Communica / RDF/JS handles
              |
              | anonymous read-only mediated requests
              v
     MediatedTraversalBroker / standard Fetch

Evaluator-private scorer and references remain outside worker-readable roots.
They consume sanitized events/receipts and emit private gate records only.
```

Host responsibilities:

- Own session IDs, event sequencing, durable paths, atomic writes, schemas, migrations, supervisor state, cancellation, schedules, gates, message routing, accounting, and capability profiles.
- Start children with the existing Node permission model, mint session/epoch tokens, and deny unknown host calls.
- Persist only bounded event payloads and explicit artifacts; store digests/references for bulk data.
- Keep evaluator-private data and promotion credentials outside worker-readable roots.

Runtime/child responsibilities:

- Execute model-written JavaScript and maintain L2 bindings while active.
- Request typed host operations through `nodeRepl.*`; never open durable files, sockets, or model-provider connections directly.
- Materialize Linked Science RDF/JS state, return bounded observations, and emit evidence-linked operation descriptors.
- Treat messages, memory, skills, RDF, endpoint responses, and restored artifacts as untrusted input unless a specific policy grants a narrower role.

Model responsibilities:

- Select scientific actions, interpret source-owned graph evidence, construct and repair SPARQL, derive bounded results, and decide when evidence is insufficient.
- Cite resident handles and durable event/artifact references accurately.
- Propose goals, child work, messages, or harness refinements within policy; it cannot approve its own capability changes or final gate.

Evaluator responsibilities:

- Hold hidden reference queries, expected invariants, honeytokens, and scoring logic outside worker state.
- Evaluate chronological sanitized events and receipts after execution.
- Emit gate status and diagnostic classes without exposing solution-bearing content to the worker.

### 5.2 L0-L3 mapping

| Level | State | Owner | Persistence and rules |
| --- | --- | --- | --- |
| **L0** | Model/provider identity, weights, tokenizer/tool-protocol version; immutable base system policy and base capability profiles | Model provider and trusted host/repository release | Not writable by the model or refinement. Session manifest records identifiers/digests when observable. Unknown provider internals are explicitly `unobserved`, never inferred. |
| **L1** | Current invocation tokens, tool-visible bounded outputs, selected context slices, active goal/gate summary | Model host/Codex; bounded projections supplied by package | Ephemeral per invocation. The package may retain digests, token counts, explicitly serialized typed snapshots, and event references—not hidden chain of thought or uncontrolled full context. |
| **L2** | Live JavaScript bindings; RLM registered contexts; linkedScience workspaces; native RDF/JS datasets/results; traversal sessions; active child handles and mailboxes | Restricted child kernel for values; trusted host for capabilities and child/session registry | Survives calls while kernel lives. Checkpoints are explicit and typed. Kernel loss invalidates native handles; recovery creates new epochs and fresh handles from authorized artifacts/source routes. |
| **L3** | Append-only session/events, content-addressed artifacts, checkpoints, messages, goal/schedule/gate records, accounting facts, typed harness versions, promotion/rollback receipts | Trusted `packages/cleanroom-node-repl` host and evaluator-private store where applicable | Durable, versioned, bounded, provenance-bearing. Worker access is selective and policy-filtered. L3 is not automatically serialized into L1 or executable in L2. |

Cross-level invariants:

- Every L2-to-L3 transition is explicit, typed, receipted, and bounded.
- Every L3-to-L2 restoration records the source version/digest and creates a new L2 identity/epoch.
- Every L3-to-L1 projection is selective, bounded, and records which public fields were exposed.
- A handle reference in L1/L3 proves identity and lineage only; `results.profile()` or a restoration receipt proves current residency.
- A source failure, empty result, or evaluator gate failure keeps its exact scope and time window.

## 6. Semantic context-management evolution

Prime Agent's context model is an implementation review requirement, not a loose analogy. The paper and repository show that its useful behavior comes from the combination of: addressable L2 values; an append-only L3 event history; compaction records that replace an L1 prefix while retaining the exact source events; persistent kernels that survive L1 compaction; programmatic search/transformation/aggregation; retained child handles and messages; and typed Continual Harness entries selectively assembled into later prompts. The Prime implementation's compaction records include the summary, the first retained event, pre-compaction token count, and optional details/instructions; its full JSONL history remains recoverable even though the summary is lossy.

Linked Science currently implements only a subset:

| Concern | Current Linked Science behavior | Prime fidelity gap | Required adaptation |
| --- | --- | --- | --- |
| L1 context | Codex conversation plus bounded tool output; the package does not own prompt assembly or compaction. | No package-visible compaction/projection record or exact link from a summary back to source events. | Accept caller-supplied invocation/context metadata, record exact public event/object inputs, and make every package-generated projection reproducible. Never claim visibility into hidden provider context. |
| Generic context as data | `nodeRepl.rlm.registerContext`, `context`, and `inspect` retain one JSON-compatible value per context ID with a 2 MiB ceiling. | No durable identity, typed semantic operations, lifecycle, provenance, projection accounting, or restart recovery. | Evolve into host-owned typed context objects while retaining `rlm` compatibility for simple kernel-local values. |
| PEEK | `PeekRegistry` stores five bounded orientation sections and compact handle references; broker memory survives child reset, optional checkpoints are manual. | PEEK is not a complete L2/L3 context store and cannot recover exact evidence. | Keep it as a prompt-visible routing index whose entries point to typed context/artifact/event identities and carry staleness/taint. |
| Scientific evidence/results | `lib/linked-science-runtime.mjs` keeps native RDF/JS objects behind private epoch-bound handles and provides bounded schema, graph, result, and history views. | Handles die with the kernel; no host-owned semantic object identity or exact reconstruction descriptor. | Register durable descriptors and explicit artifact versions without exposing or flattening native values. |
| Tool/event history | Workspace attempt history is bounded to 100 entries; experiment receipts are separately durable. | No complete append-only per-session trajectory or branch/compaction recovery. | L3 session events become authoritative chronology; workspace history remains a domain-specific bounded view. |
| Cross-session context | None; PEEK checkpoint/restore is map-only and native handles are session-private. | No durable child result handles, message queues, or context transfer. | Transfer immutable artifact/event references with explicit grants, taint, lineage, and fresh recipient-local handles. |

### 6.1 Host-owned addressable semantic context objects

Add `semantic-context-object@1` as an L3 descriptor managed by the trusted host. The descriptor is not necessarily a new physical copy. It points to an immutable artifact, exact event range, or active L2 handle and states how the object may be observed or recreated.

Common fields:

- `contextObjectId`, `kind`, schema version, object version, content/descriptor digests, creating session/event, and causal/evidence references;
- semantic role, media type, RDF/result shape metadata, item/byte counts, source and query fingerprints, provenance/lineage bundle, and current residency (`resident`, `artifact-backed`, `descriptor-only`, `stale`, `released`, `tombstoned`);
- confidentiality (`worker-public`, `session-private`, `evaluator-private`), instruction authority (`none` unless an independently promoted prompt note), taint labels, contamination case IDs/digests, and permitted recipient scope;
- L2 handle/session/epoch when resident, immutable artifact identity when backed, and a reconstruction recipe that is either `artifact-load`, `pure-derived`, `source-reacquisition-required`, or `not-reconstructable`;
- retention class, pins/leases, last-access event, projection count, and measured physical/logical/token sizes.

Required kinds and semantics:

| Kind | Canonical content and permitted operations | Epistemic rule |
| --- | --- | --- |
| `rdf-dataset` | Canonical dataset artifact plus named/default graph metadata; SPARQL, graph slicing, counts, term index, bounded projection. | A dataset is retrieved/constructed evidence, never an instruction or timeless source claim. |
| `ontology-schema-excerpt` | Exact source graph/version plus bounded class/property/shape neighborhood and selection query. | Excerpt scope is explicit; omission from an excerpt is not ontology absence. |
| `sparql-result` | Typed bindings/quads/boolean artifact or resident handle, query hash/AST role, source/evidence refs, order/distinctness/truncation metadata. | Empty means empty for the exact query/source/time; truncation is never treated as completeness. |
| `provenance-bundle` | Event/operation/traversal/exchange/artifact digests and source fingerprints; no copied secret tokens. | Proves recorded lineage and bounded transport observations, not scientific interpretation. |
| `query-plan` | Model-authored declarative plan, intended graph roles, evidence refs, SPARQL AST/hash or unresolved slots, validation status, and revisions. | A plan is synthesis/proposal, not source evidence; remembered templates cannot become grounded facts. |
| `operation-receipt` | Immutable runtime/mediator/artifact/gate receipt and public/private projection metadata. | Scope follows the operation; a failed attempt is not global absence. |
| `worker-message` | Typed bounded message body, sender/recipient, evidence/context refs, delivery/ack state, taint. | Coordination data has no capability or automatic instruction authority. |
| `evidence-document` | Bounded declarative manifest/document or artifact with source provenance and parsing facts. | Retrieved content is untrusted data and must be interpreted through source/evidence rules. |
| `prompt-projection` | Exact ordered list of object/event/harness versions, selectors, rendered digest, token/cost facts, and recipient invocation. | Records what was exposed; it does not retain hidden reasoning or evaluator-private inputs. |

An active native handle may register as `resident` without immediate serialization. Durability claims begin only after an artifact or exact reconstruction descriptor commits. Context registration must be atomic with its creating event, so a descriptor never points to an uncommitted artifact or falsely resident value.

### 6.2 Programmatic semantic context operations

The host supplies generic, bounded operations; kind-specific semantics stay in adapters owned by the Linked Science facade/artifact codecs:

```js
nodeRepl.context.register({ kind, residentHandle, descriptor, retention })
nodeRepl.context.describe(contextObjectId)
nodeRepl.context.search(contextObjectId, { query, limit, maxBytes })
nodeRepl.context.slice(contextObjectId, { selector, limit, maxBytes })
nodeRepl.context.aggregate(contextObjectId, { operation, groupBy, limit })
nodeRepl.context.project({ objects, selectors, audience, maxTokens, maxBytes })
nodeRepl.context.serialize(contextObjectId, { codec, retention, reason })
nodeRepl.context.transfer({ objectId, toSession, selector, purpose })
nodeRepl.context.materialize(contextObjectId)
nodeRepl.context.release(contextObjectId, { reason })
```

Operation contracts:

- **Search** returns matches plus exact object version, selector/query hash, bounds, and source offsets/terms/events. For RDF it uses term/quad indexes or bounded SPARQL over the selected object; it is not generic embedding retrieval by default.
- **Slice** returns a deterministic bounded region: RDF neighborhood/named graph/quad window, ontology term excerpt, result columns/rows, provenance event range, plan nodes, receipt fields, or message range. Selectors are typed per kind.
- **Aggregate** performs declared counts/grouping/statistics over an object without serializing all members. Aggregation records set/bag semantics, datatype handling, truncation, and input digest.
- **Project** composes selected slices/aggregates into a model-visible representation. It cannot silently search, reacquire a source, include a full artifact, or cross a taint/confidentiality boundary.
- **Serialize** creates an immutable artifact/version. It does not imply projection into L1.
- **Materialize** creates a fresh session/epoch-local native value from a verified artifact or pure derivation. A `source-reacquisition-required` recipe stops for current approval and budgets; it never performs hidden live access.
- **Release** performs L2 garbage collection only. It does not delete durable evidence or authorize artifact tombstoning.

`linkedScience` retains the ergonomic domain surface (`schema.search`, `graph.neighbors`, `results.page/table/derive`, `traversal.history`). Its adapters register the resulting observations with the generic context/event substrate. The host must not grow a parallel RDF query engine or reinterpret ontologies.

### 6.3 Selective projection and prompt projection records

Prime moves L2/L3 information into L1 only by serialization, retrieval, compaction, or supplemental prompt assembly. Linked Science should make that boundary more explicit because graph data, provenance, and evaluator isolation are sensitive.

Every model-visible package projection uses a two-step contract:

1. `projection.plan` validates audience, taints, object versions, selectors, ordering, byte/token ceilings, and capability/contamination policy without rendering bulk data.
2. `projection.commit` renders once, records a `prompt-projection@1`, and returns the bounded text/structured content plus projection ID.

The record contains session/invocation/model identifiers when observable; ordered object/event/harness version refs; selector and renderer versions; exact rendered SHA-256 and byte count; estimated tokens before dispatch; provider-reported input/cache tokens after dispatch when available; truncation/omission reasons; taint/confidentiality decisions; and public/private projection digests. It does not store chain of thought or duplicate evaluator-private payloads.

Projection ordering is stable and role-aware: immutable policy/capability summary, explicit user/Codex objective, promoted applicable harness entries, current goal/budget summary, selected context objects, recent public events/messages, then bounded diagnostics. A later phase may tune order only through a versioned projection policy and controlled evaluation.

### 6.4 Compaction with exact recovery

Compaction is an L1 operation; it must not mutate L2 native values or discard L3 events. A `compaction-record@1` stores:

- exact first/last source event IDs and event digests; previous compaction record; first retained event ID; branch/session identity;
- the lossy summary text/digest, summarizer model/settings, custom instructions, structured semantic anchors, and token counts before/after when observable;
- every prompt projection/object/harness version summarized, important resident handle descriptors, and explicit reconstruction availability;
- files/artifacts/messages/goals/children mentioned, unresolved/blocked items, taint labels, and contamination audit result;
- summary validation outcome and failure/retry events.

The compacted L1 contains the summary plus recent events and a bounded recovery index. Exact retrieval uses event/object IDs against L3; the summary never becomes the only evidence for a scientific claim. The original event prefix remains append-only and searchable. Tool call/result pairs are not split; a scientific attempt, its final receipt, and handle-retention event remain causally connected. Compaction failures are bounded and cannot append unbounded retry debris; consecutive failures trip a stop state rather than a self-amplifying loop.

Kernel persistence across compaction is mandatory. A kernel crash during/after compaction is a separate recovery path: the compaction record survives, L2 objects become stale, and artifact-backed objects may materialize under a new epoch. Tests must distinguish these cases.

### 6.5 Lifecycle, retention, garbage collection, and recreation

Context-object lifecycle:

```text
registered(resident|descriptor-only)
    -> projected* | serialized(artifact-backed) | transferred*
    -> released(stale in L2, durable descriptor remains)
    -> materialized(resident under a new session/epoch)
    -> tombstoned (explicit L3 retention decision; descriptor/event remains)
```

- L2 agentic garbage collection may release unpinned values based on explicit model request, idle/size pressure, or a deterministic policy. It records cause, last-access, reconstructability, and freed measured bytes/items.
- Active scientific attempts, gate inputs, unacknowledged message payloads, current prompt projections, and uncommitted artifacts are pinned.
- L3 retention classes are `session`, `experiment-record`, `project-reviewed`, and `evaluator-private`; durations/quotas are configured, not invented by the worker. Expiry creates a tombstone event, never rewrites history.
- Reference counting is scoped to artifact versions and event/object links; cycles are handled by root reachability from retained sessions, experiment results, promoted harness versions, and legal/operator holds.
- Ephemeral functions, engines, streams, sockets, external processes, and anonymous closures are never heap-snapshotted as durable objects. Recreate them from code/versioned artifacts or report `not-reconstructable`.
- Source reacquisition is always a new authorized, budgeted scientific action with new provenance. A reconstruction recipe is not standing authorization.

### 6.6 Cross-session and parent/child transfer

Transfer creates a `context-transfer@1` grant containing sender/recipient/root, exact object version, permitted selector, purpose, expiry, taint/confidentiality, and source event. The recipient receives a descriptor or immutable artifact reference and creates its own fresh L2 handle on materialization. Native object identity and capability tokens never cross sessions.

Parent/child defaults are least privilege:

- a child receives only explicitly selected public context projections/object grants from the parent worker spec;
- parent, sibling, and child messages may cite transferable objects but cannot widen the grant or reveal evaluator-private data;
- child results return as immutable context objects/artifacts with complete ancestry and evidence lineage;
- promotion/refinement cannot use another session's private objects without an explicit review grant;
- cross-root transfer is denied by default and requires operator policy, contamination audit, and new accounting attribution.

### 6.7 Taint and contamination boundaries

Taint is orthogonal to RDF truth and to confidentiality. Minimum labels are `external-untrusted-data`, `model-synthesis`, `user-instruction`, `worker-message`, `executable`, `quarantined`, `benchmark-worker-visible`, `benchmark-contaminated`, and `evaluator-private`. Derived objects carry the union of input taints plus their derivation label unless a trusted validator emits a narrower reviewed version; validation never erases source provenance.

Projection rules fail closed:

- `evaluator-private` never enters worker L1/L2 or public events.
- `benchmark-contaminated` cannot enter a held-out case with a matching corpus/case lineage.
- `quarantined|executable` cannot be imported or rendered as instructions to a production worker.
- `external-untrusted-data|worker-message` may be projected only in a clearly delimited data role and cannot modify the immutable prompt/capability layer.
- `model-synthesis` query plans and memories remain proposals until grounded or promoted; they cannot masquerade as source evidence.

### 6.8 Projection token/cost accounting

For each projection, record bytes, estimated tokens by named estimator/version, provider-reported input/cache tokens when available, rendering/selection time, object reads, and the fraction of projected tokens by role/kind. Estimates and provider facts remain separate. Context cost is attributed to the consuming invocation; reuse from cache is recorded from provider telemetry, not assumed.

Evaluation reports useful-evidence density (tokens linked to evidence actually cited in successful operations), omitted-required-context failures, stale/irrelevant projection rate, projection preparation overhead, and incremental model cost. These diagnostics must not become a hidden optimization target that rewards omission of safety policy or provenance.

### 6.9 Staged delivery and acceptance

| Stage | Roadmap dependency | Concrete acceptance |
| --- | --- | --- |
| C0 — Observe | Phase 0 | Characterize `rlm` context, PEEK, handle views, current bounded outputs, and actual caller metadata; no new claims about L1 visibility. |
| C1 — Address | Phase 1 | Create/verify descriptors for every required kind; artifact/event refs survive host restart; no native-handle false residency. |
| C2 — Operate | Phases 1-2 | Search/slice/aggregate/project/serialize/materialize/release pass deterministic kind-specific tests and hard bounds; no parallel RDF engine. |
| C3 — Compact/project | Phases 2 and 5 | Compaction retains exact source event/object refs, preserves kernel L2, recovers exact evidence, accounts tokens, and stops boundedly on summarizer failure. |
| C4 — Transfer | Phase 3 | Parent/child transfer creates fresh handles, preserves provenance/taint, denies cross-root/private/capability transfer, and survives detach/restart. |
| C5 — Govern/GC | Phases 6-7 | Retention, release, materialization, tombstones, contamination, and harness retrieval work under quotas with no live reacquisition or instruction promotion by implication. |

Required evaluation fixtures include: a 100k-quad synthetic dataset searchable without projection; an ontology excerpt whose omitted term tests absence honesty; a 5k-row SPARQL result aggregated without bulk serialization; a provenance bundle spanning parent/child and restart; a query-plan revision after local repair; a message with prompt-injection text; compaction followed by exact event recovery; L2 release and artifact recreation; missing-artifact degradation; evaluator honeytokens; and projection accounting checked against a deterministic tokenizer fixture plus provider telemetry when available.

## 7. Proposed modules and APIs

Names below are concrete proposals, not implemented claims. Phase 0 may adjust filenames, but must preserve responsibilities.

### 7.1 Host modules under `packages/cleanroom-node-repl/src/`

| Proposed module | Responsibility | Initial interface |
| --- | --- | --- |
| `event-schema.mjs` | Versioned validation and bounded public/private projections for events. | `validateEventDraft()`, `upgradeEvent()`, `publicEventView()` |
| `session-store.mjs` | Append-only JSONL or framed event log, session manifest, monotonic sequence, atomic checkpoint index, fsync policy. | `createSession()`, `append()`, `read({after,limit})`, `manifest()`, `verify()` |
| `artifact-store.mjs` | Root-confined, no-overwrite, content-addressed blobs and typed manifests; RDF dataset persistence is one artifact kind. | `put()`, `get()`, `list()`, `verify()`, `tombstone()` |
| `session-supervisor.mjs` | Extract kernel lifecycle from `KernelBroker`; own session state, process, epoch, leases, detach, reattach, recovery, and cancellation. | `start()`, `execute()`, `detach()`, `attach()`, `recover()`, `cancel()`, `status()` |
| `recovery-manager.mjs` | Verify logs/checkpoints, classify in-flight operations, restore allowed L2 state, invalidate stale handles. | `planRecovery()`, `applyRecovery()`, `auditRecovery()` |
| `child-session-registry.mjs` | Parent/child ancestry, worker-spec pinning, asynchronous result handles, terminal state, orphan policy. | `spawn()`, `status()`, `wait()`, `result()`, `cancel()` |
| `message-broker.mjs` | Durable bounded per-session mailboxes and delivery/ack events. | `send()`, `receive()`, `ack()`, `listPeers()` |
| `resource-ledger.mjs` | Validate leaf usage facts and derive session/root/descendant rollups without double counting. | `record()`, `summary()`, `explain()` |
| `goal-scheduler.mjs` | Persistent execution goals, progress records, schedule/heartbeat leases, continuation admission. | `createGoal()`, `recordProgress()`, `complete()`, `schedule()`, `claimDue()` |
| `completion-gates.mjs` | Execute trusted bounded gates outside the child and store private/public results. | `evaluate()`, `status()`, `publicResult()` |
| `harness-schema.mjs` | Typed schemas for supplemental prompt, memory, skill package, and worker spec. | `validateHarnessObject()`, `canonicalDigest()` |
| `harness-registry.mjs` | Append-only versions, quarantine, independent validation, promotion, supersession, rollback. | `propose()`, `validate()`, `promote()`, `rollback()`, `resolvePinned()` |
| `capability-policy.mjs` | Immutable base policy/capability profiles and non-widening comparison. | `resolveProfile()`, `assertNoWidening()`, `digest()` |

`cleanroom-mcp.mjs` should become an adapter over `SessionSupervisor` and preserve its current default singleton behavior through migration. `mediated-traversal.mjs` remains the sole live transport authority and emits accounting/event data through a narrow injected recorder rather than importing orchestration state. `peek-runtime.mjs` remains a bounded orientation component; it must not become the event store or memory registry.

### 7.2 Child-facing JavaScript surface

Preserve `nodeRepl.rlm`, `nodeRepl.peek`, private `linkedScienceTraversal`, and exactly three MCP tools. Add versioned, frozen child adapters only as their phases land:

```js
nodeRepl.session.status()
nodeRepl.session.events({ after, limit, kinds })       // public bounded view only
nodeRepl.session.checkpoint({ include, reason })      // explicit typed checkpoint request

nodeRepl.context.serialize({ contextId, slice, role })
nodeRepl.context.restore({ artifactId, expectedType })

nodeRepl.agents.spawn({ workerSpecVersion, objective, budgets })
nodeRepl.agents.status(childHandle)
nodeRepl.agents.result(childHandle, { maxBytes })
nodeRepl.agents.cancel(childHandle, reason)

nodeRepl.messages.send({ to, kind, body, evidenceRefs })
nodeRepl.messages.receive({ after, limit })
nodeRepl.messages.ack(messageId)

nodeRepl.goal.current()
nodeRepl.goal.progress({ summary, evidenceRefs, stopReason })
nodeRepl.goal.complete({ evidenceRefs })               // requests completion; gate decides

nodeRepl.accounting.summary({ scope: 'session' | 'root-tree' })
nodeRepl.harness.list({ kind, scope, status: 'promoted' })
nodeRepl.harness.propose({ kind, baseVersion, content, evidenceRefs })
```

No child method may accept a filesystem path, raw Fetch closure, provider credential, capability token, evaluator reference, arbitrary gate command, or unversioned executable text. Executable skill artifacts are not importable from quarantine. Worker specs refer to named tools/profiles already allowed by immutable policy; they cannot embed new authorities.

The existing `nodeRepl.rlm.query(prompt, options)` remains a compatibility method until durable children are proven. It should either delegate to a short-lived child session with an explicit compatibility receipt or remain the old one-shot path; that decision is deferred to Phase 3 and measured by characterization tests.

### 7.3 Durable schemas

All schemas carry `schema`, `version`, stable ID, session/root IDs, timestamps, producer, and content digest. JSON Schema files should live under `packages/cleanroom-node-repl/schema/`; checked-in human-readable contracts live under `packages/cleanroom-node-repl/docs/`.

Minimum objects:

- `session-manifest@1`: session/root/parent IDs, repository commit, package/runtime/API versions, L0 identifiers when observable, immutable policy/capability/harness pins, worker-visible root, evaluator boundary digest, lifecycle state, creation/closure metadata.
- `session-event@1`: event ID, monotonic per-session sequence, kind, session/root/parent IDs, causal event IDs, timestamp, public payload, optional private-payload digest, producer, schema version, previous-event digest, event digest.
- `artifact-manifest@1`: artifact ID/content digest, kind, media type, bytes/items, creator event, provenance/lineage, schema/runtime versions, confidentiality, retention/tombstone status.
- `resource-fact@1`: unique fact ID, resource kind/unit/quantity, subject session, root, parent, operation/attempt/exchange/retry IDs, provider source, measured/estimated status, start/end, and inclusion rule.
- `message@1`: sender, recipient, kind (`request`, `result`, `progress`, `correction`, `control`), bounded body, evidence/event refs, delivery/ack state; `control` is accepted only from an authorized host role.
- `goal@1`, `schedule@1`, and `gate-result@1`: objective/progress, finite budgets, next fire/lease, independent evaluator identity, public result, private-result digest, and terminal reason.
- `supplemental-prompt@1`: declarative text, scope, applicability, evidence, base policy digest, author/reviewer, status/version.
- `memory@1`: fact/strategy/inference separation, source evidence, applicability and expiry/revalidation, contamination classification, confidence, supersession.
- `skill-package@1`: immutable source bundle digest, entrypoints, declared effects, tests, dependencies, capability requirement, quarantine/promotion receipts. Never inline-importable before promotion.
- `worker-spec@1`: model constraints, allowed child adapters, capability profile reference, budgets, context-selection rules, gate reference, maximum descendants/depth, and harness pins.
- `mutation-receipt@1`: proposed diff, base/new digests, evidence events, validations, independent reviewer, promotion authority, rollback target, and non-widening result.

Hash chaining detects truncation or rewriting but is not itself an external attestation. Optional signatures or attestations are a later decision; schemas must leave room for them without claiming cryptographic identity today.

### 7.4 Event kinds and lifecycle states

Initial event taxonomy:

- Session/kernel: `session.created`, `session.state.changed`, `session.detached`, `session.attached`, `session.closed`, `kernel.starting`, `kernel.ready`, `kernel.replaced`, `kernel.exited`, `recovery.planned`, `recovery.completed`, `recovery.degraded`.
- Invocation/context: `invocation.started`, `invocation.completed`, `context.registered`, `context.sliced`, `context.serialized`, `context.restored`, `checkpoint.created`, `checkpoint.verified`.
- Scientific state: `handle.retained`, `handle.invalidated`, `handle.artifact-backed`, `scientific.attempt.started`, `scientific.attempt.completed`, `repair.local`, `traversal.exchange`, `artifact.created`, `artifact.verified`, `artifact.tombstoned`.
- Recursive work/messages: `child.spawned`, `child.state.changed`, `child.result.ready`, `message.sent`, `message.delivered`, `message.acknowledged`.
- Continuation: `goal.created`, `goal.progressed`, `goal.completion.requested`, `goal.completed`, `goal.blocked`, `schedule.created`, `schedule.fired`, `schedule.exhausted`, `gate.started`, `gate.passed`, `gate.failed`, `gate.error`.
- Governance: `policy.denied`, `harness.proposed`, `harness.quarantined`, `harness.validated`, `harness.rejected`, `harness.promoted`, `harness.superseded`, `harness.rolled-back`, `resource.recorded`.

Lifecycle sets:

- Session: `created -> starting -> running <-> idle`; `running|idle -> detached` changes observer attachment only; process state continues under leases. Recovery uses `recovering -> running|degraded|failed`. Terminal states are `completed`, `failed`, `cancelled`, and later `archived` as metadata.
- Kernel: `absent -> starting -> ready -> busy -> ready`; replacement uses `terminating -> exited -> starting`. Unexpected exit becomes `crashed` before recovery.
- Child handle: `queued -> starting -> running -> waiting|completed|failed|cancelled`; `orphaned` is diagnostic and requires a configured parent-loss policy.
- Goal: `active <-> paused`; `active -> completion-requested -> completed|active`; `active -> blocked|cancelled`. Budget exhaustion is a stop reason, not success.
- Schedule: `active <-> paused`; each fire has a lease; terminal `exhausted|cancelled`. A missed fire is recorded, not silently replayed without policy.
- Gate: `pending -> running -> passed|failed|error|timed-out`. Only `passed` can satisfy the gate, and only for the invariant it checks.
- Harness version: `proposed -> quarantined -> validated -> promoted|rejected`; promoted versions may become `superseded|rolled-back` but remain append-only.

Unknown event kinds or state transitions fail closed. Migrations never rewrite old events; they materialize upgraded views and record the migration version.

## 8. Trust boundaries and invariants

1. The child remains untrusted model-generated execution. Durable host state is accessed only through bounded typed calls.
2. Base policy and capability profiles are immutable L0/L3 release inputs. No prompt, memory, skill, worker spec, message, schedule, goal, or refinement may widen them.
3. The private traversal adapter remains available only to consumer-owned Linked Science Communica operations. No new document/data facade or raw Fetch surface is added.
4. Retrieved RDF, documentation, endpoint responses, messages, and artifacts are data without instruction authority. Promotion into supplemental guidance is a separate reviewed mutation.
5. Evaluator-private paths, queries, locators, expected bindings, honeytokens, and gate details never enter worker events, artifacts, context, messages, or harness proposals. Public gate output is bounded and non-solution-bearing.
6. Each session pins repository commit, schema versions, policy/capability digests, worker spec, and harness versions. Resume does not silently adopt a newer version.
7. A kernel reset or crash invalidates its L2 handles. Only verified artifacts or newly authorized source operations can materialize fresh handles.
8. Event append, artifact commit, and terminal state transition are ordered so a crash cannot claim a durable result that was never committed.
9. Completion requires the configured independent gate plus goal evidence. Self-reported completion or budget exhaustion is insufficient.
10. Descendants inherit equal or narrower authority and finite sub-budgets; messages cannot transfer unused authority or bypass ancestry accounting.

## 9. Dependency-ordered implementation roadmap

Each phase is a separately reviewable worktree slice. Stop/go gates are cumulative: a failed invariant blocks later phases that depend on it.

### Phase 0 — Governance and characterization

**Deliverables**

- Add a package-local architecture decision under `packages/cleanroom-node-repl/docs/` that fixes ownership, L0-L3 terminology, three-tool compatibility, and sibling-repository prohibition.
- Extract black-box characterization fixtures for current `KernelBroker`, child globals, PEEK reset survival, optional recursive query, traversal ownership, timeout replacement, error envelopes, and bootstrap behavior without changing production logic.
- Extend `scripts/validate-repository-boundaries.mjs` and `test/repository-boundary.test.mjs` to cover all future production/schema/config roots and forbid imports from the sibling or evaluator-private roots.
- Record a versioned baseline fixture containing public tool/API/capability descriptors and known reset semantics; do not capture secrets or raw scientific data.

**Implementation locations:** existing package tests; new `packages/cleanroom-node-repl/test/characterization/`; package docs; root boundary validator/test.

**Invariants:** current three MCP tools, error contracts, raw-network denial, evaluator separation, token/epoch traversal ownership, and reset behavior remain byte/semantics compatible except for explicitly versioned additions.

**Acceptance and tests:** `npm test`, `npm run smoke`, `npm run cleanroom:check`, direct package tests; injected sibling import/config fails; no live requests; characterization fixture is deterministic after timestamp/ID normalization.

**Migration/compatibility:** none. This phase may refactor tests only after the baseline is frozen.

**Stop/go:** go only if the current baseline is green and every proposed future source root is covered by repository-boundary validation. Stop if tests depend on undocumented ambient state or if the current three-tool behavior cannot be characterized without live access.

### Phase 1 — Durable session, event, and artifact foundations

**Deliverables**

- Implement `event-schema.mjs`, `session-store.mjs`, and `artifact-store.mjs` with configured host-owned roots, strict confinement, no-overwrite content identities, atomic commit, bounded reads/listing, checksums, and versioned manifests.
- Give the current implicit broker session a durable session/root ID and manifest while preserving one-session MCP behavior.
- Record lifecycle, invocation, kernel, policy-denial, PEEK-checkpoint, and existing scientific receipt references as append-only events.
- Implement explicit context serialization for JSON-compatible bounded values and artifact manifests. Do not serialize arbitrary closures, modules, native RDF/JS engines, or hidden model state.
- Fold the deferred durable RDF dataset design into `artifact-store` as a later artifact codec, not a separate filesystem authority.

**Implementation locations:** proposed store/schema modules; `cleanroom-mcp.mjs` adapter; `repl-kernel-child.mjs` typed session/context adapter; JSON Schemas under `packages/cleanroom-node-repl/schema/`; tests under package test.

**Invariants:** parent-only writes; append-only events; explicit L2-to-L3 transitions; bulk payloads behind artifacts; hashes verified on read; no PEEK/event/artifact conflation; no evaluator-private content in public log.

**Acceptance and tests:** create/append/reopen; sequence and hash-chain verification; abrupt process termination during event and artifact commit; corrupt/truncated log detection; path traversal/symlink/race denial; quota/size/item limits; deterministic manifest hashing; bounded pagination; stale schema rejection; existing MCP and traversal suites unchanged.

**Migration/compatibility:** sessions created before this phase have no durable log and are labeled `legacy-ephemeral`; they are not fabricated retroactively. Existing PEEK checkpoint files may be imported only through an explicit typed migration event.

**Stop/go:** go only if a host restart can reopen and verify metadata without starting a child or falsely restoring handles. Stop on any path escape, silent overwrite, log repair that rewrites evidence, or leakage of evaluator-private fields.

### Phase 2 — Recovery and supervision

**Deliverables**

- Extract `SessionSupervisor` from `KernelBroker`; make `KernelBroker` the MCP compatibility adapter.
- Add daemon/process ownership, finite leases, detach/attach, crash classification, idempotent recovery planning, graceful cancellation, and orphan cleanup.
- Define checkpoints for serializable JavaScript context descriptors, RLM context registrations, PEEK maps, module-root declarations, and Linked Science artifact references. Native handles are descriptors until rematerialized.
- On recovery, pin original versions/policy, start a new epoch/token, restore allowed context, mark old handles invalidated, and record degraded recovery when some state cannot be reconstructed.
- Reconcile in-flight operations: unknown model/tool completion, interrupted artifact commits, and active traversals become explicit indeterminate/aborted events, never inferred success.

**Implementation locations:** `session-supervisor.mjs`, `recovery-manager.mjs`, refactored `cleanroom-mcp.mjs`, child session adapter, recovery docs/tests.

**Invariants:** detach is not cancellation or budget reset; attach does not replay effects; each recovered kernel has a new epoch/token; active traversal is aborted on owner loss; recovery never auto-reruns a live query; artifact-backed rematerialization is distinct from source reacquisition.

**Acceptance and tests:** kill child during idle/eval/traversal/artifact request; kill/restart host after each commit boundary; repeated recovery is idempotent; old handles report stale; PEEK references report stale until rematerialization; module roots remain confined; no duplicate external effect; operator can inspect recovery plan before execution.

**Migration/compatibility:** `js_reset` keeps its destructive L2 semantics but now writes reset/recovery events. The existing `KernelBroker` constructor remains usable for package tests during deprecation.

**Stop/go:** go only after a 100-cycle synthetic crash/recover soak has zero false completions, duplicate effect executions, or authority widening. Stop if safe status cannot distinguish `failed`, `aborted`, and `indeterminate`.

### Phase 3 — Recursive sessions and direct messaging

**Deliverables**

- Implement durable child-session registry, immutable `worker-spec@1`, asynchronous handles, ancestry/depth/width bounds, parent-loss policy, wait/result/cancel, and terminal result artifacts.
- Give every child its own restricted kernel, token, epoch, event stream, PEEK context, finite budgets, and policy pin; inherit only explicit public context/artifact references.
- Add bounded durable messaging with delivery and acknowledgement. Messages cite evidence/events and carry no capabilities.
- Decide whether `nodeRepl.rlm.query()` becomes a compatibility wrapper over a short-lived child or remains a separate one-shot provider call. Record both arms in a same-provider characterization before choosing.
- Prevent deadlocks by disallowing unbounded mutual waits, enforcing wait leases, and recording dependency edges.

**Implementation locations:** child registry, message broker, worker-spec schema, supervisor hooks, child adapters, tests; no new Linked Science data facade.

**Invariants:** child authority is equal or narrower; no shared mutable JavaScript heap or native handle registry across sessions; artifact/evidence transfer is explicit; direct messages are bounded data; cancellation propagates by documented policy; evaluator-private references are not inheritable.

**Acceptance and tests:** parent spawns two synthetic children; detach/host restart preserves child identities; child results arrive once; cross-root messages are denied; message ordering/deduplication/ack is deterministic; parent cancellation behavior is tested for running/waiting/completed children; depth/width/byte/timeout bounds fail closed.

**Migration/compatibility:** default CodeAct mode may still report recursive children unavailable until a model provider/session factory is configured. Current one-shot recursive tests remain until the Phase 3 decision is recorded.

**Stop/go:** go only if recursive execution cannot escape root policy or become invisible to event history. Stop if a child can outlive its lease/accounting root, access parent native handles, or transfer an authority-bearing object through messages.

### Phase 4 — Descendant-aware resource accounting

**Deliverables**

- Implement `resource-fact@1` and an event-derived ledger for root/session/descendant rollups.
- Instrument model usage when the provider supplies it, invocation wall time, model deliberation interval, kernel execution, harness wait/overhead, local repairs, scientific attempts, mediator requests/exchanges/bytes/time, explicit retries, artifacts, messages, and child usage.
- Add budget reservation/debit/release for child spawn and scheduled continuation; unused reservation is not usage.
- Provide `summary()` and `explain()` views that show measured versus estimated/unobserved fields and causal IDs.

**Implementation locations:** resource ledger; recorder seams in supervisor, child registry, traversal broker, artifact store, and provider adapter; generated documentation.

**Invariants and no-double-count rules:**

1. Leaf facts are authoritative; rollups are derived views and never recorded as additional consumption.
2. One scientific attempt may contain many mediator exchanges. Attempt count and request count are different units and are never summed.
3. A local validation repair records `liveRequests: 0`; a corrected later query is a new scientific attempt.
4. A retry is a new exchange with `retryOf`; current mediated transport continues to report hidden retries as zero.
5. Descendant facts carry their own session ID and the same root ID; root totals union unique fact IDs rather than adding pre-aggregated child totals.
6. Model tokens come only from provider usage receipts. Missing token counts are `unobserved`, not estimated from bytes unless a separate labeled estimator is requested.
7. Model deliberation, kernel execution, active transport, and harness overhead are non-overlapping timed spans where possible. Wall-clock elapsed is reported separately and is not the sum of overlapping concurrency.
8. Scientific attempts and repairs remain evidence even when excluded from billable/provider cost.

**Acceptance and tests:** deterministic nested-session fixture with concurrent children, failures, local repairs, two scientific attempts, multiple exchanges, one explicit retry, artifact writes, and model usage; manually calculated expected rollups; property tests for order independence and unique-fact union; budget denial before spawn/request; current UniProt timing receipt can be represented without conflating model/orchestration time and active transport.

**Migration/compatibility:** historical events lacking facts remain `accounting-incomplete`; do not synthesize exact usage. Existing traversal aggregate receipts are imported as evidence while exchange facts are deduplicated by receipt/operation IDs.

**Stop/go:** go only if the ledger explains every total and preserves incomplete observability. Stop on unexplained residuals, double-counted descendant totals, or a budget that can be reset by kernel/session recovery.

### Phase 5 — Goals, schedules, heartbeats, autonomous bounds, and gates

**Deliverables**

- Implement persistent goal/progress state attached to the caller's Codex goal/task identifier when provided; otherwise use a package-local execution-goal ID without claiming to replace Codex.
- Add finite schedule/heartbeat records, lease-based due claiming, missed-fire policy, pause/cancel, and bounded continuation prompts.
- Add autonomous limits for turns/invocations, provider tokens, root-tree usage, wall clock, active transport, scientific attempts, requests, artifacts, descendants, and consecutive failures.
- Implement independent gates with trusted host/evaluator code, bounded public diagnostics, private result digests, timeout, and no worker-selected gate command.
- Require explicit insufficient-input and approval-needed stop states instead of autonomous improvisation.

**Implementation locations:** goal scheduler, completion gates, supervisor continuation loop, schemas/docs/tests; evaluator integrations remain outside worker-readable root.

**Invariants:** goals do not grant capabilities; schedule fire does not reset cumulative budget; heartbeat prompts cannot modify immutable policy; completion is requested by a worker and decided by gate plus authorized host; blocked/limit-exhausted is not complete; private scoring never enters L1/L2/L3-public.

**Acceptance and tests:** goal survives host restart; heartbeat resumes once under a lease; concurrent daemons cannot double-fire; missed/late events are explicit; failed gate returns bounded non-solution diagnostics and continuation remains within remaining budget; passing a narrow gate states its scope; approval-needed and insufficient-evidence paths stop without a live request.

**Migration/compatibility:** existing Codex-driven sessions continue without package scheduling. Goal APIs are optional until the caller supplies an attachment contract. Do not infer Codex completion from package state.

**Stop/go:** go only if schedules are exactly-once-admitted/at-least-once-observed with idempotent continuation and cannot expand authority or budget. Stop if the worker can select/modify its own gate, mark itself complete, or receive private reference details.

### Phase 6 — Semantic-web neuro-symbolic integration

**Deliverables**

- Add Linked Science event adapters that preserve `operationId`, handle ID/type/epoch, source/evidence handles, query/payload hashes, fingerprints, navigation evidence, traversal/attempt IDs, and receipt digests.
- Implement artifact codecs and manifests for canonical RDF datasets and bounded result/evidence objects, following `docs/tasks/durable-dataset-persistence.md`. Loading creates fresh native handles with `artifact-backed` provenance and never restores an old handle ID.
- Add explicit durable descriptors for ontology/schema/SHACL/instance/inferred graphs, query results, evidence packs, and scientific attempts; keep the actual bulk RDF/result in an artifact or active L2 registry.
- Preserve agentic graph-role discovery: worker specs may name resource roles and approved authority classes, but may not embed case-specific SPARQL, predicates, endpoint paths, or expected answers.
- Preserve scientific correction/retry semantics and carry provenance continuously across parent/child messages and artifact handoffs.
- Integrate evaluator-private competency gates and contamination auditing with the durable event projection.

**Implementation locations:** adapters in `lib/linked-science-runtime.mjs` and `lib/cleanroom-linked-science-bootstrap.mjs`; artifact codecs in the owning package; runtime API/schema/docs updates; synthetic fixtures and competency-evaluation tooling.

**Invariants:** declarative RDF/SPARQL plus programmatic CodeAct remain composable; semantic evidence is not reduced to prose memory; every live request remains mediated; an unavailable source/empty result retains exact scope; public worker context remains disjoint from private scoring; restored datasets are untrusted RDF data; PEEK stays compact orientation.

**Acceptance and tests:** ontology-driven discovery from synthetic source-owned RDF; multi-graph role reasoning; query construction and repair; handle reuse across calls; artifact save-reset/load with fresh handle; crash recovery with provenance continuity; child-derived result cites parent evidence without sharing registries; stale/contradicted evidence, empty exact query, truncated result, source failure, and insufficient-input stops; boundary and honeytoken tests.

**Migration/compatibility:** current runtime 4.0.0 workspaces continue in ephemeral mode. New durable APIs are version-negotiated. Existing artifact receipts remain historical; no retrospective native-handle restoration is claimed.

**Stop/go:** go only after the dedicated neuro-symbolic evaluation in Section 11 shows no semantic regression against the ephemeral baseline. Stop if durability improves task completion by leaking templates/answers, bypassing grounding, or weakening mediator/evaluator boundaries.

### Phase 7 — Versioned continual-harness refinement

**Deliverables**

- Implement typed supplemental prompt, memory, skill-package, and worker-spec registries with local/global scope, append-only versions, evidence links, applicability, expiry, and supersession.
- Implement propose -> quarantine -> independent validate -> promote/reject -> rollback flow and immutable mutation receipts.
- Run contamination, prompt-injection, capability-diff, executable-code, dependency, static-boundary, synthetic-behavior, and held-out regression validators.
- Allow the model to propose focused changes but require explicit configured promotion authority. Default promotion authority is a human/operator; any automated authority is a later, named policy decision.
- Retrieval/compilation is selective and bounded. A session pins versions; a later promotion does not mutate an active session silently.

**Implementation locations:** harness schema/registry/capability policy modules; quarantine and promoted artifact roots; validation worker specs; package docs/tests; cross-reference `docs/tasks/wiki-memory-continual-learning.md`.

**Invariants:** base policy/capabilities cannot change; executable proposals never run in the production worker while quarantined; evaluator-private or contaminated evidence cannot support promotion; success alone is not safety evidence; every version is rollback-addressable; cross-session/global state requires stricter review than session-local state.

**Acceptance and tests:** safe declarative memory promotion and retrieval; stale/conflicting memory resolution; malicious RDF/message proposes an instruction and is rejected; skill asks for raw Fetch or wider path and is rejected; worker spec increases depth/budget/capability and is rejected; independent validator identity differs from proposer session; rollback restores a pinned prior version for new sessions without rewriting history.

**Migration/compatibility:** existing skills under `skills/` are repository-reviewed code, not automatically imported harness objects. Candidate lessons in existing task briefs remain unpromoted. A one-time import needs explicit review and receipts.

**Stop/go:** promote beyond research use only after red-team and held-out evaluations show non-widening, contamination resistance, rollback, and no regression in honest-stop behavior. Stop immediately if an exploit or evaluator leak can be retained as reusable guidance.

## 10. Resource and accounting semantics

The ledger must preserve distinct scientific and computational facts rather than compressing them into one cost number.

| Dimension | Unit/fact | Attribution |
| --- | --- | --- |
| Model | input/output/cache tokens and provider cost when reported | Invocation and session; source is provider receipt. |
| Model deliberation | elapsed interval between invocation admission and model response, excluding separately measured child tool spans only when the host can prove separation | Invocation; measured/estimated flag required. |
| Harness | supervisor CPU/wall, queue/wait, serialization, checkpoint, recovery, gate, scheduler overhead | Host span; concurrent wall time is not additive. |
| Scientific attempt | one explicit `traversal.query` or local query/derivation attempt; operation, query hash, evidence refs, outcome | Session and goal; not a byte/cost rollup. |
| Local repair | validation correction before external effect | Operation; live request count is zero. |
| Mediator | request/exchange count, distinct-source fan-out, request/response bytes, active transport time, retry relation | Traversal/attempt/session; aggregate receipt is a view. |
| Result/artifact | retained items, serialized bytes, reads/writes, verification | Creating or loading event; quotas use stored physical bytes and referenced logical bytes separately. |
| Recursive work | child model/harness/scientific facts | Child session plus common root; root union includes each fact once. |
| Messaging | message count and bytes | Sender and root for resource use; recipient delivery is state, not a second byte charge unless physical transport is separately measured. |
| Schedule/gate | fires, continuations, executions, time, output bytes | Root goal; failed/timeout remains usage. |

Every summary exposes raw facts, inclusion rules, incomplete fields, and concurrency semantics. Evaluation reports at least: root totals; per-session/descendant breakdown; scientific attempts; local repairs; mediator exchanges/retries; active transport time; model tokens/deliberation; harness overhead; and elapsed wall time. Model comparisons must not hide extra child computation, and harness comparisons must not attribute endpoint drift or unavailable provider telemetry to model reasoning.

## 11. Neuro-symbolic evaluation strategy

### 11.1 Questions

The evaluation asks whether durability and orchestration improve recovery, evidence reuse, and scientific reasoning without changing the underlying scientific information available to the model or leaking held-out solutions.

Required capabilities:

1. **Ontology-driven discovery:** from source-owned ontology/schema/service/dataset evidence, identify relevant classes and predicates without a memorized query template.
2. **Semantic evidence retention:** keep ontology, schema, SHACL, VoID/DCAT/service descriptions, instances, failures, and result evidence as distinct typed resident/artifact-backed objects.
3. **Graph-role reasoning:** distinguish ontology versus instances, service metadata versus data, named graph versus endpoint, entity versus annotation/part, and prior belief versus source/result evidence.
4. **SPARQL construction and repair:** construct SELECT/ASK/CONSTRUCT/DESCRIBE appropriate to the goal, repair local syntax/shape errors without consuming live-attempt budget, and record later scientific revisions as new attempts.
5. **Compaction/restart continuity:** reuse bounded context and resident handles across L1 compaction; after kernel/host restart, report old handles stale and restore only from verified artifacts or newly authorized sources.
6. **Recursive provenance:** a child receiving evidence/artifact references must return a result whose lineage traverses child events, parent evidence, mediator receipts, and artifact digests.
7. **Live variability:** distinguish endpoint/source drift, timeout, negotiation failure, empty exact query, and semantic error. Do not score source failure as global absence or model failure.
8. **Honest stopping:** stop with `evidence-insufficient`, `source-unavailable`, `budget-exhausted`, `approval-needed`, or `tool-unavailable` when inputs do not justify an action.
9. **Contamination control:** keep official queries, expected bindings, example IDs, distinctive solution paths, prior successful traces, and honeytokens out of worker-visible sessions, messages, artifacts, and promoted harness state.
10. **Evaluator-private gates:** score chronological public events/receipts outside the worker root and return only bounded gate status/diagnostic categories.

### 11.2 Evaluation layers

- **Layer A — deterministic synthetic RDF:** local ontologies, misleading labels, named graphs, SHACL constraints, ambiguous paths, stale prior, empty result, and repair fixtures. No network. Used for every commit.
- **Layer B — mediated synthetic transport:** controlled standard-Fetch loopback/injected fixtures with redirects, content negotiation, failures, fan-out, timeouts, retries, and changing dataset versions. Proves every Communica request crosses the mediator.
- **Layer C — crash/compaction/recursion perturbations:** kill kernel/host at defined event boundaries; compact L1; spawn children; delay/duplicate messages; recover artifacts; verify provenance and accounting.
- **Layer D — held-out public competency evaluation:** follow `docs/experiments/uniprot-competency-question-evaluation.md` with fresh sessions, worker/evaluator split, current explicit live approval, bounded traversal, and frozen manifests. No live run occurs as part of ordinary verification.
- **Layer E — refinement transfer/non-transfer:** promote one reviewed generic lesson and test it on a different endpoint/resource; also test that an endpoint-specific or contaminated lesson is refused outside applicability.

### 11.3 Experimental design

Use a factorial, one-change-at-a-time comparison rather than comparing unrelated agents:

| Factor | Levels |
| --- | --- |
| Model/provider | Same pinned model/provider/settings within a comparison; repeat separately for another model only when available. |
| Harness | Current ephemeral baseline; durable single-session; durable recursive; durable plus promoted reviewed memory. |
| Recovery | No perturbation; L1 compaction; kernel reset; host restart; child restart. |
| Scientific case | Same opaque held-out question, worker-visible evidence roles, authority, and budgets. |

Freeze repository commit, package/runtime/schema versions, model/provider settings, worker spec, capability profile, harness versions, public manifest digest, private evaluator digest, schedule/autonomy settings, and all root-tree budgets. Randomize case order where possible. Use at least three fresh repetitions for variance probing; do not claim statistical power from a pilot.

Report hard safety pass/fail, honest-stop and environment-blocked classifications, semantic rubric profile, second-turn reuse, recovery correctness, provenance continuity, attempt/repair/request/retry counts, root/descendant resource facts, and wall time. Compare model effects only within the same harness condition and harness effects only with the same pinned model/settings. If a model/provider does not expose token usage or exact L0 identity, mark it unobserved and do not invent equivalence.

### 11.4 Hard failures and promotion gates

Hard failures include raw transport or filesystem bypass, unapproved live access, mutation, evaluator-private access, full-result leakage, stale-handle-as-resident claims, unsupported scientific claims, hidden query/template contamination, unaccounted descendants, capability widening, event/history rewriting, or self-approved executable refinement.

A phase cannot use improved answer rate to offset a hard failure. Live variability and unavailable sources are classified separately. A gate can promote a phase only when boundary tests pass and the relevant semantic outcomes are at least non-inferior to the current baseline within the pilot's uncertainty.

## 12. Continual Harness and evidence-linked refinement

### 12.1 Prime fidelity baseline

The Prime paper and repository establish a concrete fidelity target:

- four typed kinds: prompt notes for behavioral addenda, memories for facts/decisions/outcomes, executable skills for reusable procedures, and subagent specifications for reusable roles/divisions of labor;
- session-local state by default and explicitly selected global state for later sessions;
- create/read/update/delete operations and versioned entries with source/metadata; the actual Python runtime also validates skill import/call references and argument descriptions;
- refinement triggered directly by an agent or through `/refine`, where a background model call reviews relevant trajectory events and produces focused edits;
- edits applied at a turn boundary, their trigger/evidence/intended effect recorded, supplemental state assembled for later invocations, immutable base prompt preserved, and versions/snapshots available for rollback;
- runtime execution remains separate from persistent harness storage: the TypeScript host owns execution and the Python harness layer exposes state into the persistent REPL.

Linked Science must cover every mechanism above before claiming Prime-style Continual Harness fidelity. It deliberately strengthens the trust model: CRUD is proposal/version creation rather than in-place evidence erasure; executable skills and worker specs are quarantined; global/project promotion requires independent authority; and semantic evidence plus evaluator-private boundaries determine what may support or consume a refinement.

### 12.2 Typed versioned objects

All kinds share stable ID, kind/schema/version, scope, title/path/tags, content digest, base/supersession versions, proposer/author/reviewer/promotion identities, created/updated events, evidence bundle, intended effect, applicability, taint/contamination, status, projection policy, and rollback pointer.

| Kind | Required content | Allowed influence | Required extra validation |
| --- | --- | --- | --- |
| `prompt-note@1` | One narrow behavioral addendum, positive/negative examples, applicability, conflict/precedence class, and immutable-base-policy digest. | May enter the supplemental prompt only when promoted, applicable, non-conflicting, and within its token budget. | Instruction hierarchy, base-policy contradiction, capability-widening, prompt injection, ambiguity, and regression checks. It cannot redefine evidence, completion, or authority semantics. |
| `factual-memory@1` | Typed claims separated into fact, decision, failure, preference, strategy, or inference; exact semantic context/event evidence; confidence/review status; source/time/scope; expiry/revalidation; contradictions and supersession. | May be retrieved as labeled prior/reviewed context. It is never source evidence for a new scientific claim without current applicable evidence. | Citation reachability, evidence-kind compatibility, source/result versus inference distinction, stale/contradicted claim handling, contamination and cross-endpoint applicability. |
| `executable-skill@1` | Immutable source bundle/artifact; public description; import/entrypoint/call pattern; typed arguments/defaults/constraints; declared effects/dependencies; capability-profile requirement; tests and failure behavior. | Only a promoted version may be loaded, and only in a child whose pinned immutable capability profile already permits every declared effect. | Static import/path/network checks, dependency lock/digest, sandboxed execution, adversarial inputs, idempotence/effect receipts, non-widening diff, semantic-evidence and contamination audits. |
| `worker-spec@1` | Purpose, role, instructions, when to invoke, expected result/message schema, model/provider constraints, context selection/transfer rules, tools, immutable capability profile, budgets, depth/width/lease, gate, and stop reasons. | May instantiate a child only when promoted and explicitly selected; admission returns an asynchronous durable handle, not the answer. | Context minimization, authority/budget inheritance, private-data denial, child accounting, message/result schema, termination, and held-out leakage checks. |

Unlike generic memories, Linked Science factual memories may reference RDF terms, graph roles, SHACL shapes, dataset/service versions, query/result hashes, and provenance bundles. Those references remain data locators. A memory saying that a predicate was useful at one source/version does not make that predicate correct for a future question or endpoint.

### 12.3 Scope, assembly, and promotion rules

Scopes are explicit and ordered from narrowest to broadest:

1. **session-local:** default for active-run facts, blockers, provisional strategies, coordination roles, and refinements not yet shown transferable;
2. **project/repository:** reusable only for `LA3D/linked-science-cloud`, with the project/paths/API versions and applicability named explicitly;
3. **user-global:** stable cross-project preferences or generic capabilities, requiring separate operator approval and storage outside the repository where policy permits;
4. **evaluation configuration:** frozen, read-only, experiment-specific public harness versions; never a route to global promotion.

A broader scope never inherits automatically from repeated local success. Promotion requires a new version and receipt. During session-local refinement, broader entries are read-only context; a session override creates a narrow entry rather than mutating the broad version. Active sessions pin an ordered harness manifest.

Prompt assembly order is deterministic:

```text
immutable base policy and capability summary
  -> caller/user/Codex objective and constraints
  -> promoted applicable global entries
  -> promoted applicable project entries
  -> pinned session-local entries
  -> current goal/budget/context projections
```

Conflicts at the same authority class are surfaced and fail closed; narrower scope may specialize but never contradict a higher immutable rule or widen capability. Every assembly creates a `prompt-projection` record listing exact entry versions, selection reasons, omissions/conflicts, rendered digest, bytes/tokens, and recipient invocation. Supplemental state does not silently update mid-turn; promotion becomes eligible only at a safe turn/session boundary, and active version pins change only through an explicit adopt/restart event.

### 12.4 Evidence-linked refinement triggers

Allowed triggers are concrete event sets, not free-floating self-critique:

- explicit operator/user request to refine a named scope/kind;
- a repeated cluster of the same local validation repair or recoverable harness friction across independently identified events;
- an independent gate failure whose public diagnostic identifies a general harness problem without revealing the hidden solution;
- a source-backed correction that contradicts a pinned factual memory;
- a policy-compliant successful procedure repeated across different cases/sources and accompanied by counterexample search;
- child coordination/message failures that support a reusable worker-spec improvement;
- a security/contamination finding, which normally triggers quarantine/rollback rather than a performance refinement.

Success, reward, endpoint availability, or one polished final answer alone is not a trigger for executable promotion. Each trigger bundle freezes exact event/object/receipt IDs, selection query, proposer session/root, time window, relevant failed/successful cases, counterevidence, contamination classification, and intended effect. A `/refine`-style background model may draft edits from that bounded bundle, but it receives no evaluator-private data and has no promotion capability.

### 12.5 Refinement pipeline

```text
trigger admitted
  -> evidence bundle frozen and taint-scanned
  -> proposer generates typed minimal diff
  -> schema + base-version + non-widening validation
  -> quarantine version committed
  -> independent static and behavioral validation
  -> semantic/contamination/evaluator audit
  -> explicit promote or reject decision
  -> eligible at next safe boundary for new/pinned sessions
  -> monitored outcome; supersede or rollback when warranted
```

Each `mutation-receipt@1` includes the full typed diff, base/new digests, trigger and intended effect, evidence/counterevidence refs, proposer, validators, validation configurations/results, capability diff, contamination/honeytoken results, promotion authority and reason, effective scope/boundary, prompt projection cost change, compatibility range, and rollback target.

Create/update/delete semantics are append-only:

- **create** adds version 1 under a new stable ID;
- **update** creates version N+1 against an exact base digest and fails on stale base/concurrent modification;
- **delete** creates a revoked/tombstoned version and does not erase prior content or receipts;
- **rollback** atomically repoints a scope's default/promotion manifest to an earlier verified version while recording the cause; active sessions remain pinned unless explicitly restarted/adopted;
- **reject** preserves the quarantined proposal and diagnostic evidence under configured retention without making it retrievable by production workers.

### 12.6 Independent validation and evaluator integration

Independent means the validator process/session and authority identity differ from the proposer; it runs a frozen validation worker spec under equal-or-narrower capabilities and separate budgets. For executable skills or worker specs, the promoter also differs from the proposer. Validation layers are:

1. schema, digest, dependency, import/path, and declared-effect checks;
2. immutable policy/capability non-widening comparison;
3. deterministic unit/property/adversarial tests in a disposable child with no live authority by default;
4. semantic evidence audit: claims and examples resolve to exact context objects/events, retain source/result/inference separation, and include counterevidence;
5. contamination audit against evaluator-private digests/honeytokens and worker-visible held-out cases without exposing private content to the proposal model;
6. same-model/same-case A/B evaluation with one changed harness factor, root-plus-descendant accounting, honest-stop and safety gates;
7. operator/promotion-authority review of the bounded receipt.

Evaluator-private gates may say `passed`, `failed:<public-category>`, `contaminated`, or `not-scorable` and provide a private-result digest. They never supply official SPARQL, expected bindings, distinctive graph paths, case IDs that reveal solutions, or correction fragments to refinement. A gate failure may trigger a proposal only from its public category plus worker-public trajectory.

### 12.7 Semantic-web-specific promotion rules

- Source-owned RDF, documentation, service descriptions, and messages never become prompt notes/skills automatically. They may support a factual-memory proposal with exact provenance.
- A reusable skill may implement generic bounded operations such as validating a query AST, comparing RDF term roles, or composing already-grounded handles. It may not encode a held-out SPARQL query, hardcode a resource-specific endpoint route as universal strategy, bypass the mediator, or acquire its own network/filesystem authority.
- A worker spec may ask a child to inspect an ontology or compare provenance but must identify context roles, not solution-bearing predicates/paths, unless the use is outside held-out evaluation and explicitly reviewed as source-specific.
- Memories about endpoint/schema behavior carry source version/time, evidence status, applicability, and revalidation rules. Retrieval labels them as prior/reviewed memory, never current source evidence.
- Corrections preserve the false/stale prior and the correcting evidence as distinct versions so later analysis can measure whether refinement repaired or merely hid an error.
- Provenance bundles and mutation receipts cross-reference rather than copy full RDF/results. Bulk semantic evidence remains behind typed context objects/artifacts.

### 12.8 Concrete acceptance and evaluation

Continual Harness cannot be considered implemented until all of the following pass:

1. Create/read/update/revoke/list local entries for all four kinds; versions and refinement events survive host/kernel restart; concurrent stale-base update is rejected.
2. Explicitly promote one session-local factual correction to project scope, with source/result/inference separation, expiry, independent validation, and exact prompt-projection record.
3. Prove global/project entries are read-only during local refinement and are omitted when applicability or token budget fails.
4. Create a quarantined executable skill with valid entrypoint/arguments; production import fails before promotion; validation runs in a disposable narrow child; promoted version loads only under a compatible pinned capability profile.
5. Reject skills/specs that request raw Fetch, external paths, undeclared dependencies, larger budgets, deeper recursion, new hosts/methods, evaluator access, or capability-token transfer.
6. Reject a memory/skill derived from malicious RDF or a worker message that says to ignore policy; preserve it as tainted evidence, not instruction.
7. Detect a held-out query fragment and honeytoken in each of prompt, memory, skill source/tests, worker spec, evidence bundle, and message-derived proposal.
8. Run a Factorio-shaped synthetic exploit: a shortcut improves the task metric but violates an independent environment invariant. The trajectory may be retained, but skill/spec promotion must fail; a later rollback test must restore the last safe manifest.
9. Run cross-endpoint transfer: one promoted generic evidence-validation lesson helps on a different synthetic ontology; a source-specific predicate/path memory is withheld or qualified outside applicability.
10. Compare no-refinement versus local-refinement versus promoted-project-refinement with the same model/settings and frozen cases. Report semantic success, honest stops, contamination, projection tokens, validation cost, descendant use, and rollback events—not just answer rate.
11. Verify a failed private evaluator gate yields only bounded public diagnostics and cannot be reverse-engineered through events, projection records, mutation receipts, or accounting.
12. Verify rollback/default-pointer change is atomic under crash, old versions remain auditable, and active sessions do not silently change harness state.

## 13. Safety and governance: the Factorio exploit lesson

Prime Agent's Factorio run is a direct warning for continual harnesses: an agent found a resource-injection exploit, used it despite an anti-cheating reminder, and retained the shortcut as a reusable skill. The problem is not merely malicious input. Optimization pressure can turn an observed success into a durable policy violation, and persistence amplifies the mistake.

Linked Science therefore uses the following governance model:

1. **Immutable constitution:** base system policy, allowed authority classes, filesystem roots, traversal rules, evaluator separation, and hard resource ceilings are release inputs. Refinement cannot edit or supersede them.
2. **Non-widening capabilities:** every proposed prompt/skill/spec is statically compared with its base profile. New hosts, methods, credential use, filesystem roots, dependencies, descendant depth, budgets, tool names, or bypass paths cause rejection.
3. **Quarantine by kind:** declarative prompt/memory proposals are non-executable; skill packages and worker specs live in a host-only quarantine not readable/importable by production children.
4. **Independent validation:** the proposer cannot be the sole validator or promoter. Validation runs under an equal-or-narrower test profile in a disposable environment with no evaluator secrets or live authority by default.
5. **Evidence-linked mutations:** every proposal cites exact source events, receipts, tests, failure clusters, applicability, and counterevidence. Outcome success without policy-compliant provenance is insufficient.
6. **Contamination audit:** search worker-visible context, messages, artifacts, memories, skills, and specs for held-out questions, official query fragments, expected answers, private IDs, and honeytokens before validation or promotion.
7. **Append-only versions:** never edit a promoted object in place. New versions cite their base; promotion, supersession, rejection, and rollback are events with immutable receipts.
8. **Explicit promotion authority:** default human/operator approval; automated promotion is disabled until a separately reviewed policy names the authority and proof obligations.
9. **Rollback and pinning:** sessions pin versions. Rollback changes the default for future sessions or an explicitly restarted session; it does not rewrite old traces or silently mutate active workers.
10. **Scientific integrity:** a reusable lesson may encode a general validation strategy, but not a held-out answer, unsupported source fact, case-specific endpoint route, or exploit of evaluator/source behavior. Endpoint observations require scope, date, evidence, and revalidation policy.

Promotion decisions and validation summaries should be public to the operator; evaluator-private evidence remains separately sealed. Security findings use private reporting rather than entering reusable agent memory.

## 14. Risks and mitigations

| Risk | Consequence | Mitigation/gate |
| --- | --- | --- |
| Session substrate becomes a competing Codex workflow engine | Split authority and inconsistent completion | Goal attachment contract; package reports execution state; Codex remains external goal authority; Phase 5 compatibility tests. |
| Durable history leaks bulk data or hidden reasoning | Privacy/context growth and contamination | Typed bounded public events, artifact indirection, no chain-of-thought retention, private/public projections, quotas. |
| Recovery replays external effects | Duplicate requests or false evidence | Event commit ordering, indeterminate states, no automatic live reacquisition, idempotent recovery plans. |
| Generic memory flattens RDF semantics | Lost graph roles/provenance and brittle templates | First-class RDF artifact types, native L2 handles, role/evidence links, neuro-symbolic non-inferiority gate. |
| Recursive children evade budgets | Misleading evaluation and resource exhaustion | Root IDs, sub-budget reservation, unique leaf facts, depth/width/lease limits, descendant gate. |
| Messages become capability or prompt-injection channels | Authority escalation or learned malicious instructions | Data-only schemas, no tokens/paths, bounded bodies, trust labels, no automatic promotion/execution. |
| Event hash chain is mistaken for attestation | Overstated integrity | Label it tamper-evident local evidence only; make external signing an explicit future decision. |
| Endpoint drift confounds harness evaluation | Incorrect model/harness conclusions | Same-window controls, drift classification, frozen source metadata, synthetic replay layer. |
| Refinement preserves a successful exploit | Durable policy violation | Immutable policy, quarantine, independent validation, non-widening diff, explicit promotion, rollback. |
| Durable artifacts expand filesystem attack surface | Path escape, overwrite, corruption | Parent-owned confined roots, content addressing, atomic no-overwrite writes, symlink/race/corruption tests. |
| Schema/version churn strands sessions | Unrecoverable history | Append-only raw events, upgraded materialized views, pinned readers, explicit degraded recovery. |

## 15. Open research questions

These are unresolved decisions, not implicit implementation latitude:

1. What daemon process model fits Codex Desktop ownership without creating a second user-facing task manager?
2. Should the durable root be project-local `artifacts/harness/`, a configured user-local store, or split metadata/artifact roots? The answer must preserve controlled exports and evaluator isolation.
3. Which durability guarantee is required per event class: buffered append, fsync per event, grouped commit, or terminal/checkpoint-only sync?
4. How much JavaScript state is safely serializable? The default should be explicit JSON/context/artifact types, not general heap snapshots.
5. What canonical RDF dataset algorithm/format is stable enough for content identity while preserving named graphs and blank-node semantics?
6. Should `rlm.query()` become a durable child compatibility wrapper or remain a distinct lightweight primitive?
7. What caller contract exposes Codex task/goal IDs and model usage without coupling the package to one host version?
8. How are provider token/cache/cost facts normalized across providers without erasing missing telemetry?
9. What exactly-once claims are defensible for schedule admission and message delivery under crash recovery?
10. Which gate diagnostics can be public without leaking evaluator-private solution structure?
11. Who may promote session-local declarative memory, global memory, worker specs, and executable skills? Global/executable authority should be strictly narrower.
12. Can independent automated validation ever be sufficient for promotion, or is human approval always required for executable/global objects?
13. How should stale ontology/source claims expire and be revalidated without turning memory retrieval into automatic live access?
14. Which session events belong in the existing experiment-result registry versus the harness store, and how are cross-references validated without duplication?

## 16. Decision log

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| D-001 | `LA3D/linked-science-cloud` is the sole canonical implementation repository. | Accepted by user | Prevents ownership drift and dependency on an experimental sibling. |
| D-002 | `packages/cleanroom-node-repl` owns the durable harness substrate. | Accepted by user | It already owns the clean-room host, child, broker, and production MCP boundary. |
| D-003 | The sibling `node-repl-network-probe` is spike/capture-only under explicit authorization. | Accepted by user | Historical experiments must not become production source. |
| D-004 | Adopt Prime Agent mechanisms selectively; do not port its runtime or user-permission trust model. | Accepted for plan | Linked Science has stronger semantic and capability boundaries. |
| D-005 | Preserve exactly three MCP tools through early phases. | Proposed; strong default | Existing tests and runtime discovery depend on this boundary; new features fit typed child/host adapters. |
| D-006 | Host owns L3 and all durable filesystem writes; child never gains ambient write access. | Proposed; required invariant | Extends the current broker trust boundary. |
| D-007 | Session event log is distinct from PEEK, native handles, display models, task briefs, and experiment results. | Proposed; required invariant | Prevents category errors and false recovery claims. |
| D-008 | Codex remains overall goal authority; package goals are attached execution records. | Proposed; required compatibility | Preserves the current goal-loop dossier's central decision. |
| D-009 | Durable children replace or complement one-shot `rlm.query`; exact compatibility route remains open until Phase 3 evidence. | Open | Needs same-provider latency, recovery, and accounting comparison. |
| D-010 | Base policy/capability profiles are immutable and excluded from refinement. | Proposed; required safety gate | Factorio demonstrates why objective success cannot authorize persistent capability changes. |
| D-011 | Executable skills and worker specs require quarantine, independent validation, and explicit promotion. | Proposed; required safety gate | Prevents trajectory-to-execution privilege escalation. |
| D-012 | L3 store placement, fsync policy, RDF canonicalization, and promotion roles remain explicit open decisions. | Open | Local evidence does not yet support one safe choice. |

## 17. Recommended first implementation slice

The first worktree should implement **Phase 0 only**, small enough to review and merge independently:

1. Add `packages/cleanroom-node-repl/docs/durable-harness-architecture.md` containing the accepted ownership, L0-L3, compatibility, and trust-boundary decisions from this plan.
2. Add black-box characterization tests for current singleton `KernelBroker` lifecycle, request serialization, epoch replacement, PEEK survival, traversal abort on owner loss, one-shot RLM behavior, child-global absence, and bootstrap/private traversal integration. Prefer fixtures around existing public exports; do not add runtime behavior.
3. Add a normalized baseline contract fixture under `packages/cleanroom-node-repl/test/fixtures/` for the three MCP tools, server/package/runtime versions, child action-space descriptors, and reset semantics.
4. Extend repository-boundary validation to include future package `schema/` and docs/import surfaces and an explicit assertion that production code cannot reference the sibling repository or evaluator-private roots.
5. Run `npm test`, `npm run smoke`, `npm run cleanroom:check`, `git diff --check`, a repository-relative Markdown-link check, and inspect the full diff.

This slice changes documentation, tests, and governance only. It creates no session store, daemon, artifact, live request, export, dependency, or new tool. Its completion gate is a frozen executable baseline from which Phase 1 can extract the supervisor/store seams without guessing or accidentally weakening the current semantic and security contracts.

## 18. Required handoff for every later slice

Each phase task records:

- starting commit, worktree/branch, changed modules/schemas, focused commits, local-main reachability, upstream status, and uncommitted state;
- commands run and exact pass/fail outcomes;
- schema/API versions and migration/compatibility behavior;
- synthetic receipts/artifacts and experiment-registry entries when an intentional run produced them;
- untested live, provider, evaluator, durability, or platform boundaries and why;
- phase acceptance evidence, stop/go decision, open risks, and exact next action; and
- confirmation that no raw Fetch, sibling dependency, evaluator leak, capability widening, hidden retry, or unsupported scientific claim was introduced.

Methodology and result evidence remain separate. Before an intentional run loses resident state, capture its compact receipt under `artifacts/`, register an experiment result when required by project policy, and run `npm run evaluation:results:validate`. A prose reconstruction is labeled `retrospective-summary` and names every missing field.

## 19. Required Prime fidelity review by a Sol Max reviewer

Before approving Phase 0 as the complete architectural baseline, and again before promoting Phase 7 beyond research use, assign a dedicated **GPT-5.6 Sol reviewer at max reasoning effort**. The reviewer is independent of the implementing task and receives this plan, the exact Linked Science commit, and read-only access to the current Prime Agent primary sources. If that exact model/reasoning combination is unavailable, record the substitution and treat fidelity approval as provisional rather than silently weakening the requirement.

The reviewer must inspect the Prime paper and actual repository implementation, not rely on this plan's summary, product prose, or secondary commentary. At minimum, pin access date and repository revision/tag when discoverable and inspect:

- [Prime Agent paper sections 2.1-2.6 and Factorio analysis](https://arxiv.org/html/2608.23552);
- [Prime Agent repository README](https://github.com/PrimeIntellect-ai/prime-agent);
- [compaction implementation documentation](https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/compaction.md) and the referenced `compaction.ts`, `session-manager.ts`, branch summarization, and tests;
- [long-running agent documentation](https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/long-running-agents.md) and the actual daemon/session, goal, schedule, heartbeat, autonomous, gate, retry, and accounting sources/tests it references;
- [refinement implementation](https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/src/core/refinement/refinement.ts) and its prompt assembly, turn-boundary edit, snapshot/rollback, local/global-scope, and validation tests;
- [persistent RLM harness state](https://github.com/PrimeIntellect-ai/prime-agent/blob/main/prime-agent-runtime/src/rlm/harness.py), including entry/refinement fields, CRUD, skill reference/arguments, persistence, local/global routing, concurrent host/kernel write handling, and error behavior;
- actual RLM child-session, direct-message, agent-observe/attach, event-history, kernel snapshot, recovery, and root-descendant resource-accounting implementations and tests.

### 19.1 Review matrix

The reviewer produces a mechanism-by-mechanism matrix with these columns:

1. Prime paper claim and exact section;
2. Prime repository file/symbol/test and observed behavior;
3. Linked Science current baseline file/symbol/test;
4. this plan's target section/phase/schema/API;
5. disposition: `adopt`, `adapt`, or `reject`;
6. exact semantic/security difference and justification;
7. executable acceptance evidence and stop/go gate;
8. status: `covered`, `justified-divergence`, `unresolved`, or `missing`.

The matrix must classify every item below; no item may be marked covered by implication:

- L0-L3 state visibility, access, persistence, and transition mechanisms;
- persistent REPL state and agentic L2 garbage collection;
- context as data, programmatic search/transform/aggregate, selective serialization, and readable bulk context;
- append-only event history, branches/forks, compaction summaries, exact original-event recovery, kernel snapshots, and recreation of non-serializable values;
- daemon ownership, running/idle/inactive state, detach/attach, same-identity recovery, human observation/intervention, and client independence;
- recursive child admission returning stable asynchronous handles, independent child context/kernel/history, parent/child/sibling topology, follow-up, cancellation, and retained results;
- durable family-scoped message queues and bounded observe/message behavior;
- prompt notes, factual memories, executable skills, and reusable subagent/worker specs as distinct typed state;
- local/global scope, CRUD/versioning, direct agent edits, background `/refine`, relevant-event selection, turn-boundary application, supplemental prompt assembly, provenance, snapshots, and rollback;
- autonomous continuations, goals, heartbeats, schedules, retry policy, completion/end-condition gates, and limit-exhaustion semantics;
- evaluation configuration binding model/provider, tools, compaction/refinement/retry/gates/budgets;
- event linkage for model/tool calls, messages, interventions, retries, verifier results, harness edits, tokens/time/cost, and root-plus-descendant accounting;
- Agents View-equivalent operator inspectability, even if Linked Science deliberately leaves the UI to Codex;
- Factorio's destructive reset recovery and the exploit retained as a skill, plus Linked Science's least-privilege, independent-validation, quarantine, promotion, and rollback response;
- every semantic-web extension in Sections 6, 11, and 12: typed RDF context, provenance, graph roles, mediated traversal, scientific repair, evaluator-private gating, contamination, and prompt-projection accounting.

### 19.2 Review acceptance gate

Review passes only when:

- there are zero `missing` and zero unowned `unresolved` Prime mechanisms;
- every `adapt` or `reject` has a concrete Linked Science invariant, test, and decision-log entry rather than a preference-only rationale;
- Sections 6 and 12 are compared against actual Prime context/compaction/refinement code and tests, not only paper-level concepts;
- proposed APIs do not invent already-available local behavior, and all baseline claims are verified against this repository;
- all safety divergences are equal or stricter than the current clean-room boundary;
- semantic-web behavior is demonstrably preserved rather than represented solely as generic prompt memory;
- any Prime repository behavior that differs from the paper is recorded as an implementation observation, with the plan choosing deliberately between paper intent and source behavior;
- the reviewer lists concrete amendments or explicitly states that no amendment is required.

Any failure leaves the relevant phase at stop. Amendments return through a focused PLAN/decision update before runtime implementation proceeds. The review itself is methodology evidence; any later implementation claim still requires local tests and, where applicable, separately authorized experiments.
