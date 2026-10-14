# PubChem RDF continuation of the GLA assay demo

Actual broker-mediated SPARQL to https://qlever.dev/api/pubchem returned two descriptor rows. PubChem/NCBI publishes the data; QLever hosts this query service (UI credits QLever Authors and University of Freiburg). Snapshot release not established.

Graph crosswalk: SID103329495 CHEMINF_000477 CID176077; the same substance rdfs:seeAlso CHEMBL110458. CHEMINF_000477 is labeled has PubChem normalized counterpart. No direct CID-to-ChEMBL owl:sameAs claim. Local JavaScript equality matched this ChEMBL molecule IRI to the already retrieved GLA activity; this continuation is not SERVICE federation.

CID176077: formula C6H13NO4 (CHEMINF_000335); molecular weight 163.17 (CHEMINF_000334), unit UO:0000055 labeled molar mass unit. Descriptor labels identify calculation by PubChem software; exact software version and per-value date not retrieved. RDF provides only a generic unit class, so this result alone does not establish explicit g/mol. These are calculated chemical properties, not experimental assay measurements. CID11644097 is distinct: C6H14ClNO4 and two covalent units, versus one for CID176077.

[Saved results and provenance](../../artifacts/scientific-inspections/fabry-pubchem-20260928/receipt.json). Adjacent demo.rq is the tested two-row query; form.rq checks chemical forms. Existing bindings pcDemoWs, pcResults.demo, pcPages.demo. Safe display: nodeRepl.write(pcPages.demo.rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v?.value??null])))). Use saved receipt offline; future traversal replay performs new public reads.
