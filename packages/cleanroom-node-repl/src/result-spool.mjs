import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const RESULT_SPOOL_VERSION = "1.1.0";
const DEFAULT_MAX_RESULT_BYTES = 1024 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 4 * 1024 * 1024 * 1024;
const MAX_APPEND_BYTES = 256 * 1024;
const MAX_PAGE_ITEMS = 1_000;
const MAX_COLUMNS = 100;
const MAX_COLUMN_CHARS = 200;
const RESULT_KINDS = new Set([ "quads", "bindings" ]);
const QUAD_POSITIONS = Object.freeze({ subject: "s", predicate: "p", object: "o", graph: "g" });
// Each index is ordered by result_id first; the remaining columns give a total
// order for keyset pagination once the bound prefix is fixed.
const QUAD_INDEXES = Object.freeze([
  { name: "quad_items_spo", columns: [ "s", "p", "o", "g" ] },
  { name: "quad_items_pos", columns: [ "p", "o", "s", "g" ] },
  { name: "quad_items_osp", columns: [ "o", "s", "p", "g" ] },
]);
const XSD_STRING = "http://www.w3.org/2001/XMLSchema#string";

function spoolError(code, message) {
  return Object.assign(new Error(message), { code });
}

function validOwner(owner) {
  return owner && typeof owner.token === "string" && owner.token.length > 0 && Number.isInteger(owner.epoch);
}

