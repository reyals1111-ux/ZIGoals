// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {HABITS_KEY, habitDataSchema} from '../habits';
import {HEALTH_STORAGE_KEY, healthSchema} from '../health';
import {PLATFORM_KEY, platformSchema} from '../positions';
import {DASHBOARD_SETTINGS_KEY} from '../dashboard-settings';
import {CHECKLIST_KEY} from '../af-checklist-keys';
import {AI_MEMORY_KEY} from '../ai/store/keys';
import {JOURNAL_KEY} from '../journal/schema';
import {ERASE_AREAS, eraseArea, eraseInventory} from './erase-area';
import {vi} from 'vitest';
import {RESTORE_UNDO_KEY, dismissRestoreUndo, forgetRestoreUndo, restoreUndoStatus, undoRestore} from './apply';
import {TASKS_KEY} from '../tasks/schema';

// Session AL (GAP-176, C-BN-28): "Erase one area" on this device, with the restore's Undo. Fictional (Showcase) data only.
const {records} = buildShowcase('2026-09-20', 'UTC', {aa: true});
Object.defineProperty(navigator, 'locks', {configurable: true, value: {request: async (_key: string, work: () => unknown) => work()}});
const load = (extra: Record<string, string> = {}) => { for (const [k, v] of Object.entries({...records, ...extra})) localStorage.setItem(k, v); };
const snapshot = () => Object.fromEntries(Object.keys(localStorage).filter(k => !k.includes(':recovery:') && k !== 'zigoals:restore-undo:v1').map(k => [k, localStorage.getItem(k)]));
const note = (id: string, category: string) => ({id, text: `Fictional ${category} note`, category, source: 'person', createdAt: '2026-09-20T09:00:00.000Z', updatedAt: '2026-09-20T09:00:00.000Z'});
const path = {version: 1, items: [{id: 'ck_desk', kind: 'custom', label: 'Fictional tidy desk', addedAt: '2026-09-20T09:00:00.000Z'}], healthItems: [{id: 'ck_water', kind: 'health', input: 'water', addedAt: '2026-09-20T09:00:00.000Z'}], order: ['ck_desk', 'ck_water']};
const journal = {version: 1, entries: [{id: 'j1', date: '2026-09-19', text: 'Fictional: a calm day', createdAt: '2026-09-19T08:00:00.000Z'}], shareWithAi: false, followUps: true};
beforeEach(() => { localStorage.clear(); forgetRestoreUndo(); });
afterEach(() => { localStorage.clear(); forgetRestoreUndo(); });

describe('Erase one area', () => {
  test('Habits: every habit and the habit records go; Goals, Health and Today stay exactly as they were; Undo puts everything back', async () => {
    load();
    const before = snapshot(), rows = await eraseInventory(localStorage, 'Habits');
    expect(rows.map(r => r.part.id)).toContain('module:habits');
    expect(rows.every(r => !r.problem)).toBe(true);
    const outcome = await eraseArea(rows);
    expect(outcome).toMatchObject({failed: [], undoable: true});
    expect(habitDataSchema.parse(JSON.parse(localStorage.getItem(HABITS_KEY)!)).habits).toEqual([]);
    for (const key of [PLATFORM_KEY, HEALTH_STORAGE_KEY, DASHBOARD_SETTINGS_KEY]) expect(localStorage.getItem(key), key).toBe(before[key]);
    expect(await eraseInventory(localStorage, 'Habits')).toEqual([]);
    await undoRestore();
    expect(snapshot()).toEqual(before);
  });
  test('Goals and Wealth and Health: the modules are emptied in the version this device holds; Today’s preferences are never erased', async () => {
    load();
    const settings = localStorage.getItem(DASHBOARD_SETTINGS_KEY);
    for (const area of ['Goals and Wealth', 'Health'] as const) {
      const rows = await eraseInventory(localStorage, area);
      expect(rows.length, area).toBeGreaterThan(0);
      expect(rows.filter(r => r.problem), area).toEqual([]);
      expect((await eraseArea(rows)).failed, area).toEqual([]);
    }
    const platform = platformSchema.parse(JSON.parse(localStorage.getItem(PLATFORM_KEY)!)), health = healthSchema.parse(JSON.parse(localStorage.getItem(HEALTH_STORAGE_KEY)!));
    expect([platform.goals.length, platform.positions.length, health.diary.length, health.weights.length]).toEqual([0, 0, 0, 0]);
    expect(localStorage.getItem(DASHBOARD_SETTINGS_KEY)).toBe(settings);
    expect((await eraseInventory(localStorage, 'Today and Life')).some(r => r.part.id === 'module:settings')).toBe(false);
  });
  test('a shared record loses only its area’s share: Health takes the Checklist’s Health quick inputs and ZIGi’s health notes; Today and Life the rest', async () => {
    load({[CHECKLIST_KEY]: JSON.stringify(path), [AI_MEMORY_KEY]: JSON.stringify({version: 1, notes: [note('n_goal', 'goals'), note('n_diet', 'diet')]}), [JOURNAL_KEY]: JSON.stringify(journal)});
    await eraseArea(await eraseInventory(localStorage, 'Health'));
    const checklist = JSON.parse(localStorage.getItem(CHECKLIST_KEY)!), memory = JSON.parse(localStorage.getItem(AI_MEMORY_KEY)!);
    expect([checklist.items.length, checklist.healthItems.length]).toEqual([1, 0]);
    expect(memory.notes.map((n: {id: string}) => n.id)).toEqual(['n_goal']);
    expect(JSON.parse(localStorage.getItem(JOURNAL_KEY)!).entries).toHaveLength(1);
    await eraseArea(await eraseInventory(localStorage, 'Today and Life'));
    expect(JSON.parse(localStorage.getItem(JOURNAL_KEY)!).entries).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(CHECKLIST_KEY)!).items).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(AI_MEMORY_KEY)!).notes).toEqual([]);
  });
  test('an empty device has nothing to erase in any area', async () => {
    for (const area of ERASE_AREAS) expect(await eraseInventory(localStorage, area), area).toEqual([]);
  });
});

