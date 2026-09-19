# Identifiers.org: identifier resolution and registry metadata

Use this source to translate identifier URI forms or inspect namespace/provider metadata. It is an identifier bridge, not primary evidence for a protein's biological properties.

## Current discovery and vocabulary

The [official SPARQL documentation](https://docs.identifiers.org/pages/sparql.html) advertises `https://sparql.api.identifiers.org/sparql`. It documents virtual URL resolution using `owl:sameAs`, generated from registry URI patterns. Registry metadata uses VoID, DCAT and `http://identifiers.org/idot/` terms, including `idot:prefix`, `idot:urlPattern`, `idot:isResourceOf` and deprecation attributes. Resolver mappings do not themselves verify that a target URL responds or that an accession has a biological record.

Observed **2026-09-19**: the documentation was fetched through the broker and the query below completed with six bindings, one request, 893 response bytes and no retries. Four bounded example values are recorded, while the complete result remained retained. See the [receipt and provenance](../../artifacts/endpoint-examples/20260919/receipt.json) and [discovery actions](../../artifacts/endpoint-examples/20260919/actions.json). This observation is separate from historical fixed-profile experiments and is not an ongoing availability guarantee.

## Reusable example

Purpose: retrieve URI forms associated with one UniProt URI. The accession and query pattern come from the official documentation. This is a narrowly selected complete result, without a display-driven SPARQL limit.

```js
var idWs = linkedScience.open({ contextKey: 'identifier-resolution' });
var idResult = await idWs.traversal.query({
  sources: [{ type: 'sparql', value: 'https://sparql.api.identifiers.org/sparql' }],
  sparql: `PREFIX owl: <http://www.w3.org/2002/07/owl#>
    SELECT ?uri WHERE {
      <http://purl.uniprot.org/uniprot/P12345> owl:sameAs ?uri
    }`,
});
// Keep complete bindings behind the handle; display only a bounded projection.
nodeRepl.write(await idWs.results.page(idResult, { limit: 6 }));
```

Use the existing mediator defaults for anonymous public reads. Keep input identifiers bound; an unrestricted virtual-resolution query is not this example's scope. Federation causes additional reads and must retain its own scope and receipts. Authentication, mutation, bulk ingestion and exports require their appropriate authority. No endpoint allowlist, new MCP server or legacy `guarded-sparql-transport` profile is needed. Rediscover the current source documentation when a query fails; an unavailable route or empty answer does not establish global absence.
