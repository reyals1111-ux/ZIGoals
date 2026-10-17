import * as z from 'zod';
import {getAppStorage, isShowcase} from '../showcase-storage';
import {getAccountGeneration, getAccountScope} from '../account-session';
import {importPrivateStore, parsePrivateData} from '../private-storage';
import {durableSpace, exportDurableStore, isDurableMarker, localDatabase, readDurableStore, restoreDurableStore} from '../vault/local';
import {recoveryCopyKeys} from '../vault/recovery-copies';
import {restoreFailureMessage} from '../storage-error-copy';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';
import {PORTFOLIO_KEY} from '../portfolio/schema';
import {PROGRESS_PHOTOS_KEY} from '../aa-device-keys';
import {addPhotoEntry, deletePhotoBlob, getPhotoBlob, photoFileName, photoScope, progressPhotosSchema, putPhotoBlob, type ProgressPhotos} from '../health-aa/photos';
import {deleteImages, getImage, putImage} from '../vision/store';
import {imageSize, tooLarge} from '../image-header';
import {DEVICE_PARTS, MODULE_PARTS, nextValue, type PlannedPart, type RestoreMode} from './plan';
import {entryBytes, RESTORE_LIMITS, type OpenedBackup} from './read-backup';

/**
 * Session AB-Cloud Part 5 ([TIER 3] (data formats), ADR-023 C22): writes the parts the person chose, each through the
 * same path its own page uses, and keeps what each write replaced so the whole restore can be undone.
 *
 * Session AD item 11 ([TIER 3] (data formats), ADR-026): the Undo also survives a reload. After each part is written, a
 * small undo record (RESTORE_UNDO_KEY, through this account's own storage view, never synced or exported) names what the
 * restore wrote by its SHA-256 digest and where the bytes it replaced are: a module's are its recovery copy (the copy its
 * restore path already keeps, found again by digest), a device record's and the photo index's are in the record itself.
 * It lasts RESTORE_UNDO_DAYS, until the person chooses Undo or "Keep the restore", or until nothing it restored is still
 * as restored. Undo puts a part back only while it still holds exactly what the restore wrote. When the record cannot be
 * kept (too large, storage full), the Undo stays in this tab's memory as before, and the page says it lasts until reload.
 *
 * - A module goes through importPrivateStore / restoreDurableStore (validated, a newer stored version refused, the
 *   replaced record kept as the module's recovery copy) and is announced like a page's save, so sync carries it as a
 *   local edit. Health follows the same path and never touches Health's sync consent (FIX_PLAN B4): nothing here writes
 *   a sync, consent, vault or key record — only the parts in plan.ts and the photo stores.
 * - A device record is written whole after its schema accepts it, and announced like a page's save.
 * - Photos come back to this device only (owner decision): the missing ones are added, an existing one is never
 *   overwritten, and each is checked by its header size before it is stored.
 * - Every write is fenced: if the account, its lock or the Showcase changes during the restore, it stops.
 */
export type RestoreChoice = {part: PlannedPart; mode: Exclude<RestoreMode, 'leave'>};
export type PhotoChoice = {vision: boolean; progress: boolean};
/** What one write replaced. `before`/`after` of a module and `after` of the others are SHA-256 digests in the stored record; `text` is the module's replaced bytes, kept in memory only. */
type UndoStep =
  | {kind: 'module'; key: string; label: string; before: string | null; after: string; text?: string | null}
  | {kind: 'device'; key: string; label: string; before: string | null; after: string}
  | {kind: 'vision'; scope: string; ids: string[]}
  | {kind: 'photos'; scope: string; ids: string[]; before: string | null; after: string};
/** `undoAfterReload`: the undo record was kept, so Undo also works after a reload. `stopped`: the person stopped it midway. `health`: a Health part was restored. */
export type RestoreOutcome = {restored: string[]; failed: {label: string; error: string}[]; photos: {added: number; skipped: number}; undoable: boolean; undoAfterReload: boolean; stopped: boolean; health: boolean};
type Session = {generation: number; storage: Storage; steps: UndoStep[]; at: string; persisted: boolean};
let last: Session | null = null;

