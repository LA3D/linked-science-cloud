# Fabry → GLA protein → function, structures and pathway

**The bounded live route succeeded.** Starting from the retained complete DisMech Fabry instance graph, a local query found the gene annotation on **Alpha-galactosidase A deficiency**. HGNC mapped that source identifier to human UniProt P06280. A source-documented remote SPARQL query returned structure/pathway cross-references, and selected API follow-ups established experimental structure coverage and a specific lysosomal reaction. Local SPARQL joined the disease and protein graphs by explicit HGNC normalization and independently by their shared GO identifier.

## Answer to the scientific question

Human **alpha-galactosidase A**, encoded by **GLA**, is a lysosomal glycosphingolipid-degrading enzyme (EC 3.2.1.22). UniProt describes removal of terminal non-reducing alpha-D-galactose residues. Its catalytic annotation specifically connects Gb3Cer plus water to lactosylceramide plus galactose; that annotation contains **CHEBI:18313**, already present in the DisMech record. This is source annotation, not a reaction newly inferred here. [UniProt P06280](https://rest.uniprot.org/uniprotkb/P06280.json)

Reactome provides additional context: **R-HSA-1605736**, “GLA hydrolyzes PSAP(195-273):Gb3Cer:PE,” has a GLA-dimer catalyst in the lysosomal lumen, water and saposin-B-associated Gb3Cer as inputs, and galactose plus the lactosylceramide complex as outputs. Following catalyst → complex → component reaches mature GLA residues 32–429 with an explicit reference back to P06280. The reaction summary identifies saposin B as a cofactor. These structured participants and catalytic context extend beyond the disease record's identifier annotations. [Reaction record](https://reactome.org/ContentService/data/query/R-HSA-1605736)

**Interpretation:** the joined records explain the substrate-processing step implicated by the Fabry mechanism and expose structural material for investigating it. They do not establish tissue-specific flux, explain every downstream phenotype, predict variant severity or support a treatment recommendation.

## Evidence chain and operations

| Source identifier / relationship | Returned identifier / relationship | Interpretation and next operation |
|---|---|---|
| Retained DisMech mechanism `Alpha-galactosidase A deficiency` → `dm:genes/dm:term` | HGNC report IRI ending `hgnc_id/4296` | Actual source gene annotation. Extract numeric identifier and retrieve HGNC JSON. **Local SPARQL.** |
| [HGNC:4296](https://rest.genenames.org/fetch/hgnc_id/HGNC:4296) | Symbol GLA; `uniprot_ids: [P06280]` | Explicit gene→protein cross-reference, not an ID supplied from memory. **API GET.** |
| [UniProt service page](https://sparql.uniprot.org/) | Published examples for `up:Protein`, `up:organism`, `up:encodedBy`, `skos:prefLabel`, `rdfs:seeAlso`, `up:database`; default graph and release 2026_03 documented | Source-owned metadata inspected before constructing the protein query. **HTML GET.** |
| P06280 queried using those predicates | Human taxon 9606, gene GLA, **35 links**: 31 PDB, one AlphaFoldDB, two Reactome, one HGNC | Complete selected query result under broker defaults, without SPARQL LIMIT. Inspect the returned links before choosing follow-ups. **Remote SPARQL.** |
| P06280 `rdfs:seeAlso` PDB 1R46 | [Human alpha-galactosidase structure](https://data.rcsb.org/rest/v1/core/entry/1R46), X-ray 3.25 Å | A selected experimental structure; not a claim it is the newest/best or the only one. Follow entity, chain and assembly metadata. **RCSB APIs.** |
| 1R46 entity/SIFTS alignment | Human P06280 positions 32–429; entity length 398; no reported mutations; assembly is dimeric; chain A has **390 modeled residues** | Mature-chain sequence mapping differs from complete coordinate coverage. UniProt reports signal peptide 1–31 and mature chain 32–429. **RCSB/UniProt assertions.** |
| P06280 AlphaFoldDB cross-reference | [AF-P06280-F1 v6](https://alphafold.ebi.ac.uk/api/prediction/P06280), human, residues 1–429, mean pLDDT 94.31 | Predicted precursor model, including the signal peptide; not experimental resolution, a mature dimer model or uniform residue confidence. **AlphaFold API.** |
| P06280 Reactome cross-reference | [R-HSA-9840310, Glycosphingolipid catabolism](https://reactome.org/ContentService/data/query/R-HSA-9840310) → R-HSA-1605736 | Follow the specific GLA event, rather than treating broad pathway membership as mechanistic detail. **Reactome APIs.** |
| Reaction → catalyst 1605696 → complex R-HSA-1605744 → component 1605763 | [GLA, lysosomal lumen, reference P06280](https://reactome.org/ContentService/data/query/1605763) | Explicit return link verifies that the pathway catalyst is the mapped human protein. **Reactome APIs.** |
| DisMech `dm:molecular_functions/dm:term` GO:0004557; UniProt `up:classifiedWith` same IRI | One joined row for the deficiency mechanism and P06280 | A direct shared-GO-identifier join across retained RDF graphs. This confirms aligned annotations, not a new causal inference. **Local SPARQL.** |

The second Reactome link, neutrophil degranulation, was retained in the query result but not pursued; the chosen glycosphingolipid route answers this Fabry question.

## Actual retained state

- Original complete DisMech graph remains `fgGraphs.disease`, handle `h-000028`, 2,834 triples, from the [preceding full-record checkpoint](../fabry-full-graph-20260925/README.md). It is adapted LinkML instance RDF; that checkpoint's conversion qualifications still apply.
- Extension workspace: `fxWs`, context `fabry-protein-extension-20260925`, in the actual `cleanroom_node_repl` with the authoritative saved checkout identity.
- Complete protein RDF: `fxProteinGraph`, 7,969 triples. A separately loaded copy `fxLocalProtein` in the original workspace permits local joins with the disease graph. Handle IDs/fingerprints are in `checkpoint.json`.
- Native remote result: `fxRemote`, 35 complete rows. `fxJoin` and `fxShared` each hold one local joined row. Source exploration remains in `fxStart` and `fxRel`.
- Complete resources are saved under unique broker-owned `artifacts/resources/` paths listed in `checkpoint.json`, with receipt paths, retrieval URLs and SHA-256 values. Handles are not substitutes for those durable files. No session was reset.

The UniProt record reports entry version 253, sequence version 1 and annotation update 2026-09-02. The source disease record remains pinned to DisMech commit `090fcc12aafac22e5e2b8454aab44ce6735579cb` in the preceding checkpoint.

## Identifier and interface qualifications

The source's HGNC IRI is `https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/4296`; UniProt RDF uses `http://purl.uniprot.org/hgnc/4296`. `local-hgnc-join.rq` explicitly extracts the number and constructs the UniProt form. This is a documented normalization supported by the HGNC API mapping, not an `owl:sameAs` assertion. The GO join uses the same OBO IRI directly, with no string normalization.

API templates were model-suggested access routes; identifiers were taken from actual source records. API responses, HTML service metadata, remote SPARQL, RDF parsing and local SPARQL are separately labeled. No federation was claimed. The complete remote SPARQL response was also saved by a separate mediated GET replay; its result count matches the native query. This replay is a distinct exchange, not the original transport response.

Structure metadata was retrieved, including chain coverage and assembly. No coordinate file, structural alignment, ligand inspection, PAE analysis or molecular simulation was performed in this checkpoint. No isoform-specific variant mapping was attempted.

## Failed routes and limits

1. The first local identifier probe searched uppercase `HGNC` and therefore omitted lowercase `hgnc_id` URLs. A relationship query using case-insensitive HGNC matching found the actual gene annotations; no absence claim was made. It also found genes annotated to other mechanisms. The route stayed with the gene on the alpha-galactosidase deficiency mechanism.
2. `https://sparql.uniprot.org/.well-known/void` exceeded the 20-second request deadline. The service landing page succeeded and supplied documentation for the query. This is a metadata-route timeout, not a SPARQL service failure.
3. UniProt's catalytic annotation lists RHEA:21112. The candidate RDF URL `https://www.rhea-db.org/rhea/21112/rdf` returned **403, HTML**, with no advertised next links. This initial attempt acquired no independent Rhea evidence. A subsequent authorized diagnostic reproduced the 403 with curl, then inspected Rhea’s official SPARQL examples and successfully queried reaction 21112 through the actual REPL (four ChEBI participants). See [diagnostic evidence](rhea-diagnostic/README.md). The validity of the original RDF URL remains unknown behind the website challenge.

Failure receipts are retained in `operations.json`. No unrelated protein, disease or scientific question was substituted.

## Short demonstration (about three minutes)

1. **Start with a source query:** show the deficiency mechanism's gene relationship to HGNC:4296, then HGNC's returned P06280 mapping. Emphasize that the accession came from evidence.
2. **Run `remote-crossrefs.rq`:** show human GLA and selected PDB, AlphaFold and Reactome links from the complete 35-row result. Keep complete records in handles; display only chosen rows.
3. **Answer the function question:** explain terminal alpha-galactose hydrolysis in the lysosome. Show the mature-chain/dimer metadata for 1R46 alongside the separately labeled precursor prediction.
4. **Follow the pathway:** show the Gb3Cer reaction, saposin-B context and catalyst's return link to P06280. Finish by running `local-shared-go.rq`: the disease mechanism and protein meet at GO:0004557 in a queryable graph.

The defensible takeaway is that identifiers allow the agent to move from a curated disease mechanism to protein chemistry, structural coverage and reaction participants, while retaining the provenance and remaining gaps.

## Replay and deliverables

`replay-cells.js` contains an initially captured cell and a clearly marked replay recipe reconstructed from durable queries and operation records, with a fresh-workspace prelude. It is not a complete verbatim execution transcript. Execute cells separately in the project MCP; the recipe catches individual failed retrievals and continues. The prelude loads the saved full disease graph and does not reset prior sessions. Live source replays may change; use saved responses for the captured version.

Standalone query files: `source-identifiers.rq`, `source-relationships.rq`, `remote-crossrefs.rq`, `local-hgnc-join.rq`, `local-shared-go.rq`. `checkpoint.json` contains graph profiles and complete native result rows; `operations.json` contains API attempts and failure receipts. `validation.json` records checksum/count validation and the repository registry limitation.

No slides, infrastructure, global configuration, worktree, branch, external database or package installation was changed. The checkpoint ends here.
