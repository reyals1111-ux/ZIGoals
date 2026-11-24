import * as z from 'zod';

/**
 * Session AV lane 2 (roadmap, LEDGER #8; Todoist's attachments on a task): photos and short voice notes on a task, kept on
 * this device only. IndexedDB `zigoals-task-attachments-v1` (one store, `items`), never localStorage, never synced, never
 * uploaded or sent anywhere; keyed `<scope>:<attachmentId>` like the note, meal and receipt photos (an account, the Showcase
 * and the local person each keep their own; lib/health-aa/photos.ts `photoScope`). A photo is shrunk on the device to at
 * most 200 kB (lib/meal-estimates/photos.ts steps); a voice note is a browser recording (MediaRecorder) of at most a
 * minute. At most 10 on a task and 300 in a scope. An attachment whose task is no longer in the list is an orphan: the
 * sweep marks it (`orphanSince`) and deletes it 30 days later, so a task put back with Undo or a restore keeps its files.
 * In Export everything as files (`tasks/attachments/…`) and erased with Erase everything (the lead lists the database).
 */
export const TASK_ATTACHMENT_DB = 'zigoals-task-attachments-v1', TASK_ATTACHMENT_STORE = 'items';
export const MAX_TASK_ATTACHMENTS = 300, MAX_ATTACHMENTS_PER_TASK = 10;
export const TASK_PHOTO_MAX_BYTES = 200_000, TASK_VOICE_MAX_BYTES = 1_500_000, TASK_VOICE_MAX_SECONDS = 60;
export const TASK_ATTACHMENT_ORPHAN_GRACE_DAYS = 30;
/**
 * Session AV lane 2 (r5-notes; LEDGER #355, Akiflow's files on a task; TIER 3 (stored format), a third kind in the same
 * store, additive): any file (a PDF, a document, a sheet) on a task, at most 10 MB each and 100 MB for every task's files
 * together in a scope, kept as it is (its name and type kept with it). It opens only on the person's tap: a kind the
 * browser shows safely (PDF, a picture, plain text, sound or film) in the browser's own viewer, anything else as a
 * download, never as a page of this site (an HTML or SVG file could run in it). Older builds skip a kind they do not know
 * (their reader drops it, so their sweep never touches it).
 */
export const TASK_FILE_MAX_BYTES = 10_000_000, TASK_FILES_MAX_TOTAL = 100_000_000, TASK_FILE_NAME_MAX = 120;
export const PHOTO_TYPES = ['image/webp', 'image/jpeg'] as const;
export const VOICE_TYPES = ['audio/webm', 'audio/mp4', 'audio/ogg'] as const;
/** MediaRecorder containers in order of preference: Chrome and Firefox record WebM/Opus, Safari MP4/AAC. */
export const VOICE_RECORDER_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'] as const;

