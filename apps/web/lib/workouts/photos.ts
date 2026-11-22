import * as z from 'zod';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #377, Gentler Streak's photos in the workout journal; TIER 3 (stored format), a new
 * device database): up to four photos of a finished workout, kept only in this browser — IndexedDB
 * `zigoals-workout-photos-v1` (one store, `photos`), never localStorage, never synced, never uploaded, and nothing reads
 * them. Keyed `<scope>:<photoId>` like the note, meal and package photos (an account, the Showcase and the local person
 * each keep their own); shrunk on the device to at most 200 kB (lib/meal-estimates/photos.ts `shrinkToLimit` steps), at
 * most 300 a scope. The workout names its photos in its optional `photos` ids (lib/workouts/schema.ts).
 *
 * A photo no workout names (its workout was deleted, or a Restore brought back an older log) is first marked
 * (`orphanSince`) and deleted only after 30 days unnamed, as the note photos are (security review Z1B-7), so Undo of a
 * delete or of a Restore finds it again. In Export everything as files (`workout-photos/…`, `exportWorkoutPhotoEntries`);
 * Erase everything removes the database by name (the lead lists it: lib/av2-r5-gym-keys.ts). Pinning photos on a map
 * stays Carried: it needs map tiles from an outside service, and a route's points are never kept.
 */
export const WORKOUT_PHOTO_DB = 'zigoals-workout-photos-v1', WORKOUT_PHOTO_STORE = 'photos';
export const MAX_WORKOUT_PHOTOS = 300, WORKOUT_PHOTO_MAX_BYTES = 200_000, PHOTOS_PER_WORKOUT = 4;
export const WORKOUT_PHOTO_ORPHAN_GRACE_DAYS = 30;
export const workoutPhotoValueSchema = z.object({blob: z.instanceof(Blob), type: z.enum(['image/webp', 'image/jpeg']), bytes: z.number().int().min(1).max(WORKOUT_PHOTO_MAX_BYTES), at: z.iso.datetime(), orphanSince: z.iso.datetime().optional()});
export type WorkoutPhoto = z.infer<typeof workoutPhotoValueSchema>;
export const workoutPhotoKey = (scope: string, photoId: string) => `${scope}:${photoId}`;
export const newWorkoutPhotoId = () => `wph-${crypto.randomUUID()}`;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('This browser cannot keep photos.')); return; }
    const req = indexedDB.open(WORKOUT_PHOTO_DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(WORKOUT_PHOTO_STORE)) req.result.createObjectStore(WORKOUT_PHOTO_STORE); };
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error ?? new Error('The photo store is unavailable.'));
  });
}
async function run<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(WORKOUT_PHOTO_STORE, mode), req = act(t.objectStore(WORKOUT_PHOTO_STORE));
    let result: T | undefined;
    if (req) req.onsuccess = () => { result = req.result; };
    t.oncomplete = () => { db.close(); resolve(result); };
    t.onerror = () => { db.close(); reject(t.error ?? new Error('The photo was not kept.')); };
    t.onabort = () => { db.close(); reject(t.error ?? new Error('The photo was not kept.')); };
  });
}
/** The photo ids this scope keeps. */
export async function workoutPhotoIds(scope: string): Promise<string[]> {
  const keys = (await run<IDBValidKey[]>('readonly', s => s.getAllKeys())) ?? [];
  return keys.map(String).filter(k => k.startsWith(`${scope}:`)).map(k => k.slice(scope.length + 1));
}
export async function getWorkoutPhoto(scope: string, photoId: string): Promise<WorkoutPhoto | null> {
  const parsed = workoutPhotoValueSchema.safeParse(await run<unknown>('readonly', s => s.get(workoutPhotoKey(scope, photoId))));
  return parsed.success ? parsed.data : null;
}
/** Keeps one photo; refuses the 301st of a scope. */
export async function putWorkoutPhoto(scope: string, photoId: string, photo: WorkoutPhoto): Promise<void> {
  const value = workoutPhotoValueSchema.parse(photo), ids = await workoutPhotoIds(scope);
  if (!ids.includes(photoId) && ids.length >= MAX_WORKOUT_PHOTOS) throw new Error(`At most ${MAX_WORKOUT_PHOTOS} workout photos on this device; remove one first.`);
  await run('readwrite', s => s.put(value, workoutPhotoKey(scope, photoId)));
}
export async function deleteWorkoutPhoto(scope: string, photoId: string): Promise<void> { await run('readwrite', s => s.delete(workoutPhotoKey(scope, photoId))); }
const DAY_MS = 86_400_000;
/**
 * The arrival sweep (as the note photos'): a photo no workout names is marked, and deleted once it stayed unnamed for
 * {@link WORKOUT_PHOTO_ORPHAN_GRACE_DAYS} days; a photo named again loses its mark; one that does not read is left alone.
 */
export async function sweepWorkoutPhotos(scope: string, named: readonly string[], now = Date.now()): Promise<{deleted: string[]; marked: string[]}> {
  const used = new Set(named), out = {deleted: [] as string[], marked: [] as string[]};
  for (const id of await workoutPhotoIds(scope)) {
    const photo = await getWorkoutPhoto(scope, id);
    if (!photo) continue;
    const key = workoutPhotoKey(scope, id);
    if (used.has(id)) {
      if (photo.orphanSince) { const {orphanSince: _o, ...rest} = photo; void _o; await run('readwrite', s => s.put(rest, key)); }
      continue;
    }
    const since = photo.orphanSince ? Date.parse(photo.orphanSince) : NaN;
    if (!Number.isFinite(since)) { await run('readwrite', s => s.put({...photo, orphanSince: new Date(now).toISOString()}, key)); out.marked.push(id); }
    else if (now - since >= WORKOUT_PHOTO_ORPHAN_GRACE_DAYS * DAY_MS) { await deleteWorkoutPhoto(scope, id); out.deleted.push(id); }
  }
  return out;
}
/** The file name a photo gets in Export everything (`workout-photos/<id>.webp`). */
export const workoutPhotoFileName = (photoId: string, type: string) => `workout-photos/${photoId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 90)}.${type === 'image/jpeg' ? 'jpg' : 'webp'}`;
/** Every workout photo of this scope as a zip entry (Export everything); a photo that does not read is skipped. */
export async function exportWorkoutPhotoEntries(scope: string, now = new Date()): Promise<{name: string; data: Uint8Array; modified: Date}[]> {
  const out: {name: string; data: Uint8Array; modified: Date}[] = [];
  let ids: string[] = []; try { ids = await workoutPhotoIds(scope); } catch { return out; }
  for (const id of ids) { try { const p = await getWorkoutPhoto(scope, id); if (p) out.push({name: workoutPhotoFileName(id, p.type), data: new Uint8Array(await p.blob.arrayBuffer()), modified: now}); } catch { /* skipped */ } }
  return out;
}
