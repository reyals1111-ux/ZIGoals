/**
 * Session AB-Cloud Part 2 ([TIER 3] (sync), ADR-023 C3): the three-way merge of an extras record. Unlike the four synced
 * modules (which refuse a conflicting field), the extras never stop over a conflict and never drop an entry silently:
 *
 * - the same on both sides, or changed on one side only (against the base both last synced): that side's value;
 * - both changed, both plain objects without a stamp: merged key by key (so two devices editing different goals, areas or
 *   habits keep both edits);
 * - both changed, both lists whose items all carry an identity (`id`, else `day`, `date`, `weekStart` or `key`): merged item
 *   by item, in this device's order with the other's new items after;
 * - both changed and removed on one side: the edit is kept (an edit beats a removal);
 * - a stamped value (`updatedAt`, `at`, `setAt`, `savedAt`: a goal's entry, a coach answer, a focus) both changed from a
 *   value both held: field by field, a field only one side changed keeping that change and a field both changed taking
 *   the later-stamped side's (so a photo chosen on one device and a reason edited on another both survive);
 * - anything else both changed (a stamped value both added, a scalar, a list without identities): a stamped value is kept
 *   whole by the later stamp; otherwise, and on equal stamps, by a fixed order of the two texts, so every device settles
 *   on the same value (Session W S4).
 * `undefined` means "not held". A base of `undefined` (a first sync) treats every difference as changed on both sides,
 * which merges the two devices' records key by key and item by item.
 */
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const same = (a: unknown, b: unknown) => a === b || canonical(a) === canonical(b);
/** JSON with object keys sorted, so two devices that wrote the same value in another key order agree. */
export function canonical(value: unknown): string {
  return JSON.stringify(value, (_k, v) => isObject(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v) ?? 'undefined';
}
const IDENTITY_KEYS = ['id', 'day', 'date', 'weekStart', 'key'] as const;
function identityKey(list: unknown[]): string | null {
  for (const k of IDENTITY_KEYS) if (list.length && list.every(v => isObject(v) && typeof v[k] === 'string')) return k;
  return null;
}
const STAMPS = ['updatedAt', 'at', 'setAt', 'savedAt'] as const;
const stampOf = (v: unknown): string | null => { if (!isObject(v)) return null; for (const k of STAMPS) if (typeof v[k] === 'string') return v[k] as string; return null; };
function settle(local: unknown, remote: unknown): unknown {
  const l = stampOf(local), r = stampOf(remote);
  if (l !== null && r !== null && l !== r) return l > r ? local : remote;
  return canonical(local) >= canonical(remote) ? local : remote;
}

export function mergeExtras(base: unknown, local: unknown, remote: unknown): unknown {
  if (same(local, remote)) return local;
  if (base !== undefined || local === undefined || remote === undefined) {
    if (same(local, base)) return remote;
    if (same(remote, base)) return local;
  }
  // Both changed. A removal against an edit keeps the edit.
  if (local === undefined) return remote;
  if (remote === undefined) return local;
  // A stamped value (a goal's extras entry, a coach answer, a focus) that both devices changed from a value both held:
  // a field only one side changed keeps that side's change (so a photo set on one device and a reason edited on the other
  // both survive), a field both changed takes the later-stamped side's, and the stamp is the later one. Without a common
  // base (both added it) the later stamp is kept whole (W S4).
  if (isObject(local) && isObject(remote) && isObject(base) && stampOf(local) !== null && stampOf(remote) !== null && stampOf(base) !== null) {
    const later = settle(local, remote) === local ? local : remote, out: Record<string, unknown> = {};
    for (const key of new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])) {
      const b = base[key], l = local[key], r = remote[key];
      const value = same(l, r) ? l : same(l, b) ? r : same(r, b) ? l : later[key];
      if (value !== undefined) out[key] = value;
    }
    return out;
  }
  if (isObject(local) && isObject(remote) && stampOf(local) === null && stampOf(remote) === null) {
    const b = isObject(base) ? base : {}, out: Record<string, unknown> = {};
    for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const merged = mergeExtras(base === undefined ? undefined : b[key], local[key], remote[key]);
      if (merged !== undefined) out[key] = merged;
    }
    return out;
  }
  if (Array.isArray(local) && Array.isArray(remote)) {
    const key = identityKey([...local, ...remote]);
    const baseList = Array.isArray(base) ? base : [];
    if (key && (baseList.length === 0 || identityKey(baseList) === key)) {
      const id = (v: unknown) => (v as Record<string, string>)[key]!;
      const maps = [baseList, local, remote].map(list => new Map(list.map(v => [id(v), v] as const)));
      const order = [...new Set([...local.map(id), ...remote.map(id)])], out: unknown[] = [];
      for (const k of order) {
        const merged = mergeExtras(base === undefined ? undefined : maps[0]!.get(k), maps[1]!.get(k), maps[2]!.get(k));
        if (merged !== undefined) out.push(merged);
      }
      return out;
    }
  }
  return settle(local, remote);
}
