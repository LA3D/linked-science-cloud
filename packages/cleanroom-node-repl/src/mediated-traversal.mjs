import { createHash, randomBytes } from "node:crypto";

import { Parser as SparqlParser } from "sparqljs";
import httpLinkHeader from "http-link-header";

const KIND = "linked-science-anonymous-read-mediator";
const RECEIPT_KIND = "linked-science-traversal-receipt";
const EXCHANGE_KIND = "linked-science-fetch-exchange";
const AUTHORITY_CLASS = "anonymous-linked-data-read";
const PROTOCOL_VERSION = "3.2.0";
const AUTHORITY_VERSION = "1.0.0";
const READ_QUERY_TYPES = new Set([ "SELECT", "ASK", "CONSTRUCT", "DESCRIBE" ]);
const IDENTITY_HEADERS = new Set([
  "authorization", "cookie", "origin", "proxy-authorization", "referer", "sec-fetch-site",
  "x-api-key", "x-forwarded-for", "x-forwarded-host", "x-real-ip",
]);
const SAFE_REQUEST_HEADERS = new Set([ "accept", "accept-profile", "content-type", "prefer", "user-agent" ]);
const SAFE_RESPONSE_HEADERS = new Set([
  "content-encoding", "content-length", "content-profile", "content-type", "etag", "last-modified", "link", "location",
  "preference-applied", "vary",
]);
const MAX_HEADER_VALUE_CHARS = 8_192;
const MAX_NAVIGATION_LINKS = 24;
const MAX_LINK_PARAMETERS = 8;
const NAVIGATION_RELATION_PRIORITY = new Set([ "profile", "describedby", "alternate", "http://www.w3.org/ns/json-ld#context", "service-desc", "canonical" ]);
const DEFAULT_ACCEPT = "application/trig, application/n-quads;q=0.95, text/turtle;q=0.9, application/ld+json;q=0.8, application/rdf+xml;q=0.7, application/sparql-results+json;q=0.6, application/sparql-results+xml;q=0.5";
const HARD_BUDGETS = Object.freeze({
  maxQueryChars: 100_000,
  maxRequestBodyBytes: 256_000,
  maxDurationMs: 900_000,
  maxRequestMs: 30_000,
  maxRequests: 32,
  maxFanOut: 16,
  maxConcurrency: 6,
  maxResponseBytes: 4_000_000,
  maxTotalBytes: 20_000_000,
  maxResultItems: 5_000,
});
const DEFAULT_BUDGETS = Object.freeze({
  maxQueryChars: 16_384,
  maxRequestBodyBytes: 64_000,
  maxDurationMs: 300_000,
  maxRequestMs: 20_000,
  maxRequests: 16,
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
  const input = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : JSON.stringify(stable(value)));
  return createHash("sha256").update(input).digest("hex");
}

function mediatorError(code, message, receipt) {
  const error = Object.assign(new Error(message), { code });
  if (receipt) error.receipt = receipt;
  return error;
}

function positiveInteger(value, fallback, maximum, name) {
  const selected = value === undefined ? fallback : value;
  if (!Number.isInteger(selected) || selected < 1 || selected > maximum) {
    throw mediatorError("MEDIATOR_BUDGET_INVALID", `${name} must be an integer from 1 to ${maximum}`);
  }
  return selected;
}

function normalizeBudgets(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw mediatorError("MEDIATOR_BUDGET_INVALID", "Traversal budgets must be an object");
  if (Object.keys(input).some(key => !(key in HARD_BUDGETS))) throw mediatorError("MEDIATOR_BUDGET_INVALID", "Traversal budgets contain an unknown field");
  return Object.freeze(Object.fromEntries(Object.keys(HARD_BUDGETS).map(key => [ key, positiveInteger(input[key], DEFAULT_BUDGETS[key], HARD_BUDGETS[key], key) ])));
}

function normalizeUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw mediatorError("MEDIATOR_URL_INVALID", "Request URL must be an absolute HTTP or HTTPS IRI"); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw mediatorError("MEDIATOR_SCHEME_DENIED", "Anonymous Linked Data reads permit only HTTP and HTTPS IRIs");
  if (url.username || url.password) throw mediatorError("MEDIATOR_URL_CREDENTIALS_DENIED", "URL credentials are prohibited");
  return url;
}

function normalizeHeaders(input = {}) {
  const result = new Headers();
  for (const [ rawName, rawValue ] of Object.entries(input ?? {})) {
    const name = String(rawName).toLowerCase();
    if (IDENTITY_HEADERS.has(name)) continue;
    if (!SAFE_REQUEST_HEADERS.has(name)) continue;
    const value = String(rawValue);
    if (value.length > MAX_HEADER_VALUE_CHARS || /[\r\n]/u.test(value)) throw mediatorError("MEDIATOR_HEADER_INVALID", `Request header ${name} is malformed or exceeds the bound`);
    result.set(name, value);
  }
  if (!result.has("accept")) result.set("accept", DEFAULT_ACCEPT);
  result.set("accept-encoding", "identity");
  return result;
}

function resolveLinkIri(value, base) {
  try { return new URL(value, base).href; } catch { return undefined; }
}

function parseContentTypeProfiles(contentType) {
  if (!contentType) return [];
  const profiles = [];
  for (const match of String(contentType).matchAll(/(?:^|;)\s*profile\s*=\s*(?:"([^"]*)"|([^;\s]+))/giu)) {
    for (const value of String(match[1] ?? match[2] ?? "").trim().split(/\s+/u)) if (value && !profiles.includes(value)) profiles.push(value);
  }
  return profiles.slice(0, MAX_NAVIGATION_LINKS);
}

function parseProfileHeader(value) {
  return String(value ?? "").match(/<[^>]+>|"[^"]+"|[^,\s]+/gu)?.map(item => item.replace(/^<|>$/gu, "").replace(/^"|"$/gu, "")).filter(Boolean) ?? [];
}

function parseNavigation(headers, responseUrl, headersTruncated = false) {
  const links = [];
  const linkIndexes = new Map();
  let malformedLinkHeader = false;
  let truncated = headersTruncated;
  if (headers.link) {
    try {
      const parsed = httpLinkHeader.parse(headers.link);
      for (const ref of parsed.refs) {
        const target = resolveLinkIri(ref.uri, responseUrl);
        if (!target) continue;
        const parameters = {};
        for (const [ key, value ] of Object.entries(ref).filter(([ key ]) => ![ "uri", "rel" ].includes(key)).slice(0, MAX_LINK_PARAMETERS)) {
          parameters[key] = String(value).slice(0, 256);
        }
        const anchor = ref.anchor && resolveLinkIri(ref.anchor, responseUrl) ? resolveLinkIri(ref.anchor, responseUrl) : undefined;
        const key = JSON.stringify([ target, anchor, parameters ]);
        const relations = String(ref.rel ?? "").split(/\s+/u).filter(Boolean);
        if (linkIndexes.has(key)) {
          const existing = links[linkIndexes.get(key)];
          for (const relation of relations) if (!existing.relations.includes(relation)) existing.relations.push(relation);
        } else {
          linkIndexes.set(key, links.length);
          links.push({ target, relations, ...(anchor ? { anchor } : {}), ...(Object.keys(parameters).length ? { parameters } : {}) });
        }
      }
    } catch { malformedLinkHeader = true; }
  }
  const preferred = links.filter(link => link.relations.some(relation => NAVIGATION_RELATION_PRIORITY.has(relation)));
  const remaining = links.filter(link => !preferred.includes(link));
  const selectedPreferred = preferred.slice(0, MAX_NAVIGATION_LINKS);
  const selectedLinks = [ ...selectedPreferred, ...remaining.slice(0, MAX_NAVIGATION_LINKS - selectedPreferred.length) ];
  truncated = truncated || links.length > selectedLinks.length;
  const profileDeclarations = [];
  for (const [ mechanism, declared ] of [
    [ "content-type", parseContentTypeProfiles(headers["content-type"]) ],
    [ "content-profile", parseProfileHeader(headers["content-profile"]) ],
    [ "link", selectedLinks.filter(link => link.relations.includes("profile")).map(link => link.target) ],
  ]) for (const profile of declared) {
    const resolved = resolveLinkIri(profile, responseUrl) ?? profile;
    if (!profileDeclarations.some(item => item.profile === resolved && item.mechanism === mechanism)) profileDeclarations.push(Object.freeze({ profile: resolved, mechanism }));
  }
  return Object.freeze({
    kind: "linked-data-navigation-evidence",
    responseUrl,
    links: Object.freeze(selectedLinks.map(link => Object.freeze({ ...link, relations: Object.freeze(link.relations), ...(link.parameters ? { parameters: Object.freeze(link.parameters) } : {}) }))),
    profiles: Object.freeze([ ...new Set(profileDeclarations.map(item => item.profile)) ].slice(0, MAX_NAVIGATION_LINKS)),
    profileDeclarations: Object.freeze(profileDeclarations.slice(0, MAX_NAVIGATION_LINKS)),
    preferenceApplied: headers["preference-applied"],
    malformedLinkHeader,
    truncated,
    trust: "untrusted-candidate-evidence",
  });
}

