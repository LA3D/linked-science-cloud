# Linked Science Cloud orientation index

This is a small directory for agent orientation. It is not an allowlist, health monitor, query plan, capability catalog, or claim that a source is currently reachable. A listed source still requires current approval, bounded transport, and a receipt. An unavailable route or empty result is not evidence of global absence.

Choose the route that best preserves the evidence needed for the question. A cloud may expose a graph endpoint, ontology, conventional API, downloadable data, documentation, or several of these. API responses are useful evidence, but a flattened API projection is not interchangeable with the source graph. Retain native payloads and record explicit identifier or assertion mappings when combining routes.

## Molecular and chemical sources

| Source | Scientific role | Candidate starting points | Identifier or vocabulary anchors |
| --- | --- | --- | --- |
| [UniProt](https://www.uniprot.org/) | Protein sequence, annotation, function, and evidence | [SPARQL](https://sparql.uniprot.org/sparql), [REST API](https://rest.uniprot.org/), RDF schema documentation | UniProt accessions and `http://purl.uniprot.org/` IRIs |
| [Rhea](https://www.rhea-db.org/) | Expert-curated biochemical reactions | [SPARQL](https://sparql.rhea-db.org/sparql), website and downloads | Rhea reaction identifiers; ChEBI participant IRIs |
| [ChEBI](https://www.ebi.ac.uk/chebi/) | Chemical entities and ontology hierarchy | [official web/API entry point](https://www.ebi.ac.uk/chebi/), [OLS](https://www.ebi.ac.uk/ols4/ontologies/chebi), [IDSM projection](https://idsm.elixir-czech.cz/sparql/endpoint/chebi) | `CHEBI:` accessions and ChEBI ontology IRIs; the IDSM graph is a third-party projection |
| [SwissLipids](https://www.swisslipids.org/) | Lipid structures, metabolism, and cross-references | [beta SPARQL endpoint](https://beta.sparql.swisslipids.org/sparql), website and downloads | SwissLipids identifiers; ChEBI and reaction links where supplied |
| [WikiPathways](https://www.wikipathways.org/) | Community-curated biological pathways | [SPARQL](https://sparql.wikipathways.org/sparql), [ontology](https://vocabularies.wikipathways.org/wp.owl), website/API | WikiPathways identifiers; WP vocabulary; database cross-reference predicates |

## Comparative biology, expression, and interaction

| Source | Scientific role | Candidate starting points | Identifier or vocabulary anchors |
| --- | --- | --- | --- |
| [OMA](https://omabrowser.org/) | Orthology and comparative genomics | [SPARQL](https://sparql.omabrowser.org/sparql), browser/API/downloads | OMA groups and protein identifiers |
| [OrthoDB](https://www.orthodb.org/) | Hierarchical ortholog groups | [SPARQL](https://sparql.orthodb.org/sparql), website/API/downloads | OrthoDB ortholog and taxon identifiers |
| [Bgee](https://www.bgee.org/) | Gene expression across species and conditions | [SPARQL](https://www.bgee.org/sparql), website/API/downloads | Gene, anatomy, developmental-stage, and taxon identifiers |
| [STRING](https://string-db.org/) | Protein association networks | [SPARQL](https://sparql.string-db.org/sparql), API/downloads | STRING protein identifiers and mapped protein accessions |

## Identifier and reference bridges

| Source | Scientific role | Candidate starting points | Identifier or vocabulary anchors |
| --- | --- | --- | --- |
| [Identifiers.org](https://identifiers.org/) | Registry and resolution of life-science identifiers | [SPARQL](https://sparql.api.identifiers.org/sparql), resolver/API | compact identifiers, namespaces, provider records |
| [Bioregistry](https://bioregistry.io/) | Registry mappings and prefix normalization | [SPARQL](https://bioregistry.io/sparql), website/API | prefixes, collections, provider mappings |
| [Wikidata](https://www.wikidata.org/) | Broad cross-domain identifier bridge | [Wikidata Query Service](https://query.wikidata.org/sparql), [QLever Wikidata](https://qlever.cs.uni-freiburg.de/api/wikidata) | Q-identifiers, properties, external identifiers; services are distinct projections/runtimes |
| [MeSH RDF](https://id.nlm.nih.gov/mesh/) | Biomedical subject headings and hierarchy | [SPARQL](https://id.nlm.nih.gov/mesh/sparql), RDF browser/downloads | MeSH descriptors, concepts, qualifiers, and tree numbers |

## Specialized and operationally variable sources

| Source | Scientific role | Candidate starting points | Identifier or vocabulary anchors |
| --- | --- | --- | --- |
| [GlyConnect](https://glyconnect.expasy.org/) | Glycoproteins, glycosylation sites, and glycans | [SPARQL](https://glyconnect.expasy.org/sparql), website/API | GlyConnect and glycan identifiers; protein cross-references |
| [Allie](https://allie.dbcls.jp/) | Biomedical abbreviation and long-form relations | [SPARQL](https://data.allie.dbcls.jp/sparql), website | Allie terms and publication references |
| [NIBB RDF portal](http://sparql.nibb.ac.jp/) | Japanese life-science linked-data collections | [SPARQL](http://sparql.nibb.ac.jp/sparql) | Dataset-specific identifiers and vocabularies |
| [EPO linked data](https://data.epo.org/linked-data/) | Patent publications and bibliographic relations | [query endpoint](https://data.epo.org/linked-data/query) | publication, applicant, inventor, and classification identifiers |
| [European Environment Agency semantic data](https://semantic.eea.europa.eu/) | Environmental observations and reference data | [SPARQL](https://semantic.eea.europa.eu/sparql) | EEA dataset-specific IRIs and vocabularies |
| METRIN-KG / historical BioSODA EMI | Biomedical knowledge-graph research service | Discover current project documentation before use; the historical endpoint was `https://biosoda.unil.ch/emi/sparql` | Dataset-specific IRIs; treat migration and availability as unresolved until verified |

## Seed provenance

The initial terrain comes from the endpoint corpus discussed in the attached real-world life-science federation study and its [companion query repository](https://github.com/sib-swiss/fed-survey-results). It is intentionally a starting map rather than a frozen inventory. Source-owned documentation and live, bounded receipts establish the current operational truth.
