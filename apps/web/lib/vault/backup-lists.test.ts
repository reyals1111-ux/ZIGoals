import {describe, expect, test} from 'vitest';
import {encryptBackup, decryptBackup, backupFormatVersion} from './backup';
import {summarizeBackupModules} from './backup-preview';
import {exportListSections, restoreListSection, LIST_INVALID} from './backup-lists';
import {TASKS_KEY, emptyTasks, tasksSchema, type Tasks} from '../tasks/schema';
import {addProject, addSection, addTask} from '../tasks/engine';
import {CHECKLIST_KEY, CHECKLIST_DAYS_KEY} from '../af-checklist-keys';
import {emptyChecklist, checklistSchema, checklistDaysSchema, type Checklist, type ChecklistDays} from '../checklist/schema';
import {addCustom} from '../checklist/store';
import {createEmptyHealth} from '../health';

// Session AL (P-LS-36, LS-025, LS-064): Tasks and the Checklist in the encrypted backup, its preview and its restore.
const NOW = new Date('2026-11-02T09:00:00.000Z'), TODAY = '2026-11-02';
function memory(values: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(values));
  return {get length() { return map.size; }, key: (i: number) => [...map.keys()][i] ?? null, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); }, clear: () => map.clear()};
}
function tasks(): Tasks {
  let r = addProject(emptyTasks(), {name: 'Fictional home', colour: 'teal'}, 'p');
  r = addSection(r, 'p', 'Kitchen', 's');
  r = addTask(r, {title: 'Fictional: call the bank', level: 1, projectId: 'p', sectionId: 's', labels: ['errand'], due: TODAY, recur: {every: 'week', interval: 1}, health: 'sleep'}, {id: 'task_a', at: NOW, today: TODAY, allowPast: true});
  return tasksSchema.parse(addTask(r, {title: 'Fictional: water the plants'}, {id: 'task_b', at: NOW, today: TODAY, allowPast: true}));
}
function path(): Checklist {
  const r = addCustom(emptyChecklist(), {label: 'Fictional tidy desk'}, {id: 'ck_desk', at: NOW});
  return checklistSchema.parse({...r, healthItems: [{id: 'ck_water', kind: 'health', input: 'water', addedAt: NOW.toISOString()}], order: [...r.order, 'ck_water']});
}
const days = (): ChecklistDays => checklistDaysSchema.parse({version: 1, days: {'2026-10-31': {total: 3, done: 3, perfect: true}, '2026-11-01': {total: 3, done: 1}}, today: {date: TODAY, ticks: [{id: 'ck_water', at: NOW.toISOString(), record: {kind: 'water', id: 'health_w1'}}], custom: [], nudged: []}});
const device = () => memory({[TASKS_KEY]: JSON.stringify(tasks()), [CHECKLIST_KEY]: JSON.stringify(path()), [CHECKLIST_DAYS_KEY]: JSON.stringify(days())});
const stored = (s: Storage, k: string) => JSON.parse(s.getItem(k)!);

