# Task: Diagnose runtime issues observed during scientific checkpoints

- **Status:** Implemented and reviewed I1–I3/I5; I4 diagnosed, optional provider remains unattached (2026-09-24).
- **Owner/task:** Codex task `01a0d47f-8875-7270-82d6-0e8e95b1d78b`; parent `01a0cf3d-75bd-7062-98a2-1c8a19b1abe4`.
- **Scope:** Five infrastructure items and one separate query-performance investigation. No scientific identity claims are software defects.
- **Authorization boundary:** Follow-up authorized coordinated implementation, bounded diagnostics and review. No commits or pushes; no package installation, provider activation, credentials or configuration changes. Historical observations and proposed diagnostics below are preserved; the implementation record identifies checks actually executed.
- **Starting point:** `main`, `13e43664e3313bc668221bbf8d72e522b8a60db3`, in `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`.

## Outcome and acceptance evidence

Provide executable restart points, separate observation from hypotheses, and close each item only with its objective checks. Prioritize I1–I3. I4 is capability/dependency diagnosis; I5 is documentation alignment. P1 is a performance investigation, not an established defect.

Read [runtime discovery](../agent/runtime-discovery.md), [broker mediation](../architecture/broker-owned-live-operations.md), [ontology objects](../architecture/ontology-and-schema-objects.md), [session lifetimes](../architecture/persistent-session-and-handles.md), and [verification](../agent/verification.md) before implementation. The [portable startup brief](portable-mcp-startup.md) already explains machine-specific checkout paths.

## Synchronization correction — 2026-10-14

The historical uncommitted status below is superseded: I1–I3/I5 source fixes were delivered in `485cb27` and are already in both main and laptop histories. This candidate retains the remaining I4 capability diagnostics and tests. The trajectory dossier now has explicit result-registry coverage; current verification is recorded in the synchronization task. No scientific session restart or provider activation is authorized by this correction.

## Implementation record — 2026-09-24

Work is uncommitted on `codex/checkpoint-runtime-fixes`, based on `13e43664e3313bc668221bbf8d72e522b8a60db3`. Existing unrelated changes, including configuration and scientific-trajectory work, were preserved. Local `main` was already two commits ahead of its upstream; no integration or push was performed.

- **I1 fixed:** Controlled A/B/A requests isolated header dependence: the platform Fetch User-Agent received 403, truthful `LinkedScience/1.0` received 200, then the platform default again received 403. The broker now supplies the truthful product identifier by default. Identity stripping, authority, budgets and retry behavior are unchanged. The service's internal rejection policy is unknown. A fresh isolated project MCP retrieved one P69905 record (1,987 bytes); see the [diagnostic receipt](../../artifacts/runtime-debugging/alphafold-request-path-20260924.json). Existing mounted sessions were not reset and need a restart to load saved broker code.
- **I2 fixed:** Added direct declaration of the already installed `rdfxml-streaming-parser` dependency without installation. Resource media-type dispatch now parses RDF/XML to native RDF/JS terms, using the response URL as base. Tests cover semantic equivalence, shared blank nodes, language/datatype fidelity, XML base, malformed/truncated XML, quota, no refetch and no partial publication. DTD/DOCTYPE declarations are rejected; recovery no longer suggests relabelling bytes as another serialization.
- **I3 fixed:** SELECT collection now retains Comunica metadata variables before execution, including empty and always-unbound projections. Default pages of zero-column results succeed; explicit invalid projections still fail. Resident and stored results retain completion/provenance and no-refetch behavior. Four dedicated tests cover local, broker-backed, zero-variable and storage paths.
- **I4 diagnosed:** The production stdio launcher constructs its scientific-session scratch broker without a recursive provider. Capabilities now identify `RLM_PROVIDER_UNAVAILABLE` and attachment `none`; a host callback reports `host-callback`. Local stub tests prove the bounded callback contract. No real provider was enabled or tested, and no claim is made that credentials are missing. Provider attachment remains a separately authorized host integration.
- **I5 fixed:** Active agent/skill guidance and API bootstrap examples use the selected validated checkout; the configuration test derives the exact expected entrypoint from the bootstrap root. Historical experiment paths remain unchanged. Wrong-runtime checks remain intact.
- **P1 deferred:** No performance defect or server-plan explanation established. No new performance/source-science investigation was performed.

