# Install and verify Linked Science

This guide is for a person or an agent installing the project-owned MCP server. It provides the repository-supported Codex setup path. An installation request covers the chosen checkout's dependencies and project registration; preserve unrelated files and obtain separate authorization for global configuration or additional system/package installation. Reading this guide alone is not authorization to run it.

## Choose the client and checkout

The automated registration script targets Codex's project `.codex/config.toml`. Official [OpenAI MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) describes project-scoped configuration in trusted projects and the stdio `command`, `args` and `cwd` fields. This guide verifies the repository's own setup, not every client/platform combination.

The project user reports testing both ChatGPT Desktop and Codex. A reproducible project-specific ChatGPT Desktop registration and activation procedure is still missing from this repository. Identify the actual client and version before configuring it; do not assume Codex project configuration is loaded by a different client or invent a local stdio setup. For a ChatGPT Desktop request, establish its supported registration path from official documentation and verify it with the same identity/persistence checks below before claiming installation complete. There is no published plugin installer in this project yet.

For the supported Codex route:

1. Locate an existing checkout of `LA3D/linked-science-cloud` or choose a new directory with the user. Do not use the separate `node-repl-network-probe` repository or a bundled generic REPL.
2. If no checkout exists, clone the repository using the user's existing Git access. The HTTPS example below creates a new directory; do not run it over an existing checkout.
3. Open the actual runtime package root, containing `package.json`, `package-lock.json`, `.codex/config.toml` and `packages/cleanroom-node-repl`. Record its absolute path and Git status. No particular workstation directory is required.

```sh
git clone https://github.com/LA3D/linked-science-cloud.git
cd linked-science-cloud
pwd -P
git status --short
```

If access fails, resolve repository access through the user's normal Git setup; do not embed credentials in commands. Reuse an existing checkout without automatically pulling or overwriting local work.

## Check prerequisites

You need Git (when cloning), npm, and a Node executable that supports `node:sqlite` without extra flags. Verify the actual executable that will run setup; the project currently checks this capability rather than declaring a universal minimum Node version. It must remain executable and accessible to the desktop application.

```sh
node --version
npm --version
node -e "import('node:sqlite').then(() => console.log(process.execPath))"
node -p "require('./package.json').name"
```

The package name must be `@linked-science/runtime`. A missing Node/npm or failed SQLite import needs a compatible local runtime before proceeding. Selecting or installing a new system runtime is a separate machine change; do not silently install one. Existing shell success does not by itself prove the desktop application's access to that executable.

## Install dependencies and register the project

Run these in the chosen package root after installation is authorized:

```sh
npm ci
npm run codex:configure
npm run linked-science:verify
```

`npm ci` installs dependencies from the lockfile and replaces an existing `node_modules` directory. Dependencies are not stored in Git. No globally installed Linked Science package is required.

The [configuration script](../../scripts/configure-project-mcp.mjs) validates the project identity and broker entrypoint, then replaces only `command`, `args` and `cwd` in the existing `[mcp_servers.cleanroom_node_repl]` section:

| Field | Generated value |
| --- | --- |
| `command` | Absolute Node executable used to run setup |
| `args` | Absolute path to `packages/cleanroom-node-repl/src/cleanroom-mcp.mjs` |
| `cwd` | Resolved absolute checkout root |

The script preserves other settings, including tool approvals and the required-server flag. It does not edit global configuration or install dependencies itself. Review `.codex/config.toml` after setup and keep machine-specific paths local; do not include them in a project commit. Rerun setup when moving the checkout or replacing its Node executable. Missing/duplicate setup fields cause an error rather than an inferred configuration rewrite.

`linked-science:verify` runs repository boundary checks, broker syntax/import checks, and an offline synthetic test against the actual local JSON-RPC broker. It checks identity, advertised tools, bootstrap and persistence/reset behavior in its own test process. It makes no live scientific retrieval and cannot prove that the current desktop task mounted that broker.

## Restart and reconnect

