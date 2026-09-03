import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { MediatedTraversalBroker } from "../src/mediated-traversal.mjs";

const owner = { token: "a".repeat(64), epoch: 1 };
const ttl = Buffer.from("@prefix ex: <https://example.test/> . ex:s ex:p ex:o .");

function begin(broker, budgets = {}) {
  return broker.beginTraversal({ maxDurationMs: 2_000, maxRequestMs: 1_000, ...budgets }, owner);
}

async function localServer(handler) {
  const server = createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return { url: `http://127.0.0.1:${address.port}`, close: () => new Promise(resolve => server.close(resolve)) };
}

test("attests one immutable anonymous-read authority over standard Fetch", () => {
  const capability = new MediatedTraversalBroker().capabilities();
  assert.equal(capability.kind, "linked-science-anonymous-read-mediator");
  assert.equal(capability.version, "3.2.0");
  assert.equal(capability.authority.class, "anonymous-linked-data-read");
  assert.equal(capability.authority.destinationPolicy, "dynamic-anonymous-http-https");
  assert.equal(capability.authority.endpointAllowlist, false);
  assert.deepEqual(capability.authority.schemes, [ "http", "https" ]);
  assert.deepEqual(capability.authority.methods, [ "GET", "HEAD", "SPARQL_POST" ]);
  assert.equal(capability.transport.implementation, "standard-fetch");
  assert.equal(capability.authority.effects.includes("public-resource-read"), true);
  assert.equal(capability.transport.dnsTls, "platform");
  assert.equal(capability.retries, 0);
  assert.equal(capability.defaultBudgets.maxDurationMs, 300_000);
  assert.equal(capability.hardBudgets.maxDurationMs, 900_000);
  assert.equal(capability.defaultBudgets.maxRequestMs, 20_000);
  assert.equal(capability.hardBudgets.maxRequestMs, 30_000);
  assert.equal(Object.isFrozen(capability.authority), true);
});

test("uses real standard Fetch for HTTP, strips identity, follows redirects, and records bounded exchange evidence", async t => {
  const seen = [];
  let fixture;
  try {
    fixture = await localServer((request, response) => {
    seen.push({ url: request.url, method: request.method, headers: request.headers });
    if (request.url === "/start") {
      response.writeHead(302, { location: "/ontology.ttl" });
      response.end();
      return;
    }
    response.writeHead(200, {
      "content-type": 'text/turtle; profile="https://example.test/profiles/core"', etag: '"fixture-v1"',
      "content-profile": "https://example.test/profiles/response",
      "preference-applied": "return=representation",
      link: '<schema>; rel="describedby alternate"; type="text/turtle", <https://example.test/profiles/link>; rel="profile"', "set-cookie": "secret=1",
    });
    response.end(ttl);
    });
  } catch (error) {
    if (error.code === "EPERM") {
      t.skip("The current sandbox forbids binding a loopback fixture; the unsandboxed offline suite exercises this path");
      return;
    }
    throw error;
  }
  t.after(fixture.close);
  const broker = new MediatedTraversalBroker();
  const traversal = begin(broker);
  const result = await broker.request({ traversalId: traversal.traversalId, request: {
    url: `${fixture.url}/start`, headers: {
      Authorization: "secret", Cookie: "a=b", Origin: "https://private.example",
      Accept: 'text/turtle; profile="https://example.test/profiles/request"',
      "Accept-Profile": "https://example.test/profiles/request", Prefer: "return=representation",
    },
  } }, owner);
  assert.equal(result.status, 200);
  assert.equal(result.redirected, true);
  assert.equal(result.url, `${fixture.url}/ontology.ttl`);
  assert.equal(result.headers.etag, '"fixture-v1"');
  assert.match(result.headers.link, /describedby/u);
  assert.equal(seen[0].headers["accept-profile"], "https://example.test/profiles/request");
  assert.equal(seen[0].headers.prefer, "return=representation");
  assert.equal(result.headers["set-cookie"], undefined);
  assert.equal(seen.every(call => call.headers.authorization === undefined && call.headers.cookie === undefined && call.headers.origin === undefined), true);
  assert.equal(seen[0].headers["accept-encoding"], "identity");
  const receipt = broker.finishTraversal({ traversalId: traversal.traversalId }, owner);
  assert.equal(receipt.exchanges.length, 1);
  assert.equal(receipt.exchanges[0].requestedUrl, `${fixture.url}/start`);
  assert.equal(receipt.exchanges[0].finalUrl, `${fixture.url}/ontology.ttl`);
  assert.equal(receipt.exchanges[0].redirected, true);
  assert.equal(receipt.exchanges[0].responseHeadersTruncated, false);
  assert.equal(receipt.exchanges[0].navigation.links[0].target, `${fixture.url}/schema`);
  assert.deepEqual(receipt.exchanges[0].navigation.links[0].relations, [ "describedby", "alternate" ]);
  assert.deepEqual(receipt.exchanges[0].navigation.profiles, [
    "https://example.test/profiles/core",
    "https://example.test/profiles/response",
    "https://example.test/profiles/link",
  ]);
  assert.deepEqual(receipt.exchanges[0].navigation.profileDeclarations.map(item => item.mechanism), [ "content-type", "content-profile", "link" ]);
  assert.equal(receipt.exchanges[0].navigation.preferenceApplied, "return=representation");
  assert.equal(receipt.exchanges[0].navigation.trust, "untrusted-candidate-evidence");
  assert.equal(receipt.usage.bytes, ttl.length);
  assert.equal(receipt.usage.retries, 0);
});

