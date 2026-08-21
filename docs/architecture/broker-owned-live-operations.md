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

Repository tests inject an offline broker and establish the child-facing contract, native retention, hash and result-bound checks, denial of profile-object injection, and no-requery derivation for the first three competency shapes. External broker tests add parent-owned immutable profiles, receipt and transport bounds, denial of raw child HTTP/DNS/sockets and filesystem writes, per-kernel IPC authorization, and an actual evaluator-private honeytoken read-denial attestation. A cross-repository synthetic check confirms that external broker results reach native runtime handles. These checks make no network request.

The consumer-owned `packages/cleanroom-node-repl` package now implements this boundary. Its history includes sibling commit `a18934f`, imported without squashing to preserve the provenance of the original clean-room experiment. After a full Desktop restart on 2026-08-20, before that ownership cutover, a fresh trusted-project task observed the exact three-tool MCP surface, `brokerOwnedLive: true`, persistent state, raw child DNS/network/socket/write denials, and evaluator-private `ERR_ACCESS_DENIED`. One separately authorized bounded `ASK` through the immutable `uniprot-read` profile returned a broker receipt and native boolean handle. This historical observation establishes activation and broker-owned transport, not a secure competency-evaluation result.

Reviewed real VoID, machine-readable UniProt core, and GO acquisition profiles also remain separate work. Repository names or draft manifests do not authorize them.
