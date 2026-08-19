# CodeAct Linked Science runtime

## Decision

Linked Science v1 uses persistent model-written JavaScript as its primary action space. `lib/linked-science-runtime.mjs` injects one stable `linkedScience` facade (with the short alias `ls`) into the persistent Node JavaScript global object. Communica remains the RDF/SPARQL query kernel behind the facade; the agent receives graph, query, derivation, inspection, orientation, and recovery affordances rather than a set of fixed scientific-domain tools.

The one-time bootstrap, generated documentation, machine schema, conditional lookup, examples, stable globals, and explicit reset follow the public adapter shape described in [runtime discovery](../agent/runtime-discovery.md). This repository does not imitate a private Browser or Chrome bridge.

## Runtime shape

`setupLinkedScience({ nodeRepl, ... })` is idempotent for one global object. It installs non-writable `linkedScience` and `ls` properties and returns the same frozen facade on a repeated setup call. `open({ contextKey })` returns a stable workspace for the current context epoch.

The facade exposes generated documentation, capabilities, examples, context open/reset, and a compatibility namespace for the existing guarded query/evidence and legacy profile/page/table primitives. Compatibility access does not grant endpoint approval or alter the guards.

A workspace owns private Communica state and opaque retained handles. It supports:

- local ontology, schema, SHACL, inferred-graph, and instance-data graph materialization;
- bounded schema search and RDF-neighborhood inspection;
- bounded local `SELECT`, `ASK`, `CONSTRUCT`, and `DESCRIBE` through Communica;
- one generic `results.derive(handle, callback)` for model-written JavaScript transformations;
- bounded profiles, pages, and tables with lineage, operation IDs, source fingerprints, and provenance; and
- explicit PEEK orientation bootstrap/current/commit/status operations.

Recursion and model-provider calls are outside v1.

## Handles and epochs

Handles are frozen branded tokens carrying only an ID, type, label, and runtime epoch. RDF/JS values remain in a private registry. Graphs retain their input quad array, including ordering and duplicates; bindings retain variable terms and RDF value terms. IRIs, datatypes, language tags, blank nodes, and named graphs are not flattened to strings in resident state.

Every operation records an operation ID. Graphs receive an ordered, duplicate-aware fingerprint. Query and derived results retain source fingerprints, source handles, query or callback hashes, and lineage.

Reset advances the context epoch, destroys the workspace registry, and retains only its compact orientation map. A handle from another epoch produces a recovery-shaped `LS_STALE_HANDLE` error. Restoring an orientation checkpoint in a recreated runtime makes the map usable but leaves every referenced old handle stale until explicitly rematerialized.

## Bounds and observation contract

Resident graphs and results have hard item ceilings. Prompt-visible pages/tables are bounded by rows, cells, and bytes. Neighborhoods are bounded by nodes, edges, and bytes. Schema search is bounded by hits and bytes. All observations retain compact provenance; byte fitting truncates values, never provenance. PEEK remains orientation only and never substitutes for the ontology, schema, graph, or result handle.

## Security and broker boundary

V1 accepts only explicitly labeled local-synthetic graph inputs. Its workspace exposes neither the Communica engine nor `fetch`. It adds no endpoint, profile, redirect, or network permission.

The current JavaScript guard is not a security sandbox. In an eventual broker architecture, arbitrary child JavaScript must receive only the stable capability facade. The broker must retain the network-capable raw Communica engine, fetch implementation, approved profiles, credentials, timeout/retry policy, and transport receipts. The checked-in compatibility adapter exists for today’s trusted project runtime; it is not the eventual untrusted-child boundary.

## Recovery errors

Public failures use `LinkedScienceRuntimeError` with `code`, `stage`, `receipt`, `recoveryDocument`, and `retryable`. Agents should consult `linkedScience.documentation.get(error.recoveryDocument)`, validate the current epoch and orientation status, and rematerialize only through an authorized source route.

See [ontology and schema objects](ontology-and-schema-objects.md), the [machine schema](../runtime/linked-science-api.schema.json), and the [v1 task record](../tasks/linked-science-runtime-v1.md).