test("permits only parsed read-only SPARQL POST and accepts opaque non-RDF outcomes", async () => {
  const calls = [];
  const broker = new MediatedTraversalBroker({ fetchImpl: async (url, init) => {
    calls.push({ url: String(url), method: init.method, headers: Object.fromEntries(init.headers), body: init.body });
    return new Response(init.method === "POST" ? '{"head":{},"boolean":true}' : "<html>opaque</html>", {
      status: 200,
      headers: { "content-type": init.method === "POST" ? "application/sparql-results+json" : "text/html", "set-cookie": "hidden=1" },
    });
  } });
  const traversal = begin(broker);
  const response = await broker.request({ traversalId: traversal.traversalId, request: {
    url: "https://query.example/sparql", method: "POST", headers: { "content-type": "application/sparql-query", Authorization: "secret" },
    body: "ASK { ?s ?p ?o }",
  } }, owner);
  assert.equal(response.exchange.queryType, "ASK");
  assert.equal(calls[0].headers.authorization, undefined);
  broker.finishTraversal({ traversalId: traversal.traversalId }, owner);

  const opaque = begin(broker);
  const document = await broker.request({ traversalId: opaque.traversalId, request: { url: "https://data.example/page" } }, owner);
  assert.equal(document.headers["content-type"], "text/html");
  assert.equal(document.headers["set-cookie"], undefined);
  broker.finishTraversal({ traversalId: opaque.traversalId }, owner);

  for (const [ body, code ] of [
    [ "INSERT DATA { <x:a> <x:b> <x:c> }", "MEDIATOR_MUTATION_DENIED" ],
    [ "MALFORMED {{{", "MEDIATOR_QUERY_INVALID" ],
  ]) {
    const current = begin(broker);
    await assert.rejects(broker.request({ traversalId: current.traversalId, request: {
      url: "https://query.example/sparql", method: "POST", headers: { "content-type": "application/sparql-query" }, body,
    } }, owner), error => error.code === code);
    broker.abortTraversal({ traversalId: current.traversalId }, owner);
  }
  const form = begin(broker);
  const formResult = await broker.request({ traversalId: form.traversalId, request: {
    url: "https://query.example/form", method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "query=ASK%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D",
  } }, owner);
  assert.equal(formResult.exchange.queryType, "ASK");
  broker.finishTraversal({ traversalId: form.traversalId }, owner);
  const arbitrary = begin(broker);
  await assert.rejects(broker.request({ traversalId: arbitrary.traversalId, request: {
    url: "https://query.example/form", method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "query=ASK%20%7B%7D&update=DROP%20ALL",
  } }, owner), error => error.code === "MEDIATOR_POST_DENIED");
  broker.abortTraversal({ traversalId: arbitrary.traversalId }, owner);
});

