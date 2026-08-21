import { createHash, randomBytes } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

import { Parser as SparqlParser } from "sparqljs";

const KIND = "linked-science-traversal-mediator";
const RECEIPT_KIND = "linked-science-traversal-receipt";
const HOP_KIND = "linked-science-traversal-hop";
const READ_QUERY_TYPES = new Set([ "SELECT", "ASK", "CONSTRUCT", "DESCRIBE" ]);
const REDIRECTS = new Set([ 301, 302, 303, 307, 308 ]);
const FORBIDDEN_HEADERS = new Set([
  "authorization", "cookie", "origin", "proxy-authorization", "referer", "sec-fetch-site",
  "x-api-key", "x-forwarded-for", "x-forwarded-host", "x-real-ip",
]);
const SAFE_RESPONSE_HEADERS = new Set([ "content-length", "content-type", "etag", "last-modified", "location" ]);
const RDF_MEDIA_TYPES = new Set([
  "application/ld+json", "application/n-quads", "application/n-triples", "application/rdf+xml",
  "application/sparql-results+json", "application/sparql-results+xml", "application/trig",
  "application/turtle", "text/csv", "text/n3", "text/tab-separated-values", "text/turtle",
]);
const DEFAULT_ACCEPT = [ ...RDF_MEDIA_TYPES ].sort().join(", ");
const HARD_BUDGETS = Object.freeze({
  maxQueryChars: 100_000,
  maxRequestBodyBytes: 256_000,
  maxDurationMs: 120_000,
  maxRequestMs: 30_000,
  maxRedirects: 8,
  maxHops: 32,
  maxFanOut: 16,
  maxConcurrency: 6,
  maxResponseBytes: 4_000_000,
  maxTotalBytes: 20_000_000,
  maxResultItems: 5_000,
});
const DEFAULT_BUDGETS = Object.freeze({
  maxQueryChars: 16_384,
  maxRequestBodyBytes: 64_000,
  maxDurationMs: 60_000,
  maxRequestMs: 20_000,
  maxRedirects: 4,
  maxHops: 16,
  maxFanOut: 8,
  maxConcurrency: 4,
  maxResponseBytes: 2_000_000,
  maxTotalBytes: 10_000_000,
  maxResultItems: 1_000,
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [ key, stable(value[key]) ]));
  return value;
}

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(stable(value))).digest("hex");
}

function mediatorError(code, message, receipt) {
  const error = Object.assign(new Error(message), { code });
  if (receipt) error.receipt = receipt;
  return error;
}

function positiveInteger(value, fallback, maximum, name) {
  const selected = value === undefined ? fallback : value;
  if (!Number.isInteger(selected) || selected < 1 || selected > maximum) throw mediatorError("MEDIATOR_BUDGET_INVALID", `${name} must be an integer from 1 to ${maximum}`);
  return selected;
}

function normalizeBudgets(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw mediatorError("MEDIATOR_BUDGET_INVALID", "Traversal budgets must be an object");
  if (Object.keys(input).some(key => !(key in HARD_BUDGETS))) throw mediatorError("MEDIATOR_BUDGET_INVALID", "Traversal budgets contain an unknown field");
  return Object.freeze(Object.fromEntries(Object.keys(HARD_BUDGETS).map(key => [ key, positiveInteger(input[key], DEFAULT_BUDGETS[key], HARD_BUDGETS[key], key) ])));
}

function ipv4Bytes(address) {
  if (isIP(address) !== 4) return null;
  return address.split(".").map(Number);
}

function ipv6Bytes(address) {
  if (isIP(address) !== 6) return null;
  const lower = address.toLowerCase().split("%")[0];
  const halves = lower.split("::");
  if (halves.length > 2) return null;
  const parseHalf = value => value ? value.split(":").flatMap(part => {
    const v4 = ipv4Bytes(part);
    if (v4) return [ (v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3] ];
    return [ Number.parseInt(part || "0", 16) ];
  }) : [];
  const left = parseHalf(halves[0]);
  const right = parseHalf(halves[1]);
  const words = halves.length === 2 ? [ ...left, ...Array(8 - left.length - right.length).fill(0), ...right ] : left;
  if (words.length !== 8 || words.some(word => !Number.isInteger(word) || word < 0 || word > 0xffff)) return null;
  return words.flatMap(word => [ word >> 8, word & 255 ]);
}

function prefix(bytes, expected, bits) {
  const whole = Math.floor(bits / 8);
  const remainder = bits % 8;
  for (let index = 0; index < whole; index += 1) if (bytes[index] !== expected[index]) return false;
  if (remainder === 0) return true;
  const mask = 0xff << (8 - remainder);
  return (bytes[whole] & mask) === (expected[whole] & mask);
}

