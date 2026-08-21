import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, readdir, readFile, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const WORKER_FORMAT = 'linked-science-competency-worker/v2';
const EVALUATOR_FORMAT = 'linked-science-competency-evaluator/v1';
const EXPORT_POLICY_FORMAT = 'linked-science-worker-export-policy/v1';
const CASE_ID = /^uq-[a-f0-9]{12}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const PRIVATE_KEYS = new Set([
  'officialExampleId',
  'officialLocator',
  'officialQuery',
  'querySha256',
  'expectedAnswer',
  'expectedAnswers',
  'expectedBindings',
  'semanticInvariants',
  'leakageMarkers',
]);
const RUBRIC_DIMENSIONS = Object.freeze(Array.from({ length: 10 }, (_, index) => index + 1));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [ key, stable(value[key]) ]));
  }
  return value;
}

function digest(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(stable(value))).digest('hex');
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value;
}

function requireString(value, label, { minimum = 1, maximum = 8_192, pattern } = {}) {
  if (typeof value !== 'string' || value.length < minimum || value.length > maximum || (pattern && !pattern.test(value))) {
    throw new Error(`${label} must be a valid non-empty string`);
  }
  return value;
}

function requireInteger(value, label, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

function requireArray(value, label, { minimum = 0 } = {}) {
  if (!Array.isArray(value) || value.length < minimum) throw new Error(`${label} must be an array with at least ${minimum} item(s)`);
  return value;
}

function requireHttps(value, label) {
  requireString(value, label, { maximum: 2_048 });
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) throw new Error(`${label} must be an exact HTTPS URL without credentials or a fragment`);
  return value;
}

function findPrivateKeys(value, path = '$', findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findPrivateKeys(item, `${path}[${index}]`, findings));
    return findings;
  }
  if (!value || typeof value !== 'object') return findings;
  for (const [ key, child ] of Object.entries(value)) {
    if (PRIVATE_KEYS.has(key)) findings.push(`${path}.${key}`);
    findPrivateKeys(child, `${path}.${key}`, findings);
  }
  return findings;
}

function validateBounds(bounds, label) {
  requireObject(bounds, label);
  const ceilings = {
    maxRequests: 32,
    maxFanOut: 16,
    maxConcurrency: 6,
    maxRows: 10,
    maxCells: 100,
    maxResponseBytes: 4_000_000,
    maxTotalBytes: 20_000_000,
    maxDurationMs: 120_000,
    maxResultItems: 5_000,
    maxQueryChars: 16_384,
  };
  for (const [ key, maximum ] of Object.entries(ceilings)) requireInteger(bounds[key], `${label}.${key}`, { minimum: 1, maximum });
}

function validateWorkerCase(item, index) {
  const label = `cases[${index}]`;
  requireObject(item, label);
  requireString(item.id, `${label}.id`, { pattern: CASE_ID });
  requireInteger(item.tier, `${label}.tier`, { minimum: 0, maximum: 5 });
  requireString(item.question, `${label}.question`, { maximum: 1_000 });
  requireArray(item.resources, `${label}.resources`, { minimum: 1 });
  for (const [ resourceIndex, resource ] of item.resources.entries()) {
    const resourceLabel = `${label}.resources[${resourceIndex}]`;
    requireObject(resource, resourceLabel);
    requireString(resource.role, `${resourceLabel}.role`, { maximum: 120 });
    if (resource.access !== 'mediated-anonymous-linked-data-read') throw new Error(`${resourceLabel}.access must use mediated anonymous Linked Data read traversal`);
    if (resource.authorizationRequired !== true) throw new Error(`${resourceLabel}.authorizationRequired must be true`);
  }
  validateBounds(item.bounds, `${label}.bounds`);
  if (item.secondTurn !== 'question-neutral-retained-handle-reuse') {
    throw new Error(`${label}.secondTurn must use the question-neutral retained-handle challenge`);
  }
}