test("rejects invalid schemes, URL credentials, methods, bodies, and oversized query bodies before Fetch", async () => {
  let calls = 0;
  const broker = new MediatedTraversalBroker({ fetchImpl: async () => { calls += 1; return new Response(ttl); } });
  for (const request of [
    { url: "file:///tmp/data.ttl" }, { url: "https://user:pass@data.example/rdf" },
    { url: "https://data.example/rdf", method: "PUT" }, { url: "https://data.example/rdf", method: "GET", body: "hidden" },
  ]) {
    const traversal = begin(broker);
    await assert.rejects(broker.request({ traversalId: traversal.traversalId, request }, owner));
    broker.abortTraversal({ traversalId: traversal.traversalId }, owner);
  }
  const large = begin(broker, { maxRequestBodyBytes: 8 });
  await assert.rejects(broker.request({ traversalId: large.traversalId, request: {
    url: "https://query.example/", method: "POST", headers: { "content-type": "application/sparql-query" }, body: "ASK { ?s ?p ?o }",
  } }, owner), error => error.code === "MEDIATOR_REQUEST_BODY_LIMIT");
  broker.abortTraversal({ traversalId: large.traversalId }, owner);
  assert.equal(calls, 0);
});

test("enforces response, cumulative-byte, request, fan-out, concurrency, and timeout bounds", async () => {
  const fixed = new MediatedTraversalBroker({ fetchImpl: async () => new Response(Buffer.alloc(12), { status: 200, headers: { "content-type": "text/turtle" } }) });
  const responseBound = begin(fixed, { maxResponseBytes: 8 });
  await assert.rejects(fixed.request({ traversalId: responseBound.traversalId, request: { url: "https://a.example/" } }, owner), error =>
    error.code === "MEDIATOR_RESPONSE_LIMIT" && error.receipt.status === "failed" && error.receipt.exchanges[0].bytes === 12);
  fixed.abortTraversal({ traversalId: responseBound.traversalId }, owner);
  const totalBound = begin(fixed, { maxResponseBytes: 16, maxTotalBytes: 16 });
  await fixed.request({ traversalId: totalBound.traversalId, request: { url: "https://a.example/1" } }, owner);
  await assert.rejects(fixed.request({ traversalId: totalBound.traversalId, request: { url: "https://a.example/2" } }, owner), error => error.code === "MEDIATOR_TOTAL_BYTES_LIMIT");
  fixed.abortTraversal({ traversalId: totalBound.traversalId }, owner);
  const fanout = begin(fixed, { maxFanOut: 1 });
  await fixed.request({ traversalId: fanout.traversalId, request: { url: "https://a.example/" } }, owner);
  await assert.rejects(fixed.request({ traversalId: fanout.traversalId, request: { url: "https://b.example/" } }, owner), error => error.code === "MEDIATOR_FANOUT_LIMIT");
  fixed.abortTraversal({ traversalId: fanout.traversalId }, owner);
  const requests = begin(fixed, { maxRequests: 1 });
  await fixed.request({ traversalId: requests.traversalId, request: { url: "https://a.example/1" } }, owner);
  await assert.rejects(fixed.request({ traversalId: requests.traversalId, request: { url: "https://a.example/2" } }, owner), error => error.code === "MEDIATOR_REQUEST_LIMIT");
  fixed.abortTraversal({ traversalId: requests.traversalId }, owner);

  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const blocked = new MediatedTraversalBroker({ fetchImpl: async (_url, { signal }) => Promise.race([
    gate.then(() => new Response(ttl, { headers: { "content-type": "text/turtle" } })),
    new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })),
  ]) });
  const concurrent = begin(blocked, { maxConcurrency: 1 });
  const first = blocked.request({ traversalId: concurrent.traversalId, request: { url: "https://a.example/one" } }, owner);
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(blocked.request({ traversalId: concurrent.traversalId, request: { url: "https://a.example/two" } }, owner), error => error.code === "MEDIATOR_CONCURRENCY_LIMIT");
  release();
  await first;
  blocked.finishTraversal({ traversalId: concurrent.traversalId }, owner);

  const timeoutBroker = new MediatedTraversalBroker({ fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })) });
  const timed = begin(timeoutBroker, { maxRequestMs: 10, maxDurationMs: 100 });
  await assert.rejects(timeoutBroker.request({ traversalId: timed.traversalId, request: { url: "https://a.example/slow" } }, owner), error => error.code === "MEDIATOR_REQUEST_TIMEOUT" && error.receipt.status === "failed");
  const receipt = timeoutBroker.abortTraversal({ traversalId: timed.traversalId }, owner);
  assert.equal(receipt.exchanges[0].status, "failure");
});

