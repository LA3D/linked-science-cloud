# Five-minute opening demo: cholesterol chemistry to human proteins

**Superseded demo selection:** the user clarified that Fabry must stay central. Use [the GLA federation demo](../../fabry-gla-federation-20260927/README.md); retain this cholesterol result only as prior evidence.

**Question:** Which human proteins are annotated to catalyze reactions involving cholesterol, and which Ensembl genes encode them?

Use one already-verified **UniProt + Rhea SERVICE federation**. It ran through the actual Linked Science REPL on 2026-09-27 in **13.087 seconds**, returning **355 rows, 178 protein IRIs and 55 reaction IRIs**. No Bgee dependency. The exact query and its single saved-result fallback are in this folder.

This is an explicit adaptation of [published UniProt example 49](https://sparql.uniprot.org/.well-known/sparql-examples/?offset=43): remove Bgee's block and expression projections, and replace the original N-acylsphingosine class with source-verified cholesterol CHEBI:16113. Unused prefixes are retained so the file matches the query already tested. It is not represented as the unchanged published example.

## Walkthrough

**0:00–0:45 — Pose the question.** “We know a molecule, cholesterol. Can we connect reaction chemistry to the human proteins and genes involved?” Show CHEBI:16113. Keep this as a question about source annotations, not a complete inventory of cholesterol physiology.

**0:45–1:30 — Show the query's two parts.** The `SERVICE <https://sparql.rhea-db.org/sparql>` block finds reactions whose participants are cholesterol or members of its asserted subclass closure. The remaining patterns at UniProt select human proteins and follow catalytic annotations to those same reactions, then follow cross-references to Ensembl genes.

**1:30–2:15 — Execute `replay.js` in the project REPL.** It sends one query to UniProt. UniProt executes the Rhea SERVICE request and joins the results. This is real remote federation, not sequential API retrieval followed by a hand-built table. The prior run completed in 13.1 s; the replay uses a 45-second deadline. If it fails, the output explicitly says **SAVED RESULT**, using the captured JSON. Never describe that fallback as a successful live run.

**2:15–3:15 — Inspect three rows, keep all results retained.** The captured result includes:

| Human protein | Rhea reaction | Ensembl gene |
|---|---|---|
| P22680 — CYP7A1 / Cytochrome P450 7A1 | RHEA:21812 | ENSG00000167910.4 |
| P35610 | RHEA:17729 | ENSG00000057252.14 |
| Q9Y6A2 | RHEA:22716 | ENSG00000036530.10 |

The CYP7A1 name was verified separately in UniProt; the federated query itself returns IRIs, not names. The 355 rows are chemical/reaction/protein/gene combinations; they are not 355 different proteins. No reviewed-only filter is applied.

**3:15–4:15 — Explain the join.** Rhea and UniProt use the same reaction IRI, for example `http://rdf.rhea-db.org/21812`. The shared `?reaction` variable joins chemical participation to the protein's catalytic annotation. Ensembl gene IRIs come from UniProt's `rdfs:seeAlso/up:transcribedFrom` path. There is no Bgee join and no need to strip Ensembl versions for this two-source question.

**4:15–5:00 — Make the follow-up concrete.** Select CYP7A1/P22680 and RHEA:21812. The next scientific question is: “What exact transformation is annotated, and is cholesterol on the substrate or product side?” Follow the returned reaction IRI to its equation and participants, then inspect the protein's catalytic evidence. This is a proposed follow-up, not a claim that coordinate analysis, flux measurement or new mechanistic inference has been done.

## What this demonstrates

Shared identifiers make independently curated chemistry and protein annotations queryable together. Full results stay in REPL state or the saved JSON, while the audience sees three readable examples. The current query does not distinguish consumed from produced cholesterol, filter reaction approval or protein review status, or establish tissue-specific activity.

`query.rq` is the tested query; `replay.js` is the single-cell live/fallback launcher; `saved-result.json` is the complete captured raw response; `receipt.json` records hashes, endpoint, timing and provenance. Packaging reused the verified run instead of repeating network requests. Future endpoint availability is not guaranteed by one successful test.
