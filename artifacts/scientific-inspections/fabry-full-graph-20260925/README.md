# Complete Fabry record plus selected CL/Uberon axioms

**Checkpoint completed in the actual Linked Science REPL.** The entire DisMech Fabry record was loaded as schema-driven RDF using LinkML's RDFLibDumper with an explicitly documented local adapter. The unmodified standard dumper was not sufficient in this environment. Source assertions, application link resolution and two ontology excerpts are separate resident graphs. No new biological inference or full OWL entailment is claimed.

## What actually loaded

Workspace `fgWs`, context `fabry-full-graph-20260925`, authoritative project MCP `cleanroom_node_repl`, saved checkout `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`.

| Binding | Handle | Role | Triples |
|---|---|---|---:|
| `fgGraphs.disease` | `h-000028` | Complete schema-driven disease instance conversion | 2,834 |
| `fgGraphs.links` | `h-000029` | Application-only exact-name causal target resolution and mechanism names | 65 |
| `fgGraphs.cl` | `h-000030` | CL named-parent/label/definition excerpt | 154 |
| `fgGraphs.uberon` | `h-000031` | Uberon named-parent/label/definition excerpt | 141 |

The disease graph contains 16 Pathophysiology objects, 49 CausalEdge objects, 175 EvidenceItem objects and 80 distinct Term IRIs. The complete source includes more than pathophysiology: phenotypes, subtypes, hypotheses, biochemical/genetic information, treatments, models, datasets, notes, definitions, mappings and references were passed through the same conversion. Complete files and query results remain outside the prompt; handles last only for the live workspace epoch.

## Source and schema provenance

