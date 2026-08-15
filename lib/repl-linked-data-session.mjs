import { createHash } from 'node:crypto';

const MAX_MATERIALIZED_ROWS = 500;
const MAX_PAGE_SIZE = 10;
const MAX_SAMPLE_SIZE = 5;
const MAX_DISPLAY_COLUMNS = 20;
const MAX_DISPLAY_TITLE_LENGTH = 160;
const MAX_DISPLAY_SCALAR_LENGTH = 2_048;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireBoundedInteger(value, fallback, maximum, name) {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 0 || resolved > maximum) throw new Error(`${name} must be an integer from 0 to ${maximum}`);
  return resolved;
}

function compactRow(binding) {
  return Object.fromEntries([ ...binding ].map(([ key, value ]) => [ key.value, value.value ]));
}

function safeDisplayString(value, maximum, name) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) throw new Error(`${name} must be a non-empty string of at most ${maximum} characters`);
  return value;
}

function safeDisplayScalar(value) {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length <= MAX_DISPLAY_SCALAR_LENGTH) return value;
  throw new Error('Display cells must be bounded scalar values');
}

function provenanceSummary(provenance) {
  const transport = Array.isArray(provenance?.transport) ? provenance.transport[0] : provenance;
  const fields = [ 'profile', 'source', 'endpoint', 'method', 'queryType', 'queryLimit', 'status', 'at', 'redirect', 'timeoutMs', 'retries' ];
  const summary = {};
  for (const field of fields) {
    const value = provenance?.[field] ?? transport?.[field];
    if (value !== undefined) summary[field] = safeDisplayScalar(value);
  }
  return summary;
}

function profileRecord(record, sampleSize = 2) {
  const sample = record.rows ? record.rows.slice(0, requireBoundedInteger(sampleSize, 2, MAX_SAMPLE_SIZE, 'sampleSize')) : [];
  return {
    handle: record.handle,
    status: record.status,
    count: record.count,
    columns: record.columns,
    sample,
    provenance: record.provenance,
    lineage: record.lineage,
    safeOperations: ['profile', 'page', 'displayTable', 'filterEquals', 'countBy', 'checkpoint', 'recognize'],
  };
}

export function createTableDisplay({ session, handle, title, columns, offset = 0, limit = 5 } = {}) {
  if (!session?.profile || !session?.page) throw new Error('A retained result session is required');
  const profile = session.profile(handle, { sampleSize: 0 });
  const selectedColumns = columns ?? profile.columns;
  if (!Array.isArray(selectedColumns) || selectedColumns.length === 0 || selectedColumns.length > MAX_DISPLAY_COLUMNS ||
    new Set(selectedColumns).size !== selectedColumns.length || !selectedColumns.every(column => profile.columns.includes(column))) {
    throw new Error(`Display columns must be 1-${MAX_DISPLAY_COLUMNS} distinct known columns`);
  }
  const page = session.page(handle, { offset, limit });
  return {
    kind: 'table',
    title: safeDisplayString(title, MAX_DISPLAY_TITLE_LENGTH, 'Display title'),
    source: { handle, provenance: provenanceSummary(profile.provenance) },
    columns: selectedColumns.map(key => ({ key, label: safeDisplayString(key, MAX_DISPLAY_TITLE_LENGTH, 'Display column') })),
    rows: page.rows.map(row => Object.fromEntries(selectedColumns.map(column => [ column, safeDisplayScalar(row[column] ?? null) ]))),
    page: { offset: page.offset, limit: page.limit, total: page.count },
  };
}

export class LinkedDataReplSession {
  constructor({ engine, sources, maxRows = MAX_MATERIALIZED_ROWS } = {}) {
    if (!engine?.queryBindings || !Array.isArray(sources)) throw new Error('An engine and sources array are required');
    this.engine = engine;
    this.sources = sources;
    this.maxRows = requireBoundedInteger(maxRows, MAX_MATERIALIZED_ROWS, MAX_MATERIALIZED_ROWS, 'maxRows');
    this.records = new Map();
  }

  async materialize({ handle, query, provenance = { source: 'local-synthetic' } } = {}) {
    if (this.sources.length === 0) throw new Error('Query materialization requires configured local sources');
    const bindings = await (await this.engine.queryBindings(query, { sources: this.sources })).toArray();
    return this.materializeBindings({ handle, bindings, query, provenance });
  }