Independent review: transport agent reviewed paging, paging agent reviewed RDF/XML, and coordinator reviewed integrated changes. No blocking finding; blank-node fidelity assertion strengthened following review.

Verification: `npm test` with fixture socket access completed **314 tests: 313 passed, 1 failed, 0 skipped**. The sole failure is pre-existing unrelated registry coverage for `docs/experiments/scientific-trajectory-evidence.md`; it was present in the baseline and was not modified. `npm run smoke` and `npm run linked-science:verify` passed. Focused transport tests passed 9/9, paging tests 4/4 and existing runtime/lifetime/iteration tests 31/31. Final targeted checks passed: RDF/XML + paging 12/12, bootstrap/runtime 17/17 and final strengthened RDF/XML suite 8/8; seven edited Markdown files have no missing relative links, REPL skill validation passed, and `git diff --check` passed. The skill validator used an existing cached PyYAML module; no packages were installed.

Remaining action: after combined validation and the coordinated restart decision, restart the broker in a fresh task to consume saved code. The parent confirmed restart must wait until all fixes and checks are complete; existing sessions remain preserved. Retain this task’s live state until any desired receipts are captured. Resolve the unrelated registry entry in its owning workstream. Optional recursion and P1 remain outside completed fixes.

## Recursive-provider follow-up checkpoint

The separately authorized boundary investigation is complete: [checkpoint-one report](recursive-provider-boundary-checkpoint.md). The installed MCP client did not advertise sampling in an isolated handshake. Parent-mediated native delegation between completed REPL calls is the supported next test; no provider was enabled. Subsequently authorized checkpoint two passed the actual parent-mediated round trip (93-byte selected input, correct 72-byte child result, same-epoch REPL readback); see the linked report and registered machine receipt.

## Evidence scope and retrieval

This brief is a **retrospective-summary** of observed tool exchanges and retained profiles, not a new experiment receipt or a claim that raw receipts were exported. Operation IDs below are scoped to workspace `checkpoint-one-preparation`, kernel epoch prefix `a497d3c1-29c1-41cb-9825-8409cfd07052`; they are not globally unique. The task history contains the original displays. No kernel reset was performed on this live workspace.

Resident bindings include `checkpointOneWorkspace`, `afCheckpoint`, `constantProfile`, `checkpointConstantResult`, `checkpointExactQuery`, `checkpointConstantQuery`, `uniprotOntologyResource`, `uniprotProteinTerm`, and `pcRdfCheckpoint`. Check residency before use; this document cannot restore them. Use documented `results.profile(handle)`, `traversal.history({limit})`, and retained resource inspections. Error envelopes from local parsing/paging are in task history; not every local error was assigned an operation ID. Capture bounded raw evidence before any future reset under the repository's result-record procedure.

Missing durable evidence: exported raw live profiles/error envelopes, original curl command/headers/timing, matched client request fingerprints, recursion-provider startup trace, and server execution plans. Do not fill these gaps from inference.

## Current state

### I1 — High: compare AlphaFold request paths

**Class:** Transport/integration discrepancy; cause unknown.

**Observed:** Anonymous broker GET of `https://alphafold.ebi.ac.uk/api/prediction/P69905` with `Accept: application/json` returned HTTP 403, 134-byte HTML, no redirect (`op-000050`, traversal `traversal-ad73a37d05d8fc868507611e`). Response SHA-256: `c996c0469ef05ff6fdd1f7cefbc3f7e109bb21969de42fcf591498a828a7ad5f`. The official documentation loader's `/api/openapi.json` request also returned 403 with the same body hash (`op-000048`). Documentation and search HTML returned 200. UniProt's actual AlphaFold cross-reference succeeded separately (`op-000041`); it does not prove AlphaFold API access.

The parent reports credential-free curl successfully fetched the exact prediction URL, saving `/tmp/alphafold-p69905-check.json`. This task read the local artifact: 1,987 bytes, valid JSON, one record, `uniprotAccession=P69905`, `entryId=AF-P69905-F1`; SHA-256 `af907bb73c411790ac6a24764314287e5cd331c0ed5b13eae9924ce45b27d8f9`. The file is temporary, not a durable repository artifact. Its contents corroborate a response, but do not independently establish curl's status, credentials, headers, time, or network path. This is **parent-reported curl evidence plus a locally inspected artifact**, not a REPL success.

**Expected:** Explain why the two paths differ; an authorized anonymous request should either receive the source response or expose an accurately attributed rejection. Do not assume the sandbox caused the 403.

