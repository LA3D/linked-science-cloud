import { chmod, lstat, mkdir, readdir, writeFile } from 'node:fs/promises';
import { posix, resolve } from 'node:path';
import { assertRelativePath } from './contracts.mjs';
import { readConfinedFile, sha256 } from './evidence.mjs';

const skillRoot = '.agents/skills/linked-data-repl';
const format = 'linked-science-skill-baseline/v1';
const canonical = value => JSON.stringify(value, function (_key, item) {
  return item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item;
});
const localLinks = (text, path) => [...text.matchAll(/\]\(([^)]+)\)/gu)]
  .map(match => match[1].split('#')[0])
  .filter(link => link && !/^[a-z]+:/iu.test(link))
  .map(link => assertRelativePath(posix.normalize(posix.join(posix.dirname(path), link))));

async function filesUnder(root, prefix) {
  const result = [];
  async function visit(path) {
    const info = await lstat(resolve(root, path));
    if (info.isSymbolicLink()) throw new Error(`Baseline rejects symlinks: ${path}`);
    if (info.isDirectory()) {
      for (const name of (await readdir(resolve(root, path))).sort()) await visit(`${path}/${name}`);
    } else if (info.isFile()) result.push(path);
    else throw new Error(`Unsupported baseline file type: ${path}`);
  }
  await visit(prefix);
  return result.sort();
}

/** Freeze all skill-directory bytes plus directly linked repository documents.
 * Links inside those external documents remain navigation, not recursive bundle
 * inclusion. This boundary is recorded rather than claiming a whole-repo lock.
 */
export async function describeSkillBaseline(root) {
  const skillFiles = await filesUnder(root, skillRoot);
  const paths = new Set(skillFiles);
  for (const path of skillFiles.filter(path => path.endsWith('.md'))) {
    const text = (await readConfinedFile(root, path)).toString('utf8');
    for (const link of localLinks(text, path)) paths.add(link);
  }
  if (paths.size > 64) throw new Error('Baseline file-count bound');
  const files = [], outboundReferences = new Set();
  let totalBytes = 0;
  for (const path of [...paths].sort()) {
    const bytes = await readConfinedFile(root, path);
    totalBytes += bytes.length;
    if (totalBytes > 2 * 1024 * 1024) throw new Error('Baseline total-byte bound');
    const mode = (await lstat(resolve(root, path))).mode & 0o111 ? '0755' : '0644';
    const role = skillFiles.includes(path) ? 'skill-file' : 'direct-repository-reference';
    files.push({ path, role, mode, bytes: bytes.length, sha256: sha256(bytes) });
    if (role === 'direct-repository-reference' && path.endsWith('.md')) {
      for (const link of localLinks(bytes.toString('utf8'), path)) if (!paths.has(link)) outboundReferences.add(link);
    }
  }
  const content = {
    format, sourceRoot: skillRoot,
    scope: 'complete-skill-directory-and-direct-repository-references',
    discovery: 'not-observed', loading: 'not-observed',
    outboundReferencePolicy: 'navigation-not-snapshotted; no transitive repository or remote-content lock',
    outboundReferences: [...outboundReferences].sort(), files,
  };
  return { ...content, digest: sha256(canonical(content)) };
}

async function safeDirectories(root, path) {
  let current = root;
  for (const part of assertRelativePath(path).split('/')) {
    current = resolve(current, part);
    try { await mkdir(current); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    const info = await lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Snapshot destination is not a regular directory');
  }
}

export async function snapshotSkillBaseline({ root, destination }) {
  assertRelativePath(destination);
  if (!destination.startsWith('artifacts/wiki-learning/baselines/')) throw new Error('Baseline destination must be in the controlled artifact area');
  const manifest = await describeSkillBaseline(root);
  await safeDirectories(root, posix.dirname(destination));
  await mkdir(resolve(root, destination)); // exclusive: never overwrite a baseline
  for (const file of manifest.files) {
    const bytes = await readConfinedFile(root, file.path);
    if (sha256(bytes) !== file.sha256) throw new Error('Source changed during snapshot');
    const path = `${destination}/files/${file.path}`;
    await safeDirectories(root, posix.dirname(path));
    await writeFile(resolve(root, path), bytes, { flag: 'wx', mode: Number.parseInt(file.mode, 8) });
    await chmod(resolve(root, path), Number.parseInt(file.mode, 8));
  }
  // Written last: a directory without its manifest is an incomplete snapshot.
  await writeFile(resolve(root, destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return manifest;
}

export async function verifySkillBaseline({ root, destination }) {
  assertRelativePath(destination);
  const manifest = JSON.parse((await readConfinedFile(root, `${destination}/manifest.json`)).toString('utf8'));
  const { digest, ...content } = manifest;
  if (manifest.format !== format || manifest.sourceRoot !== skillRoot || manifest.discovery !== 'not-observed' || manifest.loading !== 'not-observed' || !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > 64 || sha256(canonical(content)) !== digest) throw new Error('Invalid baseline manifest/digest');
  const seen = new Set();
  for (const file of manifest.files) {
    assertRelativePath(file.path);
    if (seen.has(file.path) || !['0644', '0755'].includes(file.mode) || !['skill-file', 'direct-repository-reference'].includes(file.role)) throw new Error('Invalid baseline file manifest');
    seen.add(file.path);
    const path = `${destination}/files/${file.path}`;
    const bytes = await readConfinedFile(root, path);
    const mode = (await lstat(resolve(root, path))).mode & 0o111 ? '0755' : '0644';
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256 || mode !== file.mode) throw new Error(`Baseline file mismatch: ${file.path}`);
  }
  const actual = (await filesUnder(root, `${destination}/files`)).map(path => path.slice(`${destination}/files/`.length));
  if (actual.length !== seen.size || actual.some(path => !seen.has(path))) throw new Error('Baseline contains unmanifested files');
  return { status: 'passed', digest, files: seen.size, discovery: manifest.discovery, loading: manifest.loading };
}
