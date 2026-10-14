// Isolated experiment fixture, not a production provider adapter.
export class DepthOneGate {
  #identities = new Map();
  #root;
  constructor({ maxCalls = 1, maxConcurrent = 1 } = {}) {
    this.maxCalls = maxCalls; this.maxConcurrent = maxConcurrent;
    this.total = 0; this.active = 0; this.events = [];
    this.#root = Symbol('registered-root');
    this.#identities.set(this.#root, { depth: 0, id: 'root' });
  }
  rootIdentity() { return this.#root; }
  acquire(identity, options = {}) {
    const parent = this.#identities.get(identity);
    const deny = code => { this.events.push({ code, parent: parent?.id ?? 'unknown', total: this.total, active: this.active }); throw Object.assign(new Error(code), { code }); };
    if (!parent) deny('UNKNOWN_PARENT');
    if (Object.hasOwn(options, 'depth') || Object.hasOwn(options, 'parentId')) deny('CALLER_IDENTITY_OVERRIDE');
    const depth = parent.depth + 1;
    if (depth > 1) deny('DEPTH_LIMIT');
    if (this.active >= this.maxConcurrent) deny('CONCURRENCY_LIMIT');
    if (this.total >= this.maxCalls) deny('TOTAL_CALL_LIMIT');
    const identityToken = Symbol('registered-leaf');
    const id = `leaf-${++this.total}`;
    this.#identities.set(identityToken, { depth, id });
    this.active++;
    this.events.push({ code: 'ADMITTED', parent: parent.id, id, depth, total: this.total, active: this.active });
    let released = false;
    return Object.freeze({ identity: identityToken, id, depth, release: () => {
      if (!released) { released = true; this.active--; this.events.push({ code: 'RELEASED', id, total: this.total, active: this.active }); }
    } });
  }
}