const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const photoValue = z.object({taskId: id, kind: z.literal('photo'), blob: z.instanceof(Blob), type: z.enum(PHOTO_TYPES), bytes: z.number().int().min(1).max(TASK_PHOTO_MAX_BYTES), at: z.iso.datetime(), orphanSince: z.iso.datetime().optional()});
const voiceValue = z.object({taskId: id, kind: z.literal('voice'), blob: z.instanceof(Blob), type: z.enum(VOICE_TYPES), bytes: z.number().int().min(1).max(TASK_VOICE_MAX_BYTES), seconds: z.number().min(0).max(TASK_VOICE_MAX_SECONDS + 2), at: z.iso.datetime(), orphanSince: z.iso.datetime().optional()});
const fileValue = z.object({taskId: id, kind: z.literal('file'), blob: z.instanceof(Blob), type: z.string().max(100), name: z.string().min(1).max(TASK_FILE_NAME_MAX), bytes: z.number().int().min(1).max(TASK_FILE_MAX_BYTES), at: z.iso.datetime(), orphanSince: z.iso.datetime().optional()});
export const taskAttachmentValueSchema = z.discriminatedUnion('kind', [photoValue, voiceValue, fileValue]);
export type TaskAttachment = z.infer<typeof taskAttachmentValueSchema>;
export type KeptAttachment = TaskAttachment & {id: string};
export const taskAttachmentKey = (scope: string, attachmentId: string) => `${scope}:${attachmentId}`;
export const newAttachmentId = (kind: 'photo' | 'voice' | 'file') => `${kind === 'photo' ? 'tp' : kind === 'voice' ? 'tv' : 'tf'}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
/** Session AV lane 2 (r5-notes; LEDGER #355): a file's name as kept — no folders, no control characters, at most 120 characters. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '', clean = base.replace(/[\u0000-\u001f\u007f<>:"|?*]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length <= TASK_FILE_NAME_MAX) return clean || 'file';
  const dot = clean.lastIndexOf('.'), ext = dot > 0 && clean.length - dot <= 10 ? clean.slice(dot) : '';
  return `${clean.slice(0, TASK_FILE_NAME_MAX - ext.length - 1).trimEnd()}…${ext}`;
}
/** The types a browser shows in its own viewer without running anything; every other file is saved instead. */
const VIEWABLE = /^(?:application\/pdf|image\/(?:png|jpeg|webp|gif|avif)|text\/plain|audio\/[a-z0-9.+-]+|video\/(?:mp4|webm|ogg))$/;
const TEXT_NAMES = /\.(?:txt|md|markdown|csv|log|json)$/i;
/** How a kept file opens: `view` with the type it is shown as (a text file always as plain text), or `save` as a download. */
export function openWay(type: string, name: string): {way: 'view'; type: string} | {way: 'save'} {
  const t = type.split(';')[0]!.trim().toLowerCase();
  if (TEXT_NAMES.test(name) || t.startsWith('text/plain') || t === 'text/csv' || t === 'text/markdown') return {way: 'view', type: 'text/plain;charset=utf-8'};
  return VIEWABLE.test(t) ? {way: 'view', type: t} : {way: 'save'};
}
/** Session AV lane 2 (r5-notes; LEDGER #355): how many files the tasks carry, on how many tasks, and their bytes; orphans not counted. */
export function fileCounts(kept: readonly Pick<KeptAttachment, 'taskId' | 'kind' | 'orphanSince' | 'bytes'>[]): {files: number; tasks: number; bytes: number} {
  const live = kept.filter(a => !a.orphanSince && a.kind === 'file');
  return {files: live.length, tasks: new Set(live.map(a => a.taskId)).size, bytes: live.reduce((n, a) => n + a.bytes, 0)};
}
/** Bytes in plain words: "820 kB", "4.2 MB". */
export const sizeWords = (bytes: number) => bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1000))} kB` : `${(bytes / 1_000_000).toFixed(bytes < 10_000_000 ? 1 : 0)} MB`;

