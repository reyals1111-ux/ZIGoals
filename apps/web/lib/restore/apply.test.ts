// @vitest-environment jsdom
import {Blob as NodeBlob} from 'node:buffer';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {HABITS_KEY, habitDataSchema} from '../habits';
import {HEALTH_STORAGE_KEY} from '../health';
import {PLATFORM_KEY} from '../positions';
import {GOAL_EXTRAS_KEY} from '../goal-extras/store';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';
import {activateShowcase} from '../showcase-storage';
import {planParts, type PlannedPart} from './plan';
import {openBackup, type OpenedBackup} from './read-backup';
import {RESTORE_KEYS, RESTORE_SHOWCASE_MESSAGE, RESTORE_UNDO_KEY, applyRestore, canUndoRestore, forgetRestoreUndo, undoRestore} from './apply';

// Session AB-Cloud Part 5 (ADR-023 C22): writing a restore and undoing it, on this device's storage.
const NOW = new Date('2026-10-14T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
const {records} = buildShowcase('2026-09-20', 'UTC', {aa: true});
async function backupOf(values: Record<string, string>): Promise<OpenedBackup> {
  const zip = buildEverythingZip(collectEverything(values, APP), {date: '2026-10-14', showcase: false, now: NOW});
  return openBackup(new NodeBlob([zip.bytes]) as unknown as Blob);
}
const snapshot = () => Object.fromEntries(Array.from({length: localStorage.length}, (_, i) => localStorage.key(i)!).map(k => [k, localStorage.getItem(k)]));
const part = (parts: PlannedPart[], id: string) => parts.find(p => p.id === id)!;
// Keys sync, consent and the vault keep (fictional values): a restore never touches them.
const UNTOUCHED = {'zigoals:vault-sync:v1': '{"health":false}', 'zigoals:sync-writes:v1': '{"on":true}', 'zigoals:extras-sync-choice:v1': '{"version":1,"enabled":false}', 'zigoals:push:v1': '{"endpoint":"https://push.invalid/x"}'};
// jsdom has no Web Locks; the storage path needs one (one tab here, so the work runs at once).
Object.defineProperty(navigator, 'locks', {configurable: true, value: {request: async (_key: string, work: () => unknown) => work()}});
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo(); });
afterEach(() => { localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo(); });

