import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const experimentalName = [ 'node-repl', 'network-probe' ].join('-');
const productionRoots = Object.freeze([
  '.codex',
  'lib',
  'scripts',
  'package.json',
  'packages/cleanroom-node-repl/package.json',
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

export async function validateRepositoryBoundaries({ root = projectRoot, configText, files } = {}) {
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
      : await readFile(resolve(root, path), 'utf8');
    if (text.includes(experimentalName)) failures.push(`${path} references the experimental sibling repository`);
    for (const match of text.matchAll(/(?:from\s+|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/gu)) {
      const specifier = match[1];
      if (isAbsolute(specifier) && !within(root, resolve(specifier))) failures.push(`${path} imports outside the Linked Science checkout: ${specifier}`);
    }
  }

  const config = configText ?? await readFile(resolve(root, '.codex/config.toml'), 'utf8');
  if (/^\[mcp_servers\.node_repl\]/mu.test(config)) failures.push('.codex/config.toml must not register the bundled node_repl');
  if (/^\[permissions\.[^\]]+\.network\.domains\]/mu.test(config)) failures.push('.codex/config.toml must not use a hostname allowlist as the Linked Science traversal boundary');
  const argsLine = config.split(/\r?\n/u).find(line => /^args\s*=/u.test(line.trim()));
  if (!argsLine) failures.push('.codex/config.toml lacks an MCP args entry');
  for (const value of quotedValues(argsLine ?? '')) {
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
  return Object.freeze({ status: 'passed', root, productionFiles: inspected.length });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await validateRepositoryBoundaries();
  console.log(JSON.stringify(result, null, 2));
}
