/**
 * Session AK Part 3 (ADR-036 Q4): network actions the person asked for while offline, kept on this device and offered
 * again when the connection is back — never run silently in their name. Device-only IndexedDB
 * `zigoals-offline-queue-v1` (erased by Erase everything and its offline step; never exported or synced). Holds only
 * what the action needs: a barcode for a food lookup, an exchange id for a balance refresh. At most 50 jobs, a week old
 * at most; the same job is kept once.
 * Sync pushes need no queue: the encrypted sync already tries again on focus, on reconnect and every 30 seconds.
 */
export const OFFLINE_QUEUE_DB = 'zigoals-offline-queue-v1';
export type OfflineJob = {id: string; kind: 'food-lookup' | 'exchange-refresh'; value: string; at: number};
const MAX = 50, AGE = 7 * 86_400_000;
export const validJob = (job: Pick<OfflineJob, 'kind' | 'value'>) => job.kind === 'food-lookup' ? /^\d{8,14}$/.test(job.value) : job.kind === 'exchange-refresh' ? /^[a-z0-9-]{1,40}$/.test(job.value) : false;
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(Error('IndexedDB is not available.')); return; }
    const request = indexedDB.open(OFFLINE_QUEUE_DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('jobs')) request.result.createObjectStore('jobs', {keyPath: 'id'}); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); request.onblocked = () => reject(Error('blocked'));
  });
}
async function tx<T>(mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  try { return await new Promise<T | undefined>((resolve, reject) => { const t = db.transaction('jobs', mode), r = work(t.objectStore('jobs')); t.oncomplete = () => resolve(r ? r.result : undefined); t.onerror = t.onabort = () => reject(t.error); }); }
  finally { db.close(); }
}
export async function enqueue(kind: OfflineJob['kind'], value: string, now = Date.now()): Promise<boolean> {
  if (!validJob({kind, value})) return false;
  const all = await readJobs(now);
  if (all.some(j => j.kind === kind && j.value === value)) return true;
  if (all.length >= MAX) return false;
  await tx('readwrite', s => { s.put({id: `${kind}:${value}`, kind, value, at: now} satisfies OfflineJob); });
  return true;
}
/** The jobs still worth offering (a week old at most), oldest first; older ones are dropped. */
export async function readJobs(now = Date.now()): Promise<OfflineJob[]> {
  const all = (await tx<OfflineJob[]>('readonly', s => s.getAll() as IDBRequest<OfflineJob[]>)) ?? [];
  const stale = all.filter(j => now - j.at > AGE || !validJob(j));
  if (stale.length) await tx('readwrite', s => { for (const j of stale) s.delete(j.id); });
  return all.filter(j => !stale.includes(j)).sort((a, b) => a.at - b.at);
}
export const removeJob = (id: string) => tx('readwrite', s => { s.delete(id); });
export function forgetOfflineQueue(): Promise<void> {
  return new Promise(resolve => { if (typeof indexedDB === 'undefined') { resolve(); return; } const r = indexedDB.deleteDatabase(OFFLINE_QUEUE_DB); r.onsuccess = r.onerror = r.onblocked = () => resolve(); });
}
