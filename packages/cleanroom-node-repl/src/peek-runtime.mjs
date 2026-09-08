import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const DEFAULT_TOKEN_BUDGET = 2_000;
const MAX_CONTEXTS = 32;
const MAX_ENTRIES = 128;
const MAX_ENTRY_BYTES = 8 * 1024;
const SECTIONS = new Set([
  "context-roadmap",
  "context-understanding",
  "domain-constants",
  "parsing-schema",
  "reusable-results",
]);

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function stableId(section, text) {
  return createHash("sha256").update(`${section}\0${text}`).digest("hex").slice(0, 16);
}

function estimateTokens(value) {
  return Math.ceil(Buffer.byteLength(JSON.stringify(value), "utf8") / 4);
}

function validateContextId(contextId) {
  if (typeof contextId !== "string" || !/^[A-Za-z0-9_.:-]{1,96}$/.test(contextId)) {
    throw Object.assign(new Error("Invalid PEEK context id"), { code: "INVALID_CONTEXT_ID" });
  }
}

function normalizeEntry(input, sequence) {
  if (!plainObject(input) || !SECTIONS.has(input.section) || typeof input.text !== "string") {
    throw Object.assign(new Error("Invalid PEEK entry"), { code: "INVALID_PEEK_ENTRY" });
  }
  const text = input.text.trim();
  if (!text || Buffer.byteLength(text, "utf8") > MAX_ENTRY_BYTES) {
    throw Object.assign(new Error("Invalid PEEK entry"), { code: "INVALID_PEEK_ENTRY" });
  }
  return {
    id: typeof input.id === "string" && /^[A-Za-z0-9_.:-]{1,96}$/.test(input.id)
      ? input.id
      : stableId(input.section, text),
    section: input.section,
    text,
    score: Number.isFinite(input.score) ? Math.max(0, Math.min(1, input.score)) : 0.5,
    sequence,
  };
}

function publicMap(record) {
  return {
    version: 1,
    contextId: record.contextId,
    tokenBudget: record.tokenBudget,
    estimatedTokens: estimateTokens(record.entries),
    queryCount: record.queryCount,
    entries: record.entries.map(({ sequence: _sequence, ...entry }) => entry),
  };
}

function evict(record) {
  while (record.entries.length > MAX_ENTRIES || estimateTokens(record.entries) > record.tokenBudget) {
    record.entries.sort((a, b) => a.score - b.score || a.sequence - b.sequence || a.id.localeCompare(b.id));
    record.entries.shift();
  }
  record.entries.sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
}

export class PeekRegistry {
  constructor({ policy = null } = {}) {
    this.policy = policy;
    this.contexts = new Map();
    this.sequence = 0;
  }

  begin(contextId, { tokenBudget = DEFAULT_TOKEN_BUDGET } = {}) {
    validateContextId(contextId);
    if (!Number.isInteger(tokenBudget) || tokenBudget < 64 || tokenBudget > 32_000) {
      throw Object.assign(new Error("Invalid PEEK token budget"), { code: "INVALID_TOKEN_BUDGET" });
    }
    let record = this.contexts.get(contextId);
    if (!record) {
      if (this.contexts.size >= MAX_CONTEXTS) {
        throw Object.assign(new Error("PEEK context limit reached"), { code: "PEEK_CONTEXT_LIMIT" });
      }
      record = { contextId, tokenBudget, queryCount: 0, entries: [] };
      this.contexts.set(contextId, record);
    } else {
      record.tokenBudget = tokenBudget;
      evict(record);
    }
    return publicMap(record);
  }

  current(contextId) {
    validateContextId(contextId);
    const record = this.contexts.get(contextId);
    return record ? publicMap(record) : this.begin(contextId);
  }

  edit(contextId, edits) {
    const original = this.contexts.get(contextId) ?? (this.begin(contextId), this.contexts.get(contextId));
    const record = { ...original, entries: original.entries.map(entry => ({ ...entry })) };
    let sequence = this.sequence;
    if (!Array.isArray(edits) || edits.length > 64) {
      throw Object.assign(new Error("Invalid PEEK edits"), { code: "INVALID_PEEK_EDITS" });
    }
    for (const edit of edits) {
      const action = edit?.action;
      if (action === "ADD") {
        const entry = normalizeEntry(edit.entry, ++sequence);
        const index = record.entries.findIndex((item) => item.id === entry.id);
        if (index >= 0) record.entries.splice(index, 1);
        record.entries.push(entry);
      } else if (action === "DELETE") {
        if (typeof edit.id !== "string") throw Object.assign(new Error("Invalid PEEK edit"), { code: "INVALID_PEEK_EDIT" });
        record.entries = record.entries.filter((entry) => entry.id !== edit.id);
      } else if (action === "REPLACE") {
        if (typeof edit.id !== "string") throw Object.assign(new Error("Invalid PEEK edit"), { code: "INVALID_PEEK_EDIT" });
        const entry = normalizeEntry({ ...edit.entry, id: edit.entry?.id ?? edit.id }, ++sequence);
        const index = record.entries.findIndex((item) => item.id === edit.id);
        if (index < 0) throw Object.assign(new Error("PEEK entry not found"), { code: "PEEK_ENTRY_NOT_FOUND" });
        record.entries.splice(index, 1, entry);
      } else {
        throw Object.assign(new Error("Invalid PEEK edit"), { code: "INVALID_PEEK_EDIT" });
      }
    }
    evict(record);
    this.sequence = sequence;
    this.contexts.set(contextId, record);
    return publicMap(record);
  }

  async commit(contextId, observableTrajectory) {
    const record = this.contexts.get(contextId) ?? (this.begin(contextId), this.contexts.get(contextId));
    const encoded = JSON.stringify(observableTrajectory);
    if (Buffer.byteLength(encoded, "utf8") > 256 * 1024) {
      throw Object.assign(new Error("Observable trajectory is too large"), { code: "TRAJECTORY_LIMIT" });
    }
    record.queryCount += 1;
    if (!this.policy) {
      return { ...publicMap(record), policy: "unavailable", updated: false };
    }
    const edits = await this.policy({ map: publicMap(record), observableTrajectory });
    const updated = this.edit(contextId, edits);
    return { ...updated, policy: "configured", updated: true };
  }

  clear(contextId) {
    validateContextId(contextId);
    return { ok: true, removed: this.contexts.delete(contextId), contextId };
  }

  async checkpoint(contextId, path) {
    const map = this.current(contextId);
    if (typeof path !== "string" || !path.startsWith("/")) {
      throw Object.assign(new Error("Checkpoint path must be absolute"), { code: "INVALID_CHECKPOINT_PATH" });
    }
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.tmp-${process.pid}`;
    await writeFile(temporary, `${JSON.stringify(map, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, path);
    return { ok: true, contextId, path, estimatedTokens: map.estimatedTokens };
  }

  async restore(path) {
    const parsed = JSON.parse(await readFile(path, "utf8"));
    validateContextId(parsed.contextId);
    this.begin(parsed.contextId, { tokenBudget: parsed.tokenBudget });
    const record = this.contexts.get(parsed.contextId);
    record.queryCount = Number.isInteger(parsed.queryCount) ? parsed.queryCount : 0;
    record.entries = [];
    this.edit(parsed.contextId, parsed.entries.map((entry) => ({ action: "ADD", entry })));
    return this.current(parsed.contextId);
  }
}
