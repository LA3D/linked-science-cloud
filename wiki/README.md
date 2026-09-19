# Scientific workflow wiki

This repository-owned wiki records cited scientific workflow candidates separately from source-dependent scientific findings. It is independent of Obsidian. Proposed pages are evidence for maintenance, not automatically applied instructions.

Run from the repository root:

```sh
node scripts/wiki-learning/wiki.mjs validate
node scripts/wiki-learning/wiki.mjs index
```

[HEAD](HEAD) selects the current immutable directory under `revisions/`. That directory contains `index.md`, `patterns/*.md`, the structured `state.json`, exact `proposal.json`, and append-only `evolution.jsonl`. An atomic HEAD replacement publishes all pages and their index together. Historical and interrupted, unreferenced directories do not select current advice. Validation verifies the revision chain and current source citations; missing or changed evidence fails closed.

The [initial index](revisions/d3d83044abefa53ac9c019a4312f9020c678392272716e752c337e0543cd267f/index.md) contains two **proposed** candidates: recovery after a bounded display failure, and a dated hemoglobin GO-membership snapshot. Neither establishes generality. An independent counterexample and transfer evidence are still missing.

Use the [maintainer skill](../.agents/skills/scientific-wiki-maintainer/SKILL.md) and its [revision reference](../.agents/skills/scientific-wiki-maintainer/references/revisions.md) for bounded proposals, review records, conflicts and interrupted-writer recovery. The coordinator records declared authorization; it does not authenticate a human reviewer. Review is distinct from scientific validation. Local writes support process-interruption recovery, not durable distributed storage or power-loss guarantees.

## Retrieval during scientific work

The Linked Data REPL skill now consults a [bounded search/read helper](../.agents/skills/linked-data-repl/references/scientific-memory.md) on relevant task entry or unfamiliar errors. It delivers selected entries explicitly, records consultations and preserves proposed status. See the [retrieval handoff](../docs/tasks/wiki-selective-retrieval.md) for comparison evidence and limitations. This is selective advisory retrieval, not unconditional injection of wiki pages.
