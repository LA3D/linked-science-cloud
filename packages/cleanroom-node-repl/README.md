# Linked Science clean-room Node REPL

> **Production ownership:** This package is owned by the Linked Science repository. Its source history was imported without squashing from the experimental network-probe repository. Production configuration must use this package and must never depend on that sibling checkout.

This dependency-free package contains the clean-room execution boundary:

1. A clean-room MCP implementing the observed `js`, `js_reset`, and `js_add_node_module_dir` contract of Desktop's persistent Node REPL.
2. A parent-owned Linked Science capability that keeps transport policy and network authority outside the evaluator child.

The clean-room server is an RLM/Prime-style control environment: the model writes JavaScript while large context remains in persistent symbolic state rather than in the prompt. After conditional bootstrap, the stable `linkedScience` object provides composable broker-mediated `resources`, native `rdf`, and Communica `traversal` APIs. The browser-shaped object model and CodeAct-style execution remain useful techniques above the trusted broker, not the defining architecture. `nodeRepl.rlm` supplies structured capability discovery, context registration and slicing, and an optional broker-mediated recursive-call seam; recursion is reported unavailable when no provider is configured. `nodeRepl.peek` supplies a context-scoped, bounded PEEK-compatible orientation map. The token/epoch-bound traversal bridge and ambient Fetch closure are module-private: neither appears on `nodeRepl` or the REPL global.

The parent mediator implements the sole current authority class, `anonymous-linked-data-read`. It accepts dynamically discovered credential-free HTTP/HTTPS public-resource `GET`/`HEAD` and read-only SPARQL POST without an endpoint allowlist, strips ambient identity, enforces resource budgets, and returns per-exchange plus aggregate receipts. `linkedScience.resources` exposes retained response-like representations; `linkedScience.rdf` exposes native dataset composition; consumer-owned Communica privately receives the adapter for RDF source, typed endpoint, and `SERVICE` operations. Platform standard Fetch owns DNS, TLS, sockets, certificates, and redirects.

Named public sources such as UniProt, Wikidata, WikiPathways, and Rhea are examples of that dynamic authority, not configured domains. Bulk distributions such as PubChem dumps require a separate future parent-owned acquisition/import contract with explicit artifact, size, checksum, decompression, and storage bounds; they are not routed through this interactive mediator.

Retrieved content remains untrusted RDF/SPARQL data. It is not automatically promoted into instructions, RLM, PEEK, or evaluator state. Kernel timeout, reset, crash, or replacement aborts all sessions owned by the former capability token and epoch.

Start repository verification from the root with `npm run linked-science:verify`, then perform activation verification in a fresh task opened from this checkout after changing Desktop configuration. The project registration is production-owned and names only this package's MCP entrypoint.

## Offline verification

Run `npm test` and `npm run check`. The suites use standard Fetch against a controlled loopback fixture plus synthetic Fetch, RDF, and SPARQL fixtures; they do not contact an external live source. They cover child isolation, persistence, reset/replacement, module resolution, capability-token IPC, resource budgets, redirect evidence, identity-header stripping, read-only SPARQL parsing, receipts, cancellation, general resource responses, RDF/JS composition, Communica federation, complete RDF document materialization, and the absence of ambient raw Fetch while preserving the exact three MCP tools.

Follow [the clean-room MCP capture](docs/cleanroom-mcp-capture.md) for an activation or diagnostic contract check. Offline verification does not prove an external source is reachable. Ordinary goal-relevant anonymous public reads use the broker defaults; authenticated, sensitive, mutating, bulk, export, and evaluation work remain separately governed.

## Evidence and boundaries

Record the fresh-task status, working directory, capability version, effective traversal budgets, retained-handle metadata, and sanitized per-exchange and aggregate receipts. Never record capability tokens, credentials, cookies, or opaque runtime identifiers.

The clean-room broker scrubs the child environment, starts the child with Node's permission model, grants reads only within the worker root and consumer-owned runtime source, grants no raw network or filesystem-write authority, and supports opt-in, root-constrained PEEK checkpoints. The private parent-owned standard-Fetch mediator is the only live transport seam. It does not invoke a sandbox bypass, change global Codex configuration, install packages, create remotes, or grant unrestricted networking.

Evaluation isolation is enforced separately from transport safety. Evaluator-private paths, reference queries, expected bindings, and contamination honeytokens never cross into this package's worker-visible traversal contract.
