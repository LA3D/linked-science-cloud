import { createHash } from 'node:crypto';
import { TransformStream } from 'node:stream/web';
import { Parser as RdfParser } from 'n3';
import { Parser as SparqlParser } from 'sparqljs';

export const ENDPOINT_PROFILES = Object.freeze({
  identifiersOrg: Object.freeze({
    name: 'identifiers.org-registry',
    endpoint: 'https://sparql.api.identifiers.org/sparql',
    timeoutMs: 8_000,
    maxQueryChars: 4_096,
    maxResults: 10,
    maxResponseBytes: 1_000_000,
  }),
  identifiersOrgLiveTable: Object.freeze({
    name: 'identifiers.org-live-table-demo',
    endpoint: 'https://sparql.api.identifiers.org/sparql',
    timeoutMs: 8_000,
    maxQueryChars: 4_096,
    maxResults: 20,
    maxResponseBytes: 1_000_000,
    allowedQueryTypes: Object.freeze([ 'SELECT' ]),
  }),
  uniprotRead: Object.freeze({
    name: 'uniprot-read',
    endpoint: 'https://sparql.uniprot.org/sparql',
    timeoutMs: 8_000,
    maxQueryChars: 4_096,
    maxResults: 10,
    maxResponseBytes: 1_000_000,
  }),
  wikiPathwaysRead: Object.freeze({
    name: 'wikipathways-read',
    endpoint: 'https://sparql.wikipathways.org/sparql',
    timeoutMs: 12_000,
    maxQueryChars: 4_096,
    maxResults: 20,
    maxResponseBytes: 1_000_000,
  }),
  uniprotRheaWikidataFederation: Object.freeze({
    name: 'uniprot-rhea-wikidata-federation',
    endpoint: 'https://sparql.uniprot.org/sparql',
    allowedEndpoints: Object.freeze([
      'https://sparql.uniprot.org/sparql',
      'https://sparql.rhea-db.org/sparql',
      'https://query.wikidata.org/sparql',
    ]),
    timeoutMs: 8_000,
    maxQueryChars: 4_096,
    maxResults: 10,
    maxResponseBytes: 1_000_000,
    allowedQueryTypes: Object.freeze([ 'SELECT' ]),
    allowService: true,
  }),
});

const READ_QUERY_TYPES = new Set([ 'SELECT', 'ASK', 'CONSTRUCT', 'DESCRIBE' ]);

export function getEndpointProfile(name = 'identifiersOrg') {
  const profile = ENDPOINT_PROFILES[name];
  if (!profile) throw new Error(`Unknown SPARQL endpoint profile: ${name}`);
  return profile;
}

function collectServicePatterns(value, services = []) {
  if (!value || typeof value !== 'object') return services;
  if (Array.isArray(value)) {
    for (const item of value) collectServicePatterns(item, services);
    return services;
  }
  if (String(value.type ?? '').toLowerCase() === 'service') services.push(value);
  for (const child of Object.values(value)) collectServicePatterns(child, services);
  return services;
}

export function validateReadQuery(query, profile = getEndpointProfile()) {
  if (typeof query !== 'string' || query.length === 0 || query.length > profile.maxQueryChars) {
    throw new Error(`SPARQL query must be 1-${profile.maxQueryChars} characters`);
  }
  let parsed;
  try {
    parsed = new SparqlParser().parse(query);
  } catch (error) {
    throw new Error(`Malformed SPARQL query: ${error.message}`);
  }
  const allowedQueryTypes = profile.allowedQueryTypes ?? READ_QUERY_TYPES;
  if (parsed.type !== 'query' || !Array.from(allowedQueryTypes).includes(parsed.queryType)) {
    throw new Error('Only SELECT, ASK, CONSTRUCT, and DESCRIBE queries are permitted');
  }
  const services = collectServicePatterns(parsed);
  if (services.length > 0 && profile.allowService !== true) throw new Error('SERVICE clauses are not permitted');
  const allowedEndpoints = profile.allowedEndpoints ?? [ profile.endpoint ];
  for (const service of services) {
    if (service.silent === true) throw new Error('SERVICE SILENT is not permitted');
    if (service.name?.termType !== 'NamedNode' || !allowedEndpoints.includes(service.name.value)) {
      throw new Error('SERVICE target is not in the endpoint profile');
    }
  }
  if (parsed.queryType !== 'ASK' && (!Number.isInteger(parsed.limit) || parsed.limit < 1 || parsed.limit > profile.maxResults)) {
    throw new Error(`Read queries must include LIMIT 1-${profile.maxResults}`);
  }
  return Object.freeze({ queryType: parsed.queryType, limit: parsed.limit ?? 1, services: services.map(service => service.name.value) });
}

function exactEndpoint(url, profile) {
  const allowedEndpoints = profile.allowedEndpoints ?? [ profile.endpoint ];
  return allowedEndpoints.some(endpoint => {
    const expected = new URL(endpoint);
    return url.protocol === 'https:' && url.origin === expected.origin && url.pathname === expected.pathname &&
      url.username === '' && url.password === '' && url.hash === '';
  });
}