export const RESTORE_UNDO_KEY = 'zigoals:restore-undo:v1';
export const RESTORE_UNDO_DAYS = 7, RESTORE_UNDO_MAX_CHARS = 1_000_000;
const hex = z.string().regex(/^[a-f0-9]{64}$/), name = z.string().min(1).max(200), ids = z.array(z.string().min(1).max(200)).max(5000);
const stepSchema = z.discriminatedUnion('kind', [
  z.strictObject({kind: z.literal('module'), key: name, label: name, before: hex.nullable(), after: hex}),
  z.strictObject({kind: z.literal('device'), key: name, label: name, before: z.string().max(RESTORE_UNDO_MAX_CHARS).nullable(), after: hex}),
  z.strictObject({kind: z.literal('vision'), scope: name, ids}),
  z.strictObject({kind: z.literal('photos'), scope: name, ids, before: z.string().max(RESTORE_UNDO_MAX_CHARS).nullable(), after: hex}),
]);
/** The undo record (version 1, strict): when the restore ran, until when it can be undone, and its steps in order. */
export const restoreUndoSchema = z.strictObject({version: z.literal(1), at: z.iso.datetime(), expiresAt: z.iso.datetime(), steps: z.array(stepSchema).min(1).max(200)});
export type RestoreUndoRecord = z.infer<typeof restoreUndoSchema>;
export const RESTORE_STOPPED_MESSAGE = 'You stopped the restore. What was restored before you stopped is listed here and can be undone; nothing else was changed.';
class Stopped extends Error { constructor() { super(RESTORE_STOPPED_MESSAGE); } }

export const RESTORE_SHOWCASE_MESSAGE = 'You are in the Showcase. Return to your own data to restore a backup.';
export const RESTORE_CHANGED_MESSAGE = 'Your account changed during the restore, so it stopped. What was already restored can still be undone.';
const ANNOUNCE = 'zigoals:private-change';
function announceModule(key: string) {
  window.dispatchEvent(new CustomEvent(ANNOUNCE, {detail: key}));
  if (typeof BroadcastChannel !== 'undefined') { const c = new BroadcastChannel('zigoals:private-updates:v1'); c.postMessage(key); c.close(); }
}
function announceDevice(key: string) {
  window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: key}));
  if (key === PORTFOLIO_KEY) window.dispatchEvent(new Event('zigoals:portfolio-change'));
}
/** Every key a restore may write: the parts in plan.ts and the progress-photo index, nothing else (and its own undo record, RESTORE_UNDO_KEY). */
export const RESTORE_KEYS: readonly string[] = [...MODULE_PARTS.map(p => p.key), ...DEVICE_PARTS.map(p => p.key), PROGRESS_PHOTOS_KEY];
const MODULE_KEYS = new Set(MODULE_PARTS.map(p => p.key)), DEVICE_KEYS = new Set(DEVICE_PARTS.map(p => p.key));

async function sha256(text: string): Promise<string> { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, '0')).join(''); }
const sha256OrNull = (text: string | null) => text === null ? Promise.resolve(null) : sha256(text);
/** The undo record as stored: module bytes never go in it (they are the module's recovery copy). */
function stored(session: Session): RestoreUndoRecord {
  return {version: 1, at: session.at, expiresAt: new Date(Date.parse(session.at) + RESTORE_UNDO_DAYS * 86_400_000).toISOString(), steps: session.steps.map(step => step.kind === 'module' ? {kind: 'module', key: step.key, label: step.label, before: step.before, after: step.after} : step)};
}
/** Keeps the undo record after each write. If it cannot be kept, none is left behind and the Undo stays in this tab's memory. */
function persist(session: Session) {
  if (!session.persisted) return;
  try {
    const text = JSON.stringify(restoreUndoSchema.parse(stored(session)));
    if (text.length > RESTORE_UNDO_MAX_CHARS) throw Error('too large');
    session.storage.setItem(RESTORE_UNDO_KEY, text);
  } catch { session.persisted = false; removeRecord(session.storage); }
}
/** This storage view's undo record, or null (none, unreadable, expired, or naming a key or photo scope a restore never writes). */
function readRecord(storage: Storage, now = Date.now()): RestoreUndoRecord | null {
  let raw: string | null;
  try { raw = storage.getItem(RESTORE_UNDO_KEY); } catch { return null; }
  if (raw === null) return null;
  try {
    const record = restoreUndoSchema.parse(JSON.parse(raw)), scope = getAccountScope() ?? 'local';
    if (Date.parse(record.expiresAt) <= now) return null;
    const allowed = record.steps.every(step => step.kind === 'module' ? MODULE_KEYS.has(step.key) : step.kind === 'device' ? DEVICE_KEYS.has(step.key) : step.scope === scope);
    return allowed ? record : null;
  } catch { return null; }
}
function removeRecord(storage: Storage) { try { storage.removeItem(RESTORE_UNDO_KEY); } catch { /* left for its expiry */ } }
/** This session's restore, if it still belongs to this account and storage; else the stored record of an earlier tab or visit. */
function currentSession(): Session | null {
  if (isShowcase()) return null;
  const storage = getAppStorage();
  if (last && last.steps.length > 0 && last.generation === getAccountGeneration() && last.storage === storage) return last;
  const record = readRecord(storage);
  if (!record) return null;
  return {generation: getAccountGeneration(), storage, steps: record.steps, at: record.at, persisted: true};
}

