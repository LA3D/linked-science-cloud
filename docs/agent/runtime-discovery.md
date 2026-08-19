# Linked Science runtime discovery

## Bootstrap once

From the repository root in the persistent Node JavaScript REPL, evaluate this expression exactly once:

```js
await (async () => { const { setupLinkedScience } = await import(`${process.cwd()}/lib/linked-science-runtime.mjs`); return setupLinkedScience({ nodeRepl: globalThis }); })()
```

It installs the stable global bindings `linkedScience` and `ls`. Setup is idempotent for the same global object, but normal use should bootstrap once and reuse those globals across calls.

## Discover before acting

Start with:

```js
linkedScience.documentation()
linkedScience.capabilities()
linkedScience.examples()
```

Fetch conditional detail only when needed:

```js
linkedScience.documentation.get('graphs.load')
linkedScience.documentation.get('schema.search')
linkedScience.examples('ontology')
```

The checked-in [API schema](../runtime/linked-science-api.schema.json) and [route index](../runtime/routes.json) support machine discovery. Do not invent a method when lookup fails; inspect the error receipt’s matches or return to the route list.

## Open a goal workspace

Use a compact context key, bootstrap the PEEK map, then retain local graph objects:

```js
const ws = linkedScience.open({ contextKey: 'measurement-goal' })
ws.orientation.bootstrap()
```

Follow the generated method documentation for loading graphs, searching ontology terms, querying, deriving, and viewing. Keep ontology/schema/SHACL graphs behind their handles. PEEK is orientation only. Return bounded views with their provenance rather than dumping resident graphs or results.

## Reset recovery

Before a planned recreation, `ws.orientation.commit()` returns a compact checkpoint. `linkedScience.reset({ contextKey })` advances the epoch and retains the in-process map. A recreated setup may receive `{ orientationCheckpoints: { [contextKey]: checkpoint } }`.

After either reset path:

```js
const recovered = linkedScience.open({ contextKey: 'measurement-goal' })
recovered.orientation.status()
```

Old handles must fail as stale. The map can guide explicit rematerialization, but it cannot prove residency and does not authorize a source. Read `linkedScience.documentation.get('reset')` and the recovery document named by any runtime error.

## Invariants

- Use persistent model-written JavaScript as the action space.
- Keep output bounded by rows/cells or nodes/edges and bytes.
- Preserve provenance and operation IDs through query, derivation, and view.
- Use only local-synthetic data in runtime v1; compatibility guards retain their existing explicit live-approval contract.
- Do not treat the present JavaScript guard as a security sandbox or expose a raw network-capable Communica engine to arbitrary child code.
