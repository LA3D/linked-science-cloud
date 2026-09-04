import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertLinkedScienceProjectManifest,
  LINKED_SCIENCE_PROJECT_IDENTITY,
} from '../lib/linked-science-project-identity.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const experimentalName = [ 'node-repl', 'network-probe' ].join('-');
const productionRoots = Object.freeze([
  '.codex',
  'lib',
  'scripts',
  'package.json',
  'package-lock.json',
  'packages/cleanroom-node-repl/package.json',
  'packages/cleanroom-node-repl/docs/cleanroom-mcp.config.toml',
  'packages/cleanroom-node-repl/src',
]);
const inspectedExtensions = new Set([ '.cjs', '.js', '.json', '.mjs', '.toml' ]);
const retiredTransportModules = [
  'guarded-sparql-transport', 'guarded-documentation-fetch', 'guarded-evidence-acquisition',
  'linked-data-source-profiles', 'linked-data-affordances',
];
const activeTransportFiles = [
  '.codex/config.toml', 'package.json', 'lib/cleanroom-linked-science-bootstrap.mjs',
  'lib/linked-science-runtime.mjs', 'packages/cleanroom-node-repl/src/cleanroom-mcp.mjs',
  'packages/cleanroom-node-repl/src/repl-kernel-child.mjs', 'packages/cleanroom-node-repl/src/mediated-traversal.mjs',
];

function within(root, candidate) {
  const path = relative(root, candidate);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

function quotedValues(line) {
  return [ ...line.matchAll(/"([^"\n]+)"/gu) ].map(match => match[1]);
}

function sameStrings(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function configSection(config, name) {
  const assignments = new Map();
  let current = '';
  for (const line of config.split(/\r?\n/u)) {
    const section = line.match(/^\s*\[([^\]]+)\]\s*$/u);
    if (section) {
      current = section[1];
      continue;
    }
    if (current !== name) continue;
    const assignment = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/u);
    if (assignment) assignments.set(assignment[1], assignment[2]);
  }
  return assignments;
}

function quotedScalar(value) {
  return value?.match(/^"([^"\n]+)"$/u)?.[1];
}

async function collectFiles(root, paths = productionRoots) {
  const files = [];
  async function visit(relativePath) {
    const absolute = resolve(root, relativePath);
    const info = await lstat(absolute);
    if (info.isSymbolicLink()) {
      const target = await realpath(absolute);
      if (!within(root, target)) throw new Error(`Production path escapes through a symlink: ${relativePath}`);
      return;
    }
    if (info.isDirectory()) {
      const entries = await readdir(absolute, { withFileTypes: true });
      for (const entry of entries) await visit(resolve(relativePath, entry.name));
      return;
    }
    const extension = relativePath.slice(relativePath.lastIndexOf('.'));
    if (inspectedExtensions.has(extension)) files.push(relative(root, absolute));
  }
  for (const path of paths) await visit(path);
  return files.sort();
}

