import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createRequestHandler, KernelBroker } from "../src/cleanroom-mcp.mjs";

const contracts = JSON.parse(await readFile(new URL("./fixtures/prime-core/contracts.json", import.meta.url), "utf8"));

function request(id, name, args = {}) {
  return { jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } };
}

function text(response) {
  return response.result.content.find((item) => item.type === "text")?.text;
}

function compareCodePoints(left, right) {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0));
  const rightPoints = Array.from(right, (character) => character.codePointAt(0));
  for (let index = 0; index < Math.min(leftPoints.length, rightPoints.length); index += 1) {
    if (leftPoints[index] !== rightPoints[index]) return leftPoints[index] - rightPoints[index];
  }
  return leftPoints.length - rightPoints.length;
}

function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Non-finite numbers are not canonical JSON");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) throw new TypeError("Sparse or extended arrays are not canonical JSON");
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort(compareCodePoints).map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  throw new TypeError("Unsupported canonical JSON value");
}

test("Phase 0 freezes the current broker behavior needed by the durable core", async (t) => {
  const expected = contracts.baseline;
  const broker = new KernelBroker();
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });

  const listed = await handle({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
  assert.deepEqual(listed.result.tools.map(({ name }) => name), expected.mcpTools);

  await handle(request(2, "js", { code: "var phase0Binding = 41; nodeRepl.rlm.registerContext('phase0-context', 'abcdef'); await nodeRepl.peek.begin('phase0-peek'); await nodeRepl.peek.edit('phase0-peek', [{action:'ADD', entry:{id:'phase0-entry', section:'domain-constants', text:'retained orientation', score:1}}])" }));
  const persisted = await handle(request(3, "js", { code: "nodeRepl.write(phase0Binding + 1)" }));
  assert.equal(text(persisted), "42");
  assert.equal(expected.bindingsPersistAcrossCalls, true);

  const beforeResetEpoch = broker.epoch;
  await handle(request(4, "js_reset"));
  const afterReset = await handle(request(5, "js", { code: "nodeRepl.write(typeof phase0Binding)" }));
  const missingContext = await handle(request(6, "js", { code: "nodeRepl.rlm.inspect('phase0-context', {start:0,end:1})" }));
  const retainedPeek = await handle(request(7, "js", { code: "nodeRepl.write(await nodeRepl.peek.current('phase0-peek'))" }));
  assert.equal(text(afterReset), "undefined");
  assert.equal(missingContext.result.isError, true);
  assert.match(text(missingContext), /CONTEXT_NOT_FOUND/u);
  assert.match(text(retainedPeek), /retained orientation/u);
  assert.equal(broker.epoch, beforeResetEpoch + 1);
  assert.equal(expected.resetClearsBindings, true);
  assert.equal(expected.resetClearsRlmContexts, true);
  assert.equal(expected.resetPreservesPeek, true);
  assert.equal(expected.resetAdvancesEpoch, true);

  const unavailable = await handle(request(8, "js", { code: "nodeRepl.write(await nodeRepl.rlm.query('phase0'))" }));
  assert.equal(unavailable.result.isError, undefined);
  assert.match(text(unavailable), /RLM_PROVIDER_UNAVAILABLE/u);
  assert.equal(expected.defaultRecursiveProvider, "unavailable");

  const traversalOwner = { token: broker.hostCapabilityToken, epoch: broker.epoch };
  const traversal = broker.traversal.beginTraversal({ maxDurationMs: 1_000 }, traversalOwner);
  await handle(request(9, "js_reset"));
  assert.equal(broker.traversal.sessions.size, 0);
  assert.throws(
    () => broker.traversal.finishTraversal({ traversalId: traversal.traversalId }, traversalOwner),
    (error) => error.code === "MEDIATOR_TRAVERSAL_INVALID",
  );
  assert.equal(expected.resetInvalidatesTraversalOwner, true);

  const beforeTimeoutEpoch = broker.epoch;
  const timedOut = await handle(request(10, "js", { code: "while (true) {}", timeout_ms: 50 }));
  const recovered = await handle(request(11, "js", { code: "nodeRepl.write(1 + 1)" }));
  assert.equal(timedOut.result.isError, true);
  assert.match(text(timedOut), /KERNEL_TIMEOUT/u);
  assert.equal(text(recovered), "2");
  assert.ok(broker.epoch > beforeTimeoutEpoch);
  assert.equal(expected.timeoutReplacesKernel, true);
});

