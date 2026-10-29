import * as z from 'zod';

/**
 * Session AJ (item 36; D2b, A5; `TIER 3 (stored format)`): the watched Bitcoin extended public keys, in their own IndexedDB
 * database `zigoals-xpub-v1`, apart from every other record: never synced, never in Export everything or a backup, never
 * logged, never sent anywhere (only the addresses worked out from a key are, to mempool.space). Each entry keeps the key,
 * its kind, a name the person chose and the last balance read (with when). "Remove" deletes the entry; the account erase
 * and "Erase everything" delete the whole database. A browser without IndexedDB cannot watch a key (the page says so).
 */
export const XPUB_DATABASE = 'zigoals-xpub-v1';
const STORE = 'keys';
export const MAX_WATCHED = 10;
export const watchedEntrySchema = z.looseObject({
  id: z.string().regex(/^xpub_[A-Za-z0-9-]{8,60}$/),
  kind: z.enum(['xpub', 'ypub', 'zpub']),
  key: z.string().regex(/^[xyz]pub[1-9A-HJ-NP-Za-km-z]{96,116}$/),
  name: z.string().trim().min(1).max(60),
  addedAt: z.iso.datetime(),
  last: z.looseObject({at: z.iso.datetime(), sats: z.string().regex(/^\d{1,16}$/), used: z.number().int().min(0), scanned: z.number().int().min(0)}).optional(),
});
export type WatchedEntry = z.infer<typeof watchedEntrySchema>;
const answer = <T,>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      const request = indexedDB.open(XPUB_DATABASE, 1);
      request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, {keyPath: 'id'}); };
      request.onerror = () => resolve(null);
      request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
    } catch { resolve(null); }
  });
}
export const xpubStorageAvailable = () => typeof indexedDB !== 'undefined';
/** The watched keys; an entry this build cannot read is skipped (kept in the database as it is). */
export async function readWatched(): Promise<WatchedEntry[]> {
  const db = await open(); if (!db) return [];
  try { const all = await answer(db.transaction(STORE, 'readonly').objectStore(STORE).getAll()) as unknown[]; return all.flatMap(v => { const r = watchedEntrySchema.safeParse(v); return r.success ? [r.data] : []; }).sort((a, b) => a.addedAt.localeCompare(b.addedAt)); }
  catch { return []; } finally { db.close(); }
}
export async function putWatched(entry: WatchedEntry): Promise<void> {
  const value = watchedEntrySchema.parse(entry), db = await open();
  if (!db) throw new Error('This browser cannot keep a watched key (no IndexedDB).');
  try {
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE), all = await answer(store.getAll()) as {id?: string; key?: string}[];
    if (!all.some(e => e.id === value.id)) {
      if (all.some(e => e.key === value.key)) throw new Error('That key is already watched.');
      if (all.length >= MAX_WATCHED) throw new Error(`Up to ${MAX_WATCHED} keys can be watched; remove one first.`);
    }
    await answer(store.put(value));
  } finally { db.close(); }
}
export async function removeWatched(id: string): Promise<void> {
  const db = await open(); if (!db) return;
  try { await answer(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id)); } finally { db.close(); }
}
export const newWatchedId = () => `xpub_${crypto.randomUUID()}`;
