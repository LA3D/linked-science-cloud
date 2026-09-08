# Source orientation and reset

The workspace registry owns ephemeral handle inventory; `workspace.inventory()` reads it directly. The small orientation map holds reusable source context, following the distinction studied by [PEEK](https://arxiv.org/html/2605.19932v1).

Automatic entries describe resources, graphs and declarative evidence: source identity, representation version/fingerprint, format or role, and compact evidence references. A later description of the same source/type replaces its earlier entry. Query results do not automatically fill the map. Their full provenance remains available through result profiles while retained.

The map uses bounded deterministic eviction and now supports an experimental semantic update operation alongside automatic metadata. The broker's optional policy hook is unconfigured by default; no learned Distiller/Cartographer policy or durable memory system is implemented.

## Recurring contexts

Workspaces normally use their `contextKey` for orientation. To reuse source orientation across questions, identify the recurring context and its version explicitly:

```js
var ws = linkedScience.open({
  contextKey: 'question-two',
  orientationContext: { id: 'study-corpus', version: 'snapshot-2026-09-04' },
});
nodeRepl.write(await ws.orientation.bootstrap({ maxBytes: 4096 }));
```

The identity/version selects a map, not a resource or authority grant. Registries stay separate. A reference from another workspace is reported `external-workspace`; it does not grant access to that workspace's handles. A new context version uses a separate map. A workspace's orientation scope cannot be changed silently after it is opened.

A reference to a released or earlier-epoch handle is `stale` in its originating workspace. The source metadata may remain useful for orientation, but residency and scientific assertions require current evidence. Empty queries and unavailable sources retain their exact scope and never establish global absence.

## Ownership and compatibility

The active facade uses the broker's `nodeRepl.peek` map. Standalone scripts use `lib/orientation-map.mjs`; they do not create a second cache alongside a broker map. Existing checkpoint formats and older handle-reference entries remain readable. The five section names remain compatible, including `reusable-results` for historical/reviewed entries, but the runtime no longer writes a query-result catalog there.

`orientation.bootstrap({ maxBytes })` initializes/resumes and returns a bounded presentation with omission counts; normal graph retention also initializes source orientation as needed. Generic startup/resume guidance explicitly writes that presentation to the tool result. Synchronous `open()` never injects a host prompt. `current` remains strict full-map inspection within its byte limit; `status` and `commit` remain available. An empty, unavailable or failed map does not block ordinary data work.

Experimental `orientation.update({ edits })` accepts at most four semantic edits, each with up to eight native RDF/JS quad citations. Existing matching/counts verify membership, while runtime provenance supplies source fingerprints. The compact serialized envelope labels these as `references-checked` and `agent-proposed`: validation does not establish semantic truth. Raw documents, whole result sets, raw SPARQL and workflow state stay outside the map. Reusable source interpretations, not task-answer templates, are the intended content.

Changed source fingerprints flag dependent entries; replacement requires current evidence. Evidence residency and source-version status are separate: a map may retain a historical statement while its handles are stale or its source is not observed in the current workspace. Source metadata failure is reported without hiding an otherwise successful acquisition. Local maps retain their item bound and broker maps their estimated-token bound. The [experimental plan and implementation record](../tasks/uniprot-orientation-comparison.md) describes the direct-source lineage limit and unrun agent comparison.

Release/disposal invalidates data access and reclaims storage while preserving advisory orientation. Kernel reset additionally removes all JavaScript bindings and RLM context. The broker prepares the facade again on the next evaluation. Reacquisition is a new authorized operation with new provenance; surviving orientation does not make it automatic.

See [optional policy research](prime-linked-data-context-management.md) and [session lifetime](persistent-session-and-handles.md).