**Minimal reproduction:** Through project REPL, `await checkpointOneWorkspace.resources.get('https://alphafold.ebi.ac.uk/api/prediction/P69905', {headers:{accept:'application/json'}, role:'alphafold-request-comparison'})`. A future paired curl run must record exact invocation and sanitized headers/status/body hash contemporaneously; the existing file alone is insufficient.

**Unconfirmed hypotheses:** User-Agent/Accept differences, proxy/egress identity, DNS/TLS/HTTP behavior, source anti-bot policy, caching or time-dependent server behavior, or broker request construction. No hypothesis is established.

**Next diagnostics:** Inspect broker request construction and existing receipt fields first. Then, when authorized, compare paired anonymous requests on the same host/time window and change one variable at a time. Record redirects, transport/proxy selection, safe headers, status, media type, timing, and response hash. Do not introduce credentials, spoof identity, bypass access controls, or change global configuration.

**Acceptance:** A reproducible difference is isolated or the source's intermittent behavior is documented with paired evidence; any code fix has a synthetic regression test reproducing that difference. Confirm success via the project REPL if the source permits it, otherwise preserve a precise external blocker. Curl success alone never closes REPL readiness.

### I2 — High: RDF/XML parser capability and repair guidance

**Class:** Parser capability/dependency gap and diagnostic quality.

**Observed:** `uniprotOntologyResource` (`h-000003`, `op-000003`) is HTTP 200 `application/rdf+xml`, 3,876 bytes, SHA-256 `fc713ea35143b69288ba6e1229f3a60bb97b920f6a375f729507aa19f5b052b1`. The published ontology URL redirected to a DESCRIBE response. This retrieval is authorized ontology access, not an authority violation. Calling `.rdf({name:'uniprot-ontology-resource-description'})` raised `LS_RESOURCE_RDF_FORMAT`: supported formats were Turtle, N-Triples, N-Quads, and TriG. Its repair suggested selecting a supported format against the same resource, which is not valid conversion of genuine RDF/XML.

Turtle negotiation for published terms worked: Protein `op-000009` (2,242 bytes), sequence property `op-000011` (646 bytes), Sequence `op-000013` (2,789 bytes), followed by successful native graph retention. The ontology-root description was not a complete ontology module.

**Expected:** Either support RDF/XML with declared dependencies and native RDF fidelity, or advertise the limitation and provide truthful repair guidance. Never relabel XML bytes as Turtle.

**Minimal reproduction:** Inspect the retained resource's media type/body, then retry `.rdf(...)` without network. If state is lost, first reproduce with a small local RDF/XML fixture using the same parser selection path; live UniProt reacquisition is a separate source test.

**Unconfirmed hypotheses:** Missing parser dependency versus intentionally unsupported format; dispatch/negotiation mismatch. The observed supported-format list does not identify the design cause.

**Next diagnostics:** Trace format inference, parser registration/dependencies, and structured repair generation. Decide whether the documented RDF resource contract promises XML. Compare XML and Turtle fixtures representing the same graph.

**Acceptance:** Supported formats and documentation agree. Either XML parses with preserved IRIs, blank-node structure, datatypes and language tags, or unsupported XML gets an accurate actionable error. A regression check forbids advice to reinterpret XML as another serialization; no hidden remote retry.

### I3 — High: paging a valid empty SELECT result

**Class:** Result presentation defect candidate; successful query must remain distinct from display failure.

**Observed:** Typed constant query `op-000025` returned HTTP 200, 117-byte SPARQL JSON, SHA-256 `d23bbe22a5520c9cd9a918d87ef01362edb4d4a47f6467f559bb08613b316129`. `constantProfile` records `count:0`, `columns:[]`, complete=true, truncated=false. `await checkpointOneWorkspace.results.page(checkpointConstantResult,{limit:10})` then raised `LS_COLUMNS`, “Columns must be distinct known result columns,” with expected enum `[]`. The call supplied no explicit columns. No result was lost: the retained profile established completion.

**Expected:** Default paging of a successful empty SELECT returns a valid empty page, not a local validation error. Preserve declared variables when available even with zero bindings. Do not turn a display error into a query failure or an absence claim beyond the submitted query.

