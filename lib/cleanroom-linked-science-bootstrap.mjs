import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { setupLinkedScience } from './linked-science-runtime.mjs';

export const LINKED_SCIENCE_PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const LINKED_SCIENCE_MODULE_ROOT = resolve(LINKED_SCIENCE_PROJECT_ROOT, 'node_modules');
export const LINKED_SCIENCE_RLM_CONTEXT = 'linked-science:runtime';

function requireMethod(value, name) {
  if (typeof value?.[name] !== 'function') throw new Error(`cleanroom_node_repl is missing nodeRepl.${name}`);
}

function withinModuleRoot(moduleRoot, resolvedUrl) {
  const prefix = `${pathToFileURL(moduleRoot).href.replace(/\/$/u, '')}/`;
  return resolvedUrl.startsWith(prefix);
}

export async function inspectLinkedScienceBootstrap({
  cleanroom,
  projectRoot = LINKED_SCIENCE_PROJECT_ROOT,
  moduleRoot = LINKED_SCIENCE_MODULE_ROOT,
} = {}) {
  if (!cleanroom || typeof cleanroom !== 'object') throw new Error('The clean-room nodeRepl global is required');
  if (resolve(projectRoot) !== LINKED_SCIENCE_PROJECT_ROOT) throw new Error(`Unexpected Linked Science project root: ${projectRoot}`);
  if (resolve(moduleRoot) !== LINKED_SCIENCE_MODULE_ROOT) throw new Error(`Unexpected Linked Science module root: ${moduleRoot}`);
  if (resolve(cleanroom.cwd) !== LINKED_SCIENCE_PROJECT_ROOT) {
    throw new Error(`cleanroom_node_repl cwd mismatch: expected ${LINKED_SCIENCE_PROJECT_ROOT}, received ${cleanroom.cwd}`);
  }
  requireMethod(cleanroom.rlm, 'registerContext');
  requireMethod(cleanroom.rlm, 'inspect');
  for (const method of [ 'begin', 'current', 'edit', 'commit' ]) requireMethod(cleanroom.peek, method);

  const manifest = JSON.parse(await readFile(resolve(LINKED_SCIENCE_PROJECT_ROOT, 'package.json'), 'utf8'));
  const dependencies = Object.keys(manifest.dependencies ?? {}).sort();
  const resolvedDependencies = Object.fromEntries(dependencies.map(name => [ name, import.meta.resolve(name) ]));
  for (const [ name, resolvedUrl ] of Object.entries(resolvedDependencies)) {
    if (!withinModuleRoot(LINKED_SCIENCE_MODULE_ROOT, resolvedUrl)) {
      throw new Error(`Declared dependency ${name} resolved outside ${LINKED_SCIENCE_MODULE_ROOT}`);
    }
  }
  return Object.freeze({
    runtime: 'cleanroom_node_repl',
    mode: cleanroom.rlm.mode,
    projectRoot: LINKED_SCIENCE_PROJECT_ROOT,
    moduleRoot: LINKED_SCIENCE_MODULE_ROOT,
    dependencies: Object.freeze(resolvedDependencies),
  });
}

export async function bootstrapLinkedScience({
  host = globalThis,
  cleanroom = globalThis.nodeRepl,
  projectRoot = LINKED_SCIENCE_PROJECT_ROOT,
  moduleRoot = LINKED_SCIENCE_MODULE_ROOT,
} = {}) {
  const environment = await inspectLinkedScienceBootstrap({ cleanroom, projectRoot, moduleRoot });
  const facade = await setupLinkedScience({ nodeRepl: host, peek: cleanroom.peek, environment });
  cleanroom.rlm.registerContext(LINKED_SCIENCE_RLM_CONTEXT, {
    kind: 'linked-science-runtime-discovery',
    version: facade.version,
    projectRoot: environment.projectRoot,
    moduleRoot: environment.moduleRoot,
    dependencies: environment.dependencies,
    documentation: facade.documentation(),
    api: facade.api,
  });
  return facade;
}
