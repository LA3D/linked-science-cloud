import { createHash } from 'node:crypto';

const RAW_QUERY_MARKERS = /\b(?:SELECT|ASK|CONSTRUCT|DESCRIBE|INSERT|DELETE|SERVICE)\b/i;
const ORIENTATION_SECTIONS = Object.freeze([
  'context-roadmap',
  'context-understanding',
  'domain-constants',
  'parsing-schema',
  'reusable-results',
]);
const ORIENTATION_EVENT_KINDS = new Set([
  'source',
  'failure',
  'relation',
  'constant',
  'parsing-rule',
  'result-handle',
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [ key, stable(value[key]) ]));
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function orientationId(section, key) {
  return `cm-${createHash('sha256').update(`${section}\0${key}`).digest('hex').slice(0, 12)}`;
}

function assertSymbolicValue(value, depth = 0) {
  if (depth > 4) throw new Error('Orientation values may nest at most four levels');
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return true;
  if (typeof value === 'string') {
    if (value.length === 0 || value.length > 1_024 || RAW_QUERY_MARKERS.test(value)) throw new Error('Orientation strings must be compact and exclude raw query text');
    return true;
  }
  if (Array.isArray(value)) {
    if (value.length > 20) throw new Error('Orientation arrays may contain at most 20 values');
    value.forEach(item => assertSymbolicValue(item, depth + 1));
    return true;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length > 20) throw new Error('Orientation objects may contain at most 20 fields');
    for (const [ key, item ] of entries) {
      if (!/^[a-z][a-z0-9-]{0,63}$/u.test(key)) throw new Error(`Invalid symbolic field: ${key}`);
      assertSymbolicValue(item, depth + 1);
    }
    return true;
  }
  throw new Error('Orientation values must be JSON-compatible symbolic data');
}

export function createOrientationMap({ contextId, maxItems = 30 } = {}) {
  if (typeof contextId !== 'string' || contextId.length === 0 || contextId.length > 256) throw new Error('A compact contextId is required');
  if (!Number.isInteger(maxItems) || maxItems < 5 || maxItems > 100) throw new Error('maxItems must be 5-100');
  return Object.freeze({
    version: 1,
    kind: 'peek-orientation-cache',
    contextId,
    budget: { maxItems },
    sequence: 0,
    sections: Object.fromEntries(ORIENTATION_SECTIONS.map(section => [ section, [] ])),
  });
}

export function recordOrientation(contextMap, { section, key, kind, value, evidenceHandles = [], priority = 50 } = {}) {
  const map = clone(contextMap);
  assertOrientationMap(map);
  if (!ORIENTATION_SECTIONS.includes(section)) throw new Error(`Unknown orientation section: ${section}`);
  if (typeof key !== 'string' || key.length === 0 || key.length > 160) throw new Error('Orientation entries require a compact key');
  if (!ORIENTATION_EVENT_KINDS.has(kind)) throw new Error(`Unknown orientation kind: ${kind}`);
  assertSymbolicValue(value);
  if (!Array.isArray(evidenceHandles) || evidenceHandles.length > 10 || evidenceHandles.some(handle => !/^[a-z][a-z0-9-]{1,63}$/u.test(handle))) {
    throw new Error('Orientation evidenceHandles must be bounded symbolic handles');
  }
  if (!Number.isInteger(priority) || priority < 0 || priority > 100) throw new Error('priority must be 0-100');
  const id = orientationId(section, key);
  for (const name of ORIENTATION_SECTIONS) map.sections[name] = map.sections[name].filter(item => item.id !== id);
  map.sequence += 1;
  map.sections[section].push({ id, key, kind, value: clone(value), evidenceHandles: [ ...new Set(evidenceHandles) ], priority, sequence: map.sequence });
  const entries = ORIENTATION_SECTIONS.flatMap(name => map.sections[name].map(item => ({ section: name, item })));
  if (entries.length > map.budget.maxItems) {
    entries.sort((left, right) => left.item.priority - right.item.priority || left.item.sequence - right.item.sequence || left.item.id.localeCompare(right.item.id));
    const evicted = entries[0];
    map.sections[evicted.section] = map.sections[evicted.section].filter(item => item.id !== evicted.item.id);
  }
  assertOrientationMap(map);
  return Object.freeze(map);
}

