# Implementation PLAN: wiki memory and reviewed skill evolution

- **Status:** Authorized phase-0 foundation implemented, 2026-09-19; later phases and learning evaluations remain proposed. See the implementation record below.
- **Owner:** Codex coordinates work; a repository maintainer reviews wiki revisions and releases. The scientific runtime remains the evidence/session service.
- **Scope:** Reuse Codex history, preserve selected scientific evidence, maintain a versioned procedural wiki, propose one atomic skill change, validate it, then release or reject it with a durable record.
- **Authority:** The user authorized this plan and documentation. No runtime code, skills, hooks, memory settings, transcript exports, learning runs or model evaluations are being implemented or enabled now. Later phase execution requires an appropriate task authorization; ordinary authorized public reads retain the existing broker contract.
- **Dependency:** Preserve the existing frozen UniProt baseline and its isolation. This planning work may proceed now; learning/evaluation cannot silently contaminate that baseline. Durable RDF storage is a separate [task](durable-dataset-persistence.md).

## 1. Decisions and boundaries

The first implementation is **procedural learning between episodes**. The wiki is evidence for a maintainer and skill proposer, not injected scientific advice for every task. A separately authorized experiment may later test runtime retrieval of reviewed scientific memory. No lesson grants permissions, proves a source current, resumes an expired graph handle, or changes Codex's ownership of goals and workers.

Reuse three existing assets before adding machinery: Codex's task history, its host-managed distilled memory, and Linked Science's receipts/native graph service. Do not create a duplicate universal transcript recorder or make hooks a prerequisite. First compare actual bounded host history with the scientific receipt fields needed for a selected episode; add a small join record for measured gaps. The wiki, candidates and release receipts have project-specific semantics that host memory does not replace.

Canonical reviewed wiki content will be versioned Markdown with validated metadata under `wiki/`. Machine-owned episode, intervention and release records will live under `artifacts/wiki-learning/`. Candidate and archived skill bundles stay under that artifact tree, outside all discovered skill roots. Active releases alone enter `.agents/skills/`. Science Cloud wiki memory is an independent repository-owned system, separate from the user's Obsidian wikimemory. It has no shared store, runtime dependency, display/export route, synchronization or import integration with that system. An optional repository-derived RDF index remains rebuildable from the canonical records.

Use the existing [scientific session](../architecture/scientific-session.md) for bounded selected data and worker findings. Add no scheduler, model provider, memory installer or learning API to the three-tool MCP. The [goal-loop boundary](../experiments/goal-loop-state-graph.md), mediated authority, provenance and lifetime contracts remain protected.

## 2. Research basis and motivating evidence

