import * as z from 'zod';

/**
 * "Use my own Spotify app" (Session AK, owner decision MUSIC): a person who registered their own app in Spotify's
 * developer dashboard keeps its Client ID on this device only, in its own IndexedDB database (`zigoals-music-byo-v1`,
 * one record). Never synced, never exported, never sent to ZIGoals' server: it is used only by the browser's own PKCE
 * connection (lib/music/spotify/oauth.ts) and, on this device, it wins over the site's id. A Client ID is public (it is
 * part of every authorize address), so it is stored as it is; "Remove my client id" deletes the whole database.
 */
export const BYO_SPOTIFY_DATABASE = 'zigoals-music-byo-v1';
const STORE = 'byo', SLOT = 'spotify', LIMIT_MS = 3000;
/** Spotify Client IDs: exactly 32 lowercase hexadecimal characters (the site's rule, `validClientId`, in lower case). */
export const validByoClientId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);
/** What a person pastes, tidied: spaces around it removed and letters lowered (Spotify shows the id in lower case). */
export const tidyClientId = (input: string) => input.trim().toLowerCase();
const recordSchema = z.looseObject({version: z.literal(1), clientId: z.string().refine(validByoClientId), savedAt: z.iso.datetime()});
export type ByoRecord = z.infer<typeof recordSchema>;
/** Where the record lives; IndexedDB in the app, an in-memory one in tests. */
export type ByoAdapter = {read(): Promise<unknown>; write(record: ByoRecord): Promise<void>; forget(): Promise<void>};

function limited<T>(work: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('This device’s storage did not answer in time.')), LIMIT_MS);
    work.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
const available = () => typeof indexedDB !== 'undefined' && !!indexedDB;
function open(create: boolean): Promise<IDBDatabase | null> {
  return limited(new Promise<IDBDatabase | null>((resolve, reject) => {
    let missing = false, request: IDBOpenDBRequest;
    try { request = indexedDB.open(BYO_SPOTIFY_DATABASE, 1); } catch (error) { reject(error); return; }
    request.onupgradeneeded = event => {
      // Reading never creates the database: a device that never saved an id keeps none.
      if (!create && event.oldVersion === 0) { missing = true; request.transaction?.abort(); return; }
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onerror = event => { if (missing) { event.preventDefault(); resolve(null); } else reject(request.error); };
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
  }));
}
const answer = <T,>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
export const indexedDbByoAdapter: ByoAdapter = {
  async read() {
    if (!available()) return null;
    if (typeof indexedDB.databases === 'function' && !(await limited(indexedDB.databases())).some(d => d.name === BYO_SPOTIFY_DATABASE)) return null;
    const db = await open(false);
    if (!db) return null;
    try { return db.objectStoreNames.contains(STORE) ? await limited(answer(db.transaction(STORE, 'readonly').objectStore(STORE).get(SLOT))) : null; } finally { db.close(); }
  },
  async write(record) {
    if (!available()) throw Error('This browser has no storage for it (IndexedDB is unavailable).');
    const db = await open(true);
    if (!db) throw Error('This device’s storage refused it.');
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record, SLOT);
      await limited(new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error ?? Error('This device’s storage refused it.')); }));
    } finally { db.close(); }
  },
  async forget() {
    if (!available()) return;
    await limited(new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(BYO_SPOTIFY_DATABASE);
      request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
      // Another tab holds it open: it closes on versionchange, and the delete then completes.
      request.onblocked = () => undefined;
    }));
  },
};

/** Tells every reader on the page that the person's own id changed (components/music/music-config.ts listens). */
export const BYO_CHANGE_EVENT = 'zigoals:music-byo-change';
const changed = () => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(BYO_CHANGE_EVENT)); };
/** The person's own Client ID on this device, or null (none, unreadable, or not a valid id). */
export async function readByoSpotify(adapter: ByoAdapter = indexedDbByoAdapter): Promise<string | null> {
  try { const parsed = recordSchema.safeParse(await adapter.read()); return parsed.success ? parsed.data.clientId : null; } catch { return null; }
}
/** Saves the person's own Client ID (tidied, then checked); throws with a plain message, nothing saved, when it is not one. */
export async function saveByoSpotify(input: string, adapter: ByoAdapter = indexedDbByoAdapter, now = new Date()): Promise<string> {
  const clientId = tidyClientId(input);
  if (!validByoClientId(clientId)) throw Error('That is not a Spotify Client ID: it is 32 letters a–f and digits, shown under your app’s Basic Information.');
  await adapter.write({version: 1, clientId, savedAt: now.toISOString()});
  changed();
  return clientId;
}
/** "Remove my client id": deletes the database. */
export async function forgetByoSpotify(adapter: ByoAdapter = indexedDbByoAdapter): Promise<void> {
  await adapter.forget();
  changed();
}
