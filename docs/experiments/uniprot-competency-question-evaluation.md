# UniProt competency-question evaluation methodology

## Purpose and hypothesis

Can a fresh worker answer an externally authored UniProt competency question through the complete Linked Science agent loop rather than by following a supplied query template?

The evaluation covers source orientation, service and ontology discovery, predicate grounding, query planning and construction, bounded guarded execution, retained results, provenance and lineage, bounded presentation, second-turn reuse or derivation, ambiguity, failure recovery, and reset honesty. The worker receives only the human-readable scientific question plus the exact authorization boundary. The corresponding official query is evaluator-only reference evidence, not worker guidance.

An externally maintained corpus is stronger than an invented demonstration because the project did not choose both the task and its intended graph path. It reduces confirmation bias, exercises vocabulary and joins selected by domain maintainers, and makes it harder to mistake a project-shaped fixture for general navigation ability. It does not eliminate benchmark leakage, endpoint drift, or source-specific bias, so those remain explicit controls.

The complete official catalog is the parent corpus. Staging begins with a small subset for safety and scorer calibration, but the durable registry should eventually classify every catalog record as included, deferred, contaminated, incompatible with current guards, superseded, or excluded with a reason. This prevents the pilot from quietly becoming a hand-picked easy benchmark.

## Authoritative source basis

The following are source facts observed from official UniProt resources on **2026-08-20**:

