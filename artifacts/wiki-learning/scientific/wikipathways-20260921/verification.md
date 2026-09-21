# Maintenance verification

- Wiki proposal inspection and applied-revision validation passed: citation integrity and scientific eligibility only, not scientific truth or transfer.
- Search and selected read retrieved the proposed identifier-mapping pattern. Consultation receipts are saved; helpfulness remains unknown. This checks retrieval mechanics, not scientific benefit.
- `npm run smoke` passed.
- `npm test` initially hit sandbox local-socket restrictions. Repeated with local-socket access: 287 passed, one failed, zero skipped (288 total). The failure is the existing `test/cleanroom-linked-science-bootstrap.test.mjs:69` expectation of a `codex-repl` checkout path; this checkout is `agents/linked-science-cloud`. Local configuration was preserved, not changed to satisfy the historical expectation.
- `git diff --check` and staged whitespace checks passed.
- This maintenance saves retained observations and a local ontology audit; it is not an intentional new scientific evaluation or a transfer experiment.

Delivery started on local main at bd4c5bbade77fe73b0835013a6b1f00abef9af8b, using branch codex/wikipathways-wiki-lessons in /Users/cvardema/dev/git/LA3D/agents/linked-science-cloud. Only this maintenance's evidence, baseline snapshot, consultation checks, and wiki revision are included. Existing local configuration, installation artifacts, and earlier consultation files remain outside the commit. No push is authorized by this maintenance request.