export function validateWorkerManifest(input, { requireDispatchable = false } = {}) {
  const manifest = clone(requireObject(input, 'worker manifest'));
  if (manifest.format !== WORKER_FORMAT) throw new Error(`worker manifest format must be ${WORKER_FORMAT}`);
  if (!['draft', 'ready'].includes(manifest.status)) throw new Error('worker manifest status must be draft or ready');
  requireString(manifest.version, 'version', { maximum: 64 });
  requireString(manifest.corpusSnapshotDigest, 'corpusSnapshotDigest', { pattern: manifest.status === 'ready' ? SHA256 : /^(?:pending|[a-f0-9]{64})$/u });
  requireString(manifest.accessDate, 'accessDate', { pattern: /^\d{4}-\d{2}-\d{2}$/u });
  requireArray(manifest.cases, 'cases', { minimum: 1 });
  manifest.cases.forEach(validateWorkerCase);
  const ids = manifest.cases.map(item => item.id);
  if (new Set(ids).size !== ids.length) throw new Error('worker case IDs must be unique');
  const leakedKeys = findPrivateKeys(manifest);
  if (leakedKeys.length > 0) throw new Error(`worker manifest contains evaluator-private fields: ${leakedKeys.join(', ')}`);
  if (requireDispatchable && manifest.status !== 'ready') throw new Error('worker manifest is not dispatchable until the evaluator snapshot and exact questions are frozen');
  if (requireDispatchable && manifest.cases.some(item => item.resources.some(resource => resource.authorizationRequired !== true))) {
    throw new Error('dispatchable worker cases must retain explicit traversal approval gates');
  }
  return Object.freeze(manifest);
}

function validateRubricApplicability(value, label) {
  requireArray(value, label, { minimum: RUBRIC_DIMENSIONS.length });
  const dimensions = value.map((entry, index) => {
    requireObject(entry, `${label}[${index}]`);
    requireInteger(entry.dimension, `${label}[${index}].dimension`, { minimum: 1, maximum: 10 });
    if (typeof entry.applicable !== 'boolean') throw new Error(`${label}[${index}].applicable must be boolean`);
    if (!entry.applicable) requireString(entry.reason, `${label}[${index}].reason`, { maximum: 500 });
    return entry.dimension;
  });
  if (dimensions.length !== 10 || dimensions.some((item, index) => item !== RUBRIC_DIMENSIONS[index])) {
    throw new Error(`${label} must cover dimensions 1-10 exactly once in order`);
  }
}

function validateSemanticInvariants(value, label) {
  requireObject(value, label);
  for (const key of [ 'graphScope', 'variableRoles', 'optionalValues', 'cardinality', 'setBag', 'aggregates', 'ordering' ]) {
    requireString(value[key], `${label}.${key}`, { maximum: 2_000 });
  }
}

function evaluatorDigestInput(bundle) {
  const copy = clone(bundle);
  delete copy.selectionSha256;
  return copy;
}

export function computeEvaluatorSelectionSha256(bundle) {
  return digest(evaluatorDigestInput(bundle));
}