  materializeBindings({ handle, bindings, query, provenance = { source: 'local-synthetic' } } = {}) {
    if (!/^[a-z][a-z0-9-]{1,63}$/u.test(handle ?? '') || this.records.has(handle)) throw new Error('Handle must be a new lowercase symbolic identifier');
    if (!Array.isArray(bindings) || typeof query !== 'string') throw new Error('Materialization requires binding rows and query text');
    if (bindings.length > this.maxRows) throw new Error(`Materialization exceeds ${this.maxRows} rows`);
    const rows = bindings.map(compactRow);
    const columns = [ ...new Set(rows.flatMap(row => Object.keys(row))) ].sort();
    this.records.set(handle, {
      handle,
      status: 'ready',
      rows,
      count: rows.length,
      columns,
      provenance: clone(provenance),
      lineage: { kind: 'materialized', querySha256: createHash('sha256').update(query).digest('hex') },
    });
    return this.profile(handle);
  }

  profile(handle, { sampleSize = 2 } = {}) {
    return clone(profileRecord(this.#ready(handle), sampleSize));
  }

  page(handle, { offset = 0, limit = 5 } = {}) {
    const record = this.#ready(handle);
    const boundedOffset = requireBoundedInteger(offset, 0, record.count, 'offset');
    const boundedLimit = requireBoundedInteger(limit, 5, MAX_PAGE_SIZE, 'limit');
    return { handle, offset: boundedOffset, limit: boundedLimit, count: record.count, rows: clone(record.rows.slice(boundedOffset, boundedOffset + boundedLimit)) };
  }

  displayTable({ handle, title, columns, offset = 0, limit = 5 } = {}) {
    return createTableDisplay({ session: this, handle, title, columns, offset, limit });
  }

  deriveFilter({ handle, sourceHandle, column, equals } = {}) {
    const source = this.#ready(sourceHandle);
    if (!source.columns.includes(column) || typeof equals !== 'string') throw new Error('Filter requires an existing column and string equality value');
    return this.#storeDerived(handle, source, source.rows.filter(row => row[column] === equals), { kind: 'filterEquals', column, equals });
  }

  deriveCountBy({ handle, sourceHandle, column } = {}) {
    const source = this.#ready(sourceHandle);
    if (!source.columns.includes(column)) throw new Error('countBy requires an existing column');
    const counts = new Map();
    for (const row of source.rows) counts.set(row[column], (counts.get(row[column]) ?? 0) + 1);
    const rows = [ ...counts.entries() ].sort(([ left ], [ right ]) => left.localeCompare(right)).map(([ value, count ]) => ({ [column]: value, count: String(count) }));
    return this.#storeDerived(handle, source, rows, { kind: 'countBy', column });
  }

  checkpoint() {
    return {
      version: 1,
      handles: [ ...this.records.values() ].map(record => profileRecord(record, 2)),
      recovery: 'Handles are recognized but result rows remain resident only in this REPL session.',
    };
  }

  invalidate(handle, reason = 'session-reset') {
    const record = this.#ready(handle);
    record.status = 'invalidated';
    record.rows = undefined;
    record.invalidation = reason;
    return this.recognize(handle);
  }

  recognize(handle) {
    const record = this.records.get(handle);
    if (!record) return { handle, status: 'missing', recoverable: false };
    return { handle, status: record.status, recoverable: record.status === 'ready', invalidation: record.invalidation };
  }

  recover(checkpoint) {
    if (checkpoint?.version !== 1 || !Array.isArray(checkpoint.handles)) throw new Error('Invalid session checkpoint');
    return checkpoint.handles.map(({ handle }) => this.recognize(handle));
  }

  #storeDerived(handle, source, rows, operation) {
    if (!/^[a-z][a-z0-9-]{1,63}$/u.test(handle ?? '') || this.records.has(handle)) throw new Error('Handle must be a new lowercase symbolic identifier');
    if (rows.length > this.maxRows) throw new Error(`Derived result exceeds ${this.maxRows} rows`);
    const columns = [ ...new Set(rows.flatMap(row => Object.keys(row))) ].sort();
    this.records.set(handle, {
      handle,
      status: 'ready',
      rows,
      count: rows.length,
      columns,
      provenance: source.provenance,
      lineage: { kind: 'derived', sourceHandle: source.handle, operation },
    });
    return this.profile(handle);
  }

  #ready(handle) {
    const record = this.records.get(handle);
    if (!record) throw new Error(`Unknown handle: ${handle}`);
    if (record.status !== 'ready') throw new Error(`Handle is ${record.status}: ${handle}`);
    return record;
  }
}

export function initializeLinkedDataSession(options) {
  return new LinkedDataReplSession(options);
}
