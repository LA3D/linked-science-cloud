# Large-resource implementation and acceptance evidence

These artifacts are separate from source code and live REPL state.

- `scale-1gib.json` records an offline, synthetic 1 GiB streaming test; bytes were deleted after checksum/read/cleanup verification.
- `verification/` preserves final implementation-check logs and the two unrelated baseline failures.
- `mdposit-20260923/2026-09-23T18-52-46-638Z/` holds tool-generated bounded observations, the acceptance receipt captured before workspace disposal, and the artifact durability check.
- `mdposit-20260923/run.mjs` is the explicitly authorized live methodology. It uses a fresh project broker and requires `--authorized-live-mdposit`; it is not part of default tests and does not authorize future live runs.

The PDB and XTC are durable files under `artifacts/resources/`. Each initial export has an adjacent receipt. The coordinator subsequently authorized a non-overwriting companion copy into the PDB directory, with `trajectory.xtc.receipt.json` preserving provenance. The original XTC remains available. Viewer playback is separately blocked by missing workspace-root binding, as reported by the originating task; acquisition and programmatic frame-header inspection passed.
