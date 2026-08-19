---
name: rdkit-workbench
description: Parse bounded SMILES with local RDKit into validated machine-readable structure state. Use for molecule-state preparation in the science-tools 2D chemistry experiment; not for depiction, reactions, live lookups, or persistent sessions.
---

# RDKit Workbench

Use this skill for the chemistry-aware first half of the local 2D proof. It currently validates one SMILES and emits `science-tools.chemical-structure-state.v0` JSON containing the original input, canonical isomeric SMILES, atom and bond counts, and RDKit parser provenance.

From the plugin root, run the locked environment and helper:

```sh
uv run --frozen python skills/rdkit-workbench/scripts/smiles_to_structure_state.py \
  --smiles 'CC(=O)Oc1ccccc1C(=O)O' \
  --output /tmp/aspirin-state.json
```

Treat a nonzero exit or `invalid-smiles` error as a failed parse; do not invent structure state. Pass successful JSON unchanged to `$chemical-depiction`. Write state files only to a temporary or explicitly authorized artifact location.

This slice does not implement reaction state, editing operations, persistent handles, a Python REPL, or remote chemical data acquisition.