[WikiSkill paper](https://drive.google.com/file/d/1c1K0yGmQJGb3KUdbj1Cu17KQYJ7NFrE3/view) distinguishes immutable source traces, an evolving wiki, and reversible active skills with rationale. Its maintainer compares successes/failures; its proposer uses evidence to make one atomic change; validation accepts or rolls back the skill while rejected interventions remain in wiki history. The paper's maximum-eight, five-failure/three-success sample is an experimental setting, not this project's universal policy. The task agent in the paper normally cannot read the wiki and receives skills in full; Codex's selective discovery/loading needs separate tests. Wiki diagnoses remain hypotheses, not established causes.

Planning inputs were the supplied full architecture review (`/private/tmp/wikiskill-linked-science-architecture-review-20260919.md`) and the existing detailed paper note (`/Users/cvardema/Obsidian/obsidian/03 - Resources/Literature/@tang-2026-wikiskill.md`). The literature note is research provenance only, not a runtime dependency or connection to the user's Obsidian wikimemory. This plan does not claim a fresh full-PDF review or reproduce the paper's performance results. It incorporates two corrections to that review: reuse existing Codex history before adding hooks, and retain normal implicit discovery for released maintainer/proposer skills rather than making them explicit-only.

The motivating development episode is the reported shift from endpoint smoke testing to understanding/visualizing a real WikiPathways structure. The agent reportedly retained a small RDF slice after the objective changed and failed to establish equivalence with the requested representation/revision. That account is a **reconstructed development hypothesis** until its specific task events and artifacts are joined. The [endpoint receipt](../../artifacts/endpoint-examples/20260919/receipt.json) proves a successful WP1560 metadata query; it does not prove pathway visualization, full structure, revision equivalence, or that this exact metadata response caused the later failure.

Keep three patterns distinct: objective-to-representation mismatch; stale worktree/MCP activation paths; and user-approval propagation across worker contexts. The [worker receipts](../../artifacts/scoped-data-bridge/live-20260919-public-worker-01/receipt.json) support the last pattern and bounded retained-result reuse, not scientific visualization quality. Mark omitted conversation segments, unknown revisions and missing images explicitly. Never reconstruct nonexistent tool events or upgrade a prose recollection to a machine receipt.

## 3. Existing Codex storage: reuse and gaps

### Observed host layers

| Layer | What it supplies | Proposed use | Limits and ownership |
| --- | --- | --- | --- |
| Persisted task/rollout history | User messages, visible assistant responses, tool items and host metadata | Reference a selected task/turn/item; import only approved bounded evidence when needed | Host-owned operational history, not our immutable experiment archive; compaction, deletion, truncation and version changes may affect availability |
| Distilled local Codex memory | Generated reusable context from eligible prior chats | Reuse host personalization; record its treatment in evaluations, optionally reference a reviewed user-approved memory as a lead | Generated/selected context, not a complete trace, scientific truth store, release ledger or canonical project wiki |
| Linked Science state | Native graphs/results, scoped publications, query provenance, attempt receipts | Compute over retained data and join operation IDs to selected host actions | Handles expire; attempt history is bounded; service persistence is not disk recovery |
| Project evidence and wiki | Selected durable citations, objective revisions, hypotheses, interventions and measured outcomes | Canonical project learning records | New semantics and validators, not another copy of all host conversations |
| Active skills | Released instructions, references, scripts and invocation metadata | Procedural behavior in future episodes | Discovery, loading and compliance are distinct; never infer active use from a file write |

Official [memory documentation](https://learn.chatgpt.com/docs/customization/memories) says local memory is generated from eligible idle chats, stored under Codex home, and controlled through supported settings and `/memories`. Generation and use are separate controls; external-context exclusion can omit MCP/web sessions. Memory is asynchronous and selective. Treat generated files as host state, not a hand-edited integration API. Do not enable or disable memory globally for this project.

Narrow local inspection on 2026-09-19 observed `sessions/`, `history.jsonl` and `state_5.sqlite` category existence under the current Codex home; `memories/` was absent there. That does not establish global/account memory enablement or memory absence on other hosts. Only SQLite **schema metadata** was read: `threads` includes rollout path, history mode, memory mode, model/reasoning and version fields; spawn-edge and attachment tables exist. No conversation rows, memory entries, history lines or private transcript bodies were read for this plan. These internal tables/paths are diagnostic evidence, not a supported database integration contract. `history.jsonl` is not assumed to contain complete tool trajectories.

### Stable access preference and version pin

Prefer documented host read APIs to parsing rollouts. [App Server documentation](https://learn.chatgpt.com/docs/app-server) provides stored-thread reads, experimental turn/item pagination, skill listing/refresh and explicit skill input. [Hook documentation](https://learn.chatgpt.com/docs/hooks) explicitly warns that transcript-file format is not a stable hook interface. The current desktop `read_thread` tool returns bounded summaries/outputs; do not equate that view with lossless raw execution history.

A local schema was generated without starting model work using `/Applications/ChatGPT.app/Contents/Resources/codex`, version **0.155.0-alpha.9.2**, into temporary storage. The proposed compatibility profile must pin both binary version and schema digest. Observed schema fields, not assumed future APIs:

| Surface | Observed declaration | Implementation consequence |
| --- | --- | --- |
| `thread/read` | `threadId`, `includeTurns`; schema discourages full hydration for paginated histories | Read metadata first; select bounded pages where supported |
| `thread/turns/list`, `thread/items/list` | Cursor, limit, direction; turns have `itemsView`, items may filter `turnId` | Experimental capability probe; preserve pagination gaps and unsupported outcomes |
| `ThreadItem` | MCP call has id, arguments, result/error, status and duration; user/agent message and collaboration variants exist | Whitelist observable fields; drop reasoning/hidden content; test actual persisted coverage before claiming capture |
| `Thread` / `Turn` | Model/provider, reasoning effort, CLI version, IDs, source and history mode; turn status/times/items | Useful environment and ordering evidence; not a normalized changing scientific objective |
| `skills/list` | `cwds`, `forceReload` in installed schema | Do not send the newer docs' `perCwdExtraUserRoots` field to this pinned version |
| Skill input / refresh | `UserInput` skill name/path, `skills/changed`, and separate extra-roots method declared | Only a supported client connection may use these; no assumed attachment to an arbitrary Desktop process |
| Built-in memory | Message variant has `memoryCitation`; no dedicated memory read/write method found in generated `ClientRequest` | A citation is not a full exposure log. No direct memory DB/file writer; missing controls remain an evaluation limitation |
| Goals | Goal get/set/clear declared | Optional host goal reference; ordinary user intent changes still require message-linked revisions, not automatically creating a new goal |

Schema SHA-256 pins for the planning snapshot:

```text
ClientRequest.json          8e5a1b6a7103fea63a53ef96d7ab1062decbd6571701542f5a969953e23a64f5
v2/ThreadReadParams.json     dfe040c6ac71d30795b8be3f3ff232e66f362a37f883b491e5d1ea367f470db4
v2/ThreadReadResponse.json   d6c23e33656f3c3a88dada2bbe419b744979b080db8c6caced1b2c328ce6a290
v2/SkillsListParams.json     1d245374e64c5acc9739dfc68a4fe5114c6c9147af04c480886f1846d2ca6239
v2/TurnStartParams.json      2dfcf68705896fadc344ccfeb2e9fe5a6bcbbb8b9a90cf449ce232b636daf05a
```

These establish declared shapes, not successful Desktop attachment, full-history completeness or exact active model context. Future implementation generates a fresh pinned profile and rejects incompatible fields. Schema additions must not silently expand imported content. No stable built-in-memory export contract was established. If history APIs are unavailable, accept a deliberately supplied/redacted episode extract and label its coverage. Raw rollout parsing is an opt-in, versioned fallback for selected files only, not the default.

### What still needs joining

Existing history can avoid new recording of tool text, but does not by itself establish these scientific relationships:

- Objective revision ID and scope: which user correction changed a smoke test into a full-structure/visualization request, and which acceptance conditions applied to each action.
- Host tool-item ID → MCP evaluation → workspace/operation/traversal ID → result/artifact → delivered visualization. A single JavaScript tool evaluation can run several scientific operations. Use explicit IDs where present; never infer a unique join from timestamps alone.
- Source accession, revision, representation and requested extent; whether a GPML/diagram and RDF slice describe equivalent content. Tool success and count alone are insufficient.
- Actual active skill bundle and loading evidence, memory exposure, truncation, and evaluator access. Declared availability does not prove use.
- Separate outcome judgments from machine checks: an ended turn or successful network request is not objective fulfillment.

The first adapter produces an **episode sidecar** with these joins and pointers, not a second raw event archive. Unknown links remain unresolved. Only after coverage tests show a missing prospective field should a hook or narrowly scoped instrumentation change be proposed. A future hook emits bounded correlation metadata; it must neither inject wiki instructions nor start a learning turn.

## 4. Proposed repository layout and canonical ownership

All paths below are proposed, except existing paths explicitly called out. Create them only in their authorized phase; do not scaffold empty trees now.

```text
wiki/
  index.md                         # generated navigation over reviewed/current patterns
  patterns/<pattern-id>.md         # canonical text plus schema-validated front matter
  evolution.jsonl                  # coordinator-appended revision/supersession history
  skill-impact.md                  # generated view, never proposer-authored score claims
artifacts/wiki-learning/
  episodes/<episode-id>/manifest.json
  episodes/<episode-id>/joins.jsonl
  episodes/<episode-id>/evidence.json
  episodes/<episode-id>/extracts/   # optional authorized redacted excerpts, not full histories
  proposals/<proposal-id>/proposal.json
  candidates/<bundle-id>/          # quarantined complete bundles, no discovered roots
  evaluations/<run-id>/receipt.json
  releases/<release-id>/receipt.json
  releases/<release-id>/bundle/    # immutable accepted bundle snapshot
  interventions.jsonl             # machine-owned accept/reject/revert outcomes
  generated/wiki-index.nq          # optional rebuildable RDF projection
lib/wiki-learning/
  contracts.mjs  evidence.mjs  episode-import.mjs  wiki-revisions.mjs
  bundle.mjs  evaluation.mjs  release.mjs
  adapters/codex-history.mjs       # read API/import adapter, version-profiled
  adapters/scientific-receipts.mjs # bridge host actions to existing receipt artifacts
  adapters/codex-skills.mjs        # discovery/loading observations on supported client
scripts/wiki-learning/
  import-episode.mjs  validate.mjs  propose.mjs  evaluate.mjs  release.mjs
  build-index.mjs                  # repository Markdown/RDF index generation
schemas/wiki-learning/*.schema.json
test/wiki-learning/*.test.mjs
test/fixtures/wiki-learning/development/   # synthetic public examples only
.agents/skills/
  linked-data-repl/                # existing; future narrow revision only
  scientific-wiki-maintainer/      # future released skill
  scientific-skill-proposer/       # future released skill
```

`artifacts/` is the controlled project area, not blanket permission to commit private data. Default inputs are references to already authorized evidence, plus redacted minimum excerpts when explicitly retained. Private transcripts and sealed evaluator material stay outside Git and worker-visible paths under an explicitly selected protected store; manifests use opaque locators. No new permanent private store is selected implicitly. Retention/deletion policy covers host reference disappearance, redacted content and tombstones without promising that Git history erases secrets. Prevent secrets before commit; an actual leak needs a separate remediation decision.

One coordinator performs compare-and-swap writes against a base wiki revision. Workers produce proposals and findings; they cannot silently replace canonical pages or write intervention outcomes. The user/repository maintainer approves semantic promotion and a release within the authorized task; routine deterministic validation does not need repeated permission. Rejected proposals and measurements survive rollback. Incorrect wiki hypotheses can be marked contradicted, superseded or withdrawn while retaining an audit link. "Persistent wiki" never means "all previous advice remains true."

The optional repository-derived RDF index is regenerated from canonical metadata and receipts, uses provenance links, and is discarded/rebuilt on hash mismatch. It never promotes RDF source text into instructions. All proposed storage, maintenance and presentation remain within Science Cloud; no Obsidian integration is planned.

## 5. Versioned data contracts

Schemas use `schemaVersion`, stable IDs, creation time, producer/version, provenance and explicit unknown/null fields. Deterministic validators reject secret-bearing fields, invalid paths and unsupported versions. Human-readable text and programmatic fields serve different purposes; neither silently substitutes for the other.

| Record | Required fields and invariants | Owner |
| --- | --- | --- |
| Episode | ID; selected host task/turn refs; ordered objective revisions with original message refs; constraints and authorization scope; host/runtime/model versions; skill bundle hashes; built-in memory treatment; split; source versions; output refs; capture coverage/gaps; separately typed machine and user/agent outcome judgments | Coordinator/import adapter; user correction remains attributed |
| Event reference / join | Host item ID and source locator; producer sequence; timestamps as secondary evidence; event kind; linked operation/traversal/artifact IDs; relation basis `explicit`, `verified-content`, `inferred` or `unresolved`; redaction/truncation | Deterministic adapter; inferred joins require review |
| Evidence | ID; content hash and hash domain; artifact/host locator plus precise selector; representation/source/revision; producing action; availability `bytes-retained`, `excerpt-only`, `receipt-only`, `host-reference`, `missing`; completeness and retrieval bounds; optional historical session/object/epoch | Evidence validator; retain no claim of live residency |
| Pattern revision | ID/title; one mechanism; class `procedure`, `source-observation`, `environment`, `authority` or `preference`; observation separate from explanatory hypothesis; supporting and opposing episode refs; applicability/exclusions; confidence/review; author/reviewer; parent/supersession; revalidation conditions; influenced splits | Maintainer proposes; coordinator applies reviewed patch |
| Skill proposal | ID; base complete-bundle digest; target skill; atomic behavioral hypothesis; full diff; motivating pattern revisions; rationale; applicability; protected contracts; expected cost/benefit; evaluation plan and split exposure | Proposer; no self-approval or score mutation |
| Evaluation | Run ID; baseline/candidate digests; case/split versions and hashes; model/tool/host profile; actual worker isolation and memory controls; explicit-load vs discovery arm; observation coverage; per-case score vector; hard failures; cost/uncertainty; decision inputs | Harness plus designated evaluator, not proposer |
| Release/intervention | Decision and reason; evaluation refs; full published file manifest; base/new digest; approval scope; installation/discovery/loading/behavior observations; activation episode boundary; prior release/rollback target; rejected and revert events retained | Controlled writer; ledger generated programmatically |

Objective revisions are immutable versions inside an episode: a newer revision supersedes scope without rewriting the earlier intent. Events can join several revisions when appropriate. Stable host locators are logical `(host, task, turn, item)` references; paths/cursors are retrieval hints, not permanent identities. Deduplicate repeated imports by source ID and content digest; report changed content under the same source ID instead of overwriting it. Preserve source order and causal edges, not a fabricated global clock order.

A durable citation must survive losing a REPL worker: retain an authorized artifact/excerpt or say only a receipt/reference survived. A response-byte digest is not a canonical RDF hash. Retained native graph equality needs a separately stated canonicalization/term policy; blank-node names alone are not stable graph identity. Re-fetching after source drift is new evidence. Full source/RDF export is not silently authorized by a learning run or required for a receipt-only pilot.

## 6. Components, phases and acceptance gates

Each phase is a future implementation slice with code, fixtures and review. No phase here starts a scheduler or commits runtime changes merely because its paths are specified. Avoid installing packages unless separately authorized; use the existing Node/JSON/RDF tooling where it suffices.

### Phase 0 — Pin contracts and compare reusable host evidence

**Code proposed:** `contracts.mjs`, `schemas/wiki-learning/{episode,evidence,pattern,proposal,evaluation,release}.schema.json`; `adapters/codex-history.mjs` capability/profile probe; `validate.mjs`. Persist a small `host-profile.json` with CLI/schema hashes and supported fields, not user history.

**Work:** Freeze active skill bundle, current model/tool conditions and existing baseline split. Produce the host-history versus scientific-evidence coverage matrix above from one authorized redacted fixture/import. Establish reference-only default and retention policy. Choose manual import if a supported App Server connection cannot be established; do not reverse-engineer Desktop attachment or write its DB.

**Acceptance:** Contract fixtures round-trip, reject unsupported versions/secrets, and distinguish missing from empty evidence. A selected read imports no unrelated tasks or reasoning. Host-memory state is measured where supported, otherwise `unknown`. No hooks/archive are added unless a written gap finding demonstrates need. No automatic memory configuration changes.

### Phase 1 — Episode import and scientific evidence joins

**Code proposed:** `episode-import.mjs`, `evidence.mjs`, `adapters/scientific-receipts.mjs`, `import-episode.mjs`, and idempotence/redaction/correlation tests. Inputs are bounded host pages or user-supplied extracts plus existing receipts. Output is one manifest, joins and evidence references.

**Dependencies:** Phase 0 contracts; existing runtime `results.profile`, traversal history and registered receipts. Runtime attempt history is capped and must not be treated as complete history.

**Acceptance:** An objective change and a multi-operation MCP action remain correctly linked after session loss; absent correlation stays unknown. Re-import is idempotent; duplicate/concurrent/out-of-order input and partial tool failure are represented honestly. A missing host reference remains a broken/missing citation, not an invented event. Historical pathway reconstruction is labeled `retrospective-summary` for its reconstructed portions; original machine receipts retain their grade. No private trace commits, bulk host scans or unsupported history mutations.

**Conditional gap remedy:** If future normal-use capture is demonstrably insufficient, propose a versioned metadata-only hook adapter separately. It may record task/turn/tool IDs and scientific receipt locations, with bounded output and duplicate handling. Live hook trust/coverage must be tested; host tools may bypass hook paths. It supplies no hidden continuation or learned instructions.

### Phase 2 — Evidence-backed wiki maintenance

**Code proposed:** `wiki-revisions.mjs`, `validate.mjs` wiki mode, `build-index.mjs` Markdown mode, and future maintainer skill. A batch descriptor selects evidence IDs, outcome strata, budgets and omitted material. Its sample size is configurable, justified by the question, and recorded.

**Work:** Compare successes and failures, including adequate-small-neighborhood counterexamples. Propose a pattern patch with competing explanations, cite exact evidence selectors, merge duplicates and keep scientific versus environment/authority diagnoses distinct. Coordinator verifies references and applies a base-revision-checked patch. Citation validity does not prove causal explanation.

**Acceptance:** One reviewed hypothesis with a counterexample and bounded index is produced. Stale patches conflict; unsupported citations and instruction-like source payloads do not become released procedures. Contradiction/supersession changes current advice while prior revisions remain traceable. No task agent automatically receives the wiki. An intervention ledger entry is produced by code, not hand-written by a model claiming its own improvement.

### Phase 3 — Atomic candidates and quarantined bundle construction

**Code proposed:** `bundle.mjs`, `propose.mjs`, future proposer skill and bundle-manifest tests. The model returns a proposal/diff as data; deterministic code builds the candidate under `artifacts/wiki-learning/candidates/<bundle-id>/`.

**Complete-bundle contract:** Hash sorted relative paths, file type/mode and byte hashes for `SKILL.md`, invocation metadata, all referenced instructions, scripts and assets. Include a dependency manifest for references outside the folder, pin their bytes/version, and reject unpinned remote/mutable dependencies. Reject path escape and symlinks that escape the bundle. The hash is sensitive to additions, deletions and description-only changes. Runtime/package/environment versions are recorded separately; a bundle digest is not a claim that every external dependency is frozen.

**Acceptance:** One hypothesis changes one procedure coherently even if several referenced files need editing. Protected authority/runtime rules are unchanged. Candidate is absent from normal discovered catalogs. No candidate/archived bundle is placed under `.agents/skills`, user roots, or an implicitly scanned ancestor. The exact bundle can be reconstructed and the prior release is available. Skill-creator validation checks syntax and routing, not behavioral efficacy.

### Phase 4 — Paired content and discovery evaluation

**Code proposed:** `evaluation.mjs`, `evaluate.mjs`, `adapters/codex-skills.mjs`, synthetic public development fixtures and separate evaluator fixtures. Codex still owns every model invocation; the harness assembles requests and records observations through a supported client or deliberate manual procedure, not an independent provider.

**Two separate arms:** (A) Explicitly load baseline/candidate exact bundle to test content; (B) use ordinary descriptions/catalog selection in fresh contexts with positive and negative task prompts to test discovery. Do not give a `$skill` hint in the discovery arm. A successful explicit-load result cannot establish normal triggering. Ensure candidate exposure in the controlled arm does not publish it globally.

**Acceptance:** Paired cases use matched host/model/tool conditions, pinned data and clean episode contexts. Record actual loaded bundle evidence or mark that component unverified. Score objective completion, representation extent, revision fidelity, typed relations, delivered visualization, uncertainty, unnecessary retrieval and cost separately. Authority violation, fabricated completeness/residency, evaluator leakage or a new severe regression blocks release regardless of aggregate score. Repeated validation is development influence and is logged. Freeze a gate before running; uncertain small-sample gains require further evidence, not a forced success claim.

### Phase 5 — Release, observed activation and rollback

**Code proposed:** `release.mjs` and release CLI, local transaction/recovery tests; no MCP change. Require accepted evaluation, authorized release scope and unchanged base bundle. Archive the full prior bundle, stage the candidate, validate all paths/digests, then publish a complete replacement via a recoverable local transaction and append its receipt. A crash must leave either a verified old/new bundle or a detectable incomplete release that cannot be called active.

**Four independent checks:** (1) disk installation equals the intended manifest; (2) host discovery lists correct name/path/description without duplicates; (3) a new episode actually loads the intended instructions/references; (4) observed behavior meets acceptance. Watch/refresh events alone prove none of the latter two. Use pinned `skills/list(forceReload)` only on a supported connection; restart/fresh-task fallback follows host guidance. Never claim mid-turn hot reload erased prior instructions.

**Rollback:** Restore the entire prior bundle, verify disk and catalog, and start a fresh episode with the prior loading evidence. Retain failed candidate, evaluation and revert ledger records; do not roll back wiki history. Rollback cannot undo previous scientific actions, host memory or already disclosed evaluator data. Treat contaminated episodes as unusable for a clean comparison.

**Acceptance:** Demonstrate publish, fresh explicit loading, ordinary discovery, and rollback on authorized local fixtures. Concurrent base changes are rejected rather than overwritten. A release remains `installed-unverified` until activation evidence is complete. No global skill/config writes or pushes are implied.

### Phase 6 — Optional views, transfer and separately scoped scientific memory

**Code proposed if justified:** `build-index.mjs` repository Markdown/RDF modes, query/read adapter for reviewed metadata, and bounded freshness/applicability tests. Introduce only after repository navigation or cross-pattern queries justify them.

**Acceptance:** Regeneration is deterministic from canonical records; derived views cannot override reviews. Measure transfer to another pathway/ontology family and future broker-mediated real-source cases separately. Runtime scientific-memory retrieval is a new treatment with source/revision/expiry, contradiction, instruction separation and contamination controls. Compare it against procedural-only releases; do not relabel procedural-learning gains as memory-retrieval gains.

## 7. Skill design using skill-creator

Follow precise discovery descriptions, a short decision-relevant entrypoint and conditional references. Normal implicit selection remains enabled for all released skills unless the user explicitly requests otherwise. Do not infer explicit-only invocation from a mutation approval boundary. Skill selection authorizes no new operation and should not start optimization during an ordinary scientific question.

| Skill | Proposed description / routing | Content and boundary |
| --- | --- | --- |
| Existing `linked-data-repl` | Retain its public-resource/native RDF/JS/Comunica scientific-work trigger; add shared retained-data delegation only where useful | Short guidance on objective-to-evidence fit, revision-aware representation and completion; mechanics in references |
| `scientific-wiki-maintainer` | "Review selected scientific task evidence and user corrections to propose cited, versioned wiki patterns and counterexamples. Use when maintaining the project's learning wiki." | Read relevant episode/evidence schemas and current patterns; propose a patch, not automatic release; ordinary graph queries do not trigger maintenance |
| `scientific-skill-proposer` | "Use reviewed scientific wiki patterns and intervention results to propose one scoped skill-bundle change with a validation plan. Use when improving a scientific workflow skill." | Inspect index/impact ledger, retrieve only relevant patterns/traces; candidate in quarantine; cannot grade or release itself |

For the existing REPL skill, proposed additions are conditional decision criteria, not a mandatory preflight/orient/justify/act sequence:

- Re-evaluate evidence extent when the user's objective changes. A small neighborhood is correct when sufficient; a full requested structure needs corresponding acquisition/representation or an explicit limitation.
- Compare accession, source release, revision, representation and edge semantics before claiming a diagram and RDF graph equivalent. Rendering success is not semantic coverage.
- Retain large data behind native handles; delegate when a worker has a useful independent computation. Parent continuation consumes a deposited reference and verifies usability, rather than assuming a returned ID is a native handle.
- Capture authorized durable citations before reset/session closure; label unavailable payload and reconstruction. Do not export full sources by default.

Proposed reference changes: extend existing `references/repl-environment.md` only for supported session/discovery details; extend `references/retained-state-and-presentation.md` for objective/representation fit; add `references/shared-session-workers.md` if the detailed bridge steps justify a separate file. Keep the active entrypoint free of wiki internals and exhaustive episode schemas. Do not add a blanket full-GO/full-ontology loading rule or endpoint allowlist. Do not turn authorized public reads into repeated approval requests.

Use concise `references/evidence-review.md` and `references/proposal-contract.md` for the two future skills. Their scripts should call the repository's shared validators rather than duplicate implementations. Keep skill rationale in the proposal/release metadata (pattern IDs, hypothesis, exclusions), with an optional focused reference when needed; a redundant `PURPOSE.md` in every skill is not required simply because the paper used one. Preserve existing UI/dependency fields; add `agents/openai.yaml` only for a concrete metadata need. Validate future skill bundles using the installed skill-creator validator and realistic behavior tests when separately authorized. No skill files are edited in this planning task.

## 8. Worker bridge and lifecycle

A coordinator may publish a selected immutable JSON episode snapshot and native scientific graph/result, then issue expiring object/path/operation grants and an output slot. Codex dispatches the worker. The worker performs bounded in-kernel queries or evidence comparison and deposits a structured proposal/reference. In a later call the owner retrieves the slot into state, checks the schema/reference/dependencies, computes its next step, and persists a compact receipt before cleanup. Session capability secrets are never committed or placed in wiki text.

The [implemented service](../architecture/scientific-session.md) has finite JSON and wire limits, serializes shared operations, and currently re-scans paged streams. Start with selected batches and native aggregate queries. A 2 MiB JSON snapshot ceiling is not permission to copy all history, and the prior 4,112-quad synthetic test is not a scaling guarantee. Worker scratch code and owner objects are separate; a dataset clause or `SERVICE` cannot widen a scoped local query. Persisted wiki work does not require keeping the service alive.

Approval propagation is an environmental condition to record, not a learned bypass rule. Existing approval applies when available in the trusted task context; a review rejection must be resolved through the host's real approval flow. Forking full history can carry authorization but also contaminates evaluation context. Controlled evaluation therefore needs a trusted minimal authorization envelope independent of hidden answers. No skill or grant alone solves that host integration problem.

## 9. Evaluation isolation and memory contamination

Separate development episodes, repeatedly inspected validation cases and sealed final test families. The reconstructed WikiPathways episode is development-only. Split by underlying pathway/ontology/source family and task pattern; paraphrases of one pathway do not establish transfer. Track every split exposed to wiki, proposer, user-facing explanations and optimizer feedback.

Evaluator answers and private mappings cannot appear in wiki pages, skills, filenames, shared JSON, orientation maps, parent prompts or inherited worker history. Put grading in a separately controlled process/account/container with actual read-denial evidence when claiming a held-out result. Probe the boundary with canaries. A worktree, new task or scoped grant is not isolation from a same-user shell. If enforceable separation is unavailable, label the pilot unblinded and make no held-out claim.

Built-in Codex memory is an additional contamination channel. For controlled comparisons, prefer supported per-chat settings or an explicitly authorized isolated host profile to prevent both consuming prior learning and contributing evaluator data to future memories. Verify each control independently; record unknown state if no supported API exposes it. Do not edit generated memory files or global settings, silently reuse a contaminated profile, or assume "fresh task" means no memory. A `memoryCitation` is useful positive evidence but its absence is not proof of no memory exposure. Skill rollback cannot remove remembered candidate advice.

Raw evidence excludes hidden reasoning. Host-visible summaries remain summaries. Store minimum necessary quoted content with its access class; no general transcript mirroring. Protect source data and user corrections from accidental publication. Read/delete retention controls have separate scope from scientific retrieval authority.

## 10. First end-to-end vertical slice and migration

The smallest future slice runs phases 0–5 over local authorized data, not a whole-history learning service:

1. Freeze the current complete REPL bundle and host compatibility profile. Import selected historical references plus a clearly labeled reconstruction of the pathway objective change; retain coverage gaps.
2. Build one paired local pathway example: the same synthetic structure supports an adequate neighborhood task and a full-structure visualization task. Add source revision A/B so false equivalence can be tested. Use typed interactions and an actually inspectable visual artifact, not just a count.
3. Maintainer proposes one objective-to-representation hypothesis with the successful small-neighborhood counterexample. Review citations/applicability; keep activation-path and approval cases as separate candidate patterns.
4. Proposer builds one atomic REPL reference change. Deterministic construction hashes the entire bundle and leaves it quarantined.
5. Run paired explicit-load comparisons on frozen development/validation fixtures, then a distinct ordinary-discovery check. Score exact requested coverage and delivered presentation against evaluator-held facts. Record every failure and candidate iteration.
6. Reject or approve using the frozen gate. Demonstrate full-bundle publication, fresh loading and rollback if authorized. Append outcomes and wiki references even when rejected.
7. Only after this mechanism is observed, request an appropriately bounded real-source validation using current source-owned evidence through the broker. A live source revision change is new evidence, not a silent fixture replacement.

Initial paired case matrix (proposed, not executed):

| Family | Local case and matched control | Required observable outcome |
| --- | --- | --- |
| Pathway scope | Small neighborhood sufficient vs complete pathway structure requested | Sufficient compact result for the first; complete requested structure and usable visual for the second, or explicit failure rather than a false completion |
| Ontology scope | Term-centered hierarchy vs explicitly requested broader hierarchy | Choose extent from objective; preserve relation/direction; no universal whole-ontology fetch |
| Revision mismatch | Same-revision RDF/diagram vs deliberately different revision | Establish equivalence only when justified; otherwise qualify or reacquire under authority |
| Source availability | Available fixture vs unavailable/invalid representation | Distinguish unavailable from absent; no invented diagram or inferred global absence |
| Transfer/non-transfer | Unseen pathway/ontology family vs endpoint-specific operational lesson | Transfer a procedure when applicable, reject source-specific extrapolation |
| Discovery | Natural scientific request vs wiki-maintenance/proposal request and unrelated controls | Appropriate skill selection without explicit hints; report misses, false positives and unloaded references |

Migration is additive and reversible. Existing experiment registry records remain authoritative and are referenced, not rewritten into a new grade. Do not import all historical traces or promote old candidate lessons automatically. Add registry entries only for intentional executed learning/evaluation runs, with missing evidence and validation as required by repository policy. Manual imported episodes preserve original and reconstructed sections separately. Existing active skill content stays unchanged until release; a rejected bundle never becomes normally discoverable. Legacy experiment-specific trajectory schemas are precedents, not silently redefined universal episode contracts.

## 11. Acceptance checklist and implementation handoff

A first implementation is complete only when durable references survive worker/session loss, wiki revisions retain evidence and counterexamples, a candidate remains undiscovered until release, evaluation records actual isolation/memory/loading limits, and full-bundle activation/rollback is demonstrated on fresh episodes. Mechanism success does not establish long-term learning quality, scientific truth or scalability.

**Next implementation boundary:** the authorized phase-0 foundation below is complete. Before phase 1, select and authorize a bounded host-history input and its retention scope; then test the import adapter against its actual observable schema. Do not install hooks or design a new archive first. No additional decision is needed to save/review this plan. Before a real pilot, material choices are (a) which selected task evidence the user permits retaining beyond references, (b) a supported host connection or manual import mode, and (c) a genuinely isolated evaluator/memory treatment. Defaults above allow synthetic contract work while these are resolved.

Planning delivery uses the configured checkout `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`, starting commit `c6ed4c1e6ba8e0a3a706ee768330444e9695be29`, on `codex/wiki-memory-plan`. No new worktree, global configuration changes, private transcript reads, runtime/skill implementation or learning evaluation is part of this delivery. The older absolute ownership path in some project documents is not copied into proposed module contracts; resolve roots from the current validated checkout.

Documentation verification must include relative links, consistency of task/roadmap routing, the complete diff and whitespace. Repository-mandated tests/smoke are offline software checks, not authorization for a scientific/model evaluation. Known preceding baseline: 218/219 tests passed; the remaining bootstrap test hard-codes `codex-repl` despite the valid moved checkout configuration. Preserve that unrelated configuration edit and report any remaining failure rather than claiming a clean suite. This plan creates no experiment-result entry and no new memory record.

Planning checks on 2026-09-19: changed Markdown relative links resolve; task index, roadmap and context router point to this single plan; whitespace/diff checks pass; `npm run smoke` passes. Required offline `npm test` repeats the preceding baseline: 218 passed, one failed at `test/cleanroom-linked-science-bootstrap.test.mjs:69` because it expects the old path. No skill was changed, so skill validation/behavioral evaluation is deferred to implementation. The only unrelated dirty file is `.codex/config.toml`; it is excluded from the documentation commit.

User clarification incorporated on 2026-09-19: Science Cloud wiki memory is separate from the user's Obsidian wikimemory. Planned optional Obsidian display/export/sync/import integration was removed; the existing literature-note citation remains research provenance only. No Obsidian files were read or modified for this correction.


## 12. Phase-0 implementation record — 2026-09-19

The authorized first step implements four version-1.0.0 contracts: [episode](../../schemas/wiki-learning/episode.schema.json), [objective](../../schemas/wiki-learning/objective.schema.json), [evidence](../../schemas/wiki-learning/evidence.schema.json), and [outcome](../../schemas/wiki-learning/outcome.schema.json). [Contract validation](../../lib/wiki-learning/contracts.mjs) enforces bounded JSON records, closed fields, ordered objective revisions and objective-specific operation joins. This is a deliberately small schema vocabulary, not a general JSON Schema engine. Structural checks reject capability-shaped extra fields and hidden/accessor properties; they are not a general secret scanner or proof that free text is safe to retain.

The [frozen baseline](../../artifacts/wiki-learning/baselines/repl-20260919-phase0/manifest.json) contains all six current REPL skill files and five direct linked repository documents, preserving file bytes and executable modes. Its digest is `db33fd189034abd4c14d2d6d7f2043014e5f508965e6c47852dc1e1ceacbfe03`. The manifest explicitly excludes recursive documentation dependencies, remote contents and host/model configuration. Discovery and loading are `not-observed`. This snapshot is outside active skill roots and changes no active skill.

The [synthetic development episode](../../test/fixtures/wiki-learning/development/scope-change/episode.json) uses fabricated observable task/turn/item events joined to an actual local runtime `results.profile` receipt. A one-edge query satisfies the initial smoke objective; a later request for the full directed structure remains partial with missing visualization evidence. The fixture covers durable source bytes, receipt-only evidence, a historical handle, reconstruction and missing output. The second tool event has no retained operation correlation, so its join remains unresolved. This demonstrates the need for an explicit correlation field in that fixture; it does not establish a gap in live host history or justify installing a hook.

[Evidence inspection](../../lib/wiki-learning/evidence.mjs) verifies confined relative references, SHA-256 file bytes, JSON selectors, task/item identities and operation correlation. Its result is explicitly `reference-integrity-only`: a passed inspection does not grade scientific correctness or satisfy every objective. Missing saved bytes produce a partial report; corrupt bytes and false joins fail. Receipt availability never implies saved result payload or a live handle. File checks protect ordinary local artifact integrity; they are not a hostile same-user filesystem isolation boundary.

The [focused tests](../../test/wiki-learning/phase0.test.mjs) generate a fresh local RDF query, reset its workspace, observe `LS_STALE_WORKSPACE`, and inspect the durable references without the session. They also reject reuse of the earlier smoke outcome for the later objective, forged operation correlation, path escapes, unsupported record versions, invented synthetic memory treatment and modified baseline bytes/modes. Host memory use/generation remain unknown. The checked-in fixture is a software test, not a scientific/model evaluation or reconstructed private conversation.

Reproduce the offline checks from this checkout:

```sh
node --test test/wiki-learning/phase0.test.mjs
node scripts/wiki-learning/validate.mjs
node scripts/wiki-learning/snapshot-baseline.mjs verify artifacts/wiki-learning/baselines/repl-20260919-phase0
```

`create` in place of `verify` writes only a new destination under `artifacts/wiki-learning/baselines/` and refuses overwrite. The fixture validator reads the fixed saved development fixture; it is not a live history importer. No dependencies were added. Pattern/proposal/evaluation/release contracts, host compatibility probing, selected history import, wiki maintenance, candidate construction, activation/rollback and evaluations remain future work. No hooks, private history, Obsidian data, external sources or host-memory settings were accessed or changed for this implementation.

Delivery starts at `db34264a4902fcdc465c107b3fc26de8b52c9ffe` in `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`, on `codex/wiki-memory-phase0`. The unrelated `.codex/config.toml` edit is preserved and excluded. Verification and final commit/main integration are reported in the completion handoff.

Phase-0 verification: all 10 focused tests and the saved fixture/baseline validator pass; `npm run smoke`, changed-document relative-link checks and `git diff --check` pass. Full `npm test`: 229/230 pass; the sole failure repeats the pre-existing old-`codex-repl` path assertion at `test/cleanroom-linked-science-bootstrap.test.mjs:69`. No runtime configuration change or workaround was made.
