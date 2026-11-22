import {imageSize, tooLarge} from '../image-header';
import {TASK_ATTACHMENT_DB, TASK_PHOTO_MAX_BYTES, TASK_VOICE_MAX_BYTES, TASK_VOICE_MAX_SECONDS, putTaskAttachment, taskAttachmentFileName} from '../tasks/attachments';
import {AUDIO_TYPES, JOURNAL_AUDIO_MAX_BYTES, JOURNAL_MEDIA_DB, JOURNAL_PHOTO_MAX_BYTES, PHOTO_TYPES, putJournalMedia} from '../journal/media';
import {journalMediaFileName} from '../journal/export-media';
import {NOTE_PHOTO_DB, NOTE_PHOTO_MAX_BYTES, putNotePhoto} from '../notes/photos';
import {MONEY_PHOTO_DB, MONEY_PHOTO_MAX_BYTES, moneyPhotoFileName, putMoneyPhoto} from '../money-photos/store';
import {MEAL_PHOTO_DB, MEAL_PHOTO_MAX_BYTES, mealPhotoFileName, putMealPhoto} from '../meal-estimates/photos';
import {FOOD_PHOTO_DB, FOOD_PHOTO_MAX_BYTES, foodPhotoFileName, putFoodPhoto} from '../food-plus/photos';
import {MAX_DOC_BYTES, WEALTH_DOCS_DB, docFileName, putDoc} from '../wealth-sheet/docs';
import {mediaIds, type RestoreMediaDb} from './media-dbs';
import {entryBytes, type OpenedBackup} from './read-backup';

/**
 * Session AV lane 2 (review b1 #18; TIER 3 (stored formats), additive): "Restore from a backup" puts the photos, voice
 * notes and documents of an Export everything ZIP back into the IndexedDB stores they came from — task attachments, the
 * journal's photos and audio notes, the notes' photos, receipt photos on spending entries, kept meal-estimate photos,
 * package photos on foods and the documents kept with accounts.
 *
 * - A file comes back under the id its record keeps, and only when that record is on this device after the parts were
 *   written (a task, entry, note, spending entry, estimated meal, food or account that names it). A file no record names
 *   stays in the ZIP and is counted.
 * - Only an id the store does not hold is added; nothing in a store is ever overwritten. In the scope the stores use
 *   (lib/health-aa/photos.ts `photoScope`: this account, or the local person; a restore never runs in the Showcase).
 * - Each store's own write is used, so its size caps and counts hold (a full store refuses, and the file is counted).
 *   A file larger than its store keeps is never read; one whose bytes are not the photo, recording or PDF its name says
 *   is skipped and counted. Nothing here ever throws for one file: only a stop or an account change ends the run.
 * - The ids it added are named per database in the restore's undo record (a `media` step), so Undo deletes exactly those.
 */
export type MediaStore = 'tasks' | 'journal' | 'notes' | 'receipts' | 'meals' | 'foods' | 'wealth';
export const MEDIA_STORE_DB: Record<MediaStore, RestoreMediaDb> = {
  tasks: TASK_ATTACHMENT_DB as RestoreMediaDb, journal: JOURNAL_MEDIA_DB as RestoreMediaDb, notes: NOTE_PHOTO_DB as RestoreMediaDb, receipts: MONEY_PHOTO_DB as RestoreMediaDb,
  meals: MEAL_PHOTO_DB as RestoreMediaDb, foods: FOOD_PHOTO_DB as RestoreMediaDb, wealth: WEALTH_DOCS_DB as RestoreMediaDb,
};
export const MEDIA_STORES: readonly MediaStore[] = ['tasks', 'journal', 'notes', 'receipts', 'meals', 'foods', 'wealth'];
/** The device records whose items name these files (Export everything's `device` names), and the Health module. */
export const MEDIA_RECORD_NAMES = ['tasks', 'journal', 'notes', 'moneyLog', 'moneyLogBusiness', 'mealEstimates', 'accounts'] as const;
export type MediaRecords = Partial<Record<(typeof MEDIA_RECORD_NAMES)[number] | 'health', unknown>>;

