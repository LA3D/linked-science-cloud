#!/usr/bin/env python3
"""Parse one bounded SMILES into the minimal science-tools structure state."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from rdkit import Chem, rdBase


STATE_SCHEMA = "science-tools.chemical-structure-state.v0"
MAX_SMILES_LENGTH = 512


class StructureStateError(ValueError):
    """A stable, user-facing structure-state failure."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def build_structure_state(smiles: str) -> dict[str, Any]:
    if not smiles or not smiles.strip():
        raise StructureStateError("invalid-smiles", "SMILES must not be empty.")
    if len(smiles) > MAX_SMILES_LENGTH:
        raise StructureStateError(
            "smiles-too-long",
            f"SMILES exceeds the {MAX_SMILES_LENGTH}-character experiment limit.",
        )

    with rdBase.BlockLogs():
        molecule = Chem.MolFromSmiles(smiles, sanitize=True)
    if molecule is None:
        raise StructureStateError(
            "invalid-smiles",
            "RDKit could not parse and sanitize the supplied SMILES.",
        )

    canonical_smiles = Chem.MolToSmiles(
        molecule,
        canonical=True,
        isomericSmiles=True,
    )
    return {
        "schema": STATE_SCHEMA,
        "input": {
            "format": "smiles",
            "value": smiles,
        },
        "structure": {
            "canonicalSmiles": canonical_smiles,
            "atomCount": molecule.GetNumAtoms(),
            "bondCount": molecule.GetNumBonds(),
        },
        "provenance": {
            "parser": {
                "name": "RDKit Chem.MolFromSmiles",
                "version": rdBase.rdkitVersion,
                "sanitization": "RDKit default sanitize=True",
            }
        },
    }


def _write_json(payload: dict[str, Any], output: Path | None) -> None:
    rendered = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    if output is None:
        sys.stdout.write(rendered)
        return
    output.write_text(rendered, encoding="utf-8")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Parse one bounded SMILES into science-tools structure state."
    )
    parser.add_argument("--smiles", required=True, help="SMILES input, at most 512 characters")
    parser.add_argument("--output", type=Path, help="JSON output path; stdout when omitted")
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    try:
        state = build_structure_state(args.smiles)
        _write_json(state, args.output)
    except StructureStateError as error:
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

