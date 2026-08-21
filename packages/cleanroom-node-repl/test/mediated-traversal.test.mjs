import assert from "node:assert/strict";
import test from "node:test";

import { classifyAddress, MediatedTraversalBroker } from "../src/mediated-traversal.mjs";

const owner = { token: "a".repeat(64), epoch: 1 };
const publicDns = async () => [ { address: "93.184.216.34", family: 4 } ];
const ttl = Buffer.from("@prefix ex: <https://example.test/> . ex:s ex:p ex:o .");

function fixtureBroker({ resolveAddresses = publicDns, transport } = {}) {
  const calls = [];
  const broker = new MediatedTraversalBroker({
    resolveAddresses,
    transport: transport ?? (async options => {
      calls.push(options);
      return { status: 200, headers: { "content-type": "text/turtle", "set-cookie": "secret=1" }, body: ttl };
    }),
  });
  return { broker, calls };
}

function begin(broker, budgets = {}) {
  return broker.beginTraversal({ maxDurationMs: 2_000, maxRequestMs: 1_000, ...budgets }, owner);
}

test("classifies public and unsafe IPv4/IPv6 address ranges", () => {
  const cases = new Map([
    [ "8.8.8.8", "public" ], [ "127.0.0.1", "loopback" ], [ "10.0.0.1", "private" ],
    [ "169.254.169.254", "link-local" ], [ "168.63.129.16", "cloud-metadata" ],
    [ "192.0.2.1", "documentation" ], [ "224.0.0.1", "multicast" ], [ "0.0.0.0", "reserved" ],
    [ "2606:4700:4700::1111", "public" ], [ "::1", "loopback" ], [ "::", "unspecified" ],
    [ "fc00::1", "unique-local" ], [ "fe80::1", "link-local" ], [ "ff02::1", "multicast" ],
    [ "2001:db8::1", "documentation" ], [ "::ffff:127.0.0.1", "loopback" ],
  ]);
  for (const [ address, expected ] of cases) assert.equal(classifyAddress(address), expected, address);
});

test("mediates credential-free HTTPS and strips ambient identity headers", async () => {
  const { broker, calls } = fixtureBroker();
  const traversal = begin(broker);
  const result = await broker.request({ traversalId: traversal.traversalId, request: {
    url: "https://data.example/rdf", method: "GET",
    headers: { Authorization: "Bearer secret", Cookie: "a=b", Origin: "https://private.example", Referer: "https://private.example", "X-Forwarded-For": "127.0.0.1" },
  } }, owner);
  assert.equal(result.status, 200);
  assert.equal(result.headers["set-cookie"], undefined);
  assert.equal(calls[0].headers.authorization, undefined);
  assert.equal(calls[0].headers.cookie, undefined);
  assert.equal(calls[0].headers.origin, undefined);
  assert.equal(calls[0].headers["accept-encoding"], "identity");
  assert.equal(calls[0].address, "93.184.216.34");
  const receipt = broker.finishTraversal({ traversalId: traversal.traversalId }, owner);
  assert.equal(receipt.status, "complete");
  assert.equal(receipt.hops.length, 1);
  assert.equal(receipt.usage.bytes, ttl.length);
  assert.equal(receipt.usage.retries, 0);
});

test("permits only parsed read-only SPARQL POST bodies", async () => {
  const { broker, calls } = fixtureBroker({ transport: async options => {
    calls.push(options);
    return { status: 200, headers: { "content-type": "application/sparql-results+json" }, body: Buffer.from('{"head":{},"boolean":true}') };
  } });
  const traversal = begin(broker);
  const response = await broker.request({ traversalId: traversal.traversalId, request: {
    url: "https://query.example/sparql", method: "POST", headers: { "content-type": "application/sparql-query", Authorization: "secret" },
    body: "ASK { ?s ?p ?o }",
  } }, owner);
  assert.equal(response.hop.queryType, "ASK");
  assert.equal(calls[0].headers.authorization, undefined);
  broker.finishTraversal({ traversalId: traversal.traversalId }, owner);

  for (const body of [ "INSERT DATA { <x:a> <x:b> <x:c> }", "MALFORMED {{{" ]) {
    const current = begin(broker);
    await assert.rejects(
      broker.request({ traversalId: current.traversalId, request: { url: "https://query.example/sparql", method: "POST", headers: { "content-type": "application/sparql-query" }, body } }, owner),
      error => [ "MEDIATOR_MUTATION_DENIED", "MEDIATOR_SPARQL_INVALID" ].includes(error.code) && error.receipt.status === "failed",
    );
    broker.abortTraversal({ traversalId: current.traversalId }, owner);
  }
});

