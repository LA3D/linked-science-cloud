import { createHash } from 'node:crypto';
import { Parser } from 'sparqljs';

export const ENDPOINT_PROFILES = Object.freeze({
  identifiersOrg: Object.freeze({
    name: 'identifiers.org-registry',
    endpoint: 'https://sparql.api.identifiers.org/sparql',
    timeoutMs: 8_000,
    maxQueryChars: 4_096,
    maxResults: 10,
  }),
  identifiersOrgLiveTable: Object.freeze({
    name: 'identifiers.org-live-table-demo',
    endpoint: 'https://sparql.api.identifiers.org/sparql',
    timeoutMs: 8_000,
    maxQueryChars: 4_096,
    maxResults: 20,
    allowedQueryTypes: Object.freeze([ 'SELECT' ]),
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
    parsed = new Parser().parse(query);
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
      retries: 0,
    };
    try {
      const headers = new Headers(request.headers);
      headers.set('accept', 'application/sparql-results+json, application/n-triples;q=0.8, text/turtle;q=0.7');
      const response = await fetchImpl(url, { ...init, method: request.method, headers, redirect: 'error', signal: controller.signal });
      provenance.push(Object.freeze({ ...entry, status: response.status, ok: response.ok }));
      return response;
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
