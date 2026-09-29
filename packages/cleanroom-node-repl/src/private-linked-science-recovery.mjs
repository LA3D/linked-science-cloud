// Private adapter registry: no handle payloads are exposed by workspace inventory.
const adapters = new WeakMap();
export function registerRecoveryAdapter(workspace, adapter) { adapters.set(workspace, adapter); }
export function recoveryAdapter(workspace) {
  const adapter = adapters.get(workspace);
  if (!adapter) throw Object.assign(new Error('A production Linked Science workspace is required'), {code:'HANDOFF_WORKSPACE'});
  return adapter;
}