/** This device's current value of a part: parsed, undefined when it holds none; throws when it does not read. */
export async function currentValue(storage: Storage, part: PlannedPart): Promise<unknown> {
  const raw = storage.getItem(part.key);
  if (raw === null) return undefined;
  if (part.kind === 'module') return isDurableMarker(raw) ? readDurableStore(storage, part.key, part.schema) : parsePrivateData(raw, part.schema);
  const parsed = part.schema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw Error('This device’s copy does not read.');
  return parsed.data;
}
async function moduleText(storage: Storage, key: string): Promise<string | null> {
  const raw = storage.getItem(key);
  return isDurableMarker(raw) ? exportDurableStore(storage, key) : raw;
}

const interrupted = (error: unknown) => error instanceof Stopped || (error instanceof Error && error.message === RESTORE_CHANGED_MESSAGE);
/**
 * Applies the choices. Refuses in the Showcase; stops if the account changes on the way (throws RESTORE_CHANGED_MESSAGE),
 * or between two writes when `signal` is aborted (the person pressed Stop: the outcome says `stopped`). Either way what
 * was already restored can be undone, and nothing else was changed.
 */
export async function applyRestore(opened: OpenedBackup, choices: readonly RestoreChoice[], photos: PhotoChoice, {signal}: {signal?: AbortSignal} = {}): Promise<RestoreOutcome> {
  if (isShowcase()) throw Error(RESTORE_SHOWCASE_MESSAGE);
  const storage = getAppStorage(), generation = getAccountGeneration(), scope = getAccountScope();
  const fence = () => { if (isShowcase() || getAccountGeneration() !== generation || getAppStorage() !== storage || getAccountScope() !== scope) throw Error(RESTORE_CHANGED_MESSAGE); if (signal?.aborted) throw new Stopped(); };
  const session: Session = {generation, storage, steps: [], at: new Date().toISOString(), persisted: true};
  // A new restore replaces the previous one's Undo, in memory and stored (its recovery copies stay as they are).
  last = session; removeRecord(storage);
  const outcome: RestoreOutcome = {restored: [], failed: [], photos: {added: 0, skipped: 0}, undoable: false, undoAfterReload: false, stopped: false, health: false};
  const ordered = [...choices].sort((a, b) => Number(b.part.kind === 'module') - Number(a.part.kind === 'module'));
  try {
    for (const {part, mode} of ordered) {
      fence();
      await restorePart(part, mode, storage, session, outcome, fence);
    }
    if (photos.vision) await restoreVision(opened, session, outcome, fence);
    if (photos.progress) await restoreProgress(opened, session, outcome, fence);
  } catch (error) { if (!(error instanceof Stopped)) throw error; outcome.stopped = true; }
  outcome.undoable = session.steps.length > 0;
  outcome.undoAfterReload = outcome.undoable && session.persisted;
  return outcome;
}
async function restorePart(part: PlannedPart, mode: Exclude<RestoreMode, 'leave'>, storage: Storage, session: Session, outcome: RestoreOutcome, fence: () => void) {
  try {
    let current: unknown, unreadable = false;
    try { current = await currentValue(storage, part); } catch {
      if (mode === 'merge') throw Error('This device’s copy does not read, so it cannot be merged. Choose Replace; the unreadable copy is kept.');
      current = undefined; unreadable = true;
    }
    const next = nextValue(part, mode, current);
    if ('error' in next) throw Error(next.error);
    fence();
    if (part.kind === 'module') {
      const before = await moduleText(storage, part.key), raw = JSON.stringify(next.value);
      fence();
      try { await (isDurableMarker(storage.getItem(part.key)) ? restoreDurableStore(storage, part.key, part.schema, raw) : importPrivateStore(storage, part.key, part.schema, raw)); }
      catch (error) { throw Error(restoreFailureMessage(error, {durable: isDurableMarker(storage.getItem(part.key))}), {cause: error}); }
      session.steps.push({kind: 'module', key: part.key, label: part.label, before: await sha256OrNull(before), after: await sha256((await moduleText(storage, part.key)) ?? ''), text: before});
      announceModule(part.key);
    } else {
      const before = storage.getItem(part.key);
      // Session AD item 11: a device copy that does not read is kept as a recovery copy before Replace writes over it
      // (the preview promises this; the modules' own path already does it), so its bytes outlive the Undo.
      const copy = unreadable && before !== null ? `${part.key}:recovery:${crypto.randomUUID()}` : null;
      try { if (copy) storage.setItem(copy, before!); storage.setItem(part.key, JSON.stringify(next.value)); }
      catch { if (copy && storage.getItem(part.key) === before) try { storage.removeItem(copy); } catch { /* an extra copy is harmless */ } throw Error('This browser’s storage is full, so this part was not restored.'); }
      session.steps.push({kind: 'device', key: part.key, label: part.label, before, after: await sha256(storage.getItem(part.key)!)});
      announceDevice(part.key);
    }
    persist(session);
    outcome.restored.push(part.label);
    if (part.health) outcome.health = true;
  } catch (error) {
    if (interrupted(error)) throw error;
    outcome.failed.push({label: part.label, error: error instanceof Error ? error.message : 'Not restored; nothing changed.'});
  }
}