test("rejects credentials, unsafe methods, media types, compression, and request bounds", async () => {
  const { broker } = fixtureBroker();
  for (const request of [
    { url: "https://user:pass@data.example/rdf" },
    { url: "http://data.example/rdf" },
    { url: "https://data.example/rdf", method: "PUT" },
    { url: "https://query.example/sparql?update=DELETE%20WHERE%20%7B%3Fs%20%3Fp%20%3Fo%7D" },
  ]) {
    const traversal = begin(broker);
    await assert.rejects(broker.request({ traversalId: traversal.traversalId, request }, owner));
    broker.abortTraversal({ traversalId: traversal.traversalId }, owner);
  }
  const wrongMedia = fixtureBroker({ transport: async () => ({ status: 200, headers: { "content-type": "text/html" }, body: Buffer.from("<html>") }) }).broker;
  const wrong = begin(wrongMedia);
  await assert.rejects(wrongMedia.request({ traversalId: wrong.traversalId, request: { url: "https://data.example/" } }, owner), error => error.code === "MEDIATOR_MEDIA_TYPE_DENIED");
  wrongMedia.abortTraversal({ traversalId: wrong.traversalId }, owner);
  const compressed = fixtureBroker({ transport: async () => ({ status: 200, headers: { "content-type": "text/turtle", "content-encoding": "gzip" }, body: Buffer.from("compressed") }) }).broker;
  const encoded = begin(compressed);
  await assert.rejects(compressed.request({ traversalId: encoded.traversalId, request: { url: "https://data.example/" } }, owner), error => error.code === "MEDIATOR_CONTENT_ENCODING_DENIED");
  compressed.abortTraversal({ traversalId: encoded.traversalId }, owner);

  const large = begin(broker, { maxRequestBodyBytes: 8 });
  await assert.rejects(broker.request({ traversalId: large.traversalId, request: { url: "https://query.example/", method: "POST", headers: { "content-type": "application/sparql-query" }, body: "ASK { ?s ?p ?o }" } }, owner), error => error.code === "MEDIATOR_REQUEST_BODY_LIMIT");
  broker.abortTraversal({ traversalId: large.traversalId }, owner);
});

test("rejects unsafe, mixed, and rebound DNS answer sets", async () => {
  for (const answers of [
    [ { address: "127.0.0.1", family: 4 } ],
    [ { address: "93.184.216.34", family: 4 }, { address: "10.0.0.1", family: 4 } ],
    [ { address: "fe80::1", family: 6 } ],
  ]) {
    const { broker } = fixtureBroker({ resolveAddresses: async () => answers });
    const traversal = begin(broker);
    await assert.rejects(broker.request({ traversalId: traversal.traversalId, request: { url: "https://data.example/rdf" } }, owner), error => error.code === "MEDIATOR_DNS_UNSAFE");
    broker.abortTraversal({ traversalId: traversal.traversalId }, owner);
  }
  let count = 0;
  const { broker } = fixtureBroker({ resolveAddresses: async () => [ { address: count++ === 0 ? "93.184.216.34" : "1.1.1.1", family: 4 } ] });
  const traversal = begin(broker);
  await broker.request({ traversalId: traversal.traversalId, request: { url: "https://data.example/one" } }, owner);
  await assert.rejects(broker.request({ traversalId: traversal.traversalId, request: { url: "https://data.example/two" } }, owner), error => error.code === "MEDIATOR_DNS_REBINDING");
  broker.abortTraversal({ traversalId: traversal.traversalId }, owner);
});

test("validates every redirect before following it", async () => {
  const transport = async ({ url }) => url.pathname === "/start"
    ? { status: 303, headers: { location: "https://metadata.example/latest" }, body: Buffer.alloc(0) }
    : { status: 200, headers: { "content-type": "text/turtle" }, body: ttl };
  const resolveAddresses = async hostname => [ { address: hostname === "metadata.example" ? "169.254.169.254" : "93.184.216.34", family: 4 } ];
  const { broker } = fixtureBroker({ transport, resolveAddresses });
  const traversal = begin(broker);
  await assert.rejects(broker.request({ traversalId: traversal.traversalId, request: { url: "https://data.example/start" } }, owner), error => error.code === "MEDIATOR_DNS_UNSAFE" && error.receipt.hops.length === 1);
  broker.abortTraversal({ traversalId: traversal.traversalId }, owner);
});

test("enforces traversal redirect and hop ceilings", async () => {
  const transport = async ({ url }) => ({ status: 303, headers: { location: `https://data.example${url.pathname}/next` }, body: Buffer.alloc(0) });
  const { broker } = fixtureBroker({ transport });
  const redirects = begin(broker, { maxRedirects: 1, maxHops: 4 });
  await assert.rejects(
    broker.request({ traversalId: redirects.traversalId, request: { url: "https://data.example/start" } }, owner),
    error => error.code === "MEDIATOR_REDIRECT_LIMIT" && error.receipt.hops.length === 2,
  );
  broker.abortTraversal({ traversalId: redirects.traversalId }, owner);
  const hops = begin(broker, { maxRedirects: 4, maxHops: 1 });
  await assert.rejects(
    broker.request({ traversalId: hops.traversalId, request: { url: "https://data.example/start" } }, owner),
    error => error.code === "MEDIATOR_HOP_LIMIT" && error.receipt.hops.length === 1,
  );
  broker.abortTraversal({ traversalId: hops.traversalId }, owner);
});