/** The recording type this browser offers, or null (no voice notes then). */
export function voiceRecorderType(isTypeSupported: (type: string) => boolean): string | null {
  for (const type of VOICE_RECORDER_CANDIDATES) { try { if (isTypeSupported(type)) return type; } catch { /* a recorder that cannot answer */ } }
  return null;
}
/** A recording's container without its codec ("audio/webm;codecs=opus" → "audio/webm"); null when it is not one kept here. */
export function voiceBaseType(mime: string): (typeof VOICE_TYPES)[number] | null {
  const base = mime.split(';')[0]!.trim().toLowerCase();
  return (VOICE_TYPES as readonly string[]).includes(base) ? base as (typeof VOICE_TYPES)[number] : base === 'audio/x-m4a' || base === 'audio/aac' ? 'audio/mp4' : null;
}
/** "0:07", "1:00". */
export const clockSeconds = (s: number) => { const n = Math.max(0, Math.round(s)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; };

/**
 * Session AV lane 2 (loose ends; review b1 #17): said on this window after every write to the store, so a reader that
 * holds a count (ZIGi's and NOVA's answers, components/ai/use-ai-context.ts) reads it again.
 */
export const TASK_ATTACHMENTS_CHANGE = 'zigoals:task-attachments-change';
const changed = () => { try { if (typeof window !== 'undefined') window.dispatchEvent(new Event(TASK_ATTACHMENTS_CHANGE)); } catch { /* nothing listens */ } };
/** How many photos and voice notes the tasks carry, and on how many tasks; an orphan (its task removed) is not counted. Pure. */
export function attachmentCounts(kept: readonly Pick<KeptAttachment, 'taskId' | 'kind' | 'orphanSince'>[]): {photos: number; voice: number; tasks: number} {
  const live = kept.filter(a => !a.orphanSince && a.kind !== 'file'); // Session AV lane 2 (r5-notes; LEDGER #355): files are counted by fileCounts
  return {photos: live.filter(a => a.kind === 'photo').length, voice: live.filter(a => a.kind === 'voice').length, tasks: new Set(live.map(a => a.taskId)).size};
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('This browser cannot keep attachments.')); return; }
    const req = indexedDB.open(TASK_ATTACHMENT_DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(TASK_ATTACHMENT_STORE)) req.result.createObjectStore(TASK_ATTACHMENT_STORE); };
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error ?? new Error('The attachment store is unavailable.'));
  });
}
async function run<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(TASK_ATTACHMENT_STORE, mode), req = act(t.objectStore(TASK_ATTACHMENT_STORE));
    let result: T | undefined;
    if (req) req.onsuccess = () => { result = req.result; };
    t.oncomplete = () => { db.close(); resolve(result); if (mode === 'readwrite') changed(); };
    t.onerror = () => { db.close(); reject(t.error ?? new Error('The attachment was not kept.')); };
    t.onabort = () => { db.close(); reject(t.error ?? new Error('The attachment was not kept.')); };
  });
}
/** Every attachment this scope keeps (a value this build cannot read is skipped, never invented), oldest first. */
export async function taskAttachments(scope: string): Promise<KeptAttachment[]> {
  const db = await openDb();
  const rows = await new Promise<{key: string; value: unknown}[]>((resolve, reject) => {
    const out: {key: string; value: unknown}[] = [], t = db.transaction(TASK_ATTACHMENT_STORE, 'readonly');
    const req = t.objectStore(TASK_ATTACHMENT_STORE).openCursor();
    req.onsuccess = () => { const c = req.result; if (c) { if (String(c.key).startsWith(`${scope}:`)) out.push({key: String(c.key), value: c.value}); c.continue(); } };
    t.oncomplete = () => { db.close(); resolve(out); };
    t.onerror = () => { db.close(); reject(t.error ?? new Error('The attachments could not be read.')); };
  });
  return rows.flatMap(r => { const p = taskAttachmentValueSchema.safeParse(r.value); return p.success ? [{...p.data, id: r.key.slice(scope.length + 1)}] : []; }).sort((a, b) => a.at.localeCompare(b.at));
}
/** The attachments of one task, oldest first. */
export async function taskAttachmentsFor(scope: string, taskId: string): Promise<KeptAttachment[]> { return (await taskAttachments(scope)).filter(a => a.taskId === taskId); }
/** Keeps one attachment; refuses the 11th on a task and the 301st in a scope with a plain reason. */
export async function putTaskAttachment(scope: string, attachmentId: string, value: TaskAttachment): Promise<void> {
  id.parse(attachmentId);
  const clean = taskAttachmentValueSchema.parse(value), kept = await taskAttachments(scope);
  if (!kept.some(a => a.id === attachmentId)) {
    // Session AV lane 2 (r5-notes; LEDGER #355): photos and voice notes, and files, each up to 10 on a task.
    if (kept.filter(a => a.taskId === clean.taskId && (a.kind === 'file') === (clean.kind === 'file')).length >= MAX_ATTACHMENTS_PER_TASK) throw new Error(clean.kind === 'file' ? `A task keeps ${MAX_ATTACHMENTS_PER_TASK} files. Remove one first.` : `A task keeps ${MAX_ATTACHMENTS_PER_TASK} photos and voice notes. Remove one first.`);
    // Session AV lane 2 (r5-notes; LEDGER #355): every task's files together stay under 100 MB (checked first for a file).
    if (clean.kind === 'file' && kept.filter(a => a.kind === 'file').reduce((n, a) => n + a.bytes, 0) + clean.bytes > TASK_FILES_MAX_TOTAL) throw new Error(`Files on tasks keep at most ${sizeWords(TASK_FILES_MAX_TOTAL)} on this device. Remove one in Tasks → Files first.`);
    // Review b5i B5I-13: the 300 on a device count photos, voice notes and files together; a file is told so.
    if (kept.length >= MAX_TASK_ATTACHMENTS) throw new Error(clean.kind === 'file' ? `At most ${MAX_TASK_ATTACHMENTS} photos, voice notes and files on tasks on this device. Remove one first (Tasks → Files lists the files).` : `At most ${MAX_TASK_ATTACHMENTS} task photos and voice notes on this device; remove one first.`);
  }
  await run('readwrite', s => s.put(clean, taskAttachmentKey(scope, attachmentId)));
}
export async function deleteTaskAttachment(scope: string, attachmentId: string): Promise<void> { await run('readwrite', s => s.delete(taskAttachmentKey(scope, attachmentId))); }
/** Deletes the given attachments of this scope (every one when no ids); returns how many there were. */
export async function deleteTaskAttachments(scope: string, ids?: readonly string[]): Promise<number> {
  const kept = (await taskAttachments(scope)).map(a => a.id), gone = ids ? kept.filter(k => ids.includes(k)) : kept;
  if (gone.length) await run('readwrite', s => { for (const k of gone) s.delete(taskAttachmentKey(scope, k)); });
  return gone.length;
}

