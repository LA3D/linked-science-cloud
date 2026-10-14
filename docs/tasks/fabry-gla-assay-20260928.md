# Fabry GLA quantitative assay continuation

Verified route: UniProt P06280 REST JSON explicitly links ChEMBL CHEMBL2524; target API identifies human alpha-galactosidase A, single protein, component P06280. Initial unfiltered assays included plant/fungal systems; filter assay_organism=Homo sapiens and confidence_score=9 before selection.

ChEMBL assay CHEMBL831670: inhibitory concentration against human alpha-galactosidase; single protein format, direct protein target assigned. Activity 1405782 for MIGALASTAT / CHEMBL110458 reports IC50 relation =, original 0.07 uM, standardized 70.0 nM, no data-validity flag. Source: Biological properties of D- and L-1-deoxyazasugars (2005), DOI 10.1021/jm0495881, PMID 15771446. ChEMBL category B/Binding does not change the measured endpoint into a Kd: the description and measurement specify inhibition potency. No turnover, cellular rescue, patient biomarker, clinical benefit or severity claim. Substrate/pH/construct conditions were not established from the inspected API record; paper full text not inspected.

Actual interface: broker-mediated REST JSON, not SPARQL federation. Six bounded source responses were retained/materialized. The receipt includes source URLs, hashes and resource receipts, target/assay mapping and the full selected activity.

[Receipt and saved response references](../../artifacts/scientific-inspections/fabry-gla-assay-20260928/receipt.json).

Thirty-second demo: normal GLA chemistry connects to an experimentally measured compound effect. Show target accession/species, assay description, then IC50 = 70 nM with the compound and publication. Explain that this is concentration-dependent inhibition in the specified assay, not disease severity or evidence of therapeutic rescue.

Live bindings: glaAssayWs, glaAssayTarget, glaHumanAssays, glaAssayExample, glaAssayResources, glaAssaySaved. Bounded display: nodeRepl.write({assay:glaAssayExample.assay_chembl_id,compound:glaAssayExample.molecule_pref_name,type:glaAssayExample.standard_type,relation:glaAssayExample.standard_relation,value:glaAssayExample.standard_value,units:glaAssayExample.standard_units}). Offline fallback: read receipt.json or its materialized activities JSON; do not claim saved output is a fresh retrieval. Exact REST requests are recorded in each artifact's source exchange.