describe('Tasks and the Checklist in the encrypted backup', () => {
  test('backup → preview → restore on a fresh device gives the same records (with the Health choice); today’s ticks never travel', async () => {
    const {sections, warnings} = exportListSections(device(), {health: true});
    expect(warnings).toEqual([]);
    expect(sections.checklist).not.toContain('health_w1');
    const backup = await encryptBackup({health: JSON.stringify(createEmptyHealth()), ...sections});
    expect(JSON.parse(backup.file).version).toBe(3);
    expect(backup.file).not.toContain('Fictional');
    const opened = await decryptBackup(backup.file, backup.recovery);
    const preview = summarizeBackupModules(opened);
    expect(preview.find(r => r.domain === 'tasks')).toMatchObject({label: 'Tasks', counts: [{label: 'Open tasks', count: 2}, {label: 'Done tasks', count: 0}, {label: 'Projects', count: 1}], from: TODAY, through: TODAY});
    expect(preview.find(r => r.domain === 'checklist')).toMatchObject({label: 'Checklist', counts: [{label: 'Path items', count: 1}, {label: 'Health quick inputs', count: 1}, {label: 'Days recorded', count: 2}], from: '2026-10-31', through: '2026-11-01'});
    expect(JSON.stringify(preview)).not.toContain('Fictional');
    const fresh = memory();
    restoreListSection(fresh, 'tasks', opened.tasks!);
    restoreListSection(fresh, 'checklist', opened.checklist!);
    expect(stored(fresh, TASKS_KEY)).toEqual(tasks());
    expect(stored(fresh, CHECKLIST_KEY)).toEqual(path());
    const {today, ...history} = days(); void today;
    expect(stored(fresh, CHECKLIST_DAYS_KEY)).toEqual(history);
  });
  test('without the Health choice the Health quick inputs stay out of the file, and a restore keeps this device’s own and today’s ticks', async () => {
    const {sections} = exportListSections(device(), {health: false});
    expect(sections.checklist).not.toContain('ck_water');
    const here = memory({[CHECKLIST_KEY]: JSON.stringify({...emptyChecklist(), healthItems: [{id: 'ck_here', kind: 'health', input: 'weight', addedAt: NOW.toISOString()}]}), [CHECKLIST_DAYS_KEY]: JSON.stringify(days())});
    const before = here.getItem(CHECKLIST_KEY)!;
    restoreListSection(here, 'checklist', sections.checklist!);
    expect(stored(here, CHECKLIST_KEY).items.map((i: {id: string}) => i.id)).toEqual(['ck_desk']);
    expect(stored(here, CHECKLIST_KEY).healthItems.map((i: {id: string}) => i.id)).toEqual(['ck_here']);
    expect(stored(here, CHECKLIST_DAYS_KEY).today).toEqual(days().today);
    // The replaced bytes are kept as a recovery copy in this browser.
    const copies = Array.from({length: here.length}, (_, i) => here.key(i)!).filter(k => k.startsWith(`${CHECKLIST_KEY}:recovery:`));
    expect(copies.map(k => here.getItem(k))).toEqual([before]);
  });
  test('a device without Tasks or a Checklist makes the same format 1 or 2 file as before; an older file restores as before', async () => {
    expect(exportListSections(memory(), {health: true})).toEqual({sections: {}, warnings: []});
    expect(exportListSections(memory({[TASKS_KEY]: JSON.stringify(emptyTasks()), [CHECKLIST_KEY]: JSON.stringify(emptyChecklist())}), {health: true}).sections).toEqual({});
    expect(backupFormatVersion(['health'])).toBe(1); expect(backupFormatVersion(['simulation', 'health'])).toBe(2); expect(backupFormatVersion(['tasks'])).toBe(3);
    const older = await encryptBackup({health: JSON.stringify(createEmptyHealth())});
    expect(JSON.parse(older.file).version).toBe(1);
    expect(Object.keys(await decryptBackup(older.file, older.recovery))).toEqual(['health']);
  });
  test('a file whose version does not match its sections, a section that does not read, and an unreadable record are refused or named', async () => {
    const {sections} = exportListSections(device(), {health: true});
    const backup = await encryptBackup({tasks: sections.tasks!}), file = JSON.parse(backup.file);
    file.version = 1;
    await expect(decryptBackup(JSON.stringify(file), backup.recovery)).rejects.toThrow(/not a complete|does not match/);
    const fresh = memory({[TASKS_KEY]: JSON.stringify(tasks())});
    expect(() => restoreListSection(fresh, 'tasks', '{"version":2}')).toThrow(LIST_INVALID);
    expect(() => restoreListSection(fresh, 'checklist', 'not json')).toThrow(LIST_INVALID);
    expect(stored(fresh, TASKS_KEY)).toEqual(tasks());
    expect(exportListSections(memory({[TASKS_KEY]: '{broken'}), {health: true}).warnings).toEqual([expect.stringMatching(/^Tasks could not be read/)]);
  });
});
