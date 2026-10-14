# Follow-up: audit and root-cause diagnosis

This follow-up supersedes the initial report's unresolved HTTP-error diagnosis. **The published federation reaches UniProt, whose remote SERVICE request to Bgee receives HTTP 403 with a challenge page.** Independent curl reproduces the failure and preserves the full coordinator error. A separate attempt to execute federation locally uncovered broker/planner lifecycle failures; those are distinct from the original server-side 403.

## Audit the agent's work first

`query-extraction-audit.json` verifies that the decoded `example48` span and the official example 49 “Use” link contain identical query strings. The original REPL query is that string, SHA-256 `4f5509de3eeef2212ae508bac6e65829eea09598cd6c2c359aad465bf49fd526`. `original-exact.rq` contains those exact bytes; ordinary `.rq` artifacts add a final newline only. All original prefixes, SERVICE endpoint spellings, variables, scopes and patterns were preserved. There are no original subqueries, VALUES, version stripping or LIMIT clauses.

Every subsequent query is saved, and `query-diffs.txt` compares each with the original. The cholesterol revision changes the chemical class and introduces a versioned source variable plus anchored version stripping. The bounded query introduces evidence-derived protein/reaction/gene VALUES within their respective SERVICE blocks. The final subselect test wraps each SERVICE body in a SELECT, projects every shared join variable and changes subclass traversal to exact CHEBI:16113 membership for that fixed reaction. These are explicitly scoped diagnostics, not verbatim example 49.

Two agent assumptions needed correction:

- The user's cholesterol question does not match the currently published chemical constant. Source labels show N-acylsphingosine for CHEBI:52639 and cholesterol for CHEBI:16113.
- A single UniProt source supplied to Comunica did not force local SERVICE execution. The receipt shows one POST to UniProt: the whole query was delegated. Later multi-source tests are the ones that actually contacted the services separately.

Neither correction explains the initial failure of the unchanged query: that failure is reproduced independently below.

## Exact failure and network hop

The full coordinator error is in `curl-diagnostic/original-network-body.txt`; its extracted exception is in `original-network-exception.json`:

> Error while executing a SERVICE request to <https://www.bgee.org:443/sparql/>: SERVICE responded with HTTP status code: 403, Forbidden. First 100 bytes of the response: '<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Typ'

The observed path is:

`REPL broker or curl → UniProt coordinator → Bgee public SERVICE endpoint → 403 challenge → UniProt HTTP 400`

UniProt's returned runtime plan contains QLever internal-variable and operation names. Thus the server-side plan is QLever-style; the local native traversal uses Comunica. For the exact GET, no local Comunica rewriting was involved. Port 443 in the error is the server's normalized HTTPS authority, not an agent-invented endpoint change.

The original REPL attempt received 400 in 1.599 s; curl received 400 in 1.259 s. Both had 90,112-byte HTML responses, with different hashes because they are separate exchanges. Curl had zero redirects. It used the same query, coordinator route, GET method, `Accept: application/sparql-results+json`, `Accept-Encoding: identity` and `User-Agent: LinkedScience/1.0`, without credentials or cookies. URL percent-encoding and transport fingerprints can differ; no byte-identical transport claim is made. The first restricted-shell curl failed DNS before HTTP; only the subsequent authorized network-enabled call is used in this comparison.

This is an endpoint-returned error, not a broker deadline, data absence or query-parser rejection. The body identifies a downstream access challenge. The exact protection rule, deployment date, upstream client method and headers, and whether IP reputation or a request feature triggers it remain unknown. The challenge text is consistent with an anti-bot edge response; the coordinator error does not expose Bgee's response headers, so it does not independently identify the edge vendor.

## Minimal, direct and alternate-coordinator checks

