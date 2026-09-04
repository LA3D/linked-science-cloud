# Agent context routing

Root `AGENTS.md` supplies the always-on contract. Read the [project README](../../README.md) for the authoritative runtime boundary and current surface, then load only the context that changes the present task.

## Route by task

| Task type | Read next |
| --- | --- |
| Use or change the scientific REPL | [Runtime discovery](runtime-discovery.md), then the normative [scientific REPL architecture](../architecture/rlm-linked-science-runtime.md), the [persistent JavaScript compatibility surface](../architecture/codeact-linked-science-runtime.md), and [ontology/schema objects](../architecture/ontology-and-schema-objects.md). |
| Run or diagnose the persistent REPL | The [Linked Data REPL skill](../../.agents/skills/linked-data-repl/SKILL.md), then its environment reference; use [persistent session and handles](../architecture/persistent-session-and-handles.md) for the stable state model. |
| Acquire documentation or traverse Linked Data | The skill's evidence-acquisition reference and [broker-mediated traversal architecture](../architecture/broker-owned-live-operations.md). Ordinary goal-relevant anonymous public reads use the broker defaults; consult a source-orientation entry or dossier when the question, vocabulary, provenance, or stakes warrant it. Authenticated, sensitive, mutating, bulk, export, and evaluation work remain separately governed. |
| Design or run the UniProt competency evaluation | The [competency-question methodology](../experiments/uniprot-competency-question-evaluation.md), then the active [manifest task](../tasks/uniprot-competency-manifest.md). Keep official queries, locators, expected paths, and case-specific endpoint hints evaluator-only. |
| Change session, evidence, cache, or reset behavior | [Persistent session and handles](../architecture/persistent-session-and-handles.md), [orientation cache and reset](../architecture/orientation-cache-and-reset.md), and the [goal-loop state dossier](../experiments/goal-loop-state-graph.md). |
| Design recursive Linked Data context management or a PEEK policy | [Optional RLM/PEEK research](../architecture/prime-linked-data-context-management.md), then the current [plan](../../PLAN.md). Provider activation and experiment runs remain separately authorized. |
| Change tables, visualization, export, or chemistry rendering | [Bounded presentation handoff](../architecture/bounded-presentation-handoff.md), then the applicable experiment dossier. Export and live work need separate authorization. |
| Implement or review repository changes | The relevant `lib/`, `scripts/`, and `test/` files; the [Git handoff procedure](git-handoff.md); and the [verification contract](verification.md). |
| Continue or transfer unfinished work | The matching entry in the [active task queue](../tasks/README.md) and its task brief before broader roadmap or journal review. |
| Study why a design exists or plan a new experiment | The [roadmap](../ROADMAP.md), then only the directly relevant [experiment dossier](../experiments/) and dated journal entry. Historical dossiers are evidence records, not current operating instructions. |

## Authority and freshness

- Runtime code and tests define implemented behavior.
- Guard receipts and recorded traces establish what a particular run observed.
- Architecture notes summarize stable cross-cutting contracts and route to the deeper evidence; they do not replace tests or experiment dossiers.
- Task briefs record current execution state and the next action for material work.
- The roadmap describes candidate or validated slices. A roadmap entry does not authorize execution.
- Journals and superseded experiments preserve history and should not override current root guidance, code, or an active task brief.

Avoid loading every dossier or reference by default. If a task crosses boundaries, add the next layer when the decision arises.
