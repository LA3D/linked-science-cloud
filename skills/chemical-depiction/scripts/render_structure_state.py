#!/usr/bin/env python3
"""Render validated science-tools molecule state to fail-closed static SVG."""

from __future__ import annotations

import argparse
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from rdkit import Chem, rdBase
from rdkit.Chem import rdDepictor
from rdkit.Chem.Draw import rdMolDraw2D


STATE_SCHEMA = "science-tools.chemical-structure-state.v0"
RECEIPT_SCHEMA = "science-tools.chemical-depiction-receipt.v0"
SVG_WIDTH = 320
SVG_HEIGHT = 240
FORBIDDEN_TAGS = {
    "animate",
    "animatemotion",
    "animatetransform",
    "embed",
    "feimage",
    "foreignobject",
    "iframe",
    "image",
    "object",
    "script",
    "set",
    "style",
}
REFERENCE_ATTRIBUTES = {"href", "src"}


class DepictionError(ValueError):
    """A stable, user-facing depiction failure."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def _local_name(name: str) -> str:
    return name.rsplit("}", 1)[-1].lower()


def validate_svg_for_display(svg: str) -> None:
    lowered = svg.lower()
    if "<!doctype" in lowered or "<!entity" in lowered:
        raise DepictionError("unsafe-svg", "SVG declarations may not define DTDs or entities.")

    try:
        root = ET.fromstring(svg)
    except ET.ParseError as error:
        raise DepictionError("invalid-svg", f"RDKit returned malformed SVG: {error}.") from error

    if _local_name(root.tag) != "svg":
        raise DepictionError("invalid-svg", "Rendered document root is not SVG.")

    for element in root.iter():
        tag = _local_name(element.tag)
        if tag in FORBIDDEN_TAGS:
            raise DepictionError("unsafe-svg", f"Forbidden SVG element: {tag}.")
        for raw_name, raw_value in element.attrib.items():
            name = _local_name(raw_name)
            value = raw_value.strip().lower()
            if name.startswith("on"):
                raise DepictionError("unsafe-svg", f"Event-handler attribute is forbidden: {name}.")
            if name in REFERENCE_ATTRIBUTES and value:
                raise DepictionError("unsafe-svg", f"Reference attribute is forbidden: {name}.")
            if (
                "url(" in value
                or "@import" in value
                or "data:image" in value
                or "javascript:" in value
            ):
                raise DepictionError("unsafe-svg", f"External or embedded reference in {name}.")


def _require_int(payload: dict[str, Any], key: str) -> int:
    value = payload.get(key)
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        raise DepictionError("invalid-state", f"structure.{key} must be a nonnegative integer.")
    return value


def validate_and_render(state: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    if state.get("schema") != STATE_SCHEMA:
        raise DepictionError("invalid-state", f"Expected state schema {STATE_SCHEMA}.")

    input_state = state.get("input")
    structure = state.get("structure")
    provenance = state.get("provenance")
    if not isinstance(input_state, dict) or input_state.get("format") != "smiles":
        raise DepictionError("invalid-state", "input must contain a SMILES value.")
    if not isinstance(input_state.get("value"), str):
        raise DepictionError("invalid-state", "input.value must be a string.")
    if not isinstance(structure, dict) or not isinstance(provenance, dict):
        raise DepictionError("invalid-state", "structure and provenance objects are required.")

    canonical_smiles = structure.get("canonicalSmiles")
    if not isinstance(canonical_smiles, str) or not canonical_smiles:
        raise DepictionError("invalid-state", "structure.canonicalSmiles must be nonempty.")
    expected_atom_count = _require_int(structure, "atomCount")
    expected_bond_count = _require_int(structure, "bondCount")

    with rdBase.BlockLogs():
        molecule = Chem.MolFromSmiles(canonical_smiles, sanitize=True)
    if molecule is None:
        raise DepictionError("invalid-state", "Canonical SMILES cannot be parsed by RDKit.")
    if molecule.GetNumAtoms() != expected_atom_count or molecule.GetNumBonds() != expected_bond_count:
        raise DepictionError("state-mismatch", "Canonical SMILES does not match recorded counts.")

    rdDepictor.Compute2DCoords(molecule, canonOrient=True, clearConfs=True)
    drawer = rdMolDraw2D.MolDraw2DSVG(SVG_WIDTH, SVG_HEIGHT)
    drawer.DrawMolecule(molecule)
    drawer.FinishDrawing()
    svg = drawer.GetDrawingText()
    validate_svg_for_display(svg)

    receipt = {
        "schema": RECEIPT_SCHEMA,
        "structureState": state,
        "depiction": {
            "format": "image/svg+xml",
            "width": SVG_WIDTH,
            "height": SVG_HEIGHT,
            "sanitized": True,
        },
        "provenance": {
            "renderer": {
                "name": "RDKit rdMolDraw2D.MolDraw2DSVG",
                "version": rdBase.rdkitVersion,
            },
            "sanitizer": {
                "name": "science-tools static SVG safety check",
                "version": "0.1.0",
            },
        },
    }
    return svg, receipt


def _load_state(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise DepictionError("invalid-state", f"Cannot read structure state: {error}.") from error
    if not isinstance(payload, dict):
        raise DepictionError("invalid-state", "Structure state must be a JSON object.")
    return payload


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render science-tools structure state as sanitized static SVG."
    )
    parser.add_argument("--state", type=Path, required=True, help="Structure-state JSON path")
    parser.add_argument("--svg-output", type=Path, required=True, help="SVG output path")
    parser.add_argument("--receipt-output", type=Path, help="Receipt JSON path; stdout when omitted")
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    try:
        state = _load_state(args.state)
        svg, receipt = validate_and_render(state)
        args.svg_output.write_text(svg, encoding="utf-8")
        rendered_receipt = json.dumps(receipt, indent=2, sort_keys=True) + "\n"
        if args.receipt_output is None:
            sys.stdout.write(rendered_receipt)
        else:
            args.receipt_output.write_text(rendered_receipt, encoding="utf-8")
    except DepictionError as error:
        print(
            json.dumps(
                {"error": {"code": error.code, "message": str(error)}},
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        return 2
    except OSError as error:
        print(
            json.dumps(
                {"error": {"code": "output-write-failed", "message": str(error)}},
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