export function validateEvaluatorBundle(input) {
  const bundle = clone(requireObject(input, 'evaluator bundle'));
  if (bundle.format !== EVALUATOR_FORMAT) throw new Error(`evaluator bundle format must be ${EVALUATOR_FORMAT}`);
  requireString(bundle.version, 'version', { maximum: 64 });
  requireObject(bundle.corpus, 'corpus');
  requireHttps(bundle.corpus.source, 'corpus.source');
  requireString(bundle.corpus.retrievedAt, 'corpus.retrievedAt', { maximum: 64 });
  requireString(bundle.corpus.sha256, 'corpus.sha256', { pattern: SHA256 });
  requireInteger(bundle.corpus.httpStatus, 'corpus.httpStatus', { minimum: 100, maximum: 599 });
  requireString(bundle.corpus.contentType, 'corpus.contentType', { maximum: 256 });
  requireInteger(bundle.corpus.byteLength, 'corpus.byteLength', { minimum: 1, maximum: 10_000_000 });
  requireInteger(bundle.corpus.redirects, 'corpus.redirects', { minimum: 0, maximum: 0 });
  if (bundle.corpus.etag !== undefined) requireString(bundle.corpus.etag, 'corpus.etag', { maximum: 512 });
  if (bundle.corpus.sourceRelease !== undefined) requireString(bundle.corpus.sourceRelease, 'corpus.sourceRelease', { maximum: 128 });
  requireString(bundle.selectionSha256, 'selectionSha256', { pattern: SHA256 });
  requireArray(bundle.cases, 'cases', { minimum: 1 });
  for (const [ index, item ] of bundle.cases.entries()) {
    const label = `cases[${index}]`;
    requireString(item.id, `${label}.id`, { pattern: CASE_ID });
    requireString(item.officialExampleId, `${label}.officialExampleId`, { maximum: 200 });
    requireHttps(item.officialLocator, `${label}.officialLocator`);
    requireString(item.officialQuestion, `${label}.officialQuestion`, { maximum: 1_000 });
    requireString(item.officialQuery, `${label}.officialQuery`, { maximum: 100_000 });
    requireString(item.querySha256, `${label}.querySha256`, { pattern: SHA256 });
    if (digest(item.officialQuery) !== item.querySha256) throw new Error(`${label}.querySha256 does not match officialQuery`);
    requireString(item.operation, `${label}.operation`, { pattern: /^(?:SELECT|ASK|CONSTRUCT|DESCRIBE)$/u });
    validateSemanticInvariants(item.semanticInvariants, `${label}.semanticInvariants`);
    validateRubricApplicability(item.rubricApplicability, `${label}.rubricApplicability`);
    requireArray(item.leakageMarkers, `${label}.leakageMarkers`, { minimum: 3 });
    const kinds = new Set();
    for (const [ markerIndex, marker ] of item.leakageMarkers.entries()) {
      const markerLabel = `${label}.leakageMarkers[${markerIndex}]`;
      requireString(marker.kind, `${markerLabel}.kind`, { pattern: /^(?:official-example-id|query-fragment|expected-answer|honeytoken)$/u });
      requireString(marker.value, `${markerLabel}.value`, { minimum: 8, maximum: 4_096 });
      kinds.add(marker.kind);
    }
    for (const required of [ 'official-example-id', 'query-fragment', 'honeytoken' ]) {
      if (!kinds.has(required)) throw new Error(`${label}.leakageMarkers must include ${required}`);
    }
  }
  if (new Set(bundle.cases.map(item => item.id)).size !== bundle.cases.length) throw new Error('evaluator case IDs must be unique');
  if (computeEvaluatorSelectionSha256(bundle) !== bundle.selectionSha256) throw new Error('selectionSha256 does not match the canonical evaluator bundle');
  return Object.freeze(bundle);
}

function inside(parent, candidate) {
  const path = relative(resolve(parent), resolve(candidate));
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

function normalizeRelativePath(value, label) {
  requireString(value, label, { maximum: 500 });
  if (isAbsolute(value) || value.split(/[\\/]/u).includes('..')) throw new Error(`${label} must remain inside the source root`);
  return value.replaceAll('\\', '/').replace(/^\.\//u, '');
}

export function validateWorkerExportPolicy(input) {
  const policy = clone(requireObject(input, 'worker export policy'));
  if (policy.format !== EXPORT_POLICY_FORMAT) throw new Error(`worker export policy format must be ${EXPORT_POLICY_FORMAT}`);
  requireString(policy.version, 'version', { maximum: 64 });
  requireArray(policy.include, 'include', { minimum: 1 });
  policy.include = policy.include.map((item, index) => normalizeRelativePath(item, `include[${index}]`));
  if (new Set(policy.include).size !== policy.include.length) throw new Error('worker export include paths must be unique');
  requireArray(policy.deny, 'deny', { minimum: 1 });
  policy.deny = policy.deny.map((item, index) => normalizeRelativePath(item, `deny[${index}]`));
  for (const included of policy.include) {
    for (const denied of policy.deny) {
      if (included === denied || included.startsWith(`${denied}/`) || denied.startsWith(`${included}/`)) {
        throw new Error(`Worker export include/deny paths overlap: ${included} and ${denied}`);
      }
    }
  }
  return Object.freeze(policy);
}

async function ensureEmptyDirectory(path) {
  try {
    const current = await stat(path);
    if (!current.isDirectory()) throw new Error(`Worker export destination is not a directory: ${path}`);
    if ((await readdir(path)).length > 0) throw new Error(`Worker export destination must be empty: ${path}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await mkdir(path, { recursive: true });
  }
}

export async function materializeWorkerExport({ sourceRoot, destinationRoot, policy: input } = {}) {
  const policy = validateWorkerExportPolicy(input);
  const source = resolve(sourceRoot);
  const destination = resolve(destinationRoot);
  if (inside(source, destination) || inside(destination, source)) throw new Error('Worker export root must be distinct from and outside the source checkout');
  await ensureEmptyDirectory(destination);
  for (const item of policy.include) {
    const from = resolve(source, item);
    if (!inside(source, from)) throw new Error(`Included path escapes source root: ${item}`);
    const info = await lstat(from);
    if (info.isSymbolicLink()) throw new Error(`Worker export may not copy symlinks: ${item}`);
    if (info.isDirectory()) await filesUnder(from);
    await cp(from, resolve(destination, item), { recursive: true, errorOnExist: true, force: false, verbatimSymlinks: false });
  }
  return Object.freeze({
    kind: 'linked-science-worker-export',
    policyVersion: policy.version,
    sourceRoot: source,
    destinationRoot: destination,
    includes: [ ...policy.include ],
    digest: digest(policy),
  });
}

async function filesUnder(root) {
  const output = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = resolve(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Worker export contains a symlink: ${relative(root, absolute)}`);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) output.push(absolute);
      else throw new Error(`Worker export contains an unsupported filesystem entry: ${relative(root, absolute)}`);
    }
  }
  await visit(resolve(root));
  return output.sort();
}

