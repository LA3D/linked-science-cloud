import assert from "node:assert/strict";
import { mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { KernelBroker } from "../src/cleanroom-mcp.mjs";
import { createDefaultLinkedScienceProfiles, LinkedScienceNetworkBroker } from "../src/linked-science-broker.mjs";

const ACQUIRE_SOURCE = "https://fixtures.invalid/orientation.ttl";
const QUERY_ENDPOINT = "https://fixtures.invalid/sparql";
const SELECT_QUERY = "SELECT ?entry ?label WHERE { ?entry ?p ?label } LIMIT 2";

function profiles(overrides = {}) {
  return [
    {
      id: "fixture-orientation",
      operation: "acquire",
      sources: [ACQUIRE_SOURCE],
      accept: "text/turtle",
      allowedContentTypes: ["text/turtle"],
      timeoutMs: 200,
      maxBytes: 1_024,
      maxItems: 4,
      maxTransports: 1,
      ...overrides.acquire,
    },
    {
      id: "fixture-query",
      operation: "query",
      endpoint: QUERY_ENDPOINT,
      allowedQueryTypes: ["SELECT", "ASK"],
      allowService: false,
      timeoutMs: 200,
      maxBytes: 2_048,
      maxItems: 2,
      maxTransports: 1,
      maxQueryChars: 512,
      ...overrides.query,
    },
  ];
}

function parseQuery(query) {
  if (query === "MALFORMED") throw new Error("synthetic parse failure");
  if (/^INSERT/i.test(query)) return { type: "update", updateType: "insert" };
  const queryType = /^ASK/i.test(query) ? "ASK" : "SELECT";
  const limit = /LIMIT\s+(\d+)/i.exec(query)?.[1];
  return {
    type: "query",
    queryType,
    ...(limit ? { limit: Number(limit) } : {}),
    where: /SERVICE/i.test(query) ? [{ type: "service", name: "https://elsewhere.invalid/sparql" }] : [],
  };
}

function fixtureFetch(calls) {
  return async (url, options) => {
    calls.push({ url, options });
    if (url === ACQUIRE_SOURCE) {
      return new Response("@prefix ex: <https://example.test/> . ex:a ex:p ex:b .", {
        headers: { "content-type": "text/turtle; charset=utf-8" },
      });
    }
    if (url === QUERY_ENDPOINT) {
      return Response.json({
        head: { vars: ["entry", "label"] },
        results: { bindings: [{
          entry: { type: "uri", value: "https://example.test/entry/1" },
          label: { type: "literal", value: "Synthetic entry", "xml:lang": "en" },
        }] },
      }, { headers: { "content-type": "application/sparql-results+json" } });
    }
    throw new Error(`unexpected fixture URL: ${url}`);
  };
}

function output(result) {
  return result.content.find((item) => item.type === "text")?.text;
}

test("immutable profile descriptors disclose only IDs, operation kinds, digests, and ceilings", () => {
  const broker = new LinkedScienceNetworkBroker({ profiles: profiles(), fetchImpl: async () => new Response(), parseQuery });
  const capability = broker.capabilities();

  assert.equal(capability.kind, "linked-science-network-broker");
  assert.deepEqual(capability.profiles.map((profile) => Object.keys(profile)), [
    ["id", "operation", "sha256", "limits"],
    ["id", "operation", "sha256", "limits"],
  ]);
  assert.match(capability.profiles[0].sha256, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(capability).includes("fixtures.invalid"), false);
  assert.equal(Object.isFrozen(capability), true);
  assert.equal(Object.isFrozen(capability.profiles[0].limits), true);
});

test("default Linked Science profiles pin the reviewed competency sources without disclosing them", () => {
  const profiles = createDefaultLinkedScienceProfiles();
  assert.deepEqual(profiles.map(({ id, operation }) => ({ id, operation })), [
    { id: "uniprot-void-description", operation: "acquire" },
    { id: "go-orientation", operation: "acquire" },
    { id: "uniprot-read", operation: "query" },
  ]);
  assert.deepEqual(profiles.map((profile) => profile.maxTransports), [1, 1, 1]);
  const broker = new LinkedScienceNetworkBroker({ profiles, fetchImpl: async () => new Response(), parseQuery });
  const capability = broker.capabilities();
  assert.deepEqual(capability.profiles.map((profile) => profile.id), profiles.map((profile) => profile.id));
  assert.equal(JSON.stringify(capability).includes("sparql.uniprot.org"), false);
  assert.equal(JSON.stringify(capability).includes("geneontology.org"), false);
});

test("broker-owned acquisition and query return bounded payloads with attributable receipts", async () => {
  const calls = [];
  const broker = new LinkedScienceNetworkBroker({
    profiles: profiles(),
    fetchImpl: fixtureFetch(calls),
    parseQuery,
    clock: () => "2026-08-20T12:00:00.000Z",
  });

  const acquired = await broker.acquire({ profile: "fixture-orientation" });
  const queried = await broker.query({ profile: "fixture-query", sparql: SELECT_QUERY });

  assert.match(acquired.content, /ex:a/);
  assert.equal(acquired.receipt.operation, "acquire");
  assert.equal(acquired.receipt.attempts[0].retries, 0);
  assert.equal(queried.result.kind, "bindings");
  assert.deepEqual(queried.result.rows[0], {
    entry: { termType: "NamedNode", value: "https://example.test/entry/1" },
    label: {
      termType: "Literal",
      value: "Synthetic entry",
      language: "en",
      datatype: "http://www.w3.org/2001/XMLSchema#string",
    },
  });
  assert.match(queried.receipt.profileSha256, /^[a-f0-9]{64}$/);
  assert.match(queried.receipt.inputSha256, /^[a-f0-9]{64}$/);
  assert.match(queried.receipt.payloadSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(calls.map(({ url }) => url), [ACQUIRE_SOURCE, QUERY_ENDPOINT]);
  assert.equal(calls[0].options.redirect, "manual");
  assert.equal(calls[1].options.method, "POST");
  assert.equal(calls[1].options.body, SELECT_QUERY);
  assert.equal(calls[1].options.redirect, "error");
});

test("caller transport injection and unsafe SPARQL are denied before transport", async () => {
  const calls = [];
  const broker = new LinkedScienceNetworkBroker({ profiles: profiles(), fetchImpl: fixtureFetch(calls), parseQuery });

  await assert.rejects(
    () => broker.query({ profile: { id: "fixture-query" }, sparql: SELECT_QUERY }),
    (error) => error.code === "BROKER_PROFILE_DENIED",
  );
  await assert.rejects(
    () => broker.query({ profile: "fixture-query", sparql: SELECT_QUERY, endpoint: "https://attacker.invalid/sparql" }),
    (error) => error.code === "BROKER_ARGUMENT_DENIED",
  );
  await assert.rejects(
    () => broker.query({ profile: "fixture-query", sparql: SELECT_QUERY, fetch: async () => {} }),
    (error) => error.code === "BROKER_ARGUMENT_DENIED",
  );
  await assert.rejects(
    () => broker.acquire({ profile: "fixture-orientation", source: "https://attacker.invalid/data", credentials: "include" }),
    (error) => error.code === "BROKER_ARGUMENT_DENIED",
  );
  await assert.rejects(
    () => broker.acquire({ profile: "fixture-orientation", source: "https://attacker.invalid/data" }),
    (error) => error.code === "BROKER_SOURCE_DENIED",
  );
  await assert.rejects(
    () => broker.query({ profile: "fixture-query", sparql: "MALFORMED" }),
    (error) => error.code === "BROKER_QUERY_DENIED",
  );
  await assert.rejects(
    () => broker.query({ profile: "fixture-query", sparql: "INSERT DATA { <x:a> <x:b> <x:c> }" }),
    (error) => error.code === "BROKER_QUERY_DENIED",
  );
  await assert.rejects(
    () => broker.query({ profile: "fixture-query", sparql: "SELECT * WHERE { SERVICE <https://attacker.invalid/sparql> { ?s ?p ?o } } LIMIT 1" }),
    (error) => error.code === "BROKER_QUERY_DENIED",
  );
  await assert.rejects(
    () => broker.query({ profile: "fixture-query", sparql: "SELECT * WHERE { ?s ?p ?o }" }),
    (error) => error.code === "BROKER_QUERY_DENIED",
  );
  assert.equal(calls.length, 0);
});

test("byte, result, and timeout failures stay bounded and never retry", async () => {
  let byteCalls = 0;
  const byteBroker = new LinkedScienceNetworkBroker({
    profiles: profiles({ acquire: { maxBytes: 8 } }),
    parseQuery,
    fetchImpl: async () => {
      byteCalls += 1;
      return new Response("this response is too long", { headers: { "content-type": "text/turtle" } });
    },
  });
  await assert.rejects(
    () => byteBroker.acquire({ profile: "fixture-orientation" }),
    (error) => error.code === "BROKER_RESPONSE_LIMIT",
  );
  assert.equal(byteCalls, 1);

  let resultCalls = 0;
  const resultBroker = new LinkedScienceNetworkBroker({
    profiles: profiles({ query: { maxItems: 1 } }),
    parseQuery,
    fetchImpl: async () => {
      resultCalls += 1;
      return Response.json({ results: { bindings: [{}, {}] } }, { headers: { "content-type": "application/json" } });
    },
  });
  await assert.rejects(
    () => resultBroker.query({ profile: "fixture-query", sparql: "SELECT * WHERE { ?s ?p ?o } LIMIT 1" }),
    (error) => error.code === "BROKER_RESULT_LIMIT",
  );
  assert.equal(resultCalls, 1);

  let timeoutCalls = 0;
  const timeoutBroker = new LinkedScienceNetworkBroker({
    profiles: profiles({ query: { timeoutMs: 5 } }),
    parseQuery,
    fetchImpl: async (_url, { signal }) => {
      timeoutCalls += 1;
      return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }));
    },
  });
  await assert.rejects(
    () => timeoutBroker.query({ profile: "fixture-query", sparql: SELECT_QUERY }),
    (error) => error.code === "BROKER_TIMEOUT",
  );
  assert.equal(timeoutCalls, 1);

  let redirectCalls = 0;
  const redirectBroker = new LinkedScienceNetworkBroker({
    profiles: profiles(),
    parseQuery,
    fetchImpl: async () => {
      redirectCalls += 1;
      return new Response(null, { status: 302, headers: { location: "https://redirect.invalid/sparql" } });
    },
  });
  await assert.rejects(
    () => redirectBroker.query({ profile: "fixture-query", sparql: SELECT_QUERY }),
    (error) => error.code === "BROKER_HTTP_ERROR",
  );
  assert.equal(redirectCalls, 1);

  let failureCalls = 0;
  const failureBroker = new LinkedScienceNetworkBroker({
    profiles: profiles(),
    parseQuery,
    fetchImpl: async () => {
      failureCalls += 1;
      throw new Error("injected fixture transport failure");
    },
  });
  await assert.rejects(
    () => failureBroker.query({ profile: "fixture-query", sparql: SELECT_QUERY }),
    (error) => error.code === "BROKER_TRANSPORT_ERROR" && error.message === "SPARQL query transport failed",
  );
  assert.equal(failureCalls, 1);
});

