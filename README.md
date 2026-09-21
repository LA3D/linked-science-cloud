# Linked Science

Linked Science provides AI assistants with a stateful interface to linked scientific data through MCP. It combines a persistent programming environment with RDF graphs, ontologies, and SPARQL queries, enabling an assistant to retrieve evidence, inspect its meaning, and build on retained context across successive operations.

## What you can do

A question about a protein can span several scientific resources. In a [saved PubChem–UniProt session](artifacts/wiki-learning/scientific/pubchem-20260921-capture/README.md), the assistant:

1. Retrieved and retained the PubChem schema and SIO/CHEMINF ontologies, resolving opaque identifiers into labels, definitions and relationships.
2. Inspected ontology imports and followed relevant dependencies, keeping track of what remained unloaded.
3. Checked actual term usage in PubChem's QLever endpoint, separately from what its schema defined.
4. Followed an EGFR cross-reference to UniProt and combined protein annotation with PubChem assay records, preserving units, qualifiers and assay provenance.

The result connected biological context with experimental evidence. Cross-references did not establish exact identity, selected imports did not establish complete ontology closure, and the illustrative assay sample was not a potency ranking or medical recommendation. The [scientific workflow wiki](wiki/README.md) preserves proposed lessons with evidence and scope for future tasks.

## How it works

Linked Science combines two symbolic systems:

| Layer | What it represents | What the assistant can do |
| --- | --- | --- |
| Programming and working context | Persistent JavaScript/Node variables, objects, functions and handles | Retain resources and results, transform data, manage working context, and inspect selected portions without putting entire datasets in the prompt |
| Scientific knowledge | RDF entities and relationships, ontology definitions, Linked Data identifiers and SPARQL endpoints | Interpret terms, navigate cross-references, query graphs and combine explicitly represented scientific evidence |

The programming layer provides a workspace for computation; the knowledge layer supplies explicit scientific structure and semantics. RDF and SPARQL follow [W3C Semantic Web standards](https://www.w3.org/standards/semanticweb/). Native RDF/JS objects connect these layers, with N3 and Comunica supporting graph operations and queries. Loading an ontology makes its assertions available for inspection; it does not automatically perform full OWL inference.

State persists across calls within its documented lifetime. Releasing a handle, disposing a workspace or resetting its context invalidates the affected objects. Kernel reset or process loss removes live bindings and state; a restart does not restore them. Explicitly saved artifacts and versioned wiki records are durable evidence, distinct from live handles. See [session lifetimes](docs/architecture/persistent-session-and-handles.md) and the separately activated [shared scientific-session service](docs/architecture/scientific-session.md).

Public scientific reads pass through the project broker, which records provenance and enforces operational bounds. A bounded display is not a complete result, and an unavailable source is not evidence of absence. Authenticated access, bulk ingestion, exports and mutations have separate authority requirements. See the [runtime contracts](docs/runtime/runtime-reference.md).

## Research foundations

[Recursive Language Models (RLM)](https://arxiv.org/html/2512.24601v2) treats large context as an external environment that a model can inspect programmatically and decompose, with recursive model calls for selected subproblems. Linked Science applies this external-context idea to retained scientific objects and bounded observations. Model recursion is optional and capability-dependent; persistent context and native graph operations work without it. The [runtime architecture](docs/architecture/rlm-linked-science-runtime.md) describes the implemented boundary.

[WikiSkill: Compiling Agent Experience into Persistent Knowledge for Skill Evolution](https://arxiv.org/abs/2608.27454), by Tang and colleagues, separates execution experience, accumulated knowledge and executable skills. It informs this project's saved scientific evidence, cited/versioned learning wiki and distinct active procedures. The implementation supports explicit maintenance and selective retrieval of workflow candidates and dated findings. Automatic skill evolution is not implied; review and release are separate, and one episode does not establish generality. The [wiki-memory design](docs/tasks/wiki-memory-continual-learning.md) explains the adaptation. Wiki memory neither replaces the live programming context nor restores expired handles.

## Get connected

**Ask your agent to install Linked Science**, and point it to the **[agent installation guide](docs/agent/installation.md)**. The guide covers prerequisites, checkout selection, dependencies, client registration, restart, and live identity/persistence checks. It includes exact commands and failure routes.

The documented automated setup targets Codex. The project user reports testing ChatGPT Desktop and Codex; a verified project-specific ChatGPT Desktop installation procedure has not yet been recorded. The guide distinguishes that gap from the tested local broker path. Future plugin packaging is planned, not an available installation method.

## Use and extend

Once the project MCP is connected, execute this through its `cleanroom_node_repl` JavaScript tool:

```js
var ws = linkedScience.open({ contextKey: 'scientific-question' });
var graph = await ws.graphs.load({
  name: 'local-example', kind: 'instance-data',
  text: '<urn:sample> <urn:measurement> 42 .',
});
var result = await ws.query.run({
  sources: [graph], sparql: 'SELECT * WHERE { ?s ?p ?o }',
});
nodeRepl.write(await ws.results.page(result));
```

The graph and result remain available to subsequent calls. Use `await ws.release(result)` when finished with that result, or `await ws.dispose()` to release the workspace. Public resources use `ws.resources.get(url)`; remote RDF/SPARQL queries use `ws.traversal.query(...)`. Optional [N3 reasoning](docs/architecture/deterministic-reasoning.md) has separate capability and installation requirements.

- [Linked Data REPL skill](.agents/skills/linked-data-repl/SKILL.md): normal scientific work and selective wiki consultation.
- [API schema](docs/runtime/linked-science-api.schema.json) and [runtime reference](docs/runtime/runtime-reference.md): operations, bounds and implementation ownership.
- [Context router](docs/agent/context-routing.md): task-specific documentation.
- [Contributor verification](docs/agent/verification.md) and [Git handoff](docs/agent/git-handoff.md): repository changes and delivery.
- [Roadmap](docs/ROADMAP.md) and [experiment records](docs/experiments/RESULTS.md): plans and scoped evidence, not authorization to run future work.
