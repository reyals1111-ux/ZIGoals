import * as z from 'zod';

/**
 * Session AK (BUILD list 2 #10, COMPETITORS_2: YNAB photos on transactions, Monarch receipts): a photo on a money entry,
 * opt-in, kept on this device only. IndexedDB `zigoals-money-photos-v1` (one store, `photos`), never localStorage, never
 * synced, never uploaded; keyed `<scope>:<entryId>` like the meal, note and progress photos (an account, the Showcase and
 * the local person each keep their own). Value: `{entryId, blob, type, bytes, takenAt}`; shrunk on the device to at most
 * 200 kB (lib/meal-estimates/photos.ts `shrinkToLimit` steps), at most 500 per scope, one per entry (a new one replaces it).
 * A photo whose entry is no longer in the log is an orphan: listed, and deleted only when the person says so (an entry
 * removed by mistake can be put back with Undo, and its photo is still there). In Export everything as files
 * (`money-photos/…`), and erased with Erase everything (the lead lists the database).
 */
export const MONEY_PHOTO_DB = 'zigoals-money-photos-v1', MONEY_PHOTO_STORE = 'photos';
export const MAX_MONEY_PHOTOS = 500, MONEY_PHOTO_MAX_BYTES = 200_000;
const entryId = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
export const moneyPhotoValueSchema = z.object({
  entryId, blob: z.instanceof(Blob), type: z.enum(['image/webp', 'image/jpeg']),
  bytes: z.number().int().min(1).max(MONEY_PHOTO_MAX_BYTES), takenAt: z.iso.datetime(),
});
export type MoneyPhoto = z.infer<typeof moneyPhotoValueSchema>;
export const moneyPhotoKey = (scope: string, id: string) => `${scope}:${id}`;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('This browser cannot keep photos.')); return; }
    const req = indexedDB.open(MONEY_PHOTO_DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(MONEY_PHOTO_STORE)) req.result.createObjectStore(MONEY_PHOTO_STORE); };
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error ?? new Error('The photo store is unavailable.'));
  });
}
async function run<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(MONEY_PHOTO_STORE, mode), req = act(t.objectStore(MONEY_PHOTO_STORE));
    let result: T | undefined;
    if (req) req.onsuccess = () => { result = req.result; };
    t.oncomplete = () => { db.close(); resolve(result); };
    t.onerror = () => { db.close(); reject(t.error ?? new Error('The photo was not kept.')); };
    t.onabort = () => { db.close(); reject(t.error ?? new Error('The photo was not kept.')); };
  });
}
/** The entry ids of this scope that have a photo. */
export async function moneyPhotoIds(scope: string): Promise<string[]> {
  const keys = (await run<IDBValidKey[]>('readonly', s => s.getAllKeys())) ?? [];
  return keys.map(String).filter(k => k.startsWith(`${scope}:`)).map(k => k.slice(scope.length + 1));
}
export async function getMoneyPhoto(scope: string, id: string): Promise<MoneyPhoto | null> {
  const parsed = moneyPhotoValueSchema.safeParse(await run<unknown>('readonly', s => s.get(moneyPhotoKey(scope, id))));
  return parsed.success ? parsed.data : null;
}
/** Keeps (or replaces) an entry's photo; refuses the 501st photo of a scope with a plain reason. */
export async function putMoneyPhoto(scope: string, photo: MoneyPhoto): Promise<void> {
  const value = moneyPhotoValueSchema.parse(photo), ids = await moneyPhotoIds(scope);
  if (!ids.includes(value.entryId) && ids.length >= MAX_MONEY_PHOTOS) throw new Error(`At most ${MAX_MONEY_PHOTOS} money photos on this device; delete one first.`);
  await run('readwrite', s => s.put(value, moneyPhotoKey(scope, value.entryId)));
}
export async function deleteMoneyPhoto(scope: string, id: string): Promise<void> { await run('readwrite', s => s.delete(moneyPhotoKey(scope, id))); }
/** Deletes the given photos of this scope (all of them when no ids); returns how many there were. */
export async function deleteMoneyPhotos(scope: string, ids?: readonly string[]): Promise<number> {
  const kept = await moneyPhotoIds(scope), gone = ids ? kept.filter(id => ids.includes(id)) : kept;
  if (gone.length) await run('readwrite', s => { for (const id of gone) s.delete(moneyPhotoKey(scope, id)); });
  return gone.length;
}
/** The photos whose entries are no longer in the log. Pure. */
export const orphanPhotoIds = (photoIds: readonly string[], entryIds: Iterable<string>): string[] => { const live = new Set(entryIds); return photoIds.filter(id => !live.has(id)); };

/** The file name of an entry's photo inside Export everything: the entry's day and id, made safe for a path. */
export const moneyPhotoFileName = (id: string, date: string | undefined, type: string) => `money-photos/${date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}-` : ''}${id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80)}.${type === 'image/jpeg' ? 'jpg' : 'webp'}`;
/**
 * Every kept money photo of this scope as a ZIP entry for Export everything (the lead adds it beside the meal photos in
 * components/export-everything.tsx). `dates` names each entry's day where the log still has it; an orphan keeps its id.
 * A photo that does not read is skipped, never invented.
 */
export async function exportMoneyPhotoEntries(scope: string, dates: ReadonlyMap<string, string> = new Map(), now = new Date()): Promise<{name: string; data: Uint8Array; modified: Date}[]> {
  const out: {name: string; data: Uint8Array; modified: Date}[] = [];
  let ids: string[] = []; try { ids = await moneyPhotoIds(scope); } catch { return out; }
  for (const id of ids) { try { const p = await getMoneyPhoto(scope, id); if (p) out.push({name: moneyPhotoFileName(id, dates.get(id), p.type), data: new Uint8Array(await p.blob.arrayBuffer()), modified: now}); } catch { /* skipped */ } }
  return out;
}