function requestQuery(url, init) {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (method === 'GET') {
    if (init.body != null || url.searchParams.getAll('query').length !== 1 || [...url.searchParams.keys()].some(key => key !== 'query')) {
      throw new Error('GET requires exactly one query parameter and no body');
    }
    return { method, query: url.searchParams.get('query'), headers };
  }
  if (method !== 'POST') throw new Error('Only GET and POST are permitted');
  const body = typeof init.body === 'string' ? init.body : init.body instanceof URLSearchParams ? init.body.toString() : null;
  if (body === null) throw new Error('POST requires a string or URLSearchParams body');
  const contentType = headers.get('content-type')?.split(';', 1)[0].toLowerCase();
  if (contentType === 'application/sparql-query') return { method, query: body, headers };
  if (contentType === 'application/x-www-form-urlencoded') {
    const form = new URLSearchParams(body);
    if (form.getAll('query').length !== 1 || [...form.keys()].some(key => key !== 'query')) throw new Error('POST form requires exactly one query field');
    return { method, query: form.get('query'), headers };
  }
  throw new Error('POST requires application/sparql-query or application/x-www-form-urlencoded');
}

function capResponseBody(response, maximumBytes) {
  if (!response.body) return response;
  let observedBytes = 0;
  const boundedBody = response.body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      observedBytes += chunk.byteLength;
      if (observedBytes > maximumBytes) {
        controller.error(new Error(`SPARQL response exceeds ${maximumBytes} bytes`));
        return;
      }
      controller.enqueue(chunk);
    },
  }));
  return new Response(boundedBody, { status: response.status, statusText: response.statusText, headers: response.headers });
}

