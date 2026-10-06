import {LABELS_DB, LABELS_STORE, type LabelRow} from './labels';

/**
 * The opted-in reminder names table (Session V Part 13; lib/push/labels.ts says what and why): written by the page
 * only, replaced as a whole on every refresh, and deleted when the person turns the names, push or the account off.
 * The push service worker reads it and nothing else. Never throws: a browser that refuses IndexedDB keeps the generic
 * text, which is always the fallback.
 */
const done = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LABELS_DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(LABELS_STORE)) request.result.createObjectStore(LABELS_STORE, {keyPath: 'id'}); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('blocked'));
  });
}
/** Replaces the table with these rows; an empty list deletes it. */
export async function writePushLabels(rows: readonly LabelRow[]): Promise<void> {
  if (!rows.length) return clearPushLabels();
  try {
    const db = await open();
    try { const tx = db.transaction(LABELS_STORE, 'readwrite'), store = tx.objectStore(LABELS_STORE); store.clear(); for (const row of rows) store.put(row); await done(tx); }
    finally { db.close(); }
  } catch { await clearPushLabels(); }
}
/** Deletes the table when it exists; a device that never opted in is left untouched (nothing is created or opened). */
export async function clearPushLabels(): Promise<void> {
  try {
    if (typeof indexedDB === 'undefined') return;
    const list = typeof indexedDB.databases === 'function' ? await indexedDB.databases().catch(() => null) : null;
    if (list && !list.some(db => db.name === LABELS_DB)) return;
    await new Promise<void>(resolve => { const request = indexedDB.deleteDatabase(LABELS_DB); request.onsuccess = request.onerror = request.onblocked = () => resolve(); });
  } catch { /* nothing to delete */ }
}
