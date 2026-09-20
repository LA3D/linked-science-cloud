# Reasoning integration and scientific wiki guidance

- **Status:** First runtime slice implemented and verified: bounded N3 adapter, retained derived objects, scoped reasoning and raw proof inspection. Desktop activation and a fresh model-driven scientific episode remain next. See the [runtime contract](../architecture/deterministic-reasoning.md).
- **Updated:** 2026-09-20, following the user's request to preserve the reasoning/wiki order of operations across agent instances.
- **Owner:** Codex coordinates goals and scoped workers; the project owns the evidence/session layer. No separate model provider or workflow scheduler is planned.
- **Scope:** Add deterministic reasoning to the symbolic RDF/JS surface, then learn evidence-backed scientific guidance about its use through the existing wiki system.
- **Authorization:** The user authorized implementation and local-main integration after the planning update. No wiki promotion or push is included.

## Current evidence

| Area | Established | Remaining |
| --- | --- | --- |
| Scientific wiki | [Maintenance](scientific-wiki-maintainer-handoff.md), [selective retrieval](wiki-selective-retrieval.md), and a [fresh-context pilot](wiki-live-comparison.md) exist. | Two seed patterns remain proposed; incremental scientific benefit and automatic skill evolution are not established. |
| Deterministic reasoning | [Compatibility experiments](../experiments/eyeron-compatibility.md), followed by the [bounded N3 runtime surface](../architecture/deterministic-reasoning.md): separate inferred RDF, provenance, proof inspection and explicit lifetime. | Fresh desktop activation, conclusion-directed explanation, proof checking, SPARQL-RL adapter and larger-scale evidence remain. |
| Shared scientific state | Scoped `reason` and `explain` operations retain derived graphs/proofs in the owning session. A real-engine two-step subclass test verifies worker deposit, disconnect, owner query and source-release invalidation. | Automated client tests establish the protocol; they are not a fresh Codex-worker scientific evaluation or token-cost study. |

## Sequence and acceptance gates

Gate 1 is implemented for the documented first profile. Gate 2 has automated owner/worker evidence; a fresh model-driven scientific episode remains. Gates 3–5 remain future work.

1. **Specify and implement the reasoning operation.** Inputs are retained graph references, versioned rules and an explicit graph policy. Keep asserted and inferred graphs separate. Define supported rule semantics, blank-node scope, bounded execution/cancellation, completion admission, engine/input/rule provenance, optional proof capability and invalidation on input or epoch changes. Incomplete execution must not become a successful empty graph. Test these contracts before advertising the surface.
2. **Demonstrate scoped scientific use.** Use a small ontology question requiring an inference chain. A Codex-managed worker accesses scoped inputs, invokes deterministic reasoning, queries the derived graph and deposits structured findings with evidence references. The parent aggregates by reference. Record actual bridge exchanges, coverage and lifecycle behavior; do not claim no-relay operation from manually passing triples through model-visible output. Worker departure must not destroy session-owned results still needed by the parent.
3. **Capture eligible scientific episodes.** Record the objective, chosen representation, query/reasoning actions, engine/rules/source versions, outcomes and failures. Preserve graph policy, completion, limits, consultation exposure and operation-to-evidence joins. Admit records through the existing scientific corpus rules. Installation and software compatibility tests alone do not establish a scientific procedural lesson.
4. **Propose reasoning-use memories.** Use the existing maintainer and immutable wiki revision path, citing eligible episodes. Candidate topics include when asserted-data SPARQL suffices, when an explicit rule closure is needed, when a scoped worker helps interpret evidence, and when proof inspection is useful or unavailable. Include exclusions, counterexamples and revalidation conditions. These are candidate research questions, not learned recommendations yet.
5. **Evaluate transfer before promotion or skill release.** Compare matched fresh tasks with guidance enabled/disabled, holding runtime, task data and rule capabilities fixed. Measure correctness, evidence support, unnecessary reasoning, incomplete-result handling and total overhead. Include cases where reasoning should not be used. Agent-reported helpfulness alone does not establish benefit. Preserve frozen baselines and keep evaluation answers outside worker context.

## RLM and context constraints

Bulk graphs, rule programs, proofs and results remain outside the model prompt behind scoped references. The REPL can operate on complete objects; only bounded observations and selected explanations enter agent context. Codex supplies language-model reasoning and worker lifecycle; Eyeron supplies deterministic rule execution. A reasoning agent can initially be an ordinary scoped worker role, without a resident model inside the REPL.

`ws.reasoning.run`, `describe`, `explain` and `capabilities` are implemented in runtime 6.5.0. `explain` is explicitly bounded raw proof inspection, not yet a selected-conclusion explanation. The first profile accepts one default-graph source and explicit N3 rules; session ownership, worker grants, source-release invalidation and complete-only publication are tested.

PEEK/orientation should carry compact validity, scope, count and provenance references, not whole closures or proofs. A retained proof is not a verified proof; an explicit OWL rule fragment is not general OWL conformance. Agent-generated rules remain hypotheses unless separately justified as premises. Wiki memory is advisory procedural evidence, separate from the current scientific dataset and its inferred facts.

## Exact next action

Load a fresh project broker and scientific session service (restart the desktop MCP and any old service process), follow [runtime discovery](../agent/runtime-discovery.md), and check runtime 6.5.0 plus `ws.reasoning.capabilities().available`. Then run a small scientific ontology task through a fresh scoped Codex worker, saving the actual task/operation/evidence joins and result receipt before cleanup. Record the protocol before the run and register its receipt. Use the [runtime contract](../architecture/deterministic-reasoning.md); distinguish observed inference from authoritative premises and capture when SPARQL alone would suffice. Only then select eligible evidence for candidate wiki guidance.

## Durable handoff

The [wiki implementation plan](wiki-memory-continual-learning.md) remains the umbrella learning record. This brief records its dependency on reasoning, not a replacement learning system. Compatibility receipts live under [the saved Eyeron run](../../artifacts/eyeron/20260920/receipt.json); their handles are historical, not evidence of current residency. Installation paths are machine-specific and do not establish availability on another checkout.

This notes update starts at `827fbd1` on `codex/reasoning-wiki-handoff` in the authoritative checkout. No runtime, wiki HEAD, pattern status, skill or experimental evidence is changed. Required repository checks and local-main integration are recorded in the delivery response. No push is included; unrelated MCP configuration and structure-viewer files remain excluded.


### Runtime implementation delivery — 2026-09-20

Implementation starts at `46b1a4f` on `codex/reasoning-surface` in the authoritative checkout, targeting local main. All 288 repository tests pass (zero skipped), including 12 pinned-host adapter tests, 13 scoped bridge tests, and 7 runtime reasoning tests. Smoke, repository identity/broker verification, relative links and whitespace checks pass. Tests cover an actual fresh owner/worker service using the installed engine for a two-step subclass inference, separate derived/proof retention, deposit and owner reads after disconnect. This is automated synthetic protocol evidence, not a new model experiment; no experiment-registry or wiki revision is created.

The adapter checks pinned Wasm bytes, imposes a linear-memory maximum, runs under worker heap/time/output bounds, and rejects unsupported I/O/time/dynamic builtins. Total RSS is not a precise memory ceiling. Assertions stay separate; source release/reset prevents later derived reads and late publication. The engine path remains machine-specific. An already-mounted broker is not activation evidence for this new code.

No embedded model, external scientific retrieval, dependency installation, global configuration change, wiki promotion or push was performed. Final commit/main ancestry and upstream status are reported in the completion response. Unrelated `.codex/config.toml` and `artifacts/structure-viewer/` are preserved.