test("Phase 0 freezes configured recursive calls at depth one with selected context", async (t) => {
  const seen = [];
  const broker = new KernelBroker({
    provider: async (call) => {
      seen.push(call);
      return `observed:${call.context}`;
    },
  });
  t.after(() => broker.close());
  const handle = createRequestHandler({ broker });
  const response = await handle(request(1, "js", {
    code: "nodeRepl.rlm.registerContext('phase0-slice','0123456789'); nodeRepl.write(await nodeRepl.rlm.query('inspect', {contextId:'phase0-slice', slice:{start:2,end:6}}))",
  }));

  assert.equal(text(response), "observed:2345");
  assert.equal(seen.length, 1);
  assert.equal(seen[0].budget.depth, contracts.baseline.configuredRecursiveDepth);
  assert.equal(contracts.quotas.maxChildDepth, 1);
  assert.equal(contracts.quotas.maxActiveChildren, 1);
  assert.equal(contracts.quotas.maxTotalChildren, 1);
});

test("Phase 0 schema fixtures name exactly seven minimal contracts and one invalid omission each", () => {
  const expected = [
    "artifact-manifest@1",
    "context-object@1",
    "context-projection@1",
    "harness-entry@1",
    "refinement-receipt@1",
    "session-event@1",
    "session-manifest@1",
  ];
  assert.deepEqual(contracts.schemas.map(({ id }) => id).sort(), expected);

  for (const fixture of contracts.schemas) {
    assert.equal(fixture.valid.schema, fixture.id);
    assert.equal(new Set(fixture.required).size, fixture.required.length);
    for (const field of fixture.required) assert.ok(Object.hasOwn(fixture.valid, field), `${fixture.id} lacks ${field}`);
    assert.equal(fixture.invalid.case, "missing-required");
    assert.ok(fixture.required.includes(fixture.invalid.omitted));
    const invalid = structuredClone(fixture.valid);
    delete invalid[fixture.invalid.omitted];
    assert.ok(fixture.required.some((field) => !Object.hasOwn(invalid, field)));
    const evidencedFields = fixture.fieldEvidence.flatMap(({ fields, observation }) => {
      assert.match(observation, /^stage[12]-/u);
      return fields;
    });
    assert.deepEqual([...new Set(evidencedFields)].sort(), [...fixture.required].sort());
  }
});

test("Phase 0 canonical JSON and digest vectors are deterministic", () => {
  for (const vector of contracts.canonicalDigestVectors) {
    const canonical = canonicalJson(vector.value);
    assert.equal(canonical, vector.canonical);
    assert.equal(createHash("sha256").update(canonical).digest("hex"), vector.sha256);
  }
  assert.throws(() => canonicalJson(Number.NaN), /Non-finite/u);
  assert.throws(() => canonicalJson(undefined), /Unsupported/u);
  assert.throws(() => canonicalJson([, 1]), /Sparse/u);
  assert.equal(canonicalJson({ "\u{10000}": 1, "\uE000": 2 }), "{\"\":2,\"𐀀\":1}");
});

test("Phase 0 transition model covers only the authorized Stage 1 and 2 event vocabulary", () => {
  const expectedEvents = [
    "artifact.created", "artifact.verified",
    "child.cancelled", "child.completed", "child.failed", "child.spawned",
    "context.compacted", "context.materialized", "context.projected", "context.registered", "context.released", "context.serialized",
    "harness.applied", "harness.proposed", "harness.rejected", "harness.rolled-back",
    "invocation.completed", "invocation.failed", "invocation.started", "invocation.uncertain",
    "kernel.exited", "kernel.replaced", "kernel.started",
    "policy.denied", "resource.recorded",
    "session.closed", "session.created", "session.reopened",
    "stop.recorded",
  ];
  const transitions = Object.values(contracts.transitionModel).flat();
  const modeledEvents = [...new Set([...transitions.map(({ event }) => event), ...contracts.nonStateEvents])].sort();
  assert.deepEqual(modeledEvents, expectedEvents.sort());

  function transition(machine, from, event) {
    return contracts.transitionModel[machine]?.find((item) => item.from === from && item.event === event)?.to;
  }

  assert.equal(transition("session", "absent", "session.created"), "created");
  assert.equal(transition("child", "running", "child.completed"), "completed");
  assert.equal(transition("harness", "proposed", "harness.applied"), "applied");
  assert.equal(transition("child", "completed", "child.spawned"), undefined);
  assert.equal(transition("session", "created", "schedule.created"), undefined);
});
