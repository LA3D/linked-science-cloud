# Deterministic reasoning in the scientific session

The first reasoning surface runs explicit N3 rules with the pinned Eyeron engine. Codex owns model reasoning, delegation and continuation; the host adapter owns deterministic execution. Graph data travels through the private broker connection, without an implicit model-visible data relay. This does not turn a successful rule execution into a scientifically justified premise or establish general OWL conformance.

## Workspace use

```js
var ws = linkedScience.open({ contextKey: 'reasoning-question' });
ws.reasoning.capabilities(); // availability and enforced adapter limits
var facts = await ws.graphs.load({
  name: 'ontology-slice', kind: 'ontology',
  text: '@prefix : <urn:example:>. :sample a :Neuron. :Neuron <http://www.w3.org/2000/01/rdf-schema#subClassOf> :Cell.'
});
var inference = await ws.reasoning.run({
  sources: [facts],
  graphPolicy: 'default-graph-only',
  rules: {
    id: 'instance-subclass', version: '1',
    text: '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>. { ?s a ?c. ?c rdfs:subClassOf ?d } => { ?s a ?d }.'
  },
  proof: true
});
var answer = await ws.query.run({
  sources: [facts, inference.derived],
  sparql: 'SELECT ?type WHERE { <urn:example:sample> a ?type }'
});
nodeRepl.write(await ws.results.page(answer));
nodeRepl.write(ws.reasoning.describe(inference));
nodeRepl.write(ws.reasoning.explain(inference, { maxBytes: 2048 }));
```

The first profile accepts exactly one retained RDF source, with default-graph triples only. Use ordinary SPARQL CONSTRUCT to select or merge the intended source explicitly before invoking inference. Named graphs are rejected, never silently unioned. N3 input rules require an id, version and bounded text; the execution record also hashes their actual bytes. Rules are caller-supplied premises, including any model-written rules. This slice does not add SPARQL-RL execution or a built-in OWL profile.

## Host execution and installation

The default installation locator is `~/.local/share/linked-science/eyeron-v0.5.13/pkg/eyeron.js`; a host can set `LINKED_SCIENCE_EYERON_MODULE` or supply the broker's trusted `reasoningOptions.modulePath`. This locates the sibling Wasm file; the adapter does not execute the installed JavaScript wrapper or install missing software. It verifies the original Wasm digest, constrains its memory declaration and records the transformed digest in each run. The pinned ABI and host imports fail closed on drift.

Each call uses a fresh terminable worker. Defaults are 10 seconds, 1 MiB input, 1 MiB derived output, 1 MiB proof, 128 MiB Wasm linear memory and 64 MiB V8 old-generation heap. The public rule text limit is 64 KiB. Inspect capabilities for all defaults and ceilings; limits are per call. These memory limits do not claim an exact process RSS ceiling: code, stacks and message copies add overhead. Kernel termination aborts its active reasoning; workspace/source invalidation prevents later publication.

Rules use a restricted deterministic builtin profile. Network/file/import, clock and unsupported dynamic-construction builtins are rejected, including upstream I/O builtins that otherwise have fixture fallbacks. No rule receives host Fetch, filesystem or a CLI import resolver. Resource acquisition remains a separate mediated operation.

## Results and validity

`run` returns native `derived` and optional `proof` handles, plus compact `report` metadata. Assertions remain unchanged. Reports identify the operation, source handles/epochs/fingerprints, serialized input and output hashes, rules, engine build, completion, limits and elapsed time. Parsing or execution failure publishes no successful partial result. Successful empty inference means no derivation for those exact inputs and rules.

Input blank nodes are renamed for the engine and restored in derived RDF so the inferred graph can rejoin the original single source. Newly generated blank nodes receive fresh identities. Separate engine calls are not a persistent fact database. No truth-maintenance or inference cache is claimed.

A derived graph depends on its input handle. Releasing that source, disposing the workspace or resetting its epoch invalidates later derived reads; proof reads also depend on the derived graph. Explicitly release derived/proof handles when no longer needed, including invalidated ones. Previously copied query values are independent snapshots under the existing query contract. A source cannot be mutated through the retained RDF/JS view.

`explain` currently returns a byte-bounded **raw N3 proof excerpt**, clearly marked unverified and possibly truncated. It is not a conclusion-directed explanation or independent proof checker. The complete proof stays behind its evidence handle. Conclusion selection and proof checking remain subsequent work.

## Scoped workers and context

The [scientific session bridge](scientific-session.md) exposes an explicitly granted reasoning operation over a published source. The owner session retains derived graphs and proofs; worker departure does not itself release them. The worker can query a derived reference and deposit a structured finding into its assigned result slot. Source/grant restrictions remain enforced by the bridge. Grant reasoning deliberately: it permits bounded computation with caller-supplied rules, not owner-kernel arbitrary evaluation.

Orientation records only a compact derived-object reference, completion, graph policy and rule/input hashes. `orientation.bootstrap` rechecks the current dependency lifetime and labels stale reasoning references. It stores neither rules nor graph/proof payloads. Saved orientation and historical operation receipts do not resurrect expired handles.

## Delivery and next evidence

The adapter is optional: a checkout without the pinned engine must report unavailable, while normal RDF/SPARQL work remains available. The existing MCP still exposes three tools. Fresh broker/service processes are needed to load these changes; local tests do not establish activation in an already-mounted desktop MCP.

The [reasoning/wiki handoff](../tasks/reasoning-and-wiki-guidance.md) remains the continuation record. Production tests establish runtime behavior; they do not by themselves create eligible scientific memory, prove semantic model quality or promote a wiki pattern. A fresh scientific worker experiment and reviewed evidence-backed guidance follow implementation.