const typeOf = (name: string) => name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
async function restoreVision(opened: OpenedBackup, session: Session, outcome: RestoreOutcome, fence: () => void) {
  const scope = getAccountScope() ?? 'local', added: string[] = [];
  // What was added before an interruption is still recorded, so Undo removes it too.
  try {
    for (const entry of opened.vision) {
      fence();
      const id = entry.name.slice('vision/'.length).replace(/\.[a-z]+$/, '');
      try {
        if (await getImage(scope, id)) continue;
        const bytes = await entryBytes(opened.file, entry, RESTORE_LIMITS.visionBytes), size = imageSize(bytes), type = typeOf(entry.name);
        if (!size || size.type !== type || tooLarge(size)) { outcome.photos.skipped++; continue; }
        await putImage({id, scope, blob: new Blob([bytes], {type}), type, bytes: bytes.length, width: size.width, height: size.height, createdAt: opened.json.exportedAt});
        added.push(id); outcome.photos.added++;
      } catch (error) { if (interrupted(error)) throw error; outcome.photos.skipped++; }
    }
  } finally { if (added.length) { session.steps.push({kind: 'vision', scope, ids: added}); persist(session); } }
}
async function restoreProgress(opened: OpenedBackup, session: Session, outcome: RestoreOutcome, fence: () => void) {
  const backup = progressPhotosSchema.safeParse(opened.json.device.progressPhotos);
  if (!backup.success) return;
  const storage = session.storage, scope = photoScope(), before = storage.getItem(PROGRESS_PHOTOS_KEY);
  let index: ProgressPhotos;
  try { const parsed = before === null ? null : progressPhotosSchema.safeParse(JSON.parse(before)); if (parsed && !parsed.success) throw Error(); index = parsed ? parsed.data : {version: 1}; } catch { outcome.photos.skipped += (backup.data.photos ?? []).length; return; }
  const held = new Set((index.photos ?? []).map(p => p.id)), added: string[] = [];
  let stopped: Stopped | null = null;
  for (const p of backup.data.photos ?? []) {
    if (held.has(p.id)) continue;
    try { fence(); } catch (error) {
      if (!(error instanceof Stopped)) { for (const id of added) await deletePhotoBlob(scope, id).catch(() => {}); throw error; }
      stopped = error; break;
    }
    const entry = opened.photos.find(e => e.name === photoFileName(p)) ?? opened.photos.find(e => e.name === photoFileName({...p, type: p.type === 'image/jpeg' ? 'image/webp' : 'image/jpeg'}));
    try {
      if (!entry || await getPhotoBlob(scope, p.id)) { outcome.photos.skipped++; continue; }
      const bytes = await entryBytes(opened.file, entry, RESTORE_LIMITS.photoBytes), size = imageSize(bytes);
      if (!size || tooLarge(size) || (size.type !== 'image/webp' && size.type !== 'image/jpeg')) { outcome.photos.skipped++; continue; }
      const next = addPhotoEntry(index, {...p, type: size.type, bytes: bytes.length});
      await putPhotoBlob(scope, p.id, new Blob([bytes], {type: size.type}));
      index = next; added.push(p.id); outcome.photos.added++;
    } catch (error) { if (interrupted(error)) { for (const id of added) await deletePhotoBlob(scope, id).catch(() => {}); throw error; } outcome.photos.skipped++; }
  }
  if (added.length) {
    // A stop keeps the photos already added (with their index, so they show and Undo can remove them); an account change does not.
    try { if (!stopped) fence(); } catch (error) { for (const id of added) await deletePhotoBlob(scope, id).catch(() => {}); throw error; }
    try { storage.setItem(PROGRESS_PHOTOS_KEY, JSON.stringify(index)); } catch { for (const id of added) await deletePhotoBlob(scope, id).catch(() => {}); outcome.photos.added -= added.length; outcome.photos.skipped += added.length; if (stopped) throw stopped; return; }
    session.steps.push({kind: 'photos', scope, ids: added, before, after: await sha256(storage.getItem(PROGRESS_PHOTOS_KEY)!)});
    persist(session);
    announceDevice(PROGRESS_PHOTOS_KEY);
  }
  if (stopped) throw stopped;
}

