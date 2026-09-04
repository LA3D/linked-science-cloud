import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const DEFAULT_MAX_RESULT_BYTES = 1024 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 4 * 1024 * 1024 * 1024;
const MAX_APPEND_BYTES = 256 * 1024;
const MAX_PAGE_ITEMS = 1_000;
const RESULT_KINDS = new Set([ "quads" ]);

function spoolError(code, message) {
  return Object.assign(new Error(message), { code });
}

function validOwner(owner) {
  return owner && typeof owner.token === "string" && owner.token.length > 0 && Number.isInteger(owner.epoch);
}

function sameOwner(record, owner) {
  return validOwner(owner) && record.ownerToken === owner.token && record.ownerEpoch === owner.epoch;
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
    this.database.exec(`
      PRAGMA journal_mode = DELETE;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS result_items (
        result_id TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (result_id, ordinal),
        UNIQUE (result_id, payload)
      );
    `);
    this.insertItem = this.database.prepare("INSERT OR IGNORE INTO result_items (result_id, ordinal, payload) VALUES (?, ?, ?)");
    this.pageItems = this.database.prepare("SELECT payload FROM result_items WHERE result_id = ? ORDER BY ordinal LIMIT ? OFFSET ?");
    this.deleteItems = this.database.prepare("DELETE FROM result_items WHERE result_id = ?");
    this.records = new Map();
    this.totalBytes = 0;
    this.closed = false;
  }

  capabilities() {
    return Object.freeze({
      kind: "linked-science-result-spool",
      version: "1.0.0",
      owner: "cleanroom-broker",
      backend: "sqlite",
      durability: "kernel-epoch",
      resultKinds: Object.freeze([ ...RESULT_KINDS ]),
      maxResultBytes: this.maxResultBytes,
      maxTotalBytes: this.maxTotalBytes,
      maxAppendBytes: MAX_APPEND_BYTES,
      maxAppendItems: MAX_PAGE_ITEMS,
      maxPageItems: MAX_PAGE_ITEMS,
      completeBeforePublication: true,
    });
  }

  #record(storageId, owner, expectedState) {
    if (this.closed) throw spoolError("RESULT_SPOOL_CLOSED", "Result spool is closed");
    const record = this.records.get(storageId);
    if (!record || !sameOwner(record, owner)) throw spoolError("RESULT_SPOOL_HANDLE_DENIED", "Stored result is missing or belongs to another kernel epoch");
    if (expectedState && record.state !== expectedState) throw spoolError("RESULT_SPOOL_STATE", `Stored result is ${record.state}, expected ${expectedState}`);
    return record;
  }

  begin({ kind, maxBytes } = {}, owner = {}) {
    if (!validOwner(owner)) throw spoolError("RESULT_SPOOL_OWNER_REQUIRED", "Stored results require a kernel capability token and epoch");
    if (!RESULT_KINDS.has(kind)) throw spoolError("RESULT_SPOOL_KIND", "Only RDF quad results can use the out-of-core spool");
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
    });
    return Object.freeze({ storageId, kind, maxBytes: effectiveMaxBytes, maxAppendBytes: MAX_APPEND_BYTES, maxAppendItems: MAX_PAGE_ITEMS });
  }

  append({ storageId, items } = {}, owner = {}) {
    const record = this.#record(storageId, owner, "active");
    if (!Array.isArray(items) || items.length < 1 || items.length > MAX_PAGE_ITEMS) {
      throw spoolError("RESULT_SPOOL_APPEND", `Stored-result appends require 1-${MAX_PAGE_ITEMS} items`);
    }
    const payloads = items.map(item => JSON.stringify(item));
    const appendBytes = payloads.reduce((sum, payload) => sum + Buffer.byteLength(payload, "utf8") + 1, 0);
    if (appendBytes > MAX_APPEND_BYTES) throw spoolError("RESULT_SPOOL_APPEND_LIMIT", `Stored-result append exceeds ${MAX_APPEND_BYTES} bytes`);
    let insertedBytes = 0;
    const insertedPayloads = [];
    let nextOrdinal = record.nextOrdinal;
    this.database.exec("BEGIN IMMEDIATE");
    try {
      for (const payload of payloads) {
        const result = this.insertItem.run(storageId, nextOrdinal, payload);
        if (result.changes === 1) {
          nextOrdinal += 1;
          insertedBytes += Buffer.byteLength(payload, "utf8") + 1;
          insertedPayloads.push(payload);
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

  commit({ storageId } = {}, owner = {}) {
    const record = this.#record(storageId, owner, "active");
    record.state = "complete";
    record.sha256 = record.hash.digest("hex");
    delete record.hash;
    return Object.freeze({
      kind: "linked-science-stored-result",
      storageId,
      resultType: record.kind,
      count: record.count,
      bytes: record.bytes,
      sha256: record.sha256,
      backend: "broker-sqlite",
      durability: "kernel-epoch",
      complete: true,
    });
  }

  page({ storageId, offset = 0, limit = 10 } = {}, owner = {}) {
    const record = this.#record(storageId, owner, "complete");
    if (!Number.isInteger(offset) || offset < 0 || offset > record.count || !Number.isInteger(limit) || limit < 0 || limit > MAX_PAGE_ITEMS) {
      throw spoolError("RESULT_SPOOL_PAGE", `Stored-result pages require a valid offset and limit no greater than ${MAX_PAGE_ITEMS}`);
    }
    const items = this.pageItems.all(storageId, limit, offset).map(row => JSON.parse(row.payload));
    return Object.freeze({ storageId, offset, total: record.count, items: Object.freeze(items) });
  }

  abort({ storageId } = {}, owner = {}) {
    const record = this.#record(storageId, owner);
    this.deleteItems.run(storageId);
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
        this.deleteItems.run(storageId);
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
    if (this.ownsRoot) rmSync(this.root, { recursive: true, force: true });
  }
}
