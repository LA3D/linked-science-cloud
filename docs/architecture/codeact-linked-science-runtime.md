# CodeAct Linked Science runtime

## Decision

Linked Science uses the user-owned `cleanroom_node_repl` and persistent model-written JavaScript as its primary action space. `lib/cleanroom-linked-science-bootstrap.mjs` validates the saved project and dependency roots, registers RLM discovery context, and injects the `linkedScience` facade (with short alias `ls`) from `lib/linked-science-runtime.mjs`. Communica remains the RDF/SPARQL query kernel behind the facade.

The one-time bootstrap, generated documentation, machine schema, conditional lookup, examples, stable globals, and explicit reset follow the public adapter shape described in [runtime discovery](../agent/runtime-discovery.md). This repository does not imitate a private Browser or Chrome bridge.

## Runtime shape

`bootstrapLinkedScience({ host, cleanroom, projectRoot, moduleRoot })` is the authoritative clean-room entrypoint. Its explicit roots replace the earlier `process.cwd()` assumption. The lower-level `setupLinkedScience` remains available for offline tests and standalone scripts. Both install non-writable `linkedScience` and `ls` properties idempotently for one global object.

The facade exposes generated documentation, capabilities, examples, context open/reset, and a compatibility namespace for the existing guarded query/evidence and legacy profile/page/table primitives. Compatibility access does not grant endpoint approval or alter the guards.

A workspace owns private Communica state and opaque retained handles. It supports:

- asynchronous local ontology, schema, SHACL, inferred-graph, and instance-data graph materialization;
- bounded schema search and RDF-neighborhood inspection;
- bounded local `SELECT`, `ASK`, `CONSTRUCT`, and `DESCRIBE` through Communica;
- one generic `results.derive(handle, callback)` for model-written JavaScript transformations;
- bounded profiles, pages, and tables with lineage, operation IDs, source fingerprints, and provenance; and
- asynchronous broker-owned PEEK orientation bootstrap/current/commit/status operations.

Recursion and model-provider calls are outside v1.

## Handles and epochs

Handles are frozen branded tokens carrying only an ID, type, label, and runtime epoch. RDF/JS values remain in a private registry. Graphs retain their input quad array, including ordering and duplicates; bindings retain variable terms and RDF value terms. IRIs, datatypes, language tags, blank nodes, and named graphs are not flattened to strings in resident state.

Every operation records an operation ID. Graphs receive an ordered, duplicate-aware fingerprint. Query and derived results retain source fingerprints, source handles, query or callback hashes, and lineage.

Facade reset advances the context epoch and destroys the workspace registry while the clean-room broker retains its compact PEEK map. Kernel reset additionally removes the facade and RLM contexts; bootstrap recreates them while the same broker PEEK map remains. A handle from another epoch produces a recovery-shaped `LS_STALE_HANDLE` error. PEEK references to pre-reset handles are explicitly stale until authorized rematerialization creates new evidence.

## State ownership

- Linked Science workspaces own bulk RDF and result handles inside one JavaScript kernel.
- `nodeRepl.rlm` owns kernel-resident external discovery context registered at bootstrap.
- The clean-room MCP broker owns bounded PEEK orientation across kernel replacement.
- Codex owns task goals and worker lifecycle.
- Durable artifacts require a separate authorized write and are not created by reset or orientation commit.

The runtime does not instantiate a competing PEEK cache when the clean-room backend is present. `lib/orientation-map.mjs` remains for compatibility code and offline standalone tests.

## Bounds and observation contract

Resident graphs and results have hard item ceilings. Prompt-visible pages/tables are bounded by rows, cells, and bytes. Neighborhoods are bounded by nodes, edges, and bytes. Schema search is bounded by hits and bytes. All observations retain compact provenance; byte fitting truncates values, never provenance. PEEK remains orientation only and never substitutes for the ontology, schema, graph, or result handle.

## Security and broker boundary

V1 accepts only explicitly labeled local-synthetic graph inputs. Its workspace exposes neither the Communica engine nor `fetch`. It adds no endpoint, profile, redirect, or network permission.

The clean-room VM context is a compatibility boundary, not a security sandbox. The current local facade exposes neither `fetch` nor its raw Communica engine. Existing guarded live adapters remain compatibility access under their own approval and transport contracts; registration of the clean-room MCP does not authorize a live source.

## Recovery errors

Public failures use `LinkedScienceRuntimeError` with `code`, `stage`, `receipt`, `recoveryDocument`, and `retryable`. Agents should consult `linkedScience.documentation.get(error.recoveryDocument)`, validate the current epoch and orientation status, and rematerialize only through an authorized source route.

See [ontology and schema objects](ontology-and-schema-objects.md), the [machine schema](../runtime/linked-science-api.schema.json), and the [v1 task record](../tasks/linked-science-runtime-v1.md).