/** Whether a restore can be undone here: this tab's last one (same account, same storage), or a stored one that has not expired. */
export function canUndoRestore(): boolean {
  try { return !!currentSession(); } catch { return false; }
}
const NONE = {available: false, afterReload: false, at: null} as const;
/** Whether anything the restore wrote still holds exactly what it wrote (a vision photo: is still there). */
async function anyStillRestored(session: Session): Promise<boolean> {
  const storage = session.storage;
  for (const step of session.steps) {
    try {
      if (step.kind === 'module') { const text = await moduleText(storage, step.key); if (text !== null && await sha256(text) === step.after) return true; }
      else if (step.kind === 'device' || step.kind === 'photos') { const text = storage.getItem(step.kind === 'device' ? step.key : PROGRESS_PHOTOS_KEY); if (text !== null && await sha256(text) === step.after) return true; }
      else for (const id of step.ids) if (await getImage(step.scope, id)) return true;
    } catch { /* this step does not read; look at the next */ }
  }
  return false;
}
/**
 * For the page on load and after a restore: whether "Undo this restore" is offered, whether it lasts beyond a reload,
 * and when the restore ran. A stored record that expired, or of which nothing is still as restored (every part was
 * changed since), is removed here, so a restore's undo never lingers past its use.
 */
export async function restoreUndoStatus(now = Date.now()): Promise<{available: boolean; afterReload: boolean; at: string | null}> {
  let session: Session | null;
  try {
    if (isShowcase()) return NONE;
    const storage = getAppStorage(), raw = (() => { try { return storage.getItem(RESTORE_UNDO_KEY); } catch { return null; } })();
    session = currentSession();
    if (!session) { if (raw !== null && !readRecord(storage, now)) removeRecord(storage); return NONE; }
    if (session === last) return {available: true, afterReload: session.persisted, at: session.at};
    if (!readRecord(storage, now)) { removeRecord(storage); return NONE; }
  } catch { return NONE; }
  if (!(await anyStillRestored(session))) { removeRecord(session.storage); return NONE; }
  return {available: true, afterReload: true, at: session.at};
}
/** A module's replaced bytes: from this tab's memory, or found again by digest among the module's recovery copies; undefined when no copy is left. */
async function replacedText(storage: Storage, step: Extract<UndoStep, {kind: 'module'}>): Promise<string | null | undefined> {
  if (step.text !== undefined) return step.text;
  if (step.before === null) return null;
  const copies: string[] = recoveryCopyKeys(storage, step.key).map(k => storage.getItem(k)).filter((v): v is string => v !== null);
  if (isDurableMarker(storage.getItem(step.key))) copies.unshift(...await localDatabase.recovery(durableSpace(storage, step.key), step.key));
  for (const copy of copies) if (await sha256(copy) === step.before) return copy;
  return undefined;
}
/**
 * Puts back exactly what the last restore replaced, newest first, also after a reload. Each module goes back through its
 * own validated path. A part changed since the restore (an edit here, or a sync from another device) is left as it is and
 * named (`kept`), so Undo never overwrites a later change (Gate B security read, finding 4); a module whose earlier copy
 * is no longer on this device is left as restored and named (`missing`).
 */
