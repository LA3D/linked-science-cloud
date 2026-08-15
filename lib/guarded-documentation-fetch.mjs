import { createHash } from 'node:crypto';

export const DOCUMENTATION_PROFILES = Object.freeze({
  uniprotRdfSchema: Object.freeze({
    name: 'uniprot-rdf-schema',
    sources: Object.freeze([ 'https://purl.uniprot.org/html/index-en.html' ]),
    timeoutMs: 8_000,
    maxBytes: 2_000_000,
    allowedContentTypes: Object.freeze([ 'text/html' ]),
  }),
});

export function getDocumentationProfile(name = 'uniprotRdfSchema') {
  const profile = DOCUMENTATION_PROFILES[name];
  if (!profile) throw new Error(`Unknown documentation profile: ${name}`);
  return profile;
}

function exactSource(url, profile) {
  return profile.sources.some(source => {
    const expected = new URL(source);
    return url.protocol === 'https:' && url.origin === expected.origin && url.pathname === expected.pathname &&
      url.search === '' && url.hash === '' && url.username === '' && url.password === '';
  });
}

export function createGuardedDocumentationFetch({ profile = getDocumentationProfile(), fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required');
  const provenance = [];
  const fetchDocument = async(source) => {
    const url = new URL(source);
    if (!exactSource(url, profile)) throw new Error(`Blocked documentation source: ${url.origin}${url.pathname}`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), profile.timeoutMs);
    const entry = { source: `${url.origin}${url.pathname}`, at: new Date().toISOString(), method: 'GET', redirect: 'error', timeoutMs: profile.timeoutMs };
    try {
      const response = await fetchImpl(url, { method: 'GET', headers: { accept: 'text/html' }, redirect: 'error', signal: controller.signal });
      const contentType = response.headers.get('content-type')?.split(';', 1)[0].toLowerCase() ?? '';
      if (!response.ok) throw new Error(`Documentation request failed: HTTP ${response.status}`);
      if (!profile.allowedContentTypes.includes(contentType)) throw new Error(`Unsupported documentation content type: ${contentType || 'missing'}`);
      const bytes = Buffer.from(await response.clone().arrayBuffer());
      if (bytes.length > profile.maxBytes) throw new Error(`Documentation response exceeds ${profile.maxBytes} bytes`);
      provenance.push(Object.freeze({ ...entry, status: response.status, ok: response.ok, contentType, byteLength: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }));
      return response;
    } catch (error) {
      provenance.push(Object.freeze({ ...entry, error: `${error.name}: ${error.message}` }));
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
  return Object.freeze({ fetchDocument, provenance: () => provenance.map(entry => ({ ...entry })) });
}