test("binds sessions to token and epoch and aborts them on owner replacement", async () => {
  const broker = new MediatedTraversalBroker({ fetchImpl: async () => new Response(ttl) });
  const first = begin(broker);
  await assert.rejects(broker.request({ traversalId: first.traversalId, request: { url: "https://a.example/" } }, { token: "forged", epoch: 1 }), error => error.code === "MEDIATOR_OWNER_DENIED");
  await assert.rejects(broker.request({ traversalId: first.traversalId, request: { url: "https://a.example/" } }, { token: owner.token, epoch: 2 }), error => error.code === "MEDIATOR_OWNER_DENIED");
  const second = begin(broker);
  const receipts = broker.abortOwner(owner, "kernel-replaced");
  assert.equal(receipts.length, 2);
  assert.equal(receipts.every(receipt => receipt.status === "aborted" && receipt.failure.code === "kernel-replaced"), true);
  assert.throws(() => broker.finishTraversal({ traversalId: second.traversalId }, owner), error => error.code === "MEDIATOR_TRAVERSAL_INVALID");
});

test("snapshots one active traversal without resetting cumulative budgets", async () => {
  const broker = new MediatedTraversalBroker({ fetchImpl: async () => new Response(ttl, { headers: { "content-type": "text/turtle" } }) });
  const traversal = begin(broker, { maxRequests: 2 });
  await broker.request({ traversalId: traversal.traversalId, request: { url: "https://a.example/one" } }, owner);
  const first = broker.snapshotTraversal({ traversalId: traversal.traversalId }, owner);
  assert.equal(first.status, "active");
  assert.equal(typeof first.observedAt, "string");
  assert.equal(first.finishedAt, undefined);
  assert.equal(first.usage.requests, 1);
  await broker.request({ traversalId: traversal.traversalId, request: { url: "https://a.example/two" } }, owner);
  const finished = broker.finishTraversal({ traversalId: traversal.traversalId }, owner);
  assert.equal(finished.usage.requests, 2);
  assert.equal(typeof finished.finishedAt, "string");
  assert.equal(finished.observedAt, undefined);
});

test("retains semantic navigation relations when the bounded Link projection is saturated", async () => {
  const generic = Array.from({ length: 24 }, (_, index) => `<https://data.example/item-${index}>; rel="item"`);
  const link = [ ...generic, '<https://data.example/schema>; rel="describedby"' ].join(', ');
  const broker = new MediatedTraversalBroker({ fetchImpl: async () => new Response(ttl, { headers: { "content-type": "text/turtle", link } }) });
  const traversal = begin(broker);
  await broker.request({ traversalId: traversal.traversalId, request: { url: "https://data.example/root" } }, owner);
  const receipt = broker.finishTraversal({ traversalId: traversal.traversalId }, owner);
  assert.equal(receipt.exchanges[0].navigation.links.length, 24);
  assert.equal(receipt.exchanges[0].navigation.links[0].target, "https://data.example/schema");
  assert.equal(receipt.exchanges[0].navigation.truncated, true);
});
