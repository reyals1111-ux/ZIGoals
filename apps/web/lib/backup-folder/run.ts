import {BACKUP_REMINDER, type BackupReminder} from '../backup-reminder';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {getAccountScope} from '../account-session';
import {getAppStorage, isShowcase} from '../showcase-storage';
import {localDate} from '../local-date';
import {couldNotWrite, scheduleDue, wroteCopy} from './schedule';
import {folderOf, folderSupported, writable, writeInto, type FolderHandle} from './handle';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';

/**
 * Session AV lane 2 (N6 #193, Loop Habit Tracker's automatic backups): makes the scheduled copy. The file is Export
 * everything's own (lib/export/make-everything.ts buildEverythingExport), made on this device and written into the folder
 * the person chose; nothing is uploaded. Never in the Showcase. Without a folder (or where the browser cannot write to
 * one) the schedule only reminds.
 *
 * - `written`: the copy is in the folder (the schedule's day and "saved a copy" are set);
 * - `ask`: due, but the browser wants the person's tap to write there (Settings → Your data, or the toast's button);
 * - `remind`: due, with no folder: the person is reminded to Export everything;
 * - `not-due`, `off`: nothing to do; `failed`: the write did not happen (said on Settings → Your data, kept for the next try).
 */
export type RunResult = {state: 'written'; name: string} | {state: 'ask' | 'remind' | 'not-due' | 'off'} | {state: 'failed'; message: string};
export const scope = () => getAccountScope() ?? 'local';

/**
 * Session AV lane 2 (CI run 2007): the schedule's record written here, then every reader on the page told (as a
 * component's own save does), so Settings → Your data says "Last copy written …, Next copy …" at once, not "No copy yet".
 */
function noteCopy(store: Parameters<typeof updateDeviceRecord>[0], change: (current: BackupReminder) => BackupReminder) {
  updateDeviceRecord(store, BACKUP_REMINDER, change);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: BACKUP_REMINDER.key}));
}
export async function runScheduledBackup({tap = false, force = false, storage, today = localDate(), handle}: {tap?: boolean; force?: boolean; storage?: Storage; today?: string; handle?: FolderHandle | null} = {}): Promise<RunResult> {
  if (isShowcase()) return {state: 'off'};
  const store = storage ?? getAppStorage(), r: BackupReminder = readDeviceRecord(store, BACKUP_REMINDER).data;
  if (!r.schedule) return {state: 'off'};
  if (!force && !scheduleDue(r, today)) return {state: 'not-due'};
  const folder = r.schedule.folder && folderSupported() ? handle === undefined ? await folderOf(scope()) : handle : null;
  if (!folder) return {state: 'remind'};
  if (!await writable(folder, tap)) return {state: 'ask'};
  try {
    const {buildEverythingExport} = await import('../export/make-everything');
    const {name, bytes} = await buildEverythingExport();
    await writeInto(folder, name, bytes);
    noteCopy(store, current => wroteCopy(current, today));
    return {state: 'written', name};
  } catch (e) {
    try { noteCopy(store, current => couldNotWrite(current, today)); } catch { /* storage refused */ }
    return {state: 'failed', message: e instanceof DOMException && e.name === 'QuotaExceededError' ? 'The folder’s disk is full, so the copy was not written.' : e instanceof DOMException && e.name === 'NotFoundError' ? 'The folder is gone (moved or deleted). Choose it again.' : 'The copy could not be written into the folder. Your records on this device were not changed.'};
  }
}
