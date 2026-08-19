const REQUIRED_EVENTS = Object.freeze([
  'bootstrap',
  'documentation',
  'orientation.bootstrap',
  'handle.retained',
  'handle.reused',
  'bounded.observation',
  'provenance.observed',
  'reset',
  'stale-handle.rejected',
]);

export function evaluateRuntimeDiscoveryTrace({ goal, events } = {}) {
  if (typeof goal !== 'string' || goal.trim().length === 0) throw new Error('A natural-language scientific goal is required');
  if (!Array.isArray(events)) throw new Error('Discovery evaluation requires an event trace');
  const names = events.map(event => event?.name);
  const missing = REQUIRED_EVENTS.filter(name => !names.includes(name));
  const bootstrapIndex = names.indexOf('bootstrap');
  const docsIndex = names.indexOf('documentation');
  const firstActionIndex = names.findIndex(name => [ 'orientation.bootstrap', 'handle.retained' ].includes(name));
  const docsFirst = bootstrapIndex !== -1 && docsIndex > bootstrapIndex && (firstActionIndex === -1 || docsIndex < firstActionIndex);
  const invented = events.filter(event => event?.supported === false).map(event => event.api).filter(Boolean);
  const bounded = events.find(event => event?.name === 'bounded.observation');
  const boundsValid = Boolean(bounded && Number.isInteger(bounded.bytes) && bounded.bytes <= bounded.maxBytes &&
    (!Number.isInteger(bounded.rows) || bounded.rows <= bounded.maxRows) &&
    (!Number.isInteger(bounded.cells) || bounded.cells <= bounded.maxCells));
  const passed = missing.length === 0 && docsFirst && invented.length === 0 && boundsValid;
  return Object.freeze({
    kind: 'linked-science-runtime-discovery-evaluation',
    passed,
    checks: Object.freeze({ requiredEvents: missing.length === 0, documentationFirst: docsFirst, boundedOutput: boundsValid, noUnsupportedApi: invented.length === 0 }),
    missing,
    unsupportedApis: invented,
    limitation: 'This deterministic fixture evaluates a fresh-agent trace contract; it is not itself a model-autonomy trial.',
  });
}

export const RUNTIME_DISCOVERY_REQUIRED_EVENTS = REQUIRED_EVENTS;
