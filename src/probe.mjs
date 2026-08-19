import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { createConnection } from "node:net";
import { connect as tlsConnect } from "node:tls";
import { pathToFileURL } from "node:url";

export const TARGET = Object.freeze({
  hostname: "example.com",
  port: 443,
  url: "https://example.com/",
});

export const DEFAULT_TIMEOUT_MS = 4_000;
const MAX_DNS_ANSWERS = 4;
const MAX_TEXT = 96;

function boundedText(value, fallback) {
  const text = String(value ?? fallback).replace(/[\r\n\t]+/g, " ");
  return text.slice(0, MAX_TEXT);
}

export function sanitizeError(error, stage = "unknown") {
  const cause = error?.cause;
  return {
    ok: false,
    stage: boundedText(stage, "unknown"),
    error: {
      name: boundedText(error?.name, "Error"),
      code: boundedText(error?.code ?? cause?.code, "UNKNOWN"),
      syscall: boundedText(error?.syscall ?? cause?.syscall, "unknown"),
    },
  };
}

function timed(check, timeoutMs, stage) {
  const started = performance.now();
  return Promise.resolve()
    .then(() => check())
    .then((detail) => ({
      ok: true,
      stage,
      durationMs: Math.min(Math.round(performance.now() - started), timeoutMs),
      ...detail,
    }))
    .catch((error) => ({
      ...sanitizeError(error, stage),
      durationMs: Math.min(Math.round(performance.now() - started), timeoutMs),
    }));
}

function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("probe timed out");
      error.code = "TIMEOUT";
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function socketResult(factory, successEvent, successDetail, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = factory();
    let settled = false;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      callback(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once(successEvent, () => finish(resolve, successDetail(socket)));
    socket.once("timeout", () => {
      const error = new Error("probe timed out");
      error.code = "TIMEOUT";
      finish(reject, error);
    });
    socket.once("error", (error) => finish(reject, error));
  });
}

export const nodeAdapters = Object.freeze({
  async dns(target, timeoutMs) {
    const answers = await withTimeout(
      dnsLookup(target.hostname, { all: true, verbatim: true }),
      timeoutMs,
    );
    return {
      answers: answers.slice(0, MAX_DNS_ANSWERS).map(({ family, address }) => ({
        family,
        address: boundedText(address, "unknown"),
      })),
      truncated: answers.length > MAX_DNS_ANSWERS,
    };
  },

  tcp(target, timeoutMs) {
    return socketResult(
      () => createConnection({ host: target.hostname, port: target.port }),
      "connect",
      () => ({}),
      timeoutMs,
    );
  },

  tls(target, timeoutMs) {
    return socketResult(
      () => tlsConnect({
        host: target.hostname,
        port: target.port,
        servername: target.hostname,
      }),
      "secureConnect",
      (socket) => ({
        authorized: socket.authorized,
        protocol: boundedText(socket.getProtocol(), "unknown"),
      }),
      timeoutMs,
    );
  },

  http(target, timeoutMs) {
    return new Promise((resolve, reject) => {
      const request = httpsRequest(target.url, { method: "HEAD" }, (response) => {
        response.resume();
        resolve({ statusCode: response.statusCode ?? 0 });
      });
      request.setTimeout(timeoutMs, () => {
        const error = new Error("probe timed out");
        error.code = "TIMEOUT";
        request.destroy(error);
      });
      request.once("error", reject);
      request.end();
    });
  },
});

export async function probeNetwork({
  adapters = nodeAdapters,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const boundedTimeout = Math.max(100, Math.min(Number(timeoutMs) || DEFAULT_TIMEOUT_MS, 10_000));
  const target = TARGET;
  const checks = {};

  for (const stage of ["dns", "tcp", "tls", "http"]) {
    checks[stage] = await timed(
      () => adapters[stage](target, boundedTimeout),
      boundedTimeout,
      stage,
    );
  }

  return {
    schemaVersion: 1,
    target: { hostname: target.hostname, port: target.port, url: target.url },
    timeoutMs: boundedTimeout,
    checks,
  };
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  const result = await probeNetwork();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
