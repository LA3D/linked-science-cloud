# Ontology and schema objects

Ontologies, schemas, SHACL graphs, inferred graphs, and instance data are first-class RDF objects in the Linked Science runtime. `workspace.graphs.load` accepts bounded local-synthetic RDF/JS quads or text. For a remote RDF representation, `workspace.resources.get(url)` retains the broker-mediated response and `resource.rdf({ name })` (or `workspace.resources.parseRdf`) retains its native RDF/JS graph directly with per-exchange provenance; a CONSTRUCT wrapper is unnecessary. `workspace.traversal.query(options)` remains the general Communica/SPARQL operation for remote queries and federation.

## Resident fidelity

The resident record stores RDF/JS terms, not display strings. It therefore preserves:

- named-node IRIs and variable terms;
- literal lexical values, datatype IRIs, and language tags;
- blank-node identities within the supplied graph;
- default and named graph terms;
- duplicate quads and input ordering; and
- ordered, duplicate-aware source fingerprints and operation lineage.

Communica queries use an RDF dataset built from the selected handles. RDF dataset semantics can de-duplicate identical quads for querying even though the retained source record and fingerprint preserve the supplied duplicates. Ordered query results remain ordered as Communica returns them.

## Orientation versus evidence

`schema.search` is a bounded orientation operation over an ontology, schema, or SHACL handle. It returns matching term/quad descriptors with provenance. `graph.neighbors` provides a bounded local neighborhood. Neither operation exports the full graph.

The PEEK map stores only compact symbolic routes and handle references. It may say that an ontology handle was useful or that a predicate was found, but it is never the ontology itself. Scientific claims must return to resident RDF evidence and current operation provenance. After reset, map entries remain navigation hints while their old handle references are reported as stale.

## Query and derivation

Local read queries explicitly select graph or quad-result handles and accept caller-chosen SPARQL semantics without a harness-imposed result limit. The resulting bindings, booleans, or quads remain typed internally. Small graph results are kernel-resident; large complete graph results are broker-stored and can stream into later local SPARQL. `results.derive` accepts one model-written JavaScript callback for kernel-resident results. `workspace.rdf.dataset(handle)` clones a kernel-resident RDF/JS value for ordinary in-kernel work, while broker-stored results deliberately require bounded pages or symbolic subqueries. `workspace.rdf.retain({ dataset })` makes an in-kernel RDF/JS dataset queryable by Communica.

Prompt-visible `results.page` and `results.table` views convert RDF terms to bounded descriptors only at the presentation boundary. The retained source handle, lineage, fingerprints, and provenance remain attached.

See the normative [RLM/Prime runtime architecture](rlm-linked-science-runtime.md), the [persistent JavaScript compatibility surface](codeact-linked-science-runtime.md), and [runtime discovery](../agent/runtime-discovery.md).