test("acquisition redirects are not followed and return a bounded failure receipt", async () => {
  const calls = [];
  const broker = new LinkedScienceNetworkBroker({
    profiles: profiles(),
    parseQuery,
    clock: () => "2026-08-20T12:00:00.000Z",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(null, {
        status: 303,
        headers: {
          "content-type": "text/html",
          location: "/canonical/core.owl",
        },
      });
    },
  });

  await assert.rejects(
    () => broker.acquire({ profile: "fixture-orientation" }),
    (error) => {
      assert.equal(error.code, "BROKER_REDIRECT_DENIED");
      assert.equal(error.receipt.status, "failed");
      assert.equal(error.receipt.operation, "acquire");
      assert.equal(error.receipt.failure.code, "BROKER_REDIRECT_DENIED");
      assert.equal(Object.isFrozen(error.receipt), true);
      assert.deepEqual(error.receipt.attempts, [{
        source: ACQUIRE_SOURCE,
        at: "2026-08-20T12:00:00.000Z",
        method: "GET",
        redirect: "manual",
        followedRedirects: 0,
        timeoutMs: 200,
        responseByteLimit: 1_024,
        retries: 0,
        status: 303,
        ok: false,
        contentType: "text/html",
        bodyRead: false,
        redirectLocation: { status: "exact-https", value: "https://fixtures.invalid/canonical/core.owl" },
      }]);
      return true;
    },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.redirect, "manual");
});

