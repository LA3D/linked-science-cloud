# Bounded Rhea diagnostic

The evidence supports a restriction on the Rhea website route rather than a REPL-only failure. An equivalent anonymous curl GET also returned 403 and explicitly identified a Cloudflare challenge. Rhea's documented SPARQL service subsequently worked through the actual project REPL. No infrastructure was changed.

| Observation | Project broker | Independent curl |
|---|---|---|
| Request | GET `https://www.rhea-db.org/rhea/21112/rdf` | Same URL and method |
| Accept | `application/rdf+xml` | Same |
| Other normalized headers | `accept-encoding: identity`, `user-agent: LinkedScience/1.0` | Same |
| Redirect | Follow enabled; final URL unchanged; redirected false | Follow enabled; final URL unchanged; zero redirects |
| Result | HTTP 403, HTML, 5,576 bytes | HTTP 403, HTML, 5,533 bytes |
| Edge evidence | Safe receipt omits edge-specific headers; failed body not materialized | `server: cloudflare`, `cf-mitigated: challenge`; HTML asks for JavaScript/cookies |

The reconstructed broker request hashes to `77bead3a61d2462e03bc9ec6eb3427594b0c65737da2220ab32099cf24244caf`, exactly matching the original receipt. This verifies the normalized request fields, not transport-added headers or TLS fingerprint equivalence. Curl used HTTP/2 and no proxy; the comparison was at different times and its challenge body hash differs. No credentials, cookies, challenge solver or browser impersonation were used.

The first curl attempt in the restricted shell failed DNS resolution (exit 6), so it supplied no HTTP comparison. The explicitly authorized network-enabled retry produced the HTTP evidence above. Raw curl headers/body/metadata and the equivalent replay command are retained here. Broker failure receipts, the documentation artifact and the complete four-row native query result with provenance are in `receipt.json`.

## Documented scientific interface

The broker also received 403 from the website homepage. It successfully retrieved the [official Rhea SPARQL page](https://sparql.rhea-db.org/), whose examples document the `/sparql/` endpoint, `rh:equation`, and participant paths through `rh:side/rh:contains/rh:compound` and ChEBI predicates. That source documentation was inspected before constructing `reaction.rq`.

The actual project REPL queried `https://sparql.rhea-db.org/sparql/` for `http://rdf.rhea-db.org/21112`, the identifier already obtained from UniProt. It returned four complete rows (native handle `h-000019` in the extension workspace): Gb3Cer CHEBI:18313, water CHEBI:15377, lactosylceramide CHEBI:17950 and D-galactose CHEBI:4139. The equation relates Gb3Cer plus water to lactosylceramide plus D-galactose. This is now independently retrieved Rhea query evidence, in addition to the earlier UniProt and Reactome annotations. The query returns participants, not directional roles; its equation supplies the displayed reaction sides.

## Calibrated conclusion

- A REPL-specific 403 is not supported: an independent client received the same status on the same website route, and the documented Rhea SPARQL endpoint works inside the REPL.
- A Cloudflare challenge is directly established for curl. The corresponding broker failure is consistent with that restriction, but its exact edge response cannot be proven from the retained safe headers alone.
- Whether `/rhea/21112/rdf` is a valid RDF representation route remains unknown behind the challenge. The initial guessed route should not be promoted to a documented interface or diagnosed as invalid solely from 403.

The diagnostic stops here. There were no retries aimed at overcoming the challenge and no runtime fixes.
