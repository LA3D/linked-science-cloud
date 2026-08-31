export const LINKED_SCIENCE_VERIFY_COMMAND = 'node scripts/validate-repository-boundaries.mjs && npm run cleanroom:check && node scripts/cleanroom-linked-science-synthetic.mjs';

export const LINKED_SCIENCE_PROJECT_IDENTITY = Object.freeze({
  packageName: '@linked-science/runtime',
  repositoryRole: 'authoritative-production-implementation',
  bootstrapEntrypoint: 'lib/cleanroom-linked-science-bootstrap.mjs',
  broker: Object.freeze({
    packageName: '@linked-science/cleanroom-node-repl',
    packageRoot: 'packages/cleanroom-node-repl',
    entrypoint: 'packages/cleanroom-node-repl/src/cleanroom-mcp.mjs',
    mcpServer: 'cleanroom_node_repl',
    tools: Object.freeze([ 'js', 'js_reset', 'js_add_node_module_dir' ]),
  }),
});

function sameStrings(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

export function assertLinkedScienceProjectManifest(manifest, { source = 'package.json' } = {}) {
  const expected = LINKED_SCIENCE_PROJECT_IDENTITY;
  const declared = manifest?.linkedScience;
  const broker = declared?.broker;
  const failures = [];
  if (manifest?.name !== expected.packageName) failures.push(`package name must be ${expected.packageName}`);
  if (manifest?.private !== true) failures.push('package must remain private');
  if (declared?.repositoryRole !== expected.repositoryRole) failures.push(`linkedScience.repositoryRole must be ${expected.repositoryRole}`);
  if (declared?.bootstrapEntrypoint !== expected.bootstrapEntrypoint) failures.push(`linkedScience.bootstrapEntrypoint must be ${expected.bootstrapEntrypoint}`);
  if (broker?.packageName !== expected.broker.packageName) failures.push(`linkedScience.broker.packageName must be ${expected.broker.packageName}`);
  if (broker?.packageRoot !== expected.broker.packageRoot) failures.push(`linkedScience.broker.packageRoot must be ${expected.broker.packageRoot}`);
  if (broker?.entrypoint !== expected.broker.entrypoint) failures.push(`linkedScience.broker.entrypoint must be ${expected.broker.entrypoint}`);
  if (broker?.mcpServer !== expected.broker.mcpServer) failures.push(`linkedScience.broker.mcpServer must be ${expected.broker.mcpServer}`);
  if (!sameStrings(broker?.tools, expected.broker.tools)) failures.push(`linkedScience.broker.tools must be ${expected.broker.tools.join(', ')}`);
  if (manifest?.scripts?.['linked-science:verify'] !== LINKED_SCIENCE_VERIFY_COMMAND) failures.push('scripts.linked-science:verify must run the authoritative boundary, broker, and synthetic runtime checks');
  if (failures.length > 0) throw new Error(`Invalid authoritative Linked Science project identity in ${source}:\n- ${failures.join('\n- ')}`);
  return expected;
}
