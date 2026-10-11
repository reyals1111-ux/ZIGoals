import {describe, expect, it} from 'vitest';
import {backupRefusal, backupRefusalMessage, blockedReadMessage, checkInFailureMessage, deviceSettingFailureMessage, isStorageBlocked, restoreFailureMessage, saveFailureMessage, storageMessageOr, storageUiCode, updateRefusalMessage} from './storage-error-copy';
import {PrivateStorageError} from './vault/storage-errors';

// Session I, Part 5: coded storage messages in the interface (QA-03, QA-18, QA-22).
const blocked = () => Object.assign(new Error('The operation is insecure.'), {name: 'SecurityError'});
const quota = () => Object.assign(new Error('quota'), {name: 'QuotaExceededError'});
const wrapped = (cause: unknown) => new Error('Could not save private data.', {cause});

describe('codes', () => {
  it('reads the library code through a wrapper, tells blocked storage apart, and falls back to SAVE_FAILED', () => {
    expect(storageUiCode(wrapped(new PrivateStorageError('MODULE_LIMIT')))).toBe('MODULE_LIMIT');
    expect(storageUiCode(wrapped(quota()))).toBe('STORAGE_FULL');
    expect(storageUiCode(wrapped(new PrivateStorageError('CONFLICT')))).toBe('CONFLICT');
    expect(storageUiCode(wrapped(blocked()))).toBe('STORAGE_BLOCKED');
    expect(isStorageBlocked(blocked())).toBe(true);
    expect(storageUiCode(new Error('anything else'))).toBe('SAVE_FAILED');
    expect(storageUiCode(undefined)).toBe('SAVE_FAILED');
  });
});

describe('messages', () => {
  it('QA-03: a full module points to backup and transactional storage, ends with its code and repeats nothing private', () => {
    const message = checkInFailureMessage(wrapped(new PrivateStorageError('MODULE_LIMIT', {cause: new Error('Morning run 2026-10-01')})));
    expect(message).toMatch(/^The check-in was not saved and is shown as before\. /);
    expect(message).toContain('2 MB');expect(message).toContain('transactional storage');
    expect(message).toMatch(/\(MODULE_LIMIT\)$/);
    expect(message).not.toContain('Morning run');
  });
  it('names transactional limits for durable modules, and every code ends its message', () => {
    expect(saveFailureMessage(new PrivateStorageError('MODULE_LIMIT'), {durable: true})).toContain('32 MB');
    for (const [error, code] of [[quota(), 'STORAGE_FULL'], [new PrivateStorageError('NEWER_VERSION'), 'NEWER_VERSION'], [new PrivateStorageError('CONFLICT'), 'CONFLICT'], [blocked(), 'STORAGE_BLOCKED'], [new Error('x'), 'SAVE_FAILED']] as const)
      expect(saveFailureMessage(wrapped(error))).toMatch(new RegExp(`\\(${code}\\)$`));
  });
  it('QA-18: denied storage reads as blocked, never as damage; other read failures keep their own words', () => {
    const message = blockedReadMessage(wrapped(blocked()))!;
    expect(message).toContain('not letting ZIGoals read data');expect(message).not.toMatch(/damag|corrupt|Export the original/);
    expect(message).toMatch(/\(STORAGE_BLOCKED\)$/);
    expect(blockedReadMessage(new SyntaxError('Unexpected token'))).toBeNull();
  });
  it('surfaces with their own words keep them unless storage itself refused', () => {
    expect(storageMessageOr(new Error('Choose a scheduled day'), 'This day could not be saved.')).toBe('This day could not be saved.');
    expect(storageMessageOr(wrapped(quota()), 'This day could not be saved.')).toMatch(/^Your browser storage is full.*\(STORAGE_FULL\)$/);
    expect(storageMessageOr(wrapped(blocked()), 'x')).toMatch(/\(STORAGE_BLOCKED\)$/);
  });
  it('a failed restore says why when storage says why', () => {
    expect(restoreFailureMessage(wrapped(new PrivateStorageError('NEWER_VERSION')))).toMatch(/newer version.*\(NEWER_VERSION\)$/);
    expect(restoreFailureMessage(new Error('x'))).toMatch(/^Restore failed\. Existing data was preserved\..*\(RESTORE_FAILED\)$/);
  });
});

