# Broker-mediated anonymous Linked Data reads

## Decision

The clean-room JavaScript kernel has no ambient raw networking or filesystem-write authority. The sole current live authority class is `anonymous-linked-data-read` version 1.0.0. It permits dynamically discovered credential-free HTTP and HTTPS reads: ordinary Linked Data GET/HEAD requests and Communica-generated read-only SPARQL POST for `SELECT`, `ASK`, `CONSTRUCT`, and `DESCRIBE`. It does not authorize authenticated/private authority, arbitrary POST, SPARQL Update, writes, or authority expansion.

Authority describes effects, not endpoint identities. There is no source allowlist or semantic profile. Private/local, authenticated, and mutating authority classes remain explicit future decisions.

## Public semantic surface

The MCP surface remains exactly `js`, `js_reset`, and `js_add_node_module_dir`. The Linked Science workspace keeps its single `workspace.traversal.query` operation. It uses a consumer-owned Communica `QueryEngine` and returns handles retaining native RDF/JS bindings, quad streams materialized within bounds, or booleans. No document-fetch MCP tool, `workspace.documents` method, or parallel graph/dataset model exists.

An RDF document, ontology, service description, or VoID graph is acquired through standard Communica source and query primitives. For example, a bounded `CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }` over an RDF document materializes its quad stream into the existing N3 `Store`, an RDF/JS `DatasetCore`, behind the native quad-result handle. Typed SPARQL sources, heterogeneous sources, and `SERVICE` use the same path. Complete means complete within the effective byte and quad/item ceilings; exceeding either is an attributable bounded failure.

The same operation accepts bounded `accept`, `acceptProfile`, and `prefer` representation-negotiation values on an initial document source. They become ordinary identity-free headers only for that source request; they are not copied to typed SPARQL sources, `SERVICE` calls, remote contexts, or unrelated discovered resources. The final response preserves full `Content-Type` parameters, `Content-Profile`, `Preference-Applied`, and RFC 8288 `Link` values for both parser behavior and provenance.

## Private cross-process authority

The parent owns standard Fetch. The child contains a token/epoch-bound serialized bridge, but that bridge and its Fetch closure are registered in module-private state. They are absent from `nodeRepl`, the REPL global, query context returned to the agent, capabilities tokens, and MCP tools. Only the consumer-owned bootstrap can install the private closure into its private Communica query context.

The private lifecycle remains `beginTraversal`, mediated requests, receipt snapshots, and `finishTraversal`/`abortTraversal`. A workspace exposes that as an optional goal-attached exploration: `traversal.begin`, any number of evidence-driven `traversal.query` decisions, then `status`, `finish`, or `abort`. Requests, distinct sources, bytes, elapsed time, and retained result items consume one cumulative budget scope. The traversal-wide wall-clock default is five minutes with a fifteen-minute hard ceiling, while each request remains independently capped at twenty seconds by default and thirty seconds at most. A query remains a one-shot traversal when no exploration is active. Sessions bind to the current kernel capability token and epoch and expire on finish, abort, duration, reset, crash, or child replacement. This is evidence/accounting state attached to the Codex goal, not a competing task state machine.

## Transport and operational controls

The parent uses the platform standards-based Fetch implementation. DNS, socket selection, TLS, certificate verification, and redirect execution remain platform behavior. The former custom `dns.lookup`, answer-set stability, HTTPS Agent, socket pinning, and TLS callback machinery were removed after the first neutral live preflight exposed a Node connector-shape defect. The immutable failed receipt remains historical evidence; it was not rewritten.

The thin wrapper enforces only the authority and accounting properties above Communica and Fetch:

- HTTP/HTTPS schemes, no URL credentials, GET/HEAD, and parsed read-only SPARQL POST only;
- removal of cookie, authorization, proxy-authorization, origin/referrer, and forwarding identity headers;
- identity content encoding, request and traversal deadlines, cancellation, no retries, concurrency, request count, distinct-source fan-out, request/query bytes, per-response decoded bytes, cumulative decoded bytes, and retained item bounds;
- a response-header allowlist plus representation media type, body hash, byte count, requested URL, final URL, status, and the standard `redirected` flag; and
- per-exchange receipts plus an aggregate lineage receipt.

Each completed exchange also contains a bounded `linked-data-navigation-evidence` observation. RFC 8288 links are parsed, relative targets are resolved against the final response URL, relation types and bounded parameters are retained, and profile declarations retain both their mechanism and declaring response. `workspace.results.profile(handle).provenance.navigation` projects those observations after success; `error.receipt.navigation` projects them after parsing or query failure. Candidates are `advertised-untried`: meaningful source evidence but not proof of availability or content. Semantically relevant relations are retained before generic links when the projection bound is reached. They carry no instruction authority and are never followed or promoted automatically. An agent may use relation semantics and its current information gap to justify a subsequent request within the same cumulative exploration.

Standard Fetch does not expose every intermediate redirect hop. Receipts state that limitation as `requested-final-and-redirected-flag`; the runtime does not rebuild a redirect engine to manufacture unavailable evidence. HTTP errors, non-RDF content, negotiation failures, malformed RDF, timeouts, and oversize representations remain attributable outcomes. Communica, rather than the transport wrapper, decides whether a representation satisfies the requested RDF/query operation.

## Symbolic and epistemic boundary

Retrieved bytes are untrusted data. They never become instructions, raw model tokens, RLM context, PEEK orientation, skills, wiki memory, or evaluator state automatically. Successful Communica operations retain native RDF/JS values behind epoch-bound handles. Bounded profile/page/neighborhood projections are explicit subsequent operations. A receipt proves transport and result lineage, not a scientific interpretation.

## Verification and next gate

Offline coverage uses the actual platform Fetch with a controlled loopback HTTP fixture, plus controlled Fetch fixtures for failure accounting. Communica coverage includes HTTP/HTTPS source descriptors, content negotiation, complete RDF document materialization, two-source federation, typed SPARQL sources, `SERVICE`, all four read query forms, limits, cancellation/reset, native handles, and no automatic PEEK projection. Boundary tests assert exactly three MCP tools, no raw Fetch/Response/bridge, blocked direct network-module imports, and no sibling experimental-repository dependency.

A Desktop restart and a separately authorized single live neutral preflight are required before claiming the current transport works on public infrastructure. No competency baseline is authorized by offline verification.

## Historical boundary

Earlier immutable endpoint/source profiles, whole-query broker execution, SELECT/ASK-only codecs, blanket `SERVICE` denial, fixed eight-second assumptions, DNS-pinned HTTPS, and the failed preflight receipt remain historical records only. They are not current runtime policy or worker guidance.