type Kind = 'photo' | 'audio' | 'pdf';
/** One file's place: the store, the id the record keeps, its type and kind, the store's cap, and what else the store keeps with it. */
export type MediaTarget = {store: MediaStore; id: string; type: string; kind: Kind; cap: number; taskId?: string; seconds?: number; accountId?: string; docId?: string; name?: string};
type Index = {byName: Map<string, MediaTarget>; tasks: {prefix: string; id: string; title: string}[]; accounts: Set<string>};

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const list = (v: unknown, key: string): Record<string, unknown>[] => isObject(v) && Array.isArray(v[key]) ? (v[key] as unknown[]).filter(isObject) : [];
const str = (v: unknown): string | null => typeof v === 'string' && v ? v : null;
const IMAGE_TYPES = ['image/webp', 'image/jpeg'] as const;
const TASK_EXT: Record<string, string> = {jpg: 'image/jpeg', webp: 'image/webp', webm: 'audio/webm', m4a: 'audio/mp4', ogg: 'audio/ogg'};

/** Every file name the given records (several sets: the backup's, this device's) name, with its place. Pure. */
export function indexMedia(...sets: readonly MediaRecords[]): Index {
  const byName = new Map<string, MediaTarget>(), tasks: Index['tasks'] = [], accounts = new Set<string>();
  const add = (name: string | null, t: MediaTarget) => { if (name && !byName.has(name)) byName.set(name, t); };
  for (const r of sets) {
    // Round 4 (r4-mind #317): photos 5–12 of an entry are in `morePhotos`; they come back with the first four.
    for (const e of list(r.journal, 'entries')) {
      for (const id of [...(Array.isArray(e.photos) ? e.photos : []), ...(Array.isArray(e.morePhotos) ? e.morePhotos : [])]) if (str(id)) for (const type of PHOTO_TYPES) add(journalMediaFileName(id as string, 'photo', type), {store: 'journal', id: id as string, type, kind: 'photo', cap: JOURNAL_PHOTO_MAX_BYTES});
      for (const a of Array.isArray(e.audio) ? e.audio.filter(isObject) : []) {
        const id = str(a.id), seconds = typeof a.seconds === 'number' && Number.isInteger(a.seconds) ? a.seconds : 0;
        if (id) for (const type of AUDIO_TYPES) add(journalMediaFileName(id, 'audio', type), {store: 'journal', id, type, kind: 'audio', cap: JOURNAL_AUDIO_MAX_BYTES, seconds});
      }
    }
    for (const n of list(r.notes, 'notes')) {
      const id = str(n.photoId), safe = id?.replace(/[^A-Za-z0-9_-]/g, '');
      if (id && safe) for (const type of IMAGE_TYPES) add(`notes/photos/${safe}.${type === 'image/webp' ? 'webp' : 'jpg'}`, {store: 'notes', id, type, kind: 'photo', cap: NOTE_PHOTO_MAX_BYTES});
    }
    for (const e of [...list(r.moneyLog, 'entries'), ...list(r.moneyLogBusiness, 'entries')]) {
      const id = str(e.id), date = str(e.date) ?? undefined;
      if (id) for (const type of IMAGE_TYPES) for (const day of [date, undefined]) add(moneyPhotoFileName(id, day, type), {store: 'receipts', id, type, kind: 'photo', cap: MONEY_PHOTO_MAX_BYTES});
    }
    const foods = isObject(r.mealEstimates) && isObject(r.mealEstimates.foods) ? Object.keys(r.mealEstimates.foods) : [];
    for (const id of foods) for (const type of IMAGE_TYPES) add(mealPhotoFileName(id, type), {store: 'meals', id, type, kind: 'photo', cap: MEAL_PHOTO_MAX_BYTES});
    for (const f of list(r.health, 'foods')) { const id = str(f.id); if (id) for (const type of IMAGE_TYPES) add(foodPhotoFileName(id, type), {store: 'foods', id, type, kind: 'photo', cap: FOOD_PHOTO_MAX_BYTES}); }
    for (const t of list(r.tasks, 'tasks')) {
      const id = str(t.id), title = str(t.title) ?? '';
      if (!id || tasks.some(x => x.id === id)) continue;
      const probe = taskAttachmentFileName({id: 'ID0', taskId: id, kind: 'photo', type: 'image/jpeg'}, title);
      tasks.push({prefix: probe.slice(0, -'-photo-ID0.jpg'.length), id, title});
    }
    for (const a of list(r.accounts, 'items')) { const id = str(a.id); if (id) accounts.add(id); }
  }
  return {byName, tasks, accounts};
}

