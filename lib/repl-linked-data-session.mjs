import { createHash } from 'node:crypto';

const MAX_MATERIALIZED_ROWS = 500;
const MAX_PAGE_SIZE = 10;
const MAX_SAMPLE_SIZE = 5;
const MAX_DISPLAY_COLUMNS = 20;
const MAX_DISPLAY_TITLE_LENGTH = 160;
const MAX_DISPLAY_SCALAR_LENGTH = 2_048;
const MAX_EVIDENCE_INSPECTION_LENGTH = 2_048;

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

function compactQuad(quad) {
  if (!quad?.subject || !quad?.predicate || !quad?.object || !quad?.graph) throw new Error('Graph materialization requires RDF quads');
  return {
    subject: quad.subject.value,
    predicate: quad.predicate.value,
    object: quad.object.value,
    graph: quad.graph.termType === 'DefaultGraph' ? '' : quad.graph.value,
    objectType: quad.object.termType,
    objectLanguage: quad.object.language ?? '',
    objectDatatype: quad.object.datatype?.value ?? '',
  };
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

function requireNewHandle(records, handle) {
  if (!/^[a-z][a-z0-9-]{1,63}$/u.test(handle ?? '') || records.has(handle)) {
    throw new Error('Handle must be a new lowercase symbolic identifier');
  }
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
    kind: record.kind,
    status: record.status,
    count: record.count,
    columns: record.columns,
    sample,
    metadata: record.metadata ? clone(record.metadata) : undefined,
    provenance: record.provenance,
    lineage: record.lineage,
    safeOperations: record.kind === 'evidence'
      ? ['profile', 'inspectEvidence', 'checkpoint', 'recognize']
      : record.kind === 'attempt'
        ? ['profile', 'checkpoint', 'recognize']
        : record.kind === 'boolean'
      ? ['profile', 'page', 'checkpoint', 'recognize']
      : ['profile', 'page', 'displayTable', 'filterEquals', 'countBy', 'checkpoint', 'recognize'],
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

  assertCanMaterializeBindings({ handle, maximumRows } = {}) {
    return this.assertCanMaterializeResult({ handle, maximumItems: maximumRows });
  }

  assertCanMaterializeResult({ handle, maximumItems } = {}) {
    requireNewHandle(this.records, handle);
    if (!Number.isInteger(maximumItems) || maximumItems < 0 || maximumItems > this.maxRows) {
      throw new Error(`Session must permit the guarded result cap of ${maximumItems} items`);
    }
    return { handle, status: 'available', maximumItems };
  }

  materializeBindings({ handle, bindings, query, provenance = { source: 'local-synthetic' } } = {}) {
    requireNewHandle(this.records, handle);
    if (!Array.isArray(bindings) || typeof query !== 'string') throw new Error('Materialization requires binding rows and query text');
    if (bindings.length > this.maxRows) throw new Error(`Materialization exceeds ${this.maxRows} rows`);
    return this.#storeMaterialized(handle, 'bindings', bindings.map(compactRow), query, provenance);
  }

  materializeBoolean({ handle, value, query, provenance = { source: 'local-synthetic' } } = {}) {
    requireNewHandle(this.records, handle);
    if (typeof value !== 'boolean' || typeof query !== 'string') throw new Error('Boolean materialization requires a boolean value and query text');
    return this.#storeMaterialized(handle, 'boolean', [{ value }], query, provenance);
  }

  materializeQuads({ handle, quads, query, provenance = { source: 'local-synthetic' } } = {}) {
    requireNewHandle(this.records, handle);
    if (!Array.isArray(quads) || typeof query !== 'string') throw new Error('Graph materialization requires RDF quads and query text');
    if (quads.length > this.maxRows) throw new Error(`Graph materialization exceeds ${this.maxRows} quads`);
    return this.#storeMaterialized(handle, 'quads', quads.map(compactQuad), query, provenance);
  }

  materializeEvidence({ handle, content, receipt, provenance = {} } = {}) {
    requireNewHandle(this.records, handle);
    if (typeof content !== 'string' || content.length === 0 || !receipt || receipt.status !== 'retrieved') {
      throw new Error('Evidence materialization requires non-empty content and a retrieved receipt');
    }
    const metadata = {
      source: receipt.source,
      declaredContentType: receipt.declaredContentType,
      detectedFormat: receipt.detectedFormat,
      metadataMismatch: receipt.metadataMismatch === true,
      byteLength: receipt.byteLength,
      sha256: receipt.sha256,
    };
    this.records.set(handle, {
      handle,
      kind: 'evidence',
      status: 'ready',
      content,
      count: 1,
      columns: [],
      sample: [],
      metadata,
      provenance: clone({ ...provenance, receipt }),
      lineage: { kind: 'acquired', source: receipt.source, sha256: receipt.sha256 },
    });
    return { ...this.profile(handle, { sampleSize: 0 }), metadata: clone(metadata) };
  }

  materializeAttempt({ handle, action, status, reason, provenance = {} } = {}) {
    requireNewHandle(this.records, handle);
    if (typeof action !== 'string' || action.length === 0 || status !== 'failed' || typeof reason !== 'string' || reason.length === 0) {
      throw new Error('Attempt materialization requires an action, failed status, and reason');
    }
    this.records.set(handle, {
      handle,
      kind: 'attempt',
      status: 'ready',
      count: 1,
      columns: [],
      sample: [],
      provenance: clone(provenance),
      lineage: { kind: 'attempt', action, outcome: status, reason },
    });
    return this.profile(handle, { sampleSize: 0 });
  }

  profile(handle, { sampleSize = 2 } = {}) {
    return clone(profileRecord(this.#ready(handle), sampleSize));
  }

  page(handle, { offset = 0, limit = 5 } = {}) {
    const record = this.#ready(handle);
    if (!record.rows) throw new Error(`Handle kind does not support paging: ${record.kind}`);
    const boundedOffset = requireBoundedInteger(offset, 0, record.count, 'offset');
    const boundedLimit = requireBoundedInteger(limit, 5, MAX_PAGE_SIZE, 'limit');
    return { handle, offset: boundedOffset, limit: boundedLimit, count: record.count, rows: clone(record.rows.slice(boundedOffset, boundedOffset + boundedLimit)) };
  }

  inspectEvidence(handle, { offset = 0, length = 512 } = {}) {
    const record = this.#ready(handle);
    if (record.kind !== 'evidence' || typeof record.content !== 'string') throw new Error('Evidence inspection requires an evidence handle');
    const boundedOffset = requireBoundedInteger(offset, 0, record.content.length, 'offset');
    const boundedLength = requireBoundedInteger(length, 512, MAX_EVIDENCE_INSPECTION_LENGTH, 'length');
    return {
      handle,
      offset: boundedOffset,
      length: boundedLength,
      totalLength: record.content.length,
      text: record.content.slice(boundedOffset, boundedOffset + boundedLength),
      metadata: clone(record.metadata),
    };
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
    requireNewHandle(this.records, handle);
    if (rows.length > this.maxRows) throw new Error(`Derived result exceeds ${this.maxRows} rows`);
    const columns = [ ...new Set(rows.flatMap(row => Object.keys(row))) ].sort();
    this.records.set(handle, {
      handle,
      kind: 'bindings',
      status: 'ready',
      rows,
      count: rows.length,
      columns,
      provenance: source.provenance,
      lineage: { kind: 'derived', sourceHandle: source.handle, operation },
    });
    return this.profile(handle);
  }

  #storeMaterialized(handle, kind, rows, query, provenance) {
    const columns = [ ...new Set(rows.flatMap(row => Object.keys(row))) ].sort();
    this.records.set(handle, {
      handle,
      kind,
      status: 'ready',
      rows,
      count: rows.length,
      columns,
      provenance: clone(provenance),
      lineage: { kind: 'materialized', querySha256: createHash('sha256').update(query).digest('hex') },
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
