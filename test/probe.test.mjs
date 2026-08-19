import assert from "node:assert/strict";
import test from "node:test";

import { probeNetwork, sanitizeError } from "../src/probe.mjs";

test("probe output stays bounded and has all four stages", async () => {
  const adapters = {
    dns: async () => ({ answers: [{ family: 4, address: "192.0.2.1" }], truncated: false }),
    tcp: async () => ({}),
    tls: async () => ({ authorized: true, protocol: "TLSv1.3" }),
    http: async () => ({ statusCode: 200 }),
  };

  const result = await probeNetwork({ adapters, timeoutMs: 1 });

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.timeoutMs, 100);
  assert.deepEqual(Object.keys(result.checks), ["dns", "tcp", "tls", "http"]);
  assert.equal(result.checks.http.statusCode, 200);
  assert.ok(JSON.stringify(result).length < 2_000);
});

test("adapter failures expose only sanitized diagnostic fields", async () => {
  const failure = Object.assign(new Error("/secret/path\nshould not appear"), {
    name: "NetworkError",
    code: "E".repeat(200),
    syscall: "connect\tprivate-detail",
  });
  const adapters = Object.fromEntries(
    ["dns", "tcp", "tls", "http"].map((stage) => [stage, async () => { throw failure; }]),
  );

  const result = await probeNetwork({ adapters });
  const encoded = JSON.stringify(result);

  assert.equal(result.checks.dns.ok, false);
  assert.equal(result.checks.dns.error.code.length, 96);
  assert.equal(encoded.includes("/secret/path"), false);
  assert.equal(encoded.includes("\n"), false);
});

test("sanitizeError uses cause codes without retaining messages", () => {
  const result = sanitizeError({ cause: { code: "ENOTFOUND", syscall: "getaddrinfo" } }, "http");

  assert.deepEqual(result, {
    ok: false,
    stage: "http",
    error: { name: "Error", code: "ENOTFOUND", syscall: "getaddrinfo" },
  });
});
