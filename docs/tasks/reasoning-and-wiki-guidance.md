# Reasoning integration and scientific wiki guidance

- **Status:** Planned; compatibility experiments complete, production integration not started.
- **Updated:** 2026-09-20, following the user's request to preserve the reasoning/wiki order of operations across agent instances.
- **Owner:** Codex coordinates goals and scoped workers; the project owns the evidence/session layer. No separate model provider or workflow scheduler is planned.
- **Scope:** Add deterministic reasoning to the symbolic RDF/JS surface, then learn evidence-backed scientific guidance about its use through the existing wiki system.
- **Authorization:** This update records the selected direction. It does not execute integration, new evaluations or wiki promotion.

## Current evidence

| Area | Established | Remaining |
| --- | --- | --- |
| Scientific wiki | [Maintenance](scientific-wiki-maintainer-handoff.md), [selective retrieval](wiki-selective-retrieval.md), and a [fresh-context pilot](wiki-live-comparison.md) exist. | Two seed patterns remain proposed; incremental scientific benefit and automatic skill evolution are not established. |
| Deterministic reasoning | [Eyeron compatibility](../experiments/eyeron-compatibility.md): pinned installation and 15 bounded checks, including N3/SRL inference, RDF/JS reuse, explicit OWL fragments and failure reporting. | Production facade, bounded host execution, graph/proof/lifetime contracts and no-bulk-relay scoped delegation are unimplemented. |
| Shared scientific state | The [scientific session service](../architecture/scientific-session.md) provides the existing ownership and scoped-access foundation. | Derived graphs and reasoning records must be integrated with that ownership; compatibility scripts are not an installed runtime API. |

## Sequence and acceptance gates

1. **Specify and implement the reasoning operation.** Inputs are retained graph references, versioned rules and an explicit graph policy. Keep asserted and inferred graphs separate. Define supported rule semantics, blank-node scope, bounded execution/cancellation, completion admission, engine/input/rule provenance, optional proof capability and invalidation on input or epoch changes. Incomplete execution must not become a successful empty graph. Test these contracts before advertising the surface.
2. **Demonstrate scoped scientific use.** Use a small ontology question requiring an inference chain. A Codex-managed worker accesses scoped inputs, invokes deterministic reasoning, queries the derived graph and deposits structured findings with evidence references. The parent aggregates by reference. Record actual bridge exchanges, coverage and lifecycle behavior; do not claim no-relay operation from manually passing triples through model-visible output. Worker departure must not destroy session-owned results still needed by the parent.
3. **Capture eligible scientific episodes.** Record the objective, chosen representation, query/reasoning actions, engine/rules/source versions, outcomes and failures. Preserve graph policy, completion, limits, consultation exposure and operation-to-evidence joins. Admit records through the existing scientific corpus rules. Installation and software compatibility tests alone do not establish a scientific procedural lesson.
4. **Propose reasoning-use memories.** Use the existing maintainer and immutable wiki revision path, citing eligible episodes. Candidate topics include when asserted-data SPARQL suffices, when an explicit rule closure is needed, when a scoped worker helps interpret evidence, and when proof inspection is useful or unavailable. Include exclusions, counterexamples and revalidation conditions. These are candidate research questions, not learned recommendations yet.
5. **Evaluate transfer before promotion or skill release.** Compare matched fresh tasks with guidance enabled/disabled, holding runtime, task data and rule capabilities fixed. Measure correctness, evidence support, unnecessary reasoning, incomplete-result handling and total overhead. Include cases where reasoning should not be used. Agent-reported helpfulness alone does not establish benefit. Preserve frozen baselines and keep evaluation answers outside worker context.

## RLM and context constraints

Bulk graphs, rule programs, proofs and results remain outside the model prompt behind scoped references. The REPL can operate on complete objects; only bounded observations and selected explanations enter agent context. Codex supplies language-model reasoning and worker lifecycle; Eyeron supplies deterministic rule execution. A reasoning agent can initially be an ordinary scoped worker role, without a resident model inside the REPL.

The proposed `ws.reasoning.run` and `ws.reasoning.explain` names are illustrative, **not available APIs**. Decide their contract against the current runtime before writing usage guidance. Session ownership, worker grants, derived-object release, reset invalidation and incomplete execution are part of that contract.

PEEK/orientation should carry compact validity, scope, count and provenance references, not whole closures or proofs. A retained proof is not a verified proof; an explicit OWL rule fragment is not general OWL conformance. Agent-generated rules remain hypotheses unless separately justified as premises. Wiki memory is advisory procedural evidence, separate from the current scientific dataset and its inferred facts.

## Exact next action

Read the [Eyeron dossier](../experiments/eyeron-compatibility.md), [scientific session architecture](../architecture/scientific-session.md), [RLM architecture](../architecture/rlm-linked-science-runtime.md) and [goal-loop invariants](../experiments/goal-loop-state-graph.md). Inspect `lib/linked-science-runtime.mjs` and `packages/cleanroom-node-repl` to specify the smallest broker-owned reasoning adapter: one supported rule profile, one explicit graph policy, separate derived handle, provenance and complete-or-fail execution. Resolve proof representation, blank-node identity and cancellation before implementation. Then implement and test that slice under the next execution task; do not start by teaching the wiki a proposed API.

## Durable handoff

The [wiki implementation plan](wiki-memory-continual-learning.md) remains the umbrella learning record. This brief records its dependency on reasoning, not a replacement learning system. Compatibility receipts live under [the saved Eyeron run](../../artifacts/eyeron/20260920/receipt.json); their handles are historical, not evidence of current residency. Installation paths are machine-specific and do not establish availability on another checkout.

This notes update starts at `827fbd1` on `codex/reasoning-wiki-handoff` in the authoritative checkout. No runtime, wiki HEAD, pattern status, skill or experimental evidence is changed. Required repository checks and local-main integration are recorded in the delivery response. No push is included; unrelated MCP configuration and structure-viewer files remain excluded.