Fully restart the desktop application after project MCP configuration changes, then open the selected checkout as a trusted local project and start a fresh task. In clients with explicit connection management, reconnect the server as needed. An already-running broker does not reload saved broker code automatically. Do not disable the required-server setting merely to bypass a startup failure.

## Verify the mounted server in two calls

Use the project's `cleanroom_node_repl` server, whose tools are exactly `js`, `js_reset` and `js_add_node_module_dir`. Do not substitute a generic JavaScript tool. Its bootstrap prepares `linkedScience` and `ls`; adding module directories is not the setup method.

In a fresh diagnostic task, make this first call through `cleanroom_node_repl.js`:

```js
var installationProbe = { count: 41 };
nodeRepl.write({
  cwd: nodeRepl.cwd,
  environment: linkedScience.capabilities().environment,
  rlm: nodeRepl.rlm.capabilities(),
});
```

Verify the reported cwd matches the selected absolute checkout. The environment must identify project `@linked-science/runtime`, repository role `authoritative-production-implementation`, and broker `@linked-science/cleanroom-node-repl`. Inspect actual reported capabilities; optional recursion or reasoning need not be enabled.

Then make a **separate tool call**, in the same task/connection:

```js
installationProbe.count += 1;
nodeRepl.write(installationProbe.count); // must be 42
var installWs = linkedScience.open({ contextKey: 'installation-check' });
var installGraph = await installWs.graphs.load({
  name: 'installation-example', kind: 'instance-data',
  text: '<urn:sample> <urn:measurement> 42 .',
});
var installResult = await installWs.query.run({
  sources: [installGraph], sparql: 'SELECT ?value WHERE { <urn:sample> <urn:measurement> ?value }',
});
nodeRepl.write(await installWs.results.page(installResult));
await installWs.dispose();
```

Expect the numeric sentinel `42` and one query row with the literal value `42`. The first proves cross-call JavaScript persistence; the second exercises the scientific graph/query surface. Disposal cleans up only this diagnostic workspace. Do not reset a user's working session for an installation check.

Report installation complete only after the offline check **and** these mounted identity/persistence/query checks pass. Report the checkout, client, executable, checks and any capability gaps. A live public-source read is a separate goal-relevant scientific operation through the mediator; it is not required for this offline/local activation check. Shared worker sessions and the optional reasoning engine have [separate activation](../architecture/scientific-session.md) and [installation requirements](../architecture/deterministic-reasoning.md).

## Diagnose failures

| Symptom | Next action |
| --- | --- |
| Missing executable, entrypoint or cwd / “No such file or directory” | Check absolute paths in project config; rerun setup from the correct checkout with the intended Node executable, then restart |
| `node:sqlite` import fails | Select a compatible Node runtime; repeat prerequisite check before dependency/setup commands |
| Missing dependencies / module import failure | Verify the package root and successful `npm ci`; inspect the actual error before changing module paths |
| Setup rejects package identity or configuration fields | Check repository and config structure against the checked-in version; preserve unrelated edits and fix the specific mismatch |
| Offline verification fails | Inspect its failing boundary/broker/synthetic stage; do not claim activation or hide the failure by disabling checks |
| Tools missing after successful offline verification | Confirm trusted project, selected checkout, full restart and fresh task; inspect client startup errors |
| Generic REPL or unexpected cwd/identity | Stop the activation claim; reconnect the project-owned broker using [runtime discovery](runtime-discovery.md) |
| Sentinel missing in second call | Check whether calls used the same connection and whether reset/process loss occurred; do not claim cross-call persistence |
| Optional engine/provider unavailable | Report that capability separately; do not treat installation as proof of reasoning or model recursion |

The broader test suite has a known assertion tied to an original `codex-repl` checkout path. That is not a reason to copy another machine's paths into configuration. Keep that failure separate from the actual offline/live activation checks. See [verification](verification.md) for contributor checks and [runtime discovery](runtime-discovery.md) for lifetime/recovery details.
