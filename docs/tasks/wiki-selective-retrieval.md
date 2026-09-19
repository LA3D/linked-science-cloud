# Selective scientific memory retrieval

2026-09-19. Implemented on `codex/wiki-selective-retrieval` from `b6781e6` in `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`. The user authorized retrieval during scientific tasks and a comparison. This extends the original maintenance-only plan.

## Behavior

The [Linked Data REPL skill](../../.agents/skills/linked-data-repl/SKILL.md) now directs a bounded search at the start of multi-step scientific work or an unfamiliar query/display error, then reads only relevant entries. The [reference](../../.agents/skills/linked-data-repl/references/scientific-memory.md) documents search, selected reads, optional disabled comparison mode and outcome feedback. The [helper](../../lib/wiki-learning/retrieval.mjs) runs in the host checkout; it does not add a model, MCP registration, kernel filesystem access or a competing workflow controller.

Search validates the canonical revision and citations and ranks lexical overlap in compact metadata. The CLI returns metadata before full pattern text; no-match and unavailable results do not block source-based work. Reads require a selected active pattern and unchanged revision, and carry scope, evidence, missing evidence and hypothesis status. Inactive patterns are excluded. Search output is bounded to 4 KiB, read content to 16,000 bytes, query to 1,024 bytes and default selection to three entries. Similarity is not semantic applicability, freshness or authority.

Consultations are appended under `artifacts/wiki-learning/consultations/`. Search records a query hash and matched terms, not raw task text; generic nonsensitive query terms are required. Selected reads record pattern/revision hashes. Feedback distinguishes helped, not-helpful, not-used and unknown. Positive/negative use assessments require a read and hashed saved evidence, but remain agent reports: the helper does not verify the semantic judgment or establish causal benefit. No automatic pattern promotion occurs. These are cooperative local logs, not authenticated or tamper-proof records. Interrupted writes may leave an invalid receipt; do not interpret it as success.

## Verification and comparison

[Seven targeted tests](../../test/wiki-learning/retrieval.test.mjs) cover selective delivery, proposed status, empty/off modes, corrupt citations, stale revision, inactive patterns, source-finding separation, outcome evidence, bounds, unsafe paths and the separate skill baseline.

The [paired comparison result](../../artifacts/wiki-learning/retrieval-evaluation/memory-retrieval-e5174268-b0da-441d-960c-8cbc97270245/results.json) records three fixed queries: recovery, GO overlap and an unrelated topic. The on arm selects the expected known seed or no match; the off arm exposes no wiki content. Two selected reads and unknown outcome feedback are saved. All three mechanical cases pass. Reproduce with `node scripts/wiki-learning/compare-memory.mjs`, which creates new receipts and a uniquely named result; any intentional new run needs registry capture.

This is not a model A/B experiment or evidence of improved scientific performance. The current assistant has already seen both patterns; an independent trial needs separate contexts and identical task/source conditions. No new scientific retrieval was performed. Actual future skill selection and compliance are not established by editing its file.

The original baseline `repl-20260919-phase0` remains unchanged. The new [retrieval baseline](../../artifacts/wiki-learning/baselines/repl-20260919-retrieval/manifest.json) freezes the changed skill and direct references, digest `120cf7561f9a456c8dc770d2eaeb00ca98ac6e4af3c6433ef529ce66db0d16b7`. Historical baseline tests now reconstruct historical bytes rather than assuming the active skill can never evolve.

## Next evidence and delivery boundary

Use a fresh scientific task to observe updated skill selection, consultation and grounded outcome feedback. Then compare independent scientific attempts with retrieval enabled/disabled. The two stored patterns remain proposed; independent recovery/counterexample and transfer benefit remain unmeasured. No global configuration, Obsidian data, model provider or wiki content was changed. Unrelated `.codex/config.toml` settings and `artifacts/structure-viewer/7KI0.pdb` remain excluded. Final verification and local main commit are recorded in the completion response; no push is included.

Final verification: `npm test` passes 256/256; smoke, Skill Creator validation, registry validation (64 runs), canonical wiki validation, 83 changed-document relative links and whitespace checks pass. The original wiki HEAD and historical baseline remain intact. The initial full run caught two tests that incorrectly read active skill bytes as the old baseline; both were corrected to use frozen bytes, and a new test checks the active retrieval baseline explicitly.


Follow-up: the [fresh-context scientific pilot](wiki-live-comparison.md) observed enabled retrieval and correct full-result recovery in both arms. Functional use passes; incremental benefit is not established. See that record for differing aggregation locations and evidence limits.
