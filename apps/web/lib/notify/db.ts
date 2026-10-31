/**
 * Session AK Part 2 (ADR-036 A1; `TIER 3 (stored format)`): the two device-only IndexedDB databases the service worker
 * shares with the page, because a service worker cannot read localStorage.
 * - `zigoals-notify-v1`, store `kv`: `snapshot` (the next 48 hours of due items, lib/notify/plan.ts), `device` (this
 *   device's random push id and secret — a credential, never exported or synced) and `registration` (the last wake list
 *   sent, so the service worker can add a snooze while ZIGoals is closed).
 * - `zigoals-notify-actions-v1`, store `actions`: "Done" and "Snooze 1 h" taps, and price alerts the service worker saw
 *   cross, waiting for the page to apply them once with the normal Undo record.
 * Both are erased by Erase everything (lib/erase-everything.ts) and listed in the data catalog; neither is exported (the
 * snapshot is rebuilt from the records; the queue is applied, not kept).
 */
export const NOTIFY_DB = 'zigoals-notify-v1', NOTIFY_ACTIONS_DB = 'zigoals-notify-actions-v1';
export type QueuedAction = {actionId: string; type: 'done' | 'snooze' | 'price-fired'; at: number; date?: string | null; items?: {kind: string; id: string; at: number}[]; alertId?: string; applied?: number};

function open(name: string, store: string, keyPath?: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(Error('IndexedDB is not available.')); return; }
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store, keyPath ? {keyPath} : undefined); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? Error('IndexedDB refused.'));
    request.onblocked = () => reject(Error('IndexedDB is blocked.'));
  });
}
async function run<T>(name: string, store: string, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T> | void, keyPath?: string): Promise<T | undefined> {
  const db = await open(name, store, keyPath);
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(store, mode), request = work(tx.objectStore(store));
      tx.oncomplete = () => resolve(request ? request.result : undefined);
      tx.onerror = () => reject(tx.error ?? Error('IndexedDB transaction failed.'));
      tx.onabort = () => reject(tx.error ?? Error('IndexedDB transaction aborted.'));
    });
  } finally { db.close(); }
}
export const kvGet = <T>(key: 'snapshot' | 'device' | 'registration') => run<T>(NOTIFY_DB, 'kv', 'readonly', s => s.get(key) as IDBRequest<T>);
export const kvPut = (key: 'snapshot' | 'device' | 'registration', value: unknown) => run(NOTIFY_DB, 'kv', 'readwrite', s => { s.put(value, key); });
export const kvDelete = (key: 'snapshot' | 'device' | 'registration') => run(NOTIFY_DB, 'kv', 'readwrite', s => { s.delete(key); });
export const readActions = async (): Promise<QueuedAction[]> => (await run<QueuedAction[]>(NOTIFY_ACTIONS_DB, 'actions', 'readonly', s => s.getAll() as IDBRequest<QueuedAction[]>, 'actionId')) ?? [];
export const putAction = (action: QueuedAction) => run(NOTIFY_ACTIONS_DB, 'actions', 'readwrite', s => { s.put(action); }, 'actionId');
/**
 * Claims an action for this tab: in ONE read-write transaction, the action is read and, only when it is still unapplied,
 * marked applied. IndexedDB runs read-write transactions on a store one at a time, so two tabs can never both claim it.
 */
export async function claimAction(actionId: string, now: number): Promise<boolean> {
  const db = await open(NOTIFY_ACTIONS_DB, 'actions', 'actionId');
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction('actions', 'readwrite'), store = tx.objectStore('actions'), get = store.get(actionId);
      let claimed = false;
      get.onsuccess = () => { const found = get.result as QueuedAction | undefined; if (found && found.applied === undefined) { store.put({...found, applied: now}); claimed = true; } };
      tx.oncomplete = () => resolve(claimed);
      tx.onerror = tx.onabort = () => reject(tx.error ?? Error('IndexedDB transaction failed.'));
    });
  } finally { db.close(); }
}
/** Applied actions stay as markers for a day (so a second tab never applies one twice), then leave. */
export async function pruneActions(now: number): Promise<void> {
  const all = await readActions();
  const stale = all.filter(a => a.applied !== undefined && now - a.applied > 86_400_000 || now - a.at > 7 * 86_400_000);
  if (stale.length) await run(NOTIFY_ACTIONS_DB, 'actions', 'readwrite', s => { for (const a of stale) s.delete(a.actionId); }, 'actionId');
}
function remove(name: string): Promise<void> {
  return new Promise(resolve => {
    if (typeof indexedDB === 'undefined') { resolve(); return; }
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  });
}
/** Erase everything and turning notifications off: both databases leave this device. */
export async function forgetNotifyDatabases(): Promise<void> { await remove(NOTIFY_DB); await remove(NOTIFY_ACTIONS_DB); }
