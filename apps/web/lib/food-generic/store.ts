import type {GenericSourceFile} from './load';

/**
 * Session AK (Part 1c; `TIER 3 (stored format)`): the generic-food library kept on this device for offline search, in its
 * own IndexedDB database `zigoals-food-generic-v1` (one store; one record per source and dataset version, keyed
 * `<source>@<datasetVersion>`: its format version, the file's SHA-256, when it was saved, and the parsed file). Public data
 * only (food names and nutrient values from CIQUAL, CoFID and Fineli), never personal; never synced or exported; the
 * account erase and "Erase everything" delete the database with the others (forgetGenericFoods). A browser without
 * IndexedDB keeps the library in memory only (load.ts), as market-catalog-store.ts does for the coin catalog.
 */
export const GENERIC_FOOD_DATABASE = 'zigoals-food-generic-v1';
const STORE = 'sources';
export type StoredGenericSource = {version: 1; source: string; datasetVersion: string; sha256: string; savedAt: number; data: GenericSourceFile};
export const storedKey = (source: string, datasetVersion: string) => `${source}@${datasetVersion}`;
const answer = <T,>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      const request = indexedDB.open(GENERIC_FOOD_DATABASE, 1);
      request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
      request.onerror = () => resolve(null);
      request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
    } catch { resolve(null); }
  });
}
/** The kept copy of one source at one dataset version, or null (none, another shape, or no IndexedDB). */
export async function readStoredSource(source: string, datasetVersion: string): Promise<StoredGenericSource | null> {
  const db = await open(); if (!db) return null;
  try {
    const value = await answer(db.transaction(STORE, 'readonly').objectStore(STORE).get(storedKey(source, datasetVersion))) as StoredGenericSource | undefined;
    return value && value.version === 1 && value.source === source && value.datasetVersion === datasetVersion && typeof value.sha256 === 'string' && typeof value.savedAt === 'number' && value.data && typeof value.data === 'object' ? value : null;
  } catch { return null; } finally { db.close(); }
}
/** Keeps a source's copy and drops its other dataset versions, so an update never leaves the old one behind. */
export async function writeStoredSource(value: StoredGenericSource): Promise<void> {
  const db = await open(); if (!db) return;
  try {
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE), key = storedKey(value.source, value.datasetVersion);
    const keys = await answer(store.getAllKeys()) as IDBValidKey[];
    for (const old of keys) if (typeof old === 'string' && old.startsWith(value.source + '@') && old !== key) store.delete(old);
    await answer(store.put(value, key));
  } catch { /* memory only this time */ } finally { db.close(); }
}
/** The account erase and "Erase everything" (with the other IndexedDB databases). */
export function forgetGenericFoods(): Promise<void> {
  if (typeof indexedDB === 'undefined') return Promise.resolve();
  return new Promise(resolve => { try { const r = indexedDB.deleteDatabase(GENERIC_FOOD_DATABASE); r.onsuccess = r.onerror = r.onblocked = () => resolve(); } catch { resolve(); } });
}
