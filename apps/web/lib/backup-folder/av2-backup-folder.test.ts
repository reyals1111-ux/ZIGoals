// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {BACKUP_REMINDER_KEY, backupReminderSchema, type BackupReminder} from '../backup-reminder';
import {couldNotWrite, nextDueOn, scheduleDue, withSchedule, wroteCopy} from './schedule';
import {folderOf, folderSupported, forgetFolder, keepFolder, writable, writeInto, type FolderHandle} from './handle';

vi.mock('../export/make-everything', () => ({buildEverythingExport: vi.fn(async () => ({name: 'zigoals-export-2026-11-22.zip', bytes: new Uint8Array([80, 75, 3, 4]), notes: []}))}));
vi.mock('../showcase-storage', () => ({isShowcase: () => false, getAppStorage: () => window.localStorage}));

/**
 * Session AV lane 2 (N6 #193, Loop Habit Tracker's automatic backups; TIER 3 (stored format), additive): a scheduled copy
 * of Export everything into a folder chosen once (File System Access), or a reminder where the browser cannot.
 */
const r = (more: Partial<BackupReminder> = {}): BackupReminder => backupReminderSchema.parse({version: 1, ...more});
/** A folder handle as Chromium gives one: files written into a map; permission as given. */
function fakeFolder(permission: 'granted' | 'prompt' | 'denied' = 'granted', answer: 'granted' | 'denied' = 'granted') {
  const files = new Map<string, Uint8Array>();
  const handle: FolderHandle & {files: typeof files} = {kind: 'directory', name: 'Backups', files,
    queryPermission: async () => permission, requestPermission: async () => answer,
    getFileHandle: async name => ({createWritable: async () => { let data: Uint8Array | null = null; return {write: async (d: BufferSource | Blob) => { data = new Uint8Array(d as Uint8Array); }, close: async () => { files.set(name, data!); }, abort: async () => {}}; }})};
  return handle;
}
beforeEach(() => { localStorage.clear(); Object.defineProperty(window, 'isSecureContext', {value: true, configurable: true}); });
afterEach(() => { Reflect.deleteProperty(window, 'showDirectoryPicker'); });

describe('the schedule (pure)', () => {
  test('due when no copy was made in its period; a copy marked by hand counts; the next day is said', () => {
    expect(scheduleDue(r(), '2026-11-22')).toBe(false);
    expect(scheduleDue(r({schedule: {every: 'week'}}), '2026-11-22')).toBe(true);
    expect(scheduleDue(r({schedule: {every: 'week', lastOn: '2026-11-20'}}), '2026-11-22')).toBe(false);
    expect(scheduleDue(r({schedule: {every: 'week', lastOn: '2026-11-15'}}), '2026-11-22')).toBe(true);
    expect(scheduleDue(r({savedOn: '2026-11-21', schedule: {every: 'week', lastOn: '2026-11-01'}}), '2026-11-22')).toBe(false);
    expect(scheduleDue(r({schedule: {every: 'day', lastOn: '2026-11-21'}}), '2026-11-22')).toBe(true);
    expect(scheduleDue(r({schedule: {every: 'month', lastOn: '2026-11-01'}}), '2026-11-22')).toBe(false);
    expect(nextDueOn(r({schedule: {every: 'week', lastOn: '2026-11-20'}}), '2026-11-22')).toBe('2026-11-27');
    expect(nextDueOn(r({schedule: {every: 'week', lastOn: '2026-10-01'}}), '2026-11-22')).toBe('2026-11-22');
    expect(nextDueOn(r(), '2026-11-22')).toBeNull();
  });
  test('a copy written sets the schedule\'s day and the "saved a copy" mark, and clears a failure; a failure is kept for Your data', () => {
    const failed = couldNotWrite(r({schedule: {every: 'week', folder: 'Backups'}}), '2026-11-21');
    expect(failed.schedule!.failedOn).toBe('2026-11-21');
    expect(wroteCopy(failed, '2026-11-22')).toEqual(r({savedOn: '2026-11-22', schedule: {every: 'week', folder: 'Backups', lastOn: '2026-11-22'}}));
    expect(withSchedule(r({savedOn: '2026-11-01', schedule: {every: 'day'}}), null)).toEqual(r({savedOn: '2026-11-01'}));
  });
  test('stored additively: a value this build cannot read is dropped, never failing the record; the other fields stay', () => {
    expect(backupReminderSchema.parse({version: 1, savedOn: '2026-11-01', schedule: {every: 'hourly'}})).toEqual({version: 1, savedOn: '2026-11-01'});
    expect(backupReminderSchema.parse({version: 1, schedule: {every: 'week', later: 1}}).schedule).toEqual({every: 'week', later: 1});
    // A record written before this build reads exactly as before.
    expect(backupReminderSchema.parse({version: 1, savedOn: '2026-11-01', off: true})).toEqual({version: 1, savedOn: '2026-11-01', off: true});
  });
});

