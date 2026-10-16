// @vitest-environment jsdom
import {Blob as NodeBlob} from 'node:buffer';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {EVERYTHING_KEYS, buildEverythingZip, collectEverything} from '../export/everything';
import {DEVICE_RECORD_KEYS} from '../onboarding';
import {EXTRAS_DEVICE_KEYS} from '../vault/extras-keys';
import {HABITS_KEY, habitDataSchema} from '../habits';
import {HEALTH_STORAGE_KEY, createEmptyHealth} from '../health';
import {GOAL_EXTRAS_KEY} from '../goal-extras/store';
import {PROGRESS_PHOTOS_KEY} from '../aa-device-keys';
import {OLDER_THAN_DEVICE_MESSAGE, planParts, type PlannedPart} from './plan';
import {openBackup, type OpenedBackup} from './read-backup';
import * as first from './apply';
import {oversizedPhotosNote} from '../../components/restore/restore-backup';

/**
 * Session AD item 11 (ADR-026): a restore's Undo also after a reload, "Keep the restore", Stop midway, Health without
 * Health sync, an older part over a newer one, and photos whose index does not read. A reload is a fresh copy of the
 * restore code (vi.resetModules) over the same browser storage. Fictional data only.
 */
const NOW = new Date('2026-10-14T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
const {records} = buildShowcase('2026-09-20', 'UTC', {aa: true});
async function backupOf(values: Record<string, string>): Promise<OpenedBackup> {
  const zip = buildEverythingZip(collectEverything(values, APP), {date: '2026-10-14', showcase: false, now: NOW});
  return openBackup(new NodeBlob([zip.bytes]) as unknown as Blob);
}
const part = (parts: PlannedPart[], id: string) => parts.find(p => p.id === id)!;
const recoveryKeys = (key: string) => Object.keys(localStorage).filter(k => k.startsWith(`${key}:recovery:`));
/** What a reload does to the restore code: its memory is gone; browser storage stays. */
async function reload(): Promise<typeof first> { vi.resetModules(); return import('./apply'); }
const UNTOUCHED = {'zigoals:vault-sync:v1': '{"health":false}', 'zigoals:extras-sync-choice:v1': '{"version":1,"enabled":false}'};
Object.defineProperty(navigator, 'locks', {configurable: true, value: {request: async (_key: string, work: () => unknown) => work()}});
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); first.forgetRestoreUndo(); });
afterEach(() => { localStorage.clear(); sessionStorage.clear(); first.forgetRestoreUndo(); });

/** This device since the backup: Habits lost their first habit, goal extras lost their areas. */
async function restoredOverChanges(apply: typeof first = first) {
  const opened = await backupOf(records), habits = habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!));
  const myHabits = JSON.stringify({...habits, habits: habits.habits.slice(1)}), myExtras = JSON.stringify({...JSON.parse(records[GOAL_EXTRAS_KEY]!), areas: []});
  localStorage.setItem(HABITS_KEY, myHabits); localStorage.setItem(GOAL_EXTRAS_KEY, myExtras);
  for (const [k, v] of Object.entries(UNTOUCHED)) localStorage.setItem(k, v);
  const parts = planParts(opened.json);
  const outcome = await apply.applyRestore(opened, [{part: part(parts, 'module:habits'), mode: 'replace'}, {part: part(parts, 'device:goalExtras'), mode: 'replace'}], {vision: false, progress: false});
  return {opened, outcome, myHabits, myExtras};
}

