# Eyeron / RDF-JS compatibility experiments

2026-09-20. User-authorized installation and small reasoning experiments, followed by interface/context design assessment. Production inference API and learned PEEK policy remain unimplemented.

## Installation and reproduction

Installed Eyeron **0.5.13** at `/Users/cvardema/.local/bin/eyeron`, compiled from release commit `b46a18e5653f4b203f9c2292e4142f01868e202b`. Homebrew Rust was installed as a prerequisite; no global Codex configuration or shell PATH change was made. The upstream clone is an external dependency under `/Users/cvardema/.local/share/linked-science/eyeron-v0.5.13`, not project work left in a worktree. Source, binary, toolchain and dependency-lock hashes are recorded in the [installation receipt](../../artifacts/eyeron/20260920/installation.json). Installation used the tag but not Cargo `--locked`; the resolved lock hash records this limitation. The Wasm package is the upstream prebuilt package at the same tag, separately hashed, not a locally rebuilt Wasm binary.

Authoritative upstream sources: [tagged README](https://github.com/eyereasoner/eyeron/blob/v0.5.13/README.md), [N3](https://github.com/eyereasoner/eyeron/blob/v0.5.13/docs/n3.md), [SPARQL-RL](https://github.com/eyereasoner/eyeron/blob/v0.5.13/docs/sparql-rl.md), and [Wasm API](https://github.com/eyereasoner/eyeron/blob/v0.5.13/src/wasm.rs). SPARQL-RL is a rule language, distinct from OWL RL ontology semantics.

The [protocol](../../artifacts/eyeron/20260920/protocol.json) precedes execution. Run the [main runner](../../scripts/experiments/eyeron/run.mjs) with a pinned source directory, installed binary and **new** output directory. It refuses to overwrite a prior run. The [follow-up](../../scripts/experiments/eyeron/followup.mjs), [named-graph correction](../../scripts/experiments/eyeron/named-graph.mjs), and [audit](../../scripts/experiments/eyeron/audit.mjs) preserve this run's additional checks. The follow-up expects the saved mounted-source exchange; it does not fabricate a mounted session. These are run-specific experiment helpers, not production adapters. No external scientific resources were acquired; all facts are synthetic.

## Results

The [machine observations](../../artifacts/eyeron/20260920/run-01/results.json) and [audit](../../artifacts/eyeron/20260920/audit.json) satisfy **15/15 bounded checks**. Overall integration readiness is **partial**, because detected semantic/interface gaps remain.

| Experiment | Observation | Consequence |
| --- | --- | --- |
| N3 versus SPARQL-RL | Both produce exactly the same three subclass inferences. | A shared derived-RDF result contract is viable for this rule fragment. |
| RDF/JS round trip | Three asserted quads stay unchanged; three inferred quads are retained separately; Comunica returns three types. Also observed in the actual mounted project MCP. | Keep native graph handles at the public interface; serialization is an internal adapter step. |
| Named graphs | Ordinary rules derive nothing from the two named graphs. An initial direct `log:includes` attempt also derives nothing. Inspection shows `graph log:nameOf formula`; a corrected explicit formula rule derives the expected type. | Do not silently flatten datasets. Specify graph selection, union or graph-aware reasoning deliberately. |
| Terms and blank nodes | Language tag and integer lexical form `01` survive. Separate batches both serialize blank-node label `_:x`. | Preserve RDF terms; relabel blank nodes per input scope, while preserving intended shared identity within one dataset. Never concatenate unrelated batches naively. |
| Proofs | N3 emits a 2,014-byte proof, parsed into 98 RDF/JS quads including formula graphs. SPARQL-RL proof request exits with an explicit unsupported error. | Separate proof representation/capability from inferred facts. Parsing is not semantic preservation or independent proof verification. |
| Failure/completion | Malformed RDF is rejected. A backward depth limit exits nonzero with explicit incomplete status and no successful output. | Never convert timeout/incompleteness into an empty successful graph. |
| Session reuse | A second batch lacking subclass facts derives nothing despite reuse of the compiled program. | Cache compiled rules separately from scientific dataset/session state. |
| OWL subset | Two explicit rules for transitive and inverse properties derive four expected triples. | Evidence for those rules only, not full OWL RL/DL conformance. |

The [mounted source](../../artifacts/eyeron/20260920/mounted-source.json), [host inference](../../artifacts/eyeron/20260920/mounted-inference.json) and [mounted result](../../artifacts/eyeron/20260920/mounted-result.json) establish the small cross-process round trip and persistence marker. This manual experiment relayed three quads through tool output. It does **not** prove a no-relay bulk data bridge, broker-integrated inference or zero-copy execution. The existing `rdf.retain` surface alone does not automatically attach Eyeron rule/engine lineage; the saved experiment records supply that lineage here.

## Proposed neuro-symbolic surface and PEEK boundary

Use a host-owned reasoning adapter with explicit input graph handles, a versioned ruleset and a declared graph policy. It should return a separate inferred graph, completion report and optional proof reference. Record engine/build, input/rule hashes, supported semantics, elapsed work and limits. Admit output only after successful completion and parsing; preserve assertions separately. Invalidate cached derivations on input/rule changes or lost source epochs. Decide whether caches are immutable snapshots or recomputed derivations; do not imply truth maintenance merely because a session is persistent.

For context management, keep graphs, rules, proof payloads and execution reports outside the model prompt. Let the agent query derived RDF with normal SPARQL/RDF-JS and request a bounded explanation for selected conclusions. The [387-byte orientation proposal](../../artifacts/eyeron/20260920/run-01/peek-proposal.json) contains versions/hashes, count, completion, proof locator and scope; it is a design artifact and was not applied to PEEK. Future orientation should point to these objects and state their validity, never become a second graph/proof store. Eviction may remove a cached derivation or summary; it must not silently erase source evidence or claim stale handles remain resident.

Prefer a separately cancellable host worker/process for the first adapter. The current Wasm calls are synchronous and serialized-string based; worker isolation, memory limits, cancellation and host-mediated imports need explicit design. CLI imports can access resources, so a future adapter should supply broker-resolved local inputs rather than allowing uncontrolled URL/import resolution. No embedded model is necessary: Codex chooses reasoning scope, deterministic Eyeron executes rules, and Codex interprets bounded outputs.

Next design decisions: graph policy, proof/explanation representation, batch blank-node identity, supported rule profile and versioning, cancellation/output admission, and derivation invalidation. Test those decisions with larger bounded cases before adding a production facade. Full OWL conformance, scale, proof checking, truth maintenance, cost benefit and learned PEEK policy remain unmeasured.

## Delivery

Authoritative checkout: `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`; task branch `codex/eyeron-compatibility`, starting at `ac5db4c`. All scripts and evidence are committed locally and integrated into main after verification. Installed compiler/reasoner binaries are external dependencies, not Git artifacts. Unrelated `.codex/config.toml`, structure-viewer artifact and older dirty worktrees remain untouched. No push is included in this task.

Verification: 15/15 compatibility audit checks pass; full `npm test` passes 256/256 before registry insertion; the focused registry suite passes 3/3 after updating counts to 66 runs and 15 dossiers. Smoke, artifact hashes, relative links and whitespace checks pass. The experiment workspace was disposed only after primary evidence and registry capture.

## Live scoped-worker activation — 2026-09-20

The [live protocol](../../artifacts/eyeron/live-20260920/protocol.json) freezes one synthetic ontology classification task before source creation and fresh worker dispatch. The worker receives a scoped object reference and question, not the fixture or expected answers. It uses the mounted project MCP, formulates explicit instance-subclass rules, invokes Eyeron, queries inferred types, inspects an unverified proof excerpt and deposits findings/references. The coordinator independently checks the deposit against owner-side queries, then checks access after worker closure and invalidation after source release. A rejected ten-minute grant was reduced to the service's five-minute ceiling before dispatch; the [amendment](../../artifacts/eyeron/live-20260920/protocol-amendment.json) preserves this adjustment.

This is a small synthetic workflow and live activation check, not a comparative quality/latency trial or full OWL evaluation. Worker filesystem isolation is instruction-based. No wiki consultation, extraction or promotion is part of the run. Actual exchanges and the result receipt are saved before cleanup; capability secrets are excluded.

The [live result receipt](../../artifacts/eyeron/live-20260920/receipt.json) passes all 16 checks. The fresh worker derived four triples: s1 is a Neuron and Cell; s2 is a GlialCell and Cell. There were zero direct Cell assertions, and the seven source triples stayed unchanged. The owner independently queried the inferred object, read it after worker closure, and observed `LS_RELEASED_HANDLE` after source release. The 4,034-byte proof was retained; only bounded unverified excerpts were displayed. The worker itself viewed the seven-triple fixture through bounded query output, so this run does not establish zero data exposure to the child or scalable no-relay behavior. No full derived RDF or proof artifact was exported; those payloads were disposed after receipt registration.

Verification: all 288 repository tests pass, along with smoke, the 67-run result registry, 21 artifact hashes, changed Markdown links and whitespace checks. The temporary service remains attached to the owner MCP with its workspace disposed and normal idle timeout; no global reset was performed. Next work is scientific corpus eligibility and counterexample design before proposing a reasoning-use wiki pattern.
