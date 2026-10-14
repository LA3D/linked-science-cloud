# UniProt published example 49: live federation test

**Follow-up root cause:** see [audit and diagnosis](ROOT-CAUSE.md). Independent curl captured UniProt’s explicit downstream Bgee 403 challenge. Genuine client-side tests separately exposed planner-budget and broker-finalization failures. The original report below records the initial stage; the follow-up supersedes its unresolved-error and raw-response gaps.

Tested 2026-09-27 in the saved project's actual `cleanroom_node_repl`. **A live three-service presentation demo is not supported by this run.** The unchanged published federation and the cholesterol/version-normalized revision both returned HTTP 400 at UniProt. Component queries succeeded; their results must not be presented as a successful full federation.

## What the published example actually says

The [requested official page](https://sparql.uniprot.org/.well-known/sparql-examples/?offset=43) labels example 49 as retrieving proteins, Rhea reactions, Ensembl genes and anatomical expression entities. The HTML element is `example48` because its index is zero-based. Its exact decoded query is saved as `queries/published-original.rq`; the full retrieved HTML and SHA-256 are indexed in `checkpoint.json`.

The currently published query targets **CHEBI:52639, N-acylsphingosine**, not cholesterol. This label was retrieved from Rhea, not assumed. It also joins `?ensemblGene` directly and contains **no version stripping**. A source query for the label cholesterol returned **CHEBI:16113**. These are material differences between the published example and the requested scientific question.

## Execution and timings

| Test | Result | Measured elapsed time |
|---|---|---:|
| Exact published query, UniProt `/sparql/`, JSON Accept | HTTP 400; no result count available | 1.599 s |
| Same query, canonical `/sparql`, explicit `format=json` | HTTP 400 | 1.371 s |
| Published Rhea block directly | 161 reaction/chemical/equation/label rows | 0.876 s |
| Published Rhea–UniProt federation, Bgee block removed | 776 rows | 10.922 s |
| Cholesterol Rhea–UniProt federation | 355 rows | 13.087 s |
| Direct Bgee one-gene version comparison | 246 rows, all unversioned | 0.855 s |
| Minimal Bgee `SERVICE` from UniProt | HTTP 400 | 0.515 s |
| Bgee `SERVICE` from UniProt with a fixed gene and real expression pattern | HTTP 400 | 0.292 s |
| Cholesterol + version-normalized full federation | HTTP 400 | 1.802 s |
| Fixed protein/reaction/gene, three explicit SERVICE blocks through native traversal | One delegated POST to UniProt; HTTP 400 | 1.807 s |
| Direct Bgee CYP7A1 gene component | 83 rows, all unversioned | 0.660 s |

Timings are REPL wall-clock measurements and include local materialization/parsing for successful resource calls; exchange-only timestamps are in artifact receipts. Resource query tests used 45-second and 10 MB bounds. They did not time out or exhaust those bounds. No `SERVICE SILENT` or output `LIMIT` masked errors or truncated successful results. Counts describe distinct projected rows, not counts of proteins.

The cholesterol two-source result has **178 protein IRIs, 58 versioned gene IRIs and 55 reaction IRIs** across its 355 rows. The query does not filter reviewed proteins. These counts are scoped to the query and current releases, not all human cholesterol biology.

## SERVICE execution and joins

The exact query was sent as a single SPARQL request to UniProt through the REPL's mediated resource interface. UniProt is therefore responsible for executing the Rhea and Bgee `SERVICE` blocks and joining their results. The local broker records the UniProt exchange; it cannot attest to each server-side request or internal query plan.

1. **Rhea:** reaction → side → participant → compound → ChEBI. `rdfs:subClassOf*` admits the selected chemical class itself and its descendants. A reaction involving the chemical need not consume it; the published query does not distinguish reactant from product, and it does not filter Rhea status.
2. **UniProt:** human protein → catalytic-activity annotation → catalytic activity → catalyzed reaction. Shared Rhea IRIs in `?reaction` join the first block to UniProt. `rdfs:seeAlso/up:transcribedFrom` then follows a cross-reference through its encoding Ensembl gene.
3. **Bgee:** a Bgee gene resource links to the same Ensembl IRI using `lscr:xrefEnsemblGene` and to expression locations using `genex:isExpressedIn`; `rdfs:label` makes those locations readable. Retrieved schema comments document the Ensembl IRI template and describe expression in a condition. One additional Genex comment confusingly discusses absence rules; it is preserved verbatim in the raw schema result and is not used to reinterpret presence assertions.

UniProt returned, for example, `http://rdf.ebi.ac.uk/resource/ensembl/ENSG00000167910.4`. The Bgee comparison supplied both that IRI and its unversioned counterpart and returned only `http://rdf.ebi.ac.uk/resource/ensembl/ENSG00000167910`. The revision retains the source IRI in `?ensemblGeneVersioned` and binds:

```sparql
BIND(IRI(REPLACE(STR(?ensemblGeneVersioned), "[.][0-9]+$", "")) AS ?ensemblGene)
```

The anchored pattern removes only a final numeric version suffix; it does not split at the dots in the hostname. This is explicit identifier normalization, not a claim of RDF `owl:sameAs` or guaranteed compatibility across Ensembl releases.

The native traversal diagnostic was intended to try client-side service execution. Its receipt instead shows **one POST to UniProt**, demonstrating delegation by the planner. It is labeled `bounded-three-service-delegated-post`, not falsely counted as a local three-endpoint execution.

## Explicit revisions and diagnostic scope

`cholesterol-normalized-federation.rq` makes two changes to the published query: CHEBI:52639 → CHEBI:16113, and version stripping before the Bgee join. Both remain visible in the saved query. The two-source component queries remove the Bgee block and its projected variables. The bounded three-service diagnostic fixes P22680, RHEA:21812 and ENSG00000167910 using identifiers from the successful cholesterol result, and wraps the UniProt patterns in an explicit SERVICE block. It addresses only that slice, not the complete question.

A single non-www Bgee host variant also returned HTTP 400 from UniProt; it was a diagnostic candidate, not a verified replacement endpoint. Direct Bgee query access worked, while an HTML landing-page read returned 403. That landing failure does not establish failure of Bgee SPARQL queries.

The evidence localizes failure to the Bgee SERVICE path as executed by UniProt: direct Bgee access and the Rhea–UniProt federation work, and even a small Bgee SERVICE call fails promptly. It does **not** determine whether UniProt has a service policy, an outbound access problem, a method/negotiation mismatch, or another federation implementation issue. No server error body is available through the failed-resource facade, so those explanations remain unresolved. The independent Ensembl mismatch would still need correction even if transport execution were repaired.

## Readable component evidence

| Protein | Cholesterol reaction | Encoding gene in UniProt | Selected Bgee locations after normalization |
|---|---|---|---|
| P22680, Cytochrome P450 7A1 | RHEA:21812 | ENSG00000167910.4 | liver (UBERON:0002107); small intestine (UBERON:0002108) |

This row is a synthesis of successful component queries, **not a row from the failed full federation**. The complete Bgee component contains 83 entities including broad anatomical classes. Presence assertions do not establish tissue specificity, abundance, enzyme activity, substrate flux or absence elsewhere; the query omits developmental stage and evidence-quality dimensions. The published title mentions UBERON, but its query does not restrict the namespace, and the earlier mapping diagnostic also returned CL entities.

## Durable evidence and replay

- `checkpoint.json`: runtime identity, exact main queries, counts, bounded examples and artifact index.
- `queries/`: exact published query plus every recorded diagnostic query.
- `runs/`: per-attempt endpoint, query, time, result count or failure receipt.
- Raw successful SPARQL JSON and source HTML: unique broker artifact files and their receipts listed in the checkpoint. Full results remain outside model context.
- `replay.js`: executable REPL recipe for the original and explicitly revised queries.
- `validation.json`: hashes, counts, registry checks and known gaps.

**Raw-error gap:** failed responses have status, byte count and SHA-256 receipts, but their HTML bodies were not exposed for export by the broker. For the first exact request the receipt records 90,112 bytes and SHA-256 `4bd0a4dca9195a0bd11d90171f2efa034864c26a4e393c05dc699ff5225e2165`. No fabricated raw error file or invented server message is supplied. The full failed-response-body requirement is therefore unmet; successful raw responses are preserved.

Use the saved component artifacts for a presentation about linked identifiers and diagnosis. Do not advertise the original or revised three-service query as a working live demo based on this run. No slides, runtime, infrastructure, packages, branches or worktrees were changed.