/** What the sweep does, pure: mark the new orphans, unmark the ones whose task came back, delete those past the grace. */
export function planAttachmentSweep(kept: readonly KeptAttachment[], liveTaskIds: Iterable<string>, now: Date): {mark: string[]; unmark: string[]; remove: string[]} {
  const live = new Set(liveTaskIds), cutoff = now.getTime() - TASK_ATTACHMENT_ORPHAN_GRACE_DAYS * 86_400_000, out = {mark: [] as string[], unmark: [] as string[], remove: [] as string[]};
  for (const a of kept) {
    if (live.has(a.taskId)) { if (a.orphanSince) out.unmark.push(a.id); continue; }
    if (!a.orphanSince) out.mark.push(a.id); else if (Date.parse(a.orphanSince) <= cutoff) out.remove.push(a.id);
  }
  return out;
}
/** Runs the sweep against the task list as it is now (Tasks calls it when an editor opens); returns how many were deleted. */
export async function sweepTaskAttachments(scope: string, liveTaskIds: Iterable<string>, now = new Date()): Promise<number> {
  const kept = await taskAttachments(scope), plan = planAttachmentSweep(kept, liveTaskIds, now);
  if (!plan.mark.length && !plan.unmark.length && !plan.remove.length) return 0;
  const byId = new Map(kept.map(a => [a.id, a]));
  await run('readwrite', s => {
    for (const k of plan.remove) s.delete(taskAttachmentKey(scope, k));
    for (const k of plan.mark) { const {id: _id, ...value} = byId.get(k)!; void _id; s.put({...value, orphanSince: now.toISOString()}, taskAttachmentKey(scope, k)); }
    for (const k of plan.unmark) { const {id: _id, orphanSince: _o, ...value} = byId.get(k)!; void _id; void _o; s.put(value, taskAttachmentKey(scope, k)); }
  });
  return plan.remove.length;
}

const EXTENSIONS: Record<string, string> = {'image/webp': 'webp', 'image/jpeg': 'jpg', 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg'};
const safe = (s: string, max = 40) => s.normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max);
/** The file name an attachment gets inside Export everything: the task's title (made safe for a path), its kind, its id. */
export const taskAttachmentFileName = (a: Pick<KeptAttachment, 'id' | 'taskId' | 'kind' | 'type'> & {name?: string}, title?: string) => a.kind === 'file'
  // Session AV lane 2 (r5-notes; LEDGER #355): a file keeps its own name after its id ("…-file-tf_ab12-Ticket.pdf").
  ? `tasks/attachments/${safe(title ?? '') || safe(a.taskId, 80)}-file-${safe(a.id, 80)}-${safe((a.name ?? '').replace(/\.[^.]{1,10}$/, ''), 60) || 'file'}.${/\.([A-Za-z0-9]{1,10})$/.exec(a.name ?? '')?.[1]?.toLowerCase() ?? 'bin'}`
  : `tasks/attachments/${safe(title ?? '') || safe(a.taskId, 80)}-${a.kind === 'photo' ? 'photo' : 'voice'}-${safe(a.id, 80)}.${EXTENSIONS[a.type] ?? 'bin'}`;
/**
 * Every kept task attachment of this scope as a ZIP entry for Export everything (the lead adds it beside the receipt
 * photos in lib/export/make-everything.ts). `titles` names each task where the list still has it; an orphan keeps its id.
 */
export async function exportTaskAttachmentEntries(scope: string, titles: ReadonlyMap<string, string> = new Map(), now = new Date()): Promise<{name: string; data: Uint8Array; modified: Date}[]> {
  let kept: KeptAttachment[] = []; try { kept = await taskAttachments(scope); } catch { return []; }
  const out: {name: string; data: Uint8Array; modified: Date}[] = [];
  for (const a of kept) { try { out.push({name: taskAttachmentFileName(a, titles.get(a.taskId)), data: new Uint8Array(await a.blob.arrayBuffer()), modified: now}); } catch { /* skipped */ } }
  return out;
}
