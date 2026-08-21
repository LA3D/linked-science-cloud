# Broker-mediated open-world traversal

## Decision

The clean-room JavaScript kernel remains unable to open raw sockets, perform DNS resolution, or write files. It may ask the consumer-owned parent broker to begin one bounded traversal. Local Communica receives a custom fetch adapter whose every dereference and federated SPARQL request crosses that parent boundary.

The mediator governs behavior rather than endpoint identity. A traversal may follow dynamically discovered public HTTPS RDF resources and SPARQL services without a host allowlist. It cannot contact credential-bearing URLs, private infrastructure, cloud metadata, or mutation-capable routes.

## Cross-process contract

`nodeRepl.linkedScienceTraversal` exposes:

- `capabilities()` — protocol version, read methods/query forms, media types, hard ceilings, and network policy;
- `beginTraversal(effectiveBudgets)` — create a session bound to the current kernel capability token and epoch;
- `request(traversalId, serializedRequest)` — perform one governed HTTPS hop;
- `finishTraversal(traversalId)` — return the aggregate lineage receipt; and
- `abortTraversal(traversalId, reason)` — cancel outstanding work and preserve a bounded partial receipt.

`createFetch(traversalId)` is a child-local adapter around `request`; it grants no direct network authority. Kernel reset, timeout, crash, or replacement aborts all sessions owned by the former token/epoch.

## Network and resource controls

The parent accepts credential-free HTTPS only. It strips ambient identity headers, forces identity content encoding, permits GET/HEAD and parsed read-only SPARQL POST, and accepts only RDF or SPARQL-result media types. All A and AAAA answers must be public. Mixed public/private answers, loopback, private, carrier-grade NAT, link-local, ULA, multicast, unspecified, documentation/reserved ranges, metadata addresses, and within-session DNS answer changes are rejected. The validated address is pinned into the TLS connection while the original hostname remains the SNI and certificate-verification name.

Redirects are manual and every destination repeats URL and DNS validation. Traversal-wide ceilings cover request/query bytes, duration, per-request time, redirects, hops, fan-out, concurrency, per-response bytes, cumulative bytes, and retained result items. The implementation performs zero automatic retries. Response headers are reduced to a small data/provenance allowlist.

Retrieved bytes are untrusted RDF/SPARQL data. They are never promoted into instructions, RLM context, PEEK orientation, or evaluator state. Only the Linked Science runtime may retain a bounded typed result handle after Communica completes and the aggregate receipt validates.

## Federation and provenance

Communica runs locally. RDF source dereferences and `SERVICE` requests both use the same mediated fetch adapter, so federation is not delegated opaquely to a remote endpoint. Each hop records URL, method, status, pinned address, request/response hashes, byte count, media type, and parsed query form when applicable. The aggregate receipt records effective budgets, usage, zero retries, all hops, and terminal status. A receipt proves transport lineage, not a scientific interpretation.

Offline tests cover public/unsafe IPv4 and IPv6 ranges, mixed DNS, rebinding, redirect-to-private, credential/header stripping, SPARQL mutations and malformed bodies, media/content-encoding denial, request/response/cumulative bounds, fan-out, concurrency, timeouts, forged/stale owners, reset cancellation, and partial receipts. Synthetic Communica fixtures cover two RDF sources and two federated SPARQL services without live network access.

## Historical boundary

Earlier immutable endpoint/source profiles, whole-query broker execution, SELECT/ASK-only codecs, blanket `SERVICE` denial, and fixed eight-second assumptions are superseded. Their committed receipts remain immutable historical observations. They do not authorize current traversal and are not current worker guidance.
