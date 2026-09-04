# Linked Science runtime

This saved checkout is the authoritative production implementation of the Linked Science persistent RDF/Communica runtime and its project-owned clean-room REPL broker. The local Communica engine and RDF store belong to a worker task; a conversational coordinator delegates a bounded task and receives its evidence-backed result. “Production” identifies implementation ownership here; historical experiments and incomplete evaluation claims remain explicitly scoped as such.

## Authoritative project boundary

| Surface | Owner in this checkout |
| --- | --- |
| Project identity | Private package `@linked-science/runtime`, role `authoritative-production-implementation` |
| Facade and bootstrap | `lib/linked-science-runtime.mjs` and `lib/cleanroom-linked-science-bootstrap.mjs` |
| Persistent REPL and broker | `packages/cleanroom-node-repl`, package `@linked-science/cleanroom-node-repl` |
| Codex registration | `.codex/config.toml`, server `cleanroom_node_repl`, exactly `js`, `js_reset`, and `js_add_node_module_dir` |
| Excluded experimental probe | `/Users/cvardema/dev/git/LA3D/linked-science-cloud/node-repl-network-probe`; no production import, configuration, bootstrap, or evidence authority |

Run the complete offline identity, broker, and synthetic runtime verification from the authoritative saved checkout:

```sh
npm run linked-science:verify
```

That command validates exact repository wiring, checks the broker package, launches the real local JSON-RPC MCP, verifies the three-tool contract and cross-call persistence, bootstraps `linkedScience`, exercises a local-synthetic Communica query, and verifies reset/PEEK semantics. It performs no live traversal. An actual Codex task must still perform the compact [fresh-task preflight](docs/agent/runtime-discovery.md); a passing shell command cannot prove which MCP was mounted into that task.

## Current Codex runtime boundary

The active project configuration registers the consumer-owned `cleanroom_node_repl` MCP from `packages/cleanroom-node-repl`. It is the canonical RLM/Prime-style runtime for this checkout: persistent JavaScript is the model's external-context control environment, while the trusted host owns optional recursive provider calls, authority, lifecycle, accounting, and recovery. The browser-shaped facade and CodeAct-style execution are useful techniques inside that design, not the architecture itself. The MCP retains the observed three-tool contract. This project does not use or configure Codex Desktop's bundled `node_repl` or the sibling experimental probe repository. Successful bootstrap reports the project id, authoritative role, broker package, exact root, module root, and structured RLM capabilities.

The former restricted network profile remains disabled at `.codex/config.restricted-profile.toml.disabled` for historical reference. It is not active configuration and must not be re-enabled to grant the bundled REPL network access. Tool exposure, project-root selection, module resolution, persistence, RLM state, PEEK state, and guarded network reachability remain separate properties that must be observed rather than inferred.

## Worker pattern

1. The coordinator keeps the conversation, scope, and approval boundary.
2. A fresh Local task loads the project-scoped `cleanroom_node_repl`, verifies its cwd, and bootstraps the Linked Science facade once per kernel.
3. The worker verifies a query in a second REPL call and reports only what was actually observed. Kernel reset discards bindings, RLM context, symbolic handles, and epoch-owned result spools while broker PEEK orientation remains advisory.

Run the small dependency smoke check separately with:

```sh
npm run smoke
```

For the tested REPL initialization and persistence check, use the project-local [Linked Data REPL skill](.agents/skills/linked-data-repl/SKILL.md).

## Linked Science runtime

The production-oriented local adapter is bootstrapped by `lib/cleanroom-linked-science-bootstrap.mjs` and implemented by `lib/linked-science-runtime.mjs`. It installs one stable Linked Science/Linked Data JavaScript facade, validates this checkout and its declared dependency root, registers discovery material with clean-room RLM context, keeps Communica private as the query kernel, delegates compact orientation to broker-owned PEEK, and retains resources, RDF datasets, ontology/schema/SHACL/instance graphs, and results behind epoch-bearing handles. Its public resource responses are fetch-/Response-like enough for ordinary in-kernel composition while the broker keeps transport, identity stripping, budgets, and audit receipts private. Start with [runtime discovery](docs/agent/runtime-discovery.md); the checked-in [machine API schema](docs/runtime/linked-science-api.schema.json) supports fresh-agent lookup. The consumer-owned clean-room package supplies the isolated execution and broker boundary.

## Capability map and next work

