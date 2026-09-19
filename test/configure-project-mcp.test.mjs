import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { configureProjectMcp } from '../scripts/configure-project-mcp.mjs';
import { validateRepositoryBoundaries } from '../scripts/validate-repository-boundaries.mjs';

test('MCP setup repairs a relocated checkout, preserves tool settings, and is idempotent', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'linked-science relocated ')));
  try {
    await mkdir(join(root, '.codex'));
    for (const path of ['package.json', 'package-lock.json', 'packages/cleanroom-node-repl/package.json', 'packages/cleanroom-node-repl/src/cleanroom-mcp.mjs']) {
      const target = join(root, path);
      await mkdir(dirname(target), { recursive: true });
      await cp(new URL(`../${path}`, import.meta.url), target);
    }
    const original = await readFile(new URL('../.codex/config.toml', import.meta.url), 'utf8');
    const extra = '\n[mcp_servers.cleanroom_node_repl.tools.portability_test]\napproval_mode = "prompt"\n';
    await writeFile(join(root, '.codex/config.toml'), original + extra);
    const result = await configureProjectMcp({ root });
    assert.equal(result.changed, true);
    const updated = await readFile(join(root, '.codex/config.toml'), 'utf8');
    assert.ok(updated.includes(`cwd = ${JSON.stringify(root)}`));
    assert.ok(updated.includes(`command = ${JSON.stringify(process.execPath)}`));
    assert.ok(updated.endsWith(extra));
    assert.ok(updated.includes('required = true'));
    assert.equal((await configureProjectMcp({ root })).changed, false);
    // Boundary validation needs the remaining active facade files, not installed dependencies.
    for (const path of ['lib/cleanroom-linked-science-bootstrap.mjs', 'lib/linked-science-runtime.mjs', 'packages/cleanroom-node-repl/src/repl-kernel-child.mjs', 'packages/cleanroom-node-repl/src/mediated-traversal.mjs']) {
      await mkdir(join(root, path.slice(0,path.lastIndexOf('/'))), { recursive: true });
      await cp(new URL(`../${path}`, import.meta.url), join(root,path));
    }
    assert.equal((await validateRepositoryBoundaries({ root, files: ['.codex/config.toml'] })).status, 'passed');
    await writeFile(join(root, '.codex/config.toml'), updated.replace(/^cwd = .*\n/mu, ''));
    const malformed = await readFile(join(root, '.codex/config.toml'), 'utf8');
    await assert.rejects(configureProjectMcp({ root }), /Expected command, args and cwd/u);
    assert.equal(await readFile(join(root, '.codex/config.toml'), 'utf8'), malformed);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
