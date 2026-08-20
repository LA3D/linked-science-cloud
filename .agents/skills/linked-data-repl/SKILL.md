---
name: linked-data-repl
description: Explore messy RDF, ontologies, and approved public Linked Data sources through a persistent Node JavaScript REPL with Communica. Use for evidence-grounded questions, adaptive source recovery, schema discovery, bounded read queries, symbolic orientation maps, retained handles, and compact presentation.
---

# Linked Data REPL

Use this experimental project as a goal-directed, read-only Linked Data workspace. Let the user's goal and current evidence determine the route; do not impose a fixed reasoning or narration sequence.

## Hard invariants

- Work from this repository and preserve unrelated changes.
- Treat remembered terms, prefixes, graph paths, and endpoint behavior as hypotheses until supported by retrieved source evidence.
- Distinguish prior belief, source evidence, query-result evidence, and synthesis.
- Pursue the information goal, not a preferred source or memorized graph path. Change routes when evidence or failures warrant it.
- Never interpret an unavailable source or empty result as proof of global absence.
- Use only an endpoint or documentation profile explicitly approved for the current task. Do not substitute hosts, paths, provider URLs, REST routes, or federation targets.
- Keep live operations read-only, bounded, pinned, redirect-free, timed out, retry-limited, and provenance-bearing through the project guard.
- Keep large documents and results in the REPL behind named bindings or handles. Return only compact metadata, bounded pages or aggregates, provenance, and uncertainty.
- Do not change global Codex configuration, install packages, export data, commit, push, or write externally unless the user separately authorizes that action. Export is not implemented by this skill.

## Route only to relevant detail

- **Documentation-only or static-source work:** inspect repository files directly. It does not require a REPL preflight unless the result claims REPL execution, retention, or live connectivity.
- **Linked Science CodeAct runtime work:** read [runtime discovery](../../../docs/agent/runtime-discovery.md), use only `cleanroom_node_repl`, bootstrap exactly once with the documented absolute module and roots, and then reuse the stable `linkedScience`/`ls` binding. Start from generated documentation and conditional lookup instead of guessing methods. Keep every observation bounded by rows/cells or nodes/edges and bytes, with provenance. Broker-owned PEEK orientation survives kernel replacement, but resident handles and RLM kernel context do not; bootstrap again and reject old-epoch handles.
- **Any persistent-REPL execution:** first read and follow [REPL environment and persistence](references/repl-environment.md). A terminal script is not proof of REPL retention.
- **Documentation acquisition, live querying, source selection, or profiles:** read [guarded evidence acquisition](references/guarded-evidence-acquisition.md). Current explicit approval for the exact profile remains mandatory.
- **Retained results, orientation, reset, or presentation:** read [retained state and bounded presentation](references/retained-state-and-presentation.md).
- **Identifiers.org schema work only:** also read [the Identifiers.org SPARQL profile](references/identifiers-org-sparql.md).
- **Evidence/session architecture changes:** read the repository's [goal-loop state dossier](../../../docs/experiments/goal-loop-state-graph.md) and [architecture routes](../../../docs/architecture/README.md).

Use `resources/index.md` only as routed by the evidence-acquisition reference when a goal crosses sources or the starting source is unclear. Neither that index nor a skill is scientific evidence.

The exact runtime bootstrap is:

```js
var { bootstrapLinkedScience } = await import('file:///Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl/lib/cleanroom-linked-science-bootstrap.mjs');
await bootstrapLinkedScience({
  host: globalThis,
  cleanroom: nodeRepl,
  projectRoot: '/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl',
  moduleRoot: '/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl/node_modules',
});
```

Run it once per persistent clean-room kernel, then reuse `linkedScience`. Do not substitute the bundled `node_repl`, `process.cwd()`, an inferred root, or a package entrypoint under `node_modules`. The complete runtime surface belongs in generated documentation and `docs/runtime/`, not in this skill.

## Outcome

Choose `ASK`, `SELECT`, `CONSTRUCT`, carefully qualified `DESCRIBE`, source-document acquisition, or bounded handle inspection according to the information need and available evidence. A transport receipt proves that a request occurred; it does not prove the semantic interpretation.

Return the answer at the scale the user needs, with enough compact evidence to identify the source or query used, resident handles actually verified, what the bounded result supports, and what remains uncertain or needs another permission. Do not manufacture a map, receipt, frontier, or operation narrative merely to satisfy a template. Codex owns the task and worker lifecycle; this project contributes Linked Data evidence and session state.

After authorized repository changes, follow the repository [verification contract](../../../docs/agent/verification.md).
