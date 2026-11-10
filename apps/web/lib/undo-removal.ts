/**
 * Session AH Part 3 (DS5: every destructive action confirms or gives a labelled Undo). What a save removed, found by
 * comparing the record before and after it: every list of items with an `id` (at any depth of plain objects, and inside
 * list items matched by their id, such as a portfolio's transactions) that lost
 * items and gained none. Undo puts exactly those items back into the LATEST record, where they were, so changes made
 * since (in this tab or another) are kept. A save that also added or changed list items is not a plain removal: no Undo
 * is offered for it here (its own flow says what happened).
 */
export type Removed = {path: string[]; index: number; item: {id: string}};
type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => !!v && typeof v === 'object' && !Array.isArray(v);
const idList = (v: unknown): v is {id: string}[] => Array.isArray(v) && v.every(x => isPlain(x) && typeof x.id === 'string');
const MAX_DEPTH = 4;

export function removedItems(before: unknown, after: unknown): Removed[] | null {
  const out: Removed[] = [];
  let other = false;
  const walk = (b: unknown, a: unknown, path: string[]) => {
    if (!isPlain(b) || !isPlain(a) || path.length > MAX_DEPTH) return;
    for (const key of Object.keys(b)) {
      const bv = b[key], av = a[key];
      if (idList(bv) && Array.isArray(av)) {
        if (!idList(av)) { other = true; continue; }
        const kept = new Set(av.map(x => x.id)), had = new Set(bv.map(x => x.id));
        if (av.some(x => !had.has(x.id))) other = true;
        bv.forEach((item, index) => { if (!kept.has(item.id)) out.push({path: [...path, key], index, item}); });
        // Lists inside a kept item (a portfolio's transactions), followed by the item's id.
        for (const item of bv) { const match = av.find(x => x.id === item.id); if (match) walk(item, match, [...path, key, `#${item.id}`]); }
      } else walk(bv, av, [...path, key]);
    }
  };
  walk(before, after, []);
  return other || out.length === 0 ? null : out;
}

/** The latest record with the removed items put back where they were (an item already there again is left alone). */
export function reinsertItems<T>(latest: T, removed: readonly Removed[]): T {
  const next = structuredClone(latest) as unknown;
  for (const r of [...removed].sort((x, y) => x.index - y.index)) {
    let at: unknown = next;
    for (const key of r.path.slice(0, -1)) at = key.startsWith('#') ? (Array.isArray(at) ? at.find(x => isPlain(x) && x.id === key.slice(1)) : undefined) : isPlain(at) ? at[key] : undefined;
    const last = r.path.at(-1)!;
    if (!isPlain(at)) continue;
    const list = at[last];
    if (!Array.isArray(list)) { at[last] = [structuredClone(r.item)]; continue; }
    if (list.some(x => isPlain(x) && x.id === r.item.id)) continue;
    list.splice(Math.min(r.index, list.length), 0, structuredClone(r.item));
  }
  return next as T;
}

/**
 * Session AL (3e, NB-081/NB-089: an Undo that left the water entry in place): what ANY save did to the record's lists of
 * items with an id — added, removed or edited — found by comparing the record before and after it, so an Undo can
 * reverse exactly that in the LATEST record (changes made since, in this tab or another, are kept). Plain fields outside
 * such lists (a timestamp, a setting) are not part of it: a save that changed only those gets no Undo from here.
 */
export type Added = {path: string[]; item: {id: string}};
export type Edited = {path: string[]; before: {id: string}; after: {id: string}};
export type ItemChanges = {removed: Removed[]; added: Added[]; edited: Edited[]};

export function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => sameValue(x, b[i]));
  if (!isPlain(a) || !isPlain(b)) return false;
  const ka = Object.keys(a).filter(k => a[k] !== undefined), kb = Object.keys(b).filter(k => b[k] !== undefined);
  return ka.length === kb.length && ka.every(k => sameValue(a[k], b[k]));
}

/** Everything the save changed in id lists, or null when it changed none. */
export function itemChanges(before: unknown, after: unknown): ItemChanges | null {
  const out: ItemChanges = {removed: [], added: [], edited: []};
  const walk = (b: unknown, a: unknown, path: string[]) => {
    if (!isPlain(b) || !isPlain(a) || path.length > MAX_DEPTH) return;
    for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
      const bv = b[key], av = a[key];
      const bl = idList(bv) ? bv : bv === undefined && idList(av) ? [] : null, al = idList(av) ? av : av === undefined && idList(bv) ? [] : null;
      if (bl && al) {
        const had = new Map(bl.map(x => [x.id, x])), has = new Map(al.map(x => [x.id, x]));
        bl.forEach((item, index) => { if (!has.has(item.id)) out.removed.push({path: [...path, key], index, item}); });
        for (const item of al) if (!had.has(item.id)) out.added.push({path: [...path, key], item});
        for (const item of bl) {
          const now = has.get(item.id);
          if (!now || sameValue(item, now)) continue;
          // An item whose own lists changed (a portfolio's transactions) is followed into; any other change is an edit.
          const inner = itemChanges(item, now);
          const onlyLists = inner && sameValue(stripLists(item), stripLists(now));
          if (onlyLists) walk(item, now, [...path, key, `#${item.id}`]);
          else out.edited.push({path: [...path, key], before: item, after: now});
        }
      // Session AL (NB-081, found on the production build): a plain object new on one side (Health's `daily` on a device's
      // first water entry) is walked against an empty one, so its new or removed items are still seen and undone.
      } else walk(bv === undefined && isPlain(av) ? {} : bv, av === undefined && isPlain(bv) ? {} : av, [...path, key]);
    }
  };
  walk(before, after, []);
  return out.removed.length || out.added.length || out.edited.length ? out : null;
}
const stripLists = (item: Plain) => Object.fromEntries(Object.entries(item).filter(([, v]) => !idList(v)));

/**
 * The latest record with `changes` reversed: added items taken out, removed items put back where they were, edited
 * items set back to how they were — but only an item still as the save left it; one changed since is kept and counted
 * in `kept`. The latest record is never changed in place.
 */
export function revertItemChanges<T>(latest: T, changes: ItemChanges): {record: T; kept: number} {
  let next = structuredClone(latest) as unknown, kept = 0;
  const listAt = (root: unknown, path: string[]): unknown[] | null => {
    let at: unknown = root;
    for (const key of path) at = key.startsWith('#') ? (Array.isArray(at) ? at.find(x => isPlain(x) && x.id === key.slice(1)) : undefined) : isPlain(at) ? at[key] : undefined;
    return Array.isArray(at) ? at : null;
  };
  for (const a of changes.added) {
    const list = listAt(next, a.path), at = list ? list.findIndex(x => isPlain(x) && x.id === a.item.id) : -1;
    if (list && at >= 0) list.splice(at, 1);
  }
  for (const e of changes.edited) {
    const list = listAt(next, e.path), at = list ? list.findIndex(x => isPlain(x) && x.id === e.after.id) : -1;
    if (!list || at < 0) continue;
    if (sameValue(list[at], e.after)) list[at] = structuredClone(e.before); else kept++;
  }
  next = reinsertItems(next, changes.removed);
  return {record: next as T, kept};
}
