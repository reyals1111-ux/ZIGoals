import * as z from 'zod';
import {TOKEN_PATTERN} from './oauth';
import {revokeToken} from './lichess';

/**
 * Session AK (ADR-036 Q8, lane C; device-only storage): the Lichess token, in its own IndexedDB database
 * `zigoals-lichess-v1`, apart from every other record: never synced, never in Export everything or a backup, never
 * logged, and sent only to https://lichess.org in the Authorization header. With it, the account name Lichess gave, so
 * the page can tell the person's colour. `forgetLichess()` deletes the database first (so the device forgets it even
 * offline), then asks Lichess to revoke the token. A browser without IndexedDB cannot connect (the page says so).
 */
export const LICHESS_DATABASE = 'zigoals-lichess-v1';
const STORE = 'connection', KEY = 'lichess';
export const lichessConnectionSchema = z.strictObject({
  version: z.literal(1),
  accessToken: z.string().regex(TOKEN_PATTERN),
  expiresAt: z.iso.datetime().nullable(),
  connectedAt: z.iso.datetime(),
  account: z.strictObject({id: z.string().min(1).max(40), username: z.string().min(1).max(40)}).nullable(),
});
export type LichessConnection = z.infer<typeof lichessConnectionSchema>;
const answer = <T,>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
export const lichessStorageAvailable = () => typeof indexedDB !== 'undefined';
function open(): Promise<IDBDatabase | null> {
  if (!lichessStorageAvailable()) return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      const request = indexedDB.open(LICHESS_DATABASE, 1);
      request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
      request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
    } catch { resolve(null); }
  });
}
/** The kept connection; null when there is none, it cannot be read, or it has expired. */
export async function readLichessConnection(now = Date.now()): Promise<LichessConnection | null> {
  const db = await open(); if (!db) return null;
  try {
    const parsed = lichessConnectionSchema.safeParse(await answer(db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)));
    if (!parsed.success) return null;
    return parsed.data.expiresAt && Date.parse(parsed.data.expiresAt) <= now ? null : parsed.data;
  } catch { return null; } finally { db.close(); }
}
export async function saveLichessConnection(value: LichessConnection): Promise<void> {
  const record = lichessConnectionSchema.parse(value), db = await open();
  if (!db) throw new Error('This browser cannot keep a Lichess connection (no IndexedDB).');
  try { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(record, KEY); await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); }); }
  finally { db.close(); }
}
function deleteDatabase(): Promise<void> {
  if (!lichessStorageAvailable()) return Promise.resolve();
  return new Promise(resolve => { try { const r = indexedDB.deleteDatabase(LICHESS_DATABASE); r.onsuccess = r.onerror = r.onblocked = () => resolve(); } catch { resolve(); } });
}
/** Forgets Lichess on this device (the whole database) and revokes the token at Lichess when it can be reached. */
export async function forgetLichess(fetcher: typeof fetch = fetch): Promise<{hadToken: boolean; revoked: boolean}> {
  const kept = await readLichessConnection(Number.NEGATIVE_INFINITY).catch(() => null);
  await deleteDatabase();
  if (!kept) return {hadToken: false, revoked: false};
  return {hadToken: true, revoked: await revokeToken(kept.accessToken, fetcher)};
}
