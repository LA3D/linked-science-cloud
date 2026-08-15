# UniProt schema-discovery experiment

## Question

Can a worker retrieve primary UniProt schema documentation into its persistent REPL, derive a compact schema view, and use that view to make a bounded navigation plan without first probing the data endpoint?

## Approved documentation boundary

The `uniprotRdfSchema` documentation profile permits exactly one source:

`https://purl.uniprot.org/html/index-en.html`

It is the canonical rendered form reached from the UniProt RDF ontology IRI. Retrieval is GET-only, HTTPS-only, redirect-free, response-type restricted to HTML, capped at 2 MB, timed out at eight seconds, and recorded with byte length and SHA-256. It does not authorize arbitrary web pages, downloads, provider URLs, REST APIs, or SPARQL execution.

## Proposed REPL procedure

1. Satisfy persistent-REPL preflight.
2. Use `createGuardedDocumentationFetch` and `uniprotRdfSchema` to retrieve the source once.
3. Keep the full source text resident only in the REPL; retain a compact view with source URL, hash, byte length, known term names, and operation ID in the context map.
4. Derive the navigation path `up:Protein → up:annotation → up:catalyticActivity` from the retrieved schema view and create an affordance plan. Do not run SPARQL.
5. In a second REPL call, reuse the retained schema view and plan; report the cited operation IDs and a compact explanation.

## Pass criteria

The trace must show a real persistent-JS-REPL preflight; one guarded documentation request with canonical provenance; a compact resident schema view; a plan whose prefixes and terms correspond to that view; a second-call reuse proof; no data endpoint query; and no raw schema dump into coordinator context.

## Recorded result — 2026-08-15

The first trial passed the stated boundary and retention checks.

- Persistent-REPL preflight operation `schema-repl-preflight-1` resolved local Communica and began with no schema session or map binding.
- Guarded documentation operation `schema-document-fetch-1` made exactly one HTTPS GET to the pinned canonical page. It observed `text/html`, 501,448 bytes, and SHA-256 `12235b4c56c5b36642bc2816adbd3ced6b49a71251e29ae8721fe575b103c998`.
- The full HTML remained in the REPL as `uniprot-rdf-schema-html`; it was not returned to coordinator context. A compact view observed exact-IRI occurrences for `up:Protein` (48), `up:annotation` (5), and `up:catalyticActivity` (5), and recorded the documentation-backed conceptual path `up:Protein → up:annotation → ?annotation → up:catalyticActivity → ?catalyticActivity`.
- A non-executing plan cited the source handle and documentation operation. Second-call operation `schema-view-reuse-2` reused the same resident document, with one of one documentation-request budget consumed and zero data requests.

No SPARQL/data endpoint, file, package, or configuration operation occurred. The term occurrences support documentation-guided planning only; they do not establish data-level triples or authorize later endpoint execution.

## Limits

The rendered page is primary documentation but not an RDF download. This experiment demonstrates documentation-guided planning, not complete ontology ingestion, semantic reasoner behavior, or successful data retrieval. A later resource pack may use RDF/OWL/Turtle only after a separately reviewed content-type and source profile is added.
