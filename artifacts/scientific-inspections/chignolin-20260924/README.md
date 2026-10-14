# Exact chignolin: retrieved evidence and rehearsal fallback

Retrieved 2026-09-24 through Linked Science Cloud private broker.

## Findings
- Exact input GYDPETGTWG: PDB 1UAO entity 1, chain A, synthetic 10-residue chignolin. Entity record contains no UniProt reference identifier.
- Experimental coordinates retrieved: 18 solution-NMR models, 138 ATOM lines in first model. Conditions reported: 277 K, pH 5.5, 2 mM chignolin. These are a structural ensemble, not a time trajectory.
- PDB explicit cross-reference to BMRB 5694 followed successfully: same sequence, chemical synthesis, 57 proton chemical shifts and 16 coupling constants. BMRB DOI 10.13018/BMR5694.
- Publication linked by both repositories: Honda et al., Structure 12 (2004), 1507–1518; DOI 10.1016/j.str.2004.05.022; PMID 15296744. Full paper not retrieved.
- CLN025, PDB 2RVD entity 1, is YYDPETGTWY: differences at residues 1 and 10. It is not the exact peptide. No parent protein substituted.
- Chris's public wiki prose was retrieved and reports five ranked ColabFold structures, mean pLDDT 93.4, pTM 0.06, maximum PAE 5.35 Å. Those are author-reported outputs, not independently calculated here. His linked results directory returned HTTP404. Chris's prediction was not independently inspected.
- UniProt name search returned zero records. Exact sequence SPARQL request failed before response. AlphaFold sequence search page returned an HTML application shell, with no interpretable search results. No exact UniProt/AlphaFold DB record verified; absence is not established.
- No structural comparison to Chris's run, no causal claim about its pTM, and no equivalence of terminal capping asserted.

## Short live route
1. Start with Chris's supplied sequence and public slide.
2. Read RCSB entry 1UAO and polymer entity 1; compare full sequence equality and synthetic source.
3. Follow entry's BMRB reference to 5694; inspect sequence and measurement counts.
4. Fetch 1UAO coordinates and count MODEL records; distinguish ensemble from trajectory.
5. Show 2RVD sequence as a variant counterexample.
6. State the missing UniProt/AFDB crosswalk and unavailable predicted coordinates.

The initial 1UAO candidate came from assistant prior knowledge; the entry, exact sequence, experimental evidence and cross-references were verified by actual mediated reads. The receipt contains executed JavaScript, actual returned projections and failed exchanges. Use its saved projections as the offline rehearsal fallback; live handles are not durable artifacts.

## Public links
- [Chris's slide](https://la3d.github.io/WGRA/talks/quarto/agentic-research-workflows.html#/demo-4-run-alphafold-on-chignolin)
- [Wiki report](https://github.com/chrissweet/codex-llm-wiki-test/wiki/Chignolin-AlphaFold-Prediction)
- [PDB 1UAO](https://www.rcsb.org/structure/1UAO)
- [Exact entity JSON](https://data.rcsb.org/rest/v1/core/polymer_entity/1UAO/1)
- [Experimental PDB coordinates](https://files.rcsb.org/download/1UAO.pdb)
- [BMRB 5694](https://bmrb.io/data_library/summary/index.php?bmrbId=5694)
- [Publication](https://doi.org/10.1016/j.str.2004.05.022)
- [CLN025 entity](https://data.rcsb.org/rest/v1/core/polymer_entity/2RVD/1)

