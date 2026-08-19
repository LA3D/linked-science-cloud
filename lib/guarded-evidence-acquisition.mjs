import { createHash } from 'node:crypto';

const TEXT_FORMATS = new Set(['html', 'json', 'rdfxml', 'text', 'turtle']);

function exactSource(source, profile) {
  const url = new URL(source);
  return profile.sources.some(candidate => {
    const expected = new URL(candidate);
    return url.protocol === 'https:' && url.origin === expected.origin && url.pathname === expected.pathname &&
      url.search === expected.search && url.hash === '' && url.username === '' && url.password === '';
  });
}

export function detectEvidenceFormat(bytes, declaredContentType = '') {
  const text = Buffer.from(bytes).toString('utf8');
  const head = text.slice(0, 2_048).trimStart();
  if (/^(?:@prefix|@base|prefix|base)\b/iu.test(head)) return 'turtle';
  if (/^<\?xml\b/iu.test(head) || /^<rdf:RDF\b/iu.test(head)) return 'rdfxml';
  if (/^<!doctype\s+html\b/iu.test(head) || /^<html\b/iu.test(head)) return 'html';
  if (/^[{[]/u.test(head)) {
    try { JSON.parse(text); return 'json'; } catch { /* fall through */ }
  }
  const declared = declaredContentType.split(';', 1)[0].trim().toLowerCase();
  if (declared === 'text/turtle' || declared === 'application/n-triples' || declared === 'application/n-quads') return 'turtle';
  if (declared === 'application/rdf+xml' || declared === 'application/owl+xml') return 'rdfxml';
  if (declared === 'text/html') return 'html';
  if (declared === 'application/json' || declared.endsWith('+json')) return 'json';
  return 'text';
}

function acquisitionError(error, receipt) {
  const wrapped = new Error(`Guarded evidence acquisition failed during ${receipt.stage}: ${error.message}`, { cause: error });
  wrapped.name = 'GuardedEvidenceAcquisitionError';
  wrapped.receipt = Object.freeze(receipt);
  return wrapped;
}

async function readBounded(response, maxBytes) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error(`Evidence response exceeds ${maxBytes} bytes`);
  if (!response.body?.getReader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maxBytes) throw new Error(`Evidence response exceeds ${maxBytes} bytes`);
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel('evidence byte ceiling exceeded');
        throw new Error(`Evidence response exceeds ${maxBytes} bytes`);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, length);
}

export async function acquireEvidenceToHandleGuarded({
  session,
  handle,
  source,
  profile,
  fetchImpl = globalThis.fetch,
  provenance = {},
} = {}) {
  const baseReceipt = { kind: 'guarded-evidence-acquisition', handle, profile: profile?.name, source, method: 'GET' };
  try {
    if (!session?.materializeEvidence || !session?.materializeAttempt || typeof fetchImpl !== 'function') {
      throw new Error('A compatible retained-evidence session and fetch implementation are required');
    }
    session.assertCanMaterializeResult({ handle, maximumItems: 1 });
    if (!profile || !Array.isArray(profile.sources) || !exactSource(source, profile)) throw new Error('Source is not in the evidence profile');
    if (!Number.isInteger(profile.timeoutMs) || profile.timeoutMs < 1 || !Number.isInteger(profile.maxBytes) || profile.maxBytes < 1) {
      throw new Error('Evidence profile requires positive timeoutMs and maxBytes');
    }
    if (!Array.isArray(profile.allowedFormats) || profile.allowedFormats.some(format => !TEXT_FORMATS.has(format))) {
      throw new Error('Evidence profile requires known allowedFormats');
    }
  } catch (error) {
    throw acquisitionError(error, { ...baseReceipt, status: 'failed', stage: 'preflight', error: `${error.name}: ${error.message}` });
  }

  const url = new URL(source);
  const startedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), profile.timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { accept: profile.accept ?? '*/*' },
      redirect: 'error',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Evidence request failed: HTTP ${response.status}`);
    const bytes = await readBounded(response, profile.maxBytes);
    const declaredContentType = response.headers.get('content-type')?.split(';', 1)[0].toLowerCase() ?? '';
    const detectedFormat = detectEvidenceFormat(bytes, declaredContentType);
    if (!profile.allowedFormats.includes(detectedFormat)) throw new Error(`Detected evidence format is not permitted: ${detectedFormat}`);
    const receipt = Object.freeze({
      ...baseReceipt,
      status: 'retrieved',
      stage: 'complete',
      at: startedAt,
      httpStatus: response.status,
      declaredContentType,
      detectedFormat,
      metadataMismatch: declaredContentType !== '' &&
        ((declaredContentType === 'application/rdf+xml' && detectedFormat !== 'rdfxml') ||
          (declaredContentType === 'text/turtle' && detectedFormat !== 'turtle') ||
          (declaredContentType === 'text/html' && detectedFormat !== 'html')),
      byteLength: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      redirect: 'error',
      timeoutMs: profile.timeoutMs,
      retries: 0,
    });
    const retained = session.materializeEvidence({
      handle,
      content: bytes.toString('utf8'),
      receipt,
      provenance: { ...provenance, profile: profile.name, source },
    });
    return Object.freeze({ handle: retained, receipt });
  } catch (error) {
    const receipt = Object.freeze({
      ...baseReceipt,
      status: 'failed',
      stage: 'acquisition',
      at: startedAt,
      redirect: 'error',
      timeoutMs: profile.timeoutMs,
      retries: 0,
      error: `${error.name}: ${error.message}`,
    });
    session.materializeAttempt({ handle, action: 'acquire-source', status: 'failed', reason: receipt.error, provenance: { ...provenance, receipt } });
    throw acquisitionError(error, receipt);
  } finally {
    clearTimeout(timer);
  }
}