function sanitizeResponseHeaders(headers) {
  const result = {};
  let truncated = false;
  for (const [ name, value ] of headers.entries()) if (SAFE_RESPONSE_HEADERS.has(name.toLowerCase())) {
    const bounded = String(value);
    if (bounded.length > MAX_HEADER_VALUE_CHARS) truncated = true;
    result[name.toLowerCase()] = bounded.slice(0, MAX_HEADER_VALUE_CHARS);
  }
  return Object.freeze({ headers: Object.freeze(result), truncated });
}

function parseReadQuery(body, maxQueryChars) {
  if (typeof body !== "string" || body.length < 1 || body.length > maxQueryChars) throw mediatorError("MEDIATOR_QUERY_LIMIT", "SPARQL query is missing or exceeds the traversal query bound");
  let parsed;
  try { parsed = new SparqlParser({ skipValidation: false }).parse(body); } catch { throw mediatorError("MEDIATOR_QUERY_INVALID", "SPARQL request body is malformed"); }
  if (parsed.type !== "query") throw mediatorError("MEDIATOR_MUTATION_DENIED", "SPARQL Update is prohibited");
  const queryType = String(parsed.queryType ?? "").toUpperCase();
  if (!READ_QUERY_TYPES.has(queryType)) throw mediatorError("MEDIATOR_QUERY_TYPE_DENIED", "Only SELECT, ASK, CONSTRUCT, and DESCRIBE are authorized");
  return Object.freeze({ type: queryType, sha256: sha256(body) });
}

function validateRequest(input, budgets) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw mediatorError("MEDIATOR_REQUEST_INVALID", "Request must be an object");
  const url = normalizeUrl(input.url);
  const method = String(input.method ?? "GET").toUpperCase();
  if (![ "GET", "HEAD", "POST" ].includes(method)) throw mediatorError("MEDIATOR_METHOD_DENIED", "Only GET, HEAD, and read-only SPARQL POST are authorized");
  const headers = normalizeHeaders(input.headers);
  const body = input.body === undefined ? "" : String(input.body);
  if (Buffer.byteLength(body) > budgets.maxRequestBodyBytes) throw mediatorError("MEDIATOR_REQUEST_BODY_LIMIT", "Request body exceeds the traversal bound");
  if ((method === "GET" || method === "HEAD") && body) throw mediatorError("MEDIATOR_REQUEST_BODY_DENIED", `${method} requests cannot carry an agent-supplied body`);
  let query;
  if (method === "POST") {
    const contentType = (headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
    if (contentType === "application/sparql-query") {
      query = parseReadQuery(body, budgets.maxQueryChars);
    } else if (contentType === "application/x-www-form-urlencoded") {
      const parameters = new URLSearchParams(body);
      if ([ ...parameters.keys() ].some(key => key !== "query") || parameters.getAll("query").length !== 1) {
        throw mediatorError("MEDIATOR_POST_DENIED", "Form POST is authorized only for one Communica-generated SPARQL query field");
      }
      query = parseReadQuery(parameters.get("query"), budgets.maxQueryChars);
    } else {
      throw mediatorError("MEDIATOR_POST_DENIED", "POST is authorized only for Communica-generated SPARQL query bodies");
    }
  }
  return Object.freeze({ url, method, headers, body, query });
}

