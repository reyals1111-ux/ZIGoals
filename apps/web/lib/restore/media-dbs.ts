/**
 * Session AV lane 2 (review b1 #18; TIER 3 (stored formats), additive): the IndexedDB databases "Restore from a backup"
 * may add photos, voice notes and documents to (lib/restore/media.ts), each with its one object store, by the literal
 * names those stores use, and the one small reader and deleter the restore's Undo uses on them. No store module is
 * loaded here, so the undo record's schema and its Undo (lib/restore/apply.ts) stay light;
 * lib/restore/av2-restore-media.test.ts pins each name to its store's own constant.
 */
export const RESTORE_MEDIA_STORES = {
  'zigoals-task-attachments-v1': 'items',
  'zigoals-journal-media-v1': 'media',
  'zigoals-notes-photos-v1': 'photos',
  'zigoals-money-photos-v1': 'photos',
  'zigoals-meal-photos-v1': 'photos',
  'zigoals-food-photos-v1': 'photos',
  'zigoals-wealth-docs-v1': 'docs',
} as const;
export type RestoreMediaDb = keyof typeof RESTORE_MEDIA_STORES;
export const RESTORE_MEDIA_DBS = Object.keys(RESTORE_MEDIA_STORES) as [RestoreMediaDb, ...RestoreMediaDb[]];
/**
 * The folders of an Export everything ZIP that hold these files (lib/export/make-everything.ts), and the names a file in
 * them may have. Anything else under them is not read.
 */
export const MEDIA_ENTRY = /^(?:tasks\/attachments|journal\/(?:photos|audios)|notes\/photos|money-photos|meal-photos|food-photos|wealth-docs\/[0-9a-fA-F-]{8,40})\/[A-Za-z0-9_-]{1,240}\.(?:webp|jpe?g|webm|m4a|ogg|pdf)$/;
/** The largest file any of these stores keeps (a journal audio note, 3 MB); a larger entry is never read. */
export const MEDIA_MAX_BYTES = 3_000_000;

// One small IndexedDB reader for every store: each is version 1 with one object store keyed `<scope>:<id>`, opened the
// way the store opens it. A database a newer build moved on (another version) does not open here: counted, never touched.
function openStore(db: RestoreMediaDb): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('This browser cannot keep photos.')); return; }
    const req = indexedDB.open(db, 1), store = RESTORE_MEDIA_STORES[db];
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(store)) req.result.createObjectStore(store); };
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error ?? new Error('The store is unavailable.'));
  });
}
/** The ids this scope holds in a store (every key, whether its value reads or not, so nothing is ever written over). */
export async function mediaIds(db: RestoreMediaDb, scope: string): Promise<Set<string>> {
  const open = await openStore(db), store = RESTORE_MEDIA_STORES[db];
  return new Promise((resolve, reject) => {
    const t = open.transaction(store, 'readonly'), req = t.objectStore(store).getAllKeys();
    t.oncomplete = () => { open.close(); resolve(new Set(req.result.map(String).filter(k => k.startsWith(`${scope}:`)).map(k => k.slice(scope.length + 1)))); };
    t.onerror = () => { open.close(); reject(t.error ?? new Error('The store could not be read.')); };
  });
}
/** Undo: deletes exactly these ids of this scope from the store (an id no longer there is nothing to do). */
export async function removeMedia(db: RestoreMediaDb, scope: string, ids: readonly string[]): Promise<void> {
  if (!ids.length) return;
  const open = await openStore(db), store = RESTORE_MEDIA_STORES[db];
  await new Promise<void>((resolve, reject) => {
    const t = open.transaction(store, 'readwrite'), s = t.objectStore(store);
    for (const id of ids) s.delete(`${scope}:${id}`);
    t.oncomplete = () => { open.close(); resolve(); };
    t.onerror = () => { open.close(); reject(t.error ?? new Error('Not removed.')); };
    t.onabort = () => { open.close(); reject(t.error ?? new Error('Not removed.')); };
  });
}
/** Whether any of these ids is still in the store (for the Undo's "anything still as restored"). */
export async function anyMediaLeft(db: RestoreMediaDb, scope: string, ids: readonly string[]): Promise<boolean> {
  const held = await mediaIds(db, scope);
  return ids.some(id => held.has(id));
}
