const CHEBI_COMPOUND_API = 'https://www.ebi.ac.uk/chebi/backend/api/public/compound/';

export function createChebiCompoundEvidenceProfile(accession) {
  if (typeof accession !== 'string' || !/^CHEBI:[1-9][0-9]*$/u.test(accession)) {
    throw new Error('ChEBI accession must use the exact CHEBI:<positive integer> form');
  }
  const source = `${CHEBI_COMPOUND_API}${accession}/`;
  return Object.freeze({
    name: `chebi-compound-${accession.slice(6)}`,
    sources: Object.freeze([source]),
    accept: 'application/json',
    allowedFormats: Object.freeze(['json']),
    timeoutMs: 8_000,
    maxBytes: 1_000_000,
  });
}