export function classifyAddress(address) {
  const v4 = ipv4Bytes(address);
  if (v4) {
    const [ a, b, c, d ] = v4;
    if (a === 127) return "loopback";
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return "private";
    if (a === 169 && b === 254) return "link-local";
    if (a === 100 && b >= 64 && b <= 127) return "carrier-grade-nat";
    if (a === 0 || (a === 192 && b === 0 && c === 0) || (a === 198 && (b === 18 || b === 19))) return "reserved";
    if ((a === 192 && b === 0 && c === 2) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113)) return "documentation";
    if (a >= 224) return a < 240 ? "multicast" : "reserved";
    if (a === 168 && b === 63 && c === 129 && d === 16) return "cloud-metadata";
    return "public";
  }
  const v6 = ipv6Bytes(address);
  if (!v6) return "invalid";
  if (v6.every(byte => byte === 0)) return "unspecified";
  if (v6.slice(0, 15).every(byte => byte === 0) && v6[15] === 1) return "loopback";
  if (prefix(v6, [ 0xfc ], 7)) return "unique-local";
  if (prefix(v6, [ 0xfe, 0x80 ], 10)) return "link-local";
  if (prefix(v6, [ 0xff ], 8)) return "multicast";
  if (prefix(v6, [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff ], 96)) return classifyAddress(v6.slice(12).join("."));
  if (!prefix(v6, [ 0x20 ], 3)) return "reserved";
  if (prefix(v6, [ 0x20, 0x01, 0x0d, 0xb8 ], 32)) return "documentation";
  if (prefix(v6, [ 0x20, 0x02 ], 16) || prefix(v6, [ 0x20, 0x01, 0x00, 0x00 ], 32)) return "transition-reserved";
  return "public";
}

function exactHttps(input) {
  let url;
  try { url = new URL(input); } catch { throw mediatorError("MEDIATOR_URL_INVALID", "Request URL is invalid"); }
  if (url.protocol !== "https:" || url.username || url.password || url.hash) throw mediatorError("MEDIATOR_URL_DENIED", "Only credential-free HTTPS URLs without fragments are permitted");
  return url;
}

function normalizeHeaders(input = {}) {
  const headers = new Headers(input);
  const output = {};
  for (const [ rawName, rawValue ] of headers) {
    const name = rawName.toLowerCase();
    if (FORBIDDEN_HEADERS.has(name) || name.startsWith("sec-") || name.startsWith("proxy-") || name.startsWith("x-forwarded-")) continue;
    if (![ "accept", "content-type", "if-modified-since", "if-none-match", "user-agent" ].includes(name)) continue;
    output[name] = String(rawValue).slice(0, 4_096);
  }
  output.accept = output.accept || DEFAULT_ACCEPT;
  output["accept-encoding"] = "identity";
  delete output.authorization;
  delete output.cookie;
  return output;
}

function mediaType(headers) {
  return String(headers["content-type"] ?? "").split(";", 1)[0].trim().toLowerCase();
}

function sanitizeResponseHeaders(input = {}) {
  return Object.freeze(Object.fromEntries(Object.entries(input).flatMap(([ name, value ]) => {
    const lower = name.toLowerCase();
    if (!SAFE_RESPONSE_HEADERS.has(lower) || value === undefined) return [];
    return [ [ lower, Array.isArray(value) ? value.join(", ") : String(value).slice(0, 4_096) ] ];
  })));
}

function parseReadQuery(query, maxQueryChars) {
  if (typeof query !== "string" || query.length < 1 || query.length > maxQueryChars) throw mediatorError("MEDIATOR_QUERY_LIMIT", "SPARQL query is missing or exceeds the traversal query bound");
  let parsed;
  try { parsed = new SparqlParser().parse(query); } catch (error) { throw mediatorError("MEDIATOR_SPARQL_INVALID", `Malformed SPARQL: ${error.message}`); }
  if (parsed.type !== "query" || !READ_QUERY_TYPES.has(parsed.queryType)) throw mediatorError("MEDIATOR_MUTATION_DENIED", "Only SELECT, ASK, CONSTRUCT, and DESCRIBE requests are permitted");
  return Object.freeze({ type: parsed.queryType, sha256: sha256(query) });
}

