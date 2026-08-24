import assert from 'node:assert/strict';
import test from 'node:test';

import { validateRepositoryBoundaries } from '../scripts/validate-repository-boundaries.mjs';

test('production configuration and runtime remain inside the Linked Science checkout', async () => {
  const result = await validateRepositoryBoundaries();
  assert.equal(result.status, 'passed');
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
