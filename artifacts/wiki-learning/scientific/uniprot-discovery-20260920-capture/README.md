# UniProt graph and resource discovery — 2026-09-20

This authorized maintenance capture saves source-owned metadata and bounded observations for scientific query design. It is not a reasoning evaluation. Raw project MCP exchanges, exact code, source hashes, a complete local metadata-query profile and checked graph-name rows accompany the corpus records. Full source payloads were not exported; historical handles do not restore residency.

## Resource map

- [Official graph catalog](https://sparql.uniprot.org/.well-known/void): release-specific inventory, counts and links to graph documentation. The captured service description advertises 21 graphs. Counts describe published metadata, not independently counted remote contents.
- [SPARQL service](https://sparql.uniprot.org/): the mediated resource read returned RDF service metadata. Its advertised union default graph combines partitions. Select explicit graph IRIs when partition identity matters.
- [Schema reference](https://purl.uniprot.org/html/index-en.html): readable vocabulary descriptions. Exchange 5 retains its response hash, last-modified metadata and bounded definitions. This page was last modified in May 2024; do not silently equate it with current endpoint axioms.
- [UniProt graph documentation](https://sparql.uniprot.org/uniprot) and [GO graph documentation](https://sparql.uniprot.org/go): web-discovered class/predicate inventories and diagrams where available. Their displayed counts can differ from the release catalog; retain retrieval date and source identity rather than combining them into one asserted snapshot.
- [Official examples](https://sparql.uniprot.org/.well-known/sparql-examples/): taxonomy examples explicitly document materialized subclass relationships. This is not evidence that GO has identical closure or that the service provides general OWL reasoning.

The graph IRI `http://purl.uniprot.org/core` differs from the namespace `http://purl.uniprot.org/core/`. The data graph `http://sparql.uniprot.org/uniprot` differs from the protein-resource namespace `http://purl.uniprot.org/uniprot/`. Graph names are exact RDF terms: do not rewrite HTTP to HTTPS or add a slash just because a documentation URL uses it.

Exchange 5 documents two distinct protein links: `up:classifiedWith` has range `up:Concept`; `up:annotation` has range `up:Annotation`. `up:Attribution` carries statement evidence/provenance through reification. These are documentation observations, not newly executed inference rules. A protein linked to a GO class is not thereby an instance of the biological process. Named graph membership is partition information, not a substitute for annotation-level evidence.

## Retrospective trajectory — not fresh runtime witnesses

Earlier conversation/tool observations reported an incorrect schema graph IRI with a trailing slash, subsequent corrected extraction attempts, and request-deadline failures on both routes. Those original raw exchanges are not archived here. Do not claim that removing the slash cured the timeout, that the endpoint schema is absent, or that a complete RDF release was retrieved. The new captures establish metadata discovery only.

The first newly saved capture rejected `results.page(..., {limit:30})`. Its kernel was subsequently closed. The second capture reacquired the metadata, paged in batches of ten and checked completeness. This does not establish same-handle recovery. Both actual attempts remain saved.

## Candidate guidance and next evidence

The proposal separates dated source facts from procedural candidates. Neither is generalized or human-reviewed. Existing selective memory retrieval can find the proposed entries; no automatic skill rewrite, evaluation enrollment or model-context injection is added.

Before reasoning, retrieve an explicitly scoped RDF module and preserve blank-node expressions, RDF lists, source graph identity and release provenance. Determine which relations and axioms the chosen rule profile supports. A SPARQL property path may suffice; metadata or a successful synthetic N3 run does not establish general OWL coverage. Still needed: successful complete schema extraction, relation-specific GO counterexamples, and an independent transfer episode.
