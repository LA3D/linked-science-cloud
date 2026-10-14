# Fabry protein extension checkpoint

The 2026-09-25 live checkpoint started from the retained complete Fabry graph, followed HGNC:4296 to human UniProt P06280, ran source-documented remote SPARQL, and inspected experimental/predicted structure metadata and a specific Reactome reaction. Local joins demonstrate HGNC normalization and shared GO:0004557 semantics.

See the [evidence chain and demonstration](../../artifacts/scientific-inspections/fabry-protein-extension-20260925/README.md) and [machine receipt](../../artifacts/scientific-inspections/fabry-protein-extension-20260925/checkpoint.json). VoID timed out and direct Rhea RDF returned 403; failures remain explicit. No coordinate analysis or new biological inference was performed. Work stops at the checkpoint.

Follow-up [Rhea diagnostic](../../artifacts/scientific-inspections/fabry-protein-extension-20260925/rhea-diagnostic/README.md): curl reproduced the website 403 with Cloudflare challenge headers; source-documented Rhea SPARQL succeeded in the actual project REPL, returning reaction 21112 and four ChEBI participants. Original RDF route validity remains unknown. No infrastructure changes were made.
