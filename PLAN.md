# Prime-inspired durable Linked Science harness research plan

**Status:** Proposed implementation plan; no runtime phase is authorized by this document.

**Canonical repository:** `LA3D/linked-science-cloud`

**Owning package:** `packages/cleanroom-node-repl`

**Baseline:** local `main` at `3a440b5` (`Simplify Linked Science persistent harness`), inspected 2026-08-27

**Primary references:** [Prime Agent paper](https://arxiv.org/abs/2608.23552), [Prime Agent repository](https://github.com/PrimeIntellect-ai/prime-agent), and its [persistent harness-state implementation](https://github.com/PrimeIntellect-ai/prime-agent/blob/main/prime-agent-runtime/src/rlm/harness.py)

**Authorization boundary:** this revision authorizes planning and the Phase 0 governance/characterization slice only. Runtime Phases 1-7 remain unauthorized until every Phase 0 architecture decision record (ADR), static/deployed boundary check, independent fixture review, and the Section 19 Prime-fidelity gate pass. Passing one prerequisite does not imply authorization for the next phase.

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
- Opt-in execution-goal records, caller-admitted scheduled or heartbeat continuations, autonomous bounds, and independently evaluated completion gates. These records attach to, and never compete with, the caller's top-level goal/task graph.
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
| Automatic trajectory-to-executable promotion (not a claim about Prime's current CRUD implementation) | **Reject** | Factorio shows that goal success can justify unsafe reusable guidance under broad authority. No Linked Science trajectory can directly promote executable code or a capability-bearing worker spec. |
| Harness strategy encoded as domain-specific shortcuts | **Reject** | No memorized SPARQL templates, endpoint paths, expected answers, or evaluator mappings in generic memory/skills. Source-owned evidence must ground each scientific action. |
| User-permission execution model | **Reject for the worker** | Prime Agent warns its worker is not a security sandbox. Linked Science retains the Node permission boundary and parent-mediated capabilities. |
| Full conversation/history as automatically reusable memory | **Reject** | History is evidence for review. Only explicit bounded serialization or promoted typed memory may re-enter L1; contamination and prompt-injection audits apply. |
| Branches within a session, forks/clones into new sessions, and branch summaries | **Adapt** | Preserve Prime's distinctions: a branch shares one session log/tree, while a fork/clone creates a new durable session and lineage. Summaries are lossy projections with exact source-event links; they never replace evidence. |
| Operator observation, attach/detach, steering, follow-up, and cancellation | **Adopt through a bounded adapter** | A Codex/operator adapter may list status and recent public events, attach/detach observers, steer or queue follow-up, cancel, and inspect recovery plans. It conveys operator intent but never grants a worker new tools, paths, budgets, or authority. |
| Daemon wire protocol, capability negotiation, generations, and cursors | **Adopt** | Use an authenticated local versioned protocol with negotiated capabilities, stable client/command IDs, generation-aware cursors, bounded snapshots, and typed unsupported/uncertain responses. Do not couple child APIs to transport internals. |
| Single-writer leases and idempotent commands | **Adopt** | One root-tree worker holds the durable lease. Every mutating command has a host-derived admission order and idempotency key; uncertain external effects are recorded and are never replayed automatically. |
| Bounded recovery retries and supervisor adoption | **Adapt** | Adopt finite retry and adoption semantics, but require exact authority/policy pins and an operator-readable recovery plan. Exhaustion is terminal/degraded, not an unbounded daemon loop. |
| Family topology, retained children, and busy-child steering/follow-up | **Adopt with bounds** | Retain child identities/results after completion under retention policy. Family reach is host-validated; steering a busy child affects its current turn only when supported, while follow-up queues a later turn. Both are durable, bounded commands. |
| Agentic L2 garbage collection | **Adapt** | Release unpinned resident values without deleting L3 descriptors/evidence. Scientific and gate dependencies remain pinned, and rematerialization creates fresh epoch-local identities. |
| Evaluation-configuration binding | **Adopt and strengthen** | Bind model/provider, tools, compaction, branch summary, refinement, retry, gate, budget, context-projection, and semantic-codec versions in one immutable evaluation manifest. Private configuration is committed separately from worker-visible configuration. |

## 5. Target architecture and state ownership

### 5.1 Component boundaries

```text
Codex / operator / evaluator
          |
          | existing three-tool MCP + bounded caller/operator contract
          v
packages/cleanroom-node-repl (trusted host)
  LocalProtocolServer ---- CodexOperatorAdapter
          |
  SessionSupervisor ---- CommandJournal ---- EventStore ---- ArtifactStore
       |       |                  |                |
       |       +---- ResourceLedger               +-- immutable blobs/manifests
       |       +---- GoalScheduler / Gates
       |       +---- MessageBroker / ChildSessionRegistry
       |       +---- ContextRegistry / ProjectionManager / CompactionManager
       |       +---- HarnessRegistry / host-only quarantine / promotion
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

- Own session IDs, root-tree admission/commit order, durable paths, transactional writes, schemas, migrations, supervisor state, cancellation, schedules, gates, message routing, accounting, context descriptors, child-session prompt projection/compaction, and capability profiles.
- Start children with the existing Node permission model, mint session/epoch tokens, and deny unknown host calls.
- Persist only bounded event payloads and explicit artifacts; store digests/references for bulk data.
- Keep evaluator-private data and promotion credentials outside worker-readable roots.
- Observe caller/root context or compaction only through the versioned caller contract. The package never claims ownership of Codex/provider prompt assembly, hidden context, or root L1 compaction.

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
| **L1** | Current invocation tokens, tool-visible bounded outputs, selected context slices, active goal/gate summary | Caller/Codex owns root invocations; the package owns prompt assembly only for package-created child invocations under an explicit provider adapter | Ephemeral per invocation. Caller-owned compaction is observable only through `caller-context-contract@1`; package child compaction uses `ProjectionManager` and `CompactionManager`. The package retains public projection/usage facts, never hidden chain of thought or uncontrolled full context. |
| **L2** | Live JavaScript bindings; RLM registered contexts; linkedScience workspaces; native RDF/JS datasets/results; traversal sessions; active child handles and mailboxes | Restricted child kernel for values; trusted host for capabilities and child/session registry | Survives calls while kernel lives. Checkpoints are explicit and typed. Kernel loss invalidates native handles; recovery creates new epochs and fresh handles from authorized artifacts/source routes. |
| **L3** | Append-only session/events, content-addressed artifacts, checkpoints, messages, goal/schedule/gate records, accounting facts, typed harness versions, promotion/rollback receipts | Trusted `packages/cleanroom-node-repl` host and evaluator-private store where applicable | Durable, versioned, bounded, provenance-bearing. Worker access is selective and policy-filtered. L3 is not automatically serialized into L1 or executable in L2. |

Cross-level invariants:

- Every L2-to-L3 transition is explicit, typed, receipted, and bounded.
- Every L3-to-L2 restoration records the source version/digest and creates a new L2 identity/epoch.
- Every L3-to-L1 projection is selective, bounded, and records which public fields were exposed.
- A handle reference in L1/L3 proves identity and lineage only; `results.profile()` or a restoration receipt proves current residency.
- A source failure, empty result, or evaluator gate failure keeps its exact scope and time window.

### 5.3 Caller context and compaction ownership

Compaction has two deliberately different ownership paths:

1. **Caller/root observation.** Codex or another caller owns the root model's L1 construction and compaction. The package may accept a `caller-context-contract@1` at session admission and later `caller.context.observed` / `caller.compaction.observed` notices. Those notices are claims by an authenticated caller, not package-authored summaries. Without the contract, caller L1 fields are `unobserved`, root prompt token cost is whatever the provider receipt reports, and the package must not promise exact root-context reconstruction.
2. **Package-owned child compaction.** When the package invokes a model for a durable child through a configured provider adapter, `ContextRegistry` owns addressable L2/L3 descriptors, `ProjectionManager` owns the exact package-generated child prompt projection, and `CompactionManager` may replace a child event prefix in the next child projection with a summary. The event prefix remains in L3. A child provider that cannot report the required projection/usage contract disables package-owned compaction rather than silently approximating it.

`caller-context-contract@1` binds caller identity and task/root IDs; supported observation verbs; public event visibility; provider/model/tokenizer IDs when observable; whether input/cache/output usage is reported; caller compaction IDs, source ranges, retained boundary, summary digest and token counts it is willing to disclose; protocol version; and confidentiality/taint rules. Caller identity is transport-derived and cannot be supplied by a worker payload. A contract may narrow capabilities after negotiation but cannot widen the immutable session profile.

Ownership is explicit in every record:

- `owner: caller` means the package stores only the caller's bounded observation and cannot replay or validate hidden prompt contents.
- `owner: package-child` means a committed `prompt-projection@1` identifies every package-controlled public input and a committed `compaction-record@1` identifies its exact L3 source range.
- `owner: provider` is used only for provider-managed transformations exposed through a documented provider receipt; the unexposed payload remains `unobserved`.

Required failure states are `caller-contract-absent`, `caller-capability-unsupported`, `projection-rejected`, `projection-expired`, `compaction-source-missing`, `compaction-provider-failed`, `compaction-validation-failed`, `compaction-retry-exhausted`, `usage-unobserved`, and `recovery-not-reconstructable`. Failure never triggers unbounded retry or a larger projection by default.

### 5.4 Write-ahead command transaction contract

All mutations that can span the event log, artifact store, context registry, message/schedule state, resource ledger, or terminal state run through `CommandJournal`; direct multi-store writes are forbidden. A `command-envelope@1` carries a host-minted `commandId`, caller-scoped idempotency key, authenticated actor, root/session, causal parent IDs, root admission order, expected generation/lease, effect class, requested operation digest, and finite deadline. Reusing an idempotency key with a different digest is a conflict.

The required durability order is:

1. acquire/verify the root-tree single-writer lease and allocate root admission order;
2. append `prepared` to the command journal using canonical UTF-8 JSON, flush the file, and make the journal-head/length checkpoint durable;
3. write artifact/context/manifest candidates to root-confined temporary names, flush each file, and flush the containing directory;
4. perform any allowed external effect only after `prepared`; append and flush an observed effect receipt or `uncertain` before further publication when outcome cannot be proved;
5. publish staged immutable files with no-overwrite atomic rename and flush directories;
6. append the transaction's event batch—including context state and any terminal-state candidate—to the session log, flush it, then atomically replace and flush the anchored event head/length checkpoint;
7. append and flush `committed` in the command journal, then atomically update its anchored head/length checkpoint and idempotency index. Only now may an API return committed success.

`prepared`, `committed`, `aborted`, and `uncertain` are durable command states. Recovery reconciles by command and transaction IDs:

- a prepared, effect-free command with no published state may be aborted or retried with the same key;
- a durable domain batch whose final journal commit is missing is finalized from its exact transaction ID, never re-executed;
- an external or provider effect with unknown outcome becomes `uncertain`, blocks dependent terminal success, and is never automatically replayed even if the operation claims idempotence;
- staged or renamed orphans are quarantined and reconciled against manifests/events before retention-based deletion; absence from an index is not permission to delete;
- terminal state is authoritative only after its event batch and anchored head are durable. A journal commit without a valid domain head is corruption, not success.

Crash injection is mandatory after every append, flush, temporary-file write, directory flush, rename, external-effect boundary, head update, and terminal-state boundary. Tests cover repeat invocation with the same/different idempotency key, orphan adoption, effect uncertainty, event/artifact/context atomic visibility, and recovery after the process dies between domain commit and journal commit.

Event integrity uses per-event digest chaining plus separately written anchored `{sessionId,generation,length,lastEventId,lastDigest}` checkpoints. Tests must detect interior mutation, reorder, torn tail, and rollback behind an anchor; distinguish a clean unanchored suffix truncation that can be safely discarded from a committed prefix; reject coordinated log-plus-head rollback when a retained anchor outside the rollback set proves the newer length; and demonstrate that coordinated rollback is otherwise not detectable from rewritten local copies alone. Local anchors are tamper-evidence, not external attestation; resistance to a privileged actor rewriting every local copy requires a separately authorized signature/transparency anchor.

### 5.5 Daemon, lease, protocol, and operator boundary

The target topology is one trusted local supervisor process, one single-writer worker process per admitted root tree, and one restricted kernel per active session. The supervisor owns the session catalog, root-worker leases, routing, protocol authentication, observer attachments, health, and adoption; a root worker owns its root plus all descendant session execution. Two workers may never commit under the same root generation.

The initial transport is a local user-private Unix-domain socket (or the platform-equivalent named pipe) with filesystem owner permissions plus a supervisor-minted, rotating bearer credential stored outside worker-readable roots. The wire protocol is framed/versioned JSON with capability negotiation, maximum frame/queue sizes, stable client and command IDs, root/session generations, and `{generation, sequence}` cursors. Unsupported versions/capabilities fail closed. Reconnect returns a bounded snapshot followed by events after a cursor; a stale generation requires explicit resynchronization.

`CodexOperatorAdapter` exposes only `listSessions`, `status`, `recentPublicEvents`, `attach`, `detach`, `steer`, `followUp`, `cancel`, and `inspectRecoveryPlan`. List/status/events are bounded and public-projection only. Attach/detach changes observation, not execution or budget. `steer` is admitted only for a currently busy supported child turn; `followUp` queues one later bounded turn. Both are durable idempotent commands with host-derived actor identity. Cancel is scoped to the named session/root policy. None of these calls installs tools, changes capability profiles, injects evaluator data, increases budgets, or gives the child access to the daemon socket.

Root workers renew finite leases. After supervisor restart, adoption requires matching root/session generation, repository/policy/configuration pins, unexpired or safely reacquired lease, and a verified journal/log head. Graceful shutdown rejects new admissions, durably records intent, drains or interrupts within a bound, releases leases, and reports remaining uncertain effects. Unexpected loss uses at most three initial recovery attempts (250 ms, 1 s, 5 s); exhaustion becomes `recovery-failed` until explicit operator action. Phase 0 must accept or replace these concrete defaults in an ADR before implementation.

### 5.6 Causal and concurrent ordering

Wall-clock timestamps are diagnostic only. Each admitted root-tree command receives a monotonic `rootAdmissionOrder`; each committed transaction receives `rootCommitOrder`; session events retain per-session sequence and a causal ID set linking command, invocation, parent/child, message, scientific attempt, artifact, and effect receipts. Concurrent descendants may commit in a different order from admission, so replay and accounting use causal IDs plus root commit order—not timestamps—to construct a deterministic partial order. Cross-root transfers create a receiving-root admission event that cites the source grant; they do not merge writer domains.

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

Add `semantic-context-object@1` as an L3 descriptor managed by the trusted host's `ContextRegistry`. The descriptor is not necessarily a new physical copy. It points to an immutable artifact, exact event range, or active L2 handle and states how the object may be observed or recreated. Phase 1 admits only bounded generic JSON/UTF-8 values and opaque descriptors; RDF dataset, ontology/schema excerpt, SPARQL result, provenance-bundle, and query-plan codecs remain unavailable until Phase 6 supplies their semantic validators, canonicalization rules, and acceptance tests. Calling a generic object `rdf-dataset` before that gate is a schema error.

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
nodeRepl.context.register({ kind, valueOrHandle, descriptor, retention })
nodeRepl.context.describe(contextObjectId)
nodeRepl.context.search(contextObjectId, { query, limit, maxBytes })
nodeRepl.context.slice(contextObjectId, { selector, limit, maxBytes })
nodeRepl.context.aggregate(contextObjectId, { operation, groupBy, limit })
nodeRepl.context.project({ objects, selectors, audience, invocationId, maxTokens, maxBytes })
nodeRepl.context.serialize(contextObjectId, { codec, retention, reason })
nodeRepl.context.materialize(contextObjectId, { expectedKind })
nodeRepl.context.transfer({ contextObjectId, toSession, selector, purpose, expiresAt })
nodeRepl.context.release(contextObjectId, { reason })
```

These are the only verb names used by the child facade, schemas, and phases. Internally, `ContextRegistry` implements `register`, `describe`, `serialize`, `materialize`, `transfer`, and `release`; kind codecs implement bounded `search`, `slice`, and `aggregate`; `ProjectionManager` alone implements `project`. `CompactionManager` consumes committed projection/event IDs and never exposes a separate child mutation verb. The legacy `nodeRepl.rlm.registerContext/context/inspect/query` surface remains a compatibility adapter for kernel-local generic values until an explicit deprecation decision.

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

### 6.4 Compaction, branch summaries, and recovery levels

Package-owned compaction is an L1 operation only for package-created child invocations. Caller/root compaction is recorded as an observation under Section 5.3 and is never represented as package-owned. Neither path may mutate L2 native values or discard L3 events. `CompactionManager.compactChild({sessionId, sourceRange, retainedFrom, projectionPolicyVersion, budget})` first pins every source event/object/artifact dependency, asks `ProjectionManager` for the compaction invocation, records that provider invocation with role `compaction`, validates the summary, and transactionally commits a `compaction-record@1`. A failed attempt cannot advance the child's active compaction pointer.

A `compaction-record@1` stores:

- owner (`caller-observed` or `package-child`), exact first/last source event IDs and event digests, previous compaction record, first retained event ID, branch/session identity, and retention pins;
- the lossy summary text/digest when public, summarizer model/settings and invocation ID, custom instructions, structured semantic anchors, and token counts before/after when observable;
- every prompt projection/object/harness version summarized, important resident handle descriptors, and explicit reconstruction availability;
- files/artifacts/messages/goals/children mentioned, unresolved/blocked items, taint labels, and contamination audit result; and
- summary validation outcome, failure/retry events, and the command transaction that advanced—or refused to advance—the active pointer.

Branch summarization is separate from compaction. `CompactionManager.summarizeBranch({sessionId, abandonedHead, targetHead, commonAncestor, budget})` may create a `branch-summary@1` when navigation leaves a branch. It records both heads, the common ancestor, exact summarized event ranges, the provider role `branch-summary`, and the target projection that consumed it. Branch summaries never change the active compaction pointer. A branch remains within one session/event tree; a fork or clone creates a new session manifest and lineage edge.

The compacted child L1 contains the summary plus recent events and a bounded recovery index. Recovery claims have three levels:

- **exact event recovery:** the original immutable event envelope, bounded inline public payload, causal links, and verified anchored range remain readable exactly;
- **descriptor recovery:** the event's referenced schema, provenance, artifact/context descriptor, size/type/digest, and reconstruction class remain readable even when bulk payload bytes have expired; and
- **payload recovery:** the referenced artifact or recreatable bounded value remains available and verifies against its descriptor.

APIs report each level independently and return typed `payload-expired`, `descriptor-unavailable`, `not-reconstructable`, or `source-reacquisition-required` states; they never substitute a summary for missing evidence. Event envelopes are append-only under the selected session-log retention/archival policy; expiry applies to separately referenced bulk payloads and leaves a durable descriptor/tombstone. Gate inputs, mutation evidence, current projection dependencies, unacknowledged messages, active branch/compaction dependencies, and experiment-result references are pinned by named retention class through the decision they support. Any gate or claim requiring an expired payload becomes `not-scorable`, not inferred from a digest.

Exact retrieval uses event/object IDs against L3; the summary never becomes the only evidence for a scientific claim. Tool call/result pairs are not split; a scientific attempt, its final receipt, and handle-retention event remain causally connected. Compaction failures are bounded: three consecutive failures by default trip `compaction-retry-exhausted` rather than a self-amplifying loop. Retries are new provider invocations with role `compaction`, their own resource facts, and `retryOf` links.

Kernel persistence across compaction is mandatory. A kernel crash during/after compaction is a separate recovery path: the compaction record survives, L2 objects become stale, and artifact-backed objects may materialize under a new epoch. Crash tests cover death before provider dispatch, after dispatch with no receipt, after summary receipt, after validation, and before/after active-pointer commit; uncertain provider effects are not replayed automatically.

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
- Active scientific attempts, gate inputs, compaction/branch-summary source dependencies, unacknowledged message payloads, current prompt projections, and uncommitted artifacts are pinned. A gate manifest declares whether it needs exact events, descriptors, or payloads and may not outlive those pins.
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

Taint is orthogonal to RDF truth and to confidentiality. Minimum labels are `external-untrusted-data`, `model-synthesis`, `user-instruction`, `worker-message`, `executable`, `quarantined`, `benchmark-worker-visible`, `benchmark-contaminated`, and `evaluator-private`. Derived objects carry the union of input taints plus their derivation label. Only a host-configured declassification authority—never a worker, proposer, ordinary validator, or model—may remove a declassifiable label, and it must emit a host-authenticated `taint.declassified` receipt naming exact inputs, rule, reviewer, and new version. `evaluator-private` and benchmark contamination lineage are monotone and non-declassifiable; derived public diagnostics are newly created bounded objects, not declassified private objects.

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
| C1 — Address generic values | Phase 1 | Generic JSON/text descriptors and opaque refs survive host restart; semantic kinds are rejected; no native-handle false residency. |
| C2 — Operate generically | Phases 1-2 | The consistent verbs search/slice/aggregate/project/serialize/materialize/release pass deterministic generic tests and hard bounds; unsupported kind operations return typed errors. |
| C3 — Compact/project | Phase 2 contract; Phase 3 child integration | Caller observation and package-child ownership are distinguished; model-based Phase 2 tests cover child compaction/branch summaries, then Phase 3 connects only durable children. Exact source refs, kernel L2, provider use, and bounded failure are preserved. |
| C4 — Transfer | Phase 3 | Parent/child transfer creates fresh handles, preserves provenance/taint, denies cross-root/private/capability transfer, and survives detach/restart. |
| C5 — Semantic codecs | Phase 6 | RDF/ontology/SPARQL/provenance/query-plan kinds add codec-specific search/slice/aggregate/materialize tests without a parallel RDF engine. |
| C6 — Govern/GC | Phases 6-7 | Retention, release, materialization, tombstones, contamination, and harness retrieval work under quotas with no live reacquisition or instruction promotion by implication. |

Required evaluation fixtures include: a 100k-quad synthetic dataset searchable without projection; an ontology excerpt whose omitted term tests absence honesty; a 5k-row SPARQL result aggregated without bulk serialization; a provenance bundle spanning parent/child and restart; a query-plan revision after local repair; a message with prompt-injection text; compaction followed by exact event recovery; L2 release and artifact recreation; missing-artifact degradation; evaluator honeytokens; and projection accounting checked against a deterministic tokenizer fixture plus provider telemetry when available.

## 7. Proposed modules and APIs

Names below are concrete proposals, not implemented claims. Phase 0 may adjust filenames, but must preserve responsibilities.

### 7.1 Host modules under `packages/cleanroom-node-repl/src/`

| Proposed module | Responsibility | Initial interface |
| --- | --- | --- |
| `local-protocol-server.mjs` | Authenticated local wire protocol, capability/version negotiation, generations, cursors, bounded snapshots, and routing. | `listen()`, `negotiate()`, `dispatch()`, `snapshotAfter()`, `close()` |
| `codex-operator-adapter.mjs` | Caller contract and bounded operator observation/intervention without worker authority. | `admitCaller()`, `listSessions()`, `status()`, `recentPublicEvents()`, `attach()`, `detach()`, `steer()`, `followUp()`, `cancel()`, `inspectRecoveryPlan()` |
| `event-schema.mjs` | Versioned validation and bounded public/private projections for events. | `validateEventDraft()`, `upgradeEvent()`, `publicEventView()` |
| `command-journal.mjs` | Write-ahead command/transaction state, idempotency, uncertainty, commit reconciliation, and anchored heads. | `prepare()`, `recordEffect()`, `commit()`, `markUncertain()`, `lookupIdempotency()`, `reconcile()` |
| `session-store.mjs` | Phase-0-selected append-only canonical event encoding, session manifest/catalog, per-session sequence, root commit order, and anchored head/length checkpoints. | `createSession()`, `appendTransaction()`, `read({cursor,limit})`, `manifest()`, `verify()` |
| `artifact-store.mjs` | Root-confined, no-overwrite, content-addressed blobs and typed manifests; RDF dataset persistence is one artifact kind. | `put()`, `get()`, `list()`, `verify()`, `tombstone()` |
| `session-supervisor.mjs` | Extract kernel lifecycle from `KernelBroker`; own session state, process, epoch, leases, detach, reattach, recovery, and cancellation. | `start()`, `execute()`, `detach()`, `attach()`, `recover()`, `cancel()`, `status()` |
| `recovery-manager.mjs` | Verify logs/checkpoints, classify in-flight operations, restore allowed L2 state, invalidate stale handles. | `planRecovery()`, `applyRecovery()`, `auditRecovery()` |
| `context-registry.mjs` | Typed addressable descriptors, retention pins, transfer grants, materialization, and L2 release/GC. | `register()`, `describe()`, `serialize()`, `materialize()`, `transfer()`, `release()`, `collect()` |
| `projection-manager.mjs` | Deterministic bounded selection/rendering into package-owned child L1 and prompt-projection receipts. | `plan()`, `project()`, `recordProviderUsage()`, `verify()` |
| `compaction-manager.mjs` | Package-child compaction, branch summaries, active pointer, retention dependencies; caller compaction observations remain separate. | `compactChild()`, `summarizeBranch()`, `observeCallerCompaction()`, `recover()` |
| `child-session-registry.mjs` | Parent/child ancestry, worker-spec pinning, asynchronous result handles, terminal state, orphan policy. | `spawn()`, `status()`, `wait()`, `result()`, `cancel()` |
| `message-broker.mjs` | Durable family-scoped bounded mailboxes, host-derived sender, deduplication, attempts/failures, busy-target behavior, and restart recovery. | `send()`, `receive()`, `ack()`, `steer()`, `followUp()`, `listPeers()` |
| `resource-ledger.mjs` | Validate leaf usage facts and derive session/root/descendant rollups without double counting. | `record()`, `summary()`, `explain()` |
| `goal-scheduler.mjs` | Caller-admitted execution goals, progress records, schedule/heartbeat continuation leases, claims/delivery/observation/interruption. | `admitExecutionGoal()`, `recordProgress()`, `requestCompletion()`, `admitSchedule()`, `claimDue()`, `recordDelivery()`, `interrupt()` |
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

nodeRepl.context.register({ kind, valueOrHandle, descriptor, retention })
nodeRepl.context.describe(contextObjectId)
nodeRepl.context.search(contextObjectId, { query, limit, maxBytes })
nodeRepl.context.slice(contextObjectId, { selector, limit, maxBytes })
nodeRepl.context.aggregate(contextObjectId, { operation, groupBy, limit })
nodeRepl.context.project({ objects, selectors, audience, invocationId, maxTokens, maxBytes })
nodeRepl.context.serialize(contextObjectId, { codec, retention, reason })
nodeRepl.context.materialize(contextObjectId, { expectedKind })
nodeRepl.context.transfer({ contextObjectId, toSession, selector, purpose, expiresAt })
nodeRepl.context.release(contextObjectId, { reason })

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

All schemas carry `schema`, `version`, stable ID, applicable session/root IDs, causal IDs, producer role, and content digest. Security-relevant proposer/validator/promoter/sender/caller identities are derived from authenticated host process/session credentials and recorded by the host; payload fields with those names are ignored or rejected. Timestamps are descriptive and never establish causality. JSON Schema files should live under `packages/cleanroom-node-repl/schema/`; checked-in human-readable contracts live under `packages/cleanroom-node-repl/docs/`. Phase 0 chooses and test-vectors one canonical UTF-8 JSON encoding for digests and the durable framing format.

Minimum objects:

- `caller-context-contract@1`: transport-derived caller identity, caller task/root refs, observation capabilities, provider/tokenizer and usage visibility, supported root-compaction fields, public event policy, protocol generation, and negotiated limits. Absence means root L1/compaction is unobserved.
- `session-manifest@1`: session/root/parent IDs, branch/fork/clone lineage, repository commit, package/runtime/API/protocol versions, L0 identifiers when observable, immutable policy/capability/harness/evaluation pins, worker-visible root, evaluator-boundary record ID, lifecycle state, creation/closure metadata.
- `command-envelope@1`: command/transaction ID, caller-scoped idempotency key, host-derived actor, root/session and lease generation, request digest, effect class, causal IDs, root admission/commit orders, finite deadline, and `prepared|committed|aborted|uncertain` state.
- `session-event@1`: event ID, monotonic per-session sequence, root admission/commit order, kind, session/root/parent IDs, causal IDs, timestamp, bounded public payload, optional opaque private-record ID, producer, schema version, previous-event digest, and event digest. Worker views never receive a raw digest of private content.
- `artifact-manifest@1`: artifact ID/content digest, kind, media type, bytes/items, creator event, provenance/lineage, schema/runtime versions, confidentiality, retention/tombstone status.
- `semantic-context-object@1`: fields and lifecycle in Section 6.1, codec version, exact descriptor/payload recovery class, retention pins, operation support, and current session/epoch residency.
- `prompt-projection@1`: owner, recipient invocation and provider role, ordered object/event/harness refs and selectors, renderer/policy versions, rendered public digest/bytes/token estimate, provider-reported usage link, omissions, taint decisions, and transaction ID.
- `compaction-record@1`: owner, exact source range/digests, retained boundary, summary/provider/projection refs, branch or active-pointer semantics, token facts, dependency pins, validation, attempts, failure state, and transaction ID.
- `context-transfer@1`: host-derived sender, sender/recipient/root topology, exact object version, selector, purpose, expiry, taint/confidentiality, admission event, materialization status, and revocation.
- `resource-fact@1`: unique fact ID, resource kind/unit/quantity, subject session, root, parent, operation/attempt/exchange/retry IDs, provider source, measured/estimated status, start/end, and inclusion rule.
- `message@1`: host-derived sender, recipient, durable family/topology snapshot, kind (`request`, `result`, `progress`, `correction`, `steer`, `follow-up`), idempotency/dedup key, bounded body and object/evidence refs, attempts, queue/delivery/ack/failure state, and limits; control kinds require an authorized caller role.
- `execution-goal@1`, `continuation-lease@1`, `schedule@1`, and `gate-result-public@1`: caller attachment/admission, objective/progress, finite cumulative budgets, claim/delivery/observation/interruption state, independent gate identity, bounded public category, opaque private-record ID, and terminal reason. The sealed evaluator store separately owns `gate-result-private@1` and any keyed commitment; neither digest nor commitment key is worker-readable.
- `evaluation-configuration@1`: immutable public pins for repository, model/provider/settings, tools, worker/capability specs, projection, compaction, branch summary, retry, recursion, messaging, refinement, gates, semantic codecs and budgets, plus an opaque ID for separately sealed private evaluator configuration.
- `supplemental-prompt@1`: declarative text, scope, applicability, evidence, base policy digest, author/reviewer, status/version.
- `memory@1`: fact/strategy/inference separation, source evidence, applicability and expiry/revalidation, contamination classification, confidence, supersession.
- `skill-package@1`: immutable source bundle digest, entrypoints, declared effects, tests, dependencies, capability requirement, quarantine/promotion receipts. Never inline-importable before promotion.
- `worker-spec@1`: model constraints, allowed child adapters, capability profile reference, budgets, context-selection rules, gate reference, maximum descendants/depth, and harness pins.
- `mutation-receipt@1`: proposed diff, before/after snapshots, base/new digests, evidence events, validation configurations and runtime effect receipts, environment invariant results, host-derived proposer/validators/promoter, promotion authority, rollback/inverse target, and non-widening result.

Hash chaining plus anchored head/length checkpoints detects mutation relative to a retained anchor but is not itself external attestation. Optional signatures or transparency attestations are a later decision; schemas leave room for them without claiming protection when a privileged actor can rewrite every local copy.

### 7.4 Event kinds and lifecycle states

Initial event taxonomy:

- Command/protocol: `command.prepared`, `command.committed`, `command.aborted`, `command.uncertain`, `command.deduplicated`, `protocol.negotiated`, `protocol.rejected`, `lease.acquired`, `lease.renewed`, `lease.released`, `lease.lost`.
- Session/kernel/operator: `session.created`, `session.state.changed`, `session.detached`, `session.attached`, `session.closed`, `operator.attached`, `operator.detached`, `operator.steered`, `operator.follow-up.queued`, `operator.cancelled`, `kernel.starting`, `kernel.ready`, `kernel.replaced`, `kernel.exited`, `recovery.planned`, `recovery.completed`, `recovery.degraded`, `recovery.failed`.
- Invocation/provider: `invocation.admitted`, `invocation.started`, `invocation.completed`, `invocation.failed`, `invocation.uncertain`; every record names one provider role from Section 10.
- Context/projection/compaction: `context.registered`, `context.searched`, `context.sliced`, `context.aggregated`, `context.serialized`, `context.materialized`, `context.released`, `context.gc-collected`, `context.tombstoned`, `context.transfer.admitted`, `context.transfer.materialized`, `context.transfer.failed`, `projection.planned`, `projection.committed`, `projection.rejected`, `caller.context.observed`, `compaction.requested`, `compaction.completed`, `compaction.failed`, `compaction.retry-exhausted`, `caller.compaction.observed`, `checkpoint.created`, `checkpoint.verified`.
- Branch/fork: `branch.created`, `branch.switched`, `branch.summary.requested`, `branch.summary.completed`, `branch.summary.failed`, `session.forked`, `session.cloned`.
- Scientific state: `handle.retained`, `handle.invalidated`, `handle.artifact-backed`, `scientific.attempt.started`, `scientific.attempt.completed`, `repair.local`, `traversal.exchange`, `artifact.created`, `artifact.verified`, `artifact.tombstoned`.
- Recursive work/messages: `child.admission.requested`, `child.budget.reserved`, `child.spawned`, `child.state.changed`, `child.result.ready`, `child.retained`, `message.enqueued`, `message.deduplicated`, `message.delivery.attempted`, `message.delivered`, `message.acknowledged`, `message.failed`, `message.expired`.
- Continuation/stops: `execution-goal.admitted`, `execution-goal.progressed`, `execution-goal.completion.requested`, `execution-goal.completed`, `execution-goal.blocked`, `schedule.admitted`, `schedule.claimed`, `schedule.delivered`, `schedule.observed`, `schedule.interrupted`, `schedule.tick.coalesced`, `schedule.exhausted`, `gate.started`, `gate.passed`, `gate.failed`, `gate.error`, `stop.approval-needed`, `stop.insufficient-input`, `stop.limit-exhausted`.
- Governance: `policy.denied`, `taint.declassified`, `harness.proposed`, `harness.quarantined`, `harness.validated`, `harness.rejected`, `harness.promoted`, `harness.superseded`, `harness.rolled-back`, `resource.recorded`.

Lifecycle sets:

- Session execution: `created -> starting -> running <-> idle -> inactive|passivated`; recovery uses `recovering -> running|idle|degraded|failed`. Terminal states are `completed`, `failed`, and `cancelled`, with `archived` as later metadata. Observer attachment is an orthogonal `attached|detached` relation per client; detach never changes execution state or lease.
- Kernel: `absent -> starting -> ready -> busy -> ready`; replacement uses `terminating -> exited -> starting`. Unexpected exit becomes `crashed` before recovery.
- Child handle: `queued -> starting -> running -> waiting|completed|failed|cancelled`; `orphaned` is diagnostic and requires a configured parent-loss policy.
- Execution goal: `proposed -> caller-admitted -> active <-> paused`; `active -> completion-requested -> completed|active`; `active -> blocked|cancelled`. Budget exhaustion is a stop reason, not success, and no state mutates the caller's goal graph.
- Continuation/schedule: `proposed -> caller-admitted -> active <-> paused`; each tick uses `due -> claimed -> delivered -> observed|interrupted|uncertain`. Claim atomically advances/coalesces the schedule before delivery. Terminal states are `exhausted|cancelled|lease-expired`; missed ticks are coalesced by policy, never silently replayed.
- Message: `enqueued -> delivery-attempted -> delivered -> acknowledged`; bounded retry may return to `delivery-attempted`, while terminal alternatives are `failed|expired|cancelled|uncertain`. Deduplicated sends reference the existing message rather than creating a second lifecycle.
- Gate: `pending -> running -> passed|failed|error|timed-out`. Only `passed` can satisfy the gate, and only for the invariant it checks.
- Harness version: `proposed -> quarantined -> validated -> promoted|rejected`; promoted versions may become `superseded|rolled-back` but remain append-only.
- Command: `prepared -> committed|aborted|uncertain`; `uncertain` requires reconciliation or explicit operator disposition and can never transition by re-executing the effect automatically.

Unknown event kinds or state transitions fail closed. Migrations never rewrite old events; they materialize upgraded views and record the migration version.

### 7.5 Message and family-topology semantics

The host derives `senderSessionId` from the authenticated session channel; a body-supplied sender is rejected. A durable root-family topology snapshot defines allowed reach: parent to direct child, child to parent, and siblings only when their common parent/worker spec grants it. Cross-root messages are denied; completed retained children remain addressable for result/status reads but do not accept new turns unless an authorized continuation lease explicitly reactivates them.

`send` requires a sender-scoped idempotency key. The broker stores one logical message, returns the same ID for a same-digest retry, and rejects key reuse with different content. Delivery is at-least-once-attempted but processing is deduplicated by message ID; exactly-once model effect is not claimed. Each attempt records cause, target generation, queue position, outcome, and failure category. Restart reconstructs queued/unacknowledged messages from committed journal/events and never repeats a message whose effect is uncertain without operator disposition.

Phase 0 ADRs set per-message bytes, evidence-reference count, per-session queue length/bytes, sender rate, delivery-attempt count, expiry, and total family mailbox quota. Overflow, expiry, unavailable target, stale generation, policy denial, and attempt exhaustion produce typed failures. For a busy target, ordinary messages and `follow-up` queue behind the active turn; `steer` may be injected only through a provider/session adapter that advertises safe current-turn steering, otherwise it returns `busy-steer-unsupported`. A queue never interrupts implicitly. Cancellation or terminal state retains messages and attempt receipts under policy but prevents new delivery.

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
11. Root/Codex L1 and compaction remain caller-owned unless a negotiated caller contract supplies bounded observations; package-child compaction alone is package-authored.
12. Every cross-store mutation is journaled before effects; an uncertain external/provider/message/schedule effect is never replayed automatically.
13. Caller, sender, proposer, validator, and promoter identities are authenticated and host-derived. Worker data cannot assert an authority identity.
14. Quarantine and evaluator-private stores are outside worker-readable, cwd, module, context, event-public, and promoted-bundle roots. A private digest is private metadata, not a safe public substitute.
15. Causality derives from causal IDs and root admission/commit ordering; timestamps cannot resolve concurrent descendant order.

## 9. Dependency-ordered implementation roadmap

Each phase is a separately reviewable worktree slice. Stop/go gates are cumulative: a failed invariant blocks later phases that depend on it.

### Phase 0 — Governance and characterization

**Deliverables**

- Add package-local ADRs under `packages/cleanroom-node-repl/docs/` that accept or replace, with testable rationale, every decision below:
  - one supervisor/one root-tree worker/one kernel-per-active-session topology; authenticated local transport; supervisor/root-worker ownership and adoption; session catalog and single-writer leases; protocol version/capability negotiation, generations, cursors, frame/queue bounds; three-attempt recovery retry; graceful/forced shutdown and orphan adoption;
  - caller/root versus package-child context and compaction ownership, including `caller-context-contract@1`, `ContextRegistry`, `ProjectionManager`, and `CompactionManager` boundaries;
  - branch/fork/clone semantics, branch summarization, retained children, busy-child steer/follow-up, and bounded operator adapter;
  - durable store root outside every worker-readable/module root; confinement; the root-tree concurrency model; canonical JSON/framing and digest test vectors; numerical per-store/per-session/object/event/message/context quotas; L2 and L3 retention/GC classes; and filesystem durability classes for ordinary events, external-effect receipts, anchored heads, checkpoints, and terminal states;
  - command transaction ordering, idempotency, uncertain effects, causal/root admission and commit ordering, clean suffix repair, and the limits of local hash-chain anchoring;
  - evaluation-configuration binding and all provider invocation roles; and
  - package execution goals/continuations as caller-admitted attachments rather than a top-level goal graph.
- Extract black-box characterization fixtures for current `KernelBroker`, child globals, PEEK reset survival, optional recursive query, traversal ownership, timeout replacement, error envelopes, bootstrap behavior, and all semantically distinct `js_reset`/error outcomes without changing production logic.
- Record a versioned golden baseline fixture containing public tool/API/capability descriptors and reset/error semantics; do not capture secrets or raw scientific data. A reviewer who did not author the fixture must independently derive expected behavior from source plus at least one black-box run. The test must not generate expected values by invoking the code under test, and semantically meaningful `reset`, `timeout`, `stale epoch`, `policy denial`, and `runtime error` classes must not be normalized into one oracle value.
- Extend `scripts/validate-repository-boundaries.mjs` and `test/repository-boundary.test.mjs` to cover future package `schema/`, daemon/protocol/config, quarantine/promoted-bundle, and docs/import surfaces while continuing to forbid sibling and evaluator-private production references.
- Produce the Section 19 mechanism matrix against pinned Prime paper/repository revisions. Every mechanism is classified `adopt`, `adapt`, or `reject`, linked to an ADR/test; zero unclassified mechanisms is mandatory.

**Implementation locations:** existing package tests; new `packages/cleanroom-node-repl/test/characterization/`; package docs/ADRs; root boundary validator/test. Phase 0 adds no durable daemon/store or other runtime behavior.

**Executable worktree and deployment gates:** run two distinct boundary checks; neither may be waived or weakened.

1. In any Codex worktree, run the current source/static validator with an in-memory relocation of only the checked-in MCP paths:

   ```sh
   node --input-type=module -e 'import { readFile } from "node:fs/promises"; import { validateRepositoryBoundaries } from "./scripts/validate-repository-boundaries.mjs"; const root = process.cwd(); let configText = await readFile(".codex/config.toml", "utf8"); configText = configText.replace(/^args\s*=.*$/mu, `args = [${JSON.stringify(`${root}/packages/cleanroom-node-repl/src/cleanroom-mcp.mjs`)}]`).replace(/^cwd\s*=.*$/mu, `cwd = ${JSON.stringify(root)}`); console.log(JSON.stringify(await validateRepositoryBoundaries({ root, configText })));'
   ```

   This proves source confinement, sibling denial, evaluator-root denial after Phase 0 adds it, symlink handling, and a self-contained relocated config. It does **not** prove that the installed Codex deployment points at this worktree.
2. In the saved authoritative checkout actually named by the installed `.codex/config.toml`, run `npm run boundaries:validate` without rewriting the config. Record its resolved root and production-file count. This proves installed deployment configuration only; it does not substitute for the worktree source check.

Use the checked-in `package-lock.json` as the dependency pin. If a clean worktree lacks `node_modules`, stop and obtain explicit dependency-install/network approval before running `npm ci`; do not symlink or borrow another checkout's dependency tree and do not report tests from another checkout as worktree test evidence. Until approval, the dependency-requiring gate is explicitly `not-run: approval-needed`. Documentation-only review may separately report unchanged-baseline tests from the authoritative checkout, clearly labeled as such.

**Invariants:** current three MCP tools, distinct error/reset contracts, raw-network denial, evaluator separation, token/epoch traversal ownership, and destructive L2 reset behavior remain compatible except for explicitly versioned additions. ADRs cannot authorize live access, a sibling dependency, worker-readable quarantine, or a second goal authority.

**Acceptance and tests:** `npm test`, `npm run smoke`, `npm run cleanroom:check`, direct package tests, both boundary gates above, Markdown/fence/link checks, and `git diff --check`; injected sibling/evaluator/private/quarantine imports and relocated-path escapes fail; no live requests. The independently reviewed characterization fixture is deterministic after normalization limited to documented non-semantic fields. Phase 0 also supplies executable state-machine/crash-model tests for the proposed journal boundaries before Phase 1 writes production state.

**Migration/compatibility:** none. This phase may refactor tests only after the independently reviewed baseline is frozen. Existing sessions remain ephemeral.

**Stop/go:** Phase 0 passes only when all ADRs above are accepted, both boundary modes pass, pinned dependencies are provisioned with authorization or explicitly stop the gate, the baseline is green, the golden fixture is independently approved, and Section 19 reports zero missing/unowned/unclassified mechanisms. Any unresolved store root, concurrency, encoding, quota, fsync/terminal durability, caller-compaction, daemon/protocol, lease/adoption, retry, or goal-ownership decision is a stop. **Runtime Phases 1-7 remain unauthorized until this entire gate passes and a later task is explicitly authorized.**

### Phase 1 — Durable session, event, and artifact foundations

**Deliverables**

- Implement `command-journal.mjs`, `event-schema.mjs`, `session-store.mjs`, `artifact-store.mjs`, and the generic `ContextRegistry` path using the Phase 0 store/framing/canonicalization/durability ADRs. Enforce configured host-owned roots, single writer, strict confinement, no-overwrite content identities, bounded reads/listing, checksums, quotas, anchored heads, and versioned manifests.
- Give the current implicit broker session a durable session/root ID and manifest while preserving one-session MCP behavior.
- Route lifecycle, invocation, kernel, policy-denial, PEEK-checkpoint, context, artifact, resource, and terminal state changes through the write-ahead transaction contract; no component may directly perform a cross-store mutation.
- Implement `semantic-context-object@1` for bounded generic JSON/UTF-8 values and opaque descriptors plus `prompt-projection@1` for deterministic generic child projections. Reject semantic kind names/codecs until Phase 6. Do not serialize arbitrary closures, modules, native RDF/JS engines, or hidden model state.
- Fold the deferred durable RDF dataset design into `artifact-store` as a later artifact codec, not a separate filesystem authority.

**Implementation locations:** command/store/schema/context/projection modules; `cleanroom-mcp.mjs` adapter; `repl-kernel-child.mjs` typed session/context adapter; JSON Schemas under `packages/cleanroom-node-repl/schema/`; tests under package test.

**Invariants:** parent-only writes; one root-tree writer generation; append-only events; prepare-before-effect and commit-after-durable-domain-head; terminal success is transactionally consistent with events/artifacts/context; uncertain effects are not replayed; explicit L2-to-L3 transitions; bulk payloads behind artifacts; hashes verified on read; no PEEK/event/artifact conflation; no evaluator-private content or private digest in public log.

**Acceptance and tests:** create/append/reopen and idempotency conflict; crash injection after every journal/event/artifact/context write, flush, directory flush, rename, anchored-head update, and terminal boundary; prepared/effect-free retry; observed-domain/no-journal-commit reconciliation; uncertain effect non-replay; orphan temp/rename handling; atomic visibility across all stores; interior mutation, reorder, torn-tail, clean unanchored suffix truncation, coordinated log/head rollback, and externally retained anchor tests; path traversal/symlink/race denial; quota/size/item limits; canonical encoding vectors; bounded pagination; stale schema/semantic-kind rejection; existing MCP and traversal suites unchanged.

**Migration/compatibility:** sessions created before this phase have no durable log and are labeled `legacy-ephemeral`; they are not fabricated retroactively. Existing PEEK checkpoint files may be imported only through an explicit typed migration event.

**Stop/go:** go only if a host restart can reconcile every injected boundary without starting a child, repeating an uncertain effect, exposing partial terminal state, or falsely restoring handles. Stop on any path escape, silent overwrite, undetected anchored rollback, log repair that rewrites committed evidence, or evaluator-private leakage.

### Phase 2 — Recovery and supervision

**Deliverables**

- Extract `SessionSupervisor` from `KernelBroker`; make `KernelBroker` the MCP compatibility adapter.
- Implement the Phase 0-selected local protocol server, supervisor/root-worker topology, session catalog, single-writer leases, capability negotiation, generations/cursors, detach/attach, crash classification, idempotent recovery planning, bounded retries, graceful cancellation/shutdown, adoption, and orphan handling.
- Implement `CodexOperatorAdapter` for bounded list/status/recent-public-events, attach/detach, current-turn steer when advertised, queued follow-up, cancel, and recovery-plan inspection. Prove it cannot mutate capability profiles, budgets, worker roots, tools, or evaluator visibility.
- Define checkpoints for serializable JavaScript context descriptors, RLM context registrations, PEEK maps, module-root declarations, and Linked Science artifact references. Native handles are descriptors until rematerialized.
- Implement all generic context verbs through `ContextRegistry`/`ProjectionManager`; implement the package-child `CompactionManager` state machine against a synthetic provider/session adapter, caller compaction observation, in-session branches, cross-session fork/clone lineage, and branch summaries. Root/Codex L1 remains caller-owned, and production package-child compaction stays disabled until Phase 3 has durable child sessions.
- On recovery, pin original versions/policy, start a new epoch/token, restore allowed context, mark old handles invalidated, and record degraded recovery when some state cannot be reconstructed.
- Reconcile in-flight operations: unknown model/tool completion, interrupted artifact commits, and active traversals become explicit indeterminate/aborted events, never inferred success.

**Implementation locations:** `session-supervisor.mjs`, `recovery-manager.mjs`, refactored `cleanroom-mcp.mjs`, child session adapter, recovery docs/tests.

**Invariants:** detach is not cancellation or budget reset; attach does not replay effects; one root generation has one writer; each recovered kernel has a new epoch/token; active traversal is aborted on owner loss; recovery never auto-reruns a live query/provider uncertainty; artifact-backed rematerialization is distinct from source reacquisition; caller/root compaction is never presented as package-owned; branch summary is not compaction; fork/clone is not an in-session branch.

**Acceptance and tests:** protocol negotiation downgrade/denial, stale cursor/generation, competing lease, supervisor restart/adoption, clean/forced shutdown, bounded recovery exhaustion; kill child/root worker/supervisor during idle/eval/traversal/artifact/context/projection/compaction and every compaction pointer boundary; repeat recovery idempotently; exact-event versus descriptor-only versus payload-expired recovery; old handles stale; PEEK stale until rematerialization; module roots confined; no duplicate external/provider effect; operator inspection and busy steer/follow-up/cancel behavior; branch switch/summary and fork/clone lineage; provider usage for child answer, compaction, and branch summary remains separately attributable.

**Migration/compatibility:** `js_reset` keeps its destructive L2 semantics but now writes reset/recovery events. The existing `KernelBroker` constructor remains usable for package tests during deprecation.

**Stop/go:** go only after a 100-cycle synthetic crash/recover soak has zero false completions, duplicate/uncertain effect executions, split-brain commits, context-owner ambiguity, or authority widening. Stop if safe status cannot distinguish `failed`, `aborted`, `uncertain`, `payload-expired`, and `not-reconstructable`, or if any operator action exposes new worker authority.

### Phase 3 — Recursive sessions and direct messaging

**Deliverables**

- Implement the minimum `resource-fact@1` path and root-tree budget authority before enabling child admission: record every model/provider invocation and existing scientific/mediator facts; reserve finite child token/time/request/artifact/message/depth/width budgets; atomically debit facts against the reservation; release only unused reservation; and deny spawn before any provider call when the root ceiling cannot cover it.
- Implement durable child-session registry, immutable `worker-spec@1`, asynchronous handles, ancestry/depth/width bounds, parent-loss policy, wait/result/cancel, and terminal result artifacts.
- Give every child its own restricted kernel, token, epoch, event stream, PEEK context, finite budgets, and policy pin; inherit only explicit public context/artifact references.
- Connect each durable child's provider adapter to `ProjectionManager` and the already-tested `CompactionManager`; pin its compaction/branch-summary settings and charge those provider roles to the same reserved root budget. Do not route caller/root compaction or legacy one-shot `rlm.query()` through this path by implication.
- Add the Section 7.5 bounded durable messaging contract: host-derived sender, family reach, topology snapshot, idempotency/dedup, attempts/failures, byte/rate/queue limits, busy-target steer/follow-up behavior, acknowledgement, expiry, and restart recovery. Messages cite evidence/events and carry no capabilities.
- Decide whether `nodeRepl.rlm.query()` becomes a compatibility wrapper over a short-lived child or remains a separate one-shot provider call. Record both arms in a same-provider characterization before choosing.
- Prevent deadlocks by disallowing unbounded mutual waits, enforcing wait leases, and recording dependency edges.

**Implementation locations:** child registry, message broker, worker-spec schema, supervisor hooks, child adapters, tests; no new Linked Science data facade.

**Invariants:** resource reservation and root-tree enforcement precede child/provider admission; child authority is equal or narrower; no shared mutable JavaScript heap or native handle registry across sessions; artifact/evidence transfer is explicit; sender identity is unforgeable and direct messages are bounded data; cancellation propagates by documented policy; evaluator-private references are not inheritable; a retained child remains in topology but cannot run without a new admitted lease.

**Acceptance and tests:** budget denial occurs before spawn/provider dispatch; reserve/debit/release survives crash without minting budget; parent spawns two synthetic children; detach/host restart preserves child identities and retained terminal results; child results become one durable result even when delivery is attempted more than once; forged sender and cross-root messages are denied; same-key/same-body send deduplicates and same-key/different-body conflicts; queue/rate/byte/attempt/expiry limits fail closed; busy-target steer-supported/unsupported and follow-up ordering are distinct; restart never replays an uncertain message effect; parent cancellation behavior covers running/waiting/completed/retained children; depth/width/timeout bounds fail closed.

**Migration/compatibility:** default CodeAct mode may still report recursive children unavailable until a model provider/session factory is configured. Current one-shot recursive tests remain until the Phase 3 decision is recorded.

**Stop/go:** go only if recursive execution cannot escape root policy, bypass pre-admission accounting, or become invisible to event history. Stop if a child can outlive its lease/accounting root, consume beyond reservation, access parent native handles, forge family identity, or transfer an authority-bearing object through messages.

### Phase 4 — Descendant-aware resource accounting

**Deliverables**

- Implement `resource-fact@1` and an event-derived ledger for root/session/descendant rollups.
- Instrument model usage when the provider supplies it, invocation wall time, model deliberation interval, kernel execution, harness wait/overhead, local repairs, scientific attempts, mediator requests/exchanges/bytes/time, explicit retries, artifacts, messages, and child usage.
- Generalize the Phase 3 reservation/debit/release path to scheduled continuations, gates, compaction, branch summary, and refinement/validation calls; unused reservation is not usage.
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

- Implement opt-in `execution-goal@1` records only after an authenticated Codex/caller admission names its caller task/goal reference, allowed operation, policy/configuration pins, budgets, gate, and terminal reporting contract. The package records execution progress; it never creates or links a competing top-level goal graph by inference.
- Implement finite `continuation-lease@1` and schedule/heartbeat records admitted by that caller. A due tick is durably claimed and its next due/coalesced state advances in the same transaction before provider delivery. Delivery, provider acceptance, worker observation, interruption, and terminal outcome are separate events. An uncertain delivery is not replayed automatically; the caller/operator must inspect and dispose it.
- Coalesce missed ticks to at most one policy-defined pending continuation carrying the missed interval/count; never replay a backlog as separate prompts. Pause/cancel/lease expiry prevents new claims but preserves receipts. Host restart resumes only admitted, unexpired leases under the same root generation and cumulative budget.
- Add autonomous limits for turns/invocations, provider tokens, root-tree usage, wall clock, active transport, scientific attempts, requests, artifacts, descendants, and consecutive failures.
- Implement independent gates with trusted host/evaluator code, bounded public diagnostics, opaque private-record IDs, sealed private result/keyed commitments inaccessible to workers, timeout, and no worker-selected gate command.
- Require explicit insufficient-input and approval-needed stop states instead of autonomous improvisation.

**Implementation locations:** goal scheduler, completion gates, supervisor continuation loop, schemas/docs/tests; evaluator integrations remain outside worker-readable root.

**Invariants:** no caller admission means no package continuation; execution goals do not grant capabilities or become parent goals; a schedule claim does not reset cumulative budget; heartbeat prompts cannot modify immutable policy; claims and uncertain deliveries are never replayed by inference; completion is requested by a worker and decided by gate plus authorized caller/host; blocked/limit-exhausted/interrupted/insufficient-input is not complete; private scoring, its digest, and commitment key never enter worker-visible L1/L2/L3-public.

**Acceptance and tests:** unadmitted goal/schedule is rejected; caller-attached execution record survives restart without changing caller status; concurrent workers cannot double-claim; crash before claim, after claim/before delivery, during delivery uncertainty, after observation, and during interruption preserves non-replay semantics; late ticks coalesce exactly per policy; pause/cancel/expiry blocks claims; a failed gate returns only an opaque record ID and bounded non-solution category while continuation stays within remaining budget; passing a narrow gate states its scope; approval-needed and insufficient-input paths stop without a live request.

**Migration/compatibility:** existing Codex-driven sessions continue without package scheduling. Goal/schedule APIs remain unavailable until the caller supplies and negotiates the attachment/continuation contract. Do not infer Codex completion from package state.

**Stop/go:** go only if each due tick has at most one durable claim, observation is explicit rather than assumed, missed ticks coalesce, uncertain delivery is not replayed, and continuations cannot expand authority or budget. Stop if the worker can select/modify its own gate, mark itself complete, or receive private reference details.

### Phase 6 — Semantic-web neuro-symbolic integration

**Deliverables**

- Add Linked Science event adapters that preserve `operationId`, handle ID/type/epoch, source/evidence handles, query/payload hashes, fingerprints, navigation evidence, traversal/attempt IDs, and receipt digests.
- Implement Phase-6-gated codecs and validators for RDF datasets, ontology/schema excerpts, SPARQL results, provenance bundles, query plans, operation receipts, and evidence documents, following `docs/tasks/durable-dataset-persistence.md`. Loading creates fresh native handles with `artifact-backed` provenance and never restores an old handle ID.
- Implement codec-specific `search`, `slice`, `aggregate`, `serialize`, and `materialize` behind the already-stable Section 6 API. Keep RDF evaluation in `linkedScience`/Communica rather than adding a parallel host query engine; preserve named graphs, RDF term types, result bag/order/truncation semantics, and exact evidence roles.
- Add explicit durable descriptors for ontology/schema/SHACL/instance/inferred graphs, query results, evidence packs, query-plan revisions, receipts, and scientific attempts; keep actual bulk RDF/results in artifacts or the active L2 registry.
- Preserve agentic graph-role discovery: worker specs may name resource roles and approved authority classes, but may not embed case-specific SPARQL, predicates, endpoint paths, or expected answers.
- Preserve scientific correction/retry semantics and carry provenance continuously across parent/child messages and artifact handoffs.
- Integrate evaluator-private competency gates and contamination auditing with the durable event projection.

**Implementation locations:** adapters in `lib/linked-science-runtime.mjs` and `lib/cleanroom-linked-science-bootstrap.mjs`; artifact codecs in the owning package; runtime API/schema/docs updates; synthetic fixtures and competency-evaluation tooling.

**Invariants:** declarative RDF/SPARQL plus programmatic CodeAct remain composable; semantic evidence is not reduced to prose memory; every live request remains mediated; an unavailable source/empty result retains exact scope; public worker context remains disjoint from private scoring; restored datasets are untrusted RDF data; PEEK stays compact orientation.

**Acceptance and tests:** ontology-driven discovery from synthetic source-owned RDF; multi-graph role reasoning; query construction and repair; a 100k-quad dataset searched/sliced without bulk projection; 5k-row results aggregated with preserved datatype/bag/truncation facts; handle reuse across calls; artifact save-reset/load with fresh handle; crash recovery and retention-expiry tests distinguish exact/descriptor/payload recovery; child-derived result cites parent evidence without sharing registries; stale/contradicted evidence, empty exact query, truncated result, source failure, and insufficient-input stops; context transfer, projection token accounting, boundary and honeytoken tests.

**Migration/compatibility:** current runtime 4.0.0 workspaces continue in ephemeral mode. New durable APIs are version-negotiated. Existing artifact receipts remain historical; no retrospective native-handle restoration is claimed.

**Stop/go:** go only after the dedicated neuro-symbolic evaluation in Section 11 shows no semantic regression against the ephemeral baseline. Stop if durability improves task completion by leaking templates/answers, bypassing grounding, or weakening mediator/evaluator boundaries.

### Phase 7 — Versioned continual-harness refinement

**Deliverables**

- Implement typed supplemental prompt, memory, skill-package, and worker-spec registries with local/global scope, append-only versions, evidence links, applicability, expiry, and supersession.
- Implement propose -> host-only quarantine -> independent development validation -> rate-limited sealed final promotion gate -> promote/reject -> rollback flow and immutable mutation receipts. Proposer, every validator, and promoter identities are authenticated and host-derived, not accepted from model content.
- Run contamination, prompt-injection, capability-diff, executable-code, dependency, static-boundary, synthetic-behavior, and held-out regression validators.
- Allow the model to propose focused changes but require explicit configured promotion authority. Default promotion authority is a human/operator; any automated authority is a later, named policy decision.
- Retrieval/compilation is selective and bounded. A session pins versions; a later promotion does not mutate an active session silently.
- Store quarantine outside worker-readable/module/cwd roots. Promotion copies only a verified digest-pinned bundle into a separate read-only promoted root already admitted by the immutable capability profile; loaders resolve manifest IDs, never quarantine paths, and cannot widen cwd/module roots. Record actual runtime imports, filesystem/network/process effects, dependency digests, environment invariants, and gate receipts, not only declared effects.

**Implementation locations:** harness schema/registry/capability policy modules; quarantine and promoted artifact roots; validation worker specs; package docs/tests; cross-reference `docs/tasks/wiki-memory-continual-learning.md`.

**Invariants:** base policy/capabilities cannot change; executable proposals never run in the production worker while quarantined; quarantine is not worker-addressable; a promoted digest cannot resolve to different bytes; evaluator-private or contaminated evidence cannot support promotion; proposal/development-validation identities cannot forge promoter identity; final gates are sealed and rate-limited; success alone is not safety evidence; every version is rollback-addressable; cross-session/global state requires stricter review than session-local state.

**Acceptance and tests:** safe declarative memory promotion and retrieval; stale/conflicting/corrupt current-store degradation; direct CRUD/delete proposals retain before/after and inverse rollback; malicious RDF/message proposes an instruction and is rejected; worker cannot list/read/import quarantine; promoted bundle loads only by pinned digest from the read-only promoted root without adding cwd/module paths; undeclared runtime effect or changed environment invariant fails even when declared capability diff passes; skill asks for raw Fetch or wider path and is rejected; worker spec increases depth/budget/capability and is rejected; forged identity fields fail and authenticated validator/promoter differ from proposer; sealed final gate rate limits repeated probing and exposes only opaque IDs/categories; rollback restores a pinned prior version for new sessions without rewriting history.

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

Every model/provider invocation records exactly one `providerRole`: `answer`, `child`, `compaction`, `branch-summary`, `refinement-proposal`, `validation`, or `gate`. It also records invocation ID, root/session, model/provider/settings, projection ID, budget reservation, measured provider usage/cost when returned, status (`completed|failed|uncertain`), and causal parent. Caller-owned root calls may be recorded as caller observations; absent telemetry remains `unobserved`. A retry is a new invocation/fact with `retryOf`, never folded into the original. Compaction, validation, and gate tokens are harness work but remain provider usage under their own role; they are not added again as estimated projection tokens or harness wall time.

Reservation, debit, and release are distinct facts: reservation reduces available budget but is not usage; each unique provider/scientific/mediator/artifact/message leaf receipt debits once; unused reservation release restores only the undebited remainder. A child receives a sub-ledger reservation within the same root ceiling. Terminal/recovery/schedule operations cannot reset facts or reservations. Root totals are the union of unique leaf fact IDs ordered by root commit order; timestamps do not decide inclusion.

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
| Durability | Off (ephemeral compatibility); on, with the same child/refinement settings. |
| Recursion | Off; on with fixed child worker/model/budget, independently crossed with durability. |
| Promoted memory | Off; on with one reviewed pinned bundle, independently crossed with durability and recursion. |
| Recovery | No perturbation; L1 compaction; kernel reset; host restart; child restart. |
| Scientific case | Same opaque held-out question, worker-visible evidence roles, authority, and budgets. |

The full design crosses durability × recursion × promoted memory rather than treating later configurations as cumulatively stronger bundles. For each contrast, use prompt-token/projection-matched controls: predeclare the same worker-visible evidence and policy fields, match token ceilings, record actual projection digests/tokens, and either supply a neutral same-size control projection or report the unmatched delta as a separate factor. Do not pad with solution-bearing text. A recursion-off arm receives neither child answers nor hidden extra model calls; a memory-off arm may receive an independently reviewed neutral control, not the target lesson.

Freeze one `evaluation-configuration@1`: repository commit, package/runtime/schema/protocol versions, model/provider/settings, every provider-role adapter, worker spec, capability profile, public context/projection/compaction/branch-summary/retry policy, recursion/message/schedule settings, semantic codecs, harness versions, public manifest, sealed private-evaluator record ID, gate versions, and all root-tree budgets. The worker sees only the public configuration. A private digest or keyed commitment stays inside the evaluator service; reports expose an opaque record ID and bounded comparison category. Randomize case order where possible. Use at least three fresh repetitions for variance probing; do not claim statistical power from a pilot.

Report hard safety pass/fail, honest-stop and environment-blocked classifications, semantic rubric profile, second-turn reuse, exact/descriptor/payload recovery class, caller-observed versus package-child compaction, provenance continuity, attempt/repair/request/retry counts, provider usage by role, root/descendant resource facts, projection token deltas, and wall time. Compare model effects only within the same harness condition and harness effects only with the same pinned model/settings and matched projection condition. If a model/provider does not expose token usage or exact L0 identity, mark it unobserved and do not invent equivalence.

### 11.4 Hard failures and promotion gates

Hard failures include raw transport or filesystem bypass, unapproved live access, mutation, evaluator-private access, full-result leakage, stale-handle-as-resident claims, unsupported scientific claims, hidden query/template contamination, unaccounted descendants, capability widening, event/history rewriting, or self-approved executable refinement.

A phase cannot use improved answer rate to offset a hard failure. Live variability and unavailable sources are classified separately. A gate can promote a phase only when boundary tests pass and the relevant semantic outcomes are at least non-inferior to the current baseline within the pilot's uncertainty.

## 12. Continual Harness and evidence-linked refinement

### 12.1 Prime fidelity baseline

The Prime paper and repository establish a concrete fidelity target:

- four typed kinds: prompt notes for behavioral addenda, memories for facts/decisions/outcomes, executable skills for reusable procedures, and subagent specifications for reusable roles/divisions of labor;
- session-local state by default and explicitly selected global state for later sessions;
- a mutable **current** entry store with direct create/read/update/delete in `prime-agent-runtime/src/rlm/harness.py`; unreadable/corrupt persisted state degrades to an empty current store instead of crashing the REPL. This is observed Prime implementation behavior, not an append-only-history guarantee;
- executable skill entries that validate/reference already installed Python import/call targets plus argument descriptions. Prime does **not** automatically package arbitrary executable code from successful trajectories;
- refinement triggered directly by an agent or through `/refine`, where a background model call selects a bounded recent trajectory tail and produces focused `Create`, `Update`, or `Delete` edits. In the inspected `main` source, prompt construction truncates serialized trajectory text to the recent 80,000 characters and reports the recent 20 refinement records; these are implementation observations to re-pin during review, not Linked Science defaults;
- before/after harness snapshots around refinement, recorded intended changes, turn-boundary application, supplemental-state assembly for later invocations, and rollback by generating/applying inverse operations against a chosen snapshot; and
- runtime execution separate from persistent harness storage: the TypeScript host owns execution and the Python harness layer exposes state into the persistent REPL.

Linked Science must cover every mechanism above before claiming Prime-style Continual Harness fidelity. It deliberately diverges more strictly and must test the divergence rather than misdescribe Prime: direct CRUD is accepted as the model-facing proposal vocabulary but committed as append-only versions/tombstones; corrupt current state yields an explicit degraded registry and last-verified manifest rather than silently becoming empty; recent-tail selection is recorded and supplemented by evidence-linked retrieval/counterevidence; rollback uses both immutable before/after snapshots and a checked inverse plan; executable skills are digest-pinned promoted bundles, not arbitrary trajectory code or unresolved import references; worker specs and skills are quarantined; global/project promotion requires independent authority; and semantic evidence plus evaluator-private boundaries determine what may support or consume a refinement.

### 12.2 Typed versioned objects

All kinds share stable ID, kind/schema/version, scope, title/logical name/tags, content digest, base/supersession versions, host-derived proposer/validator/promoter identities, created/updated events, evidence bundle, intended effect, applicability, taint/contamination, status, projection policy, before/after snapshots, inverse rollback plan, and rollback pointer. No worker-supplied identity or filesystem path is authoritative.

| Kind | Required content | Allowed influence | Required extra validation |
| --- | --- | --- | --- |
| `prompt-note@1` | One narrow behavioral addendum, positive/negative examples, applicability, conflict/precedence class, and immutable-base-policy digest. | May enter the supplemental prompt only when promoted, applicable, non-conflicting, and within its token budget. | Instruction hierarchy, base-policy contradiction, capability-widening, prompt injection, ambiguity, and regression checks. It cannot redefine evidence, completion, or authority semantics. |
| `factual-memory@1` | Typed claims separated into fact, decision, failure, preference, strategy, or inference; exact semantic context/event evidence; confidence/review status; source/time/scope; expiry/revalidation; contradictions and supersession. | May be retrieved as labeled prior/reviewed context. It is never source evidence for a new scientific claim without current applicable evidence. | Citation reachability, evidence-kind compatibility, source/result versus inference distinction, stale/contradicted claim handling, contamination and cross-endpoint applicability. |
| `executable-skill@1` | Immutable source bundle/artifact; public description; import/entrypoint/call pattern; typed arguments/defaults/constraints; declared effects/dependencies; capability-profile requirement; tests and failure behavior. An import-only proposal must resolve to a separately reviewed installed dependency; trajectory text is never auto-packaged as code. | Only a promoted digest-pinned version may be loaded from the read-only promoted root, and only in a child whose pinned immutable capability profile already permits every declared and observed effect. | Static import/path/network checks, dependency lock/digest, sandboxed execution, adversarial inputs, idempotence/effect receipts, actual runtime-effect audit, environment invariants, non-widening diff, semantic-evidence and contamination audits. |
| `worker-spec@1` | Purpose, role, instructions, when to invoke, expected result/message schema, model/provider constraints, context selection/transfer rules, tools, immutable capability profile, budgets, depth/width/lease, gate, and stop reasons. | May instantiate a child only when promoted and explicitly selected; admission returns an asynchronous durable handle, not the answer. | Context minimization, authority/budget inheritance, private-data denial, child accounting, message/result schema, termination, and held-out leakage checks. |

Unlike generic memories, Linked Science factual memories may reference RDF terms, graph roles, SHACL shapes, dataset/service versions, query/result hashes, and provenance bundles. Those references remain data locators. A memory saying that a predicate was useful at one source/version does not make that predicate correct for a future question or endpoint.

### 12.3 Scope, assembly, and promotion rules

Scopes are explicit and ordered from narrowest to broadest:

1. **session-local:** default for active-run facts, blockers, provisional strategies, coordination roles, and refinements not yet shown transferable;
2. **project/repository:** reusable only for `LA3D/linked-science-cloud`, with the project/paths/API versions and applicability named explicitly;
3. **user-global:** stable cross-project preferences or generic capabilities, requiring separate operator approval and storage outside the repository where policy permits;
4. **evaluation configuration:** frozen, read-only, experiment-specific public harness versions; never a route to global promotion.

A broader scope never inherits automatically from repeated local success. Promotion requires a new version and receipt. During session-local refinement, broader entries are read-only context; a session override creates a narrow entry rather than mutating the broad version. Active sessions pin an ordered harness manifest. Quarantine manifests and bytes are stored under a separate host-only root that is absent from every worker cwd, readable root, module search path, context catalog, and operator public listing. Promotion revalidates a digest and copies/links only the verified immutable bundle into a distinct read-only promoted root already named by the base capability policy; it never adds a new root.

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

Success, reward, endpoint availability, or one polished final answer alone is not a trigger for executable promotion. Each trigger bundle freezes exact event/object/receipt IDs, the bounded recent-tail range used for Prime fidelity, any additional evidence-selection query, proposer session/root, time window, relevant failed/successful cases, counterevidence, contamination classification, and intended effect. A `/refine`-style background model may draft edits from that bounded bundle with provider role `refinement-proposal`, but it receives no evaluator-private data and has no promotion capability. Tail truncation and omitted evidence are explicit; a tail is a selection heuristic, not proof that older counterevidence does not exist.

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

Each `mutation-receipt@1` includes the full typed diff, immutable before/after snapshots, checked inverse operations, base/new digests, trigger and intended effect, recent-tail/evidence/counterevidence refs, host-derived proposer/validators/promoter, development and sealed-final validation configurations/results, declared capability diff, observed runtime effect receipts, environment invariants, contamination/honeytoken results, promotion authority and reason, effective scope/boundary, prompt projection cost change, compatibility range, and rollback target.

Create/update/delete semantics are append-only:

- **create** adds version 1 under a new stable ID;
- **update** creates version N+1 against an exact base digest and fails on stale base/concurrent modification;
- **delete** creates a revoked/tombstoned version and does not erase prior content or receipts;
- **rollback** atomically repoints a scope's default/promotion manifest to an earlier verified version while recording the cause; active sessions remain pinned unless explicitly restarted/adopted;
- **reject** preserves the quarantined proposal and diagnostic evidence under configured retention without making it retrievable by production workers.

### 12.6 Independent validation and evaluator integration

Independent means authenticated host-derived validator process/session identities differ from the proposer; model output cannot select or forge them. Validation runs a frozen worker spec under equal-or-narrower capabilities and separate budgets. For executable skills or worker specs, the host-derived promoter also differs from proposer and all proposal-generating calls. Validation has two gates: repeatable **development validation** for diagnostics, followed by a separately credentialed, rate-limited **sealed final promotion gate** on frozen inputs. Final-gate results cannot be used as an adaptive oracle.

Validation layers are:

1. schema, digest, dependency, import/path, and declared-effect checks;
2. immutable policy/capability non-widening comparison;
3. deterministic unit/property/adversarial tests in a disposable child with no live authority by default, recording actual imports and filesystem/network/process/provider effects plus environment invariants;
4. semantic evidence audit: claims and examples resolve to exact context objects/events, retain source/result/inference separation, and include counterevidence;
5. contamination audit against evaluator-private digests/honeytokens and worker-visible held-out cases without exposing private content to the proposal model;
6. same-model/same-case A/B evaluation with one changed harness factor, root-plus-descendant accounting, honest-stop and safety gates;
7. operator/promotion-authority review of the bounded receipt.

Evaluator-private gates may expose only `passed`, a bounded `failed:<public-category>`, `contaminated`, or `not-scorable`, plus an opaque private-record ID. Raw private-result digests are private; if cross-system comparison needs a commitment, it is keyed and the key/commitment remain inaccessible to workers and proposal models. Gates never supply official SPARQL, expected bindings, distinctive graph paths, solution-revealing case IDs, or correction fragments to refinement. A development-gate failure may trigger a proposal only from its public category plus worker-public trajectory; a sealed final-gate result cannot trigger iterative proposal retries in the same promotion window.

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

Prime Agent's Factorio analysis is a direct warning for continual harnesses: the agent used an exploit despite an anti-cheating reminder, and successful reward plus broad allowed capabilities made unsafe reusable guidance/skill retention attractive. The lesson is durable promotion risk—not a claim that Prime automatically packages arbitrary trajectory code. Optimization pressure can turn observed success into persistent policy-violating guidance, and user-permission execution makes the blast radius larger.

Linked Science therefore uses the following governance model:

1. **Immutable constitution:** base system policy, allowed authority classes, filesystem roots, traversal rules, evaluator separation, and hard resource ceilings are release inputs. Refinement cannot edit or supersede them.
2. **Non-widening capabilities:** every proposed prompt/skill/spec is statically compared with its base profile. New hosts, methods, credential use, filesystem roots, dependencies, descendant depth, budgets, tool names, or bypass paths cause rejection.
3. **Quarantine by kind:** declarative prompt/memory proposals are non-executable; skill packages and worker specs live in a separate host-only quarantine outside worker-readable/module/cwd roots. Production loads only digest-pinned promoted bundles from a pre-authorized read-only root.
4. **Independent validation:** proposer, validators, and promoter have authenticated host-derived identities; worker payloads cannot name them. Development validation runs under an equal-or-narrower test profile in a disposable environment, then a rate-limited sealed final gate decides promotion with no evaluator secrets or live authority by default.
5. **Evidence-linked mutations:** every proposal cites exact source events, receipts, tests, failure clusters, applicability, and counterevidence. Outcome success without policy-compliant provenance is insufficient.
6. **Contamination audit:** search worker-visible context, messages, artifacts, memories, skills, and specs for held-out questions, official query fragments, expected answers, private IDs, and honeytokens before validation or promotion.
7. **Append-only versions:** never edit a promoted object in place. New versions cite their base; promotion, supersession, rejection, and rollback are events with immutable receipts.
8. **Explicit promotion authority:** default human/operator approval; automated promotion is disabled until a separately reviewed policy names the authority and proof obligations. Declared capability equality is insufficient: actual runtime effect receipts, dependency digests, and environment invariants must also pass.
9. **Rollback and pinning:** sessions pin versions. Rollback changes the default for future sessions or an explicitly restarted session; it does not rewrite old traces or silently mutate active workers.
10. **Scientific integrity:** a reusable lesson may encode a general validation strategy, but not a held-out answer, unsupported source fact, case-specific endpoint route, or exploit of evaluator/source behavior. Endpoint observations require scope, date, evidence, and revalidation policy.

Promotion decisions and validation summaries should be public to the operator; evaluator-private evidence remains separately sealed. Security findings use private reporting rather than entering reusable agent memory.

## 14. Risks and mitigations

| Risk | Consequence | Mitigation/gate |
| --- | --- | --- |
| Session substrate becomes a competing Codex workflow engine | Split authority and inconsistent completion | Goal attachment contract; package reports execution state; Codex remains external goal authority; Phase 5 compatibility tests. |
| Durable history leaks bulk data or hidden reasoning | Privacy/context growth and contamination | Typed bounded public events, artifact indirection, no chain-of-thought retention, private/public projections, quotas. |
| Recovery replays external effects | Duplicate requests or false evidence | Event commit ordering, indeterminate states, no automatic live reacquisition, idempotent recovery plans. |
| Cross-store crash exposes terminal success without evidence/artifact/context | Irreconcilable scientific claim | Write-ahead command journal, fsync/rename/head order, transaction IDs, crash injection at every boundary, uncertain non-replay. |
| Package claims control over Codex/provider compaction | False recovery and accounting guarantees | Caller context contract; caller observations separated from package-child `ProjectionManager`/`CompactionManager`; unsupported telemetry is `unobserved`. |
| Generic memory flattens RDF semantics | Lost graph roles/provenance and brittle templates | First-class RDF artifact types, native L2 handles, role/evidence links, neuro-symbolic non-inferiority gate. |
| Recursive children evade budgets | Misleading evaluation and resource exhaustion | Root IDs, sub-budget reservation, unique leaf facts, depth/width/lease limits, descendant gate. |
| Messages become capability or prompt-injection channels | Authority escalation or learned malicious instructions | Data-only schemas, no tokens/paths, bounded bodies, trust labels, no automatic promotion/execution. |
| Event hash chain is mistaken for attestation | Overstated integrity | Anchored head/length checkpoints and mutation/truncation/rollback tests; label local anchors tamper-evidence only; external signing remains a separate decision. |
| Endpoint drift confounds harness evaluation | Incorrect model/harness conclusions | Same-window controls, drift classification, frozen source metadata, synthetic replay layer. |
| Refinement preserves a successful exploit | Durable policy violation | Immutable policy, quarantine, independent validation, non-widening diff, explicit promotion, rollback. |
| Repeated final-gate probing leaks a held-out answer | Evaluator contamination | Separate development validation from a credentialed rate-limited sealed final gate; expose opaque IDs and bounded categories only. |
| Golden characterization fixture mirrors implementation bugs | Circular oracle freezes accidental behavior | Independent source-plus-black-box review; hand-authored expected semantics; preserve distinct reset/error classes. |
| Durable artifacts expand filesystem attack surface | Path escape, overwrite, corruption | Parent-owned confined roots, content addressing, atomic no-overwrite writes, symlink/race/corruption tests. |
| Schema/version churn strands sessions | Unrecoverable history | Append-only raw events, upgraded materialized views, pinned readers, explicit degraded recovery. |

## 15. Open research questions

These are unresolved decisions, not implicit implementation latitude:

1. How much JavaScript state beyond explicit JSON/context/artifact types is safely serializable without claiming general heap snapshots?
2. Which RDF dataset canonicalization algorithm/format is stable enough for content identity while preserving named graphs and blank-node semantics across supported N3/RDFJS versions?
3. Should `rlm.query()` become a durable child compatibility wrapper or remain a distinct lightweight primitive after same-provider characterization?
4. How should provider token/cache/cost facts be normalized across providers without erasing missing telemetry or conflating caller-observed and package-owned calls?
5. Which bounded public gate diagnostic categories remain useful without creating an adaptive evaluator oracle?
6. Can a separately reviewed automated promoter ever satisfy global/executable authority, or should human approval remain permanent?
7. How should stale ontology/source claims expire and be revalidated without turning memory retrieval into automatic live access?
8. Which session events belong in the existing experiment-result registry versus the harness store, and how are cross-references validated without duplication?
9. What prompt-projection matching method best isolates useful semantic selection from token count and ordering effects without solution-bearing padding?
10. What retention windows preserve reproducible scientific/gate decisions at acceptable storage cost, especially when exact payloads cannot legally or practically be retained?

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
| D-012 | Use one local supervisor, one single-writer worker per root tree, and one restricted kernel per active session; supervisor adoption is pin/lease/head verified. | Proposed; Phase 0 ADR gate | Matches Prime's durable ownership while keeping child authority narrow. |
| D-013 | Use authenticated user-private local transport with capability negotiation, stable command IDs, generations, cursors, bounded snapshots/frames/queues. | Proposed; Phase 0 ADR gate | Enables detach/reattach and compatibility without exposing the control socket to workers. |
| D-014 | Recovery retries are finite (initial default 250 ms, 1 s, 5 s); uncertain effects are never automatically replayed. | Proposed; Phase 0 ADR gate | Bounds daemon loops and avoids duplicate external/provider effects. |
| D-015 | Caller/Codex owns root L1 and compaction; the package only observes it through `caller-context-contract@1`. `ContextRegistry`, `ProjectionManager`, and `CompactionManager` own package-child state. | Proposed; required ownership gate | Prevents unsupported claims over provider/Codex context. |
| D-016 | Branch, fork/clone, compaction, and branch summary are distinct: branch shares a session tree; fork/clone creates a session; summaries remain lossy projections over exact ranges. | Proposed; Prime-fidelity gate | Preserves navigation/recovery semantics without flattening evidence. |
| D-017 | Every multi-store mutation uses the write-ahead `CommandJournal` with host-minted idempotency, prepare/effect/domain/head/commit ordering and typed uncertainty. | Proposed; required durability gate | Makes event/artifact/context/terminal outcomes crash-reconcilable. |
| D-018 | Event chains use separately durable head/length anchors and state their local-attestation limit. | Proposed; required integrity gate | Detects mutation/truncation relative to a retained anchor without overstating privileged-actor resistance. |
| D-019 | One context API uses `search/slice/aggregate/project/serialize/materialize/release`; Phase 1 accepts generic JSON/text only and Phase 6 adds semantic codecs. | Proposed; required API gate | Reconciles modules/schemas/phases and prevents fake semantic typing. |
| D-020 | Exact event, descriptor, and payload recovery are separate claims with typed expiry/non-reconstructability and retention pins. | Proposed; required evidence gate | A digest or summary cannot replace missing scientific evidence. |
| D-021 | Minimal root-tree resource facts and child reserve/debit/release precede recursive admission; full accounting follows without double counting. | Proposed; required recursion gate | A child cannot exist outside the root budget. |
| D-022 | Messages use host-derived sender, durable family topology, idempotent enqueue/deduplicated processing, bounded attempts/queues, and explicit busy/restart behavior. | Proposed; required messaging gate | Coordination cannot forge identity, transfer authority, or claim exactly-once effects. |
| D-023 | A bounded Codex/operator adapter provides public observation and named intervention only; it never adds worker authority. | Proposed; required control-plane gate | Preserves operator inspectability while Codex remains the UI/task authority. |
| D-024 | Package goals are caller-admitted execution records and schedules are continuation leases; claims advance before delivery, missed ticks coalesce, uncertain delivery is not replayed. | Proposed; required compatibility gate | Avoids a competing goal graph and duplicate autonomous turns. |
| D-025 | Every provider call has one role and every evaluation pins an `evaluation-configuration@1`. | Proposed; required accounting/evaluation gate | Separates answer, child, compaction, summary, refinement, validation, and gate costs. |
| D-026 | Taint declassification requires host authority and receipts; evaluator-private and contamination lineage are monotone/non-declassifiable. | Proposed; required contamination gate | Validation cannot launder private or held-out information. |
| D-027 | Prime's mutable current CRUD/delete, recent-tail refinement, snapshots/inverse rollback, corrupt-store degradation, and installed-Python-skill references are fidelity facts; Linked Science adopts stricter append-only/versioned behavior explicitly. | Proposed; Prime-fidelity gate | Avoids attributing stronger guarantees or arbitrary-code packaging to Prime. |
| D-028 | Proposer/validator/promoter/sender identities are host-derived; quarantine is outside worker roots; promoted execution resolves a digest-pinned bundle from a pre-authorized read-only root and validates observed effects/environment. | Proposed; required promotion gate | Declared capabilities and worker-supplied identities are insufficient security evidence. |
| D-029 | Development validation is repeatable; the final promotion gate is separately credentialed, sealed, and rate-limited. Workers see opaque private-record IDs/categories, never raw private digests. | Proposed; required evaluator gate | Prevents refinement from probing private scoring. |
| D-030 | Durability, recursion, and promoted memory are independent evaluation factors with prompt-token/projection-matched controls. | Proposed; required research gate | Isolates model effects from harness and context-volume effects. |
| D-031 | L2 GC releases only unpinned resident values; L3 descriptors/evidence remain governed by explicit retention and recreation rules. | Proposed; required context gate | Keeps resident capacity bounded without inventing recovered evidence. |
| D-032 | Phase 0 must pin store root, encoding/framing, concurrency, numerical quotas, retention, and fsync/terminal durability classes before Phase 1. | Proposed; blocking ADR gate | These are architectural safety inputs, not implementation defaults to improvise later. |

## 17. Recommended first implementation slice

The first worktree should implement **Phase 0 only**, small enough to review and merge independently:

1. Add `packages/cleanroom-node-repl/docs/durable-harness-architecture.md` plus focused ADRs for every Phase 0 choice in Section 9: topology/transport/leases/adoption; caller versus child context/compaction; operator/branch/fork behavior; command transaction/uncertainty/anchoring; store root/concurrency/encoding/quotas/retention/fsync classes; resource admission/provider roles; and caller-attached goals/continuations.
2. Add black-box characterization tests for current singleton `KernelBroker` lifecycle, request serialization, epoch replacement, PEEK survival, traversal abort on owner loss, one-shot RLM behavior, child-global absence, and bootstrap/private traversal integration. Prefer fixtures around existing public exports; do not add runtime behavior.
3. Add a normalized baseline contract fixture under `packages/cleanroom-node-repl/test/fixtures/` for the three MCP tools, server/package/runtime versions, child action-space descriptors, and semantically distinct reset/error outcomes. Obtain independent source-plus-black-box review of the golden values; never derive the oracle from the subject under test.
4. Add model-based tests for the proposed command journal/state machines and crash injection table without implementing production durability.
5. Extend repository-boundary validation to include future package `schema/`, protocol/daemon, quarantine/promoted, and docs/import surfaces and explicit denial of sibling and evaluator-private roots. Run both the relocatable static worktree command and installed deployment-config command from Phase 0.
6. Produce the Section 19 Prime mechanism matrix with zero unclassified/missing/unowned mechanisms and accepted ADR/test links.
7. Provision only lockfile-pinned dependencies with explicit approval when absent; otherwise stop that gate. Run `npm test`, `npm run smoke`, `npm run cleanroom:check`, `git diff --check`, Markdown heading/fence/link checks, and inspect the full diff.

This slice changes documentation, tests, and governance only. It creates no session store, daemon, artifact, live request, export, runtime dependency, or new tool. Its completion gate is a frozen independently reviewed baseline plus accepted architecture. **Even after it passes, Phases 1-7 require separate explicit authorization; until it passes, they are categorically unauthorized.**

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

This revision incorporates blocking findings from an earlier independent Sol Max review, including caller/child compaction ownership, transactional durability, daemon protocol/leases, branch/fork fidelity, accounting order, schedule non-replay, and stricter-but-accurate refinement semantics. Incorporation does not self-certify the result: the reviewer must rerun the matrix against this committed revision and may reopen any item.

The reviewer must inspect the Prime paper and actual repository implementation, not rely on this plan's summary, product prose, or secondary commentary. At minimum, pin access date and repository revision/tag when discoverable and inspect:

- [Prime Agent paper sections 2.1-2.6 and Factorio analysis](https://arxiv.org/html/2608.23552);
- [Prime Agent repository README](https://github.com/PrimeIntellect-ai/prime-agent);
- [daemon architecture and protocol](https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/daemon.md), including root-tree process ownership, catalog, leases, v4 negotiation/cursors, command journal, scheduling claims, adoption, recovery, and backpressure;
- [RPC observation, messaging, fork, and clone contracts](https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/rpc.md) and [session-format entries](https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/session-format.md);
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
- append-only event history, in-session branches, fork/clone session creation, compaction versus branch summaries, exact original-event recovery, kernel snapshots, retention expiry, and recreation of non-serializable values;
- daemon supervisor/catalog/root-worker ownership, authenticated wire transport, protocol/capability negotiation, generations/cursors/snapshots/backpressure, session leases/single writer, idempotent command journals/uncertain effects, bounded recovery retry, shutdown/adoption, running/idle/inactive state, detach/attach, same-identity recovery, human observation/intervention, and client independence;
- recursive child admission returning stable asynchronous handles, independent child context/kernel/history, parent/child/sibling topology, follow-up, cancellation, and retained results;
- durable family-scoped message queues, host-derived sender, dedup/attempt/failure/queue bounds, busy-child steer/follow-up, retained-child/restart behavior, and bounded observe behavior;
- prompt notes, factual memories, executable skills, and reusable subagent/worker specs as distinct typed state;
- local/global scope, mutable current CRUD/delete, corrupt-state degradation, installed Python skill references, background `/refine`, recent-tail selection, turn-boundary application, supplemental prompt assembly, before/after snapshots, inverse rollback, and every stricter Linked Science divergence;
- autonomous continuations, caller-admitted execution goals/leases, heartbeats, pre-delivery schedule claims, missed-tick coalescing, non-replay of uncertain delivery, retry policy, completion/end-condition gates, and limit-exhaustion/interruption semantics;
- evaluation configuration binding model/provider, tools, compaction/refinement/retry/gates/budgets;
- event linkage for model/tool calls, messages, interventions, retries, verifier results, harness edits, tokens/time/cost, and root-plus-descendant accounting;
- Agents View-equivalent operator inspectability, even if Linked Science deliberately leaves the UI to Codex;
- Factorio's destructive reset recovery and unsafe durable reusable-guidance/skill lesson under reward and broad capabilities—without claiming automatic arbitrary-code packaging—plus Linked Science's least-privilege, effect-receipt, independent-validation, quarantine, promotion, and rollback response;
- every semantic-web extension in Sections 6, 11, and 12: typed RDF context, provenance, graph roles, mediated traversal, scientific repair, evaluator-private gating, contamination, and prompt-projection accounting.
- the caller context contract and `ContextRegistry`/`ProjectionManager`/`CompactionManager` split, consistent context verbs, generic-versus-semantic codec phasing, exact/descriptor/payload recovery, L2 GC, and projection-token controls;
- the write-ahead multi-store command transaction, anchored heads/lengths, causal/root ordering, resource admission before children, every provider role, sealed final gates, and evaluation-configuration binding. Where Linked Science is stricter than Prime, label it `adapt` or `reject`, not a Prime implementation claim.

### 19.2 Review acceptance gate

Review passes only when:

- there are zero unclassified, zero `missing`, and zero unowned `unresolved` Prime mechanisms;
- every `adapt` or `reject` has a concrete Linked Science invariant, test, and decision-log entry rather than a preference-only rationale;
- Sections 5.3-6 and 12 are compared directly against actual Prime daemon/session/context/compaction/refinement code and tests, not only paper-level concepts;
- proposed APIs do not invent already-available local behavior, and all baseline claims are verified against this repository;
- all safety divergences are equal or stricter than the current clean-room boundary;
- semantic-web behavior is demonstrably preserved rather than represented solely as generic prompt memory;
- any Prime repository behavior that differs from the paper is recorded as an implementation observation, with the plan choosing deliberately between paper intent and source behavior;
- the reviewer lists concrete amendments or explicitly states that no amendment is required.

Any failure leaves the relevant phase at stop. Amendments return through a focused PLAN/decision update before runtime implementation proceeds. The review itself is methodology evidence; any later implementation claim still requires local tests and, where applicable, separately authorized experiments.
