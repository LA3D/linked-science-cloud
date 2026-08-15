# Identifiers.org read-only navigation trial

Scope: one public compact identifier, `taxonomy:9606`, using only the Identifiers.org resolver and registry APIs. No SPARQL query, remote endpoint other than Identifiers.org, private data, or mutation-capable operation was used.

| Route | Exact request fingerprint | Purpose | Outcome |
| --- | --- | --- | --- |
| Resolver | `GET https://resolver.api.identifiers.org/taxonomy:9606` | Resolve the compact identifier to candidate provider resources. | Blocked before HTTP: Node REPL `fetch` failed with `ENOTFOUND resolver.api.identifiers.org`. |
| Registry | `GET https://registry.api.identifiers.org/restApi/namespaces/search/findByPrefix?prefix=taxonomy` | Retrieve exact-prefix namespace metadata, separately from resolution. | Blocked before HTTP: Node REPL `fetch` failed with `ENOTFOUND registry.api.identifiers.org`. |

## Request controls

- Persistent Node REPL only; explicit HTTPS `GET`, `Accept: application/json`, `redirect: 'error'`, and `AbortSignal.timeout(8000)`.
- Host allowlist: `resolver.api.identifiers.org`, `registry.api.identifiers.org`.
- No request body, HTTP POST, SPARQL query, SPARQL UPDATE, registration, or other state-changing route.

## Result and limitation

The route distinction was encoded and the two transport attempts were bounded, but the Node REPL could not resolve either public hostname. Therefore there is no live resolver result, registry result, provider URL, or SPARQL result to claim. The trial stops here; do not substitute another endpoint or runtime without explicit approval.
