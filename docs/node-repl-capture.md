# Node REPL capture snippet

Run this in the platform-provided persistent Node REPL. Choose a short human label for `context`; do not copy opaque call, thread, session, turn, or progress identifiers into a saved result.

First call:

```js
var probePersistenceToken = "node-repl-persistence-check";
var turnMetadata = nodeRepl.requestMeta?.["x-codex-turn-metadata"] ?? {};
nodeRepl.write(JSON.stringify({
  context: "trusted-project-local",
  cwd: nodeRepl.cwd,
  taskSource: turnMetadata.thread_source ?? "unknown",
  sandboxImplementation: turnMetadata.sandbox ?? "unknown",
  sandboxMode: turnMetadata.sandbox_mode ?? "unknown",
  persistenceToken: probePersistenceToken,
}, null, 2));
```

Second call, before importing the probe:

```js
nodeRepl.write(JSON.stringify({
  persistenceToken: globalThis.probePersistenceToken ?? null,
  persistedAcrossCalls: typeof globalThis.probePersistenceToken === "string",
}, null, 2));
```

Then import and run the same module used by the shell control:

```js
var probeModule = await import(`${nodeRepl.cwd}/src/probe.mjs`);
var replProbeResult = await probeModule.probeNetwork();
nodeRepl.write(JSON.stringify(replProbeResult, null, 2));
```

For the ordinary shell control, run `npm run probe` in the same fresh task. Record the two bounded outputs in a copy of `results/template.json` rather than committing raw runtime metadata.