export function createGuardedFetch({ profile = getEndpointProfile(), fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required');
  const provenance = [];
  const guardedFetch = async(input, init = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (!exactEndpoint(url, profile)) throw new Error(`Blocked endpoint: ${url.origin}${url.pathname}`);
    const request = requestQuery(url, init);
    const query = validateReadQuery(request.query, profile);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), profile.timeoutMs);
    const entry = {
      endpoint: `${url.origin}${url.pathname}`,
      at: new Date().toISOString(),
      method: request.method,
      queryType: query.queryType,
      queryLimit: query.limit,
      querySha256: createHash('sha256').update(request.query).digest('hex'),
      redirect: 'error',
      timeoutMs: profile.timeoutMs,
      responseByteLimit: profile.maxResponseBytes,
      retries: 0,
    };
    try {
      const headers = new Headers(request.headers);
      headers.set('accept', 'application/sparql-results+json, application/n-triples;q=0.8, text/turtle;q=0.7');
      const response = await fetchImpl(url, { ...init, method: request.method, headers, redirect: 'error', signal: controller.signal });
      provenance.push(Object.freeze({ ...entry, status: response.status, ok: response.ok }));
      return capResponseBody(response, profile.maxResponseBytes);
    } catch (error) {
      provenance.push(Object.freeze({ ...entry, error: `${error.name}: ${error.message}` }));
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
  return Object.freeze({
    fetch: guardedFetch,
    provenance: () => provenance.map(entry => ({ ...entry })),
  });
}

export function comunicaOptions({ profile = getEndpointProfile(), guard }) {
  if (!guard?.fetch) throw new Error('A guarded fetch is required');
  return {
    sources: [{ type: 'sparql', value: profile.endpoint }],
    fetch: guard.fetch,
    httpTimeout: profile.timeoutMs,
    httpBodyTimeout: true,
    httpRetryCount: 0,
    httpRetryBodyCount: 0,
    readOnly: true,
  };
}

export async function queryBindingsGuarded({ engine, query, profile = getEndpointProfile(), fetchImpl = globalThis.fetch }) {
  validateReadQuery(query, profile);
  const guard = createGuardedFetch({ profile, fetchImpl });
  const rows = await (await engine.queryBindings(query, comunicaOptions({ profile, guard }))).toArray();
  if (rows.length > profile.maxResults) throw new Error(`Endpoint returned more than ${profile.maxResults} bindings`);
  return Object.freeze({ rows, provenance: guard.provenance() });
}

function operationError(error, receipt) {
  const wrapped = new Error(`Guarded query-to-handle failed during ${receipt.stage}: ${error.message}`, { cause: error });
  wrapped.name = 'GuardedQueryToHandleError';
  wrapped.receipt = Object.freeze(receipt);
  return wrapped;
}

export async function queryToHandleGuarded({
  session,
  handle,
  query,
  profile = getEndpointProfile(),
  fetchImpl = globalThis.fetch,
  provenance = {},
} = {}) {
  const baseReceipt = {
    kind: 'guarded-query-to-handle',
    handle,
    profile: profile.name,
    endpoint: profile.endpoint,
    attempts: [],
  };

  let parsed;
  try {
    if (!session?.engine || typeof session.assertCanMaterializeResult !== 'function') {
      throw new Error('A compatible retained-result session is required');
    }
    session.assertCanMaterializeResult({ handle, maximumItems: profile.maxResults });
    parsed = validateReadQuery(query, profile);
    const requiredMethods = parsed.queryType === 'SELECT'
      ? ['queryBindings', 'materializeBindings']
      : parsed.queryType === 'ASK'
        ? ['queryBoolean', 'materializeBoolean']
        : ['queryQuads', 'materializeQuads'];
    if (requiredMethods.some(method => typeof (method.startsWith('query') ? session.engine[method] : session[method]) !== 'function')) {
      throw new Error(`Session does not support ${parsed.queryType} result retention`);
    }
  } catch (error) {
    throw operationError(error, { ...baseReceipt, status: 'failed', stage: 'preflight', error: `${error.name}: ${error.message}` });
  }

  const guard = createGuardedFetch({ profile, fetchImpl });
  let result;
  let resultKind;
  try {
    const options = comunicaOptions({ profile, guard });
    if (parsed.queryType === 'SELECT') {
      resultKind = 'bindings';
      result = await (await session.engine.queryBindings(query, options)).toArray();
    } else if (parsed.queryType === 'ASK') {
      resultKind = 'boolean';
      result = await session.engine.queryBoolean(query, options);
    } else if (parsed.queryType === 'CONSTRUCT') {
      resultKind = 'quads';
      result = await (await session.engine.queryQuads(query, options)).toArray();
    } else {
      resultKind = 'quads';
      const response = await guard.fetch(profile.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/sparql-query' },
        body: query,
      });
      if (!response.ok) throw new Error(`DESCRIBE request failed: HTTP ${response.status}`);
      const contentType = response.headers.get('content-type')?.split(';', 1)[0].toLowerCase() ?? '';
      const supportedTypes = new Set(['application/n-triples', 'application/n-quads', 'application/trig', 'text/turtle']);
      if (!supportedTypes.has(contentType)) throw new Error(`Unsupported DESCRIBE response content type: ${contentType || 'missing'}`);
      result = new RdfParser({ format: contentType }).parse(await response.text());
    }
    if (Array.isArray(result) && result.length > profile.maxResults) {
      throw new Error(`Endpoint returned more than ${profile.maxResults} ${resultKind}`);
    }
  } catch (error) {
    throw operationError(error, {
      ...baseReceipt,
      status: 'failed',
      stage: 'query',
      queryType: parsed.queryType,
      queryLimit: parsed.limit,
      attempts: guard.provenance(),
      error: `${error.name}: ${error.message}`,
    });
  }

  const attempts = guard.provenance();
  try {
    const retainedProvenance = { ...provenance, profile: profile.name, endpoint: profile.endpoint, transport: attempts };
    resultKind === 'bindings'
      ? session.materializeBindings({ handle, bindings: result, query, provenance: retainedProvenance })
      : resultKind === 'boolean'
        ? session.materializeBoolean({ handle, value: result, query, provenance: retainedProvenance })
        : session.materializeQuads({ handle, quads: result, query, provenance: retainedProvenance });
    // Atomic live operations return metadata only. Callers can explicitly page a
    // retained handle when they need bounded values; graph literals can be large.
    const retained = session.profile(handle, { sampleSize: 0 });
    const receipt = Object.freeze({
      ...baseReceipt,
      status: 'ready',
      stage: 'complete',
      queryType: parsed.queryType,
      queryLimit: parsed.limit,
      querySha256: createHash('sha256').update(query).digest('hex'),
      attempts,
      result: { kind: resultKind, count: retained.count, columns: retained.columns },
    });
    return Object.freeze({ handle: retained, receipt });
  } catch (error) {
    throw operationError(error, {
      ...baseReceipt,
      status: 'failed',
      stage: 'materialization',
      queryType: parsed.queryType,
      queryLimit: parsed.limit,
      querySha256: createHash('sha256').update(query).digest('hex'),
      attempts,
      result: { kind: resultKind, count: Array.isArray(result) ? result.length : 1 },
      error: `${error.name}: ${error.message}`,
    });
  }
}

export async function queryBindingsToHandleGuarded(options = {}) {
  const profile = options.profile ?? getEndpointProfile();
  const parsed = validateReadQuery(options.query, profile);
  if (parsed.queryType !== 'SELECT') {
    const error = new Error('Binding handles require a SELECT query');
    throw operationError(error, {
      kind: 'guarded-query-to-handle',
      handle: options.handle,
      profile: profile.name,
      endpoint: profile.endpoint,
      attempts: [],
      status: 'failed',
      stage: 'preflight',
      queryType: parsed.queryType,
      error: `${error.name}: ${error.message}`,
    });
  }
  return queryToHandleGuarded({ ...options, profile });
}
