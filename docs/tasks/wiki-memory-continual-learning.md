# Task: Design wiki memory and continual-learning distillation

- **Status:** Deferred research until the bounded UniProt preflight and first frozen baseline are assessed
- **Owner/task:** Unassigned
- **Scope:** Study how evidence-backed user teaching, corrections, and navigation techniques become reviewed wiki-like memory and selectively available Linked Data skill guidance. Do not implement storage, retrieval, skill updates, or runtime behavior in this task brief.
- **Authorization boundary:** Planning and research require separate authorization when started. Transcript export, memory creation/deletion, skill changes, live traversal, dependency changes, and evaluation runs are not authorized by this record.
- **Starting point:** Consumer-owned Linked Science runtime version 2 with mediated traversal and evaluator isolation; current UniProt preflight and baseline sequence remains first.

## Outcome and acceptance evidence

Specify a layered pipeline:

1. immutable source transcripts, run receipts, and evidence records;
2. candidate lessons that cite those sources and remain proposals;
3. reviewed, versioned wiki pages; and
4. selectively compiled or retrieved skill guidance bounded to the current task.

The design classifies memory as general Linked Data heuristics, endpoint-specific operational playbooks, ontology/schema observations, failed approaches and corrections, provenance/evaluation facts, or user preferences/decisions. It must define which classes can influence execution, which remain reference-only, and which require revalidation before use.

Each wiki-memory object needs a stable ID and title; scope and applicability conditions; typed claims separated from strategies and inferences; evidence links and source citations; provenance; author and reviewer; confidence and review status; `supersedes` and `supersededBy` links; retrieval tags; creation and runtime versions; and expiration or revalidation policy.

Skill attachment must specify how a skill references or retrieves only relevant reviewed pages, how approved memory becomes a versioned skill update, how conflicting or stale pages resolve, and how retrieval budgets prevent unbounded context growth. Reset survival must not turn memory into ambient authority.

Safety and epistemic acceptance concerns include:

- retrieved RDF/web content never becomes instruction automatically;
- agent-generated lessons remain proposals until review;
- citations and the distinction between facts, strategies, and inferences survive distillation;
- prompt injection and self-reinforcing mistakes are rejected rather than learned;
- evaluator-private mappings, held-out competency cases, expected answers, and contaminated traces cannot enter worker memory; and
- memory ownership, review, retention, and deletion are explicit and auditable.

Continual-learning evaluation must show that a later fresh worker can apply one approved transferable lesson to a different endpoint without hidden answers, while refusing or qualifying an endpoint-specific lesson outside its applicability conditions.

## Current state

### Candidate lessons, not promoted memory

The present UniProt trajectory offers research examples only:

- namespace dereferencing and RDF content negotiation;
- the distinction between `DESCRIBE` output and named-graph extent;
- VoID and dataset-description discovery;
- official SPARQL examples as affordance and schema evidence rather than answer templates;
- bounded adaptive term-centered navigation;
- open-world mediated federation; and
- correcting security designs based on predeclared endpoint identity rather than governed behavior.

These examples are neither reviewed wiki pages nor skill instructions and must not influence a held-out baseline unless independently allowed by its worker-visible protocol.

### Decisions

- Wiki memory stores reviewed knowledge, strategies, corrections, and decisions; durable dataset persistence stores RDF artifacts. They are separate subsystems and neither is a prerequisite for the other.
- The two subsystems may cross-reference immutable provenance, receipts, and content hashes without conflating a dataset with an instruction.
- This architecture is not a prerequisite for the current UniProt preflight or first frozen baseline.
- Memory retrieval must be selective, bounded, review-aware, and applicability-aware rather than transcript injection.

### Remaining research

- Choose the wiki storage and versioning model and its durable source-of-truth boundary.
- Define human/agent review workflow, authorship, approval states, ownership, retention, and deletion.
- Compare retrieval/indexing approaches and skill compilation versus runtime retrieval.
- Define conflict resolution for multi-agent proposals, supersession, stale claims, and divergent endpoint experience.
- Specify reset survival without ambient execution authority.
- Design contamination audits and fresh-worker transfer/non-transfer evaluation.

### Exact next action

Do not implement yet. After the first frozen UniProt baseline is assessed, write a research note comparing wiki storage/versioning, review workflow, retrieval/indexing, and skill-attachment alternatives, then propose the smallest evaluable object model.

### Blockers or required decisions

- Decide who may author, review, approve, supersede, expire, and delete each memory class.
- Decide whether approved guidance is compiled into a skill release, retrieved at runtime, or supported through both paths under separate bounds.

## Handoff state

- **Git:** Planning record only on consumer local `main`; no implementation branch or worktree exists.
- **Verification:** Documentation links and task-index conventions only; no memory, skill, runtime, network, or evaluation behavior is claimed.
- **Ephemeral state:** None.
- **Durable artifacts/receipts:** None; referenced UniProt lessons remain unpromoted research examples.