/** Where one file of the ZIP goes: its place, `null` when no record names it (or two tasks could). Pure. */
export function mediaTarget(name: string, index: Index): MediaTarget | null {
  const known = index.byName.get(name);
  if (known) return known;
  if (name.startsWith('tasks/attachments/')) {
    const found = new Map<string, MediaTarget>();
    for (const t of index.tasks) {
      for (const kind of ['photo', 'voice'] as const) {
        const head = `${t.prefix}-${kind}-`;
        if (!name.startsWith(head)) continue;
        const m = /^([A-Za-z0-9_-]{1,80})\.([a-z0-9]{2,4})$/.exec(name.slice(head.length)), type = m ? TASK_EXT[m[2]!] : undefined;
        if (!m || !type || (kind === 'photo') !== type.startsWith('image/')) continue;
        if (taskAttachmentFileName({id: m[1]!, taskId: t.id, kind, type: type as 'image/jpeg'}, t.title) !== name) continue;
        found.set(t.id, {store: 'tasks', id: m[1]!, type, kind: kind === 'photo' ? 'photo' : 'audio', cap: kind === 'photo' ? TASK_PHOTO_MAX_BYTES : TASK_VOICE_MAX_BYTES, taskId: t.id});
      }
    }
    // Two tasks whose titles read alike could both own the file: it is left in the ZIP rather than guessed.
    return found.size === 1 ? [...found.values()][0]! : null;
  }
  // A document: `wealth-docs/<account>/<doc id>-<its name made safe>.<ext>`, kept when the account is on this device.
  const doc = /^wealth-docs\/([0-9a-fA-F-]{8,40})\/(doc_[0-9a-f]{8}-[0-9a-f]{3})-([A-Za-z0-9_-]{1,60})\.(pdf|jpg|webp)$/.exec(name);
  if (doc && index.accounts.has(doc[1]!)) {
    const type = doc[4] === 'pdf' ? 'application/pdf' : doc[4] === 'jpg' ? 'image/jpeg' : 'image/webp', shown = doc[3]!.replace(/_+/g, ' ').trim() || 'Document';
    if (docFileName({accountId: doc[1]!, docId: doc[2]!, name: doc[3]!, type: type as 'application/pdf'}) === name)
      return {store: 'wealth', id: `${doc[1]}:${doc[2]}`, type, kind: type === 'application/pdf' ? 'pdf' : 'photo', cap: MAX_DOC_BYTES, accountId: doc[1]!, docId: doc[2]!, name: shown};
  }
  return null;
}

/** What the preview says before anything changes: per store, the files a record names; the rest, and why. */
export type MediaPlan = {back: Partial<Record<MediaStore, number>>; total: number; unnamed: number; oversize: number; canKeep: boolean};
export function planMedia(opened: Pick<OpenedBackup, 'media'>, ...sets: readonly MediaRecords[]): MediaPlan {
  const index = indexMedia(...sets), plan: MediaPlan = {back: {}, total: 0, unnamed: 0, oversize: 0, canKeep: typeof indexedDB !== 'undefined'};
  for (const entry of opened.media ?? []) {
    const t = mediaTarget(entry.name, index);
    if (!t) plan.unnamed++;
    else if (entry.uncompressed > t.cap) plan.oversize++;
    else { plan.back[t.store] = (plan.back[t.store] ?? 0) + 1; plan.total++; }
  }
  return plan;
}
/** The backup's own records, each read by its part's schema (a record that does not read names nothing). */
export function backupMediaRecords(json: OpenedBackup['json'], read: (name: string, value: unknown) => unknown): MediaRecords {
  const out: MediaRecords = {};
  for (const name of MEDIA_RECORD_NAMES) { const v = json.device?.[name]; if (v !== undefined) out[name] = read(name, v); }
  if (json.modules?.health !== undefined) out.health = read('health', json.modules.health);
  return out;
}

/** Whether the bytes are what the file's name says: a photo's header (and its size under the image caps), a recording's container, a PDF. */
export function bytesMatch(bytes: Uint8Array, type: string): boolean {
  if (type.startsWith('image/')) { const s = imageSize(bytes); return !!s && s.type === type && !tooLarge(s); }
  const at = (i: number, text: string) => [...text].every((c, k) => bytes[i + k] === c.charCodeAt(0));
  if (type === 'audio/webm') return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (type === 'audio/ogg') return at(0, 'OggS');
  if (type === 'audio/mp4') return at(4, 'ftyp');
  if (type === 'application/pdf') return at(0, '%PDF-');
  return false;
}

/**
 * How long a task's voice note lasts, read by this browser from the recording (a task keeps its length; the file in the
 * ZIP does not carry it). 0 when the browser cannot tell within a moment; the player still plays it whole.
 */
