# Carrying the chignolin investigation forward

**Question:** What can existing experimental and simulation evidence teach us about this predicted small peptide, and what follow-up questions arise?

The starting point is Chris's reported ColabFold prediction and wiki account. His prediction need not be recreated to extend its scientific context. His original coordinates were not independently inspected. This rehearsal used actual Linked Science Cloud mediated reads; it did not run simulations or download bulk trajectories.

## A practical five-minute demo

1. **Recover the question from the wiki (30 s).** Chris reports predicting GYDPETGTWG, with mean pLDDT93.4 and pTM0.06. Frame the next question: what conformations and experimental constraints are already known? These numbers are author-reported, not independently verified here.
2. **Connect to experiments (60 s).** RCSB1UAO entity1 exactly matches GYDPETGTWG and identifies chemical synthesis. Its downloaded coordinates contain18 NMR models. Follow its explicit BMRB5694 link: same sequence,57 proton chemical shifts and16 coupling constants. This provides a reference ensemble and observables, not a folding trajectory.
3. **Expand to a related variant (45 s).** RCSB2RVD (NMR, previously verified) and5AWL (X-ray entry and sequence retrieved now) describe CLN025, YYDPETGTWY. Terminal Gly→Tyr substitutions distinguish it from original chignolin. This is a scientific comparison opportunity, not an identity crosswalk.
4. **Inspect a simulation deposit (60 s).** Figshare13858898, titled “Chignolin Simulations,” explicitly describes CLN025. Metadata reports ACEMD, CHARMM22*, TIP3P,350K,3744 adaptive-sampling production runs of50ns each,187.2µs aggregate. It lists a1,408,223,063-byte tar.gz with MD5, DOI andCCBY4.0 license. That is not one continuous187.2µs trajectory; archive contents and integrity have not been independently checked.
5. **Follow the ensemble-method question (60 s).** PLUMED-NEST21.014 links input examples, a Zenodo archive and Paissoni/Camilloni2021. Retrieved primary-paper methods also start from CLN0255AWL at340K. The study investigates folded, misfolded and unfolded states, sampling uncertainty and metainference using synthetic SAXS restraints. The input preview exposes collective variables, bias and output controls. We can inspect methodology before downloading trajectories.
6. **End with questions, not a folding claim (30 s).** How do the two terminal substitutions affect populations? How do temperature and force field change the result? Which experimental observables discriminate conformations? What weighting and uncertainty analysis are required before interpreting simulated populations?

## Retrieved simulation evidence

| Source | What was actually read | Reusable material advertised | Important distinction |
|---|---|---|---|
| Figshare DOI10.6084/m9.figshare.13858898.v1 | Article JSON: description, authors,license,files,size,MD5,reference | chignolin_trajectories.tar.gz,1.408GB | CLN025,350K,adaptive sampling; metadata only |
| PLUMED plumID21.014 | Landing metadata, annotated plumed_ME2.dat, linked primary paper full XML | Six input previews; PLUMED-NEST_chignolin.zip on Zenodo10880520 | “Experimental” restraints are synthetic SAXS |
| RCSB5AWL | Entry and polymer entity JSON | Experimental crystal structure of CLN025 | Sequence YYDPETGTWY; related to exact chignolin |
| MDPosit IRB node | Official GitHub homepage, node API Swagger schema, two executed name searches | REST routes for projects, structures, references, files, analyses and trajectories | chignolin andCLN025 searches returned zero at this node only |
| MDRepo | Landing/metadata pages and primary paper PMC11701643 | Paper documents interactive search, individual downloads,CLI batch transfer and metadata | Pages retrieved asJS shells; no peptide dataset established |

PLUMED paper: DES-amber with dispersion-adjustedTIP4P for its first simulations; amber99sb-ildn/TIP3P for SAXS-driven simulations. Its synthetic SAXS target comes from a40µs reference simulation, deliberately separating method tests from real experimental/forward-model errors. It reports sampling and effective-frame limitations. These are published results, not computations reproduced here.

The actual ME2 input preview uses MOLINFO with template.pdb, whole-molecule reconstruction, backbone/contact collective variables, radius of gyration, antiparallel-beta content and METAD with ARG=cmap,rg; BIASFACTOR=10; PACE=200. It writes back,cmap,rg,hh,mm.bias toCOLVAR. This shows an inspectable operational bridge from a scientific question to stored simulation setup. The full Zenodo archive was not fetched; both its API and landing page returned403.

MDPosit is node software within the MDDB federation. The guessed mdposit.org address failed; discovery recovered via the literature and the official mmb-irb/MDposit-client-build repository, whose homepage is irb.mddbr.eu. Swagger supplied the versioned base and search semantics. Actual queries:
- https://irb.mddbr.eu/api/rest/v1/projects?search=chignolin&limit=10&page=1
- https://irb.mddbr.eu/api/rest/v1/projects?search=CLN025&limit=10&page=1

Both returned filteredCount0 and projects[]. This does not establish absence from other nodes or deposits. MDRepo's paper documents token-based CLI transfer for batches and direct individual downloads; no authenticated operation was attempted.

## Productive follow-ups

- Compare experimental chignolin and CLN025 structural features before attributing effects to the two substitutions. Do not infer an equilibrium population from the number of deposited NMR models.
- If predicted coordinates become available, align matching atoms to relevant experimental conformers; check sequence,terminal chemistry and solution conditions first.
- For simulation populations, inspect topology,force field,temperature,replicate design and weighting. Adaptive/biasing methods require method-specific analysis; raw frame fractions and transition counts need care.
- Use genuine NMR measurements for an experimental-validation question. The PLUMED synthetic SAXS example supports a controlled methodological question.
- Ask which missing metadata would change reuse decisions before authorizing a large download.

## Memory and limits

The user supplied the simulation leads and corrected the task framing. This is human-guided extension, not a demonstration of autonomous discovery or generalized learning. A local wiki search/read retrieved the proposed schema-meaning-versus-endpoint-usage lesson. Its distinction between documented capability and observed response applies to the MD APIs. No causal benefit of that consultation was measured.

Candidate experiential patterns are preserved in receipt.json with candidate-not-generalized status, not promoted into validated wiki instructions. Actual source metadata and tool operations are also there. The earlier exact-peptide evidence remains in ../chignolin-20260924/. These saved projections are the offline rehearsal fallback; resident source handles are not durable files.

## Public sources

- [Chris's public wiki account](https://github.com/chrissweet/codex-llm-wiki-test/wiki/Chignolin-AlphaFold-Prediction)
- [Chignolin1UAO](https://www.rcsb.org/structure/1UAO), [BMRB5694](https://bmrb.io/data_library/summary/index.php?bmrbId=5694)
- [CLN0255AWL](https://www.rcsb.org/structure/5AWL)
- [Figshare deposit](https://figshare.com/articles/dataset/Chignolin_Simulations/13858898), [machine-readable metadata](https://api.figshare.com/v2/articles/13858898)
- [PLUMED21.014](https://www.plumed-nest.org/eggs/21/014/), [input preview](https://www.plumed-nest.org/eggs/21/014/data/PLUMED-NEST_chignolin/Part1_MetaD_PBMetaD/plumed_ME2.dat.html)
- [Paissoni/Camilloni2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8187852/)
- [MDPosit software](https://github.com/mmb-irb/MDposit-client-build), [IRB API](https://irb.mddbr.eu/api/rest/docs/)
- [MDRepo paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC11701643/)

No slides changed or publication performed.

