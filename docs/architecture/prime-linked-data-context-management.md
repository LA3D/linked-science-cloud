# Prime-style context management for Linked Data agents

- **Status:** Proposed, evidence-gated architecture
- **Date:** 2026-09-04
- **Related plan:** [Prime-inspired durable RLM, context, and continual-harness research plan](../../PLAN.md)
- **Authorization:** Design and local synthetic planning only; no provider activation, live evaluation, durable service, or global configuration change is authorized.

## Decision

Do not begin by implementing the complete durable Prime substrate. First test the two mechanisms that distinguish an RLM/Prime agent from the current depth-zero symbolic REPL:

1. a depth-one child that can operate on an explicitly granted Linked Data handle without copying the whole graph or result into a prompt; and
2. a real PEEK maintenance policy over bounded typed trajectory evidence.

Durable sessions, continual-harness state, and automatic facade injection proceed only if those experiments show a useful gain without violating the Linked Science authority and evidence model. This ordering follows the mechanism evidence in the [RLM paper](https://arxiv.org/abs/2512.24601), [PEEK paper](https://arxiv.org/abs/2605.19932), and [Prime Agent paper](https://arxiv.org/abs/2608.23552), while adapting their designs to RDF/JS terms, scientific provenance, and a restricted host membrane.

## One context system, four planes

The implementation should not add another set of overlapping memory stores. Each plane has one job:

| Plane | Contents | Owner | Lifetime |
| --- | --- | --- | --- |
| Symbolic data (L2) | RDF graphs, query results, resources, and broker result spools behind handles | Linked Science workspace plus clean-room broker | Kernel epoch initially; durable artifacts only after a later gate |
| Recursive reasoning (L1/L2) | Parent objective, explicitly granted handles, bounded child observations, terminal child result | RLM session runtime | One admitted child experiment initially |
| Orientation (derived L1) | Compact source facts, failures, schemas, identifiers, and reviewed motifs | PEEK policy | Derived from typed events; project durability is a later decision |
| Evidence/control (L3) | Typed public events, receipts, provenance, policy versions, and later immutable artifacts | Trusted host | Ephemeral experiment trace first; durable append-only store only after evidence gates |

The current RLM context registry remains a compatibility adapter. PEEK becomes a derived orientation view, not an independent source of truth. Continual-harness memories, if later built, use the same typed L3 evidence store rather than creating a fifth memory system.

## Gate A: handle-scoped depth-one experiment

### Target interaction

The public MCP surface remains `js`, `js_reset`, and `js_add_node_module_dir`. The Linked Science facade creates a private context grant for a handle; the trusted host admits one child and returns a stable child handle:

```js
const grant = await workspace.context.grant(resultHandle, {
  operations: ['profile', 'page', 'query'],
  maxRowsPerPage: 20,
  maxObservationBytes: 32_768,
});

const child = await nodeRepl.rlm.spawn({
  objective,
  contextRefs: [grant],
  budget: { depth: 1, timeoutMs: 60_000, maxOutputBytes: 32_768 },
});
```

These names are an experiment contract, not yet implemented API.

### Grant semantics

- A grant is an opaque broker record bound to the parent token, parent epoch, exact handle/storage identity, child identity, allowed operations, and cumulative observation budget.
- For the first experiment, the source is a broker-stored quad result. This makes the broker the physical owner already and avoids copying an in-memory graph merely to test recursion.
- The child receives a private streaming RDF source backed by bounded broker pages. It may issue local `ASK`, `SELECT`, `CONSTRUCT`, or `DESCRIBE` over that source, but cannot obtain a path, capability token, parent JavaScript value, or unbounded dump.
- Live traversal is disabled in the first arm. A later arm may inherit the same anonymous-read authority only with equal-or-tighter budgets and explicit attribution.
- Parent reset or owner loss revokes the grant and aborts the child. No stale handle is silently rematerialized.

### Experiment

Use deterministic local Linked Data fixtures for semantic work that SPARQL alone cannot finish, such as classifying free-text annotations, reconciling ambiguous labels against ontology evidence, or judging relevance across many descriptions. Compare:

1. a depth-zero root using bounded pages;
2. a depth-one child with the same total observation/output budget and one handle grant; and
3. where meaningful, a direct SPARQL-only control.

Gate A passes only if the child improves a predeclared correctness measure on at least two structurally different fixtures, all provider work and handle observations are attributable, no bulk payload enters the prompt, and the authority boundary remains unchanged. Latency and provider cost are reported, not hidden inside the score. Failure leaves the existing symbolic REPL as the production path.

## Gate B: PEEK policy experiment

The broker must not distill raw JavaScript, hidden reasoning, or bulk result rows. Linked Science emits bounded typed public events such as:

- resource acquired or failed, with source role, media type, hash, and receipt ID;
- graph parsed, with format, graph role, count, and source handle;
- query completed or failed, with query type/hash, source handles, completion policy, count, and residency tier;
- profile/page/subquery observed, with selector, bounds, and source handle; and
- correction, stale-handle detection, or explicit scientific uncertainty.

After a child/root boundary, the policy runs three separately testable steps:

1. **Distiller:** extracts candidate reusable orientation from the bounded typed trajectory and identifies counterevidence or staleness.
2. **Cartographer:** proposes structured add/update/remove edits against an exact map version.
3. **Evictor:** enforces section, item, and byte budgets using priority, use, age, provenance, and staleness.

The map is injected at the head of a later child projection only after validation. Retrieved documents and model synthesis remain delimited data without instruction authority. Query motifs are not categorically forbidden in production: a compact parameterized motif may be promoted only with provenance, applicability, query-form validation, and explicit review. Evaluator-target queries and hidden-answer fragments remain prohibited.

Gate B compares the full three-stage policy with current manual/no-policy PEEK and a monolithic-update ablation on recurring but non-identical contexts. It passes only if later-task orientation improves under a fixed context budget, stale/incorrect entries are removed, scientific claims remain source-scoped, and no held-out material leaks.

## Gate C: durable Prime substrate

Only after Gate A passes should the repository implement durable root/child identity, stable asynchronous child results, exact typed public history, immutable artifacts, restart recovery, and provider accounting. Only after Gate B passes should reviewed prompt-note/memory state be made durable. Existing Phase 0 schemas are design input, not an obligation to implement every schema before the mechanism experiments.

Durability must preserve these distinctions:

- an epoch-bound native handle is not a durable artifact;
- a descriptor or digest is not the payload;
- a recovered artifact creates a fresh handle and provenance link;
- interrupted external/provider work is `failed` or `uncertain`, never silently replayed; and
- Codex continues to own top-level goals and worker lifecycle.

## Gate D: ergonomics

Automatic facade bootstrap and a shorter examples-first worker skill are independent of Gates A-C: they change no authority, budget, or evidence semantics, and they reduce the per-kernel ritual and worker-facing guidance that every experiment arm otherwise pays for. They may therefore proceed before or alongside Gate A. The broker may inject a validated facade binding at kernel creation, but wrong-runtime diagnostics and explicit capability receipts remain available for activation and troubleshooting so convenience does not become a second implicit activation path.

## Immediate next action

Freeze one local synthetic dense-context protocol for Gate A with exact fixtures, provider/model settings, matched root/child budgets, public scoring, typed-event requirements, and stop/go thresholds. Provider activation and an intentional run require separate authorization; until then, implement no `spawn`, grant, policy, checkpoint, or durable-harness behavior from this proposal.
