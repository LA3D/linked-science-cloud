---
name: chemical-depiction
description: Render validated science-tools molecule state as sanitized static SVG with local RDKit. Use for inline-ready 2D chemical depiction; not for reactions, highlighting, browser chemistry runtimes, or proof of visible Canvas pixels.
---

# Chemical Depiction

Use this skill for the display-producing second half of the local 2D proof. It consumes `science-tools.chemical-structure-state.v0` JSON, reparses the canonical SMILES, verifies atom and bond counts, renders a fixed-size RDKit SVG, and accepts it only after the SVG safety check passes.

From the plugin root, run:

```sh
uv run --frozen python skills/chemical-depiction/scripts/render_structure_state.py \
  --state /tmp/aspirin-state.json \
  --svg-output /tmp/aspirin.svg \
  --receipt-output /tmp/aspirin-depiction.json
```

Treat the SVG as displayable only when the command succeeds and its receipt reports `sanitized: true`. The validator rejects scripts, event handlers, external references, embedded images, active foreign content, and animation elements. Canvas should display the finished SVG only; do not load RDKit or another chemistry runtime in the browser.

This slice does not render reactions or highlights, persist molecule state, fetch remote data, build a browser UI, or establish that a coordinator can see rendered Canvas pixels.