export async function undoRestore(): Promise<{failed: string[]; kept: string[]; missing: string[]}> {
  let found: Session | null = null;
  try { found = currentSession(); } catch { /* none */ }
  if (!found) throw Error('There is no restore to undo.');
  const session = found, failed: string[] = [], kept: string[] = [], missing: string[] = [], storage = session.storage;
  for (const step of [...session.steps].reverse()) {
    if (session.generation !== getAccountGeneration() || storage !== getAppStorage()) throw Error(RESTORE_CHANGED_MESSAGE);
    try {
      if (step.kind === 'module') {
        const now = await moduleText(storage, step.key);
        if (now === null || await sha256(now) !== step.after) { kept.push(step.label); continue; }
        const before = await replacedText(storage, step);
        if (before === undefined) { missing.push(step.label); continue; }
        const durable = isDurableMarker(storage.getItem(step.key)), schema = MODULE_PARTS.find(p => p.key === step.key)!.schema;
        if (before === null) { if (!durable) storage.removeItem(step.key); }
        else await (durable ? restoreDurableStore(storage, step.key, schema, before) : importPrivateStore(storage, step.key, schema, before));
        announceModule(step.key);
      } else if (step.kind === 'device') {
        const now = storage.getItem(step.key);
        if (now === null || await sha256(now) !== step.after) { kept.push(step.label); continue; }
        if (step.before === null) storage.removeItem(step.key); else storage.setItem(step.key, step.before);
        announceDevice(step.key);
      } else if (step.kind === 'vision') await deleteImages(step.scope, step.ids);
      else {
        const now = storage.getItem(PROGRESS_PHOTOS_KEY);
        if (now === null || await sha256(now) !== step.after) { kept.push('Progress photos'); continue; }
        for (const id of step.ids) await deletePhotoBlob(step.scope, id);
        if (step.before === null) storage.removeItem(PROGRESS_PHOTOS_KEY); else storage.setItem(PROGRESS_PHOTOS_KEY, step.before);
        announceDevice(PROGRESS_PHOTOS_KEY);
      }
    } catch { failed.push(step.kind === 'module' || step.kind === 'device' ? step.label : 'Photos'); }
  }
  last = null; removeRecord(storage);
  return {failed, kept, missing};
}
/** "Keep the restore": the person is done with it; the Undo goes, here and stored. Recovery copies stay, as after any restore. */
export function dismissRestoreUndo() {
  last = null;
  try { if (!isShowcase()) removeRecord(getAppStorage()); } catch { /* the account is locked: nothing to remove in this view */ }
}
/** Forgets this tab's in-memory undo (an account change). The stored record stays with the account it belongs to. */
export function forgetRestoreUndo() { last = null; }

/** Session AD item 11 (ADR-026): what the page says after a restore, in plain words. */
export const RESTORE_NOTES = {
  undoAfterReload: `You can undo this restore here for ${RESTORE_UNDO_DAYS} days, also after a reload, unless you change those records first or choose “Keep the restore”.`,
  undoThisTab: 'You can undo this restore until you reload or close this tab. After that, restoring an earlier backup again brings those records back.',
  healthLocal: 'Health was restored on this device only. It stays here until you turn on Health sync in Settings → Sync.',
  healthSyncing: 'Health sync is on in this tab, so the restored Health records sync with your account.',
  stored: (at: string, until: string) => `A restore from ${at} can still be undone here until ${until}, unless you change those records first.`,
  missing: (labels: readonly string[]) => `Their earlier copy is no longer on this device, so they stay as restored: ${labels.join(', ')}.`,
} as const;
/** The notes under a restore's result: stopped midway, Health and its sync, how long Undo lasts. */
export function restoreNotes(outcome: RestoreOutcome, {account, healthSync}: {account: boolean; healthSync: boolean}): string[] {
  const notes: string[] = [];
  if (outcome.stopped) notes.push(RESTORE_STOPPED_MESSAGE);
  if (outcome.health && account) notes.push(healthSync ? RESTORE_NOTES.healthSyncing : RESTORE_NOTES.healthLocal);
  if (outcome.undoable) notes.push(outcome.undoAfterReload ? RESTORE_NOTES.undoAfterReload : RESTORE_NOTES.undoThisTab);
  return notes;
}
/** The day a stored restore ran and the day its Undo ends (YYYY-MM-DD, as the preview names the export's day). */
export const undoDays = (at: string) => ({at: at.slice(0, 10), until: new Date(Date.parse(at) + RESTORE_UNDO_DAYS * 86_400_000).toISOString().slice(0, 10)});