describe('the folder', () => {
  test('offered only where the browser has a folder picker, on a secure page that is not in a frame', () => {
    expect(folderSupported(window)).toBe(false);
    Object.assign(window, {showDirectoryPicker: async () => fakeFolder()});
    expect(folderSupported(window)).toBe(true);
    Object.defineProperty(window, 'isSecureContext', {value: false, configurable: true});
    expect(folderSupported(window)).toBe(false);
  });
  test('kept per account scope in IndexedDB and forgotten on request; a write asks the browser only on a tap', async () => {
    // A real handle is structured-cloneable (the browser's own object); this stand-in holds only its plain fields.
    const handle = {kind: 'directory', name: 'Backups'} as FolderHandle;
    await keepFolder('local', handle);
    expect((await folderOf('local'))?.name).toBe('Backups');
    expect(await folderOf('10000000-0000-4000-8000-000000000001')).toBeNull();
    await forgetFolder('local');
    expect(await folderOf('local')).toBeNull();
    expect(await writable(fakeFolder('prompt'), false)).toBe(false);
    expect(await writable(fakeFolder('prompt', 'granted'), true)).toBe(true);
    expect(await writable(fakeFolder('prompt', 'denied'), true)).toBe(false);
    expect(await writable(fakeFolder('denied'), true)).toBe(false);
    const f = fakeFolder(); await writeInto(f, 'a.zip', new Uint8Array([1, 2]));
    expect([...f.files.get('a.zip')!]).toEqual([1, 2]);
  });
});

describe('the scheduled copy', () => {
  const store = (rec: BackupReminder) => { localStorage.setItem(BACKUP_REMINDER_KEY, JSON.stringify(rec)); return localStorage; };
  const stored = () => JSON.parse(localStorage.getItem(BACKUP_REMINDER_KEY)!);
  test('due with a folder and permission: Export everything\'s own file is written into it, and the record says so', async () => {
    Object.assign(window, {showDirectoryPicker: async () => fakeFolder()});
    const {runScheduledBackup} = await import('./run');
    const folder = fakeFolder();
    const result = await runScheduledBackup({storage: store(r({schedule: {every: 'week', folder: 'Backups', lastOn: '2026-11-01'}})), today: '2026-11-22', handle: folder});
    expect(result).toEqual({state: 'written', name: 'zigoals-export-2026-11-22.zip'});
    expect([...folder.files.get('zigoals-export-2026-11-22.zip')!]).toEqual([80, 75, 3, 4]);
    expect(stored()).toEqual({version: 1, savedOn: '2026-11-22', schedule: {every: 'week', folder: 'Backups', lastOn: '2026-11-22'}});
    expect(await runScheduledBackup({storage: localStorage, today: '2026-11-23', handle: folder})).toEqual({state: 'not-due'});
  });
  // Session AV lane 2 (CI run 2007): Settings → Your data read "No copy yet. A copy is due now." after "Make a copy now"
  // wrote one, because the record was written without telling the page's readers; now every reader is told, once.
  test('a written copy tells the page\'s readers of the schedule, as a component\'s own save does', async () => {
    Object.assign(window, {showDirectoryPicker: async () => fakeFolder()});
    const {runScheduledBackup} = await import('./run');
    const told: unknown[] = [], listen = (e: Event) => told.push((e as CustomEvent<string>).detail);
    window.addEventListener('zigoals:zigi-store', listen);
    try {
      expect((await runScheduledBackup({storage: store(r({schedule: {every: 'week', folder: 'Backups', lastOn: '2026-11-01'}})), today: '2026-11-22', handle: fakeFolder()})).state).toBe('written');
      expect(told).toEqual([BACKUP_REMINDER_KEY]);
    } finally { window.removeEventListener('zigoals:zigi-store', listen); }
  });
  test('the browser wants a tap: nothing is written until the tap; a browser without folders reminds; no schedule: off', async () => {
    Object.assign(window, {showDirectoryPicker: async () => fakeFolder()});
    const {runScheduledBackup} = await import('./run');
    const asking = fakeFolder('prompt', 'granted');
    expect(await runScheduledBackup({storage: store(r({schedule: {every: 'day', folder: 'Backups'}})), today: '2026-11-22', handle: asking})).toEqual({state: 'ask'});
    expect(asking.files.size).toBe(0);
    expect((await runScheduledBackup({storage: localStorage, today: '2026-11-22', handle: asking, tap: true})).state).toBe('written');
    Reflect.deleteProperty(window, 'showDirectoryPicker');
    expect(await runScheduledBackup({storage: store(r({schedule: {every: 'day', folder: 'Backups'}})), today: '2026-11-22'})).toEqual({state: 'remind'});
    expect(await runScheduledBackup({storage: store(r({schedule: {every: 'day'}})), today: '2026-11-22'})).toEqual({state: 'remind'});
    expect(await runScheduledBackup({storage: store(r()), today: '2026-11-22'})).toEqual({state: 'off'});
  });
  test('a write that fails says so in plain words, keeps the day for Your data, and changes no record', async () => {
    Object.assign(window, {showDirectoryPicker: async () => fakeFolder()});
    const {runScheduledBackup} = await import('./run');
    const broken: FolderHandle = {...fakeFolder(), getFileHandle: async () => { throw new DOMException('gone', 'NotFoundError'); }};
    const result = await runScheduledBackup({storage: store(r({schedule: {every: 'day', folder: 'Backups'}})), today: '2026-11-22', handle: broken});
    expect(result).toEqual({state: 'failed', message: 'The folder is gone (moved or deleted). Choose it again.'});
    expect(stored()).toEqual({version: 1, schedule: {every: 'day', folder: 'Backups', failedOn: '2026-11-22'}});
  });
});
