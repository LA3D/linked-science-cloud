# Ontology and schema objects

Ontologies, schemas, SHACL graphs, inferred graphs, and instance data are first-class local RDF objects in the Linked Science runtime. `workspace.graphs.load` retains each object behind a typed, epoch-bearing handle. It accepts either RDF/JS quads or bounded local RDF text and rejects remote source claims in v1.

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

Local read queries explicitly select graph handles and require a result limit except for `ASK`. The resulting bindings or quads remain typed internally. `results.derive` accepts one model-written JavaScript callback and retains one documented typed output; it is the generic transformation surface instead of a growing family of fixed domain operations.

Prompt-visible `results.page` and `results.table` views convert RDF terms to bounded descriptors only at the presentation boundary. The retained source handle, lineage, fingerprints, and provenance remain attached.

See [the runtime architecture](codeact-linked-science-runtime.md) and [runtime discovery](../agent/runtime-discovery.md).
