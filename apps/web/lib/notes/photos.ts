import * as z from 'zod';

/**
 * Session AK (B1): a note's photo, kept on this device only — IndexedDB `zigoals-notes-photos-v1` (one store, `photos`),
 * never localStorage, never synced, never sent. Keyed `<scope>:<photoId>` like the meal and progress photos, so an
 * account, the Showcase and the local person each keep their own. Shrunk on the device to at most 200 kB before it is
 * kept (lib/meal-estimates/photos.ts's steps), at most 300 per scope. In the notes' Markdown export as attachments/.
 */
export const NOTE_PHOTO_DB = 'zigoals-notes-photos-v1', NOTE_PHOTO_STORE = 'photos';
export const MAX_NOTE_PHOTOS = 300, NOTE_PHOTO_MAX_BYTES = 200_000;
export const notePhotoValueSchema = z.object({blob: z.instanceof(Blob), type: z.enum(['image/webp', 'image/jpeg']), bytes: z.number().int().min(1).max(NOTE_PHOTO_MAX_BYTES), at: z.iso.datetime()});
export type NotePhoto = z.infer<typeof notePhotoValueSchema>;
export const notePhotoKey = (scope: string, photoId: string) => `${scope}:${photoId}`;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('This browser cannot keep photos.')); return; }
    const req = indexedDB.open(NOTE_PHOTO_DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(NOTE_PHOTO_STORE)) req.result.createObjectStore(NOTE_PHOTO_STORE); };
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error ?? new Error('The photo store is unavailable.'));
  });
}
async function run<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(NOTE_PHOTO_STORE, mode), req = act(t.objectStore(NOTE_PHOTO_STORE));
    let result: T | undefined;
    if (req) req.onsuccess = () => { result = req.result; };
    t.oncomplete = () => { db.close(); resolve(result); };
    t.onerror = () => { db.close(); reject(t.error ?? new Error('The photo was not kept.')); };
    t.onabort = () => { db.close(); reject(t.error ?? new Error('The photo was not kept.')); };
  });
}
/** The photo ids this scope keeps. */
export async function notePhotoIds(scope: string): Promise<string[]> {
  const keys = (await run<IDBValidKey[]>('readonly', s => s.getAllKeys())) ?? [];
  return keys.map(String).filter(k => k.startsWith(`${scope}:`)).map(k => k.slice(scope.length + 1));
}
export async function getNotePhoto(scope: string, photoId: string): Promise<NotePhoto | null> {
  const parsed = notePhotoValueSchema.safeParse(await run<unknown>('readonly', s => s.get(notePhotoKey(scope, photoId))));
  return parsed.success ? parsed.data : null;
}
/** Keeps one photo; refuses the 301st of a scope. */
export async function putNotePhoto(scope: string, photoId: string, photo: NotePhoto): Promise<void> {
  const value = notePhotoValueSchema.parse(photo), ids = await notePhotoIds(scope);
  if (!ids.includes(photoId) && ids.length >= MAX_NOTE_PHOTOS) throw new Error(`At most ${MAX_NOTE_PHOTOS} note photos on this device; delete one first.`);
  await run('readwrite', s => s.put(value, notePhotoKey(scope, photoId)));
}
export async function deleteNotePhoto(scope: string, photoId: string): Promise<void> { await run('readwrite', s => s.delete(notePhotoKey(scope, photoId))); }
/** Removes every note photo of this scope (Erase uses the database name; this is the per-scope button). */
export async function deleteAllNotePhotos(scope: string): Promise<number> {
  const ids = await notePhotoIds(scope);
  if (ids.length) await run('readwrite', s => { for (const id of ids) s.delete(notePhotoKey(scope, id)); });
  return ids.length;
}
/** Photo ids no note names any more (a deleted note's photo is removed once its Undo has passed). */
export const orphanPhotoIds = (kept: readonly string[], named: readonly (string | undefined)[]) => { const used = new Set(named.filter(Boolean)); return kept.filter(id => !used.has(id)); };
/** Every kept photo of this scope, for the Markdown export (a photo that does not read is left out). */
export async function notePhotosForExport(scope: string, ids: readonly string[]): Promise<Map<string, {data: Uint8Array; type: string}>> {
  const out = new Map<string, {data: Uint8Array; type: string}>();
  for (const id of ids) { try { const p = await getNotePhoto(scope, id); if (p) out.set(id, {data: new Uint8Array(await p.blob.arrayBuffer()), type: p.type}); } catch { /* left out */ } }
  return out;
}
