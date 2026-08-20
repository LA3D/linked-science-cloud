import { access, readdir, readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const FORMAT = 'linked-science-experiment-result-registry/v1';
const OUTCOMES = new Set([ 'passed', 'failed', 'inconclusive', 'partial' ]);
const EVIDENCE_LEVELS = new Set([ 'machine-receipt', 'resident-audited', 'machine-audit', 'trace-derived-partial', 'retrospective-summary' ]);
const DURABILITY = new Set([ 'complete', 'partial', 'summary-only' ]);
const DOCUMENT_STATUSES = new Set([ 'results-recorded', 'planned-only', 'fixture-only', 'offline-contract-only', 'decision-record', 'preparation-only' ]);

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value;
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function requireRelativePath(value, label, prefix) {
  const path = requireString(value, label);
  if (path.startsWith('/') || path.split(/[\\/]/u).includes('..') || !path.startsWith(prefix)) {
    throw new Error(`${label} must be a repository-relative path under ${prefix}`);
  }
  return path;
}

export function validateExperimentResultRegistry(input) {
  const registry = structuredClone(requireObject(input, 'registry'));
  if (registry.format !== FORMAT) throw new Error(`registry format must be ${FORMAT}`);
  requireString(registry.version, 'registry.version');
  requireString(registry.recordedAt, 'registry.recordedAt');
  requireArray(registry.runs, 'registry.runs');
  requireArray(registry.documents, 'registry.documents');

  const runIds = new Set();
  for (const [ index, run ] of registry.runs.entries()) {
    const label = `registry.runs[${index}]`;
    requireObject(run, label);
    const id = requireString(run.id, `${label}.id`);
    if (runIds.has(id)) throw new Error(`duplicate run id: ${id}`);
    runIds.add(id);
    requireString(run.date, `${label}.date`);
    requireString(run.title, `${label}.title`);
    if (!OUTCOMES.has(run.outcome)) throw new Error(`${label}.outcome is invalid`);
    if (!EVIDENCE_LEVELS.has(run.evidenceLevel)) throw new Error(`${label}.evidenceLevel is invalid`);
    if (!DURABILITY.has(run.durability)) throw new Error(`${label}.durability is invalid`);
    const records = requireArray(run.recordPaths, `${label}.recordPaths`);
    if (records.length === 0) throw new Error(`${label}.recordPaths must not be empty`);
    records.forEach((path, item) => requireRelativePath(path, `${label}.recordPaths[${item}]`, 'artifacts/'));
    const documents = requireArray(run.documentationPaths, `${label}.documentationPaths`);
    if (documents.length === 0) throw new Error(`${label}.documentationPaths must not be empty`);
    documents.forEach((path, item) => requireRelativePath(path, `${label}.documentationPaths[${item}]`, 'docs/'));
    requireArray(run.missingEvidence, `${label}.missingEvidence`).forEach((value, item) => requireString(value, `${label}.missingEvidence[${item}]`));
    if (run.durability !== 'complete' && run.missingEvidence.length === 0) throw new Error(`${label} must identify missing evidence`);
  }

  const documentPaths = new Set();
  for (const [ index, document ] of registry.documents.entries()) {
    const label = `registry.documents[${index}]`;
    requireObject(document, label);
    const path = requireRelativePath(document.path, `${label}.path`, 'docs/experiments/');
    if (documentPaths.has(path)) throw new Error(`duplicate experiment document: ${path}`);
    documentPaths.add(path);
    if (!DOCUMENT_STATUSES.has(document.status)) throw new Error(`${label}.status is invalid`);
    requireString(document.note, `${label}.note`);
  }
  return registry;
}

function inside(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

export async function validateExperimentResultRepository({ projectRoot, registry: input } = {}) {
  const root = resolve(projectRoot);
  const registry = validateExperimentResultRegistry(input);
  for (const run of registry.runs) {
    for (const path of run.recordPaths) {
      const absolute = resolve(root, path);
      if (!inside(root, absolute)) throw new Error(`result path escapes project root: ${path}`);
      await access(absolute);
      JSON.parse(await readFile(absolute, 'utf8'));
    }
    for (const path of run.documentationPaths) {
      const absolute = resolve(root, path);
      if (!inside(root, absolute)) throw new Error(`documentation path escapes project root: ${path}`);
      await access(absolute);
    }
  }
  for (const document of registry.documents) await access(resolve(root, document.path));

  const experimentRoot = resolve(root, 'docs/experiments');
  const dossierPaths = (await readdir(experimentRoot, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'RESULTS.md')
    .map(entry => `docs/experiments/${entry.name}`)
    .sort();
  const documented = new Set(registry.documents.map(document => document.path));
  const missing = dossierPaths.filter(path => !documented.has(path));
  if (missing.length > 0) throw new Error(`experiment dossiers missing registry status: ${missing.join(', ')}`);

  const retrospectivePath = resolve(root, 'artifacts/experiment-results/retrospective-runs.json');
  const retrospective = JSON.parse(await readFile(retrospectivePath, 'utf8'));
  if (retrospective.format !== 'linked-science-retrospective-experiment-results/v1') throw new Error('retrospective result format is invalid');
  const summaryIds = new Set();
  for (const [ index, run ] of requireArray(retrospective.runs, 'retrospective.runs').entries()) {
    const label = `retrospective.runs[${index}]`;
    requireObject(run, label);
    const id = requireString(run.id, `${label}.id`);
    if (summaryIds.has(id)) throw new Error(`duplicate retrospective run id: ${id}`);
    summaryIds.add(id);
    if (!OUTCOMES.has(run.outcome)) throw new Error(`${label}.outcome is invalid`);
    const sources = requireArray(run.sources, `${label}.sources`);
    if (sources.length === 0) throw new Error(`${label}.sources must not be empty`);
    sources.forEach((source, item) => requireString(source, `${label}.sources[${item}]`));
    requireString(run.observedSummary, `${label}.observedSummary`);
    const missingEvidence = requireArray(run.missingEvidence, `${label}.missingEvidence`);
    if (missingEvidence.length === 0) throw new Error(`${label}.missingEvidence must not be empty`);
    missingEvidence.forEach((value, item) => requireString(value, `${label}.missingEvidence[${item}]`));
  }
  const expectedSummaryIds = new Set(registry.runs.filter(run => run.evidenceLevel === 'retrospective-summary').map(run => run.id));
  const unbacked = registry.runs
    .filter(run => run.evidenceLevel === 'retrospective-summary' && !summaryIds.has(run.id))
    .map(run => run.id);
  if (unbacked.length > 0) throw new Error(`retrospective runs missing summary records: ${unbacked.join(', ')}`);
  const orphaned = [ ...summaryIds ].filter(id => !expectedSummaryIds.has(id));
  if (orphaned.length > 0) throw new Error(`retrospective summary records missing registry entries: ${orphaned.join(', ')}`);

  return Object.freeze({
    kind: 'linked-science-experiment-result-registry-validation',
    status: 'passed',
    runs: registry.runs.length,
    complete: registry.runs.filter(run => run.durability === 'complete').length,
    partial: registry.runs.filter(run => run.durability === 'partial').length,
    summaryOnly: registry.runs.filter(run => run.durability === 'summary-only').length,
    experimentDocuments: dossierPaths.length,
  });
}