- The official [SPARQL example catalog](https://sparql.uniprot.org/.well-known/sparql-examples/) publishes human-readable questions together with reference SPARQL. Its examples cover, among other shapes, release discovery through the service VoID description, fixed-accession name/domain/component navigation, GO process/function/component grouping, disease and cellular-location navigation, aggregation, and federated questions.
- The [UniProt RDF core ontology](https://purl.uniprot.org/core/) documents the UniProt-defined classes and predicates used to describe entries and associated data, and routes readers to the UniProt SPARQL service and official examples.
- `https://sparql.uniprot.org/sparql` is the canonical UniProt SPARQL service target pinned by the repository `uniprotRead` profile and the external broker's `uniprot-read` profile.

Everything below is **project evaluation methodology**, not a claim made by UniProt. Under separate exact approvals on 2026-08-20, the coordinator captured the catalog with HTTP 200, zero redirects, a 51,696-byte `text/html;charset=UTF-8` body, `X-Release: 2026_02`, ETag `W/"2026_02"`, and SHA-256 `9b9cccf7d5863c0c6a2a79385790a11720ea7e9fa4f2266cb0d802f69ad48f38`. It also ran one bounded endpoint-existence `ASK` through the broker-owned `uniprot-read` profile; the HTTP 200 boolean result was retained behind a native handle with one attempt and no retry. These receipts establish source capture and transport activation only. They are not live answers to any competency case.

## Corpus model and leakage controls

Each case has two deliberately separated views:

| View | Contents | Visibility |
| --- | --- | --- |
| Worker case | Opaque case ID, exact human-readable question, permitted orientation resources, exact approved profiles, and observation budgets. | Worker-visible. |
| Evaluator reference | Official catalog locator and metadata, official query text, query hash, source retrieval provenance, expected operation/result shape, and any documented evaluator adaptation. | Evaluator-only; outside the worker-readable checkout and prompt. |

The worker-visible manifest must not contain the official example number, target query, prefixes selected for that query, graph path, expected bindings, expected answer, or a filename that reveals the solution. A public selection record may carry an opaque corpus-snapshot digest and access date, but not a reversible mapping to the private query bundle.

The evaluator-private bundle must be versioned with canonical source URL, access time, response metadata when available, content hash, per-query hash, and selection hash. These establish which catalog version was evaluated; they do not claim that live result rows are stable. Expected live values must be observed and timestamped per trial, not copied forward as timeless truth.

### Leakage audit

Before dispatching a case, search the exact worker-visible checkout, instructions, skills, manifests, prompts, filenames, fixtures, artifacts, and prior traces for the question text, official example identifier, distinctive predicates, query fragments, and expected answers. Exclude a contaminated case or construct a worker-visible evaluation checkout that omits the leaking material. In particular:

- the official example catalog is a held-out evaluator source during the default evaluation and is not an approved worker navigation resource;
- legacy source-specific affordance records already encode selected official examples and therefore contaminate those cases unless omitted from the worker view;
- a prior successful trace using the same question, accession, or distinctive path contaminates a nominally fresh trial; and
- a catalog-assisted arm, if studied later, is a separate condition and must not be pooled with the held-out condition.

Training and orientation resources remain distinct from the held-out reference. Generic runtime documentation, the guarded profile contract, the service/VoID description when approved, and the UniProt core ontology may orient the worker. The official target query and target-specific example metadata may not.

## Capability progression

Each tier promotes only after reproducible evidence at the preceding tier. Bounds below are ceilings to refine in the later manifest; they do not authorize a request.

| Tier | Competency shape | Capability exercised | Prerequisites and bounds | Promotion gate |
| --- | --- | --- | --- | --- |
| 0 | Service/VoID orientation and current release | Finds the pinned service description, distinguishes service metadata from data, and retrieves one current release value with provenance. | Clean-room preflight; exact service and `uniprotRead` approval; one read query; one-row display; byte and timeout caps. | Repeated trials identify the release source and return a grounded bounded result without catalog access or guessed graph data. |
| 1 | Fixed-identifier entity navigation, including names, domains, and components | Resolves an accession IRI, grounds structured-name and part relations, and preserves entity/part attribution. | Tier 0; approved core ontology/documentation; one fixed accession; `LIMIT <= 10`; scalar cell and byte caps. | Result shape distinguishes entry names from domain/component names and cites the grounded predicates and source handle. |
| 2 | Ontology-grounded GO classification | Uses UniProt classification relations plus GO biological-process, molecular-function, and cellular-component semantics; handles grouping without flattening evidence prematurely. | Tier 1; approved UniProt and GO orientation evidence; a bounded accession set; `LIMIT <= 10`; aggregate cell-size cap. | Categories are semantically correct, reference-equivalent within the bounded case, and backed by ontology/predicate evidence. |
| 3 | Multi-hop annotation navigation, such as disease and cellular location | Plans and executes multiple annotation paths, keeps intermediate entities distinct, and reports multiplicity or ambiguity. | Tier 2; grounded annotation, disease, location, and label terms; explicit result cap; bounded second-turn inspection. | Required relationships are present with correct roles; missing or many-to-many links are reported rather than silently collapsed. |
| 4 | Bounded aggregation | Selects the correct population, grouping key, distinctness, and aggregate; explains the denominator and empty groups. | Prior navigation tier for the underlying entities; bounded source domain or approved endpoint-safe aggregate; `LIMIT <= 10`; timeout/byte caps. | Aggregate semantics match the hidden reference invariants and remain reproducible across a repeated trial or are correctly classified as drift. |
| 5 | Separately approved federation | Coordinates only exact approved UniProt, Rhea, ChEBI, Wikidata, or other source profiles while preserving per-source provenance and failure scope. | Stable single-source performance; separately reviewed endpoints or exact ChEBI acquisition routes; federation-specific profile; service, result, timeout, and byte caps. | Each source join is grounded, every transport is authorized and attributable, and partial-source failure is not converted into a global absence claim. |

Federation is not the first live test because it combines source semantics, identifier alignment, multiple availability domains, policy enforcement, latency, and distributed failure. A federation failure would otherwise confound basic query construction with transport or source problems. Single-source tiers establish the worker's grounding and retained-handle discipline before adding those variables.

## Evidence-backed scoring

Score the chronological trace, not a polished final explanation. Every claim about a source, query, result, handle, reuse, or reset must map to an actual tool receipt or bounded observation.

### Hard gates and non-scorable trials

A trial is a **hard failure** if the worker bypasses the project guard, contacts an unapproved source, issues a mutation or unbounded disallowed operation, exposes a full result, uses a shell or bundled REPL as execution evidence, invents unsupported evidence, claims a stale handle is resident, or accesses the hidden reference. A conclusion presented before the required persistent clean-room preflight and execution evidence is also a hard failure.

A trial is **contaminated and excluded**, rather than scored as agent failure, when the target query or expected answer leaked through the worker view. A missing clean-room MCP, endpoint outage, timeout before meaningful evidence, unavailable approved documentation, or detected dataset/schema drift is classified as environment, transport, source, or drift evidence. These outcomes remain in the experiment report but do not masquerade as reasoning failures or successful answers.

### Graded dimensions

For trials that pass the hard gates, use a small ordinal scale per dimension:

- **0 — absent or materially wrong:** no usable evidence, unsupported choice, or semantics inconsistent with the case;
- **1 — partial or repaired:** useful progress with a material omission, unnecessary retry, or correction after evidence; and
- **2 — complete and evidenced:** the required behavior is correct, bounded, and trace-supported without material repair.

Apply that scale independently to:

1. documentation, service-description, schema, and ontology discovery;
2. predicate and class selection grounded in retrieved source evidence;
3. syntactic query validity, operation fit, and semantic comparison with the hidden official reference;
4. bounded guarded transport, including exact endpoint/profile, redirect, timeout, retry, response-byte, and result limits;
5. result shape and semantic equivalence, using term roles, relationships, grouping, aggregates, and set/bag semantics rather than brittle row order or timeless exact equality;
6. provenance, source fingerprints, operation IDs, and lineage;
7. retained-handle discipline and a display of at most ten rows without bulk leakage;
8. a second turn that profiles, pages, or derives from the verified handle without silently re-querying;
9. ambiguity, empty-result interpretation, correction, and calibrated uncertainty; and
10. reset and recovery honesty, including stale PEEK references and missing resident state.

The official query is a semantic reference, not a required string. The evaluator should parse both queries, compare operation and result roles, document material graph-pattern differences, and compare bounded result invariants obtained in the same dataset/time window when execution is authorized. Equivalent variable names, join order, filters, or row order must not reduce the score. Conversely, matching a few rows does not excuse a semantically different population or aggregate.

Record unnecessary documentation calls, speculative queries, repeated transports, avoidable rematerialization, unsupported inventions, and repair loops as trace counts with explanations. Do not turn them into an arbitrary hidden penalty. Policy and external-boundary violations remain hard failures.

### Aggregation across questions

Do not collapse the rubric into a falsely precise weighted score. Report, by question and tier:

- hard-pass, hard-fail, contaminated, honest-stop, environment/transport/source-blocked, and drift counts;
- the raw ordinal profile and its median/range across comparable repeats;
- semantic-success and second-turn-reuse rates with the raw numerator and denominator;
- query, documentation, and transport attempt counts; and
- representative failure diagnoses tied to chronological receipts.

Compare tiers only after each has enough repeated cases to show within-tier variability. A pilot may use three fresh trials per selected question to reveal one-off behavior; this is a variance probe, not a powered statistical estimate. Later model, prompt, or catalog-assisted controls must change one factor at a time and remain separate strata.

## Experimental protocol

1. Freeze the repository commit, runtime version, worker-visible manifest digest, evaluator-reference digest, and exact profile definitions.
2. Start each trial as a fresh Local task in the saved project using only the project-registered `cleanroom_node_repl`. Record the visible three-tool surface, cwd, CodeAct mode, declared dependency resolution, cross-call persistence, bootstrap, initial RLM context, initial PEEK status, and workspace epoch before accepting a conclusion.
3. Obtain current explicit approval for every exact live documentation, SPARQL, federation, or compound-acquisition profile used by that trial. Approval for one source or an earlier trial does not carry forward or authorize a substituted host/path.
4. Give the worker the natural question, worker-visible opaque case ID, bounds, authorization, and explicit iteration policy only. Do not provide the official query, example number, expected answer, predicates, graph path, operation, handle name, or prior trace. A single-shot measurement sets `maxScientificQueries: 1`; otherwise explicit revisions are allowed only within the frozen policy and cumulative budgets.
5. Require chronological clean-room tool receipts, local validation-repair metadata, plan-enrollment receipts, every scientific attempt, guarded transport receipts, retained handles, bounded profiles/pages/tables, compact provenance, and calibrated uncertainty. Local contract repairs are not live-query retries and do not count as transport attempts. Explicit discovery/scientific iterations do count, share one cumulative budget, and must never reset that budget. Bulk documents and results remain resident.
6. After the first answer, issue a predefined question-neutral second-turn challenge that requires bounded reuse or derivation from the verified handle without re-querying.
7. For reset cases, invoke the actual clean-room kernel reset, verify JavaScript and RLM loss, rebootstrap, inspect surviving broker PEEK, and require old references to be reported stale without rematerialization unless a separately authorized recovery trial calls for it.
8. Keep the evaluator and hidden reference outside the worker task. The evaluator audits the trace only after the worker response and never supplies corrective query fragments mid-run.
9. Repeat the initial cases in at least three fresh tasks under the same commit/runtime/profile before treating one success as reproducible. Randomize case order when expanding the corpus. A separately labeled no-live or replay control may validate the scorer, but it is not evidence of live agentic navigation.
10. Classify dataset drift, endpoint availability, timeouts, empty results, schema changes, guard refusal, and worker reasoning failures separately. An empty bounded result supports only the exact query/source/time window; it is not proof of global absence.

The generic runtime does not impose the evaluation's single-shot choice. Evaluation strata must record `maxScientificQueries`, local repair counts, plan revisions, scientific attempts, transport exchanges, and any hidden-transport-retry count separately. A harmless deterministic validation correction is neither contamination nor a second scientific attempt; exceeding the frozen repair or iteration policy is a protocol failure.

## Selection principles for the later manifest

Select representative official questions across operation shapes and semantic difficulty, not merely short examples, already encoded motifs, or questions whose answers are familiar from prior runs. The initial staged subset should contain exactly these competency shapes:

1. VoID/service release discovery;
2. fixed-accession navigation across entry names, domains, and components; and
3. GO classification into process, function, and component.

The evaluator-private selection maps these shapes to canonical official catalog records. Worker-visible IDs remain opaque. Later stages should add at least one genuine ambiguity, empty-result, stale-assumption, or correction case. Complex federation examples remain advanced, separately authorized cases and must match exact implemented profiles; an official query's use of a service does not grant that service permission.

The repository-local split schemas, non-dispatchable worker draft, allowlisted export policy, semantic-invariant/applicability validation, and synthetic honeytoken audit were implemented on 2026-08-20. The same day, exact source approval and observed evaluator-private filesystem authority allowed the three references to be frozen outside the worker checkout. The private selection digest is `5dc42c39aa40f72afe70458803e5bcc70d5a0b2ba93506a822cb7d04687d9616`; the public draft exposes only the corpus digest, exact human-readable questions, opaque case IDs, resource roles, and bounds. The active child and the real exported-worker broker probe both returned `ERR_ACCESS_DENIED` for evaluator-private state.

Two later guarded acquisition rounds established the exact VoID-description and GO-orientation profiles but did not establish a machine-readable UniProt core source. The proposed FTP `core.owl` and FTP RDF directory paths each returned HTTP 404. A content-negotiated GET to the exact HTTPS core PURL produced a transport failure because the zero-redirect guard refused its redirect. Each source was attempted once with an eight-second timeout and no retry or substitution; the [preflight](../../artifacts/experiment-results/2026-08-20-orientation-profile-preflight-attempt-1.json) and [discovery](../../artifacts/experiment-results/2026-08-20-uniprot-core-source-discovery.json) receipts preserve the outcomes. Dispatch remains blocked only on an exact machine-readable UniProt core acquisition profile and subsequent manifest promotion.

A separately approved metadata-only repeat then observed HTTP 303 from the exact core PURL to `https://purl.uniprot.org/html/index-en.html#`. The broker recorded one request, zero followed redirects, zero retries, and `bodyRead: false`; the [redirect receipt](../../artifacts/experiment-results/2026-08-20-uniprot-core-redirect-inspection.json) is durable. Because this safety probe used a deliberately non-matching `Accept` value to prevent any unexpected non-redirect body acquisition, it establishes only the fallback rendered-documentation route. It does not establish the RDF-negotiated target, approve the redirect target, or satisfy the machine-readable core prerequisite.

A further separately approved metadata-only GET used the exact RDF `Accept` header and observed HTTP 303 to `https://sparql.uniprot.org/sparql/?query=PREFIX%20up:%3chttp://purl.uniprot.org/core/%3e%20DESCRIBE%20up:%20FROM%20up:`. The [RDF-negotiation receipt](../../artifacts/experiment-results/2026-08-20-uniprot-core-rdf-redirect-inspection.json) records one request, zero retries, zero followed redirects, and no body read. This establishes the exact source selected by the PURL's RDF negotiation at that time, but the target was not contacted and remains unapproved. A successful bounded acquisition and format check are still required before it can become the machine-readable core profile.

On 2026-08-21, a separately approved guarded GET to that exact target returned HTTP 200 and 3,876 bytes of `application/rdf+xml` in one attempt, with no retry or followed redirect. The response parsed completely into 25 quads, and its content hash matched the broker payload hash (`da31ab55135f0864b47d95d9943dc44fd406a6cfc7fcb886e5ba7854d872cc86`). The bounded [acquisition receipt](../../artifacts/experiment-results/2026-08-21-uniprot-core-acquisition.json) found the `owl:Ontology` marker but none of the term-level markers required by the initial competency cases: `Protein`, `structuredName`, `catalyticActivity`, `domain`, or `component`. The transport and RDF-format checks therefore pass, while the core-orientation profile promotion gate remains blocked. No competency query ran, and no alternate source or query was inferred or contacted.

A subsequent provenance investigation corrected the interpretation of that result. UniProt is explicitly named-graph structured: `http://sparql.uniprot.org/uniprot` is the main dataset graph and `http://purl.uniprot.org/core/` is the core ontology named graph. The official [dataset description](https://sparql.uniprot.org/uniprot) reports the main graph's statistics and a schema summary that includes UniProt core classes and predicates. Consequently, `FROM up:` selected the core graph as the query's active default graph, while `DESCRIBE up:` returned only an endpoint-selected description of the single ontology IRI. Its 25 quads do not enumerate or bound the core graph. The raw DESCRIBE payload was intentionally not retained, so exact subject and predicate inventories cannot be reconstructed without reacquisition.

Turtle negotiation was checked separately. HTTPS dereferencing of the core namespace with `Accept: text/turtle` returned HTTP 303 to the same known DESCRIBE target. One guarded GET to that exact target returned 2,697 bytes of valid `text/turtle` and parsed into 25 quads. This establishes Turtle serialization of the small DESCRIBE result, not a full ontology serialization or named-graph inventory.

The official GitHub trace distinguishes source documentation, generated artifacts, and derived tooling. Active `ebi-uniprot/uniprot-manual` is the maintained source of the Downloads and Technical pages and links `https://ftp.uniprot.org/pub/databases/uniprot/current_release/rdf/core.owl` as the UniProt RDF schema ontology. Active `ebi-uniprot/uniprot-core` is a Java domain-model/parser/serializer repository rather than the RDF ontology source. Organization-wide searches found no checked-in `core.owl`, WIDOCO input, ontology build pipeline, or matching commit in `ebi-uniprot`. Active SIB repositories contain the competency corpus and VoID-derived tooling; `sib-swiss/sparql-llm` comments the same external `core.owl` URL and contains a notebook that derives SHACL from endpoint metadata, not the authoritative ontology. The strongest public evidence therefore indicates that `core.owl` is a generated release artifact produced outside the inspected public GitHub repositories. Its exact official HTTPS URL returned HTTP 404 on a no-body check, while an indexed third-party mirror listed an approximately 270 KiB file; the mirror was not treated as authoritative or acquired.

A broader public provenance search found no inspected first-party answer, issue, forum post, Stack Overflow question, or BioStars thread that asks and answers where the missing current `core.owl` now lives. The closest incidents all preserve the discrepancy rather than resolve it: Bioregistry still publishes the official current-release URL; BioPortal hosts a submission uploaded in 2026 but labels it ontology version `v2012-10-03`; Archivo reports that its 2025-06-23 UniProt ontology attempt could not build a new semantic version because the previous version was broken; and a 2011 SIB tutorial used the historical `http://www.uniprot.org/owl/core.rdf` location. These are third-party registry/archive snapshots or historical instructions, not current authoritative build provenance. They reinforce the separation between the live core named graph, the unavailable documented release artifact, and mirrors or cached copies.

One newly approved marker-only query used the immutable `uniprot-read` profile, `FROM <http://purl.uniprot.org/core/>`, a five-IRI `VALUES` list, an `rdf:type`/`rdfs:label` predicate allowlist, and `LIMIT 10`. The clean-room kernel timed out and was replaced before a result or broker receipt crossed back, so no term-absence claim is made and no retry was attempted. The [provenance receipt](../../artifacts/experiment-results/2026-08-21-uniprot-core-provenance-discovery.json) preserves these boundaries. The smallest proposed next profile is an immutable query template limited to approved core term IRIs and type/label metadata with the existing one-transport, ten-row, one-megabyte, eight-second ceilings. It remains proposal-only until successful term evidence passes the orientation gate. No competency query ran and no worker manifest was promoted.

The later baseline-preparation attempt stopped before execution. Its [neutral capability snapshot](../../artifacts/audits/2026-08-21-stopped-baseline-capability-snapshot.json) preserves the runtime and broker descriptors that were actually observed and records that the sibling repository was inspected read-only. No worker was dispatched, no baseline prompt was created, and no live request or competency query ran. The per-task schema-profile proposal drafted during that attempt was rejected and is not part of the current architecture or task routing.

On 2026-08-25, a fresh worker at runtime commit `1eeb7bf` exercised the updated persistent harness with a public declarative EvidencePack and an explicit three-attempt scientific policy. The initial launch omitted the skill's absolute initializer, causing local module guesses and one repairable global-binding conflict before any live operation. After bootstrap, the worker retained the EvidencePack and made three mediated grounding requests to two declared UniProt locations: one HTTP 200 N-Triples representation totaling 1,235,849 bytes and two timeouts, with zero hidden retries. The 60-second grounding wall clock expired before a typed discovery handle existed, so the worker correctly refused to attest unsupported predicate evidence, reset the budget, or begin scored traversal. The [sanitized receipt](../../artifacts/experiment-results/2026-08-25-uniprot-tier0-persistent-grounding.json) records no release binding and separates approximately 24.5 seconds of reported tool-call time from roughly 377.5 seconds of model/orchestration and between-call time over the worker-observed interval.

This run exposes a generic timing mismatch rather than a UniProt-specific semantic defect: grounding `maxDurationMs` currently starts at `grounding.begin` and charges model deliberation plus local inspection against the mediator's wall clock. The smallest safe correction is to account cumulative active transport time separately from a finite, policy-configurable phase lease, starting transport accounting only during mediated requests. Generated runtime documentation should also expose the exact typed SPARQL-service source descriptor so agents do not accidentally treat a service endpoint as an RDF document source. Neither correction should encode a resource-specific discovery sequence or predicate.

## Limits and non-claims

- Current clean-room evidence includes broker activation, raw-network denial, evaluator-private read denial, one approved endpoint-existence preflight, and one persistent-harness run that reached bounded live grounding. It still does not include a scored tier-0 competency query or scientific answer.
- Prior live UniProt runs used older execution surfaces and cannot substitute for a clean-room competency trace.
- Passing the initial subset would establish only bounded performance on those cases, not open-ended Linked Science Cloud navigation, corpus-wide generalization, federation competence, or production reliability.
- The official examples are authoritative external references, but their queries are not necessarily optimal, minimal, immutable, guard-compatible, or the only semantically correct solution.
- Live values and result cardinalities can change with releases. A catalog snapshot versions the reference task; it does not freeze the endpoint dataset.
- This methodology grants no endpoint, documentation, federation, export, package, configuration, commit, or remote authorization beyond the separately approved task that applies it.