function queryFromRequest(method, url, headers, body, maxQueryChars) {
  if (url.searchParams.has("update")) throw mediatorError("MEDIATOR_MUTATION_DENIED", "SPARQL update parameters are not permitted");
  if (method === "GET" && url.searchParams.has("query")) return parseReadQuery(url.searchParams.get("query"), maxQueryChars);
  if (method !== "POST") return undefined;
  const type = String(headers["content-type"] ?? "").split(";", 1)[0].toLowerCase();
  let query;
  if (type === "application/sparql-query") query = body;
  else if (type === "application/x-www-form-urlencoded") {
    const form = new URLSearchParams(body);
    if ([ ...form.keys() ].some(key => ![ "query", "default-graph-uri", "named-graph-uri" ].includes(key))) throw mediatorError("MEDIATOR_SPARQL_BODY_DENIED", "SPARQL form contains an unsupported field");
    query = form.get("query");
  } else throw mediatorError("MEDIATOR_POST_DENIED", "POST is permitted only for read-only SPARQL query media types");
  return parseReadQuery(query, maxQueryChars);
}

async function defaultResolve(hostname) {
  return dnsLookup(hostname, { all: true, verbatim: true });
}

function defaultTransport({ url, method, headers, body, address, family, signal, maxBytes }) {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = httpsRequest(url, {
      method,
      headers,
      agent: false,
      servername: url.hostname,
      signal,
      lookup(_hostname, _options, callback) { callback(null, address, family); },
    }, response => {
      const responseHeaders = sanitizeResponseHeaders(response.headers);
      const encoding = String(response.headers["content-encoding"] ?? "identity").toLowerCase();
      if (encoding !== "identity") {
        response.destroy();
        rejectRequest(mediatorError("MEDIATOR_CONTENT_ENCODING_DENIED", "Compressed responses are refused because the mediator requests identity encoding"));
        return;
      }
      const declared = Number(response.headers["content-length"]);
      if (Number.isFinite(declared) && declared > maxBytes) {
        response.destroy();
        rejectRequest(mediatorError("MEDIATOR_RESPONSE_LIMIT", "Declared response length exceeds the per-response byte bound"));
        return;
      }
      const chunks = [];
      let bytes = 0;
      response.on("data", chunk => {
        bytes += chunk.length;
        if (bytes > maxBytes) response.destroy(mediatorError("MEDIATOR_RESPONSE_LIMIT", "Response exceeds the per-response byte bound"));
        else chunks.push(chunk);
      });
      response.on("error", rejectRequest);
      response.on("end", () => resolveRequest({ status: response.statusCode ?? 0, headers: responseHeaders, body: Buffer.concat(chunks) }));
    });
    request.on("error", rejectRequest);
    if (body && method !== "HEAD") request.write(body);
    request.end();
  });
}

export class MediatedTraversalBroker {
  constructor({ resolveAddresses = defaultResolve, transport = defaultTransport, now = () => Date.now() } = {}) {
    this.resolveAddresses = resolveAddresses;
    this.transport = transport;
    this.now = now;
    this.sessions = new Map();
    this.sequence = 0;
  }

  capabilities() {
    return Object.freeze({
      kind: KIND,
      version: "2.0.0",
      methods: [ "GET", "HEAD", "POST" ],
      queryTypes: [ ...READ_QUERY_TYPES ],
      mediaTypes: [ ...RDF_MEDIA_TYPES ].sort(),
      hardBudgets: HARD_BUDGETS,
      retries: 0,
      networkPolicy: "public-https-dns-pinned",
    });
  }

  beginTraversal(effectiveBudgets, owner = {}) {
    if (typeof owner.token !== "string" || !Number.isInteger(owner.epoch)) throw mediatorError("MEDIATOR_OWNER_REQUIRED", "Traversal owner token and epoch are required");
    const budgets = normalizeBudgets(effectiveBudgets);
    const id = `trv-${String(++this.sequence).padStart(6, "0")}-${randomBytes(6).toString("hex")}`;
    this.sessions.set(id, {
      id, owner: { token: owner.token, epoch: owner.epoch }, budgets, startedAt: this.now(), state: "active",
      active: 0, bytes: 0, hops: [], origins: new Set(), dnsPins: new Map(), controllers: new Set(),
    });
    return Object.freeze({ traversalId: id, budgets, startedAt: this.now() });
  }

  #session(id, owner) {
    const session = this.sessions.get(id);
    if (!session) throw mediatorError("MEDIATOR_TRAVERSAL_UNKNOWN", "Traversal session is unknown or finished");
    if (session.owner.token !== owner.token || session.owner.epoch !== owner.epoch) throw mediatorError("MEDIATOR_OWNER_DENIED", "Traversal session belongs to another kernel capability or epoch");
    if (session.state !== "active") throw mediatorError("MEDIATOR_TRAVERSAL_INACTIVE", "Traversal session is not active");
    if (this.now() - session.startedAt >= session.budgets.maxDurationMs) throw mediatorError("MEDIATOR_TRAVERSAL_TIMEOUT", "Traversal duration budget is exhausted", this.#receipt(session, "failed", "MEDIATOR_TRAVERSAL_TIMEOUT"));
    return session;
  }

