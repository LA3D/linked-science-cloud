# Scientific learning from selected Codex trajectories

Human-guided scientific work is a valid source of proposed procedural knowledge. The learning unit includes the question, user corrections, assistant decisions, observed tool actions, and outcomes. Runtime receipts support particular scientific claims; they do not define the entire trajectory.

## Local capture and evidence classes

The [trajectory importer](../../lib/wiki-learning/trajectory-import.mjs) reads one explicitly supplied local Codex rollout, checks its session identity, and selects only named messages or call/output pairs. It does not discover unrelated history or inspect global memory. The task reader returned empty item lists for the motivating task, while that task's local rollout contained original messages and correlated calls. This observation does not establish behavior for every Codex version. No MEMORY.md indexing claim was verified.

The [CLI](../../scripts/wiki-learning/import-trajectory.mjs) accepts a JSON selection file with `sourcePath`, `taskId`, and `selections`. A message selection contains `itemId` and an exact `excerpt`; an exchange selection contains `callId`. It writes `trajectory.json` in a new controlled episode destination without overwriting. Select only authorized task evidence; inspect selected payloads for sensitive or irrelevant content before retaining them.

Bounds: at most 48 selections, 32 MiB input history, 16 KiB per selected message or call input, 64 KiB per selected output, 1,000 characters per message excerpt, and 512 KiB total saved projection. Nontext output, private reasoning, system/developer messages and unselected records are omitted. Malformed trailing input is rejected, not silently dropped. Call/output identity and order must match; cross-turn exchanges need another adapter. No code in the history is executed. Secret detection is a narrow additional check, not a guarantee of anonymization.

Selected source records retain original record hashes and line locators plus the minimum relevant fields. Their observable view is recomputed during validation. The original full rollout is not copied into the repository. Hashes and source locators establish integrity and correlation, not third-party attestation; source authenticity still depends on the local capture. Tool output can already be truncated at the producer, so no complete scientific result is inferred.

| Evidence class | Supports | Does not establish |
| --- | --- | --- |
| User request / quoted voice transcript | Objective and human guidance | Scientific truth or original audio fidelity |
| Agent report | What the assistant reported | An independently checked outcome |
| Observed tool exchange | Selected actual request/output pair | Completion of the full scientific result |
| Runtime receipt with verified correlation | Its scoped operation/result claims | Whole-session completeness or causal learning |

## Eligibility and extraction

Episode version 1.2 adds `selected-trajectory` and generic `toolCall` events. Corpus version 1.1 adds `evidenceBasis: trajectory-procedure`; old records remain valid. The [trajectory corpus checker](../../lib/wiki-learning/trajectory-corpus.mjs) requires reviewed scientific scope, selected user context, observed scientific tool activity, supported source anchors, correctly typed witnesses and saved evidence. It rejects scientific-finding promotion, machine-check outcomes, unsupported anchors and missing/altered records. The old runtime gate remains in place for direct scientific evidence.

The assistant authors proposed patterns after reviewing the trace and existing patterns. This is not an automatic extractor or a claim of autonomous improvement. `observed-within-scope` for this route means the process evidence exists. A partial scientific outcome or absence of transfer evaluation need not block a procedural hypothesis; missing required evidence does. Preserve limitations in the pattern. Attached later result projections remain labeled as such; they are not retrospectively converted into original tool exchanges. Explicit operation joins still use the existing stricter receipt checks.

## First real case

The [selected discovery episode](../../artifacts/wiki-learning/episodes/discovery-trajectory-20260923/episode.json) preserves 17 message/exchange events from the user's Identifiers.org and Wikidata exploration. It includes the user's ontology correction, supplied paper and Wikidata item, class-traversal prompt, and registry-overlap question. The [corpus](../../artifacts/wiki-learning/corpus/discovery-trajectory-20260923.json) separates three procedural units. A [later retained-state projection](../../artifacts/wiki-learning/scientific/discovery-trajectory-20260923/desktop-retained-evidence.json) is supporting evidence, with no invented original-event join.

The lessons strengthen ontology/endpoint guidance and propose Wikidata service discovery and registry lower-bound handling. They remain proposed; source counts are historical, services were not all independently tested, and user-guided recovery is explicit. The software work implementing this adapter is not scientific learning evidence.
