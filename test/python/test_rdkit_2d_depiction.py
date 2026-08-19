from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
STATE_SCRIPT = ROOT / "skills/rdkit-workbench/scripts/smiles_to_structure_state.py"
DEPICTION_SCRIPT = ROOT / "skills/chemical-depiction/scripts/render_structure_state.py"
ASPIRIN_SMILES = "CC(=O)Oc1ccccc1C(=O)O"


def _load_depiction_module():
    spec = importlib.util.spec_from_file_location("chemical_depiction", DEPICTION_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load chemical depiction helper.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Rdkit2DDepictionTest(unittest.TestCase):
    def test_known_smiles_produces_deterministic_sanitized_svg_and_receipt(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary = Path(temporary_directory)
            state_path = temporary / "state.json"
            svg_path = temporary / "molecule.svg"
            repeat_svg_path = temporary / "molecule-repeat.svg"
            receipt_path = temporary / "receipt.json"
            repeat_receipt_path = temporary / "receipt-repeat.json"

            parsed = subprocess.run(
                [sys.executable, str(STATE_SCRIPT), "--smiles", ASPIRIN_SMILES, "--output", str(state_path)],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(parsed.returncode, 0, parsed.stderr)
            state = json.loads(state_path.read_text(encoding="utf-8"))
            self.assertEqual(state["schema"], "science-tools.chemical-structure-state.v0")
            self.assertEqual(state["input"]["value"], ASPIRIN_SMILES)
            self.assertEqual(state["structure"]["canonicalSmiles"], ASPIRIN_SMILES)
            self.assertEqual(state["structure"]["atomCount"], 13)
            self.assertEqual(state["structure"]["bondCount"], 13)
            self.assertTrue(state["provenance"]["parser"]["version"])

            for output, receipt in (
                (svg_path, receipt_path),
                (repeat_svg_path, repeat_receipt_path),
            ):
                rendered = subprocess.run(
                    [
                        sys.executable,
                        str(DEPICTION_SCRIPT),
                        "--state",
                        str(state_path),
                        "--svg-output",
                        str(output),
                        "--receipt-output",
                        str(receipt),
                    ],
                    cwd=ROOT,
                    text=True,
                    capture_output=True,
                    check=False,
                )
                self.assertEqual(rendered.returncode, 0, rendered.stderr)

            svg = svg_path.read_text(encoding="utf-8")
            self.assertEqual(svg, repeat_svg_path.read_text(encoding="utf-8"))
            self.assertIn("<svg", svg)
            self.assertNotIn("<script", svg.lower())
            self.assertNotIn("<image", svg.lower())
            self.assertNotIn("javascript:", svg.lower())

            receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
            self.assertEqual(receipt, json.loads(repeat_receipt_path.read_text(encoding="utf-8")))
            self.assertEqual(receipt["structureState"], state)
            self.assertTrue(receipt["depiction"]["sanitized"])
            self.assertTrue(receipt["provenance"]["renderer"]["version"])

    def test_invalid_smiles_fails_without_writing_state(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_path = Path(temporary_directory) / "invalid.json"
            parsed = subprocess.run(
                [sys.executable, str(STATE_SCRIPT), "--smiles", "C1(", "--output", str(state_path)],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(parsed.returncode, 2)
            self.assertFalse(state_path.exists())
            error = json.loads(parsed.stderr)
            self.assertEqual(error["error"]["code"], "invalid-smiles")

    def test_svg_safety_check_rejects_active_or_referenced_content(self) -> None:
        module = _load_depiction_module()
        unsafe_documents = (
            '<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,AA=="/></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"><path onclick="run()"/></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://example.org/a.svg#x"/></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"><path fill="javascript:run()"/></svg>',
        )
        for document in unsafe_documents:
            with self.subTest(document=document):
                with self.assertRaises(module.DepictionError):
                    module.validate_svg_for_display(document)


if __name__ == "__main__":
    unittest.main()

