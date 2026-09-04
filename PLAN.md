# Prime-inspired durable RLM, context, and continual-harness research plan

**Status:** Active staged implementation plan. Phase 0 is accepted; the focused RLM/Prime symbolic-graph slice and the symbolic query-completeness correction below were completed and validated on 2026-09-04.

**Canonical repository:** `LA3D/linked-science-cloud`

**Owning package:** `packages/cleanroom-node-repl`

**Baseline:** local `main` at `3a440b5` (`Simplify Linked Science persistent harness`), inspected 2026-08-27

**Primary references:** [Prime Agent paper](https://arxiv.org/abs/2608.23552), [Prime Agent repository](https://github.com/PrimeIntellect-ai/prime-agent), and [persistent harness state](https://github.com/PrimeIntellect-ai/prime-agent/blob/main/prime-agent-runtime/src/rlm/harness.py)

**Authorization boundary:** Phase 0 is complete. On 2026-09-04 the user explicitly authorized the focused repository-local RLM/Prime symbolic-graph slice in section 0 and the follow-up symbolic query-completeness correction in section 0.1: documentation, plan, runtime, skill, tests, focused commits, and local-main integration. That authorization does not automatically activate the full durable Stage 1-3 program. Nothing here authorizes live evaluation, dependency installation, export, global configuration changes, push, authenticated access, mutation, or bulk ingestion.

## 0. Completed RLM/Prime symbolic-graph slice

The immediate correction makes the intended architecture explicit and removes one implementation mismatch exposed by task-level MCP testing.

1. [RLM/Prime Linked Science](docs/architecture/rlm-linked-science-runtime.md) becomes the normative runtime architecture. Persistent JavaScript is the RLM control environment; the browser-shaped facade and CodeAct-style execution are subordinate ergonomics.
2. Execution, residency, and model-visible projection budgets become separate capability planes. RDF graph size is not treated as a context-window or display limit.
3. Broker-acquired RDF larger than the former 10,000-quad default can remain behind a native graph handle and support repeated local subgraph queries without refetch. Physical byte, time, memory/storage, and query-work ceilings remain explicit operational controls.
4. Agent guidance considers likely representation and result size without requiring `HEAD` or `Content-Length`. It chooses between direct remote subgraph query, acquire-once local reuse, ontology/schema inspection, and bounded result projection according to the information need.
5. Local graph-name, format, budget, and projection-shape failures expose structured repair. Generated signatures reflect the callable API.
6. `nodeRepl.rlm` reports structured control-environment and recursion capabilities. The current one-shot provider seam remains compatibility behavior; this slice does not pretend it is the durable asynchronous child runtime specified for Stage 1.

The controlled acceptance fixture contains more than 10,000 quads, is acquired once, is queried locally at least twice through one graph handle, and proves that only bounded views enter model-visible output. This local fixture is implementation verification, not a formal live evaluation run.

Completed evidence: runtime 5.1.0 retains and indexes a controlled 12,050-quad Turtle graph from one broker acquisition, reuses it for two local Communica subqueries, and emits only bounded profiles/pages. The actual repository JSON-RPC MCP loopback test records exactly one HTTP request. The complete 140-test suite, smoke check, repository-owned broker/runtime verification, skill validation, documentation-link validation, and Git diff checks passed. See the [completed task record](docs/tasks/rlm-symbolic-graph-realignment.md).

### 0.1 Completed symbolic query-completeness correction

Task-level MCP testing exposed a second mismatch: local queries required a SPARQL `LIMIT` as a condition of result retention, and Communica 5.3.0 cannot optimize a `DESCRIBE` nested beneath the algebra `slice` produced by `LIMIT` or `OFFSET`. A query modifier is part of SPARQL semantics, not a storage control. Requiring, injecting, removing, or relocating it can change the answer and can make a graph result silently incomplete.

This correction establishes the following contract:

1. Local `SELECT`, `ASK`, `CONSTRUCT`, and `DESCRIBE` accept their valid SPARQL 1.1 syntax without a harness-imposed `LIMIT` requirement.
2. Query result streams are materialized atomically. A successful handle represents the complete result under the submitted query and the declared graph-description policy. If an operational residency ceiling is reached, the stream is cancelled, no result handle is published, and the call fails with structured recovery.
3. Model-visible pages and tables remain independently bounded projections. Their truncation never changes the resident result or its completion claim.
4. `DESCRIBE` is normalized deliberately to the runtime's declared outgoing-subject-triples policy before Communica execution. The normalization preserves explicit described IRIs, variable solutions, wildcard expansion, dataset clauses, and solution modifiers such as `ORDER BY`, `OFFSET`, and `LIMIT`.
5. Profiles and mediated-attempt receipts state semantic completion and the description policy explicitly. They retain the hash and query type of the caller's original query; an internal normalization hash may be recorded as implementation provenance but never substituted for caller intent.
6. Physical memory, storage, time, network, and result-residency ceilings remain honest operational controls. This slice does not claim infinite resources; it claims that an exceeded resource ceiling is a failure rather than a successful partial answer.

Acceptance requires a synthetic all-four-form matrix through the actual project MCP, including `DESCRIBE` with and without solution modifiers, plus an over-ceiling test proving failure without a retained partial handle. See the [completed task record](docs/tasks/symbolic-query-completeness.md).

Completed evidence: runtime 6.0.0 removes the local query-LIMIT requirement, streams result materialization, declares the outgoing-subject-triples DESCRIBE policy, normalizes wildcard/variable/explicit targets while preserving solution modifiers, and records completion on successful profiles and receipts. The actual repository JSON-RPC MCP retained a complete 12,050-quad no-LIMIT DESCRIBE result from one acquired graph and returned the distinct native types for all four forms. A separate mounted-MCP probe retained a 1,005-quad DESCRIBE with a binding-item quota of two. The 142-test suite, smoke check, repository-owned broker/runtime verification, and Git diff checks passed. See the [completed task record](docs/tasks/symbolic-query-completeness.md).

## 1. Objective and falsifiable thesis

Build the smallest real Prime-style foundation needed to test durable information management and continual harness learning in Linked Science:

1. a durable RLM session substrate with persistent root and recursive child computation;
2. an explicit context-management layer that records bounded projections, child compaction, and L2/L3 transitions; and
3. a versioned continual-harness layer that can turn trajectory evidence into reviewed prompt, memory, skill, or worker-spec state with rollback.

The semantic-web symbolic interface is an adaptation layer on top of those foundations. It must preserve RDF/JS terms, graph roles, provenance, source/result evidence separation, mediated authority, and honest empty/failure semantics, but it should not force the generic harness to implement an RDF platform before the generic core works.

The plan tests three hypotheses in dependency order:

- **H1 — durable RLM/context continuity:** a root plus one recursive child can preserve exact public history and selected context across compaction and host restart, then continue from verified artifacts without false handle residency or hidden source reacquisition.
- **H2 — evidence-linked refinement transfer:** one reviewed, versioned harness edit derived from public trajectory evidence can improve behavior on a structurally different case, while a pinned control and rollback demonstrate that the edit—not unrelated context or code—caused the difference.
- **H3 — Linked Science non-regression:** adapting the core to one narrow RDF dataset/result path preserves native semantic structure, provenance, evaluator isolation, bounded observation, and mediated authority.

Each hypothesis has its own stop/go gate. Passing one does not imply the next, and no combined score may hide a failed safety invariant.

## 2. Scope and ownership

### 2.1 Irreducible core

The initial authorized architecture must eventually provide:

- durable session and child identity;
- append-only public event history and immutable artifacts;
- a persistent JavaScript root kernel and at least one asynchronous recursive child with its own kernel, context, history, and stable result handle;
- bounded context objects, deterministic prompt projections, package-child compaction with exact source-event links, serialization, materialization, and explicit release;
- typed prompt notes, memories, skill proposals, and worker specifications;
- append-only refinement versions, evidence-linked proposals, explicit host/operator application, prompt assembly, version pinning, rejection, and rollback; and
- a narrow Linked Science adapter after the generic core is established.

These are the foundation under review. The current broker is characterization evidence and a compatibility shell; it is not the durable implementation.

### 2.2 Minimum correctness and safety support

The core also requires:

- one trusted single-writer host per open session;
- a confined durable root outside worker-readable and module roots;
- content-addressed immutable blobs, atomic no-overwrite publication, hashes, numerical quotas, bounded reads, and explicit retention;
- host-derived session, command, proposer, and reviewer identity;
- idempotency for mutating commands and explicit `uncertain` outcomes for provider or external effects that cannot be proved;
- fresh epochs after kernel loss, with old native handles always stale;
- minimal leaf resource facts for root, child, compaction, and refinement provider calls;
- immutable base policy and capability ceilings;
- evaluator-private filesystem separation and post-run leakage audit; and
- honest stop states for insufficient evidence, unavailable sources, exhausted limits, missing approval, unavailable tools, and unreconstructable state.

### 2.3 Non-authorized future options

The following are not prerequisites for H1-H3 and are not part of Stages 1-3:

- a multi-client daemon, socket protocol, bearer credentials, capability negotiation, generations/cursors, backpressure, root-worker leases, supervisor adoption, or an operator control plane;
- in-session branches, branch summaries, fork/clone protocols, cross-root transfer, or a general session topology service;
- sibling messaging, durable family mailboxes, busy-child steering, delivery acknowledgement, expiry, or general retained-child reactivation;
- package-owned goals, schedules, heartbeats, autonomous continuation, or a competing completion state machine;
- a general descendant accounting product, cost normalization service, automatic retention graph, reference-counting GC, or tombstone lifecycle platform;
- automatic executable promotion, automated global promotion, sealed promotion services, keyed evaluator commitments, or an adaptive final-gate oracle; and
- a broad ontology/schema/SPARQL/query-plan/evidence-document codec taxonomy.

These may be proposed later only when a completed experiment shows that a missing mechanism blocks a named hypothesis.

### 2.4 Repository and worktree policy

`LA3D/linked-science-cloud` is the sole canonical implementation repository. `packages/cleanroom-node-repl` owns restricted execution, durable session/context/harness state, and the capability broker. Root `lib/` remains the Linked Science semantic integration layer.

The sibling `node-repl-network-probe` is not an implementation source, dependency, fallback, copy source, or release authority. Production references to it remain forbidden by repository-boundary validation.

Codex owns top-level goals, task continuity, worktrees, and worker lifecycle. Package sessions attach evidence and computation to a caller task; they do not create a second goal graph, scheduler, or user-facing workflow product.

Each implementation stage uses a focused Codex worktree or `codex/<slice>` branch, preserves unrelated work, follows `docs/agent/git-handoff.md`, and does not push without separate authorization.

## 3. Current baseline

The existing system is a strong compatibility and safety substrate, but not the required durable foundation.

| Surface | Implemented evidence | Missing core behavior |
| --- | --- | --- |
| MCP and kernel | Exactly `js`, `js_reset`, and `js_add_node_module_dir`; one serialized restricted JavaScript child; timeout/reset replacement; epoch changes; module-root retention. | Durable root/session identity, persistent history, explicit reopen, and independent recursive children. |
| RLM context | Kernel-local JSON/text contexts with bounded inspection; optional one-shot provider call. | Durable context identity, projection records, compaction, artifact backing, and stable child sessions. |
| PEEK | Broker-owned bounded orientation map that can survive child reset and optionally checkpoint. | Exact trajectory history or recovered semantic payloads. PEEK must remain orientation only. |
| Linked Science | Native RDF/JS graph, result, evidence, and workspace handles; bounded query, derivation, search, neighborhood, page, table, provenance, and stale-handle behavior. | Artifact-backed rematerialization and durable cross-invocation descriptors. |
| Traversal | Private token/epoch-owned anonymous read-only mediation with cumulative request, fan-out, concurrency, time, byte, and item bounds plus per-exchange receipts. | Durable session/child attribution. Authority semantics themselves need not change. |
| Results governance | Compact artifacts under `artifacts/` and a validated experiment-result registry distinguish contemporaneous receipts from retrospective summaries. | Automatic runtime history. Existing receipts remain a valid experiment handoff mechanism. |
| Evaluation | Worker/evaluator root separation and hidden UniProt references are already tested. | Only the new public session/refinement projections need integration. A new evaluator service is not required. |

Compatibility facts:

1. The public MCP surface remains exactly three tools through Stages 1-3.
2. `js_reset` remains destructive for L2 values. Durability creates new handles; it never makes an old handle resident again.
3. Workspace attempt history is bounded domain evidence, not a complete session log.
4. Broker PEEK is not the event store, context registry, or continual harness.
5. Existing experiment receipts and Git history remain distinct from runtime state.

## 4. Prime mechanism disposition

The plan adopts the Prime mechanisms needed for the three hypotheses and records product mechanisms as future options rather than treating full product fidelity as an implementation requirement.

| Prime-style mechanism | Disposition | Linked Science treatment |
| --- | --- | --- |
| L0-L3 information hierarchy | **Adopt** | Make visibility, persistence, ownership, and transitions explicit. |
| Persistent programmatic REPL | **Adopt** | Preserve JavaScript as the RLM control environment and preserve restricted child authority; CodeAct is an execution technique, not the architectural center. |
| Context as data | **Adopt narrowly** | Addressable bounded objects, programmatic JavaScript operations, explicit projection, serialization, and materialization. |
| Append-only history | **Adopt** | Per-session public events remain exact and recoverable. |
| Package-child compaction | **Adopt narrowly** | Replace a child L1 prefix only in later projections; preserve the exact source range in L3. Root/Codex compaction remains external and unobserved. |
| Recursive RLM sessions | **Adopt minimally** | Begin with one depth-one child, stable asynchronous handle, private kernel/history, bounded context grants, and one terminal result. |
| General direct messaging | **Defer** | Stage 1 needs only parent objective, terminal child result, and at most one bounded follow-up. |
| Continual Harness typed state | **Adopt** | Prompt, memory, skill, and worker-spec records are distinct. Skill/spec execution remains disabled initially. |
| Refinement and rollback | **Adopt with review** | Append-only proposals and versions; explicit host/operator application; evidence links; pinned prompt assembly; rollback. |
| Automatic executable promotion | **Reject initially** | No successful trajectory directly becomes executable or capability-bearing state. |
| Daemon continuity and Agents View | **Defer** | Explicit host reopen plus bounded status/events tests H1 without a separate product/control plane. |
| Branch/fork/clone model | **Defer** | Separate durable sessions and Codex/Git worktrees are sufficient for experimental controls. |
| Goals, schedules, heartbeats, autonomy | **Reject for the initial package** | Codex remains the caller and continuation authority. |
| Full root-plus-descendant accounting | **Defer** | Record only leaf facts required to explain the root and one child. |
| Agentic L2 GC | **Defer** | Support explicit `release`; add automatic GC only after measured pressure. |
| Broad global harness state | **Defer** | Initial scopes are session-local and repository-project. No user-global mutation. |

The core-fidelity claim is therefore limited: Stages 1-2 may claim a Prime-inspired durable RLM/context/Continual Harness foundation, not full Prime Agent daemon or product fidelity.

## 5. Lean target architecture

```text
Codex caller / independent evaluator
              |
              | existing three-tool MCP + stage-specific caller metadata
              v
packages/cleanroom-node-repl (trusted single host)
  DurableStore ---- ContextManager ---- ContinualHarness
       |                  |                    |
       +---------- RlmSessionRuntime ----------+
                          |
                  root restricted kernel
                          |
                  one child restricted kernel
                          |
                  stable child result handle
                          |
              Linked Science adapter (Stage 3)
                          |
              Communica / native RDF/JS handles
                          |
              existing mediated traversal authority

Evaluator-private references stay outside worker-readable roots.
```

There is no daemon protocol in this architecture. The MCP process is the trusted single host for an open session. A later process may explicitly reopen committed state from the durable root; it does not adopt or continue an unproved in-flight effect.

### 5.1 Ownership

- **Codex/caller:** top-level goal, worktree, external continuation, user interaction, and root prompt construction.
- **DurableStore:** session manifests, append-only public events, immutable artifacts, anchored session head, idempotency records, and verification.
- **RlmSessionRuntime:** root/child kernels, child admission, epochs, execution, cancellation, result identity, and minimal resource facts.
- **ContextManager:** context descriptors, bounded projections, child compaction, artifact serialization/materialization, and explicit release.
- **ContinualHarness:** typed versions, proposals, evidence bundles, applicability, project/session scopes, prompt assembly, application, rejection, and rollback.
- **Linked Science adapter:** RDF/JS semantics, Communica operations, semantic provenance, scientific attempt interpretation, and mediator integration.
- **Evaluator:** hidden references, scoring, contamination checks, and post-run gate results outside worker state.

### 5.2 L0-L3 mapping

| Level | State | Persistence rule |
| --- | --- | --- |
| **L0** | Model/provider identifiers when observable; immutable base policy and capability profile | Pinned in the session manifest; never editable by refinement. |
| **L1** | Current root or child invocation tokens and selected bounded projections | Ephemeral. Only package-created child projections are exactly recorded. Root/Codex L1 remains external and `unobserved`. |
| **L2** | JavaScript bindings, RLM contexts, active child handles, native RDF/JS values | Survives while a kernel lives. Kernel loss makes native identities stale. |
| **L3** | Session events, artifacts, context descriptors, projection/compaction records, child results, harness versions, refinement receipts | Durable, bounded, versioned, and selectively reintroduced into L1/L2. |

Cross-level rules:

- L2-to-L3 is explicit, typed, bounded, and receipted.
- L3-to-L2 verifies a descriptor/artifact and creates a fresh epoch-local identity.
- L3-to-L1 records exact public inputs, ordering, renderer/policy version, digest, bytes, and token estimate.
- A handle name or PEEK entry proves neither residency nor payload availability.
- Source failure, exact empty result, summary, memory, and model synthesis keep distinct epistemic roles.

## 6. Durable single-host substrate

### 6.1 Storage layout

The first implementation uses one durable root selected in Phase 0:

```text
<durable-root>/
  sessions/<session-id>/manifest.json
  sessions/<session-id>/events.jsonl
  sessions/<session-id>/head.json
  artifacts/sha256/<prefix>/<digest>
  artifacts/manifests/<artifact-id>.json
  harness/project/manifest.json
```

No path is accepted from an untrusted child. The child uses stable IDs only.

The host is the only writer for an open session. Phase 0 selects either an exclusive filesystem lock or a create-exclusive ownership marker for accidental second-writer denial; it does not define cross-process adoption or lease renewal.

### 6.2 Commit protocol

Avoid a separate multi-store command journal in the initial architecture. One mutating command has a host-minted command ID and caller-scoped idempotency key, then follows this order:

1. validate actor, session, expected head, request digest, bounds, and policy;
2. write and verify any immutable artifact to a temporary confined path;
3. publish it with no-overwrite atomic rename and flush the containing directory;
4. append and flush one event containing every authoritative descriptor/reference for the command;
5. atomically replace and flush `head.json` with the committed event sequence/digest; and
6. return success only after the head is durable.

An artifact without a committed event is an unreferenced orphan and is never presented as session state. A committed event must never reference a missing or unverified artifact. Orphan cleanup is manual or retention-based future work.

Each event includes session ID, sequence, event ID, kind, causal parent IDs, command ID, producer role, bounded public payload, prior-event digest, and event digest. `head.json` anchors session ID, length, last event ID, and last digest. This is local tamper evidence, not resistance to a privileged actor rewriting every copy.

Provider or external effects occur only after command admission. If the host cannot prove whether such an effect completed, it commits `invocation.uncertain` or `effect.uncertain`; recovery never automatically repeats it.

### 6.3 Minimal durable schemas

Phase 0 specifies and fixtures only these schemas:

- `session-manifest@1`: root/parent IDs, repository commit, runtime/API versions, model/provider when observable, policy/capability digest, pinned harness manifest, state, creation/closure facts.
- `session-event@1`: the append-only envelope above.
- `artifact-manifest@1`: immutable ID/digest, kind, media type, bytes/items, creator event, provenance, confidentiality, and codec version.
- `context-object@1`: ID/version, generic kind, role, creating event, artifact or resident descriptor, reconstruction class, epoch-local residency, provenance, taint, and size facts.
- `context-projection@1`: recipient invocation, ordered object/event/harness selectors, policy/renderer versions, rendered digest/bytes/token estimate, omissions, and optional compaction record.
- `harness-entry@1`: typed prompt/memory/skill/worker-spec version, scope, content/reference, evidence, applicability, status, base/supersession version, and taint.
- `refinement-receipt@1`: proposal, exact edits, before/after versions, evidence range, proposer/reviewer identities, outcome, projection-cost delta, and rollback target.

Child worker parameters are recorded in `session-manifest@1` and `child.spawned`; a general reusable worker-spec execution schema is unnecessary until promoted worker specs can run.

### 6.4 Minimal events and states

Initial event kinds are limited to operations implemented in Stages 1-2:

- session/kernel: `session.created`, `session.reopened`, `session.closed`, `kernel.started`, `kernel.exited`, `kernel.replaced`;
- invocations: `invocation.started`, `invocation.completed`, `invocation.failed`, `invocation.uncertain`;
- child work: `child.spawned`, `child.completed`, `child.failed`, `child.cancelled`;
- context: `context.registered`, `context.projected`, `context.compacted`, `context.serialized`, `context.materialized`, `context.released`;
- artifacts: `artifact.created`, `artifact.verified`;
- harness: `harness.proposed`, `harness.applied`, `harness.rejected`, `harness.rolled-back`;
- accounting/policy: `resource.recorded`, `policy.denied`, `stop.recorded`.

Session/child execution states are `created`, `running`, `idle`, `completed`, `failed`, and `cancelled`. Reopen is an event, not a new lifecycle product. In-flight work whose outcome cannot be proved reopens as `failed` or `uncertain`; it is never silently resumed.

Unknown schema versions, event kinds, or state transitions fail closed. Migrations create upgraded views and never rewrite old events.

### 6.5 Recovery claims

Report three recovery properties separately:

- **event recovery:** the exact event envelope remains in a verified committed prefix;
- **descriptor recovery:** the referenced type, digest, provenance, size, and reconstruction class remain available; and
- **payload recovery:** the referenced immutable bytes remain available and verify.

A summary or digest does not substitute for a missing payload. APIs return `payload-missing`, `descriptor-missing`, `not-reconstructable`, or `source-reacquisition-required` rather than inferring success.

## 7. Minimal durable RLM sessions

### 7.1 Root and child contract

Stage 1 implements a real asynchronous recursive path:

```js
nodeRepl.rlm.spawn({ objective, contextRefs, budget }) // returns stable handle immediately
nodeRepl.rlm.status(childHandle)
nodeRepl.rlm.result(childHandle, { maxBytes })
nodeRepl.rlm.cancel(childHandle, reason)
nodeRepl.rlm.followUp(childHandle, { objective, contextRefs, budget }) // one queued turn after completion/idle
```

The first implementation allows one depth-one child per root and one active child at a time. These conservative limits test the abstraction without introducing general topology, scheduling, or concurrency.

Each child has:

- a durable child session ID and parent/root link;
- an independent restricted JavaScript kernel, epoch, event stream, context projections, and artifact/result namespace;
- an immutable objective, finite provider token/time/output budget, and equal-or-narrower capability profile;
- only explicitly selected public context or artifact references; and
- one terminal result artifact or typed failure/uncertainty record.

The parent receives a stable handle, not the answer. A terminal result can be retrieved after root kernel replacement or host restart. Native JavaScript values and capability tokens never cross sessions.

### 7.2 Restart behavior

`reopenSession(sessionId)` verifies the manifest, event head, artifacts, policy/capability pins, and harness manifest. It starts fresh kernels and epochs only when a new invocation is requested.

- Completed child results remain readable as bounded artifacts.
- Idle children may accept one explicit follow-up.
- Interrupted child/provider work becomes `failed` or `uncertain` and requires a new explicitly admitted child/turn; it is not replayed.
- Active live traversal is aborted on owner loss and never reacquired automatically.

This is sufficient to test durable identity and recovery. Daemon adoption and same-process continuation remain future options.

### 7.3 Minimal resource facts

Every provider invocation records one role: `root`, `child`, `compaction`, or `refinement`. Facts include invocation/session/root IDs, provider/model/settings when observable, input/output/cache tokens when reported, wall interval, projection ID, status, retry-of relation, and budget reservation/debit.

Scientific attempt and mediator receipts remain their existing distinct units. Root totals union unique leaf fact IDs; they do not record rollups as new usage. Missing provider telemetry is `unobserved`.

## 8. Context management and compaction

### 8.1 Generic core context objects

Stages 1-2 admit only:

- bounded JSON;
- bounded UTF-8 text;
- opaque artifact descriptors; and
- child result descriptors.

Semantic RDF/result kinds are unavailable until Stage 3. Calling a generic object an RDF dataset before a validated codec exists is a schema error.

Required operations are:

```js
nodeRepl.context.register({ kind, valueOrHandle, descriptor, retention })
nodeRepl.context.describe(contextObjectId)
nodeRepl.context.project({ objects, selectors, audience, invocationId, maxTokens, maxBytes })
nodeRepl.context.serialize(contextObjectId, { codec, reason })
nodeRepl.context.materialize(contextObjectId, { expectedKind })
nodeRepl.context.release(contextObjectId, { reason })
```

Programmatic search, transformation, and aggregation happen in the persistent JavaScript kernel or a domain adapter. The generic host records selected output as a new object when requested; it does not implement another query engine or a universal selector algebra.

The legacy `nodeRepl.rlm.registerContext/context/inspect` methods remain a kernel-local compatibility adapter.

### 8.2 Projection

One `project` call validates and commits a bounded model-visible projection. It records:

- exact object/event/harness versions and selectors;
- stable ordering and renderer/policy version;
- rendered SHA-256, bytes, estimated tokens, and provider usage link when available;
- omissions/truncation;
- audience, confidentiality, instruction authority, and taint decisions; and
- the consuming invocation.

Projection cannot reacquire a source, include evaluator-private data, silently search, or turn untrusted data into instructions.

### 8.3 Child compaction

Only package-created child invocations use package-owned compaction. Root/Codex context and compaction remain external and unobserved; no caller-context protocol is required for the initial core.

A child compaction records:

- exact first/last source event IDs and digests;
- first retained event;
- previous compaction ID;
- summary artifact and provider invocation;
- exact context/harness versions summarized;
- token facts before/after when observable;
- validation outcome; and
- the command that advanced, or refused to advance, the active compaction pointer.

Source events remain in L3. A failed or uncertain compaction cannot advance the pointer. The next projection contains the summary, recent events, and a bounded recovery index. Kernel L2 state survives compaction while the kernel lives.

Branch summaries are not implemented. A separate experimental arm uses a separate session.

### 8.4 Release and materialization

`release` drops an unpinned L2 value and records reconstructability; it does not delete artifacts or events. Automatic pressure-based GC, reference counting, retention graphs, and tombstones are deferred.

`materialize` verifies an artifact or pure derivation and creates a fresh session/epoch-local value. `source-reacquisition-required` stops for current authorization and budgets; it never performs hidden live access.

## 9. Continual Harness and refinement

### 9.1 Typed state

The foundation represents all four Prime kinds:

| Kind | Initial behavior |
| --- | --- |
| `prompt-note` | A narrow supplemental behavioral note. Promoted applicable versions may enter child projections. |
| `memory` | A labeled fact, decision, failure, preference, strategy, or inference with evidence and applicability. Promoted applicable versions may enter child projections but never replace current source evidence. |
| `skill` | A proposed reusable executable procedure with reference/arguments/dependencies/effects. Stored and reviewable, but not executable or prompt-authoritative in Stages 1-3. |
| `worker-spec` | A proposed reusable child role with objective/context/result/budget contract. Stored and reviewable, but not instantiable as a promoted executable spec in Stages 1-3. |

Initial scopes are `session-local` and `project`. No user-global mutation is implemented.

Every entry has stable ID, kind, schema/version, scope, title/path/tags, content or reference, evidence event/object IDs, source-versus-synthesis role, applicability, expiry/revalidation, taint/contamination, status, base/supersession version, and projection policy.

### 9.2 Refinement path

```text
public trigger events selected
  -> evidence bundle frozen
  -> model proposes a minimal typed diff
  -> schema/base-version/non-widening/contamination checks
  -> append-only proposal committed
  -> explicit authenticated host/operator apply or reject
  -> new pinned manifest eligible at the next child/session boundary
  -> bounded outcome evaluation
  -> retain, supersede, or rollback
```

The initial system has no automatic promotion. The proposal model cannot act as reviewer or mutate the current manifest. A successful task outcome alone is not promotion evidence.

Create/update/delete/rollback are append-only:

- create adds version 1;
- update creates version N+1 against an exact base digest;
- delete creates a revoked version without erasing history;
- apply atomically advances a session/project manifest to verified versions;
- reject preserves the proposal under bounded retention but makes it non-projectable; and
- rollback atomically points the manifest to a prior verified version while recording cause.

Active invocations never change harness versions mid-turn.

### 9.3 Prompt assembly

Child prompt assembly is deterministic:

```text
immutable base policy/capability summary
  -> caller objective
  -> promoted applicable project entries
  -> pinned applicable session entries
  -> selected context objects
  -> recent public events and diagnostics
```

Every assembly is a `context-projection@1`. Conflicts with immutable policy fail closed. Untrusted RDF, documents, messages, model synthesis, and quarantined skill/spec content are rendered only as delimited data when selected; they cannot modify the instruction layer.

### 9.4 Refinement triggers

Stage 2 permits:

- an explicit user/operator request;
- a repeated public local-validation or context-management failure;
- a public evaluator diagnostic naming a general behavior category without solution content;
- a source-backed correction of a memory; or
- a repeated generic procedure across structurally different synthetic cases.

Each trigger freezes the exact event range, selected evidence, counterevidence, proposer session, intended effect, and contamination classification. Recent-tail selection is a bounded input heuristic, not proof that older counterevidence does not exist.

### 9.5 Safety proportional to implemented effects

Because automatic and executable promotion are disabled, the initial safety design requires:

- immutable base policy and capability profiles;
- host-derived proposer/reviewer identity;
- evidence and applicability validation;
- prompt-injection and evaluator-honeytoken audit;
- append-only versions and rollback;
- project/session scope pinning; and
- production denial of skill/spec execution.

A separate quarantine filesystem, disposable execution validator, sealed final gate, and rate-limited promotion service are required only before executable or automatic promotion is proposed.

Corrupt current state never silently becomes trusted empty state. The harness reports `degraded`, retains the last verified manifest when available, and blocks new project-wide application until reviewed.

## 10. Linked Science adaptation layer

Stage 3 integrates the foundation with `lib/linked-science-runtime.mjs` without moving scientific semantics into the generic host.

### 10.1 First semantic codec

Implement one narrow RDF dataset/result artifact codec sufficient for the experiment:

- deterministic N-Quads for blank-node-free synthetic datasets;
- explicit rejection of unsupported blank nodes rather than a premature canonicalization claim;
- named/default graph preservation;
- RDF term type, datatype, language, order/bag/truncation metadata as applicable;
- source, query, operation, attempt, exchange, fingerprint, and evidence lineage;
- quad/row/byte counts and codec/runtime versions; and
- load to a fresh native handle with `artifact-backed` provenance.

Blank-node canonicalization, ontology excerpts, SHACL-specific objects, query-plan objects, evidence-document codecs, and generalized semantic aggregation remain future work.

### 10.2 Runtime integration

`linkedScience` keeps the ergonomic domain operations: graph load, schema search, query, mediated traversal, result profile/page/table/derive, neighborhood inspection, and PEEK orientation. The generic host supplies durable IDs, artifacts, projections, and refinement state; it does not add a parallel RDF query engine.

Existing authority remains unchanged:

- every approved live RDF/SPARQL request crosses the private consumer-owned mediator;
- no raw Fetch, sockets, ambient filesystem writes, SPARQL Update, authenticated authority, or automatic source following;
- reset/restart invalidates old handles;
- source reacquisition is a new approved, budgeted, receipted action; and
- retrieved RDF remains untrusted data without instruction authority.

### 10.3 Evaluator integration

Reuse the existing non-overlapping evaluator-private root and post-run scorer. The evaluator consumes bounded public events, artifact manifests, projections, and receipts after execution. It returns a bounded category and opaque private record ID. No new sealed service or keyed commitment is required while application remains operator-approved and non-automatic.

## 11. Proposed implementation surface

### 11.1 Host modules

Keep responsibilities reviewable in five modules under `packages/cleanroom-node-repl/src/`:

| Module | Responsibility |
| --- | --- |
| `durable-store.mjs` | Session manifests, events, heads, artifacts, idempotency, verification, and reopen. |
| `rlm-session.mjs` | Root/child kernels, stable handles, bounded admission, execution, result/cancel/follow-up, and leaf resource facts. |
| `context-manager.mjs` | Context descriptors, projections, child compaction, serialization/materialization, and release. |
| `continual-harness.mjs` | Typed entries, proposals, application/rejection, pinned assembly, and rollback. |
| `linked-science-artifact-codec.mjs` | Stage-3 RDF/result serialization and fresh-handle materialization; may live under root `lib/` if the Phase 0 ownership ADR keeps semantic codecs consumer-owned. |

`cleanroom-mcp.mjs` remains the three-tool adapter. `mediated-traversal.mjs` remains the sole live transport authority. `peek-runtime.mjs` remains orientation only.

Phase 0 may split a module only when a test seam requires it; it must not precreate empty product abstractions.

### 11.2 Child surface

Preserve `nodeRepl.rlm` and add methods in place as Stages 1-2 land. Add only:

```js
nodeRepl.session.status()
nodeRepl.session.events({ after, limit, kinds })

nodeRepl.context.register(...)
nodeRepl.context.describe(...)
nodeRepl.context.project(...)
nodeRepl.context.serialize(...)
nodeRepl.context.materialize(...)
nodeRepl.context.release(...)

nodeRepl.rlm.spawn(...)
nodeRepl.rlm.status(...)
nodeRepl.rlm.result(...)
nodeRepl.rlm.cancel(...)
nodeRepl.rlm.followUp(...)

nodeRepl.harness.list({ kind, scope, status })
nodeRepl.harness.propose({ edits, evidenceRefs, intendedEffect })
nodeRepl.harness.rollback(versionId) // request only; trusted host/operator applies
```

No child API accepts a path, raw Fetch closure, credential, capability token, evaluator reference, arbitrary gate command, or executable source to load.

## 12. Trust boundaries and invariants

1. Codex owns top-level goals, worktrees, delegation, and completion.
2. The package owns restricted root/child execution, durable session/context/harness state, and mediated capability integration.
3. The child is untrusted model-generated code; only typed bounded host calls reach durable state.
4. Base policy, capability profiles, worker-readable roots, and mediator authority are immutable release inputs.
5. The public MCP surface remains exactly three tools through Stages 1-3.
6. Host durable paths are outside worker-readable, cwd, and module roots; children use IDs, never paths.
7. A kernel loss always creates a new epoch. Old handles remain stale.
8. Only verified artifacts or newly authorized source operations can create fresh native handles.
9. Session events, context descriptors, PEEK orientation, native handles, bounded displays, artifacts, and experiment receipts remain distinct.
10. Compaction never deletes or replaces exact source events.
11. Unknown or uncertain provider/external effects are never automatically replayed.
12. Child authority and budgets are equal or narrower than the root; context transfer conveys data references, not authority.
13. Retrieved RDF/documents and model-generated content have no instruction authority by default.
14. Evaluator-private references, expected answers, honeytokens, and solution paths never enter worker events, context, artifacts, harness proposals, or projections.
15. Refinement cannot edit base policy or capability ceilings; skill/spec execution and automatic promotion remain disabled.
16. An empty result, failed source, expired payload, digest, summary, or memory keeps its exact epistemic scope.
17. Bulk RDF/results remain in L2 or immutable artifacts; only bounded views enter model context.
18. A phase cannot trade a safety failure for improved answer rate.

## 13. Dependency-ordered roadmap

Each stage is a separately authorized, reviewable worktree slice. There are no more than three implementation stages after Phase 0.

### Phase 0 — Characterize, decide the minimal core, and freeze experiments

**Deliverables**

- Freeze black-box characterization of current `KernelBroker`, child globals, persistent bindings, reset/timeout/error distinctions, PEEK survival, optional one-shot recursion, traversal owner loss, and Linked Science bootstrap.
- Record one concise ADR covering:
  - package/Codex ownership;
  - the five-module boundary;
  - durable root and worker-root separation;
  - single-writer denial;
  - append/artifact/head ordering;
  - canonical JSON and digest vectors;
  - numerical event/artifact/context/projection/session quotas;
  - idempotency and uncertainty;
  - fresh-epoch recovery;
  - the seven schemas;
  - Stage-1 child depth/width/budgets; and
  - manual-only harness application.
- Add hand-authored schema fixtures and model-based tests for only the implemented Stage-1/2 transitions. Do not model branches, mailboxes, schedules, daemon adoption, or automatic promotion.
- Freeze the H1/H2/H3 evaluation fixtures, controls, public rubrics, evaluator-private honeytokens, and stop/go criteria.
- Produce a focused Prime core matrix covering L0-L3, persistent REPL, async child handles, independent child state, context projection/compaction, exact history/recovery, four harness kinds, refinement, prompt assembly, and rollback. Product mechanisms are labeled future options, not missing core coverage.
- Keep repository-boundary validation for sibling and evaluator-private denial. Add the selected durable, proposal, and promoted roots only when their exact Stage paths exist.

**Acceptance**

- existing `npm test`, `npm run smoke`, `npm run cleanroom:check`, repository-boundary tests, Markdown/link/fence checks, and `git diff --check` pass without live access;
- the golden baseline is independently derived rather than generated from the subject under test;
- every Stage-1/2 schema field supports a named test or experiment observation;
- no deferred product API/module/schema appears in the authorized implementation list; and
- the focused Prime core matrix has no missing item within its declared scope.

**Stop/go**

Stop on unresolved durable root, writer model, commit ordering, quotas, epoch semantics, child isolation, compaction ownership, refinement authority, or evaluator-boundary decisions. Other product questions do not block Stage 1.

### Stage 1 — Durable RLM and context core

**Deliverables**

- Implement `durable-store.mjs`, `rlm-session.mjs`, and `context-manager.mjs` for generic JSON/text/opaque artifacts.
- Give the compatibility root a durable session ID and append-only event history.
- Implement one depth-one asynchronous child with independent restricted kernel/history/context and a stable terminal-result handle.
- Implement deterministic child projections, package-child compaction, context serialization/materialization/release, explicit reopen, fresh epochs, and minimal resource facts.
- Preserve the three-tool MCP, current raw-network denial, PEEK behavior, and mediator authority.

**Acceptance tests**

- create/append/reopen, idempotency same/different digest, artifact no-overwrite, missing/corrupt artifact, quota/path/symlink denial, event-chain/head verification, torn tail, and unreferenced orphan behavior;
- bindings and RLM generic context survive ordinary calls; host restart reopens exact committed events and artifacts;
- root spawns one child and receives a handle before completion; child state is independent; terminal result remains retrievable after root kernel and host restart;
- interrupted provider work becomes failed/uncertain and is not replayed;
- compaction preserves source events, advances its pointer only after verified summary/projection commit, and does not destroy L2 state;
- old handles remain stale after restart; verified materialization creates new identities; and
- depth, width, token, time, output, artifact, and context limits fail before provider admission where applicable.

**Stop/go**

Stop on false completion, duplicate uncertain effect, partial committed state, path escape, false handle residency, lost source events, shared mutable child heap, authority widening, or unexplained root/child usage.

### Stage 2 — Continual Harness and reviewed refinement core

**Deliverables**

- Implement `continual-harness.mjs` with all four typed kinds, session/project scopes, append-only versions, evidence bundles, applicability, proposal, apply/reject, pinned prompt assembly, and rollback.
- Permit promoted prompt notes and memories in child projections.
- Store skill and worker-spec proposals as non-executable review objects; production execution/import remains denied.
- Integrate one bounded refinement provider role and explicit operator application.

**Acceptance tests**

- create/update/revoke/list/version for all four kinds; stale-base update denial; restart recovery; manifest pinning; atomic apply and rollback;
- deterministic prompt projection with exact entry versions, ordering, omissions, digest, and token estimate;
- base-policy conflict, capability widening, ungrounded fact, malicious data instruction, held-out fragment, evaluator honeytoken, and cross-scope mutation denial;
- skill/spec content cannot execute, import, change roots, or instantiate a child;
- corrupt current state becomes explicit degraded state and preserves the last verified manifest when possible; and
- a manually approved prompt/memory edit can be compared against a pinned no-edit control and rolled back.

**Stop/go**

Stop if model content can apply itself, mutate base policy/capabilities, enter an active invocation mid-turn, access evaluator material, execute skill/spec state, erase history, or make rollback non-deterministic.

### Stage 3 — Linked Science adapter and paired evaluation

**Deliverables**

- Implement the narrow blank-node-free synthetic RDF/result codec and Linked Science context adapters.
- Preserve native RDF/JS terms, named graphs, result semantics, attempt/receipt lineage, bounded views, and fresh artifact-backed handles.
- Integrate public session/projection/refinement evidence with the existing evaluator-private scorer.
- Run H1, then H2 only if H1 passes; report H3 throughout both.

**Acceptance tests**

- deterministic named-graph round trip, datatypes/languages, order/bag/truncation facts, artifact hash verification, reset/restart/load with a fresh handle, stale-handle rejection, and unsupported blank-node refusal;
- ontology-driven discovery, bounded query/derivation, exact empty-result scope, source failure, and honest-stop fixtures;
- no raw Fetch, evaluator leak, bulk projection, query-template memory, hidden source reacquisition, or semantic regression against the ephemeral baseline; and
- validated compact experiment receipts registered under `artifacts/experiment-results/`.

**Stop/go**

Stop if durability/refinement improves apparent task success by leaking answers, flattening semantic roles, bypassing grounding, widening authority, hiding extra provider work, or accepting stale/unverified evidence.

## 14. Smallest end-to-end experiment

Run one paired experiment in one worktree with two sequential contrasts. Use deterministic local synthetic RDF and a configured bounded provider; no live scientific query is required.

### 14.1 H1 contrast — durable RLM/context continuity

Fixture A contains multiple named graphs, misleading labels, one relevant schema relation, and one bounded result derivation.

1. Start a durable root and register the generic objective/context.
2. Materialize Fixture A through the Stage-3 RDF adapter.
3. Spawn one child with selected context references and a fixed budget.
4. Force a child compaction after a predeclared event/token threshold.
5. Let the child reach a committed idle or completed boundary, commit the source dataset/result artifact, and terminate the host.
6. Reopen the session from a new host process.
7. Verify the old native handles are stale, materialize a fresh artifact-backed handle, retrieve the committed child result or perform one explicit follow-up, and answer the predeclared second-turn question without reacquisition.

Control: run the same case with ephemeral compatibility mode, identical model/settings/objective, and matched bounded projection. The control must either stop honestly after restart or perform an explicitly counted rematerialization supplied by the evaluator; it may not receive hidden durable state.

**H1 succeeds only if:**

- the treatment preserves exact event history, child identity, compaction source links, artifacts, provenance, and bounded projections;
- the post-restart result is correct under the public rubric without a live/source retry;
- old handles are rejected and new handles cite verified artifacts;
- provider/child/compaction usage is attributable; and
- the control cannot obtain the same continuity from leaked prompt text or repository artifacts.

### 14.2 H2 contrast — refinement transfer and rollback

Fixture B and held-out Fixture C are structurally analogous but use different IRIs, labels, and graph layouts.

1. Run Fixture B under the pinned pre-refinement harness.
2. A public verifier may report only a general diagnostic such as `empty-result-scope-overclaim`, `evidence-role-confusion`, or `stale-handle-claim`.
3. Freeze the public trigger events and let the refinement provider propose one minimal prompt-note or memory edit.
4. Apply it explicitly through the authenticated operator path.
5. Run fresh children on Fixture C in randomized pinned no-edit and edit arms with the same model/settings, budget, and projection ceiling.
6. Roll back and verify that later projections return to the prior manifest.

**H2 succeeds only if:**

- the edit improves the predeclared general rubric on Fixture C;
- it contains no case-specific predicate, path, answer, evaluator ID, or hidden reference;
- exact evidence and applicability are auditable;
- actual projection-token differences are reported;
- no skill/spec becomes executable; and
- rollback changes future projections atomically without rewriting earlier events.

### 14.3 Hard failures

Any of the following fails the relevant experiment regardless of answer quality:

- raw network/filesystem bypass or unapproved live access;
- evaluator-private or held-out leakage;
- full RDF/result projection;
- old handle reported resident after epoch change;
- summary or memory substituted for missing evidence;
- automatic replay of an uncertain provider/source effect;
- model self-application of refinement;
- executable skill/spec activation;
- case-specific query/template retention presented as generic learning;
- unsupported scientific claim or global-absence inference; or
- unaccounted child/compaction/refinement provider use.

## 15. Risks and proportional mitigations

| Risk | Lean mitigation |
| --- | --- |
| Mutable files masquerade as durable history | Append-only events, artifact hashes, atomic publication, and anchored head verification. |
| Simpler commit protocol exposes split state | Artifacts publish before one authoritative event; success follows durable head update; cross-store workflow is intentionally absent. |
| Compaction erases evidence | Exact source ranges remain in the log; summaries cannot satisfy payload-dependent claims. |
| Host restart replays effects | In-flight effects reopen failed/uncertain and require explicit new admission. |
| Old handles appear recovered | Fresh epochs and artifact-backed materialization create new IDs only. |
| Minimal child abstraction becomes hidden sync call | Spawn returns a stable handle before completion and the child owns independent kernel/history. |
| Refinement learns prompt injection or evaluator hints | Public evidence bundles, taint/contamination audit, explicit reviewer, no automatic application. |
| Skill/spec records become an execution bypass | They remain non-executable and non-authoritative; no loader or promoted execution root exists. |
| Manual review creates confirmation bias | Predeclare H2 control/treatment, applicability, rubric, and rollback before applying the edit. |
| Generic context flattens RDF | Semantic codec remains consumer-owned and arrives only in Stage 3. |
| Narrow codec overclaims RDF canonicalization | Initial codec rejects blank nodes; broader canonicalization needs a separate decision and tests. |
| No daemon loses active work | Pilot recovery promises committed history/artifacts only and reports interrupted work honestly. |
| Minimal accounting hides cost | Record every root/child/compaction/refinement provider leaf fact and mark missing telemetry unobserved. |
| Existing receipt registry is confused with runtime history | Cross-reference immutable IDs; do not duplicate full logs or claim methodology is a result. |

## 16. Decision log

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| D-001 | This repository is the sole implementation authority. | Accepted | Prevents ownership drift. |
| D-002 | `packages/cleanroom-node-repl` owns the durable RLM/context/harness substrate. | Accepted | It already owns restricted execution and broker boundaries. |
| D-003 | Codex owns top-level goals, worktrees, delegation, and completion. | Accepted | Avoids a competing workflow engine. |
| D-004 | Preserve exactly three MCP tools through Stages 1-3. | Proposed | New capabilities fit typed child adapters. |
| D-005 | Durable RLM sessions, context management, and continual refinement are irreducible foundations. | Accepted for this plan | User clarified that these may not be replaced by the current broker. |
| D-006 | Semantic-web behavior is a secondary adapter over the generic core. | Accepted for this plan | Prevents premature semantic generality in host infrastructure. |
| D-007 | Use one trusted single host and explicit reopen; defer daemon/protocol/leases/adoption. | Proposed; Phase 0 ADR | Tests durability without product control-plane scope. |
| D-008 | Use one event log plus immutable blobs and an anchored head; no separate command journal initially. | Proposed; Phase 0 ADR | Sufficient atomic authority for the narrow single-writer mutation model. |
| D-009 | Begin with one depth-one asynchronous child and no general mailbox. | Proposed; Phase 0 ADR | Preserves the RLM abstraction while isolating the recursive-session hypothesis. |
| D-010 | Package-owned projection/compaction applies only to package-created children. | Proposed; required | Root/Codex L1 remains caller-owned and unobserved. |
| D-011 | Generic host context operations are register/describe/project/serialize/materialize/release. | Proposed | Search/transform/aggregate remain programmatic JavaScript or domain adapters. |
| D-012 | Initial harness scopes are session and project. | Proposed | User-global state is not needed for H2. |
| D-013 | All four harness kinds are represented; only prompt/memory may influence execution initially. | Proposed | Tests typed continual state without executable promotion risk. |
| D-014 | Refinement application is explicit and authenticated; automatic promotion is disabled. | Proposed | Safety proportional to current effects. |
| D-015 | Exact event, descriptor, and payload recovery are separate claims. | Proposed; required | A summary or digest cannot replace scientific evidence. |
| D-016 | Minimal provider leaf facts precede H1; a general accounting subsystem is deferred. | Proposed | Keeps child/compaction/refinement cost visible. |
| D-017 | Stage-3 RDF codec initially supports blank-node-free synthetic data and rejects unsupported input. | Open; Phase 0 ADR | Avoids pretending a canonicalization problem is solved. |
| D-018 | Full Prime daemon/product fidelity is a future option, not a Phase 0 gate. | Accepted for this plan | The initial claim is limited to the durable RLM/context/Continual Harness core. |

## 17. Focused Prime core review

Before Stage 1, an independent reviewer compares the pinned Prime paper/repository revision with this plan only for:

- L0-L3 visibility and transition mechanisms;
- persistent REPL behavior;
- asynchronous RLM admission and stable child handles;
- independent child kernel, context, history, and result behavior;
- append-only history and exact recovery after compaction;
- package-child prompt projection and compaction;
- four typed continual-harness kinds;
- local/project persistence and deterministic supplemental prompt assembly;
- proposal/create/update/delete semantics, before/after versions, application boundary, and rollback; and
- divergence required by Linked Science's restricted authority and evaluator boundary.

The review matrix records Prime claim, primary source location, current Linked Science baseline, target stage/API/schema, `adopt|adapt|reject`, semantic/security difference, and executable acceptance evidence.

Daemon transport, Agents View, branch/fork/clone, general messaging, schedules, autonomous mode, exhaustive accounting, and automated executable promotion are recorded as future options. Their absence does not fail the core review and must not be misrepresented as full Prime Agent fidelity.

## 18. Future-options appendix

A future proposal may add one of the following only after naming the blocking evidence from H1-H3:

- multi-client daemon and operator protocol;
- process leases, adoption, and bounded automatic recovery;
- concurrent/deeper child trees and general messaging;
- in-session branches, branch summaries, forks, and clones;
- package-attached continuations, schedules, or autonomous gates;
- full descendant resource accounting;
- automatic L2 GC and graph-based retention;
- executable skill or worker-spec validation and promotion;
- sealed/rate-limited evaluator promotion gates;
- user-global harness state;
- cross-root context transfer; or
- additional RDF/ontology/SHACL/SPARQL/query-plan codecs.

Each future proposal is a separate plan amendment and authorization boundary. It must state why existing Codex, Git/filesystem primitives, explicit artifacts, or manual operator steps are insufficient.

## 19. Verification and durable handoff

For every authorized stage, record:

- starting commit, branch/worktree, changed modules/schemas, focused commits, local-main reachability, upstream status, and uncommitted state;
- commands run and exact pass/fail outcomes;
- schema/API versions and compatibility behavior;
- public synthetic receipts/artifacts and experiment-registry entries;
- untested provider, evaluator, durability, or platform boundaries;
- stage acceptance evidence, stop/go decision, open risks, and exact next action; and
- confirmation that no raw Fetch, sibling dependency, evaluator leak, capability widening, hidden retry, false handle recovery, automatic refinement application, or unsupported scientific claim was introduced.

Methodology and results remain distinct. Before an intentional experiment loses resident state, capture a compact result receipt under `artifacts/`, register it in `artifacts/experiment-results/registry.json`, and run `npm run evaluation:results:validate`. If only prose survives, label it `retrospective-summary` and enumerate missing evidence.

Phase completion does not authorize the next stage. Live traversal, export, dependency changes, global configuration, push, executable promotion, and future-option work always require separate explicit authorization.
