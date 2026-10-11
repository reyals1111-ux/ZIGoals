/**
 * Personal page layouts: the order of movable cards per page and region, saved per device.
 * Stores only page IDs, region IDs, card IDs and order. Entity cards (Goals, Habits, holdings) use a hashed
 * ID from entityLayoutId, so no names, keys or addresses are written. Not synced and not part of backups.
 * Loading is tolerant: corrupt or oversized data falls back to defaults, unknown IDs are ignored and new
 * cards appear in their default spot. Nothing here throws on bad input.
 */
export const LAYOUT_KEY = 'zigoals:layout:v1';
const ID_PATTERN = /^[A-Za-z0-9:._-]{1,120}$/;
const RESERVED = new Set(['__proto__', 'constructor', 'prototype']);
const ID = { test: (id: string) => ID_PATTERN.test(id) && !RESERVED.has(id) };
const MAX_PAGES = 40, MAX_REGIONS = 40, MAX_IDS = 300, MAX_BYTES = 200_000;

export type RegionLayout = { order: string[] };
export type PageLayout = Record<string, RegionLayout>;
export type Layout = { version: 1; pages: Record<string, PageLayout> };

export const emptyLayout = (): Layout => ({ version: 1, pages: {} });
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Parses stored layout JSON. Invalid pages, regions or IDs are dropped individually; anything unreadable yields the empty layout. */
export function parseLayout(raw: string | null | undefined): Layout {
  if (typeof raw !== 'string' || raw.length > MAX_BYTES) return emptyLayout();
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return emptyLayout(); }
  if (!plain(value) || value.version !== 1 || !plain(value.pages)) return emptyLayout();
  const pages: Record<string, PageLayout> = {};
  for (const [page, regions] of Object.entries(value.pages).slice(0, MAX_PAGES)) {
    if (!ID.test(page) || !plain(regions)) continue;
    const result: PageLayout = {};
    for (const [region, entry] of Object.entries(regions).slice(0, MAX_REGIONS)) {
      if (!ID.test(region) || !plain(entry) || !Array.isArray(entry.order)) continue;
      const order = [...new Set(entry.order.filter((id): id is string => typeof id === 'string' && ID.test(id)))].slice(0, MAX_IDS);
      result[region] = { order };
    }
    if (Object.keys(result).length) pages[page] = result;
  }
  return { version: 1, pages };
}
export const serializeLayout = (layout: Layout) => JSON.stringify(layout);

export function savedOrder(layout: Layout, page: string, region: string): string[] | undefined {
  const regions = own(layout.pages, page) ? layout.pages[page] : undefined;
  return regions && own(regions, region) ? regions[region]!.order : undefined;
}

/**
 * The display order: saved IDs that still exist keep their saved order; unknown saved IDs are ignored; a card
 * the saved order has never seen goes right after its nearest preceding default neighbour (or first).
 */
export function resolveOrder(defaults: readonly string[], saved?: readonly string[]): string[] {
  const present = new Set(defaults);
  if (!saved?.length) return [...defaults];
  const result = saved.filter((id, i) => present.has(id) && saved.indexOf(id) === i);
  const placed = new Set(result);
  defaults.forEach((id, i) => {
    if (placed.has(id)) return;
    let at = 0;
    for (let j = i - 1; j >= 0; j--) { const k = result.indexOf(defaults[j]!); if (k >= 0) { at = k + 1; break; } }
    result.splice(at, 0, id);
    placed.add(id);
  });
  return result;
}

/** Moves one ID to a new index in a list; out-of-range targets clamp; an unknown ID leaves the list unchanged. */
export function moveInList(order: readonly string[], id: string, to: number): string[] {
  const from = order.indexOf(id);
  if (from < 0) return [...order];
  const next = order.filter(x => x !== id);
  next.splice(Math.max(0, Math.min(next.length, Math.round(to))), 0, id);
  return next;
}

/**
 * Moves an ID within the visible subset of a full order (e.g. a filtered Goal view). Hidden cards keep their
 * slots; the visible cards are re-dealt into the slots the visible set occupied.
 */
export function moveWithinSubset(full: readonly string[], visible: readonly string[], id: string, to: number): string[] {
  const shown = full.filter(x => visible.includes(x));
  if (!shown.includes(id)) return [...full];
  const reordered = moveInList(shown, id, to);
  let k = 0;
  return full.map(x => (visible.includes(x) ? reordered[k++]! : x));
}

/** Writes a region order. IDs saved earlier but absent now (a section that is temporarily not shown) keep their relative place. */
export function setRegionOrder(layout: Layout, page: string, region: string, order: readonly string[]): Layout {
  if (!ID.test(page) || !ID.test(region)) return layout;
  const clean = [...new Set(order.filter(id => ID.test(id)))];
  const previous = savedOrder(layout, page, region) ?? [];
  const merged = [...clean];
  previous.forEach((id, i) => {
    if (merged.includes(id)) return;
    let at = 0;
    for (let j = i - 1; j >= 0; j--) { const k = merged.indexOf(previous[j]!); if (k >= 0) { at = k + 1; break; } }
    merged.splice(at, 0, id);
  });
  const regions = { ...(own(layout.pages, page) ? layout.pages[page] : {}), [region]: { order: merged.slice(0, MAX_IDS) } };
  return { version: 1, pages: { ...layout.pages, [page]: regions } };
}

/** Forgets every saved order on one page; other pages are untouched. */
export function resetPage(layout: Layout, page: string): Layout {
  if (!own(layout.pages, page)) return layout;
  const pages = { ...layout.pages };
  delete pages[page];
  return { version: 1, pages };
}

/** A stable, non-reversible card ID for a record key (FNV-1a, 32-bit). Keys, names and addresses never reach storage. */
export function entityLayoutId(key: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { hash ^= key.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return `e${hash.toString(16).padStart(8, '0')}`;
}

/** Columns in a rendered grid: how many items share the first row. Used for up/down moves in grids. */
export function columnsFromTops(tops: readonly number[]): number {
  if (!tops.length) return 1;
  const first = tops[0]!;
  const n = tops.filter(t => Math.abs(t - first) < 4).length;
  return Math.max(1, n);
}