async function readBoundedBody(response, perResponse, remaining, signal) {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      if (signal.aborted) throw signal.reason ?? mediatorError("MEDIATOR_ABORTED", "Traversal request was aborted");
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      size += chunk.length;
      if (size > perResponse) throw mediatorError("MEDIATOR_RESPONSE_LIMIT", "Response exceeds the per-response decoded-byte bound");
      if (size > remaining) throw mediatorError("MEDIATOR_TOTAL_BYTES_LIMIT", "Response exceeds the traversal cumulative decoded-byte bound");
      chunks.push(chunk);
    }
  } catch (error) {
    await reader.cancel(error).catch(() => {});
    if (!Number.isInteger(error.bytesRead)) error.bytesRead = size;
    throw error;
  }
  return Buffer.concat(chunks, size);
}

function responseFromBytes(bytes, response, headers) {
  const result = new Response(bytes, { status: response.status, statusText: response.statusText, headers });
  Object.defineProperties(result, {
    url: { value: response.url, enumerable: true },
    redirected: { value: Boolean(response.redirected), enumerable: true },
  });
  return result;
}

export class MediatedTraversalBroker {
  constructor({ fetchImpl = globalThis.fetch, now = () => new Date().toISOString() } = {}) {
    if (typeof fetchImpl !== "function") throw new TypeError("A standards-compatible Fetch implementation is required");
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.sessions = new Map();
  }

  capabilities() {
    return Object.freeze({
      kind: KIND,
      version: PROTOCOL_VERSION,
      authority: Object.freeze({
        class: AUTHORITY_CLASS,
        version: AUTHORITY_VERSION,
        anonymous: true,
        schemes: Object.freeze([ "http", "https" ]),
        methods: Object.freeze([ "GET", "HEAD", "SPARQL_POST" ]),
        queryTypes: Object.freeze([ ...READ_QUERY_TYPES ]),
        effects: Object.freeze([ "rdf-document-read", "sparql-read", "linked-data-dereference", "local-communica-federation" ]),
        prohibited: Object.freeze([ "ambient-identity", "url-credentials", "sparql-update", "arbitrary-post", "filesystem-write", "authority-expansion", "automatic-context-promotion" ]),
      }),
      transport: Object.freeze({ implementation: "standard-fetch", redirectEvidence: "requested-final-and-redirected-flag", dnsTls: "platform" }),
      retries: 0,
      hardBudgets: HARD_BUDGETS,
      defaultBudgets: DEFAULT_BUDGETS,
      receipts: Object.freeze({ exchange: EXCHANGE_KIND, aggregate: RECEIPT_KIND, navigation: "linked-data-navigation-evidence" }),
    });
  }

  beginTraversal(budgets = {}, owner = {}) {
    if (!owner.token || !Number.isInteger(owner.epoch)) throw mediatorError("MEDIATOR_OWNER_REQUIRED", "Traversal requires a kernel capability token and epoch");
    const id = `traversal-${randomBytes(12).toString("hex")}`;
    const startedAt = this.now();
    const effectiveBudgets = normalizeBudgets(budgets);
    const session = {
      id, owner: Object.freeze({ token: owner.token, epoch: owner.epoch }), budgets: effectiveBudgets,
      startedAt, deadline: Date.now() + effectiveBudgets.maxDurationMs, state: "active", active: 0,
      requests: 0, bytes: 0, origins: new Set(), controllers: new Set(), exchanges: [],
    };
    this.sessions.set(id, session);
    return Object.freeze({ traversalId: id, authority: this.capabilities().authority, effectiveBudgets: session.budgets, startedAt });
  }

