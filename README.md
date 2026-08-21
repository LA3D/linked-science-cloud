# Linked Data REPL experiment

This is a small Codex Desktop experiment for running in-memory RDF/SPARQL work with a user-owned persistent JavaScript REPL. The local Communica engine and RDF store belong to a worker task; a conversational coordinator delegates a bounded task and receives its evidence-backed result.

## Current Codex runtime boundary

The active project configuration registers the consumer-owned `cleanroom_node_repl` MCP from `packages/cleanroom-node-repl`. It is the canonical CodeAct runtime for this checkout, with persistent JavaScript, RLM context operations, broker-owned PEEK orientation, and the observed three-tool contract. This project does not use or configure Codex Desktop's bundled `node_repl` or the sibling experimental probe repository.

The former restricted network profile remains disabled at `.codex/config.restricted-profile.toml.disabled` for historical reference. It is not active configuration and must not be re-enabled to grant the bundled REPL network access. Tool exposure, project-root selection, module resolution, persistence, RLM state, PEEK state, and guarded network reachability remain separate properties that must be observed rather than inferred.

## Worker pattern

1. The coordinator keeps the conversation, scope, and approval boundary.
2. A fresh Local task loads the project-scoped `cleanroom_node_repl`, verifies its cwd, and bootstraps the Linked Science facade once per kernel.
3. The worker verifies a query in a second REPL call and reports only what was actually observed. Kernel reset discards bindings, RLM context, and resident handles while broker PEEK orientation remains advisory.

Run the disposable local check with:

```sh
npm run smoke
```

For the tested REPL initialization and persistence check, use the project-local [Linked Data REPL skill](.agents/skills/linked-data-repl/SKILL.md).

## Linked Science runtime

The production-oriented local adapter is bootstrapped by `lib/cleanroom-linked-science-bootstrap.mjs` and implemented by `lib/linked-science-runtime.mjs`. It installs one stable CodeAct-style JavaScript facade, validates this checkout and its declared dependency root, registers discovery material with clean-room RLM context, keeps Communica private as the query kernel, delegates compact orientation to broker-owned PEEK, and retains ontology/schema/SHACL/instance graphs and results behind epoch-bearing handles. Start with [runtime discovery](docs/agent/runtime-discovery.md); the checked-in [machine API schema](docs/runtime/linked-science-api.schema.json) supports fresh-agent lookup. The consumer-owned clean-room package supplies the isolated execution and broker boundary.

## Capability map and next work

- **Synthetic session:** local in-memory RDF is materialized under a symbolic handle and can be profiled, paged, or derived without printing the full result.
- **CodeAct runtime:** persistent model-written JavaScript uses the stable `linkedScience` facade for local graph objects, schema search, Communica queries, generic derivation, bounded views, PEEK orientation, explicit stale-handle recovery, and optional broker-mediated traversal.
- **Open-world mediated traversal:** consumer-owned Communica may dereference dynamically discovered anonymous HTTP/HTTPS RDF resources and federate across SPARQL services. Every request uses a private parent-owned standard-Fetch authority, which enforces identity stripping, mutation denial, request/fan-out/concurrency/time/byte/item bounds and records per-exchange lineage without exposing Fetch to agent code.
- **Historical guarded profiles:** the earlier pinned Identifiers.org, UniProt, WikiPathways, Rhea, Wikidata, and document profiles remain experiment provenance only. They are not the active worker-facing transport contract.
- **Open-goal operation choice:** two fresh live UniProt workers used the same guarded surface without query templates. A factual goal produced bounded `SELECT` handles; a graph-shaped goal independently produced a six-quad `CONSTRUCT` handle. See the [operation-selection experiment](docs/experiments/open-goal-uniprot-operation-selection.md) and its [compact receipts](artifacts/open-goal-runs/).
- **Evidence manifests:** a small versioned manifest points a worker to authoritative ontology, examples, named-graph description, and the generic mediated-access mode. It is not a planner, endpoint allowlist, or fallback query library. See the [goal-loop dossier](docs/experiments/goal-loop-state-graph.md).
- **Source orientation index:** [resources/index.md](resources/index.md) is a deliberately small directory of scientific roles, candidate entry points, and identifier anchors. It helps an agent choose where to investigate; it is not endpoint code, an allowlist, a health claim, or a query plan.
- **Documentation discovery history:** the earlier pinned UniProt schema-document trial remains recorded with compact hash provenance. See the [schema-discovery experiment](docs/experiments/uniprot-schema-discovery.md).
- **Prior grounding evaluation:** workers may use pretrained knowledge as hypotheses, but must ground, correct, reject, or leave it unresolved before it enters a plan. The evaluation separately diagnoses methodology, tool-surface, environment, and source failures. See the [dossier](docs/experiments/prior-grounding-tool-surface-evaluation.md).
- **Externally authored competency evaluation:** the official UniProt SPARQL example catalog is the held-out question corpus for staged clean-room evaluation. A dated catalog snapshot and three evaluator-private references back the public non-dispatchable worker draft; official queries remain outside the worker checkout. No competency case has run, and transport openness does not weaken the evaluator-private boundary.
- **Historical adaptive acquisition:** earlier exact-profile trials content-sniffed documents and retained typed attempts. Their receipts remain evidence, but the helpers are retired from the production transport surface.
- **Symbolic orientation cache:** a bounded PEEK-aligned map retains stable sources, parsing facts, failures, identifiers, and reusable result handles while bulk evidence remains in the REPL. It is not a task-answer store or a competing workflow engine.
- **Codex-goal-compatible evidence state:** the earlier checklist-style worker guidance is transitional. Codex owns goals and worker lifecycle; the first project-local slice now attaches guarded acquisition and symbolic orientation events to retained Linked Data state. See the [decision and experiment dossier](docs/experiments/goal-loop-state-graph.md).
- **Presentation handoff:** a retained handle can yield a typed, bounded table model with source handle and compact provenance. It is not HTML, a full result, or a UniProt record browser.

Use the [agent context router](docs/agent/context-routing.md) to load project guidance by task type. Read the living [roadmap](docs/ROADMAP.md), [active task queue](docs/tasks/README.md), dated [work logs](docs/journal/), experiment methodologies under [docs/experiments](docs/experiments/), and the separate [experiment result registry](docs/experiments/RESULTS.md). The registry distinguishes contemporaneous receipts, resident audits, partial trace reconstructions, and summary-only records; methodology prose is not accepted as a result artifact. The [clean-worker map evaluation](docs/experiments/clean-worker-map-evaluation.md) has two successful constrained local runs, but both are currently summary-only. They do not establish open-ended or endpoint navigation. The [large-result export protocol](docs/experiments/large-result-export.md) remains documentation only, with no exporter or generated export artifact.

## Current live-navigation boundary

Live use remains explicitly approved and traversal-bound. The approval fixes behavior and resource budgets, not a predeclared destination list. The isolated child has no raw networking; only the consumer-owned Communica/RDF/JS path receives the private anonymous-read Fetch closure. Mutations, URL credentials, ambient identity, arbitrary POST, unbounded federation, and unbounded result handling are denied. Platform Fetch owns DNS, TLS, sockets, certificates, and redirects. Evaluation secrecy remains a separate worker-context and filesystem boundary.
