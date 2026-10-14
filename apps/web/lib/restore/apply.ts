import {getAppStorage, isShowcase} from '../showcase-storage';
import {getAccountGeneration, getAccountScope} from '../account-session';
import {importPrivateStore, parsePrivateData} from '../private-storage';
import {exportDurableStore, isDurableMarker, readDurableStore, restoreDurableStore} from '../vault/local';
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
 * same path its own page uses, and keeps what each write replaced so the whole restore can be undone for the rest of the
 * session (kept in this tab's memory: until the tab reloads or closes, or the account changes; never written anywhere).
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
type UndoStep =
  | {kind: 'module'; key: string; label: string; before: string | null; after: string | null}
  | {kind: 'device'; key: string; label: string; before: string | null; after: string}
  | {kind: 'vision'; scope: string; ids: string[]}
  | {kind: 'photos'; scope: string; ids: string[]; before: string | null; after: string};
export type RestoreOutcome = {restored: string[]; failed: {label: string; error: string}[]; photos: {added: number; skipped: number}; undoable: boolean};
type Session = {generation: number; storage: Storage; steps: UndoStep[]};
let last: Session | null = null;

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
/** Every key a restore may write: the parts in plan.ts and the progress-photo index, nothing else. */
export const RESTORE_KEYS: readonly string[] = [...MODULE_PARTS.map(p => p.key), ...DEVICE_PARTS.map(p => p.key), PROGRESS_PHOTOS_KEY];

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

/** Applies the choices. Refuses in the Showcase; stops if the account changes on the way. */
export async function applyRestore(opened: OpenedBackup, choices: readonly RestoreChoice[], photos: PhotoChoice): Promise<RestoreOutcome> {
  if (isShowcase()) throw Error(RESTORE_SHOWCASE_MESSAGE);
  const storage = getAppStorage(), generation = getAccountGeneration(), scope = getAccountScope();
  const fence = () => { if (isShowcase() || getAccountGeneration() !== generation || getAppStorage() !== storage || getAccountScope() !== scope) throw Error(RESTORE_CHANGED_MESSAGE); };
  const session: Session = {generation, storage, steps: []};
  last = session;
  const outcome: RestoreOutcome = {restored: [], failed: [], photos: {added: 0, skipped: 0}, undoable: false};
  const ordered = [...choices].sort((a, b) => Number(b.part.kind === 'module') - Number(a.part.kind === 'module'));
  for (const {part, mode} of ordered) {
    fence();
    try {
      let current: unknown;
      try { current = await currentValue(storage, part); } catch {
        if (mode === 'merge') throw Error('This device’s copy does not read, so it cannot be merged. Choose Replace; the unreadable copy is kept.');
        current = undefined;
      }
      const next = nextValue(part, mode, current);
      if ('error' in next) throw Error(next.error);
      fence();
      if (part.kind === 'module') {
        const before = await moduleText(storage, part.key), raw = JSON.stringify(next.value);
        fence();
        try { await (isDurableMarker(storage.getItem(part.key)) ? restoreDurableStore(storage, part.key, part.schema, raw) : importPrivateStore(storage, part.key, part.schema, raw)); }
        catch (error) { throw Error(restoreFailureMessage(error, {durable: isDurableMarker(storage.getItem(part.key))}), {cause: error}); }
        session.steps.push({kind: 'module', key: part.key, label: part.label, before, after: await moduleText(storage, part.key)});
        announceModule(part.key);
      } else {
        const before = storage.getItem(part.key);
        try { storage.setItem(part.key, JSON.stringify(next.value)); } catch { throw Error('This browser’s storage is full, so this part was not restored.'); }
        session.steps.push({kind: 'device', key: part.key, label: part.label, before, after: storage.getItem(part.key)!});
        announceDevice(part.key);
      }
      outcome.restored.push(part.label);
    } catch (error) {
      if (error instanceof Error && error.message === RESTORE_CHANGED_MESSAGE) throw error;
      outcome.failed.push({label: part.label, error: error instanceof Error ? error.message : 'Not restored; nothing changed.'});
    }
  }
  if (photos.vision) await restoreVision(opened, session, outcome, fence);
  if (photos.progress) await restoreProgress(opened, session, outcome, fence);
  outcome.undoable = session.steps.length > 0;
  return outcome;
}

const typeOf = (name: string) => name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
async function restoreVision(opened: OpenedBackup, session: Session, outcome: RestoreOutcome, fence: () => void) {
  const scope = getAccountScope() ?? 'local', added: string[] = [];
  for (const entry of opened.vision) {
    fence();
    const id = entry.name.slice('vision/'.length).replace(/\.[a-z]+$/, '');
    try {
      if (await getImage(scope, id)) continue;
      const bytes = await entryBytes(opened.file, entry, RESTORE_LIMITS.visionBytes), size = imageSize(bytes), type = typeOf(entry.name);
      if (!size || size.type !== type || tooLarge(size)) { outcome.photos.skipped++; continue; }
      await putImage({id, scope, blob: new Blob([bytes], {type}), type, bytes: bytes.length, width: size.width, height: size.height, createdAt: opened.json.exportedAt});
      added.push(id); outcome.photos.added++;
    } catch (error) { if (error instanceof Error && error.message === RESTORE_CHANGED_MESSAGE) throw error; outcome.photos.skipped++; }
  }
  if (added.length) session.steps.push({kind: 'vision', scope, ids: added});
}
async function restoreProgress(opened: OpenedBackup, session: Session, outcome: RestoreOutcome, fence: () => void) {
  const backup = progressPhotosSchema.safeParse(opened.json.device.progressPhotos);
  if (!backup.success) return;
  const storage = session.storage, scope = photoScope(), before = storage.getItem(PROGRESS_PHOTOS_KEY);
  let index: ProgressPhotos;
  try { const parsed = before === null ? null : progressPhotosSchema.safeParse(JSON.parse(before)); if (parsed && !parsed.success) throw Error(); index = parsed ? parsed.data : {version: 1}; } catch { outcome.photos.skipped += (backup.data.photos ?? []).length; return; }
  const held = new Set((index.photos ?? []).map(p => p.id)), added: string[] = [];
  for (const p of backup.data.photos ?? []) {
    if (held.has(p.id)) continue;
    fence();
    const entry = opened.photos.find(e => e.name === photoFileName(p)) ?? opened.photos.find(e => e.name === photoFileName({...p, type: p.type === 'image/jpeg' ? 'image/webp' : 'image/jpeg'}));
    try {
      if (!entry || await getPhotoBlob(scope, p.id)) { outcome.photos.skipped++; continue; }
      const bytes = await entryBytes(opened.file, entry, RESTORE_LIMITS.photoBytes), size = imageSize(bytes);
      if (!size || tooLarge(size) || (size.type !== 'image/webp' && size.type !== 'image/jpeg')) { outcome.photos.skipped++; continue; }
      const next = addPhotoEntry(index, {...p, type: size.type, bytes: bytes.length});
      await putPhotoBlob(scope, p.id, new Blob([bytes], {type: size.type}));
      index = next; added.push(p.id); outcome.photos.added++;
    } catch (error) { if (error instanceof Error && error.message === RESTORE_CHANGED_MESSAGE) throw error; outcome.photos.skipped++; }
  }
  if (!added.length) return;
  fence();
  try { storage.setItem(PROGRESS_PHOTOS_KEY, JSON.stringify(index)); } catch { for (const id of added) await deletePhotoBlob(scope, id).catch(() => {}); outcome.photos.added -= added.length; outcome.photos.skipped += added.length; return; }
  session.steps.push({kind: 'photos', scope, ids: added, before, after: storage.getItem(PROGRESS_PHOTOS_KEY)!});
  announceDevice(PROGRESS_PHOTOS_KEY);
}

/** Whether this session's last restore can still be undone (same account, same storage). */
export function canUndoRestore(): boolean {
  try { return !!last && last.steps.length > 0 && last.generation === getAccountGeneration() && last.storage === getAppStorage() && !isShowcase(); } catch { return false; }
}
/**
 * Puts back exactly what the last restore replaced, newest first. Each module goes back through its own validated path.
 * A part changed since the restore (an edit here, or a sync from another device) is left as it is and named, so Undo never
 * overwrites a later change (Gate B security read, finding 4).
 */
export async function undoRestore(): Promise<{failed: string[]; kept: string[]}> {
  if (!canUndoRestore()) throw Error('There is no restore to undo in this session.');
  const session = last!, failed: string[] = [], kept: string[] = [], storage = session.storage;
  for (const step of [...session.steps].reverse()) {
    if (session.generation !== getAccountGeneration() || storage !== getAppStorage()) throw Error(RESTORE_CHANGED_MESSAGE);
    try {
      if (step.kind === 'module') {
        if (await moduleText(storage, step.key) !== step.after) { kept.push(step.label); continue; }
        const durable = isDurableMarker(storage.getItem(step.key)), schema = MODULE_PARTS.find(p => p.key === step.key)!.schema;
        if (step.before === null) { if (!durable) storage.removeItem(step.key); }
        else await (durable ? restoreDurableStore(storage, step.key, schema, step.before) : importPrivateStore(storage, step.key, schema, step.before));
        announceModule(step.key);
      } else if (step.kind === 'device') {
        if (storage.getItem(step.key) !== step.after) { kept.push(step.label); continue; }
        if (step.before === null) storage.removeItem(step.key); else storage.setItem(step.key, step.before);
        announceDevice(step.key);
      } else if (step.kind === 'vision') await deleteImages(step.scope, step.ids);
      else {
        if (storage.getItem(PROGRESS_PHOTOS_KEY) !== step.after) { kept.push('Progress photos'); continue; }
        for (const id of step.ids) await deletePhotoBlob(step.scope, id);
        if (step.before === null) storage.removeItem(PROGRESS_PHOTOS_KEY); else storage.setItem(PROGRESS_PHOTOS_KEY, step.before);
        announceDevice(PROGRESS_PHOTOS_KEY);
      }
    } catch { failed.push(step.kind === 'module' || step.kind === 'device' ? step.label : 'Photos'); }
  }
  last = null;
  return {failed, kept};
}
/** Forgets the undo (an account change or erase). */
export function forgetRestoreUndo() { last = null; }
