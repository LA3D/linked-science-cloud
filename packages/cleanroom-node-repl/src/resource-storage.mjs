import { createHash, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, open, rename, rm, statfs, realpath, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const fail = (code, message) => Object.assign(new Error(message), { code });
const integer = (value, min, max, label) => {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw fail('RESOURCE_LIMIT_INVALID', `${label} must be an integer in ${min}..${max}`);
  return value;
};

// Broker-only byte storage. Paths never cross the kernel bridge except for an
// explicit durable materialization. No whole body is buffered by this class.
export class ResourceStorage {
  constructor({ artifactRoot, tempRoot = tmpdir(), reserveBytes = 256 * 1024 ** 2, maxStorageBytes } = {}) {
    this.artifactRoot = artifactRoot && resolve(artifactRoot);
    this.tempRoot = tempRoot;
    this.reserveBytes = integer(reserveBytes, 0, Number.MAX_SAFE_INTEGER, 'reserveBytes');
    this.maxStorageBytes = maxStorageBytes === undefined ? undefined : integer(maxStorageBytes, 1, Number.MAX_SAFE_INTEGER, 'maxStorageBytes');
    this.records = new Map();
    this.totalBytes = 0;
    this.root = undefined;
    this.allocating = 0;
  }
  capabilities() {
    return { kind: 'linked-science-resource-storage', storage: 'disk', durability: 'kernel-epoch', maxReadBytes: 1024 ** 2,
      reserveBytes: this.reserveBytes, maxStorageBytes: this.maxStorageBytes ?? null,
      capacityPolicy: 'available-filesystem-minus-reserve-and-shared-quota', maxConcurrentTransfers: 4, materialization: Boolean(this.artifactRoot) };
  }
  async capacity() {
    const fs = await statfs(this.tempRoot);
    const freeBytes = Math.min(Number.MAX_SAFE_INTEGER, fs.bavail * fs.bsize);
    const quotaRemaining = this.maxStorageBytes === undefined ? Number.MAX_SAFE_INTEGER : Math.max(0, this.maxStorageBytes - this.totalBytes);
    return { freeBytes, reserveBytes: this.reserveBytes, retainedBytes: this.totalBytes,
      availableBytes: Math.max(0, Math.min(freeBytes - this.reserveBytes, quotaRemaining)) };
  }
  async begin(options = {}, owner) {
    if (!owner?.token || !Number.isInteger(owner.epoch)) throw fail('RESOURCE_OWNER_REQUIRED', 'Storage requires a kernel owner');
    const capacity = await this.capacity();
    const maxBytes = integer(options.maxBytes ?? Math.floor(capacity.availableBytes / 2), 1, Number.MAX_SAFE_INTEGER, 'maxBytes');
    if (maxBytes > capacity.availableBytes) throw fail('RESOURCE_CAPACITY', `Requested ${maxBytes} bytes; ${capacity.availableBytes} available after reserve and quota. Release storage, free disk space, or request a smaller transfer.`);
    if (this.allocating + [...this.records.values()].filter(r => r.state === 'writing').length >= 4) throw fail('RESOURCE_CONCURRENCY', 'At most four disk transfers may write concurrently');
    this.allocating++;
    try {
      this.root ??= mkdtemp(join(this.tempRoot, 'linked-science-resources-'));
      const root = await this.root;
      const id = `resource-${randomUUID()}`;
      const path = join(root, id);
      const file = await open(`${path}.partial`, 'wx', 0o600);
      const record = { id, owner: { ...owner }, maxBytes, bytes: 0, path, file, hash: createHash('sha256'), state: 'writing', capacity };
      this.records.set(id, record);
      return { storageId: id, maxBytes, capacity };
    } finally { this.allocating--; }
  }
  get(id, owner, complete = false) {
    const record = this.records.get(id);
    if (!record || record.owner.token !== owner.token || record.owner.epoch !== owner.epoch) throw fail('RESOURCE_OWNER_DENIED', 'Resource is unavailable in this kernel epoch');
    if (complete && record.state !== 'complete') throw fail('RESOURCE_INCOMPLETE', 'Resource is not complete');
    return record;
  }
  async write(id, data, owner) {
    const r = this.get(id, owner);
    if (r.state !== 'writing') throw fail('RESOURCE_INCOMPLETE', 'Resource is no longer writable');
    const capacity = await this.capacity();
    if (r.bytes + data.length > r.maxBytes) throw fail('RESOURCE_BYTE_LIMIT', `Transfer exceeds ${r.maxBytes} bytes; partial storage will be removed. Retry with an explicit larger maxBytes within available capacity.`);
    if (data.length > Math.min(capacity.availableBytes, this.maxStorageBytes === undefined ? Number.MAX_SAFE_INTEGER : this.maxStorageBytes - this.totalBytes)) throw fail('RESOURCE_CAPACITY', 'Storage quota or available disk reserve exhausted; partial storage will be removed');
    // Reserve quota before the asynchronous write so concurrent transfers share it.
    this.totalBytes += data.length;
    r.bytes += data.length;
    let offset = 0;
    while (offset < data.length) {
      const { bytesWritten } = await r.file.write(data, offset, data.length - offset);
      if (!bytesWritten) throw fail('RESOURCE_WRITE_FAILED', 'Storage write made no progress');
      offset += bytesWritten;
    }
    r.hash.update(data);
  }
  async commit(id, owner) {
    const r = this.get(id, owner);
    if (r.state !== 'writing') throw fail('RESOURCE_INCOMPLETE', 'Resource cannot be committed');
    await r.file.sync();
    await r.file.close();
    await rename(`${r.path}.partial`, r.path);
    r.sha256 = r.hash.digest('hex');
    r.state = 'complete';
    return { storageId: id, bytes: r.bytes, sha256: r.sha256, storage: 'disk', durability: 'kernel-epoch' };
  }
  async read({ storageId, offset = 0, length = 64 * 1024 }, owner) {
    const r = this.get(storageId, owner, true);
    integer(offset, 0, r.bytes, 'offset');
    integer(length, 0, this.capabilities().maxReadBytes, 'length');
    const file = await open(r.path, 'r');
    try {
      const buffer = Buffer.alloc(Math.min(length, r.bytes - offset));
      let count = 0;
      while (count < buffer.length) {
        const { bytesRead } = await file.read(buffer, count, buffer.length - count, offset + count);
        if (!bytesRead) throw fail('RESOURCE_READ_FAILED', 'Unexpected end of stored resource');
        count += bytesRead;
      }
      this.get(storageId, owner, true);
      return { base64: buffer.toString('base64'), offset, bytes: count, totalBytes: r.bytes };
    } finally { await file.close(); }
  }
  async release({ storageId }, owner) {
    const r = this.records.get(storageId);
    if (!r) return { released: false };
    this.get(storageId, owner);
    if (r.state === 'writing') throw fail('RESOURCE_BUSY', 'Abort and await the transfer before releasing partial storage');
    if (!r.cleanup) {
      r.cleanup = (async () => {
        await rm(r.path, { force: true });
        this.totalBytes -= r.bytes;
        this.records.delete(storageId);
        return { released: true };
      })();
      r.cleanup.catch(() => { r.cleanup = undefined; });
    }
    return r.cleanup;
  }
  async discard(id, owner) {
    const r = this.get(id, owner);
    await r.file.close().catch(() => {});
    await rm(`${r.path}.partial`, { force: true });
    await rm(r.path, { force: true });
    this.totalBytes -= r.bytes;
    this.records.delete(id);
  }
  async releaseOwner(owner) {
    for (const r of [...this.records.values()]) if (r.owner.token === owner.token && r.owner.epoch === owner.epoch && r.state === 'complete') await this.release({storageId:r.id}, owner);
  }
  async materialize({ storageId, name, authorized = false }, owner) {
    if (authorized !== true) throw fail('RESOURCE_EXPORT_AUTHORITY', 'Durable materialization requires explicit user export authorization and authorized: true');
    if (!this.artifactRoot) throw fail('RESOURCE_EXPORT_UNAVAILABLE', 'No controlled artifact root is configured');
    if (typeof name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(name) || name === 'receipt.json') throw fail('RESOURCE_ARTIFACT_NAME', 'Use a plain filename (1–128 letters, digits, dots, underscores or hyphens), excluding receipt.json');
    const r = this.get(storageId, owner, true);
    // Reject symlinks at every existing component of the controlled destination.
    const parts = this.artifactRoot.split('/').filter(Boolean);
    let path = '/';
    for (const part of parts) {
      path = join(path, part);
      await mkdir(path).catch(error => { if (error.code !== 'EEXIST') throw error; });
      if ((await lstat(path)).isSymbolicLink()) throw fail('RESOURCE_ARTIFACT_PATH', 'Artifact directory must not contain symbolic links');
    }
    const root = await realpath(this.artifactRoot);
    const fs = await statfs(root);
    if (fs.bavail * fs.bsize - this.reserveBytes < r.bytes + 16384) throw fail('RESOURCE_CAPACITY', 'Insufficient artifact disk capacity after reserve');
    const directory = await mkdtemp(join(root, '.partial-'));
    const container = await mkdtemp(join(root, 'resource-'));
    const target = join(container, 'content');
    try {
      const output = await open(join(directory, name), 'wx', 0o600);
      const hash = createHash('sha256');
      try {
        for (let offset = 0; offset < r.bytes;) {
          const page = await this.read({ storageId, offset, length: this.capabilities().maxReadBytes }, owner);
          const chunk = Buffer.from(page.base64, 'base64');
          hash.update(chunk);
          let written = 0;
          while (written < chunk.length) {
            const { bytesWritten } = await output.write(chunk, written, chunk.length - written);
            if (!bytesWritten) throw fail('RESOURCE_WRITE_FAILED', 'Artifact write made no progress');
            written += bytesWritten;
          }
          offset += chunk.length;
        }
        await output.sync();
      } finally { await output.close(); }
      if (hash.digest('hex') !== r.sha256) throw fail('RESOURCE_CHECKSUM', 'Artifact checksum did not match retained resource');
      const receipt = { kind: 'linked-science-resource-artifact', version: '1.0.0', path: join(target, name), receiptPath: join(target, 'receipt.json'), bytes: r.bytes, sha256: r.sha256,
        createdAt: new Date().toISOString(), durability: 'independent-of-kernel-and-handle', source: r.provenance };
      const receiptFile = await open(join(directory, 'receipt.json'), 'wx', 0o600);
      try { await receiptFile.writeFile(JSON.stringify(receipt, null, 2) + '\n'); await receiptFile.sync(); } finally { await receiptFile.close(); }
      this.get(storageId, owner, true);
      // Unique directories make publication non-overwriting; data+receipt appear together.
      await rename(directory, target);
      return receipt;
    } catch (error) { await rm(directory, {recursive:true,force:true}); await rm(container, {recursive:true,force:true}); throw error; }
  }
}