The full [Fabry YAML](https://raw.githubusercontent.com/monarch-initiative/dismech/090fcc12aafac22e5e2b8454aab44ce6735579cb/kb/disorders/Fabry_Disease.yaml), [LinkML schema](https://raw.githubusercontent.com/monarch-initiative/dismech/090fcc12aafac22e5e2b8454aab44ce6735579cb/src/dismech/schema/dismech.yaml), generated Python datamodel and all 14 classification imports were retrieved through the private broker at DisMech commit **090fcc12aafac22e5e2b8454aab44ce6735579cb**. Commit metadata was checked separately; its Git tree is `1925dee9d43850697fff5f08f27aa823ffcec612`. The Fabry bytes match the earlier checkpoint: SHA-256 `9c804539eb3e6a465ec341a7d18399a07576988a2e9305cc0be6b4c19fcbacbc`.

Inspected `pyproject.toml`, `justfile`, `project.justfile`, `config.yaml` and schema/datamodel sources. The build uses `gen-project`/`gen-pydantic` for models and `gen-owl` for the **schema ontology**. That OWL output is not disease instance data, and was not used as such. The loaded schema includes 151 classes and 467 slots. `linkml:types` resolved from the local LinkML runtime; no online import fetch was used during conversion.

`inputs.json` and `checkpoint.json` contain acquisition paths, source URLs and broker receipt paths; `commit-metadata.json` confirms revision identity. All 27 resources in the checkpoint manifest passed SHA-256 verification. The later commit metadata has its own receipt.

## Conversion method and genuine limitations

There was no installed `linkml-convert` CLI. Existing cached `linkml-runtime` 1.8.3 was usable with the bundled Python 3.12.14 and RDFLib 7.1.0. DisMech requests runtime >=1.9.4, so this is **not** a claim of conformance with its current supported runtime. No package was installed, and no shared runtime or repository infrastructure was changed.

The upstream generated `Disease` dataclass loaded the complete YAML. The unmodified `RDFLibDumper` failed because names lacked a base, names with spaces produced invalid IRIs, and a string enum triggered an attribute error. `convert.py` subclasses that actual LinkML dumper and still uses schema-induced class/slot mappings throughout. It applies these explicit checkpoint-local adaptations:

1. Encode `name` identifiers under `https://example.org/fabry-checkpoint/name/`. This is a local namespace, not an official DisMech identifier. No name-identifier collisions were found in this record.
2. Handle string-valued enums using the schema's declared values/meanings. The source's `phase: Onset` is not a declared PhaseTerm value in this schema and is preserved as a flagged literal, not silently accepted as validated.
3. Preserve scalar union values that the older dumper tries to treat as identifier-less objects as literals, including prevalence quantities and frequency strings. Their detailed enum/union semantics are not fully normalized by this adapter. Every occurrence is listed in `adapterAnomalies`.
4. Replace 363 generated blank nodes with source-path-based local IRIs after conversion so that independently loaded application links address the same edge objects. The raw LinkML serialization and `skolem-map.json` are retained.

This is **adapted schema-driven output**, not an unmodified upstream RDF export and not the earlier handcrafted renal projection. The adapter does not modify the source schema. It is a checkpoint artifact, not a production exporter.

The source has 1,984 scalar leaves. The typed representation retains all of them unchanged; its one additional scalar is serialization type metadata. A recursive audit checked 2,527 field occurrences against schema-induced emitted triples or identifier IRIs, with zero failures. All 175 evidence snippets and references are represented. `field-audit.json` is the full witness. RDF treats repeated identical statements as sets and does not preserve YAML list order; the original YAML, typed JSON and field paths preserve those aspects. This is not a claim of a lossless ordered YAML→RDF→YAML round trip or complete schema validation.

Nested terms follow the schema shape, e.g. `dm:cell_types` → `CellTypeDescriptor` → `dm:term` → `obo:CL_0000653`. `Term.id` determines an IRI, rather than becoming an `id` literal. Evidence `reference` stays a literal such as `PMID:27129690`, because the schema's PMID type is an `xsd:string`; no undocumented conversion to a PubMed IRI was introduced. Ontology term references are not observations of individual cells or organs.

## Causal targets

The schema defines `CausalEdge.target` as a **string**, so the generated disease graph preserves the literal target name. It does not natively create an edge to the target mechanism. The separate application graph adds `app:resolvedTarget` only for an exact unique match in the same disease record among pathophysiology, phenotypes and biochemical nodes. All **49/49** targets resolve. Two would have been missed by checking mechanisms/phenotypes alone: `Lyso-Gb3` and `Renal Globotriaosylceramide Inclusions` are biochemical nodes.

This name-resolution join is not an inferred causal claim. Original edge descriptions, causal-link types, intermediate mechanisms and edge-level evidence remain in the disease graph. Application links do not strengthen them. The complete target audit is in `conversion-report.json`.

## Ontology modules and scope

Retrieved official [CL basic OBO](https://purl.obolibrary.org/obo/cl/cl-basic.obo) (3,347,518 bytes; release header `cl/releases/2026-06-08/cl-basic.owl`) and [Uberon basic OBO](https://purl.obolibrary.org/obo/uberon/basic.obo) (12,078,648 bytes; release header `uberon/releases/2026-06-19/uberon-basic.owl`). The complete release files are saved with broker receipts, but **only selected excerpts are loaded into the RDF workspace**.

The documented selection takes all eight distinct CL and all eight distinct UBERON term IDs supplied in the full disease record, then recursively follows named `is_a` parents, with a 400-class cap per ontology. No seed or parent was missing. CL: 36 classes and 46 subclass axioms; Uberon: 34 classes and 40 subclass axioms.

`ontology-excerpts.py` maps OBO `id`, `name`, `def` and `is_a` to OWL class declarations, RDFS labels, IAO definitions and RDFS subclass triples. It is an explicit limited OBO-to-RDF mapper, not a full OWL parser. Exact selected stanzas and release headers are retained. Synonyms, xrefs, property values, relationships such as `part_of`/`develops_from`, and other annotations are **not** mapped into these excerpts; omitted tag counts are recorded in `ontology-report.json`. Thus the loaded excerpts contain real named hierarchy axioms, but no relationship restrictions, import closure or full source-ontology semantics. Definition provenance annotations remain in raw stanzas rather than OWL axiom annotations. OLS term metadata was inspected during route discovery; the loaded axioms came from the official basic release files.

## Demonstrated local queries

All queries ran through `fgWs.query.run` in the actual project REPL; results are retained in `fgResults` and fully saved in `query-results.json`.

- `renal.rq` joins disease mechanism → nested cell/location term → ontology label/subclass and mechanism evidence. It returns four rows: two supporting references crossed with podocyte's two named parents. Example: **renal glycosphingolipid storage and podocyte injury → podocyte → renal filtration cell; location kidney; PMID:27129690, SUPPORT**, with its exact biopsy quotation retained. The other parent is **epithelial cell of glomerular capsule**; the second reference is PMID:36334424. Four rows are not four independent evidence items.
- `kidney.rq` returns kidney's three named parents: **cavitated compound organ**, **abdomen element**, and **lateral structure**.
- `causal.rq` follows the renal mechanism's six downstream edges through the separate resolved-target links and retrieves edge-level references. Example: **Autophagy impairment**, typed Pathophysiology, with PMID:39100494. This is distinct from the parent mechanism's human-biopsy evidence.
- `resolution.rq` counts **49 CausalEdge objects and 49 resolved targets** in the loaded graphs. `counts.rq` enumerates all 44 emitted RDF types.

These are joins over assertions and selected ontology axioms, not reasoning or clinical conclusions. The previous small Eyeron test did not load ontology axioms; this checkpoint adds ontology context but does not rerun or extend that inference rule.

## Replay and files

From the saved checkout, with the already available dependencies:

```sh
/Users/cvardema/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 artifacts/scientific-inspections/fabry-full-graph-20260925/convert.py
/Users/cvardema/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 artifacts/scientific-inspections/fabry-full-graph-20260925/ontology-excerpts.py
```

Then run `replay-load.js` in the project `cleanroom_node_repl`; it opens a distinct replay workspace, loads the four local RDF files, and runs the saved queries. The scripts contain local machine paths; resolved package paths/versions and file checksums are saved. Full source, schema and imports are copied into this checkpoint directory; public acquisition URLs and original receipt paths remain in the manifests. `fabry-linkml-raw.ttl` is the pre-skolem output; `fabry-generated.ttl` is the normalized instance graph actually loaded. `application-links.ttl` remains separate. `file-manifest.json` checksums replay inputs and outputs.

No worktree, branch switch, dependency installation, infrastructure repair, slide edit, global configuration change, external mutation, commit, or session reset occurred. Stop after this checkpoint.