export function compactOrientationMap(contextMap) {
  const map = clone(contextMap);
  assertOrientationMap(map);
  return JSON.stringify(stable(map));
}

export function recoverOrientationMap(compactMap) {
  const map = typeof compactMap === 'string' ? JSON.parse(compactMap) : clone(compactMap);
  assertOrientationMap(map);
  return Object.freeze(map);
}

export function assertOrientationMap(map) {
  if (map?.version !== 1 || map.kind !== 'peek-orientation-cache' || typeof map.contextId !== 'string' || !Number.isInteger(map.sequence)) {
    throw new Error('Invalid symbolic orientation map');
  }
  if (!Number.isInteger(map.budget?.maxItems) || map.budget.maxItems < 5 || map.budget.maxItems > 100) throw new Error('Invalid orientation-map budget');
  if (!map.sections || Object.keys(map.sections).sort().join('|') !== [ ...ORIENTATION_SECTIONS ].sort().join('|')) {
    throw new Error('Invalid orientation-map sections');
  }
  const entries = ORIENTATION_SECTIONS.flatMap(section => map.sections[section]);
  if (entries.length > map.budget.maxItems) throw new Error('Orientation map exceeds its item budget');
  const ids = new Set();
  for (const section of ORIENTATION_SECTIONS) {
    if (!Array.isArray(map.sections[section])) throw new Error('Invalid orientation-map section');
    for (const item of map.sections[section]) {
      if (ids.has(item.id) || item.id !== orientationId(section, item.key)) throw new Error('Invalid or duplicate orientation entry ID');
      ids.add(item.id);
      if (!ORIENTATION_EVENT_KINDS.has(item.kind)) throw new Error('Invalid orientation entry kind');
      if (!Number.isInteger(item.priority) || item.priority < 0 || item.priority > 100 || !Number.isInteger(item.sequence)) {
        throw new Error('Invalid orientation entry priority or sequence');
      }
      if (!Array.isArray(item.evidenceHandles) || item.evidenceHandles.length > 10) throw new Error('Invalid orientation evidence handles');
      assertSymbolicValue(item.value);
    }
  }
  return true;
}

export function recordAcquisitionOrientation(contextMap, { handle, receipt, priority = 70 } = {}) {
  if (!receipt || receipt.kind !== 'guarded-evidence-acquisition' || receipt.handle !== handle) {
    throw new Error('A matching guarded acquisition receipt is required');
  }
  const sourceKey = `source:${receipt.source}`;
  if (receipt.status === 'retrieved') {
    let map = recordOrientation(contextMap, {
      section: 'context-roadmap',
      key: sourceKey,
      kind: 'source',
      value: { source: receipt.source, status: 'retrieved', profile: receipt.profile, sha256: receipt.sha256 },
      evidenceHandles: [handle],
      priority,
    });
    map = recordOrientation(map, {
      section: 'parsing-schema',
      key: `parse:${receipt.source}`,
      kind: 'parsing-rule',
      value: {
        source: receipt.source,
        'declared-content-type': receipt.declaredContentType || 'unknown',
        'detected-format': receipt.detectedFormat,
        'metadata-mismatch': receipt.metadataMismatch === true,
      },
      evidenceHandles: [handle],
      priority,
    });
    return map;
  }
  return recordOrientation(contextMap, {
    section: 'context-understanding',
    key: `failure:${receipt.source}:${receipt.stage}`,
    kind: 'failure',
    value: { source: receipt.source, status: 'failed', stage: receipt.stage, profile: receipt.profile || 'unknown' },
    evidenceHandles: receipt.stage === 'acquisition' ? [handle] : [],
    priority,
  });
}

export function recordResultOrientation(contextMap, { profile, role, priority = 60 } = {}) {
  if (!profile || typeof profile.handle !== 'string' || typeof role !== 'string' || role.length === 0 || role.length > 160) {
    throw new Error('A retained handle profile and compact reusable role are required');
  }
  return recordOrientation(contextMap, {
    section: 'reusable-results',
    key: `result:${role}`,
    kind: 'result-handle',
    value: { role, handle: profile.handle, kind: profile.kind, count: profile.count },
    evidenceHandles: [profile.handle],
    priority,
  });
}

export const ORIENTATION_MAP_SECTIONS = ORIENTATION_SECTIONS;