// Session AL (security delta review B, SB-1): an erase keeps a copy of what it erased only for its Undo; the copy goes when
// the Undo ends (Undo, "Keep the erase", its 7 days over, a later restore or erase). A restore's copies stay, as before.
const copies = (key?: string) => Object.keys(localStorage).filter(k => k.includes(':recovery:') && (!key || k.startsWith(`${key}:recovery:`)));
describe('SB-1: Erase one area keeps no recovery copy beyond its Undo', () => {
  test('Health: the copy exists for the Undo, and “Keep the erase” removes it', async () => {
    load();
    await eraseArea(await eraseInventory(localStorage, 'Health'));
    expect(copies(HEALTH_STORAGE_KEY)).toHaveLength(1);
    expect(localStorage.getItem(RESTORE_UNDO_KEY)).toContain('"erase":true');
    await dismissRestoreUndo();
    expect(copies(HEALTH_STORAGE_KEY)).toEqual([]);
    expect(localStorage.getItem(RESTORE_UNDO_KEY)).toBeNull();
  });
  test('Health: once the 7 days are over (after a reload), the page’s next look removes the copy and the record', async () => {
    load();
    await eraseArea(await eraseInventory(localStorage, 'Health'));
    forgetRestoreUndo(); // a reload: only the stored record is left
    expect((await restoreUndoStatus(Date.now() + 3 * 86_400_000)).available).toBe(true);
    expect(copies(HEALTH_STORAGE_KEY)).toHaveLength(1);
    expect((await restoreUndoStatus(Date.now() + 8 * 86_400_000)).available).toBe(false);
    expect(copies(HEALTH_STORAGE_KEY)).toEqual([]);
    expect(localStorage.getItem(RESTORE_UNDO_KEY)).toBeNull();
  });
  test('Undo puts Health back and then leaves no copy of it', async () => {
    load();
    const before = localStorage.getItem(HEALTH_STORAGE_KEY);
    await eraseArea(await eraseInventory(localStorage, 'Health'));
    forgetRestoreUndo();
    expect(await undoRestore()).toEqual({failed: [], kept: [], missing: []});
    expect(localStorage.getItem(HEALTH_STORAGE_KEY)).toBe(before);
    expect(copies()).toEqual([]);
  });
  test('a later erase replaces the Undo, and the first erase’s copies go with it', async () => {
    load();
    await eraseArea(await eraseInventory(localStorage, 'Health'));
    await eraseArea(await eraseInventory(localStorage, 'Habits'));
    expect(copies(HEALTH_STORAGE_KEY)).toEqual([]);
    expect(copies(HABITS_KEY)).toHaveLength(1);
  });
  test('a device record that does not read is erased with no recovery copy; Undo still puts its bytes back', async () => {
    load({[TASKS_KEY]: '{"version":1,"tasks":"not a list"}'});
    const rows = await eraseInventory(localStorage, 'Today and Life'), row = rows.find(r => r.part.key === TASKS_KEY);
    expect(row?.unreadable).toBe(true);
    await eraseArea(rows);
    expect(copies(TASKS_KEY)).toEqual([]);
    await undoRestore();
    expect(localStorage.getItem(TASKS_KEY)).toBe('{"version":1,"tasks":"not a list"}');
  });
  test('when the Undo cannot outlive the tab (its record is refused), no copy is kept at all; Undo here still works', async () => {
    load();
    const before = localStorage.getItem(HEALTH_STORAGE_KEY), real = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) { if (k === RESTORE_UNDO_KEY) throw new DOMException('full', 'QuotaExceededError'); real.call(this, k, v); });
    try {
      const outcome = await eraseArea(await eraseInventory(localStorage, 'Health'));
      expect(outcome).toMatchObject({undoable: true, undoAfterReload: false});
      expect(copies(HEALTH_STORAGE_KEY)).toEqual([]);
    } finally { spy.mockRestore(); }
    await undoRestore();
    expect(localStorage.getItem(HEALTH_STORAGE_KEY)).toBe(before);
  });
});

