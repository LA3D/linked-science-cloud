# Fabry run validation

- Actual project MCP: public UniProt schema, UniProt–Rhea federation, UniProt–ChEMBL federation and PubChem queries completed; 2 / 8 / 1 / 2 rows.
- Four historical RDF source hashes matched before loading. Local anchor / chain / ontology queries returned 1 / 5 / 4 rows.
- Exact versus subclass selection returned 0 / 1. Eyeron returned one derived selection; two negative controls remained unselected. Raw proof was captured but not independently verified.
- Two native Codex workers read their scoped public evidence and deposited reviews. Their two nested computations and parent computation completed. Cleanup complete; no pending requests; identical parent acceptance returned the same receipt.
- Fourteen bounded snapshots saved. In the original session, chemistry and chain snapshots loaded in a fresh workspace with identical rows and fresh handles.
- JSON syntax, recorded counts, snapshot count and terminal computation states checked from saved artifacts. Restore helper passes `node --check`. Registry schema and targeted `git diff --check` pass.
- `npm run evaluation:results:validate` still fails on the preexisting unrelated `docs/experiments/scientific-trajectory-evidence.md` registration omission; no claim of a fully passing repository registry check.
- No runtime source edits, dependency changes, configuration changes or service restart. Full software tests were not rerun for a scientific execution/receipt-only task.
- While verifying the saved restore helper, the original owner connection returned `UNAUTHORIZED: Attach to an open session first`. The independently running service has a five-minute idle cleanup. Its MCP adapter has no detach/reconnect operation, so an expired owner adapter cannot recover in place. A fresh project-MCP owner connection successfully recreated the same session ID and loaded the exact Fabry activity: 14 snapshots, three completed computations, zero pending requests. The eight chemistry and five chain rows and their columns exactly match the recorded originals. Binding persistence verified across calls. See recovery-check.json. No old native handles or permissions were revived, and no service-process restart was performed.

Checkout: `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`; branch `main`; HEAD `f92374063cf85834e5d7bb8ec9c7ccac04cd4a98`; 7 commits ahead of `origin/main`. Scientific artifacts/registry additions remain uncommitted; no task commit or push. Preexisting unrelated dirty and untracked work preserved.