describe('Undo after a reload', () => {
  test('puts back exactly the bytes the restore replaced: a module from its recovery copy, a device record from the undo record', async () => {
    const {outcome, myHabits, myExtras} = await restoredOverChanges();
    expect(outcome).toMatchObject({restored: ['Habits', 'Goal plans, areas and visions'], undoable: true, undoAfterReload: true, stopped: false});
    expect(localStorage.getItem(first.RESTORE_UNDO_KEY)).not.toBeNull();
    // The undo record holds the device record's earlier bytes, never the module's (those are the module's recovery copy).
    expect(localStorage.getItem(first.RESTORE_UNDO_KEY)).toContain(JSON.stringify(myExtras).slice(1, 60));
    expect(localStorage.getItem(first.RESTORE_UNDO_KEY)).not.toContain(myHabits.slice(0, 120));
    expect(recoveryKeys(HABITS_KEY).map(k => localStorage.getItem(k))).toEqual([myHabits]);
    const fresh = await reload();
    expect(fresh.canUndoRestore()).toBe(true);
    const status = await fresh.restoreUndoStatus();
    expect(status).toEqual({available: true, afterReload: true, at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)});
    expect(fresh.undoDays('2026-10-14T09:00:00.000Z')).toEqual({at: '2026-10-14', until: '2026-10-21'});
    expect(fresh.RESTORE_NOTES.stored('2026-10-14', '2026-10-21')).toBe('A restore from 2026-10-14 can still be undone here until 2026-10-21, unless you change those records first.');
    expect(await fresh.undoRestore()).toEqual({failed: [], kept: [], missing: []});
    expect(localStorage.getItem(HABITS_KEY)).toBe(myHabits);
    expect(localStorage.getItem(GOAL_EXTRAS_KEY)).toBe(myExtras);
    expect(localStorage.getItem(fresh.RESTORE_UNDO_KEY)).toBeNull();
    for (const [k, v] of Object.entries(UNTOUCHED)) expect(localStorage.getItem(k)).toBe(v);
    expect(fresh.canUndoRestore()).toBe(false);
    expect((await reload()).canUndoRestore()).toBe(false);
  });
  test('a part changed since the restore is left as it is and named; the rest is undone', async () => {
    const {myHabits} = await restoredOverChanges();
    const later = JSON.stringify({...JSON.parse(localStorage.getItem(GOAL_EXTRAS_KEY)!), areas: []});
    localStorage.setItem(GOAL_EXTRAS_KEY, later);
    const fresh = await reload();
    expect(await fresh.undoRestore()).toEqual({failed: [], kept: ['Goal plans, areas and visions'], missing: []});
    expect(localStorage.getItem(GOAL_EXTRAS_KEY)).toBe(later); expect(localStorage.getItem(HABITS_KEY)).toBe(myHabits);
  });
  test('once every restored part changed, Undo is no longer offered and its record is removed', async () => {
    await restoredOverChanges();
    localStorage.setItem(GOAL_EXTRAS_KEY, JSON.stringify({...JSON.parse(localStorage.getItem(GOAL_EXTRAS_KEY)!), areas: []}));
    localStorage.setItem(HABITS_KEY, JSON.stringify({...JSON.parse(localStorage.getItem(HABITS_KEY)!), habits: []}));
    const fresh = await reload();
    expect(await fresh.restoreUndoStatus()).toEqual({available: false, afterReload: false, at: null});
    expect(localStorage.getItem(fresh.RESTORE_UNDO_KEY)).toBeNull();
    expect(fresh.canUndoRestore()).toBe(false);
  });
  test('a module whose earlier copy is no longer on this device stays as restored and is named; nothing is guessed', async () => {
    await restoredOverChanges();
    const restored = localStorage.getItem(HABITS_KEY);
    for (const k of recoveryKeys(HABITS_KEY)) localStorage.removeItem(k);
    const fresh = await reload();
    expect(await fresh.undoRestore()).toEqual({failed: [], kept: [], missing: ['Habits']});
    expect(localStorage.getItem(HABITS_KEY)).toBe(restored);
    expect(fresh.RESTORE_NOTES.missing(['Habits'])).toBe('Their earlier copy is no longer on this device, so they stay as restored: Habits.');
  });
  test('the record ends after 7 days, and is removed then', async () => {
    await restoredOverChanges();
    const fresh = await reload();
    expect((await fresh.restoreUndoStatus(Date.now() + 6 * 86_400_000)).available).toBe(true);
    expect(await fresh.restoreUndoStatus(Date.now() + 8 * 86_400_000)).toEqual({available: false, afterReload: false, at: null});
    expect(localStorage.getItem(fresh.RESTORE_UNDO_KEY)).toBeNull();
  });
  test('a record that names a key a restore never writes, or does not read, is ignored', async () => {
    const at = new Date().toISOString(), until = new Date(Date.now() + 86_400_000).toISOString();
    localStorage.setItem(first.RESTORE_UNDO_KEY, JSON.stringify({version: 1, at, expiresAt: until, steps: [{kind: 'device', key: 'zigoals:vault-sync:v1', label: 'x', before: '{"health":true}', after: 'a'.repeat(64)}]}));
    expect(first.canUndoRestore()).toBe(false);
    await expect(first.undoRestore()).rejects.toThrow('There is no restore to undo.');
    localStorage.setItem(first.RESTORE_UNDO_KEY, '{not json');
    expect(first.canUndoRestore()).toBe(false);
    expect((await first.restoreUndoStatus()).available).toBe(false);
  });
});

