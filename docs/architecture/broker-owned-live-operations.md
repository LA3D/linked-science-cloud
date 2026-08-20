# Broker-owned live operations

## Decision

The clean-room child may request live work only through an injected `linkedScienceBroker` capability. The child names an immutable profile and supplies either an exact source selector or bounded SPARQL. It cannot supply an endpoint, profile object, `fetch`, network-capable query engine, credentials, redirect policy, or retry policy.

The broker owns those values and returns a typed payload plus a compact receipt. `lib/linked-science-runtime.mjs` independently checks the broker capability descriptor, profile digest, input and payload hashes, operation kind, attempt count, and retained bounds before creating a native epoch-bearing handle.

## Capability contract

The optional broker exposes exactly:

- `capabilities()` — immutable profile IDs, operation kinds, profile SHA-256 values, and ceilings;
- `acquire({ profile, source? })` — bounded source content plus a broker receipt; and
- `query({ profile, sparql })` — typed RDF bindings, boolean, or quads plus a broker receipt.

The checked-in [broker capability schema](../runtime/linked-science-broker-capability.schema.json) documents the serializable boundary. The native facade exposes the corresponding `workspace.live.acquire`, `workspace.live.query`, `workspace.evidence.inspect`, `workspace.evidence.search`, and `workspace.graphs.fromEvidence` operations. Raw guarded transport helpers are no longer exposed under `linkedScience.compatibility`.

## Native retention

Successful acquisition creates an `evidence` handle containing the bounded response and broker provenance. A supported RDF document can be parsed once into an ontology, schema, SHACL, inferred, or instance graph with `graphs.fromEvidence`; the graph lineage cites the evidence handle and source fingerprint. Successful query results create native `bindings`, `boolean`, or `quads` handles with broker operation ID, immutable profile digest, query digest, payload fingerprint, and attempt receipt.

The same epoch, reset, PEEK, bounded page/table, and second-turn reuse contracts apply to these handles. A broker receipt proves one transport operation; it does not prove a scientific interpretation.

## Enforced and unenforced boundaries

Repository tests inject an offline broker and establish the child-facing contract, native retention, hash and result-bound checks, denial of profile-object injection, and no-requery derivation for the first three competency shapes. They make no network request.

The current separately saved `cleanroom_node_repl` MCP must still implement and inject this capability, retain the immutable real profiles, deny raw child networking, and issue filesystem read-denial attestations for evaluator-private state. Until a fresh task observes those broker features, the runtime reports `brokerOwnedLive: false`, live calls fail with `LS_BROKER_UNAVAILABLE`, and no secure live evaluation is claimed.

Reviewed real VoID, machine-readable UniProt core, and GO acquisition profiles also remain separate work. Repository names or draft manifests do not authorize them.
