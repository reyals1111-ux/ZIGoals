import * as z from 'zod';
import type {DeviceRecordSpec} from './device-record';
import {marketRefKey} from './market-assets';
import {favouriteSchema} from './positions';

/**
 * Session AL sweep 3 (C-TK-20): favourites beyond the 8 the synced Wealth record holds. The synced `watchlist` keeps its
 * bound of 8 (lib/positions.ts: a longer list would make an older build refuse the whole record), so the extra ones live
 * on this device, in their own versioned, loose key: {version: 1, items: [{ref, name, symbol}]}, newest last. Each item
 * is read on its own; one this build cannot read is dropped, never the list. Markets shows both lists as one.
 */
export const WATCHLIST_MORE_KEY = 'zigoals:markets-watchlist-more:v1';
export const MORE_MAX = 42, SYNCED_MAX = 8;
export type Favourite = z.infer<typeof favouriteSchema>;
const items = z.array(z.unknown()).catch([]).transform(list => {
  const seen = new Set<string>(), kept: Favourite[] = [];
  for (const raw of list) { const item = favouriteSchema.safeParse(raw); if (!item.success) continue; const key = marketRefKey(item.data.ref); if (seen.has(key)) continue; seen.add(key); kept.push(item.data); }
  return kept.slice(0, MORE_MAX);
});
export const watchlistMoreSchema = z.looseObject({version: z.literal(1), items});
export type WatchlistMore = z.infer<typeof watchlistMoreSchema>;
export const WATCHLIST_MORE: DeviceRecordSpec<WatchlistMore> = {key: WATCHLIST_MORE_KEY, schema: watchlistMoreSchema, empty: () => ({version: 1, items: []})};

/** Every favourite, the synced ones first; an extra that is also synced is listed once. */
export function allFavourites(synced: readonly Favourite[], more: readonly Favourite[]): Favourite[] {
  const keys = new Set(synced.map(f => marketRefKey(f.ref)));
  return [...synced, ...more.filter(f => !keys.has(marketRefKey(f.ref)))];
}
export const favouriteTotal = (synced: readonly Favourite[], more: readonly Favourite[]) => allFavourites(synced, more).length;
export const FAVOURITES_MAX = SYNCED_MAX + MORE_MAX;
/** Adds one extra favourite (only once the synced 8 are full; the caller checks). */
export function addMore(more: WatchlistMore, synced: readonly Favourite[], asset: Favourite): WatchlistMore {
  const key = marketRefKey(asset.ref);
  if (synced.some(f => marketRefKey(f.ref) === key) || more.items.some(f => marketRefKey(f.ref) === key)) return more;
  if (favouriteTotal(synced, more.items) >= FAVOURITES_MAX) throw Error(`Your favourites are full (${FAVOURITES_MAX} of ${FAVOURITES_MAX}). Remove one to add another.`);
  return watchlistMoreSchema.parse({...more, items: [...more.items, {ref: asset.ref, name: asset.name, symbol: asset.symbol}]});
}
export function removeMore(more: WatchlistMore, key: string): WatchlistMore {
  return watchlistMoreSchema.parse({...more, items: more.items.filter(f => marketRefKey(f.ref) !== key)});
}
/** Undo: puts a removed extra back where it was. */
export function reinsertMore(more: WatchlistMore, item: Favourite, at: number): WatchlistMore {
  if (more.items.some(f => marketRefKey(f.ref) === marketRefKey(item.ref))) return more;
  const items = [...more.items]; items.splice(Math.max(0, Math.min(at, items.length)), 0, item);
  return watchlistMoreSchema.parse({...more, items});
}
export const isMore = (more: readonly Favourite[], key: string) => more.some(f => marketRefKey(f.ref) === key);
