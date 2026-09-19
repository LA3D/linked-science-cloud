import { readFileSync } from 'node:fs';

const names = ['episode', 'objective', 'evidence', 'outcome', 'corpus', 'pattern', 'wiki-proposal'];
const schemas = new Map(names.map(name => [name + '.schema.json', JSON.parse(readFileSync(new URL(`../../schemas/wiki-learning/${name}.schema.json`, import.meta.url), 'utf8'))]));
const fail = message => { throw new Error(`Wiki-learning contract: ${message}`); };

// This is deliberately only the closed JSON Schema vocabulary used by these
// checked-in contracts, not a general JSON Schema implementation.
const keywords = new Set(['$schema', 'title', '$ref', 'type', 'properties', 'required', 'additionalProperties', 'items', 'minItems', 'maxItems', 'minLength', 'maxLength', 'minimum', 'pattern', 'enum', 'const', 'anyOf']);
function shape(value, schema, path) {
  for (const key of Object.keys(schema)) if (!keywords.has(key)) fail(`unsupported schema keyword ${key}`);
  if (schema.$ref) {
    const target = schemas.get(schema.$ref);
    if (!target) fail(`unknown schema reference ${schema.$ref}`);
    return shape(value, target, path);
  }
  if (schema.anyOf) {
    for (const alternative of schema.anyOf) {
      try { shape(value, alternative, path); return; } catch { /* try next declared alternative */ }
    }
    fail(`${path} matches no declared shape`);
  }
  if ('const' in schema && value !== schema.const) fail(`${path} must equal ${schema.const}`);
  if (schema.enum && !schema.enum.includes(value)) fail(`${path} is outside the declared enum`);
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (schema.type && !types.includes(type) && !(types.includes('integer') && Number.isSafeInteger(value))) fail(`${path} has invalid type`);
  if (type === 'object') {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) fail(`${path}.${key} is required`);
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(schema.properties ?? {}, key)) fail(`${path}.${key} is not an allowed field`);
      shape(value[key], schema.properties[key], `${path}.${key}`);
    }
  }
  if (type === 'array') {
    if (value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity)) fail(`${path} array bound`);
    value.forEach((item, index) => shape(item, schema.items, `${path}[${index}]`));
  }
  if (type === 'string') {
    if (value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? Infinity)) fail(`${path} string bound`);
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) fail(`${path} invalid format`);
  }
  if (type === 'number' && value < (schema.minimum ?? -Infinity)) fail(`${path} below minimum`);
}

function jsonOnly(value, depth = 0, seen = new Set()) {
  if (depth > 24) fail('record nesting bound');
  if (value === null || ['string', 'boolean'].includes(typeof value)) return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || seen.has(value)) fail('records must be acyclic JSON values');
  if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('records must be plain JSON objects');
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue;
    if (Array.isArray(value) && (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/u.test(key) || Number(key) >= value.length)) fail('arrays cannot carry extra fields');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) fail('accessors and hidden fields are not records');
    jsonOnly(descriptor.value, depth + 1, seen);
  }
  if (Array.isArray(value)) for (let i = 0; i < value.length; i++) if (!Object.hasOwn(value, i)) fail('sparse arrays are not records');
  seen.delete(value);
}

export function assertRelativePath(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\') || path.includes(':') || path.includes('\0') || path.split('/').some(part => !part || part === '.' || part === '..')) fail('artifact path must be a confined relative path');
  return path;
}

export function validateRecord(kind, input) {
  if (!names.includes(kind)) fail(`unknown record kind ${kind}`);
  jsonOnly(input);
  if (Buffer.byteLength(JSON.stringify(input)) > 512 * 1024) fail('record exceeds 512 KiB');
  shape(input, schemas.get(kind + '.schema.json'), kind);
  const record = structuredClone(input);
  if (kind === 'evidence') {
    if (record.artifact) {
      assertRelativePath(record.artifact.path);
      if (record.artifact.pointer && !/^(?:\/(?:[^~]|~[01])*)*$/u.test(record.artifact.pointer)) fail('invalid JSON pointer');
    }
    if (['durable-artifact', 'receipt-only'].includes(record.kind) && !record.artifact) fail('durable/receipt evidence requires an artifact');
    if (['historical-handle', 'missing'].includes(record.kind) && record.artifact) fail('historical/missing evidence cannot claim saved artifact bytes');
    if (record.kind === 'historical-handle' && !record.historicalHandle) fail('historical handle metadata required');
    if (record.kind !== 'durable-artifact' && !record.missingEvidence.length) fail('limited evidence must state what is missing');
    if (['historical-handle', 'reconstructed', 'missing'].includes(record.kind) && record.completion === 'scoped-complete') fail('historical/reconstructed/missing evidence cannot prove completeness');
  }
  if (kind === 'outcome' && record.status === 'passed' && !record.evidenceIds.length) fail('passed outcome needs evidence');
  if (kind === 'outcome' && ['partial', 'unknown'].includes(record.status) && !record.missingEvidence.length) fail('uncertain outcome must state missing evidence');
  return record;
}

