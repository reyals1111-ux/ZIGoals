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
