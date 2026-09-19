# Scientific memory enabled/disabled pilot

2026-09-19. The user authorized separate scientific attempts with retrieval enabled and disabled. This pilot uses a local synthetic assay fixture, not public source acquisition or real biomedical findings.

## Fixed protocol

[Protocol](../../artifacts/wiki-learning/live-comparison/20260919/protocol.json) and [fixture](../../artifacts/wiki-learning/live-comparison/20260919/fixture.json) were saved before worker launch. Both fresh-context workers receive the same setup, scientific question, required oversized display attempt and runtime budgets. Only arm name and memory policy differ. Neither receives parent history. The [evaluator answer](../../artifacts/wiki-learning/live-comparison/20260919/evaluator.json) is coordinator-only. Workers must solve from native query evidence, not the setup formula.

The task compares assay groups on qualifying sample counts and means, with complete query coverage. Recovery after an oversized page request is assessed for correctness and unnecessary reacquisition/query repetition. The enabled arm may discover the normal skill and consult relevant wiki patterns; the disabled arm can use base skill/runtime documentation but no wiki or memory reference. Both therefore share existing base knowledge of result completeness and bounded presentation.

Worker prompts and outputs live in [enabled](../../artifacts/wiki-learning/live-comparison/20260919/enabled/) and [disabled](../../artifacts/wiki-learning/live-comparison/20260919/disabled/). This is one pair using inherited model settings, with separate contexts and instruction-based file isolation. The filesystem is shared; no OS enforcement or blinded model population is claimed. The failure was intentionally chosen to be relevant to an existing candidate, so it is not an unbiased relevance benchmark.

## Evidence and decision

Results were scored from saved runtime exchanges, answer coverage, consultation receipts and worker reports. A missing mounted runtime or missing operation evidence is a limitation, not a successful replacement test. Agent-reported helpfulness does not establish causal benefit. No pattern promotion is automatic.

Delivery starts at `5f7f46e` on `codex/wiki-live-comparison` in the authoritative checkout. Production code and skill files remain fixed during the experiment. Unrelated MCP configuration and structure-viewer data are excluded. The result receipt and registry entry must be saved before ending the run; final verification and local integration are reported at completion.


## Recorded outcome

The [result receipt](../../artifacts/wiki-learning/live-comparison/20260919/receipt.json), [numeric scores](../../artifacts/wiki-learning/live-comparison/20260919/answer-scores.json) and [independent saved-page audit](../../artifacts/wiki-learning/live-comparison/20260919/audit.json) pass. Both arms report A: 6 qualifying samples, mean 65.1666666667; B: 6, mean 68.3333333333; C: 5, mean 66.6. A and B tie. The coordinator independently parsed all 36 rows from each arm's saved tool outputs and recomputed the aggregates. Both encountered `LS_BOUND_EXCEEDED`, reused the original result, and disposed only their own workspace. Neither repeated the query nor reloaded the graph.

The enabled arm recorded a search, selected read of `retained-query-after-display-limit`, and hashed outcome feedback. It treated the pattern as a hypothesis and verified surviving state. The disabled arm reports no memory consultation and solved using the base skill and runtime error. Skill reads and disabled abstention are worker-reported; a complete independent host file-access audit is unavailable. This establishes fresh-subagent use, not a separate desktop-task activation test.

Runtime calls: enabled 6, disabled 7, including disposal. The enabled worker aggregated saved pages in host Python; the disabled worker used an extra kernel call to aggregate. This changes where computation occurred, so the one-call difference is **not an efficiency result**. Enabled also incurred memory search/read/feedback work. Self-measured pre-disposal elapsed times were 93.836 versus 75.903 seconds, excluding initial reading and cleanup; neither is matched end-to-end latency or token cost.

Decision: functional activation and scientific recovery pass; incremental benefit is **not established**. Agent feedback says helped, but both arms succeeded with the same reuse behavior. Both wiki patterns remain proposed. Next research would need repeated tasks where the memory supplies useful information beyond the base skill and error message; no further trial or promotion is implied by this result.

Verification: full `npm test` passed 256/256 before registry insertion; the focused registry test is rerun for the new 65th record. Smoke, numeric scoring, raw-page audit, fixture/input hashes, registry validation and changed-document links are checked before integration.