  async #resolve(session, hostname) {
    const answers = await this.resolveAddresses(hostname);
    if (!Array.isArray(answers) || answers.length === 0) throw mediatorError("MEDIATOR_DNS_EMPTY", "DNS returned no addresses");
    const normalized = [ ...new Map(answers.map(item => [ String(item.address).toLowerCase(), { address: String(item.address).toLowerCase(), family: Number(item.family) } ])).values() ]
      .sort((left, right) => left.address.localeCompare(right.address));
    const unsafe = normalized.filter(item => classifyAddress(item.address) !== "public");
    if (unsafe.length > 0) throw mediatorError("MEDIATOR_DNS_UNSAFE", `DNS includes a non-public address (${unsafe.map(item => classifyAddress(item.address)).join(",")})`);
    const signature = normalized.map(item => `${item.family}:${item.address}`).join("|");
    const previous = session.dnsPins.get(hostname);
    if (previous && previous !== signature) throw mediatorError("MEDIATOR_DNS_REBINDING", "DNS answer set changed within the traversal");
    session.dnsPins.set(hostname, signature);
    return normalized[0];
  }

  async request({ traversalId, request }, owner = {}) {
    const session = this.#session(traversalId, owner);
    if (!request || typeof request !== "object" || Array.isArray(request)) throw mediatorError("MEDIATOR_REQUEST_INVALID", "Serialized request must be an object");
    if (session.active >= session.budgets.maxConcurrency) throw mediatorError("MEDIATOR_CONCURRENCY_LIMIT", "Traversal concurrency bound is exhausted");
    session.active += 1;
    try {
      return await this.#request(session, request);
    } catch (error) {
      if (!error.receipt) error.receipt = this.#receipt(session, "failed", error.code ?? "MEDIATOR_REQUEST_FAILED");
      throw error;
    } finally {
      session.active -= 1;
    }
  }

  async #request(session, input) {
    let url = exactHttps(input.url);
    let method = String(input.method ?? "GET").toUpperCase();
    if (![ "GET", "HEAD", "POST" ].includes(method)) throw mediatorError("MEDIATOR_METHOD_DENIED", "Only GET, HEAD, and read-only SPARQL POST are permitted");
    let headers = normalizeHeaders(input.headers);
    let body = input.body === undefined || input.body === null ? "" : String(input.body);
    if (Buffer.byteLength(body) > session.budgets.maxRequestBodyBytes) throw mediatorError("MEDIATOR_REQUEST_BODY_LIMIT", "Request body exceeds the traversal bound");
    let query = queryFromRequest(method, url, headers, body, session.budgets.maxQueryChars);
    let redirects = 0;
    while (true) {
      this.#session(session.id, session.owner);
      query = queryFromRequest(method, url, headers, body, session.budgets.maxQueryChars);
      if (session.hops.length >= session.budgets.maxHops) throw mediatorError("MEDIATOR_HOP_LIMIT", "Traversal hop bound is exhausted");
      session.origins.add(url.origin);
      if (session.origins.size > session.budgets.maxFanOut) throw mediatorError("MEDIATOR_FANOUT_LIMIT", "Traversal fan-out bound is exhausted");
      const selected = await this.#resolve(session, url.hostname);
      const controller = new AbortController();
      session.controllers.add(controller);
      const remaining = session.budgets.maxDurationMs - (this.now() - session.startedAt);
      const timeoutMs = Math.min(remaining, session.budgets.maxRequestMs);
      const timer = setTimeout(() => controller.abort(mediatorError("MEDIATOR_REQUEST_TIMEOUT", "Request duration bound is exhausted")), timeoutMs);
      const requestDigest = sha256({ url: url.href, method, headers, bodySha256: sha256(body) });
      let response;
      try {
        response = await this.transport({ url, method, headers, body, address: selected.address, family: selected.family, signal: controller.signal, maxBytes: session.budgets.maxResponseBytes });
      } finally {
        clearTimeout(timer);
        session.controllers.delete(controller);
      }
      const status = Number(response.status);
      const contentEncoding = String(response.headers?.["content-encoding"] ?? "identity").toLowerCase();
      if (contentEncoding !== "identity") throw mediatorError("MEDIATOR_CONTENT_ENCODING_DENIED", "Compressed responses are refused because the mediator requests identity encoding");
      const responseHeaders = sanitizeResponseHeaders(response.headers);
      const bytes = Buffer.isBuffer(response.body) ? response.body : Buffer.from(response.body ?? "");
      if (bytes.length > session.budgets.maxResponseBytes) throw mediatorError("MEDIATOR_RESPONSE_LIMIT", "Response exceeds the per-response byte bound");
      if (session.bytes + bytes.length > session.budgets.maxTotalBytes) throw mediatorError("MEDIATOR_TOTAL_BYTES_LIMIT", "Response exceeds the traversal cumulative byte bound");
      session.bytes += bytes.length;
      const hop = Object.freeze({
        kind: HOP_KIND, index: session.hops.length + 1, url: url.href, method, status,
        address: selected.address, requestSha256: requestDigest, responseSha256: sha256(bytes), bytes: bytes.length,
        mediaType: mediaType(responseHeaders), queryType: query?.type, querySha256: query?.sha256,
      });
      session.hops.push(hop);
      if (REDIRECTS.has(status)) {
        if (redirects >= session.budgets.maxRedirects) throw mediatorError("MEDIATOR_REDIRECT_LIMIT", "Traversal redirect bound is exhausted");
        const location = responseHeaders.location;
        if (!location) throw mediatorError("MEDIATOR_REDIRECT_INVALID", "Redirect lacks a Location header");
        url = exactHttps(new URL(location, url).href);
        redirects += 1;
        if (status === 303) { method = "GET"; body = ""; query = undefined; headers = normalizeHeaders({ accept: headers.accept }); }
        else if ((status === 301 || status === 302) && method === "POST") throw mediatorError("MEDIATOR_REDIRECT_METHOD_DENIED", "Ambiguous POST redirect is refused");
        continue;
      }
      if (status < 200 || status >= 300) throw mediatorError("MEDIATOR_HTTP_ERROR", `HTTPS request failed with status ${status}`);
      const type = mediaType(responseHeaders);
      if (method !== "HEAD" && !RDF_MEDIA_TYPES.has(type)) throw mediatorError("MEDIATOR_MEDIA_TYPE_DENIED", `Response media type is not RDF/SPARQL data: ${type || "missing"}`);
      return Object.freeze({ status, headers: responseHeaders, bodyBase64: bytes.toString("base64"), hop });
    }
  }

  #receipt(session, status, failureCode) {
    return Object.freeze({
      kind: RECEIPT_KIND,
      version: "2.0.0",
      status,
      traversalId: session.id,
      startedAt: session.startedAt,
      finishedAt: this.now(),
      budgets: session.budgets,
      usage: Object.freeze({ hops: session.hops.length, fanOut: session.origins.size, bytes: session.bytes, retries: 0 }),
      hops: Object.freeze([ ...session.hops ]),
      ...(failureCode ? { failure: Object.freeze({ code: failureCode }) } : {}),
    });
  }

  finishTraversal({ traversalId }, owner = {}) {
    const session = this.#session(traversalId, owner);
    if (session.active !== 0) throw mediatorError("MEDIATOR_TRAVERSAL_BUSY", "Traversal has active requests");
    session.state = "finished";
    const receipt = this.#receipt(session, "complete");
    this.sessions.delete(session.id);
    return receipt;
  }

  abortTraversal({ traversalId, reason = "aborted" }, owner = {}) {
    const session = this.sessions.get(traversalId);
    if (!session) return Object.freeze({ kind: RECEIPT_KIND, status: "aborted", traversalId, missing: true });
    if (session.owner.token !== owner.token || session.owner.epoch !== owner.epoch) throw mediatorError("MEDIATOR_OWNER_DENIED", "Traversal session belongs to another kernel capability or epoch");
    session.state = "aborted";
    for (const controller of session.controllers) controller.abort();
    const receipt = this.#receipt(session, "aborted", String(reason).slice(0, 96));
    this.sessions.delete(session.id);
    return receipt;
  }

  abortOwner(owner, reason = "kernel-replaced") {
    const receipts = [];
    for (const session of [ ...this.sessions.values() ]) {
      if (session.owner.token === owner.token && session.owner.epoch === owner.epoch) receipts.push(this.abortTraversal({ traversalId: session.id, reason }, owner));
    }
    return receipts;
  }
}

export const MEDIATED_TRAVERSAL_KINDS = Object.freeze({ mediator: KIND, receipt: RECEIPT_KIND, hop: HOP_KIND });
export const MEDIATED_TRAVERSAL_DEFAULTS = DEFAULT_BUDGETS;
