import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const BROKER_KIND = "linked-science-network-broker";
const OPERATION_KIND = "linked-science-broker-operation";
const READ_QUERY_TYPES = new Set(["SELECT", "ASK"]);
const MAX_PROFILE_COUNT = 32;

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (plainObject(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(stable(value)))
    .digest("hex");
}

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freezeDeep(child);
  }
  return value;
}

function brokerError(code, message) {
  return Object.assign(new Error(message), { code });
}

function transportError(error, controller, operation) {
  if (controller.signal.aborted) return brokerError("BROKER_TIMEOUT", `${operation} exceeded its immutable timeout`);
  if (typeof error?.code === "string" && error.code.startsWith("BROKER_")) return error;
  return brokerError("BROKER_TRANSPORT_ERROR", `${operation} transport failed`);
}

function exactKeys(value, allowed) {
  return Object.keys(value).every((key) => allowed.has(key));
}

function positiveInteger(value, maximum, label) {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw brokerError("INVALID_BROKER_PROFILE", `${label} must be an integer from 1 to ${maximum}`);
  }
  return value;
}

function exactHttps(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) {
    throw brokerError("INVALID_BROKER_PROFILE", `${label} must be a bounded HTTPS URL`);
  }
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw brokerError("INVALID_BROKER_PROFILE", `${label} must be an exact HTTPS URL without credentials or a fragment`);
  }
  return url.href;
}

function normalizeProfile(input) {
  if (!plainObject(input) || !exactKeys(input, new Set([
    "id", "operation", "endpoint", "sources", "accept", "allowedContentTypes", "allowedQueryTypes",
    "timeoutMs", "maxBytes", "maxItems", "maxTransports", "maxQueryChars", "allowService",
  ]))) {
    throw brokerError("INVALID_BROKER_PROFILE", "Broker profiles contain only reviewed transport fields");
  }
  if (typeof input.id !== "string" || !/^[a-z][a-zA-Z0-9.-]{1,127}$/.test(input.id)) {
    throw brokerError("INVALID_BROKER_PROFILE", "Broker profile id is invalid");
  }
  if (!["acquire", "query"].includes(input.operation)) throw brokerError("INVALID_BROKER_PROFILE", "Broker profile operation is invalid");
  const profile = {
    id: input.id,
    operation: input.operation,
    timeoutMs: positiveInteger(input.timeoutMs, 30_000, "timeoutMs"),
    maxBytes: positiveInteger(input.maxBytes, 10_000_000, "maxBytes"),
    maxItems: positiveInteger(input.maxItems, 5_000, "maxItems"),
    maxTransports: positiveInteger(input.maxTransports, 3, "maxTransports"),
  };
  if (profile.maxTransports !== 1) throw brokerError("INVALID_BROKER_PROFILE", "Current broker profiles must use exactly one transport attempt");
  if (input.operation === "acquire") {
    if (!Array.isArray(input.sources) || input.sources.length < 1 || input.sources.length > 8) {
      throw brokerError("INVALID_BROKER_PROFILE", "Acquisition profiles require 1-8 exact sources");
    }
    profile.sources = input.sources.map((source, index) => exactHttps(source, `sources[${index}]`));
    profile.accept = typeof input.accept === "string" && input.accept.length <= 512 ? input.accept : "*/*";
    if (!Array.isArray(input.allowedContentTypes) || input.allowedContentTypes.length < 1 ||
      input.allowedContentTypes.some((value) => typeof value !== "string" || value.length > 128)) {
      throw brokerError("INVALID_BROKER_PROFILE", "Acquisition profiles require allowed content types");
    }
    profile.allowedContentTypes = [...new Set(input.allowedContentTypes.map((value) => value.toLowerCase()))];
  } else {
    profile.endpoint = exactHttps(input.endpoint, "endpoint");
    profile.maxQueryChars = positiveInteger(input.maxQueryChars, 100_000, "maxQueryChars");
    const queryTypes = input.allowedQueryTypes ?? ["SELECT", "ASK"];
    if (!Array.isArray(queryTypes) || queryTypes.length < 1 || queryTypes.some((value) => !READ_QUERY_TYPES.has(value))) {
      throw brokerError("INVALID_BROKER_PROFILE", "Only SELECT and ASK are supported by the dependency-free broker result codec");
    }
    profile.allowedQueryTypes = [...new Set(queryTypes)];
    profile.allowService = input.allowService === true;
  }
  return freezeDeep(profile);
}

