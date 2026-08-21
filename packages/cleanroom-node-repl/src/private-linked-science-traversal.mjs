const PRIVATE_TRAVERSALS = new WeakMap();

export function registerLinkedSciencePrivateTraversal(cleanroom, traversal) {
  if (!cleanroom || typeof cleanroom !== 'object' || !traversal || typeof traversal !== 'object') {
    throw new TypeError('A clean-room object and private traversal bridge are required');
  }
  if (PRIVATE_TRAVERSALS.has(cleanroom)) throw new Error('The private traversal bridge is already registered');
  PRIVATE_TRAVERSALS.set(cleanroom, traversal);
}

export function hasLinkedSciencePrivateTraversal(cleanroom) {
  return Boolean(cleanroom && typeof cleanroom === 'object' && PRIVATE_TRAVERSALS.has(cleanroom));
}

export async function setupLinkedScienceWithPrivateTraversal({ cleanroom, ...options } = {}) {
  const { setupLinkedScience } = await import('../../../lib/linked-science-runtime.mjs');
  return setupLinkedScience({ ...options, traversal: PRIVATE_TRAVERSALS.get(cleanroom) });
}