test("redirect denial receipts cross the child boundary without exposing a response body", async (t) => {
  const workerRoot = await mkdtemp(join(tmpdir(), "cleanroom-redirect-worker-"));
  const calls = [];
  const broker = new KernelBroker({
    cwd: workerRoot,
    linkedScienceProfiles: profiles(),
    linkedScienceParseQuery: parseQuery,
    linkedScienceFetch: async (url, options) => {
      calls.push({ url, options });
      return new Response(null, { status: 302, headers: { location: "https://fixtures.invalid/core.owl#" } });
    },
  });
  t.after(() => broker.close());

  const result = await broker.execute("nodeRepl.write(JSON.stringify(await nodeRepl.linkedScienceBroker.acquire({profile:'fixture-orientation'}).then(()=>({unexpected:true}), error=>({code:error.code, receipt:error.receipt}))))");
  const observed = JSON.parse(output(result));
  assert.equal(observed.code, "BROKER_REDIRECT_DENIED");
  assert.equal(observed.receipt.status, "failed");
  assert.equal(observed.receipt.attempts[0].bodyRead, false);
  assert.equal(observed.receipt.attempts[0].redirectLocation.value, "https://fixtures.invalid/core.owl");
  assert.equal(calls.length, 1);
});

test("child receives only the named broker capability while raw network and evaluator-private reads are denied", async (t) => {
  const workerRoot = await mkdtemp(join(tmpdir(), "cleanroom-worker-"));
  const evaluatorRoot = await mkdtemp(join(tmpdir(), "cleanroom-evaluator-"));
  const honeytoken = join(evaluatorRoot, "honeytoken.txt");
  await writeFile(honeytoken, "evaluator-private-secret\n");
  const calls = [];
  const broker = new KernelBroker({
    cwd: workerRoot,
    linkedScienceProfiles: profiles(),
    linkedScienceFetch: fixtureFetch(calls),
    linkedScienceParseQuery: parseQuery,
  });
  t.after(() => broker.close());

  const shape = await broker.execute("nodeRepl.write(JSON.stringify(Object.keys(nodeRepl.linkedScienceBroker).sort()))");
  const capability = await broker.execute("nodeRepl.write(JSON.stringify(await nodeRepl.linkedScienceBroker.capabilities()))");
  const query = await broker.execute(`nodeRepl.write(JSON.stringify(await nodeRepl.linkedScienceBroker.query({profile:'fixture-query', sparql:${JSON.stringify(SELECT_QUERY)}})))`);
  const acquisition = await broker.execute("nodeRepl.write(JSON.stringify(await nodeRepl.linkedScienceBroker.acquire({profile:'fixture-orientation'})))");

  assert.deepEqual(JSON.parse(output(shape)), ["acquire", "capabilities", "query"]);
  assert.equal(JSON.stringify(JSON.parse(output(capability))).includes("fixtures.invalid"), false);
  assert.equal(JSON.parse(output(query)).result.rows[0].label.value, "Synthetic entry");
  assert.match(JSON.parse(output(acquisition)).content, /ex:a/);
  assert.equal(calls.length, 2);

  const forgedModule = `data:text/javascript,${encodeURIComponent(`process.send({type:"host_call",id:999,method:"linked-science.query",args:{profile:"fixture-query",sparql:${JSON.stringify(SELECT_QUERY)}}});`)}`;
  await broker.execute(`await import(${JSON.stringify(forgedModule)}); await new Promise(resolve => setTimeout(resolve, 10))`);
  assert.equal(calls.length, 2, "forged module IPC lacks the per-kernel capability token");

  const rawHttp = await broker.execute("nodeRepl.write(await fetch('https://example.invalid').then(()=> 'allowed', error => error.cause?.code ?? error.code ?? error.name))");
  const rawDns = await broker.execute("nodeRepl.write(await (await import('node:dns/promises')).lookup('example.invalid').then(()=> 'allowed', error => error.code ?? error.name))");
  const rawSocket = await broker.execute("var netModule = await import('node:net'); nodeRepl.write(await new Promise(resolve => { try { const socket = netModule.connect({host:'127.0.0.1',port:9}); socket.once('connect', () => resolve('allowed')); socket.once('error', error => resolve(error.code ?? error.name)); } catch (error) { resolve(error.code ?? error.name); } }))");
  const privateRead = await broker.execute(`nodeRepl.write(await (await import('node:fs/promises')).readFile(${JSON.stringify(honeytoken)}, 'utf8').then(()=> 'readable', error => error.code ?? error.name))`);
  const workerWrite = await broker.execute(`nodeRepl.write(await (await import('node:fs/promises')).writeFile(${JSON.stringify(join(workerRoot, "child-write.txt"))}, 'denied').then(()=> 'writable', error => error.code ?? error.name))`);

  assert.equal(output(rawHttp), "ERR_ACCESS_DENIED");
  assert.equal(output(rawDns), "ERR_ACCESS_DENIED");
  assert.equal(output(rawSocket), "ERR_ACCESS_DENIED");
  assert.equal(output(privateRead), "ERR_ACCESS_DENIED");
  assert.equal(output(workerWrite), "ERR_ACCESS_DENIED");
  assert.deepEqual(await broker.attestFilesystemBoundary({ workerRoot, evaluatorRoot, probePath: honeytoken }), {
    kind: "cleanroom-filesystem-boundary",
    enforcer: "cleanroom-broker",
    privateReadProbe: "denied",
    workerRoot: broker.cwd,
    evaluatorRoot: await realpath(evaluatorRoot),
    permissionModel: "node-permission",
    probeCode: "ERR_ACCESS_DENIED",
  });
});
