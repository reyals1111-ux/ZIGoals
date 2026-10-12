import {getAppStorage} from './showcase-storage';
import {AA_PERSONAL_KEYS} from './aa-device-keys';
import {ZIGI_STORE_EVENT} from './ai/store/keys';
/**
 * Session AA-Local (ADR-022 B1): what the account's erase removes of this session's device keys (every personal one;
 * the macro mode is a display preference and stays). Never throws: a storage that refuses keeps the key.
 */
export function forgetAaDeviceRecords(storage: Pick<Storage, 'removeItem'> | null = null): void {
  let target = storage;
  try { target ??= getAppStorage(); } catch { return; }
  for (const key of AA_PERSONAL_KEYS) { try { target.removeItem(key); } catch { /* kept */ } }
  try { for (const key of AA_PERSONAL_KEYS) window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: key})); } catch { /* no window */ }
  // Gate B F3: the progress-photo bytes live in IndexedDB beside the index key; the erase removes the database as a whole (every scope on this device).
  try { if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase('zigoals-progress-photos'); } catch { /* no IndexedDB: nothing was stored there */ }
}