function publicProfile(profile) {
  const limits = {
    maxBytes: profile.maxBytes,
    maxItems: profile.maxItems,
    maxTransports: profile.maxTransports,
  };
  if (profile.operation === "query") limits.maxQueryChars = profile.maxQueryChars;
  return freezeDeep({ id: profile.id, operation: profile.operation, sha256: sha256(profile), limits });
}

function collectServices(value, output = []) {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    for (const item of value) collectServices(item, output);
    return output;
  }
  if (String(value.type ?? "").toLowerCase() === "service") output.push(value);
  for (const child of Object.values(value)) collectServices(child, output);
  return output;
}

function termDescriptor(binding) {
  if (!plainObject(binding) || typeof binding.type !== "string" || typeof binding.value !== "string") {
    throw brokerError("INVALID_SPARQL_RESPONSE", "SPARQL binding term is invalid");
  }
  if (binding.type === "uri") return { termType: "NamedNode", value: binding.value };
  if (binding.type === "bnode") return { termType: "BlankNode", value: binding.value };
  if (binding.type === "literal" || binding.type === "typed-literal") {
    return {
      termType: "Literal",
      value: binding.value,
      language: binding["xml:lang"] ?? "",
      datatype: binding.datatype ?? "http://www.w3.org/2001/XMLSchema#string",
    };
  }
  throw brokerError("INVALID_SPARQL_RESPONSE", `Unsupported SPARQL binding type: ${binding.type}`);
}

