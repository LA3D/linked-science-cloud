---
{
  "schemaVersion": "1.0.0",
  "id": "uniprot-named-graphs-20260920",
  "title": "UniProt named graph catalog and schema identity (2026-09-20)",
  "lessonKind": "scientific-finding",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "The captured UniProt service description advertises these named graphs and triple counts (metadata, not measured remote contents): http://purl.uniprot.org/core = 2835; http://sparql.uniprot.org/chebi = 3426039; http://sparql.uniprot.org/citationmapping = 244587074; http://sparql.uniprot.org/citations = 30730282; http://sparql.uniprot.org/database = 2407; http://sparql.uniprot.org/diseases = 91009; http://sparql.uniprot.org/enzymes = 156569; http://sparql.uniprot.org/go = 655968; http://sparql.uniprot.org/journal = 43700; http://sparql.uniprot.org/keywords = 11752; http://sparql.uniprot.org/locations = 6314; http://sparql.uniprot.org/obsolete = 2504600781; http://sparql.uniprot.org/pathways = 12363; http://sparql.uniprot.org/proteomes = 44980518; http://sparql.uniprot.org/taxonomy = 70047936; http://sparql.uniprot.org/tissues = 4115; http://sparql.uniprot.org/uniparc = 198735586260; http://sparql.uniprot.org/uniprot = 37329393214; http://sparql.uniprot.org/uniref = 5375029833; https://sparql.rhea-db.org/rhea = 2053334; https://sparql.uniprot.org/.well-known/sparql-examples = 1405. The core graph IRI has no trailing slash; vocabulary terms use http://purl.uniprot.org/core/. Official catalog: https://sparql.uniprot.org/.well-known/void .",
  "applicability": "UniProt endpoint discovery. A graph IRI identifies a dataset partition, not automatically statement-level provenance or a dereferenceable document. Retain exact IRIs; HTTP and HTTPS are not interchangeable graph names.",
  "competingExplanations": [
    "Published metadata may lag actual endpoint contents; this capture does not independently count remote triples."
  ],
  "missingEvidence": [
    "No independent transfer or counterexample evaluation.",
    "Complete core schema extraction and relation-specific inference not established."
  ],
  "revalidateWhen": "Recheck source release, exact graph IRIs, and runtime API before operational reuse.",
  "citations": [
    {
      "corpus": {
        "path": "artifacts/wiki-learning/corpus/uniprot-discovery-20260920-capture.json",
        "sha256": "7760e4206fcda2f35dc83503864f94753f9b2deeb582108fe5f90f0736a1a6ec",
        "hashDomain": "file-bytes",
        "pointer": ""
      },
      "unitId": "catalog",
      "eventIds": [
        "event-2",
        "event-3",
        "event-4"
      ],
      "evidenceIds": [
        "service",
        "catalog-query"
      ],
      "operationIds": [
        "op-000003"
      ]
    }
  ],
  "relations": {
    "supersedes": [],
    "contradicts": []
  }
}
---
# UniProt named graph catalog and schema identity (2026-09-20)

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

The captured UniProt service description advertises these named graphs and triple counts (metadata, not measured remote contents): http://purl.uniprot.org/core = 2835; http://sparql.uniprot.org/chebi = 3426039; http://sparql.uniprot.org/citationmapping = 244587074; http://sparql.uniprot.org/citations = 30730282; http://sparql.uniprot.org/database = 2407; http://sparql.uniprot.org/diseases = 91009; http://sparql.uniprot.org/enzymes = 156569; http://sparql.uniprot.org/go = 655968; http://sparql.uniprot.org/journal = 43700; http://sparql.uniprot.org/keywords = 11752; http://sparql.uniprot.org/locations = 6314; http://sparql.uniprot.org/obsolete = 2504600781; http://sparql.uniprot.org/pathways = 12363; http://sparql.uniprot.org/proteomes = 44980518; http://sparql.uniprot.org/taxonomy = 70047936; http://sparql.uniprot.org/tissues = 4115; http://sparql.uniprot.org/uniparc = 198735586260; http://sparql.uniprot.org/uniprot = 37329393214; http://sparql.uniprot.org/uniref = 5375029833; https://sparql.rhea-db.org/rhea = 2053334; https://sparql.uniprot.org/.well-known/sparql-examples = 1405. The core graph IRI has no trailing slash; vocabulary terms use http://purl.uniprot.org/core/. Official catalog: https://sparql.uniprot.org/.well-known/void .

## Applicability

UniProt endpoint discovery. A graph IRI identifies a dataset partition, not automatically statement-level provenance or a dereferenceable document. Retain exact IRIs; HTTP and HTTPS are not interchangeable graph names.

## Competing explanations

- Published metadata may lag actual endpoint contents; this capture does not independently count remote triples.

## Missing evidence

- No independent transfer or counterexample evaluation.
- Complete core schema extraction and relation-specific inference not established.

## Revalidation

Recheck source release, exact graph IRIs, and runtime API before operational reuse.

## Evidence

- Corpus: artifacts/wiki-learning/corpus/uniprot-discovery-20260920-capture.json (SHA-256 7760e4206fcda2f35dc83503864f94753f9b2deeb582108fe5f90f0736a1a6ec); unit: catalog; events: event-2, event-3, event-4; evidence: service, catalog-query; operations: op-000003.