function indexed(records, label) {
  const result = new Map();
  for (const record of records) {
    if (result.has(record.id)) fail(`duplicate ${label} id ${record.id}`);
    result.set(record.id, record);
  }
  return result;
}

export function validateEpisode(input) {
  const episode = validateRecord('episode', input);
  if (episode.capture.kind === 'direct-runtime' && episode.schemaVersion !== '1.1.0') fail('direct-runtime capture requires episode 1.1.0');
  assertRelativePath(episode.host.observableEvents.path);
  assertRelativePath(episode.skillBaseline.manifestPath);
  const events = indexed(episode.events, 'event');
  const objectives = indexed(episode.objectives, 'objective');
  const evidence = indexed(episode.evidence, 'evidence');
  indexed(episode.joins, 'join'); indexed(episode.outcomes, 'outcome');
  const hostItems = new Set();
  let sequence = -1, previous = null, objectiveSequence = -1;
  for (const event of events.values()) {
    if (event.sequence <= sequence) fail('event sequence must be strictly increasing');
    sequence = event.sequence;
    const key = `${event.turnId}/${event.itemId}`;
    if (hostItems.has(key)) fail('duplicate host item');
    hostItems.add(key);
    for (const id of event.objectiveIds) if (!objectives.has(id)) fail('event references unknown objective');
  }
  for (const objective of objectives.values()) {
    validateRecord('objective', objective);
    const event = events.get(objective.eventId);
    const objectiveKind = episode.capture.kind === 'direct-runtime' ? 'mcpToolCall' : 'userMessage';
    if (!event || event.kind !== objectiveKind || !event.objectiveIds.includes(objective.id)) fail('objective must link an observable user message or versioned runtime declaration');
    if (objective.previousId !== previous || event.sequence <= objectiveSequence) fail('objective revision chain/order is invalid');
    previous = objective.id; objectiveSequence = event.sequence;
  }
  for (const event of events.values()) for (const id of event.objectiveIds) {
    if (events.get(objectives.get(id).eventId).sequence > event.sequence) fail('event cannot use a future objective');
  }
  for (const item of evidence.values()) validateRecord('evidence', item);
  for (const join of episode.joins) {
    const event = events.get(join.eventId);
    if (!event || !event.objectiveIds.includes(join.objectiveId)) fail('join must match event objective');
    if (event.kind !== 'mcpToolCall') fail('scientific join needs an observable MCP action');
    if (join.basis === 'unresolved') {
      if (join.evidenceId !== null || join.operationId !== null || join.traversalId !== null) fail('unresolved join cannot invent target identifiers');
    } else if (!evidence.has(join.evidenceId)) fail('join references unknown evidence');
    if (['explicit', 'verified-content'].includes(join.basis) && (!join.operationId || evidence.get(join.evidenceId).kind !== 'receipt-only')) fail('verified join requires retained receipt-only operation evidence');
  }
  for (const outcome of episode.outcomes) {
    validateRecord('outcome', outcome);
    if (!objectives.has(outcome.objectiveId)) fail('outcome references unknown objective');
    for (const id of outcome.evidenceIds) if (!evidence.has(id)) fail('outcome references unknown evidence');
    if (outcome.kind === 'machine-check' && outcome.status === 'passed' && outcome.evidenceIds.every(id => ['reconstructed', 'historical-handle', 'missing'].includes(evidence.get(id).kind))) fail('machine pass cannot rely solely on reconstructed or lost evidence');
    if (outcome.kind === 'machine-check' && outcome.status === 'passed' && !episode.joins.some(link => link.objectiveId === outcome.objectiveId && outcome.evidenceIds.includes(link.evidenceId) && ['explicit', 'verified-content'].includes(link.basis))) fail('machine pass needs an operation joined to that objective');
  }
  if (episode.capture.completeness === 'partial' && !episode.capture.gaps.length) fail('partial capture requires gaps');
  if (episode.capture.kind === 'synthetic' && [episode.host.memory.use, episode.host.memory.generation].some(value => !['unknown', 'not-observed'].includes(value))) fail('synthetic fixture cannot attest host memory settings');
  return episode;
}
