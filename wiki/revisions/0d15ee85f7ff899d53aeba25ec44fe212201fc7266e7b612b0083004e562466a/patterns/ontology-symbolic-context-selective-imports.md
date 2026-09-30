---
{
  "schemaVersion": "1.0.0",
  "id": "ontology-symbolic-context-selective-imports",
  "title": "Resolve scientific terms in symbolic context and inspect relevant ontology imports",
  "lessonKind": "procedure",
  "status": "proposed",
  "validation": "candidate-not-generalized",
  "claim": "For opaque scientific identifiers, load authoritative ontology definitions into symbolic context, inspect labels, textual definitions and structural relationships, enumerate imports, and selectively follow dependencies relevant to the question. Record unloaded or unresolved dependencies; do not claim full import closure. Distinguish identifier families even when they share a namespace. Missing prose definitions may require inspecting parent properties rather than inventing meaning. PubChem's SIO and CHEMINF term resolution is a worked example of this general method. For reaction federation, inspect property domain and actual attachment before adapting examples: a physiological-reaction predicate may belong to the annotation rather than the catalytic-activity object. Verify direction and participant-role predicates from the source; do not turn left/right suffixes, undirected reaction IDs or subclass traversal into physiological direction. Keep specific and broader chemical classes distinct. In the Fabry trajectory, source inspection preceded joining GLA annotations to Rhea substrates/products.",
  "applicability": "Scientific schema exploration and ontology-driven query design across domains, particularly when identifiers are opaque or definitions depend on imported modules. Especially protein reaction chemistry, predicate domains, physiological direction and substrate/product ChEBI roles.",
  "competingExplanations": [
    "Successful resolution may depend on these ontologies' annotation coverage and organization.",
    "A task needing only a few known terms may be served by a smaller authoritative representation."
  ],
  "missingEvidence": [
    "One PubChem trajectory does not demonstrate transfer or causal advantage across other scientific tasks.",
    "Full recursive import closure and reasoning completeness were not established.",
    "No controlled comparison against alternatives to symbolic ontology inspection.",
    "Fabry adds a selected process example, not full Rhea/UniProt ontology closure or an independent transfer test."
  ],
  "revalidateWhen": "Source versions, ontology imports, dataset release, question scope or assay/identifier alignment changes.",
  "citations": [
    {
      "corpus": {
        "path": "artifacts/wiki-learning/corpus/pubchem-20260921.json",
        "sha256": "3bb81ff94d3779e7a7e06942c7c1ae72815e42e1fb562a52d77c9e1c401d7e68",
        "hashDomain": "file-bytes",
        "pointer": ""
      },
      "unitId": "ontology-method",
      "evidenceIds": [
        "schema",
        "sio",
        "cheminf",
        "uniprot",
        "assay",
        "local-query"
      ],
      "eventIds": [
        "event-6"
      ],
      "operationIds": [
        "op-000045"
      ]
    },
    {
      "corpus": {
        "path": "artifacts/wiki-learning/corpus/fabry-trajectory-20260927.json",
        "sha256": "88d9a3a5d15bfe7f145e82014922767afcdebd1513d7fa13def4f58c30d9b3ad",
        "hashDomain": "file-bytes",
        "pointer": ""
      },
      "unitId": "ontology-bounded-federation",
      "eventIds": [
        "event-1",
        "event-4",
        "event-5",
        "event-6",
        "event-7",
        "event-8",
        "event-9",
        "event-10"
      ],
      "evidenceIds": [
        "selected-trajectory",
        "predicate-probe",
        "bounded-result",
        "initial-timeout"
      ],
      "operationIds": []
    }
  ],
  "relations": {
    "supersedes": [],
    "contradicts": []
  }
}
---
# Resolve scientific terms in symbolic context and inspect relevant ontology imports

Status: **proposed**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.

## Observation

For opaque scientific identifiers, load authoritative ontology definitions into symbolic context, inspect labels, textual definitions and structural relationships, enumerate imports, and selectively follow dependencies relevant to the question. Record unloaded or unresolved dependencies; do not claim full import closure. Distinguish identifier families even when they share a namespace. Missing prose definitions may require inspecting parent properties rather than inventing meaning. PubChem&#39;s SIO and CHEMINF term resolution is a worked example of this general method. For reaction federation, inspect property domain and actual attachment before adapting examples: a physiological-reaction predicate may belong to the annotation rather than the catalytic-activity object. Verify direction and participant-role predicates from the source; do not turn left/right suffixes, undirected reaction IDs or subclass traversal into physiological direction. Keep specific and broader chemical classes distinct. In the Fabry trajectory, source inspection preceded joining GLA annotations to Rhea substrates/products.

## Applicability

Scientific schema exploration and ontology-driven query design across domains, particularly when identifiers are opaque or definitions depend on imported modules. Especially protein reaction chemistry, predicate domains, physiological direction and substrate/product ChEBI roles.

## Competing explanations

- Successful resolution may depend on these ontologies&#39; annotation coverage and organization.
- A task needing only a few known terms may be served by a smaller authoritative representation.

## Missing evidence

- One PubChem trajectory does not demonstrate transfer or causal advantage across other scientific tasks.
- Full recursive import closure and reasoning completeness were not established.
- No controlled comparison against alternatives to symbolic ontology inspection.
- Fabry adds a selected process example, not full Rhea/UniProt ontology closure or an independent transfer test.

## Revalidation

Source versions, ontology imports, dataset release, question scope or assay/identifier alignment changes.

## Evidence

- Corpus: artifacts/wiki-learning/corpus/pubchem-20260921.json (SHA-256 3bb81ff94d3779e7a7e06942c7c1ae72815e42e1fb562a52d77c9e1c401d7e68); unit: ontology-method; events: event-6; evidence: schema, sio, cheminf, uniprot, assay, local-query; operations: op-000045.
- Corpus: artifacts/wiki-learning/corpus/fabry-trajectory-20260927.json (SHA-256 88d9a3a5d15bfe7f145e82014922767afcdebd1513d7fa13def4f58c30d9b3ad); unit: ontology-bounded-federation; events: event-1, event-4, event-5, event-6, event-7, event-8, event-9, event-10; evidence: selected-trajectory, predicate-probe, bounded-result, initial-timeout; operations: none.
