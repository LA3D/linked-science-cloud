import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateRepositoryBoundaries } from '../scripts/validate-repository-boundaries.mjs';

test('production configuration and runtime remain inside the Linked Science checkout', async () => {
  const result = await validateRepositoryBoundaries();
  assert.equal(result.status, 'passed');
  assert.equal(result.project.packageName, '@linked-science/runtime');
  assert.equal(result.project.repositoryRole, 'authoritative-production-implementation');
  assert.equal(result.project.broker.mcpServer, 'cleanroom_node_repl');
});

test('documented broker configuration stays inside the authoritative checkout', async () => {
  const config = await readFile(new URL('../packages/cleanroom-node-repl/docs/cleanroom-mcp.config.toml', import.meta.url), 'utf8');
  assert.doesNotMatch(config, /node-repl-network-probe/u);
  assert.match(config, /cwd = "\/Users\/cvardema\/dev\/git\/LA3D\/linked-science-cloud\/codex-repl\/packages\/cleanroom-node-repl"/u);
});

test('root package identity cannot be downgraded to a generic REPL experiment', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  manifest.name = 'linked-data-repl-experiment';
  manifest.linkedScience.repositoryRole = 'experimental-probe';
  await assert.rejects(
    validateRepositoryBoundaries({ manifestText: JSON.stringify(manifest) }),
    /package name must be @linked-science\/runtime|repositoryRole must be authoritative-production-implementation/u,
  );
});

test('project config must name the exact repository-owned broker entrypoint', async () => {
  const config = await readFile(new URL('../.codex/config.toml', import.meta.url), 'utf8');
  await assert.rejects(
    validateRepositoryBoundaries({ configText: config.replace(/packages\/cleanroom-node-repl\/src\/cleanroom-mcp\.mjs/u, 'scripts/smoke.mjs') }),
    /args must name only .*packages\/cleanroom-node-repl\/src\/cleanroom-mcp\.mjs/u,
  );
});

test('nested tool settings configure the existing server and cannot hide another server', async () => {
  const active = await readFile(new URL('../.codex/config.toml', import.meta.url), 'utf8');
  const nested = `${active}\n[mcp_servers.cleanroom_node_repl.tools.example]\napproval_mode = "approve"\n`;
  assert.equal((await validateRepositoryBoundaries({ configText: nested })).status, 'passed');
  await assert.rejects(validateRepositoryBoundaries({ configText: `${active}\n[mcp_servers.unexpected.tools.js]\napproval_mode = "approve"\n` }), /must register only/u);
});

test('boundary validation rejects an experimental sibling MCP path without moving either checkout', async () => {
  const forbidden = [ '/tmp', 'node-repl', 'network-probe', 'src', 'cleanroom-mcp.mjs' ].join('/');
  const config = `[mcp_servers.cleanroom_node_repl]\ncommand = "node"\nargs = ["${forbidden}"]\n`;
  await assert.rejects(
    validateRepositoryBoundaries({ configText: config }),
    /experimental sibling repository|outside the Linked Science checkout/u,
  );
});

test('production configuration cannot reactivate a retired fixed-profile transport', async () => {
  const config = `[mcp_servers.cleanroom_node_repl]\ncommand = "node"\nargs = ["/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl/packages/cleanroom-node-repl/src/cleanroom-mcp.mjs"]\n# guarded-sparql-transport\n`;
  await assert.rejects(validateRepositoryBoundaries({ configText: config }), /retired fixed-profile transport/u);
});

test('production configuration rejects the bundled REPL and hostname-based network approval', async () => {
  const entrypoint = '/Users/cvardema/dev/git/LA3D/linked-science-cloud/codex-repl/packages/cleanroom-node-repl/src/cleanroom-mcp.mjs';
  const bundled = `[mcp_servers.node_repl]\ncommand = "node"\nargs = ["${entrypoint}"]\n`;
  await assert.rejects(validateRepositoryBoundaries({ configText: bundled }), /bundled node_repl/u);

  const allowlisted = `[mcp_servers.cleanroom_node_repl]\ncommand = "node"\nargs = ["${entrypoint}"]\n[permissions.science.network.domains]\n"example.com" = "allow"\n`;
  await assert.rejects(validateRepositoryBoundaries({ configText: allowlisted }), /hostname allowlist/u);
});
