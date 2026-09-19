import { access, readFile, realpath, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertLinkedScienceProjectManifest, LINKED_SCIENCE_PROJECT_IDENTITY } from '../lib/linked-science-project-identity.mjs';

// Explicit, per-checkout setup: never edits global Codex configuration or installs dependencies.
export async function configureProjectMcp({ root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), nodePath = process.execPath } = {}) {
  root = await realpath(resolve(root));
  const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  assertLinkedScienceProjectManifest(manifest);
  const entrypoint = resolve(root, LINKED_SCIENCE_PROJECT_IDENTITY.broker.entrypoint);
  await access(entrypoint, constants.R_OK);
  await access(nodePath, constants.X_OK);
  const configPath = resolve(root, '.codex/config.toml');
  const original = await readFile(configPath, 'utf8');
  const replacements = { command: JSON.stringify(nodePath), args: JSON.stringify([entrypoint]), cwd: JSON.stringify(root) };
  const seen = new Set();
  let section = '';
  const updated = original.split(/\r?\n/u).map(line => {
    const header = line.match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/u);
    if (header) section = header[1];
    if (section !== 'mcp_servers.cleanroom_node_repl') return line;
    const match = line.match(/^\s*(command|args|cwd)\s*=/u);
    if (!match) return line;
    const key = match[1];
    if (seen.has(key)) throw new Error(`Duplicate MCP ${key}; configuration was not changed`);
    seen.add(key);
    return `${key} = ${replacements[key]}`;
  }).join('\n');
  if (seen.size !== 3) throw new Error('Expected command, args and cwd in the project MCP section; configuration was not changed');
  if (updated !== original) await writeFile(configPath, updated);
  return { configPath, command: nodePath, args: [entrypoint], cwd: root, changed: updated !== original };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await import('node:sqlite');
    console.log(JSON.stringify(await configureProjectMcp(), null, 2));
    console.log('Next: npm run linked-science:verify, then restart the desktop app. Keep these machine-specific paths local.');
  } catch (error) {
    console.error(`Project MCP setup failed: ${error.message}`);
    process.exitCode = 1;
  }
}