| Test | REPL | Independent curl |
|---|---|---|
| Published exact federation | UniProt 400 | UniProt 400 with downstream Bgee 403 exception |
| Minimal Bgee SERVICE through UniProt | 400 | 400, zero-byte body, `queryid: -404` |
| Fixed verified gene Bgee SERVICE through UniProt | 400 | 400, zero-byte body, `queryid: -404` |
| Direct Bgee query with versioned and unversioned ENSG00000180316 | 246 rows | 200, 246 rows |
| Bgee as coordinator for bounded three-service query | 500 | 500 with explicit Virtuoso permission error |

Minimal tests were repeated using the published trailing-slash route without the extra `format=json` parameter; they still returned empty-body 400s. Their specific cause cannot be read from empty bodies and is not automatically assumed identical to the full query. The unchanged full query's detailed exception is the decisive hop evidence.

Bgee's alternate-coordinator error is:

> Virtuoso RDF02 Error SR619: SPARUL LOAD SERVICE DATA access denied: database user 107 (SPARQL) has no write permission on graph https://sparql.uniprot.org/sparql

The submitted operation was SELECT. This is Virtuoso's SERVICE machinery reporting a server permission requirement, not an attempted agent SPARQL Update. Moving the coordinator to Bgee is therefore not a verified workaround.

## Separate local runtime findings

The bounded multi-source Comunica tests genuinely made exchanges with the component services:

1. Default limits failed with `Traversal concurrency bound is exhausted` (4.423 s).
2. One explicit retry at the supported concurrency ceiling of six, still with the 16-request bound, failed with `Traversal request bound is exhausted` (10.031 s). These are real broker budget failures of the local plan, unlike the original UniProt HTTP error.
3. An exact-cholesterol, fixed-identifier subselect revision failed with `Traversal has active requests` (12.850 s). Its completed exchanges included successful UniProt, Rhea and Bgee responses, but no successful result handle was returned.

Source inspection supports a lifecycle race as a concrete defect candidate: `lib/linked-science-runtime.mjs` calls `finishTraversal` after collecting the result stream, without an explicit quiescence/drain step; `packages/cleanroom-node-repl/src/mediated-traversal.mjs` rejects finalization when `session.active !== 0`. The observation proves the busy-finalization failure. It does not yet identify whether remaining traffic is planner metadata, prefetch, or another operation. No complete result is claimed, and no unsafe receipt finalization or bounds bypass was attempted.

## Endpoint history and migration hypothesis

The [official Bgee tutorial](https://www.bgee.org/support/tutorial-query-bgee-knowledge-graph-sparql) still advertises `https://www.bgee.org/sparql/` for the latest dataset and a separate versioned route for archives. Current web-index evidence supplied that text; direct broker reads of the tutorial and news page returned 403. The [official application repository](https://github.com/BgeeDB/bgee_apps) describes latest-versus-archive routing, not a replacement for the current public endpoint. Ten recent default-branch commits were retrieved via GitHub API and saved, spanning April 2025–February 2026; their messages do not document this access change. This is a bounded check, not an exhaustive history audit.

No endpoint migration or recent policy-change date was verified. Continued direct-query success and current documentation support using the published endpoint. A recent edge-policy change is a plausible hypothesis, not an observed historical fact. Do not substitute an archive endpoint: that would change dataset/version semantics.

## Smallest justified next action and demo status

For server-side example 49, the smallest justified remedy is for the service operators to inspect and correct the Bgee access challenge applied to legitimate UniProt federation requests. Changing the SELECT syntax, increasing our broker timeout or normalizing gene IDs cannot repair that network hop. No operator message or configuration change was made.

For a local client alternative, a focused runtime fix would need to coordinate outstanding mediated requests with query completion/abort and preserve complete-or-fail receipts; planner fan-out must remain within explicit limits. Merely ignoring `MEDIATOR_TRAVERSAL_BUSY`, increasing all bounds, or returning a partial handle is not justified. That code change and its tests are outside this diagnosis and have not been applied.

The cholesterol constant and Ensembl version normalization remain necessary scientific corrections independently of access. **No tested three-service variant produced a complete successful federated result.** The saved component data are useful evidence, but they do not certify a live full-federation demo. Full raw curl errors, headers, timings, exact queries and local failure receipts make both defects reproducible.
