import assert from "node:assert/strict";
import test from "node:test";

import { ResultSpoolRegistry } from "../src/result-spool.mjs";

const owner = Object.freeze({ token: "owner-a", epoch: 1 });

test("broker result spool commits complete quad results and pages them without exposing a path", () => {
  const spool = new ResultSpoolRegistry({ maxResultBytes: 64_000, maxTotalBytes: 128_000 });
  try {
    const begun = spool.begin({ kind: "quads" }, owner);
    spool.append({ storageId: begun.storageId, items: [
      { subject: { termType: "NamedNode", value: "https://example.test/a" } },
      { subject: { termType: "NamedNode", value: "https://example.test/a" } },
    ] }, owner);
    spool.append({ storageId: begun.storageId, items: [ { subject: { termType: "NamedNode", value: "https://example.test/b" } } ] }, owner);
    const committed = spool.commit({ storageId: begun.storageId }, owner);
    assert.equal(committed.complete, true);
    assert.equal(committed.count, 2);
    assert.equal(committed.backend, "broker-sqlite");
    assert.equal("path" in committed, false);
    assert.deepEqual(spool.page({ storageId: begun.storageId, offset: 1, limit: 1 }, owner).items, [
      { subject: { termType: "NamedNode", value: "https://example.test/b" } },
    ]);
    assert.deepEqual(spool.page({ storageId: begun.storageId, offset: 2, limit: 1 }, owner).items, []);
    assert.throws(
      () => spool.page({ storageId: begun.storageId, offset: 0, limit: 1 }, { token: "owner-b", epoch: 1 }),
      error => error.code === "RESULT_SPOOL_HANDLE_DENIED",
    );
  } finally {
    spool.close();
  }
});

test("broker result spool enforces storage bytes and removes epoch-owned state", () => {
  const spool = new ResultSpoolRegistry({ maxResultBytes: 256, maxTotalBytes: 512 });
  try {
    const begun = spool.begin({ kind: "quads" }, owner);
    assert.throws(
      () => spool.append({ storageId: begun.storageId, items: [ { value: "x".repeat(300) } ] }, owner),
      error => error.code === "RESULT_SPOOL_RESULT_LIMIT",
    );
    assert.equal(spool.releaseOwner(owner).removed, 1);
    assert.throws(
      () => spool.page({ storageId: begun.storageId, offset: 0, limit: 1 }, owner),
      error => error.code === "RESULT_SPOOL_HANDLE_DENIED",
    );
  } finally {
    spool.close();
  }
});