test('the preview counts photos too large to restore in plain words', () => {
  expect(oversizedPhotosNote(1)).toBe('1 photo in this file is larger than ZIGoals restores, so it is left out.');
  expect(oversizedPhotosNote(3)).toBe('3 photos in this file are larger than ZIGoals restores, so they are left out.');
});
test('the undo record is a personal device key that stays on this device: never exported, restored or synced', () => {
  expect(DEVICE_RECORD_KEYS).toContain(first.RESTORE_UNDO_KEY);
  expect(EVERYTHING_KEYS).not.toContain(first.RESTORE_UNDO_KEY);
  expect(first.RESTORE_KEYS).not.toContain(first.RESTORE_UNDO_KEY);
  expect(EXTRAS_DEVICE_KEYS).not.toContain(first.RESTORE_UNDO_KEY);
});

describe('“Keep the restore”', () => {
  test('ends the Undo here and after a reload; the restored records and recovery copies stay', async () => {
    const {myHabits} = await restoredOverChanges();
    const restored = localStorage.getItem(HABITS_KEY);
    first.dismissRestoreUndo();
    expect(first.canUndoRestore()).toBe(false);
    expect(localStorage.getItem(first.RESTORE_UNDO_KEY)).toBeNull();
    expect((await reload()).canUndoRestore()).toBe(false);
    expect(localStorage.getItem(HABITS_KEY)).toBe(restored);
    expect(recoveryKeys(HABITS_KEY).map(k => localStorage.getItem(k))).toEqual([myHabits]);
  });
});

describe('when the undo record cannot be kept', () => {
  test('a device copy that does not read is kept as a recovery copy; the record would be too large, so Undo lasts until reload and says so', async () => {
    const opened = await backupOf(records), mine = `{not json ${'x'.repeat(first.RESTORE_UNDO_MAX_CHARS)}`;
    localStorage.setItem(GOAL_EXTRAS_KEY, mine);
    const outcome = await first.applyRestore(opened, [{part: part(planParts(opened.json), 'device:goalExtras'), mode: 'replace'}], {vision: false, progress: false});
    expect(outcome).toMatchObject({restored: ['Goal plans, areas and visions'], undoable: true, undoAfterReload: false});
    expect(localStorage.getItem(first.RESTORE_UNDO_KEY)).toBeNull();
    expect(recoveryKeys(GOAL_EXTRAS_KEY).map(k => localStorage.getItem(k))).toEqual([mine]);
    expect(first.restoreNotes(outcome, {account: false, healthSync: false})).toEqual([first.RESTORE_NOTES.undoThisTab]);
    expect(first.RESTORE_NOTES.undoThisTab).toBe('You can undo this restore until you reload or close this tab. After that, restoring an earlier backup again brings those records back.');
    expect(await first.restoreUndoStatus()).toEqual({available: true, afterReload: false, at: expect.any(String)});
    expect(await first.undoRestore()).toEqual({failed: [], kept: [], missing: []});
    expect(localStorage.getItem(GOAL_EXTRAS_KEY)).toBe(mine);
  });
});

