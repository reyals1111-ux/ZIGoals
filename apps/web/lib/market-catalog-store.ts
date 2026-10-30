import type {MarketCatalogAsset} from './market-assets';

/**
 * Session AJ (item 5, WE16; D8; `TIER 3 (stored format)`): the coin catalog kept on this device for offline search, in
 * its own IndexedDB database `zigoals-market-catalog-v1` (one record: its version, when it was saved, and the rows).
 * Public data only (names and tickers from CoinGecko's list), never personal; never synced or exported; the account
 * erase and "Erase everything" delete the database with the others. A browser without IndexedDB simply keeps the
 * catalog in memory, as before.
 */
export const MARKET_CATALOG_DATABASE = 'zigoals-market-catalog-v1';
const STORE = 'catalog', KEY = 'current';
export type StoredCatalog = {version: 1; catalogVersion: string; savedAt: number; assets: MarketCatalogAsset[]};
const answer = <T,>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      const request = indexedDB.open(MARKET_CATALOG_DATABASE, 1);
      request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
      request.onerror = () => resolve(null);
      request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
    } catch { resolve(null); }
  });
}
export async function readStoredCatalog(): Promise<StoredCatalog | null> {
  const db = await open(); if (!db) return null;
  try {
    const value = await answer(db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)) as StoredCatalog | undefined;
    return value && value.version === 1 && typeof value.catalogVersion === 'string' && Array.isArray(value.assets) && typeof value.savedAt === 'number' ? value : null;
  } catch { return null; } finally { db.close(); }
}
export async function writeStoredCatalog(value: StoredCatalog): Promise<void> {
  const db = await open(); if (!db) return;
  try { await answer(db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, KEY)); } catch { /* memory only this time */ } finally { db.close(); }
}
/** The account erase and "Erase everything" (with the other IndexedDB databases). */
export function forgetStoredCatalog(): Promise<void> {
  if (typeof indexedDB === 'undefined') return Promise.resolve();
  return new Promise(resolve => { try { const r = indexedDB.deleteDatabase(MARKET_CATALOG_DATABASE); r.onsuccess = r.onerror = r.onblocked = () => resolve(); } catch { resolve(); } });
}