async function readBounded(response, maximumBytes) {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw brokerError("BROKER_RESPONSE_LIMIT", `Response exceeds ${maximumBytes} bytes`);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

function parseSparqlJson(bytes, parsed, profile) {
  let body;
  try {
    body = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw brokerError("INVALID_SPARQL_RESPONSE", "SPARQL response is not valid JSON");
  }
  if (parsed.queryType === "ASK") {
    if (typeof body.boolean !== "boolean") throw brokerError("INVALID_SPARQL_RESPONSE", "ASK response lacks a boolean");
    return { kind: "boolean", value: body.boolean };
  }
  if (!plainObject(body.results) || !Array.isArray(body.results.bindings)) {
    throw brokerError("INVALID_SPARQL_RESPONSE", "SELECT response lacks bindings");
  }
  if (body.results.bindings.length > profile.maxItems) {
    throw brokerError("BROKER_RESULT_LIMIT", `SELECT response exceeds ${profile.maxItems} rows`);
  }
  return {
    kind: "bindings",
    rows: body.results.bindings.map((row) => Object.fromEntries(
      Object.entries(row).map(([variable, binding]) => [variable, termDescriptor(binding)]),
    )),
  };
}

export function createDefaultLinkedScienceProfiles() {
  return Object.freeze([
    Object.freeze({
      id: "uniprot-void-description",
      operation: "acquire",
      sources: Object.freeze(["https://sparql.uniprot.org/uniprot"]),
      accept: "text/html",
      allowedContentTypes: Object.freeze(["text/html"]),
      timeoutMs: 8_000,
      maxBytes: 2_000_000,
      maxItems: 1,
      maxTransports: 1,
    }),
    Object.freeze({
      id: "go-orientation",
      operation: "acquire",
      sources: Object.freeze(["https://geneontology.org/docs/ontology-documentation/"]),
      accept: "text/html",
      allowedContentTypes: Object.freeze(["text/html"]),
      timeoutMs: 8_000,
      maxBytes: 2_000_000,
      maxItems: 1,
      maxTransports: 1,
    }),
    Object.freeze({
      id: "uniprot-read",
      operation: "query",
      endpoint: "https://sparql.uniprot.org/sparql",
      allowedQueryTypes: Object.freeze(["SELECT", "ASK"]),
      allowService: false,
      timeoutMs: 8_000,
      maxBytes: 1_000_000,
      maxItems: 10,
      maxTransports: 1,
      maxQueryChars: 4_096,
    }),
  ]);
}

export class LinkedScienceNetworkBroker {
  #profiles;
  #fetchImpl;
  #moduleRoot;
  #parseQuery;
  #clock;
  #sequence;

  constructor({
    profiles = createDefaultLinkedScienceProfiles(),
    fetchImpl = globalThis.fetch,
    moduleRoot = process.cwd(),
    parseQuery,
    clock = () => new Date().toISOString(),
  } = {}) {
    if (!Array.isArray(profiles) || profiles.length > MAX_PROFILE_COUNT) throw brokerError("INVALID_BROKER_PROFILE", "Invalid broker profile list");
    if (typeof fetchImpl !== "function") throw brokerError("BROKER_FETCH_REQUIRED", "A broker-owned fetch implementation is required");
    this.#profiles = new Map();
    for (const input of profiles) {
      const profile = normalizeProfile(input);
      if (this.#profiles.has(profile.id)) throw brokerError("INVALID_BROKER_PROFILE", `Duplicate broker profile: ${profile.id}`);
      this.#profiles.set(profile.id, profile);
    }
    this.#fetchImpl = fetchImpl;
    this.#moduleRoot = resolve(moduleRoot);
    this.#parseQuery = parseQuery;
    this.#clock = clock;
    this.#sequence = 0;
  }

  capabilities() {
    return freezeDeep({
      kind: BROKER_KIND,
      version: "1.0.0",
      profiles: [...this.#profiles.values()].map(publicProfile),
    });
  }

  _profile(id, operation) {
    if (typeof id !== "string") throw brokerError("BROKER_PROFILE_DENIED", "profile must be an immutable broker profile ID");
    const profile = this.#profiles.get(id);
    if (!profile || profile.operation !== operation) throw brokerError("BROKER_PROFILE_DENIED", `Profile is unavailable for ${operation}: ${id}`);
    return profile;
  }

  _parser() {
    if (this.#parseQuery) return this.#parseQuery;
    let Parser;
    try {
      ({ Parser } = createRequire(resolve(this.#moduleRoot, "package.json"))("sparqljs"));
    } catch {
      throw brokerError("BROKER_QUERY_PARSER_UNAVAILABLE", "The broker could not resolve the approved SPARQL parser from the worker project");
    }
    this.#parseQuery = (query) => new Parser().parse(query);
    return this.#parseQuery;
  }

  _receipt({ operation, profile, inputSha256, payloadSha256, source, attempts }) {
    return freezeDeep({
      kind: OPERATION_KIND,
      status: "ready",
      operation,
      operationId: `lsb-${String(++this.#sequence).padStart(6, "0")}`,
      profile: profile.id,
      profileSha256: sha256(profile),
      inputSha256,
      payloadSha256,
      source,
      attempts,
    });
  }

  async acquire(options = {}) {
    if (!plainObject(options) || !exactKeys(options, new Set(["profile", "source"]))) {
      throw brokerError("BROKER_ARGUMENT_DENIED", "Acquisition accepts only profile and exact source");
    }
    const profile = this._profile(options.profile, "acquire");
    const source = options.source ?? (profile.sources.length === 1 ? profile.sources[0] : undefined);
    let normalizedSource;
    try {
      normalizedSource = typeof source === "string" ? new URL(source).href : undefined;
    } catch {
      normalizedSource = undefined;
    }
    if (!normalizedSource || !profile.sources.includes(normalizedSource)) {
      throw brokerError("BROKER_SOURCE_DENIED", "Source is outside the immutable acquisition profile");
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), profile.timeoutMs);
    const attempt = {
      source: normalizedSource,
      at: this.#clock(),
      method: "GET",
      redirect: "error",
      timeoutMs: profile.timeoutMs,
      responseByteLimit: profile.maxBytes,
      retries: 0,
    };
    try {
      const response = await this.#fetchImpl(normalizedSource, {
        method: "GET",
        headers: { accept: profile.accept },
        redirect: "error",
        signal: controller.signal,
      });
      const contentType = response.headers.get("content-type")?.split(";", 1)[0].toLowerCase() ?? "";
      if (!response.ok) throw brokerError("BROKER_HTTP_ERROR", `Acquisition failed with HTTP ${response.status}`);
      if (!profile.allowedContentTypes.includes(contentType)) throw brokerError("BROKER_CONTENT_TYPE_DENIED", `Content type is not approved: ${contentType || "missing"}`);
      const bytes = await readBounded(response, profile.maxBytes);
      const content = bytes.toString("utf8");
      const payloadSha256 = sha256(content);
      const attempts = [freezeDeep({ ...attempt, status: response.status, ok: true, contentType, byteLength: bytes.length })];
      return freezeDeep({
        content,
        receipt: this._receipt({
          operation: "acquire",
          profile,
          inputSha256: sha256({ profile: profile.id, source: options.source }),
          payloadSha256,
          source: normalizedSource,
          attempts,
        }),
      });
    } catch (error) {
      throw transportError(error, controller, "Acquisition");
    } finally {
      clearTimeout(timer);
    }
  }

  async query(options = {}) {
    if (!plainObject(options) || !exactKeys(options, new Set(["profile", "sparql"]))) {
      throw brokerError("BROKER_ARGUMENT_DENIED", "Query accepts only profile and SPARQL");
    }
    const profile = this._profile(options.profile, "query");
    const query = options.sparql;
    if (typeof query !== "string" || query.length < 1 || query.length > profile.maxQueryChars) {
      throw brokerError("BROKER_QUERY_DENIED", `SPARQL must be 1-${profile.maxQueryChars} characters`);
    }
    let parsed;
    try {
      parsed = this._parser()(query);
    } catch (error) {
      if (error?.code === "BROKER_QUERY_PARSER_UNAVAILABLE") throw error;
      throw brokerError("BROKER_QUERY_DENIED", `Malformed SPARQL: ${error.message}`);
    }
    if (parsed?.type !== "query" || !profile.allowedQueryTypes.includes(parsed.queryType)) {
      throw brokerError("BROKER_QUERY_DENIED", "Query operation is outside the immutable profile");
    }
    const services = collectServices(parsed);
    if (services.length > 0 && profile.allowService !== true) throw brokerError("BROKER_QUERY_DENIED", "SERVICE is not permitted");
    if (parsed.queryType !== "ASK" && (!Number.isInteger(parsed.limit) || parsed.limit < 1 || parsed.limit > profile.maxItems)) {
      throw brokerError("BROKER_QUERY_DENIED", `SELECT requires LIMIT 1-${profile.maxItems}`);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), profile.timeoutMs);
    const attempt = {
      endpoint: profile.endpoint,
      at: this.#clock(),
      method: "POST",
      queryType: parsed.queryType,
      queryLimit: parsed.limit ?? 1,
      querySha256: sha256(query),
      redirect: "error",
      timeoutMs: profile.timeoutMs,
      responseByteLimit: profile.maxBytes,
      retries: 0,
    };
    try {
      const response = await this.#fetchImpl(profile.endpoint, {
        method: "POST",
        headers: {
          accept: "application/sparql-results+json",
          "content-type": "application/sparql-query",
        },
        body: query,
        redirect: "error",
        signal: controller.signal,
      });
      if (!response.ok) throw brokerError("BROKER_HTTP_ERROR", `SPARQL request failed with HTTP ${response.status}`);
      const contentType = response.headers.get("content-type")?.split(";", 1)[0].toLowerCase() ?? "";
      if (contentType !== "application/sparql-results+json" && contentType !== "application/json") {
        throw brokerError("BROKER_CONTENT_TYPE_DENIED", `SPARQL content type is not approved: ${contentType || "missing"}`);
      }
      const bytes = await readBounded(response, profile.maxBytes);
      const result = parseSparqlJson(bytes, parsed, profile);
      const payloadSha256 = sha256(result);
      const attempts = [freezeDeep({ ...attempt, status: response.status, ok: true, contentType, byteLength: bytes.length })];
      return freezeDeep({
        result,
        receipt: this._receipt({
          operation: "query",
          profile,
          inputSha256: sha256(query),
          payloadSha256,
          source: profile.endpoint,
          attempts,
        }),
      });
    } catch (error) {
      throw transportError(error, controller, "SPARQL query");
    } finally {
      clearTimeout(timer);
    }
  }
}

export const LINKED_SCIENCE_BROKER_KINDS = Object.freeze({ broker: BROKER_KIND, operation: OPERATION_KIND });