describe('stopping midway', () => {
  test('Stop between two parts: what was restored is listed and can be undone (also after a reload); the rest is untouched', async () => {
    const opened = await backupOf(records), parts = planParts(opened.json), controller = new AbortController();
    localStorage.setItem(GOAL_EXTRAS_KEY, JSON.stringify({...JSON.parse(records[GOAL_EXTRAS_KEY]!), areas: []}));
    const extrasBefore = localStorage.getItem(GOAL_EXTRAS_KEY);
    // The person presses Stop as soon as the first part is written.
    const stopNow = () => controller.abort();
    window.addEventListener('zigoals:private-change', stopNow);
    const outcome = await first.applyRestore(opened, [{part: part(parts, 'device:goalExtras'), mode: 'replace'}, {part: part(parts, 'module:habits'), mode: 'replace'}, {part: part(parts, 'module:health'), mode: 'replace'}], {vision: false, progress: false}, {signal: controller.signal});
    window.removeEventListener('zigoals:private-change', stopNow);
    expect(outcome).toMatchObject({restored: ['Habits'], failed: [], stopped: true, undoable: true, undoAfterReload: true});
    expect(localStorage.getItem(HEALTH_STORAGE_KEY)).toBeNull(); expect(localStorage.getItem(GOAL_EXTRAS_KEY)).toBe(extrasBefore);
    expect(first.restoreNotes(outcome, {account: false, healthSync: false})).toEqual([first.RESTORE_STOPPED_MESSAGE, first.RESTORE_NOTES.undoAfterReload]);
    expect(first.RESTORE_STOPPED_MESSAGE).toBe('You stopped the restore. What was restored before you stopped is listed here and can be undone; nothing else was changed.');
    const fresh = await reload();
    expect(await fresh.undoRestore()).toEqual({failed: [], kept: [], missing: []});
    expect(localStorage.getItem(HABITS_KEY)).toBeNull();
  });
  test('a Stop before anything is written changes nothing and offers no Undo', async () => {
    const opened = await backupOf(records), controller = new AbortController();
    controller.abort();
    const outcome = await first.applyRestore(opened, [{part: part(planParts(opened.json), 'module:habits'), mode: 'replace'}], {vision: false, progress: false}, {signal: controller.signal});
    expect(outcome).toMatchObject({restored: [], stopped: true, undoable: false, undoAfterReload: false});
    expect(localStorage.getItem(HABITS_KEY)).toBeNull(); expect(localStorage.getItem(first.RESTORE_UNDO_KEY)).toBeNull();
  });
});

describe('Health without Health sync', () => {
  test('a Health part restores on this device only, never touches the sync or consent records, and the page says where it stays', async () => {
    const opened = await backupOf(records);
    for (const [k, v] of Object.entries(UNTOUCHED)) localStorage.setItem(k, v);
    const outcome = await first.applyRestore(opened, [{part: part(planParts(opened.json), 'module:health'), mode: 'replace'}], {vision: false, progress: false});
    expect(outcome).toMatchObject({restored: ['Health'], health: true});
    for (const [k, v] of Object.entries(UNTOUCHED)) expect(localStorage.getItem(k)).toBe(v);
    expect(first.restoreNotes(outcome, {account: true, healthSync: false})).toContain('Health was restored on this device only. It stays here until you turn on Health sync in Settings → Sync.');
    expect(first.restoreNotes(outcome, {account: true, healthSync: true})).toContain('Health sync is on in this tab, so the restored Health records sync with your account.');
    expect(first.restoreNotes(outcome, {account: false, healthSync: false}).join(' ')).not.toMatch(/Health/);
  });
});

describe('an older part over a newer one', () => {
  test('Replace is refused with a plain sentence and nothing is written; Merge adds what is missing', async () => {
    localStorage.setItem(HEALTH_STORAGE_KEY, records[HEALTH_STORAGE_KEY]!);
    const opened = await backupOf({[HEALTH_STORAGE_KEY]: JSON.stringify(createEmptyHealth())}), health = part(planParts(opened.json), 'module:health');
    const refused = await first.applyRestore(opened, [{part: health, mode: 'replace'}], {vision: false, progress: false});
    expect(refused).toMatchObject({restored: [], failed: [{label: 'Health', error: OLDER_THAN_DEVICE_MESSAGE}], undoable: false});
    expect(localStorage.getItem(HEALTH_STORAGE_KEY)).toBe(records[HEALTH_STORAGE_KEY]);
    const merged = await first.applyRestore(opened, [{part: health, mode: 'merge'}], {vision: false, progress: false});
    expect(merged).toMatchObject({restored: ['Health'], failed: []});
    expect(JSON.parse(localStorage.getItem(HEALTH_STORAGE_KEY)!).schemaVersion).toBe(JSON.parse(records[HEALTH_STORAGE_KEY]!).schemaVersion);
  });
});

describe('photos', () => {
  test('progress photos whose index on this device does not read: none is added, the index is left as it is', async () => {
    const photo = {id: 'photo_restore-0001', date: '2026-10-01', pose: 'front', bytes: 46, type: 'image/webp', at: '2026-10-01T08:00:00.000Z'};
    const opened = await backupOf({...records, [PROGRESS_PHOTOS_KEY]: JSON.stringify({version: 1, photos: [photo]})});
    localStorage.setItem(PROGRESS_PHOTOS_KEY, '{not json');
    const outcome = await first.applyRestore(opened, [], {vision: false, progress: true});
    expect(outcome).toMatchObject({photos: {added: 0, skipped: 1}, undoable: false});
    expect(localStorage.getItem(PROGRESS_PHOTOS_KEY)).toBe('{not json');
  });
});
