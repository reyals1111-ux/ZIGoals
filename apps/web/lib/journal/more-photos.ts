import {MAX_ENTRY_PHOTOS, MAX_ENTRY_PHOTOS_ALL, type JournalEntry} from './schema';
import {JOURNAL_PHOTO_MAX_BYTES, MAX_JOURNAL_MEDIA} from './media';

/**
 * Session AV lane 2 (r4-mind; LEDGER #317, Journey's more photos in an entry): up to 12 photos an entry. The first four
 * stay in `photos`, where every build reads them; photos five to twelve go in `morePhotos` (an older build would drop a
 * `photos` list longer than four whole). Taking a photo off moves the next one up, so `photos` stays the first four.
 * Before photos are kept, the room on this device is checked: the journal media store's 400 files, and the browser's
 * storage quota where it says. Pure, except `photoRoom`, which reads the store and the quota.
 */
type Photos = Pick<JournalEntry, 'photos' | 'morePhotos'>;
/** Every photo of an entry, in order. */
export const entryPhotos = (e: Photos): string[] => [...(e.photos ?? []), ...(e.morePhotos ?? [])];
/** The entry's photo fields for a list of ids: the first four in `photos`, the next eight in `morePhotos`; none left out empty. */
export function splitPhotos(ids: readonly string[]): {photos?: string[]; morePhotos?: string[]} {
  const all = ids.slice(0, MAX_ENTRY_PHOTOS_ALL), photos = all.slice(0, MAX_ENTRY_PHOTOS), morePhotos = all.slice(MAX_ENTRY_PHOTOS);
  return {...(photos.length ? {photos} : {}), ...(morePhotos.length ? {morePhotos} : {})};
}
/** The entry with its photos set to `ids` (both fields written anew; an empty field leaves the entry). */
export function withPhotos<E extends Photos>(e: E, ids: readonly string[]): E {
  const {photos: _p, morePhotos: _m, ...rest} = e; void _p; void _m;
  return {...rest, ...splitPhotos(ids)} as E;
}
/** The entry with one photo taken off (the next moves up). */
export const withoutPhoto = <E extends Photos>(e: E, id: string): E => withPhotos(e, entryPhotos(e).filter(x => x !== id));

export type Room = {ok: true} | {ok: false; reason: string};
/**
 * Whether `adding` more photos fit on this device: the journal media store holds at most 400 photos and voice notes, and
 * the browser's quota (navigator.storage.estimate, where there is one) must keep room for them at their largest
 * (200 kB each) with a margin. Says why not in plain words.
 */
export async function photoRoom(scope: string, adding: number, deps: {count?: (scope: string) => Promise<number>; estimate?: () => Promise<{usage?: number; quota?: number}> | null} = {}): Promise<Room> {
  if (adding <= 0) return {ok: true};
  const count = deps.count ?? (async (s: string) => (await (await import('./media')).journalMediaIds(s)).length);
  let have = 0;
  try { have = await count(scope); } catch { have = 0; }
  if (have + adding > MAX_JOURNAL_MEDIA) return {ok: false, reason: `This device keeps at most ${MAX_JOURNAL_MEDIA} journal photos and voice notes, and ${have} are kept. Take some off older entries first, or add ${Math.max(0, MAX_JOURNAL_MEDIA - have)} at most.`};
  let est: {usage?: number; quota?: number} | null = null;
  try { est = await (deps.estimate ? deps.estimate() : typeof navigator !== 'undefined' && navigator.storage?.estimate ? navigator.storage.estimate() : null); } catch { est = null; }
  if (est && typeof est.quota === 'number' && typeof est.usage === 'number' && est.quota > 0 && est.usage + adding * JOURNAL_PHOTO_MAX_BYTES > est.quota * 0.9)
    return {ok: false, reason: 'This browser’s storage for ZIGoals is nearly full, so these photos are not kept. Export everything first, then take photos off older entries.'};
  return {ok: true};
}
