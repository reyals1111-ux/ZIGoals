import * as z from 'zod';

/**
 * Session AV lane 2 (journal; Day One's photos and audio in an entry; TIER 3 (stored format), a new IndexedDB database):
 * a journal entry's photos and audio notes, kept on this device only — IndexedDB `zigoals-journal-media-v1`, one store
 * `media`, never localStorage, never synced, never sent anywhere. Keyed `<scope>:<mediaId>` like the notes' photos, so an
 * account, the Showcase and the local person each keep their own. A photo is shrunk on the device to at most 200 kB
 * before it is kept; an audio note is recorded in the browser (MediaRecorder) and kept as recorded, at most 5 minutes
 * and 3 MB; at most 400 items per scope. The entry keeps only the ids (lib/journal/schema.ts `photos`, `audio`).
 * Erase everything deletes the database (its name is in KNOWN_DATABASES).
 */
export const JOURNAL_MEDIA_DB = 'zigoals-journal-media-v1', JOURNAL_MEDIA_STORE = 'media';
export const MAX_JOURNAL_MEDIA = 400, JOURNAL_PHOTO_MAX_BYTES = 200_000, JOURNAL_AUDIO_MAX_BYTES = 3_000_000;
export const PHOTO_TYPES = ['image/webp', 'image/jpeg'] as const;
/** The containers MediaRecorder writes: WebM/Opus (Chrome, Firefox), MP4/AAC (Safari), Ogg/Opus. */
export const AUDIO_TYPES = ['audio/webm', 'audio/mp4', 'audio/ogg'] as const;
export const journalMediaSchema = z.discriminatedUnion('kind', [
  z.object({kind: z.literal('photo'), blob: z.instanceof(Blob), type: z.enum(PHOTO_TYPES), bytes: z.number().int().min(1).max(JOURNAL_PHOTO_MAX_BYTES), at: z.iso.datetime(), orphanSince: z.iso.datetime().optional()}),
  z.object({kind: z.literal('audio'), blob: z.instanceof(Blob), type: z.enum(AUDIO_TYPES), bytes: z.number().int().min(1).max(JOURNAL_AUDIO_MAX_BYTES), seconds: z.number().int().min(0).max(300), at: z.iso.datetime(), orphanSince: z.iso.datetime().optional()}),
]);
export type JournalMedia = z.infer<typeof journalMediaSchema>;
export const mediaKey = (scope: string, mediaId: string) => `${scope}:${mediaId}`;
/** A new media id (`m-…`, as the entry schema reads it). */
export const newMediaId = () => `m-${(globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 24)}`;
/** The base container of a recorder's MIME type ("audio/webm;codecs=opus" → "audio/webm"), or null when it is none of ours. */
export function audioType(mime: string): (typeof AUDIO_TYPES)[number] | null {
  const base = mime.split(';')[0]!.trim().toLowerCase();
  return (AUDIO_TYPES as readonly string[]).includes(base) ? base as (typeof AUDIO_TYPES)[number] : null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('This browser cannot keep photos or audio.')); return; }
    const req = indexedDB.open(JOURNAL_MEDIA_DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(JOURNAL_MEDIA_STORE)) req.result.createObjectStore(JOURNAL_MEDIA_STORE); };
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error ?? new Error('The journal’s media store is unavailable.'));
  });
}
async function run<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(JOURNAL_MEDIA_STORE, mode), req = act(t.objectStore(JOURNAL_MEDIA_STORE));
    let result: T | undefined;
    if (req) req.onsuccess = () => { result = req.result; };
    t.oncomplete = () => { db.close(); resolve(result); };
    t.onerror = () => { db.close(); reject(t.error ?? new Error('This was not kept on the device.')); };
    t.onabort = () => { db.close(); reject(t.error ?? new Error('This was not kept on the device.')); };
  });
}
/** The media ids this scope keeps. */
export async function journalMediaIds(scope: string): Promise<string[]> {
  const keys = (await run<IDBValidKey[]>('readonly', s => s.getAllKeys())) ?? [];
  return keys.map(String).filter(k => k.startsWith(`${scope}:`)).map(k => k.slice(scope.length + 1));
}
export async function getJournalMedia(scope: string, mediaId: string): Promise<JournalMedia | null> {
  const parsed = journalMediaSchema.safeParse(await run<unknown>('readonly', s => s.get(mediaKey(scope, mediaId))));
  return parsed.success ? parsed.data : null;
}
/** Keeps one photo or audio note; refuses the 401st of a scope. */
export async function putJournalMedia(scope: string, mediaId: string, media: JournalMedia): Promise<void> {
  const value = journalMediaSchema.parse(media), ids = await journalMediaIds(scope);
  if (!ids.includes(mediaId) && ids.length >= MAX_JOURNAL_MEDIA) throw new Error(`At most ${MAX_JOURNAL_MEDIA} journal photos and audio notes on this device; remove one first.`);
  await run('readwrite', s => s.put(value, mediaKey(scope, mediaId)));
}
export async function deleteJournalMedia(scope: string, mediaId: string): Promise<void> { await run('readwrite', s => s.delete(mediaKey(scope, mediaId))); }
/** Review b1 #4: every photo and audio note of one scope (the Showcase's, when it starts or ends); other scopes stay. */
export async function deleteAllJournalMedia(scope: string): Promise<number> {
  const ids = await journalMediaIds(scope);
  if (ids.length) await run('readwrite', s => { for (const id of ids) s.delete(mediaKey(scope, id)); });
  return ids.length;
}

/** How long media no entry names is kept before the sweep deletes it (as the notes' photos: a Restore, then its Undo). */
export const JOURNAL_MEDIA_GRACE_DAYS = 30;
const DAY_MS = 86_400_000;
/**
 * The arrival sweep (the notes' photo rule, security review Z1B-7): media no entry names is first marked (`orphanSince`)
 * and deleted only once it has stayed unnamed for 30 days, so an entry removed with Undo, or a Restore and its Undo,
 * finds its photos and audio still here. Media an entry names again loses its mark; media that does not read is left.
 */
export async function sweepJournalMedia(scope: string, named: readonly string[], now = Date.now()): Promise<{deleted: string[]; marked: string[]}> {
  const used = new Set(named), out = {deleted: [] as string[], marked: [] as string[]};
  for (const id of await journalMediaIds(scope)) {
    const item = await getJournalMedia(scope, id);
    if (!item) continue;
    const key = mediaKey(scope, id);
    if (used.has(id)) { if (item.orphanSince) { const {orphanSince: _o, ...rest} = item; void _o; await run('readwrite', s => s.put(rest, key)); } continue; }
    const since = item.orphanSince ? Date.parse(item.orphanSince) : NaN;
    if (!Number.isFinite(since)) { await run('readwrite', s => s.put({...item, orphanSince: new Date(now).toISOString()}, key)); out.marked.push(id); }
    else if (now - since >= JOURNAL_MEDIA_GRACE_DAYS * DAY_MS) { await deleteJournalMedia(scope, id); out.deleted.push(id); }
  }
  return out;
}
/** Every media id the entries name (photos and audio). */
export const namedMedia = (entries: readonly {photos?: readonly string[]; audio?: readonly {id: string}[]}[]) => entries.flatMap(e => [...(e.photos ?? []), ...(e.audio ?? []).map(a => a.id)]);