**Minimal reproduction:** Reuse the retained result without requerying. Add an offline SPARQL JSON fixture with `head.vars=["protein","sequence"]`, `results.bindings=[]`; also exercise a native local zero-solution SELECT. Capture upstream header variables to determine where columns disappear.

**Unconfirmed hypotheses:** Column discovery from rows only; default projection rejects an empty column array; upstream declared-variable metadata is discarded. No implementation cause established.

**Next diagnostics:** Trace SELECT metadata through materialization/profile/default page validation for resident and stored results. Use fixtures rather than remote sequence searches.

**Acceptance:** Empty local and mediated-fixture SELECTs page successfully with zero rows and correct completion/provenance. Available declared columns survive. Invalid explicitly requested columns still fail. No new network request is needed to repair projection.

### I4 — Normal: optional recursive-model capability unavailable

**Class:** Optional host-provider capability/dependency; not ordinary REPL failure.

**Observed:** Initial `nodeRepl.rlm.capabilities()` reported external context available, persistent JavaScript, recursion `available:false`, interface `nodeRepl.rlm.query`, host-owned one-shot lifecycle, hardMaxDepth 4, and recovery to continue local operations or use a provider-configured host. No recursive model call was executed. Identity and binding persistence passed; many local/remote scientific operations succeeded.

**Expected:** Honest capability reporting and an actionable explanation of whether the optional provider is configured/supported. Ordinary Codex subagents are a separate host facility: this result establishes nothing about their availability or failure.

**Reproduction:** Read `nodeRepl.rlm.capabilities()` in the actual project MCP. No network or recursive call is required. Provider-specific execution needs separately scoped authorization.

**Unconfirmed hypotheses:** Provider absent, deliberately disabled, unsupported by this host, or failed startup. Cause unknown; do not call this a missing API key without evidence.

**Next diagnostics:** Inspect advertised provider configuration and startup diagnostics read-only; consult [optional RLM research](../architecture/prime-linked-data-context-management.md). Preserve default operation without recursion.

**Acceptance:** Document the actual reason or explicit remaining unknown and the supported activation path. If enabled later, a separately authorized bounded call verifies it; otherwise capability remains false with clear diagnostics. No dependency on recursion is introduced into ordinary RDF workflows.

### I5 — Normal: stale absolute checkout references

**Class:** Documentation/environment identity alignment.

**Observed:** [AGENTS.md](../../AGENTS.md), [REPL skill](../../.agents/skills/linked-data-repl/SKILL.md), and API schema text name `/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl`. Live `nodeRepl.cwd`, environment.projectRoot/moduleRoot and offline `npm run linked-science:verify` instead reported `/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud`. Project ID `@linked-science/runtime`, production role and broker package matched. The offline verifier passed; a live binding persisted. These observations do not imply the experimental sibling or generic REPL was used.

**Expected:** Guidance distinguishes a historical saved checkout from the currently validated installation; fresh agents should not reject a valid relocated checkout merely because prose contains another machine's absolute path.

**Reproduction:** Read live identity/capabilities, then compare the active docs and [API schema](../runtime/linked-science-api.schema.json). Run offline verification only as supplementary evidence, not proof of MCP mounting.

**Unconfirmed hypotheses:** Historical machine path retained in prose/generated schema, or an incomplete portable-startup documentation update. Current launch configuration itself was not shown faulty.

**Next diagnostics:** Audit the active path references and generation sources; align with [portable startup](portable-mcp-startup.md). Preserve historical paths in dated evidence. No configuration change follows automatically.

**Acceptance:** Active instructions consistently use validated installation identity or explicitly scoped paths; moved-checkout checks pass; wrong project/probe identities still fail. Verify task-level mounting separately from shell checks.

### P1 — Separate performance investigation: STR filter versus typed object

**Class:** Query formulation/performance; not an established runtime defect.

Both attempts used `https://sparql.uniprot.org/sparql`, graph `http://sparql.uniprot.org/uniprot`, GET, and a 20,000 ms request deadline. Shared prefixes: `up: <http://purl.uniprot.org/core/>`, `rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>`, `xsd: <http://www.w3.org/2001/XMLSchema#>`.

**Observed:** `op-000020` timed out after 20,012 ms, no HTTP response recorded, zero bytes, no successful result handle:

```sparql
SELECT DISTINCT ?protein ?sequence WHERE {
  GRAPH <http://sparql.uniprot.org/uniprot> {
    ?protein a up:Protein ; up:sequence ?sequence .
    ?sequence rdf:value ?aminoAcids .
    FILTER(isLiteral(?aminoAcids) && STR(?aminoAcids) = "GYDPETGTWG")
  }
}
```

