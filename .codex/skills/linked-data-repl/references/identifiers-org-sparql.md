# Identifiers.org registry SPARQL profile

Endpoint profile: `https://sparql.api.identifiers.org/sparql`.

Use `idot: <http://identifiers.org/idot/>` with DCAT. A namespace is a `dcat:Dataset` and `idot:Namespace`; the UniProt lookup predicate is `idot:prefix "uniprot"`. A resource is a `dcat:DataService` and `idot:Resource`, linked with `dcat:servesDataset`; useful fields include `idot:mirid`, `idot:providerCode`, and `idot:urlPattern`.

The local guard permits only a single bounded read query and rejects `SERVICE`, update forms, redirects, other paths/hosts, and unbounded results. Use `scripts/identifiers-org-uniprot.mjs` as the maintained example.
