# WikiPathways: pathway metadata and graph relationships

Use this source for community-curated pathway metadata, pathway membership and database cross-reference relationships. Keep the pathway revision and source identifier when relating results to other resources.

## Current discovery and vocabulary

The [official SPARQL guide](https://www.wikipathways.org/sparql.html) advertises [the endpoint interface](https://sparql.wikipathways.org/) and provides query examples. The existing `/sparql` query route was verified live below. Useful vocabulary includes `wp:Pathway`, `wp:GeneProduct`, `wp:organismName`, `dcterms:isPartOf`, `dcterms:identifier` and `dc:title`; the WP prefix is `http://vocabularies.wikipathways.org/wp#`. The guide distinguishes RDF pathway identifiers, identifiers.org links and loaded revisions.

The guide currently warns about string-literal compatibility between its RDF output and endpoint, advising removal of an explicit `^^xsd:string` suffix. Treat this as source guidance, not an independently established server-version claim. Include prefixes explicitly when using a programmatic client; web-interface defaults are not portable query syntax.

Observed **2026-09-19**: the official guide was fetched through the broker; the query below completed with one binding, one request, 402 response bytes and no retries. It returned `https://identifiers.org/wikipathways/WP1560_r116839`, title **MicroRNAs in cardiomyocyte hypertrophy**, organism **Mus musculus**. See the [receipt and provenance](../../artifacts/endpoint-examples/20260919/receipt.json) and [discovery actions](../../artifacts/endpoint-examples/20260919/actions.json). This is a dated observation, separate from historical fixed-profile experiments, and does not establish coverage of every pathway or entity.

## Reusable example

Purpose: inspect title and organism for one pathway identifier used in the official guide. The query's identifier restriction defines its scope; it does not use a display-driven SPARQL limit.

```js
var wpWs = linkedScience.open({ contextKey: 'pathway-metadata' });
var wpResult = await wpWs.traversal.query({
  sources: [{ type: 'sparql', value: 'https://sparql.wikipathways.org/sparql' }],
  sparql: `PREFIX wp: <http://vocabularies.wikipathways.org/wp#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX dc: <http://purl.org/dc/elements/1.1/>
    SELECT DISTINCT ?pathway ?title ?organism WHERE {
      ?pathway a wp:Pathway ;
        dcterms:identifier "WP1560" ;
        dc:title ?title ;
        wp:organismName ?organism .
    }`,
});
nodeRepl.write(await wpWs.results.page(wpResult, { limit: 4 }));
```

Use the existing broker for anonymous public reads with its request, time, byte and result bounds. Retain native results for subsequent joins. Cross-reference IRIs are links, not proof that a second database has been contacted or agrees with an assertion. Authenticated access, mutations, bulk downloads and exports need their appropriate authority. This example adds no endpoint allowlist or MCP registration and does not reactivate historical transport helpers. An empty result or unavailable route is scoped evidence only.
