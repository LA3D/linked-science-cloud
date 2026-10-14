# Fabry opening demo: from GLA to reaction chemistry

**Demo question:** “For the human GLA protein implicated by our Fabry record, which curated reactions does UniProt annotate, and which substrates and products does Rhea identify?”

**Verified live:** the bounded UniProt–Rhea SERVICE federation returned **8 participant rows in 0.888 seconds** on 2026-09-27. It starts with the previously verified human **GLA/P06280**, not an unrelated biological example. `query.rq` is the exact successful query, `saved-result.json` is its complete raw response, and `replay.js` runs it with an explicitly labeled saved fallback.

## Answer

UniProt links GLA to two direction-neutral reaction records and specifies their physiological directional forms. The query checks Rhea's `Approved` status and `directionalReaction` relationship, then reads roles from `rh:substrates` and `rh:products`:

| Reaction → physiological form | Role | Participant | ChEBI |
|---|---|---|---|
| 21112 → **21113** | substrate | Gb3Cer with a d18:1(4E) sphingoid base | **18313** |
| 21112 → **21113** | substrate | water | 15377 |
| 21112 → **21113** | product | corresponding lactosylceramide class | 17950 |
| 21112 → **21113** | product | D-galactopyranose | 4139 |
| 48020 → **48021** | substrate | broader Gb3Cer class | **88154** |
| 48020 → **48021** | substrate | water | 15377 |
| 48020 → **48021** | product | broader lactosylceramide class | 79208 |
| 48020 → **48021** | product | D-galactopyranose | 4139 |

The physiological equations read **Gb3Cer + water → lactosylceramide + D-galactose**. Exact source names and equation strings are retained in the raw rows; the table abbreviates the long lipid names. The two records differ in chemical-class specificity. They are not two successive pathway steps, and their different ChEBI identifiers should not be collapsed without an explicit semantic relation.

## How the federation works

The [saved DisMech Fabry graph](../fabry-full-graph-20260925/README.md) identified the alpha-galactosidase deficiency mechanism and HGNC:4296; the [previous extension](../fabry-protein-extension-20260925/README.md) verified its link to P06280. That evidence supplies the starting protein.

The query is an explicit adaptation of the Rhea participant/protein join in [published UniProt example 49](https://sparql.uniprot.org/.well-known/sparql-examples/?offset=43). UniProt's local patterns select P06280, human taxon 9606, its catalytic-activity annotations, their general reaction links and physiological-reaction links. The `SERVICE <https://sparql.rhea-db.org/sparql>` block returns Rhea chemistry. Shared `?reaction` and `?physiologicalReaction` IRIs join the two sources in one query at the UniProt coordinator.

The direction predicate belongs to the **annotation**, not the catalytic-activity object. Before writing this adaptation, the saved UniProt RDF and a current ontology query verified its `Catalytic_Activity_Annotation` domain; Rhea probes verified that directional reaction 21113 links to substrate and product sides. Roles come from those explicit predicates, not from guessing that a `_L` suffix always means substrate.

The query first ran without explicit Rhea reaction VALUES and hit the 45-second broker deadline. The successful revision puts both verified reaction/direction pairs inside SERVICE, retaining the UniProt joins. This is a snapshot-bound query-planning aid, not a fabricated answer or a LIMIT. All eight rows for those pairs were returned. Refresh the mapping probe if presenting against a later source release; this bound would not automatically discover newly added GLA reactions.

One mediated HTTP request containing SERVICE was sent to UniProt, which coordinates Rhea access. This demonstrates server-side federation; it is not sequential API retrieval with a local manual join. The source probes were preparation, not substitutes for the successful federation.

## What it adds to the Fabry example

DisMech already describes reduced alpha-galactosidase activity and Gb3/lyso-Gb3 accumulation and already names **CHEBI:18313**. This federation adds queryable reaction identifiers, explicit physiological direction, substrate/product roles, water and product identifiers, and the distinction between specific and broader lipid classes. It links existing disease evidence to curated normal-enzyme chemistry.

The prior Fabry extension already retrieved reaction 21112 participants and UniProt/Reactome annotations separately. The incremental demonstration here is their **successful federated join with explicit directional roles**, including the second chemical-class representation. It is not a newly discovered Fabry mechanism. The query does not measure patient enzyme activity, tissue flux, variant severity, or lyso-Gb3 turnover; disease consequences remain separately attributed to DisMech.

## Five-minute delivery

1. **0:00–1:00:** show the existing Fabry deficiency mechanism → HGNC:4296 → P06280 chain and ask the demo question.
2. **1:00–2:00:** show the UniProt patterns and Rhea SERVICE block, emphasizing shared reaction IRIs and the explicit two-pair bound.
3. **2:00–3:00:** run `replay.js`; show its live/saved status and the eight readable rows. The captured live execution took under a second; future availability is not guaranteed.
4. **3:00–4:00:** focus on CHEBI:18313 as substrate, then its products. Explain why direction matters and why the two lipid classes stay distinct.
5. **4:00–5:00:** connect the normal hydrolysis step to the separately sourced disease account, then ask: **“Which cell-specific Fabry mechanisms in our DisMech graph are linked to accumulation of this substrate, and what evidence supports those links?”** That is the next question, not an inference already answered by this query.

## Artifacts and limits

`runs/` and `queries/` preserve four source/schema probes, the timeout and the successful bounded query. `receipt.json` includes the endpoint, timing, hashes, source lineage and all eight rows; successful source resources have independent broker artifacts and receipts. `validation.json` records integrity checks. The replay retains full results and shows a clear **SAVED FALLBACK** message if the live request fails.

The participant path here is `rh:compound/rh:chebi`, confirmed for both returned reactions. It is not a universal extractor for reactive parts of macromolecules or polymers. Stoichiometric coefficients, evidence qualifiers and ontology closure were not retrieved. Bgee is out of scope. No infrastructure or slides were changed.
