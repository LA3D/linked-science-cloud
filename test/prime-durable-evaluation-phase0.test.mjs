import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { Parser } from "n3";

const publicRoot = new URL("./fixtures/prime-durable-core/public/", import.meta.url);
const privateRoot = new URL("./fixtures/prime-durable-core/private/", import.meta.url);
const rubric = JSON.parse(await readFile(new URL("rubric.json", publicRoot), "utf8"));
const evaluator = JSON.parse(await readFile(new URL("evaluator.json", privateRoot), "utf8"));

test("Phase 0 freezes three parseable, blank-node-free, vocabulary-distinct TriG fixtures", async () => {
  assert.deepEqual(rubric.fixtures.map(({ id }) => id), ["A", "B", "C"]);
  const localVocabularies = [];

  for (const fixture of rubric.fixtures) {
    const source = await readFile(new URL(fixture.path, publicRoot), "utf8");
    const quads = new Parser({ format: "application/trig" }).parse(source);
    assert.equal(quads.length, 4, `${fixture.id} must stay minimal`);
    assert.equal(quads.filter(({ predicate }) => predicate.value === "http://www.w3.org/2000/01/rdf-schema#subPropertyOf").length, 1);
    assert.equal(quads.filter(({ predicate }) => predicate.value === "http://www.w3.org/2000/01/rdf-schema#label").length, 1);
    assert.ok(quads.every(({ subject, predicate, object, graph }) =>
      [subject, predicate, object, graph].every((term) => term.termType !== "BlankNode")), `${fixture.id} contains a blank node`);

    const local = new Set();
    for (const quad of quads) {
      for (const term of [quad.subject, quad.predicate, quad.object, quad.graph]) {
        if (term.termType === "NamedNode" && term.value.startsWith("https://example.test/prime/")) local.add(term.value);
      }
    }
    localVocabularies.push(local);
  }

  for (let left = 0; left < localVocabularies.length; left += 1) {
    for (let right = left + 1; right < localVocabularies.length; right += 1) {
      assert.deepEqual([...localVocabularies[left]].filter((iri) => localVocabularies[right].has(iri)), []);
    }
  }
});

test("Phase 0 keeps evaluator answers and honeytokens outside public fixtures and worker exports", async () => {
  assert.equal(evaluator.workerReadable, false);
  assert.deepEqual(Object.keys(evaluator.expectedPairs).sort(), ["A", "B", "C"]);
  assert.equal(new Set(evaluator.honeytokens).size, evaluator.honeytokens.length);

  const publicFiles = await readdir(publicRoot);
  const publicText = (await Promise.all(publicFiles.map((name) => readFile(new URL(name, publicRoot), "utf8")))).join("\n");
  for (const honeytoken of evaluator.honeytokens) assert.equal(publicText.includes(honeytoken), false);

  const workerPolicy = JSON.parse(await readFile(new URL("../evaluation/uniprot/worker-export-policy.json", import.meta.url), "utf8"));
  assert.ok(workerPolicy.deny.includes("test"));
  assert.equal(workerPolicy.include.some((path) => path.startsWith("test/")), false);
});

test("Phase 0 public rubric fixes controls, diagnostics, and hard failures without expected answers", () => {
  assert.deepEqual(rubric.allowedDiagnostics, [
    "empty-result-scope-overclaim",
    "evidence-role-confusion",
    "stale-handle-claim",
  ]);
  assert.ok(rubric.compactionTrigger.afterPublicEvents > 0);
  assert.ok(rubric.compactionTrigger.orEstimatedProjectionTokens > 0);
  assert.ok(rubric.h1Criteria.includes("no-source-reacquisition"));
  assert.ok(rubric.h2Criteria.includes("rollback-restores-prior-manifest"));
  assert.ok(rubric.hardFailures.includes("evaluator-private-leak"));
  assert.equal(JSON.stringify(rubric).includes("expectedPairs"), false);
});