`op-000025` completed in 12,980 ms overall, recorded HTTP exchange 424 ms, with zero rows (see I3):

```sparql
SELECT DISTINCT ?protein ?sequence WHERE {
  GRAPH <http://sparql.uniprot.org/uniprot> {
    ?sequence rdf:value "GYDPETGTWG"^^xsd:string .
    ?protein a up:Protein ; up:sequence ?sequence .
  }
}
```

The known-record probe `op-000023` returned P06017's sequence as `xsd:string`, no language tag. Constant-object matching is equivalent for that observed representation, but narrower than STR equality across arbitrary literal datatypes/languages. One record does not establish dataset-wide equivalence. A timeout is not zero matches.

**Expected:** Explain performance only to the extent supported by measurements, while preserving semantic differences and complete-or-fail behavior.

**Unconfirmed hypotheses:** Index-friendly matching, query planning, cache/server load, or client setup delay. No execution plan proves a scan or optimizer cause; overall and HTTP timing differ and must not be conflated.

**Remaining reproduction/next diagnostics:** Inspect saved timing boundaries first. A separately authorized small paired experiment should control graph, endpoint, transport, deadline, warm/cold state and literal semantics, with no automatic timeout increase. Obtain an endpoint plan only if supported. Avoid turning this into another sequence-discovery investigation.

**Acceptance:** Report reproducible timings with causes marked confirmed or unknown, distinguish total/client/exchange time, and document semantic scope. Do not require a positive match. Any runtime-defect claim must be supported by a separate reproducer isolating runtime behavior.

### Scientific data observation, not a defect

PubChem REST RDF for CID4369319 (`op-000072`) contained `RO_0002162` taxon attribution; the QLever CID-bound outgoing query (`op-000084`, 51 assertions, HTTP 200 JSON) did not. Preserve snapshot/source differences; neither missing assertions nor questionable classification proves a software bug or invalid chemical identity. Formula/mass support chemical plausibility; connectivity/stereochemistry were not independently validated. Identity detours and absent crosswalks are outside this defect list.

### Exact next action

Begin I1 with read-only inspection of the broker's request construction and existing `afCheckpoint` receipts. Recover the parent's exact curl invocation and response headers before proposing a matched live comparison. Do not edit configuration or infer a sandbox cause.

## Handoff state

- **Git:** Shared dirty `main` checkout at the starting commit above; two commits ahead of upstream at inspection. No branch switch, fixes, commit, merge or push performed, per explicit documentation-only/no-commit instruction. Numerous unrelated source, skill, config, wiki and artifact changes already existed and are excluded.
- **Task files:** This brief and its entry in [task queue](README.md). Existing changes remain untouched.
- **Verification:** File presence/readback and all relative links in the brief/task queue checked; complete brief reviewed; `git diff --check` passed; `npm run smoke` passed. `npm test`: 301 tests, 258 passed, 22 failed, 21 skipped. Failures included socket-listen `EPERM` errors in MCP/shared-session/reasoning tests, the checkout-path assertion at `test/cleanroom-linked-science-bootstrap.test.mjs:69` (expects `codex-repl`, actual `agents/linked-science-cloud`) and the missing registry status for pre-existing untracked `docs/experiments/scientific-trajectory-evidence.md`. No affected implementation, configuration, or registry file was changed or fixed here; no elevated rerun was performed. These test-environment permission failures do not establish the cause of the independent AlphaFold HTTP 403. The first failure is additional evidence for I5, not proof of live runtime failure. Temporary logs: `/tmp/checkpoint-punchlist-tests.log` and `/tmp/checkpoint-punchlist-smoke.log`. No new live science was performed to write this brief.
- **Durability:** This Markdown is saved but uncommitted at user request. Raw live receipts remain ephemeral unless already retained elsewhere; the temporary parent artifact is not guaranteed to survive cleanup. No fabricated artifact links or reconstructed raw receipts.

## Authorized depth-one follow-up

[Bounded recursion experiment](depth-one-recursion-experiment.md): native leaf restriction remains blocked by the available spawn surface; the isolated programmatic fallback demonstrated real nested-call and forged-depth denials, then retained a correct answer in the same REPL. No production adapter/provider was enabled.
