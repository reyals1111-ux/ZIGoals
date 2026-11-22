import {MAX_PLACE_PAYEES, MAX_PLACES, type MoneyMore, type PayeePlace} from '../money-more/schema';
import type {MoneyEntry} from './schema';
import {noteKey, pastCategory, payeePart} from './suggest';

/**
 * Session AV lane 2, round 4 (money; Actual's payee locations, LEDGER #346, by the owner's note: typed place names only):
 * the person names their places ("Work", "The market", "Mum's town") and, choosing one while logging, sees the payees
 * they logged there first; a payee logged with a place chosen is kept with that place. No location is ever read, no
 * coordinates are kept, no map and no outside service is used: a place is the name the person typed. Places live on the
 * money extras record (`places`), never on an entry; "Forget places" clears them all. Pure.
 */
const same = (a: string, b: string) => noteKey(a) === noteKey(b) && noteKey(a) !== '';
export const placesOf = (more: Pick<MoneyMore, 'places'> | null | undefined): readonly PayeePlace[] => more?.places ?? [];
export function addPlace(more: MoneyMore, name: string, id: string): MoneyMore {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) throw new Error('Type a name for the place, for example Work or The market.');
  if (clean.length > 40) throw new Error('A place name has at most 40 characters.');
  const list = placesOf(more);
  const twin = list.find(p => p.name.toLowerCase() === clean.toLowerCase());
  if (twin) throw new Error(`${twin.name} is already one of your places.`);
  if (list.length >= MAX_PLACES) throw new Error(`Up to ${MAX_PLACES} places.`);
  return {...more, places: [...list, {id, name: clean}]};
}
export function removePlace(more: MoneyMore, id: string): MoneyMore {
  const list = placesOf(more).filter(p => p.id !== id);
  if (list.length) return {...more, places: list};
  const {places: _p, ...rest} = more; void _p;
  return rest;
}
/** "Forget places": every place and every payee kept with one, gone from this device. */
export function forgetPlaces(more: MoneyMore): MoneyMore {
  const {places: _p, ...rest} = more; void _p;
  return rest;
}
/** Keeps a payee (the part of a note before " · ") with a place, newest first, once (ignoring case and accents), at most 40. */
export function keepPayeeAt(more: MoneyMore, placeId: string, note: string): MoneyMore {
  const payee = payeePart(note).slice(0, 60).trim();
  if (!payee || !placesOf(more).some(p => p.id === placeId)) return more;
  return {...more, places: placesOf(more).map(p => p.id !== placeId ? p : {...p, payees: [payee, ...(p.payees ?? []).filter(x => !same(x, payee))].slice(0, MAX_PLACE_PAYEES)})};
}
export function forgetPayeeAt(more: MoneyMore, placeId: string, payee: string): MoneyMore {
  return {...more, places: placesOf(more).map(p => p.id !== placeId ? p : {...p, payees: (p.payees ?? []).filter(x => !same(x, payee))})};
}
export type PlacePayee = {payee: string; times: number; category: string | null};
/**
 * The payees kept with a place, the most logged first (counted from the log's own entries of that kind with that payee;
 * ties: the newest kept first), each with the category it had before (`pastCategory`), at most `n`.
 */
export function payeesAt(more: Pick<MoneyMore, 'places'> | null | undefined, placeId: string, entries: readonly MoneyEntry[], kind: MoneyEntry['kind'], n = 6): PlacePayee[] {
  const place = placesOf(more).find(p => p.id === placeId);
  if (!place?.payees?.length) return [];
  const counts = new Map<string, number>();
  for (const e of entries) if (e.kind === kind && e.note) { const k = noteKey(payeePart(e.note)); if (k) counts.set(k, (counts.get(k) ?? 0) + 1); }
  return place.payees.map((payee, i) => ({payee, i, times: counts.get(noteKey(payee)) ?? 0}))
    .sort((a, b) => b.times - a.times || a.i - b.i).slice(0, n)
    .map(({payee, times}) => ({payee, times, category: pastCategory(entries, kind, payee)?.category ?? null}));
}