describe('applying a restore', () => {
  test('replace brings every chosen part back as it was exported; Undo puts back exactly the bytes it replaced', async () => {
    const opened = await backupOf(records);
    // This device since the backup: Habits changed, goal extras gone, a key the restore never writes.
    const habits = habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!));
    const changed = JSON.stringify({...habits, habits: habits.habits.slice(1)});
    localStorage.setItem(HABITS_KEY, changed); localStorage.setItem(PLATFORM_KEY, records[PLATFORM_KEY]!);
    for (const [k, v] of Object.entries(UNTOUCHED)) localStorage.setItem(k, v);
    const before = snapshot(), heard: string[] = [];
    const listen = (e: Event) => heard.push(String((e as CustomEvent).detail));
    window.addEventListener('zigoals:private-change', listen); window.addEventListener(ZIGI_STORE_EVENT, listen);
    const parts = planParts(opened.json);
    const outcome = await applyRestore(opened, [{part: part(parts, 'module:habits'), mode: 'replace'}, {part: part(parts, 'device:goalExtras'), mode: 'replace'}, {part: part(parts, 'module:health'), mode: 'replace'}], {vision: false, progress: false});
    window.removeEventListener('zigoals:private-change', listen); window.removeEventListener(ZIGI_STORE_EVENT, listen);
    expect(outcome).toMatchObject({restored: ['Habits', 'Health', 'Goal plans, areas and visions'], failed: [], undoable: true});
    expect(JSON.parse(localStorage.getItem(HABITS_KEY)!)).toEqual(opened.json.modules.habits);
    expect(JSON.parse(localStorage.getItem(HEALTH_STORAGE_KEY)!)).toEqual(opened.json.modules.health);
    expect(JSON.parse(localStorage.getItem(GOAL_EXTRAS_KEY)!)).toEqual(opened.json.device.goalExtras);
    expect(heard).toEqual([HABITS_KEY, HEALTH_STORAGE_KEY, GOAL_EXTRAS_KEY]);
    // Only the chosen keys changed, plus the module's recovery copy of what it replaced and the restore's own undo record
    // (Session AD item 11: Undo survives a reload); sync, consent and push untouched.
    const after = snapshot();
    const changedKeys = Object.keys(after).filter(k => after[k] !== before[k]);
    expect(changedKeys.filter(k => !k.includes(':recovery:')).sort()).toEqual([GOAL_EXTRAS_KEY, HABITS_KEY, HEALTH_STORAGE_KEY, RESTORE_UNDO_KEY].sort());
    // The undo record never holds a module's bytes (they are its recovery copy): here, not the Habits this device had.
    expect(after[RESTORE_UNDO_KEY]).not.toContain(changed.slice(0, 200)); expect(after[RESTORE_UNDO_KEY]!.length).toBeLessThan(2_000);
    for (const [k, v] of Object.entries(UNTOUCHED)) expect(after[k]).toBe(v);
    for (const k of changedKeys) expect(RESTORE_KEYS.includes(k) || k === RESTORE_UNDO_KEY || k.startsWith(`${HABITS_KEY}:recovery:`), k).toBe(true);
    // Undo: the exact earlier bytes, and keys that did not exist are gone again.
    expect(canUndoRestore()).toBe(true);
    expect(await undoRestore()).toEqual({failed: [], kept: [], missing: []});
    const undone = snapshot();
    expect(undone[RESTORE_UNDO_KEY]).toBeUndefined();
    expect(undone[HABITS_KEY]).toBe(changed);
    expect(undone[GOAL_EXTRAS_KEY]).toBeUndefined(); expect(undone[HEALTH_STORAGE_KEY]).toBeUndefined();
    for (const k of Object.keys(before)) expect(undone[k], k).toBe(before[k]);
    expect(canUndoRestore()).toBe(false);
    await expect(undoRestore()).rejects.toThrow(/no restore to undo/);
  });
  test('merge adds what the backup has and this device lacks, and leaves every habit this device holds as it is', async () => {
    const habits = habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!));
    const opened = await backupOf(records);
    const mine = {...habits, habits: [{...habits.habits[0]!, title: 'Renamed here'}]};
    localStorage.setItem(HABITS_KEY, JSON.stringify(mine));
    const outcome = await applyRestore(opened, [{part: part(planParts(opened.json), 'module:habits'), mode: 'merge'}], {vision: false, progress: false});
    expect(outcome.failed).toEqual([]);
    const merged = habitDataSchema.parse(JSON.parse(localStorage.getItem(HABITS_KEY)!));
    expect(merged.habits.map(h => h.id)).toEqual(habits.habits.map(h => h.id));
    expect(merged.habits[0]!.title).toBe('Renamed here');
    expect(merged.habits.slice(1)).toEqual(habits.habits.slice(1));
  });
  test('a part that cannot be written is reported and the others still restore; an unreadable device copy is never merged', async () => {
    const opened = await backupOf(records);
    localStorage.setItem(GOAL_EXTRAS_KEY, '{not json');
    const parts = planParts(opened.json);
    const outcome = await applyRestore(opened, [{part: part(parts, 'device:goalExtras'), mode: 'merge'}, {part: part(parts, 'module:habits'), mode: 'replace'}], {vision: false, progress: false});
    expect(outcome.restored).toEqual(['Habits']);
    expect(outcome.failed).toEqual([{label: 'Goal plans, areas and visions', error: expect.stringMatching(/cannot be merged/)}]);
    expect(localStorage.getItem(GOAL_EXTRAS_KEY)).toBe('{not json');
  });
  test('in the Showcase nothing is restored', async () => {
    const opened = await backupOf(records);
    activateShowcase(sessionStorage, '2026-10-14', {}, 'test');
    await expect(applyRestore(opened, [{part: part(planParts(opened.json), 'module:habits'), mode: 'replace'}], {vision: false, progress: false})).rejects.toThrow(RESTORE_SHOWCASE_MESSAGE);
    expect(localStorage.getItem(HABITS_KEY)).toBeNull();
  });
});

describe('Undo never overwrites a later change (Gate B security read, finding 4)', () => {
  test('a part changed after the restore (an edit, or a sync from another device) is left as it is and named; the rest is undone', async () => {
    const opened = await backupOf(records);
    const parts = planParts(opened.json);
    await applyRestore(opened, [{part: part(parts, 'module:habits'), mode: 'replace'}, {part: part(parts, 'device:goalExtras'), mode: 'replace'}], {vision: false, progress: false});
    // After the restore, goal extras change (say, a sync brought another device's edit).
    const later = JSON.stringify({...JSON.parse(localStorage.getItem(GOAL_EXTRAS_KEY)!), areas: []});
    localStorage.setItem(GOAL_EXTRAS_KEY, later);
    expect(await undoRestore()).toEqual({failed: [], kept: ['Goal plans, areas and visions'], missing: []});
    expect(localStorage.getItem(GOAL_EXTRAS_KEY)).toBe(later);
    expect(localStorage.getItem(HABITS_KEY)).toBeNull();
  });
});
