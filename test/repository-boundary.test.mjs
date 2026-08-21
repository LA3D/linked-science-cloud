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
