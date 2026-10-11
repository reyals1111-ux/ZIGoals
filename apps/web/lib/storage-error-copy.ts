import {storageErrorCode, storageErrorMessage, type StorageErrorCode} from './vault/storage-errors';

/**
 * What the interface says when private storage refuses something (Session I, Part 5: QA-03, QA-18, QA-22). Each message
 * says what happened and what to do, ends with a short code for support, and never repeats any private content: no
 * names, amounts or file contents. The four library codes come from vault/storage-errors.ts; the interface adds
 * STORAGE_BLOCKED (the browser denies storage altogether) and SAVE_FAILED (anything else).
 */
export type StorageUiCode = StorageErrorCode | 'STORAGE_BLOCKED' | 'SAVE_FAILED';

const causes = function* (error: unknown) { for (let e = error, depth = 0; e && depth < 8; e = (e as {cause?: unknown}).cause, depth++) yield e as {name?: unknown}; };
/** The browser refused storage itself (private browsing, blocked site data): a SecurityError anywhere in the cause chain. */
export function isStorageBlocked(error: unknown): boolean {
  for (const e of causes(error)) if (e.name === 'SecurityError') return true;
  return false;
}
export function storageUiCode(error: unknown): StorageUiCode {
  return storageErrorCode(error) ?? (isStorageBlocked(error) ? 'STORAGE_BLOCKED' : 'SAVE_FAILED');
}
const coded = (text: string, code: string) => `${text} (${code})`;
const BLOCKED_SAVE = 'This browser is not letting ZIGoals keep data on this device (for example private browsing or blocked site data), so nothing was saved. Allow site data for this site, then reload.';
const SAVE_FAILED = 'This could not be saved, so nothing was changed. Try again; if it keeps failing, export a backup in Settings.';

/** A refused save: what happened, what to do, and its code. `durable` names transactional storage's limits. */
export function saveFailureMessage(error: unknown, {durable = false}: {durable?: boolean} = {}): string {
  const code = storageUiCode(error);
  return coded(code === 'STORAGE_BLOCKED' ? BLOCKED_SAVE : code === 'SAVE_FAILED' ? SAVE_FAILED : storageErrorMessage(code, {durable}), code);
}
/**
 * For surfaces whose own words also cover a refused entry (a day outside the schedule, an APR out of range): the coded
 * storage reason when storage itself refused, otherwise their own text.
 */
export function storageMessageOr(error: unknown, fallback: string, options?: {durable?: boolean}): string {
  return storageUiCode(error) === 'SAVE_FAILED' ? fallback : saveFailureMessage(error, options);
}
/**
 * A save refused through usePrivateStore's `update` (Session M, QA2-02: Health). That hook already words the coded
 * reason for the module's own storage (browser or transactional), so a storage refusal keeps that message as it is; any
 * other failure (a rejected entry, an unknown error) gets the surface's own text.
 */
export function updateRefusalMessage(error: unknown, fallback: string): string {
  if (storageUiCode(error) === 'SAVE_FAILED') return fallback;
  return error instanceof Error && /\([A-Z_]+\)$/.test(error.message) ? error.message : saveFailureMessage(error);
}
/**
 * A choice kept on this device only, outside the modules (a reminder time, a reminder dismissed for today; QA2-02): what
 * happened, what to do and the code, without the advice to move a module to transactional storage, which does not apply.
 */
export function deviceSettingFailureMessage(error: unknown): string {
  return saveFailureMessage(error, {durable: true});
}
/** A check-in that could not be kept (QA-03): it is shown as not done again, with the reason. */
export function checkInFailureMessage(error: unknown, options?: {durable?: boolean}): string {
  return `The check-in was not saved and is shown as before. ${saveFailureMessage(error, options)}`;
}
/** Storage denied when reading (QA-18) reads as blocked, not as damage; any other failed read is null (callers keep their own text). */
export function blockedReadMessage(error: unknown): string | null {
  return isStorageBlocked(error) ? coded('This browser is not letting ZIGoals read data on this device (for example private browsing or blocked site data). Nothing was changed. Allow site data for this site, then reload.', 'STORAGE_BLOCKED') : null;
}

/** Why a backup file cannot be restored into a module (QA-22), most specific first. */
export type BackupRefusal = 'TOO_LARGE' | 'NOT_A_BACKUP' | 'WRONG_MODULE' | 'NEWER_BACKUP' | 'DAMAGED';
export const BACKUP_KINDS = {platform: 'zigoals-platform', habits: 'zigoals-habits', health: 'zigoals-health'} as const;
type Module = keyof typeof BACKUP_KINDS;
const NAMES: Record<Module, string> = {platform: 'Positions and Goals', habits: 'Habits', health: 'Health'};
/**
 * Classifies a backup file the module's schema refused. `newest` is the newest schemaVersion this app reads for the
 * module; `limit` the module's size limit in bytes.
 */
export function backupRefusal(text: string, {module, newest, limit}: {module: Module; newest: number; limit: number}): BackupRefusal {
  if (new TextEncoder().encode(text).byteLength > limit) return 'TOO_LARGE';
  let data: unknown;
  try { data = JSON.parse(text); } catch { return 'NOT_A_BACKUP'; }
  const kind = data && typeof data === 'object' ? (data as {kind?: unknown}).kind : undefined, version = data && typeof data === 'object' ? (data as {schemaVersion?: unknown}).schemaVersion : undefined;
  if (typeof kind !== 'string') return 'NOT_A_BACKUP';
  if (kind !== BACKUP_KINDS[module]) return 'WRONG_MODULE';
  if (typeof version === 'number' && version > newest) return 'NEWER_BACKUP';
  return 'DAMAGED';
}
export function backupRefusalMessage(refusal: BackupRefusal, {module, kind, limit}: {module: Module; kind?: unknown; limit: number}): string {
  const other = (Object.keys(BACKUP_KINDS) as Module[]).find(m => BACKUP_KINDS[m] === kind);
  const text = {
    TOO_LARGE: `This file is larger than the ${limit / 1_000_000} MB this module can restore.`,
    NOT_A_BACKUP: 'This file is not a ZIGoals module backup.',
    WRONG_MODULE: other ? `This is a ${NAMES[other]} backup. Restore it under ${NAMES[other]}.` : `This backup belongs to a different module, not ${NAMES[module]}.`,
    NEWER_BACKUP: 'This backup was made by a newer version of ZIGoals. Reload to get the latest app, then try again.',
    DAMAGED: 'This backup is incomplete or damaged (for example a missing field or a repeated ID), so it cannot be restored safely.',
  }[refusal];
  return coded(`${text} Existing data was not changed.`, refusal);
}
/** A refused restore after the file was accepted: the storage reason, or a plain failure. */
export function restoreFailureMessage(error: unknown, options?: {durable?: boolean}): string {
  const code = storageUiCode(error);
  if (code === 'SAVE_FAILED') return coded('Restore failed. Existing data was preserved. Try again; if it keeps failing, check the file and this browser\'s storage.', 'RESTORE_FAILED');
  return saveFailureMessage(error, options);
}