function boundaryFinding(boundary) {
  if (!boundary.rootsDistinct || !boundary.evaluatorOutsideWorker) return 'Evaluator-private root overlaps the worker export root';
  if (!boundary.authorityAttested) return 'No broker-enforced read-denial attestation was supplied for the evaluator-private root';
  return undefined;
}

export async function auditWorkerExport({ workerRoot, workerManifestPath, evaluatorBundle: inputBundle, boundaryAttestation, maxFileBytes = 2_000_000 } = {}) {
  const bundle = validateEvaluatorBundle(inputBundle);
  const worker = resolve(workerRoot);
  const evaluator = resolve(boundaryAttestation?.evaluatorRoot ?? worker);
  const manifestPath = resolve(workerManifestPath);
  if (!inside(worker, manifestPath)) throw new Error('workerManifestPath must be inside workerRoot');
  const manifest = validateWorkerManifest(JSON.parse(await readFile(manifestPath, 'utf8')));
  const files = await filesUnder(worker);
  const findings = [];
  let bytesScanned = 0;
  const markers = bundle.cases.flatMap(item => item.leakageMarkers.map(marker => ({ caseId: item.id, ...marker })));
  for (const file of files) {
    const relativePath = relative(worker, file).replaceAll('\\', '/');
    const info = await stat(file);
    if (info.size > maxFileBytes) throw new Error(`Worker export file exceeds audit byte ceiling: ${relativePath}`);
    const bytes = await readFile(file);
    bytesScanned += bytes.length;
    const text = bytes.toString('utf8');
    for (const marker of markers) {
      if (relativePath.includes(marker.value) || text.includes(marker.value)) {
        findings.push({ kind: 'leakage', path: relativePath, caseId: marker.caseId, markerKind: marker.kind, markerSha256: digest(marker.value) });
      }
    }
  }
  const boundary = {
    workerRoot: worker,
    evaluatorRoot: evaluator,
    rootsDistinct: worker !== evaluator,
    evaluatorOutsideWorker: !inside(worker, evaluator),
    authorityAttested: boundaryAttestation?.kind === 'cleanroom-filesystem-boundary' &&
      boundaryAttestation?.enforcer === 'cleanroom-broker' &&
      boundaryAttestation?.privateReadProbe === 'denied' &&
      boundaryAttestation?.workerRoot === worker &&
      boundaryAttestation?.evaluatorRoot === evaluator,
  };
  const boundaryIssue = boundaryFinding(boundary);
  if (boundaryIssue) findings.push({ kind: 'boundary', message: boundaryIssue });
  const matchingIds = manifest.cases.length === bundle.cases.length && manifest.cases.every(item => bundle.cases.some(privateCase => privateCase.id === item.id));
  if (!matchingIds) findings.push({ kind: 'case-set', message: 'Worker and evaluator case IDs do not match exactly' });
  return Object.freeze({
    kind: 'linked-science-worker-leakage-audit',
    status: findings.length === 0 ? 'passed' : 'failed',
    filesScanned: files.length,
    bytesScanned,
    workerManifestSha256: digest(manifest),
    evaluatorSelectionSha256: bundle.selectionSha256,
    boundary: Object.freeze(boundary),
    findings: Object.freeze(findings),
  });
}

export const COMPETENCY_MANIFEST_FORMATS = Object.freeze({
  worker: WORKER_FORMAT,
  evaluator: EVALUATOR_FORMAT,
  exportPolicy: EXPORT_POLICY_FORMAT,
});