function sameOwner(record, owner) {
  return validOwner(owner) && record.ownerToken === owner.token && record.ownerEpoch === owner.epoch;
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Canonical key for one serialized RDF/JS term. Keys are only compared for
// equality and ordering inside the spool; the JSON payload remains the exact
// reconstruction source.
export function termKey(term, depth = 0) {
  if (!plainObject(term) || typeof term.termType !== "string") throw spoolError("RESULT_SPOOL_ITEM_INVALID", "Stored RDF term is malformed");
  if (depth > 8) throw spoolError("RESULT_SPOOL_ITEM_INVALID", "Stored RDF term nesting is too deep");
  if (term.termType === "Quad") {
    return `<<${termKey(term.subject, depth + 1)} ${termKey(term.predicate, depth + 1)} ${termKey(term.object, depth + 1)} ${termKey(term.graph, depth + 1)}>>`;
  }
  if (term.termType === "DefaultGraph") return "";
  if (typeof term.value !== "string") throw spoolError("RESULT_SPOOL_ITEM_INVALID", "Stored RDF term value must be a string");
  if (term.termType === "NamedNode") return `<${term.value}>`;
  if (term.termType === "BlankNode") return `_:${term.value}`;
  if (term.termType === "Variable") return `?${term.value}`;
  if (term.termType === "Literal") {
    const literal = JSON.stringify(term.value);
    return typeof term.language === "string" && term.language.length > 0
      ? `${literal}@${term.language}`
      : `${literal}^^<${typeof term.datatype === "string" && term.datatype.length > 0 ? term.datatype : XSD_STRING}>`;
  }
  throw spoolError("RESULT_SPOOL_ITEM_INVALID", `Stored RDF term type is unsupported: ${term.termType}`);
}

function quadKeys(item) {
  if (!plainObject(item)) throw spoolError("RESULT_SPOOL_ITEM_INVALID", "Stored quad is malformed");
  return Object.fromEntries(Object.entries(QUAD_POSITIONS).map(([ position, column ]) => [ column, termKey(item[position]) ]));
}

function normalizePattern(pattern) {
  if (pattern === undefined) return {};
  if (!plainObject(pattern) || Object.keys(pattern).some(key => !(key in QUAD_POSITIONS))) {
    throw spoolError("RESULT_SPOOL_PATTERN", "A quad pattern may bind only subject, predicate, object, and graph");
  }
  const bound = {};
  for (const [ position, column ] of Object.entries(QUAD_POSITIONS)) {
    const term = pattern[position];
    if (term === undefined || term === null) continue;
    if (plainObject(term) && term.termType === "Variable") continue;
    bound[column] = termKey(term);
  }
  return bound;
}

function normalizeColumns(columns) {
  if (columns === undefined) return undefined;
  if (!Array.isArray(columns) || columns.length > MAX_COLUMNS || columns.some(column => typeof column !== "string" || column.length < 1 || column.length > MAX_COLUMN_CHARS)) {
    throw spoolError("RESULT_SPOOL_METADATA", `Stored bindings columns must be 0-${MAX_COLUMNS} bounded strings`);
  }
  return Object.freeze([ ...new Set(columns) ]);
}

function selectQuadIndex(bound) {
  let best;
  for (const index of QUAD_INDEXES) {
    let prefix = 0;
    while (prefix < index.columns.length && bound[index.columns[prefix]] !== undefined) prefix += 1;
    if (!best || prefix > best.prefix) best = { index, prefix };
  }
  return best;
}

export class ResultSpoolRegistry {
  constructor({ root, maxResultBytes = DEFAULT_MAX_RESULT_BYTES, maxTotalBytes = DEFAULT_MAX_TOTAL_BYTES } = {}) {
    if (!Number.isInteger(maxResultBytes) || maxResultBytes < 1 || !Number.isInteger(maxTotalBytes) || maxTotalBytes < maxResultBytes) {
      throw new TypeError("Result spool byte limits are invalid");
    }
    this.ownsRoot = root === undefined;
    this.root = root === undefined ? mkdtempSync(join(tmpdir(), "linked-science-results-")) : resolve(root);
    if (!this.ownsRoot) mkdirSync(this.root, { recursive: true, mode: 0o700 });
    this.databasePath = join(this.root, "results.sqlite");
    this.maxResultBytes = maxResultBytes;
    this.maxTotalBytes = maxTotalBytes;
    this.database = new DatabaseSync(this.databasePath);
    // Spool durability is kernel-epoch: nothing from an earlier process is
    // reachable, so any rows left in a reused root are cleared on open.
    this.database.exec(`
      PRAGMA journal_mode = DELETE;
      PRAGMA synchronous = NORMAL;
      DROP TABLE IF EXISTS result_items;
      CREATE TABLE IF NOT EXISTS quad_items (
        result_id TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        s TEXT NOT NULL,
        p TEXT NOT NULL,
        o TEXT NOT NULL,
        g TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS quad_items_ordinal ON quad_items (result_id, ordinal);
      CREATE UNIQUE INDEX IF NOT EXISTS quad_items_spo ON quad_items (result_id, s, p, o, g);
      CREATE INDEX IF NOT EXISTS quad_items_pos ON quad_items (result_id, p, o, s, g);
      CREATE INDEX IF NOT EXISTS quad_items_osp ON quad_items (result_id, o, s, p, g);
      CREATE TABLE IF NOT EXISTS binding_items (
        result_id TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS binding_items_ordinal ON binding_items (result_id, ordinal);
      DELETE FROM quad_items;
      DELETE FROM binding_items;
    `);
    this.statements = {
      insertQuad: this.database.prepare("INSERT OR IGNORE INTO quad_items (result_id, ordinal, s, p, o, g, payload) VALUES (?, ?, ?, ?, ?, ?, ?)"),
      insertBinding: this.database.prepare("INSERT INTO binding_items (result_id, ordinal, payload) VALUES (?, ?, ?)"),
      pageQuads: this.database.prepare("SELECT payload FROM quad_items INDEXED BY quad_items_ordinal WHERE result_id = ? ORDER BY ordinal LIMIT ? OFFSET ?"),
      pageBindings: this.database.prepare("SELECT payload FROM binding_items INDEXED BY binding_items_ordinal WHERE result_id = ? ORDER BY ordinal LIMIT ? OFFSET ?"),
      deleteQuads: this.database.prepare("DELETE FROM quad_items WHERE result_id = ?"),
      deleteBindings: this.database.prepare("DELETE FROM binding_items WHERE result_id = ?"),
    };
    this.matchStatements = new Map();
    this.records = new Map();
    this.totalBytes = 0;
    this.closed = false;
  }

  capabilities() {
    return Object.freeze({
      kind: "linked-science-result-spool",
      version: RESULT_SPOOL_VERSION,
      owner: "cleanroom-broker",
      backend: "sqlite",
      durability: "kernel-epoch",
      resultKinds: Object.freeze([ ...RESULT_KINDS ]),
      maxResultBytes: this.maxResultBytes,
      maxTotalBytes: this.maxTotalBytes,
      maxAppendBytes: MAX_APPEND_BYTES,
      maxAppendItems: MAX_PAGE_ITEMS,
      maxPageItems: MAX_PAGE_ITEMS,
      maxMatchItems: MAX_PAGE_ITEMS,
      completeBeforePublication: true,
      quadIndexes: Object.freeze(QUAD_INDEXES.map(index => index.columns.join(""))),
      patternPushdown: true,
      exactPatternCounts: true,
    });
  }

  #record(storageId, owner, expectedState) {
    if (this.closed) throw spoolError("RESULT_SPOOL_CLOSED", "Result spool is closed");
    const record = this.records.get(storageId);
    if (!record || !sameOwner(record, owner)) throw spoolError("RESULT_SPOOL_HANDLE_DENIED", "Stored result is missing or belongs to another kernel epoch");
    if (expectedState && record.state !== expectedState) throw spoolError("RESULT_SPOOL_STATE", `Stored result is ${record.state}, expected ${expectedState}`);
    return record;
  }

  #deleteRows(record) {
    (record.kind === "quads" ? this.statements.deleteQuads : this.statements.deleteBindings).run(record.storageId);
  }

  begin({ kind, maxBytes } = {}, owner = {}) {
    if (!validOwner(owner)) throw spoolError("RESULT_SPOOL_OWNER_REQUIRED", "Stored results require a kernel capability token and epoch");
    if (!RESULT_KINDS.has(kind)) throw spoolError("RESULT_SPOOL_KIND", "Only RDF quad and SPARQL bindings results can use the out-of-core spool");
    const effectiveMaxBytes = maxBytes === undefined ? this.maxResultBytes : maxBytes;
    if (!Number.isInteger(effectiveMaxBytes) || effectiveMaxBytes < 1 || effectiveMaxBytes > this.maxResultBytes) {
      throw spoolError("RESULT_SPOOL_BUDGET", `Stored result maxBytes must be between 1 and ${this.maxResultBytes}`);
    }
    const storageId = `result-${randomBytes(18).toString("hex")}`;
    this.records.set(storageId, {
      storageId,
      ownerToken: owner.token,
      ownerEpoch: owner.epoch,
      kind,
      state: "active",
      count: 0,
      nextOrdinal: 0,
      bytes: 0,
      maxBytes: effectiveMaxBytes,
      hash: createHash("sha256"),
      columns: undefined,
    });
    return Object.freeze({ storageId, kind, maxBytes: effectiveMaxBytes, maxAppendBytes: MAX_APPEND_BYTES, maxAppendItems: MAX_PAGE_ITEMS });
  }

  append({ storageId, items } = {}, owner = {}) {
    const record = this.#record(storageId, owner, "active");
    if (!Array.isArray(items) || items.length < 1 || items.length > MAX_PAGE_ITEMS) {
      throw spoolError("RESULT_SPOOL_APPEND", `Stored-result appends require 1-${MAX_PAGE_ITEMS} items`);
    }
    const prepared = items.map(item => {
      if (record.kind === "bindings" && !Array.isArray(item)) throw spoolError("RESULT_SPOOL_ITEM_INVALID", "Stored binding rows must be arrays of variable/term pairs");
      const payload = JSON.stringify(item);
      return { payload, keys: record.kind === "quads" ? quadKeys(item) : undefined, bytes: Buffer.byteLength(payload, "utf8") + 1 };
    });
    const appendBytes = prepared.reduce((sum, item) => sum + item.bytes, 0);
    if (appendBytes > MAX_APPEND_BYTES) throw spoolError("RESULT_SPOOL_APPEND_LIMIT", `Stored-result append exceeds ${MAX_APPEND_BYTES} bytes`);
    let insertedBytes = 0;
    const insertedPayloads = [];
    let nextOrdinal = record.nextOrdinal;
    this.database.exec("BEGIN IMMEDIATE");
    try {
      for (const item of prepared) {
        const result = record.kind === "quads"
          ? this.statements.insertQuad.run(storageId, nextOrdinal, item.keys.s, item.keys.p, item.keys.o, item.keys.g, item.payload)
          : this.statements.insertBinding.run(storageId, nextOrdinal, item.payload);
        if (result.changes === 1) {
          nextOrdinal += 1;
          insertedBytes += item.bytes;
          insertedPayloads.push(item.payload);
        }
      }
      if (record.bytes + insertedBytes > record.maxBytes) throw spoolError("RESULT_SPOOL_RESULT_LIMIT", "Stored result exceeds its broker-owned byte quota");
      if (this.totalBytes + insertedBytes > this.maxTotalBytes) throw spoolError("RESULT_SPOOL_TOTAL_LIMIT", "Broker result storage is exhausted");
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
    for (const payload of insertedPayloads) record.hash.update(payload).update("\n");
    record.count += insertedPayloads.length;
    record.nextOrdinal = nextOrdinal;
    record.bytes += insertedBytes;
    this.totalBytes += insertedBytes;
    return Object.freeze({ storageId, count: record.count, bytes: record.bytes });
  }

  commit({ storageId, columns } = {}, owner = {}) {
    const record = this.#record(storageId, owner, "active");
    const normalizedColumns = record.kind === "bindings" ? normalizeColumns(columns) ?? Object.freeze([]) : undefined;
    record.state = "complete";
    record.sha256 = record.hash.digest("hex");
    record.columns = normalizedColumns;
    delete record.hash;
    return Object.freeze({
      kind: "linked-science-stored-result",
      version: RESULT_SPOOL_VERSION,
      storageId,
      resultType: record.kind,
      count: record.count,
      bytes: record.bytes,
      sha256: record.sha256,
      backend: "broker-sqlite",
      durability: "kernel-epoch",
      complete: true,
      ...(record.kind === "bindings" ? { columns: normalizedColumns } : { indexed: true }),
    });
  }

  page({ storageId, offset = 0, limit = 10 } = {}, owner = {}) {
    const record = this.#record(storageId, owner, "complete");
    if (!Number.isInteger(offset) || offset < 0 || offset > record.count || !Number.isInteger(limit) || limit < 0 || limit > MAX_PAGE_ITEMS) {
      throw spoolError("RESULT_SPOOL_PAGE", `Stored-result pages require a valid offset and limit no greater than ${MAX_PAGE_ITEMS}`);
    }
    const statement = record.kind === "quads" ? this.statements.pageQuads : this.statements.pageBindings;
    const items = statement.all(storageId, limit, offset).map(row => JSON.parse(row.payload));
    return Object.freeze({ storageId, offset, total: record.count, items: Object.freeze(items) });
  }

  #planMatch(pattern) {
    const bound = normalizePattern(pattern);
    const boundColumns = Object.keys(bound).sort();
    // A pattern that binds nothing, or only the graph, streams in insertion
    // order through the ordinal index; every other shape uses the quad index
    // with the longest bound prefix and pages by the remaining index columns.
    if (boundColumns.length === 0 || (boundColumns.length === 1 && boundColumns[0] === "g")) {
      return { bound, boundColumns, index: undefined, cursorColumns: [ "ordinal" ] };
    }
    const { index, prefix } = selectQuadIndex(bound);
    return { bound, boundColumns, index, cursorColumns: index.columns.slice(prefix).filter(column => bound[column] === undefined) };
  }

  #statement({ boundColumns, index, cursorColumns }, { count = false, withCursor = false } = {}) {
    const key = [ count ? "count" : "match", index?.name ?? "ordinal", boundColumns.join(""), cursorColumns.join(""), withCursor ? "cursor" : "first" ].join(":");
    let statement = this.matchStatements.get(key);
    if (statement) return statement;
    const where = [ "result_id = ?", ...boundColumns.map(column => `${column} = ?`) ];
    let sql;
    if (count) {
      sql = `SELECT COUNT(*) AS count FROM quad_items WHERE ${where.join(" AND ")}`;
    } else {
      const orderColumns = cursorColumns.length > 0 ? cursorColumns : [ "ordinal" ];
      if (withCursor && cursorColumns.length > 0) where.push(`(${cursorColumns.join(", ")}) > (${cursorColumns.map(() => "?").join(", ")})`);
      const indexed = index ? index.name : "quad_items_ordinal";
      sql = `SELECT payload, ${orderColumns.join(", ")} FROM quad_items INDEXED BY ${indexed} WHERE ${where.join(" AND ")} ORDER BY ${orderColumns.join(", ")} LIMIT ?`;
    }
    statement = this.database.prepare(sql);
    this.matchStatements.set(key, statement);
    return statement;
  }

  // Streams the quads matching a pattern in a stable index order using keyset
  // pagination. `after` is the opaque cursor returned by the previous call.
  match({ storageId, pattern, after, limit = MAX_PAGE_ITEMS } = {}, owner = {}) {
    const record = this.#record(storageId, owner, "complete");
    if (record.kind !== "quads") throw spoolError("RESULT_SPOOL_KIND", "Pattern matching is available only for stored quad results");
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_ITEMS) throw spoolError("RESULT_SPOOL_PAGE", `Stored-result matches require a limit from 1 to ${MAX_PAGE_ITEMS}`);
    const plan = this.#planMatch(pattern);
    const { bound, boundColumns, index, cursorColumns } = plan;
    let cursor;
    if (after !== undefined && after !== null) {
      if (!Array.isArray(after) || after.length !== cursorColumns.length || after.some(value => index ? typeof value !== "string" : !Number.isInteger(value))) {
        throw spoolError("RESULT_SPOOL_CURSOR", "Stored-result match cursor does not fit the pattern shape");
      }
      cursor = after;
    }
    const withCursor = cursor !== undefined && cursorColumns.length > 0;
    const statement = this.#statement(plan, { withCursor });
    const rows = statement.all(storageId, ...boundColumns.map(column => bound[column]), ...(withCursor ? cursor : []), limit);
    const items = rows.map(row => JSON.parse(row.payload));
    const last = rows.at(-1);
    const complete = rows.length < limit || cursorColumns.length === 0;
    const nextCursor = !complete && last ? Object.freeze(cursorColumns.map(column => last[column])) : null;
    return Object.freeze({ storageId, items: Object.freeze(items), cursor: nextCursor, done: complete });
  }

  count({ storageId, pattern } = {}, owner = {}) {
    const record = this.#record(storageId, owner, "complete");
    if (record.kind !== "quads") throw spoolError("RESULT_SPOOL_KIND", "Pattern counts are available only for stored quad results");
    const plan = this.#planMatch(pattern);
    const row = this.#statement(plan, { count: true }).get(storageId, ...plan.boundColumns.map(column => plan.bound[column]));
    return Object.freeze({ storageId, count: Number(row?.count ?? 0) });
  }

  abort({ storageId } = {}, owner = {}) {
    const record = this.#record(storageId, owner);
    this.#deleteRows(record);
    this.records.delete(storageId);
    this.totalBytes -= record.bytes;
    return Object.freeze({ ok: true, storageId, removed: true });
  }

  releaseOwner(owner = {}) {
    if (!validOwner(owner) || this.closed) return { ok: true, removed: 0 };
    const ids = [ ...this.records.values() ].filter(record => sameOwner(record, owner)).map(record => record.storageId);
    this.database.exec("BEGIN IMMEDIATE");
    try {
      for (const storageId of ids) {
        const record = this.records.get(storageId);
        this.#deleteRows(record);
        this.records.delete(storageId);
        this.totalBytes -= record.bytes;
      }
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
    return Object.freeze({ ok: true, removed: ids.length });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.database.close();
    this.records.clear();
    this.matchStatements.clear();
    if (this.ownsRoot) rmSync(this.root, { recursive: true, force: true });
  }
}