export async function validateRepositoryBoundaries({ root = projectRoot, configText, manifestText, files } = {}) {
  const failures = [];
  let inspected;
  try {
    inspected = files ?? await collectFiles(root);
  } catch (error) {
    failures.push(error.message);
    inspected = [];
  }
  for (const path of inspected) {
    const text = path === '.codex/config.toml' && configText !== undefined
      ? configText
      : path === 'package.json' && manifestText !== undefined
        ? manifestText
        : await readFile(resolve(root, path), 'utf8');
    if (text.includes(experimentalName)) failures.push(`${path} references the experimental sibling repository`);
    for (const match of text.matchAll(/(?:from\s+|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/gu)) {
      const specifier = match[1];
      if (isAbsolute(specifier) && !within(root, resolve(specifier))) failures.push(`${path} imports outside the Linked Science checkout: ${specifier}`);
    }
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestText ?? await readFile(resolve(root, 'package.json'), 'utf8'));
    assertLinkedScienceProjectManifest(manifest);
  } catch (error) {
    failures.push(error.message);
  }
  try {
    const lock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
    if (lock.name !== LINKED_SCIENCE_PROJECT_IDENTITY.packageName || lock.packages?.['']?.name !== LINKED_SCIENCE_PROJECT_IDENTITY.packageName) {
      failures.push(`package-lock.json must identify ${LINKED_SCIENCE_PROJECT_IDENTITY.packageName} at the root`);
    }
  } catch (error) {
    failures.push(`package-lock.json is unavailable or invalid (${error.message})`);
  }
  try {
    const brokerManifest = JSON.parse(await readFile(resolve(root, LINKED_SCIENCE_PROJECT_IDENTITY.broker.packageRoot, 'package.json'), 'utf8'));
    if (brokerManifest.name !== LINKED_SCIENCE_PROJECT_IDENTITY.broker.packageName) failures.push(`Broker package must be ${LINKED_SCIENCE_PROJECT_IDENTITY.broker.packageName}`);
    if (brokerManifest.linkedScienceRepositoryRole !== 'production-runtime') failures.push('Broker package must declare linkedScienceRepositoryRole production-runtime');
  } catch (error) {
    failures.push(`Broker package identity is unavailable or invalid (${error.message})`);
  }

  const config = configText ?? await readFile(resolve(root, '.codex/config.toml'), 'utf8');
  const expected = LINKED_SCIENCE_PROJECT_IDENTITY;
  // Nested tables configure a server's tools; they do not register another
  // server. Still inspect their first key so an unexpected server cannot hide
  // behind a nested table.
  const serverSections = [ ...new Set([ ...config.matchAll(/^\s*\[mcp_servers\.([^\]]+)\]\s*(?:#.*)?$/gmu) ].map(match => match[1].split('.')[0])) ];
  if (!sameStrings(serverSections, [ expected.broker.mcpServer ])) {
    failures.push(`.codex/config.toml must register only mcp_servers.${expected.broker.mcpServer}`);
  }
  if (/^\[mcp_servers\.node_repl\]/mu.test(config)) failures.push('.codex/config.toml must not register the bundled node_repl');
  if (/^\[permissions\.[^\]]+\.network\.domains\]/mu.test(config)) failures.push('.codex/config.toml must not use a hostname allowlist as the Linked Science traversal boundary');
  const server = configSection(config, `mcp_servers.${expected.broker.mcpServer}`);
  if (quotedScalar(server.get('command')) !== 'node') failures.push('.codex/config.toml must launch the project broker with node');
  const args = quotedValues(server.get('args') ?? '');
  const expectedEntrypoint = resolve(root, expected.broker.entrypoint);
  if (!sameStrings(args, [ expectedEntrypoint ])) failures.push(`.codex/config.toml args must name only ${expectedEntrypoint}`);
  const configuredCwd = quotedScalar(server.get('cwd'));
  if (!configuredCwd || !isAbsolute(configuredCwd) || resolve(configuredCwd) !== resolve(root)) failures.push(`.codex/config.toml cwd must be the authoritative checkout ${resolve(root)}`);
  if (server.get('enabled') !== 'true' || server.get('required') !== 'true') failures.push('.codex/config.toml must keep the project broker enabled and required');
  const configuredTools = quotedValues(server.get('enabled_tools') ?? '');
  if (!sameStrings(configuredTools, expected.broker.tools)) failures.push(`.codex/config.toml enabled_tools must be exactly ${expected.broker.tools.join(', ')}`);
  for (const value of args) {
    if (!isAbsolute(value)) continue;
    const candidate = resolve(value);
    if (!within(root, candidate)) {
      failures.push(`MCP executable argument resolves outside the Linked Science checkout: ${value}`);
      continue;
    }
    try {
      const [ actual, info ] = await Promise.all([ realpath(candidate), lstat(candidate) ]);
      if (!within(root, actual)) failures.push(`MCP executable argument escapes through a symlink: ${value}`);
      if (info.isSymbolicLink()) failures.push(`MCP executable argument must not be a symlink: ${value}`);
    } catch (error) {
      failures.push(`MCP executable argument is unavailable: ${value} (${error.code ?? 'unknown'})`);
    }
  }
  for (const path of activeTransportFiles) {
    const text = path === '.codex/config.toml' && configText !== undefined ? configText : await readFile(resolve(root, path), 'utf8');
    for (const retired of retiredTransportModules) {
      if (text.includes(retired)) failures.push(`${path} references retired fixed-profile transport ${retired}`);
    }
  }
  if (failures.length > 0) throw new Error(`Repository boundary validation failed:\n- ${failures.join('\n- ')}`);
  return Object.freeze({ status: 'passed', root, project: LINKED_SCIENCE_PROJECT_IDENTITY, productionFiles: inspected.length });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await validateRepositoryBoundaries();
  console.log(JSON.stringify(result, null, 2));
}