describe('QA-22: backup refusals are told apart', () => {
  const habits = {module: 'habits' as const, newest: 2, limit: 2_000_000};
  it('too large, not a backup, the wrong module, a newer version, or damaged', () => {
    expect(backupRefusal('x'.repeat(2_000_001), habits)).toBe('TOO_LARGE');
    expect(backupRefusal('{"kind":', habits)).toBe('NOT_A_BACKUP');
    expect(backupRefusal('[]', habits)).toBe('NOT_A_BACKUP');
    expect(backupRefusal(JSON.stringify({schemaVersion: 2, habits: []}), habits)).toBe('NOT_A_BACKUP');
    expect(backupRefusal(JSON.stringify({schemaVersion: 1, kind: 'zigoals-health'}), habits)).toBe('WRONG_MODULE');
    expect(backupRefusal(JSON.stringify({schemaVersion: 3, kind: 'zigoals-habits', habits: []}), habits)).toBe('NEWER_BACKUP');
    expect(backupRefusal(JSON.stringify({schemaVersion: 2, kind: 'zigoals-habits', habits: [{id: 'a'}, {id: 'a'}]}), habits)).toBe('DAMAGED');
  });
  it('each refusal has its own coded message that says nothing was changed', () => {
    const messages = (['TOO_LARGE', 'NOT_A_BACKUP', 'WRONG_MODULE', 'NEWER_BACKUP', 'DAMAGED'] as const).map(r => backupRefusalMessage(r, {module: 'habits', kind: 'zigoals-health', limit: 2_000_000}));
    expect(new Set(messages).size).toBe(5);
    for (const message of messages) expect(message).toMatch(/Existing data was not changed\. \((TOO_LARGE|NOT_A_BACKUP|WRONG_MODULE|NEWER_BACKUP|DAMAGED)\)$/);
    expect(messages[0]).toContain('2 MB');
    expect(messages[2]).toBe('This is a Health backup. Restore it under Health. Existing data was not changed. (WRONG_MODULE)');
  });
});

// Session M, Part A1 (QA2-02): Health and the reminders use the same coded messages.
describe('Health and reminders', () => {
  const asUpdate = (cause: unknown, durable = false) => new Error(saveFailureMessage(cause, {durable}), {cause});
  it('a refusal from update() keeps its coded message, worded for the module\'s own storage', () => {
    expect(updateRefusalMessage(asUpdate(quota()), 'fallback')).toBe(saveFailureMessage(quota()));
    expect(updateRefusalMessage(asUpdate(quota(), true), 'fallback')).toBe(saveFailureMessage(quota(), {durable: true}));
    expect(updateRefusalMessage(asUpdate(quota(), true), 'fallback')).toContain('free up space on this device');
    expect(updateRefusalMessage(asUpdate(blocked()), 'fallback')).toMatch(/\(STORAGE_BLOCKED\)$/);
    expect(updateRefusalMessage(asUpdate(new PrivateStorageError('CONFLICT')), 'fallback')).toMatch(/\(CONFLICT\)$/);
  });
  it('anything that is not a storage refusal keeps the surface\'s own words', () => {
    expect(updateRefusalMessage(new Error('Enter a whole number of millilitres.'), 'fallback')).toBe('fallback');
    expect(updateRefusalMessage(asUpdate(new Error('unknown')), 'fallback')).toBe('fallback');
    expect(updateRefusalMessage(undefined, 'fallback')).toBe('fallback');
  });
  it('a storage code reached without a coded message is worded here', () => {
    expect(updateRefusalMessage(wrapped(quota()), 'fallback')).toBe(saveFailureMessage(wrapped(quota())));
  });
  it('a device-only setting gives the code without the module-storage advice', () => {
    const full = deviceSettingFailureMessage(quota());
    expect(full).toContain('Your browser storage is full');expect(full).toMatch(/\(STORAGE_FULL\)$/);
    expect(full).not.toContain('transactional storage');
    expect(deviceSettingFailureMessage(blocked())).toMatch(/^This browser is not letting ZIGoals keep data on this device.*\(STORAGE_BLOCKED\)$/);
    expect(deviceSettingFailureMessage(new Error('anything else'))).toMatch(/\(SAVE_FAILED\)$/);
  });
});
