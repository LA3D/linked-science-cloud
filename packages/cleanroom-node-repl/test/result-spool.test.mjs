import assert from "node:assert/strict";
import test from "node:test";

import { ResultSpoolRegistry } from "../src/result-spool.mjs";

const owner = Object.freeze({ token: "owner-a", epoch: 1 });
const quad = subject => ({
  subject: { termType: "NamedNode", value: subject },
  predicate: { termType: "NamedNode", value: "https://example.test/p" },
  object: { termType: "Literal", value: "x", language: "", datatype: "http://www.w3.org/2001/XMLSchema#string" },
  graph: { termType: "DefaultGraph", value: "" },
});

test("broker result spool commits complete quad results and pages them without exposing a path", () => {
  const spool = new ResultSpoolRegistry({ maxResultBytes: 64_000, maxTotalBytes: 128_000 });
  try {
    const begun = spool.begin({ kind: "quads" }, owner);
    spool.append({ storageId: begun.storageId, items: [ quad("https://example.test/a"), quad("https://example.test/a") ] }, owner);
    spool.append({ storageId: begun.storageId, items: [ quad("https://example.test/b") ] }, owner);
    const committed = spool.commit({ storageId: begun.storageId }, owner);
    assert.equal(committed.complete, true);
    assert.equal(committed.count, 2);
    assert.equal(committed.backend, "broker-sqlite");
    assert.equal("path" in committed, false);
    assert.deepEqual(spool.page({ storageId: begun.storageId, offset: 1, limit: 1 }, owner).items, [ quad("https://example.test/b") ]);
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
      () => spool.append({ storageId: begun.storageId, items: [ quad(`https://example.test/${"x".repeat(300)}`) ] }, owner),
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

test("stored quad results answer patterns through indexes with complete keyset pagination", () => {
  const spool = new ResultSpoolRegistry({ maxResultBytes: 8_000_000, maxTotalBytes: 16_000_000 });
  const node = value => ({ termType: "NamedNode", value });
  const literal = (value, language) => ({ termType: "Literal", value, language, datatype: "http://www.w3.org/2001/XMLSchema#string" });
  const defaultGraph = { termType: "DefaultGraph", value: "" };
  const named = node("https://example.test/graph");
  try {
    const begun = spool.begin({ kind: "quads" }, owner);
    const items = [];
    for (let index = 0; index < 1_500; index += 1) {
      items.push({ subject: node(`https://example.test/s/${index}`), predicate: node(index % 3 === 0 ? "https://example.test/p0" : "https://example.test/p1"), object: node(`https://example.test/o/${index % 11}`), graph: index % 5 === 0 ? named : defaultGraph });
    }
    items.push({ subject: node("https://example.test/s/1"), predicate: node("https://example.test/label"), object: literal("one", "en"), graph: defaultGraph });
    items.push({ subject: node("https://example.test/s/1"), predicate: node("https://example.test/p1"), object: node("https://example.test/o/1"), graph: defaultGraph }); // duplicate of s/1
    for (let offset = 0; offset < items.length; offset += 500) spool.append({ storageId: begun.storageId, items: items.slice(offset, offset + 500) }, owner);
    const committed = spool.commit({ storageId: begun.storageId }, owner);
    assert.equal(committed.count, 1_501);
    assert.equal(committed.indexed, true);
    assert.equal(committed.version, "1.1.0");

    const collect = (pattern, limit) => {
      const collected = [];
      let after;
      let pages = 0;
      for (;;) {
        const page = spool.match({ storageId: begun.storageId, pattern, after, limit }, owner);
        pages += 1;
        collected.push(...page.items);
        if (page.done) break;
        assert.ok(Array.isArray(page.cursor), "an incomplete page carries a cursor");
        after = page.cursor;
      }
      return { collected, pages };
    };
    const everything = collect({}, 400);
    assert.equal(everything.collected.length, 1_501);
    assert.equal(everything.pages, 4);
    const bySubject = collect({ subject: node("https://example.test/s/1") }, 1);
    assert.deepEqual(bySubject.collected.map(quad => quad.predicate.value).sort(), [ "https://example.test/label", "https://example.test/p1" ]);
    const byPredicate = collect({ predicate: node("https://example.test/p0") }, 128);
    assert.equal(byPredicate.collected.length, 500);
    assert.equal(new Set(byPredicate.collected.map(quad => quad.subject.value)).size, 500);
    const byObject = collect({ object: node("https://example.test/o/3") }, 7);
    assert.equal(byObject.collected.length, items.filter(quad => quad.object.value === "https://example.test/o/3").length);
    const byPredicateObject = collect({ predicate: node("https://example.test/p1"), object: node("https://example.test/o/1") }, 3);
    assert.equal(byPredicateObject.collected.length, items.filter(quad => quad.predicate.value === "https://example.test/p1" && quad.object.value === "https://example.test/o/1").length - 1);
    const fullyBound = collect({ subject: node("https://example.test/s/0"), predicate: node("https://example.test/p0"), object: node("https://example.test/o/0") }, 5);
    assert.equal(fullyBound.collected.length, 1, "the default-graph row is found when only the graph column remains");
    assert.equal(collect({ graph: named }, 1_000).collected.length, 300);
    assert.equal(collect({ subject: node("https://example.test/s/1"), object: literal("one", "en") }, 5).collected.length, 1);
    assert.equal(spool.count({ storageId: begun.storageId, pattern: {} }, owner).count, 1_501);
    assert.equal(spool.count({ storageId: begun.storageId, pattern: { predicate: node("https://example.test/p0") } }, owner).count, 500);
    assert.equal(spool.count({ storageId: begun.storageId, pattern: { subject: node("https://example.test/missing") } }, owner).count, 0);
    assert.throws(() => spool.match({ storageId: begun.storageId, pattern: { predicate: node("https://example.test/p0") }, after: [ 1 ] }, owner), error => error.code === "RESULT_SPOOL_CURSOR");
    assert.throws(() => spool.match({ storageId: begun.storageId, pattern: { verb: node("x") } }, owner), error => error.code === "RESULT_SPOOL_PATTERN");
    assert.throws(() => spool.match({ storageId: begun.storageId, pattern: {} }, { token: "other", epoch: 1 }), error => error.code === "RESULT_SPOOL_HANDLE_DENIED");
  } finally {
    spool.close();
  }
});

test("stored bindings keep bag semantics and declared columns", () => {
  const spool = new ResultSpoolRegistry({ maxResultBytes: 64_000, maxTotalBytes: 128_000 });
  const node = value => ({ termType: "NamedNode", value });
  try {
    const begun = spool.begin({ kind: "bindings" }, owner);
    spool.append({ storageId: begun.storageId, items: [
      [ [ "s", node("https://example.test/a") ] ],
      [ [ "s", node("https://example.test/a") ] ],
      [ [ "s", node("https://example.test/b") ], [ "label", { termType: "Literal", value: "b", language: "", datatype: "http://www.w3.org/2001/XMLSchema#string" } ] ],
    ] }, owner);
    const committed = spool.commit({ storageId: begun.storageId, columns: [ "s", "label" ] }, owner);
    assert.equal(committed.resultType, "bindings");
    assert.equal(committed.count, 3, "duplicate solutions are retained");
    assert.deepEqual(committed.columns, [ "s", "label" ]);
    assert.equal("indexed" in committed, false);
    assert.equal(spool.page({ storageId: begun.storageId, offset: 0, limit: 2 }, owner).items.length, 2);
    assert.throws(() => spool.match({ storageId: begun.storageId, pattern: {} }, owner), error => error.code === "RESULT_SPOOL_KIND");
    assert.throws(() => spool.append({ storageId: spool.begin({ kind: "bindings" }, owner).storageId, items: [ { not: "a row" } ] }, owner), error => error.code === "RESULT_SPOOL_ITEM_INVALID");
    assert.throws(() => spool.begin({ kind: "rows" }, owner), error => error.code === "RESULT_SPOOL_KIND");
  } finally {
    spool.close();
  }
});