export async function audioSeconds(blob: Blob, waitMs = 1500): Promise<number> {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return 0;
  let url = '';
  try {
    url = URL.createObjectURL(blob);
    const audio = document.createElement('audio');
    return await new Promise<number>(resolve => {
      const done = (n: number) => { clearTimeout(timer); resolve(Number.isFinite(n) && n > 0 ? n : 0); };
      const timer = setTimeout(() => done(0), waitMs);
      // A browser recording often says its length only after a seek past the end.
      audio.onloadedmetadata = () => { if (Number.isFinite(audio.duration)) done(audio.duration); else { audio.ondurationchange = () => { if (Number.isFinite(audio.duration)) done(audio.duration); }; audio.currentTime = 1e7; } };
      audio.onerror = () => done(0);
      audio.preload = 'metadata'; audio.src = url;
    });
  } catch { return 0; } finally { if (url) try { URL.revokeObjectURL(url); } catch { /* gone with the page */ } }
}

async function put(scope: string, t: MediaTarget, blob: Blob, bytes: number, at: string, seconds: (blob: Blob) => Promise<number>): Promise<void> {
  const type = t.type as never;
  switch (t.store) {
    case 'tasks':
      if (t.kind === 'photo') return putTaskAttachment(scope, t.id, {taskId: t.taskId!, kind: 'photo', blob, type, bytes, at});
      return putTaskAttachment(scope, t.id, {taskId: t.taskId!, kind: 'voice', blob, type, bytes, seconds: Math.min(TASK_VOICE_MAX_SECONDS, Math.round((await seconds(blob)) * 10) / 10), at});
    case 'journal':
      if (t.kind === 'photo') return putJournalMedia(scope, t.id, {kind: 'photo', blob, type, bytes, at});
      return putJournalMedia(scope, t.id, {kind: 'audio', blob, type, bytes, seconds: Math.min(300, Math.max(0, t.seconds ?? 0)), at});
    case 'notes': return putNotePhoto(scope, t.id, {blob, type, bytes, at});
    case 'receipts': return putMoneyPhoto(scope, {entryId: t.id, blob, type, bytes, takenAt: at});
    case 'meals': return putMealPhoto(scope, t.id, {blob, type, bytes, at});
    case 'foods': return putFoodPhoto(scope, t.id, {blob, type, bytes, at});
    case 'wealth': return putDoc(scope, {accountId: t.accountId!, docId: t.docId!, name: t.name!, blob, type, bytes, addedAt: at});
  }
}

/** After a restore: what came back, and why the rest did not. */
export type MediaOutcome = {added: number; present: number; unnamed: number; skipped: number; closed: number};
export const emptyMediaOutcome = (): MediaOutcome => ({added: 0, present: 0, unnamed: 0, skipped: 0, closed: 0});
/**
 * Puts the files back (see the top of this file). `fence` runs before each file and may throw (a stop, an account change):
 * that ends the run, and what was added until then is already in `added` (database → ids), for the undo record.
 */
export async function putBackMedia(opened: Pick<OpenedBackup, 'file' | 'media' | 'json'>, records: MediaRecords, scope: string, added: Map<RestoreMediaDb, string[]>, outcome: MediaOutcome, {fence, seconds = audioSeconds, now = new Date()}: {fence: () => void; seconds?: (blob: Blob) => Promise<number>; now?: Date}): Promise<void> {
  const index = indexMedia(records), held = new Map<RestoreMediaDb, Set<string> | null>();
  const at = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(opened.json.exportedAt) ? opened.json.exportedAt : now.toISOString();
  for (const entry of opened.media ?? []) {
    fence();
    const t = mediaTarget(entry.name, index);
    if (!t) { outcome.unnamed++; continue; }
    const db = MEDIA_STORE_DB[t.store];
    if (!held.has(db)) held.set(db, await mediaIds(db, scope).catch(() => null));
    const ids = held.get(db);
    if (!ids) { outcome.closed++; continue; }
    if (ids.has(t.id)) { outcome.present++; continue; }
    if (entry.uncompressed > t.cap) { outcome.skipped++; continue; }
    let bytes: Uint8Array<ArrayBuffer>;
    try { bytes = await entryBytes(opened.file, entry, t.cap); } catch { outcome.skipped++; continue; } // a damaged entry
    if (!bytesMatch(bytes, t.type)) { outcome.skipped++; continue; }
    fence();
    try { await put(scope, t, new Blob([bytes], {type: t.type}), bytes.length, at, seconds); } catch { outcome.skipped++; continue; } // a store at its cap, a value it refuses
    ids.add(t.id); added.set(db, [...(added.get(db) ?? []), t.id]); outcome.added++;
  }
}