  #session(id, owner) {
    const session = this.sessions.get(id);
    if (!session || session.state !== "active") throw mediatorError("MEDIATOR_TRAVERSAL_INVALID", "Traversal session is missing or closed");
    if (session.owner.token !== owner.token || session.owner.epoch !== owner.epoch) throw mediatorError("MEDIATOR_OWNER_DENIED", "Traversal belongs to another kernel capability or epoch");
    if (Date.now() >= session.deadline) {
      const receipt = this.abortTraversal({ traversalId: id, reason: "duration-limit" }, owner);
      throw mediatorError("MEDIATOR_DURATION_LIMIT", "Traversal duration bound is exhausted", receipt);
    }
    return session;
  }

  createFetch(traversalId, owner = {}) {
    return async (input, init = {}) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const body = request.method === "GET" || request.method === "HEAD" ? "" : await request.text();
      const result = await this.request({ traversalId, request: { url: request.url, method: request.method, headers: Object.fromEntries(request.headers), body } }, owner);
      return responseFromBytes(Buffer.from(result.bodyBase64, "base64"), result, result.headers);
    };
  }

  async request({ traversalId, request }, owner = {}) {
    const session = this.#session(traversalId, owner);
    const validated = validateRequest(request, session.budgets);
    if (session.requests >= session.budgets.maxRequests) throw mediatorError("MEDIATOR_REQUEST_LIMIT", "Traversal request bound is exhausted");
    if (session.active >= session.budgets.maxConcurrency) throw mediatorError("MEDIATOR_CONCURRENCY_LIMIT", "Traversal concurrency bound is exhausted");
    const origin = validated.url.origin;
    const nextOrigins = new Set(session.origins).add(origin);
    if (nextOrigins.size > session.budgets.maxFanOut) throw mediatorError("MEDIATOR_FANOUT_LIMIT", "Traversal distinct-source bound is exhausted");
    session.origins = nextOrigins;
    session.requests += 1;
    session.active += 1;
    const index = session.requests;
    const startedAt = this.now();
    const controller = new AbortController();
    session.controllers.add(controller);
    const remainingDuration = Math.max(1, session.deadline - Date.now());
    const timeout = Math.min(session.budgets.maxRequestMs, remainingDuration);
    const timer = setTimeout(() => controller.abort(mediatorError("MEDIATOR_REQUEST_TIMEOUT", "Request deadline elapsed")), timeout);
    const requestSha256 = sha256({ url: validated.url.href, method: validated.method, headers: Object.fromEntries(validated.headers), body: validated.body });
    try {
      const response = await this.fetchImpl(validated.url, {
        method: validated.method,
        headers: validated.headers,
        body: validated.method === "POST" ? validated.body : undefined,
        redirect: "follow",
        signal: controller.signal,
        credentials: "omit",
      });
      const sanitizedHeaders = sanitizeResponseHeaders(response.headers);
      const headers = sanitizedHeaders.headers;
      const bytes = await readBoundedBody(response, session.budgets.maxResponseBytes, session.budgets.maxTotalBytes - session.bytes, controller.signal);
      session.bytes += bytes.length;
      const finalUrl = response.url || validated.url.href;
      const finalOrigin = normalizeUrl(finalUrl).origin;
      const completedOrigins = new Set(session.origins).add(finalOrigin);
      if (completedOrigins.size > session.budgets.maxFanOut) throw mediatorError("MEDIATOR_FANOUT_LIMIT", "Redirected traversal destination exceeds the distinct-source bound");
      session.origins = completedOrigins;
      const navigation = parseNavigation(headers, finalUrl, sanitizedHeaders.truncated);
      const exchange = Object.freeze({
        kind: EXCHANGE_KIND, version: PROTOCOL_VERSION, index, status: response.ok ? "success" : "http-error",
        requestedUrl: validated.url.href, finalUrl, redirected: Boolean(response.redirected), method: validated.method,
        httpStatus: response.status, requestSha256, responseSha256: sha256(bytes), bytes: bytes.length,
        mediaType: String(headers["content-type"] ?? "").split(";", 1)[0].trim().toLowerCase(), headers,
        responseHeadersTruncated: sanitizedHeaders.truncated, navigation,
        queryType: validated.query?.type, querySha256: validated.query?.sha256, startedAt, finishedAt: this.now(), retries: 0,
      });
      session.exchanges.push(exchange);
      if (!response.ok) throw mediatorError("MEDIATOR_HTTP_ERROR", `Linked Data request failed with status ${response.status}`);
      return Object.freeze({ status: response.status, statusText: response.statusText, url: finalUrl, redirected: Boolean(response.redirected), headers, bodyBase64: bytes.toString("base64"), exchange });
    } catch (error) {
      const failedBytes = Number.isInteger(error.bytesRead) ? error.bytesRead : 0;
      if (failedBytes > 0) session.bytes += failedBytes;
      if (!session.exchanges.some(item => item.index === index)) {
        session.exchanges.push(Object.freeze({
          kind: EXCHANGE_KIND, version: PROTOCOL_VERSION, index, status: "failure", requestedUrl: validated.url.href,
          method: validated.method, requestSha256, queryType: validated.query?.type, querySha256: validated.query?.sha256,
          bytes: failedBytes, startedAt, finishedAt: this.now(), retries: 0,
          failure: Object.freeze({ code: error.code ?? (controller.signal.aborted ? "MEDIATOR_REQUEST_TIMEOUT" : "MEDIATOR_FETCH_FAILED") }),
        }));
      }
      let failure;
      if (error.code) failure = error;
      else if (controller.signal.aborted) failure = mediatorError("MEDIATOR_REQUEST_TIMEOUT", "Request deadline elapsed");
      else failure = mediatorError("MEDIATOR_FETCH_FAILED", "Standards Fetch failed before a response completed");
      if (!failure.receipt) failure.receipt = this.#receipt(session, "failed", failure.code);
      throw failure;
    } finally {
      clearTimeout(timer);
      session.controllers.delete(controller);
      session.active -= 1;
    }
  }

  #receipt(session, status, failureCode) {
    const timestamp = this.now();
    return Object.freeze({
      kind: RECEIPT_KIND, version: PROTOCOL_VERSION, authority: this.capabilities().authority, status,
      traversalId: session.id, startedAt: session.startedAt, ...(status === "active" ? { observedAt: timestamp } : { finishedAt: timestamp }), budgets: session.budgets,
      usage: Object.freeze({ requests: session.requests, fanOut: session.origins.size, bytes: session.bytes, retries: 0 }),
      exchanges: Object.freeze([ ...session.exchanges ]),
      redirectEvidence: "requested-final-and-redirected-flag",
      ...(failureCode ? { failure: Object.freeze({ code: failureCode }) } : {}),
    });
  }

  snapshotTraversal({ traversalId }, owner = {}) {
    const session = this.#session(traversalId, owner);
    return this.#receipt(session, "active");
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
    if (!session) return Object.freeze({ kind: RECEIPT_KIND, version: PROTOCOL_VERSION, status: "aborted", traversalId, missing: true });
    if (session.owner.token !== owner.token || session.owner.epoch !== owner.epoch) throw mediatorError("MEDIATOR_OWNER_DENIED", "Traversal belongs to another kernel capability or epoch");
    session.state = "aborted";
    for (const controller of session.controllers) controller.abort(mediatorError("MEDIATOR_ABORTED", "Traversal was aborted"));
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

export const MEDIATED_TRAVERSAL_KINDS = Object.freeze({ mediator: KIND, receipt: RECEIPT_KIND, exchange: EXCHANGE_KIND });
export const MEDIATED_TRAVERSAL_DEFAULTS = DEFAULT_BUDGETS;