test("enforces response, cumulative-byte, fan-out, concurrency, and owner bounds", async () => {
  const largeTransport = async () => ({ status: 200, headers: { "content-type": "text/turtle" }, body: Buffer.alloc(12) });
  const { broker } = fixtureBroker({ transport: largeTransport });
  const responseBound = begin(broker, { maxResponseBytes: 8 });
  await assert.rejects(broker.request({ traversalId: responseBound.traversalId, request: { url: "https://a.example/" } }, owner), error => error.code === "MEDIATOR_RESPONSE_LIMIT");
  broker.abortTraversal({ traversalId: responseBound.traversalId }, owner);
  const totalBound = begin(broker, { maxResponseBytes: 16, maxTotalBytes: 16 });
  await broker.request({ traversalId: totalBound.traversalId, request: { url: "https://a.example/1" } }, owner);
  await assert.rejects(broker.request({ traversalId: totalBound.traversalId, request: { url: "https://a.example/2" } }, owner), error => error.code === "MEDIATOR_TOTAL_BYTES_LIMIT");
  broker.abortTraversal({ traversalId: totalBound.traversalId }, owner);
  const fanout = begin(broker, { maxFanOut: 1 });
  await broker.request({ traversalId: fanout.traversalId, request: { url: "https://a.example/" } }, owner);
  await assert.rejects(broker.request({ traversalId: fanout.traversalId, request: { url: "https://b.example/" } }, owner), error => error.code === "MEDIATOR_FANOUT_LIMIT");
  broker.abortTraversal({ traversalId: fanout.traversalId }, owner);
  const forged = begin(broker);
  await assert.rejects(broker.request({ traversalId: forged.traversalId, request: { url: "https://a.example/" } }, { token: "forged", epoch: 1 }), error => error.code === "MEDIATOR_OWNER_DENIED");
  await assert.rejects(broker.request({ traversalId: forged.traversalId, request: { url: "https://a.example/" } }, { token: owner.token, epoch: 2 }), error => error.code === "MEDIATOR_OWNER_DENIED");
  broker.abortTraversal({ traversalId: forged.traversalId }, owner);
});

test("aborts all traversal sessions when their kernel owner is replaced", () => {
  const { broker } = fixtureBroker();
  const first = begin(broker);
  const second = begin(broker);
  const receipts = broker.abortOwner(owner, "kernel-replaced");
  assert.equal(receipts.length, 2);
  assert.equal(receipts.every(receipt => receipt.status === "aborted" && receipt.failure.code === "kernel-replaced"), true);
  assert.throws(() => broker.finishTraversal({ traversalId: first.traversalId }, owner), error => error.code === "MEDIATOR_TRAVERSAL_UNKNOWN");
  assert.throws(() => broker.finishTraversal({ traversalId: second.traversalId }, owner), error => error.code === "MEDIATOR_TRAVERSAL_UNKNOWN");
});

test("enforces concurrent request and timeout cancellation bounds", async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const transport = async ({ signal }) => Promise.race([
    gate.then(() => ({ status: 200, headers: { "content-type": "text/turtle" }, body: ttl })),
    new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason ?? Object.assign(new Error("aborted"), { code: "ABORT_ERR" })), { once: true })),
  ]);
  const { broker } = fixtureBroker({ transport });
  const traversal = begin(broker, { maxConcurrency: 1 });
  const first = broker.request({ traversalId: traversal.traversalId, request: { url: "https://a.example/one" } }, owner);
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(broker.request({ traversalId: traversal.traversalId, request: { url: "https://a.example/two" } }, owner), error => error.code === "MEDIATOR_CONCURRENCY_LIMIT");
  release();
  await first;
  broker.finishTraversal({ traversalId: traversal.traversalId }, owner);

  const timeoutBroker = fixtureBroker({ transport: async ({ signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })) }).broker;
  const timed = begin(timeoutBroker, { maxRequestMs: 10, maxDurationMs: 100 });
  await assert.rejects(timeoutBroker.request({ traversalId: timed.traversalId, request: { url: "https://a.example/slow" } }, owner), error => error.code === "MEDIATOR_REQUEST_TIMEOUT" && error.receipt.status === "failed");
  timeoutBroker.abortTraversal({ traversalId: timed.traversalId }, owner);
});
