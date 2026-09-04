# Persistent JavaScript compatibility surface

The [current architecture](rlm-linked-science-runtime.md) centers a useful scientific REPL with a small management layer. This note preserves compatibility decisions from the earlier CodeAct/RLM/Prime framing; those labels do not add a workflow engine or require durable child sessions.

## Supported interfaces

- The MCP remains exactly `js`, `js_reset` and `js_add_node_module_dir`.
- The project broker automatically prepares `linkedScience` / `ls` before evaluation. `bootstrapLinkedScience({ host, cleanroom, projectRoot, moduleRoot })` remains the explicit validated diagnostic entrypoint.
- `setupLinkedScience` supports standalone/offline fixtures. Legacy `initializeSession` and `createTableDisplay` remain under `linkedScience.compatibility`.
- `rdf.dataset(handle)` keeps its copied-dataset behavior and aliases the clearer `rdf.clone(handle)`. New native reads should prefer `rdf.source(handle)`.
- `linkedScience.reset({ contextKey })` is now awaitable because it reclaims workspace-owned broker storage. Invalidation begins immediately; callers must await cleanup before relying on reclaimed resources.
- `workspace.release`, `dispose` and `inventory` supply explicit lifetime and current ownership. Query and result APIs keep complete-result semantics and bounded views.
- Existing PEEK section names, checkpoints and older handle-reference entries remain readable. New automatic entries describe source context; query results stay in the registry.

The runtime does not expose the mutable internal N3 store or raw network authority. A cloned dataset is caller-owned; a Source view is read-only and becomes unavailable after release. `nodeRepl.rlm` continues to advertise optional one-shot provider support separately from external context. Durable recursion and learned PEEK remain research options.

See [runtime discovery](../agent/runtime-discovery.md), [native graph semantics](ontology-and-schema-objects.md), [session lifetime](persistent-session-and-handles.md) and [broker mediation](broker-owned-live-operations.md).