- **Synthetic session:** local in-memory RDF is materialized under a symbolic handle and can be profiled, paged, or derived without printing the full result.
- **Complete out-of-core query results:** small `SELECT`, `CONSTRUCT`, and `DESCRIBE` results remain in the kernel; larger complete results spill to a private broker SQLite spool and are removed on kernel reset. Stored bindings keep bag semantics and page on demand. Stored quad results are indexed sources: later local SPARQL pushes each triple pattern into the broker's SPO/POS/OSP indexes with exact cardinalities instead of re-streaming the whole result. Storage exhaustion fails without publishing a partial handle.
- **Heap-aligned residency:** resident-graph quotas are derived from the kernel heap the broker actually grants (`budgetPlanes.residency.basis`), a live headroom check refuses a retention or whole-graph copy that would exhaust it (`LS_KERNEL_HEAP_BOUND`), local queries run over lazy indexed sources rather than per-query merged copies, and a kernel that still dies of memory is reported as `KERNEL_OOM` with epoch-loss repair guidance.
- **Bounded REPL egress:** `nodeRepl.write` has a 32 KiB aggregate default per evaluation and an explicit hard-capped override, independent of result/page bounds.
- **RLM control environment:** persistent model-written JavaScript keeps resources, RDF/JS datasets, ontologies, and results external to the prompt behind symbolic handles. Agents use Communica subgraph queries, RDF/JS operations, generic derivation, bounded views, PEEK orientation, and optional host-mediated recursion to examine only the context needed for the current step.
- **Open-world mediated traversal:** consumer-owned Communica may dereference dynamically discovered anonymous HTTP/HTTPS RDF resources and federate across SPARQL services. Every request uses a private parent-owned standard-Fetch authority, which enforces identity stripping, mutation denial, request/fan-out/concurrency/time/byte/item bounds and records per-exchange lineage without exposing Fetch to agent code.
- **Historical guarded profiles:** the earlier pinned Identifiers.org, UniProt, WikiPathways, Rhea, Wikidata, and document profiles remain experiment provenance only. They are not the active worker-facing transport contract.
- **Open-goal operation choice:** two fresh live UniProt workers used the same guarded surface without query templates. A factual goal produced bounded `SELECT` handles; a graph-shaped goal independently produced a six-quad `CONSTRUCT` handle. See the [operation-selection experiment](docs/experiments/open-goal-uniprot-operation-selection.md) and its [compact receipts](artifacts/open-goal-runs/).
- **Evidence manifests:** a small versioned manifest points a worker to authoritative ontology, examples, named-graph description, and the generic mediated-access mode. It is not a planner, endpoint allowlist, or fallback query library. See the [goal-loop dossier](docs/experiments/goal-loop-state-graph.md).
- **Source orientation index:** [resources/index.md](resources/index.md) is a deliberately small directory of scientific roles, candidate entry points, and identifier anchors. It helps an agent choose where to investigate; it is not endpoint code, an allowlist, a health claim, or a query plan.
- **Documentation discovery history:** the earlier pinned UniProt schema-document trial remains recorded with compact hash provenance. See the [schema-discovery experiment](docs/experiments/uniprot-schema-discovery.md).
- **Prior grounding evaluation:** workers may use pretrained knowledge as hypotheses, but must ground, correct, reject, or leave it unresolved before it enters a plan. The evaluation separately diagnoses methodology, tool-surface, environment, and source failures. See the [dossier](docs/experiments/prior-grounding-tool-surface-evaluation.md).
- **Externally authored competency evaluation:** the official UniProt SPARQL example catalog is the held-out question corpus for staged clean-room evaluation. A dated catalog snapshot and three evaluator-private references back the public non-dispatchable worker draft; official queries remain outside the worker checkout. No competency case has run, and transport openness does not weaken the evaluator-private boundary.
- **Historical adaptive acquisition:** earlier exact-profile trials content-sniffed documents and retained typed attempts. Their receipts remain evidence, but the helpers are retired from the production transport surface.
- **Symbolic orientation cache:** a bounded PEEK-aligned map retains stable sources, parsing facts, failures, identifiers, and reusable result handles while bulk evidence remains behind handles. It is not a task-answer store or a competing workflow engine. The current implementation is a map data structure without the learned Distiller/Cartographer/Evictor policy; the evidence-first Prime plan treats that policy as a separate experiment.
- **Codex-goal-compatible evidence state:** the earlier checklist-style worker guidance is transitional. Codex owns goals and worker lifecycle; the first project-local slice now attaches guarded acquisition and symbolic orientation events to retained Linked Data state. See the [decision and experiment dossier](docs/experiments/goal-loop-state-graph.md).
- **Presentation handoff:** a retained handle can yield a typed, bounded table model with source handle and compact provenance. It is not HTML, a full result, or a UniProt record browser.

Use the [agent context router](docs/agent/context-routing.md) to load project guidance by task type. Read the living [roadmap](docs/ROADMAP.md), [active task queue](docs/tasks/README.md), dated [work logs](docs/journal/), experiment methodologies under [docs/experiments](docs/experiments/), and the separate [experiment result registry](docs/experiments/RESULTS.md). The registry distinguishes contemporaneous receipts, resident audits, partial trace reconstructions, and summary-only records; methodology prose is not accepted as a result artifact. The [clean-worker map evaluation](docs/experiments/clean-worker-map-evaluation.md) has two successful constrained local runs, but both are currently summary-only. They do not establish open-ended or endpoint navigation. The [large-result export protocol](docs/experiments/large-result-export.md) remains documentation only, with no exporter or generated export artifact.

## Current live-navigation boundary

Ordinary goal-relevant anonymous public reads use the broker-mediated Linked Science surface and its default bounds; a user or task may ask for tighter limits. The isolated child has no ambient raw networking; only the consumer-owned resources/RDF/JS/Communica runtime receives the private anonymous-read Fetch closure. Authenticated, sensitive, mutating, bulk-ingestion, export, and evaluation actions remain separately governed. Mutations, URL credentials, ambient identity, arbitrary POST, unbounded federation, and unbounded physical resource use are denied in the current authority class. Query answers are complete-or-fail: operational byte/storage ceilings never become silent semantic truncation. Platform Fetch owns DNS, TLS, sockets, certificates, and redirects. Evaluation secrecy remains a separate worker-context and filesystem boundary.

UniProt, Wikidata, WikiPathways, and Rhea are representative dynamically discovered public Linked Data or SPARQL targets, not hardcoded approval domains. Their goal-relevant anonymous reads use the same effect class, default cumulative budgets, and automatic receipts as any other public target. Reachability is observed per traversal rather than inferred from configuration.

PubChem-scale dumps are outside the interactive traversal mediator's contract. A future bulk-ingestion path must be separately authorized and parent-owned, with an expected artifact, byte and decompression ceilings, checksum verification, explicit storage destination, and bounded import into resident or durable dataset state. No interactive traversal or endpoint exception should be used to approximate that bulk path.
