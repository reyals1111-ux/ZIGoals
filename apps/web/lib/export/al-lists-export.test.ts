import {describe, expect, test} from 'vitest';
import {buildEverythingZip, collectEverything} from './everything';
import {openBackup} from '../restore/read-backup';
import {nextValue, planParts, type PlannedPart} from '../restore/plan';
import {TASKS_KEY, emptyTasks, tasksSchema} from '../tasks/schema';
import {addProject, addSection, addTask} from '../tasks/engine';
import {CHECKLIST_KEY, CHECKLIST_DAYS_KEY} from '../af-checklist-keys';
import {emptyChecklist, checklistSchema, checklistDaysSchema} from '../checklist/schema';
import {addCustom} from '../checklist/store';
import {PLATFORM_KEY, emptyPlatform} from '../positions';
import {HEALTH_STORAGE_KEY, createEmptyHealth} from '../health';
import {manualSourcePosition} from '../manual-source';

// Session AL (P-LS-36, LS-025, LS-064; TK-018; P-MO-60): Tasks and the Checklist in Export everything as CSVs and as
// restorable parts; Wealth's readable holdings CSV; weights in kg and lb.
const NOW = new Date('2026-11-02T09:00:00.000Z'), TODAY = '2026-11-02', APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
const lines = (text: string) => text.split('\r\n');
const blobOf = (bytes: Uint8Array) => new Blob([bytes as Uint8Array<ArrayBuffer>]);
const TASKS = (() => {
  let r = addProject(emptyTasks(), {name: 'Fictional home', colour: 'teal'}, 'p');
  r = addSection(r, 'p', 'Kitchen', 's');
  r = addTask(r, {title: '=Fictional call', level: 1, projectId: 'p', sectionId: 's', labels: ['errand'], due: TODAY, health: 'sleep'}, {id: 'task_a', at: NOW, today: TODAY, allowPast: true});
  return tasksSchema.parse(r);
})();
const PATH = (() => { const r = addCustom(emptyChecklist(), {label: 'Fictional tidy desk'}, {id: 'ck_desk', at: NOW}); return checklistSchema.parse({...r, healthItems: [{id: 'ck_water', kind: 'health', input: 'water', addedAt: NOW.toISOString()}], order: [...r.order, 'ck_water']}); })();
const DAYS = checklistDaysSchema.parse({version: 1, days: {'2026-10-31': {total: 3, done: 3, perfect: true}}, today: {date: TODAY, ticks: [{id: 'ck_water', at: NOW.toISOString()}], custom: [], nudged: []}});
const texts = {[TASKS_KEY]: JSON.stringify(TASKS), [CHECKLIST_KEY]: JSON.stringify(PATH), [CHECKLIST_DAYS_KEY]: JSON.stringify(DAYS)};
const replace = (part: PlannedPart, current?: unknown) => { const next = nextValue(part, 'replace', current); if ('error' in next) throw Error(next.error); return next.value; };

describe('Tasks and the Checklist in Export everything', () => {
  test('tasks.csv, checklist.csv and checklist-days.csv copy the records, formula-safe', () => {
    const {csv} = collectEverything(texts, APP);
    expect(lines(csv['tasks.csv'])[1]).toBe(`"task_a","'=Fictional call","high","p1","${TODAY}","","Fictional home","Kitchen","","errand","","","","sleep","","${NOW.toISOString()}","","${NOW.toISOString()}"`);
    expect(lines(csv['checklist.csv']).slice(1)).toEqual([`"ck_desk","item","custom","Fictional tidy desk","${PATH.items[0]!.section}","","","","${NOW.toISOString()}"`, `"ck_water","health-quick-input","health","","","water","","","${NOW.toISOString()}"`]);
    expect(lines(csv['checklist-days.csv'])).toEqual(['"date","total","done","perfect"', '"2026-10-31","3","3","true"']);
  });
  test('export → restore gives back the same Tasks and Checklist; the Health quick inputs come only as a Health part; today’s ticks stay on the device', async () => {
    const zip = buildEverythingZip(collectEverything(texts, APP), {date: TODAY, showcase: false, now: NOW});
    const parts = planParts((await openBackup(blobOf(zip.bytes))).json);
    const byId = (id: string) => parts.find(p => p.id === id)!;
    expect(byId('device:tasks')).toMatchObject({group: 'Today and Life', health: false});
    expect(byId('device:checklist')).toMatchObject({group: 'Today and Life', health: false, summary: {counts: '1 item on the path'}});
    expect(byId('device:checklistHealth')).toMatchObject({group: 'Health', health: true, summary: {counts: '1 Health quick input'}});
    expect(byId('device:checklistDays')).toMatchObject({group: 'Today and Life', summary: {counts: '1 day recorded', from: '2026-10-31', through: '2026-10-31'}});
    expect(replace(byId('device:tasks'))).toEqual(TASKS);
    // On a fresh device: the path first, then (with the Health choice) its Health quick inputs, as apply.ts orders them.
    const pathOnly = replace(byId('device:checklist'));
    expect(pathOnly).toMatchObject({items: PATH.items, healthItems: []});
    expect(replace(byId('device:checklistHealth'), pathOnly)).toEqual(PATH);
    const today = {date: TODAY, ticks: [], custom: ['here'], nudged: []};
    expect(replace(byId('device:checklistDays'), {version: 1, days: {}, today})).toEqual({...DAYS, today});
    expect(replace(byId('device:checklistDays'))).not.toHaveProperty('today');
  });
  test('an older export without Tasks or the Checklist offers neither and restores as before', async () => {
    const zip = buildEverythingZip(collectEverything({[HEALTH_STORAGE_KEY]: JSON.stringify(createEmptyHealth())}, APP), {date: TODAY, showcase: false, now: NOW});
    const parts = planParts((await openBackup(blobOf(zip.bytes))).json);
    expect(parts.map(p => p.id)).toEqual(['module:health']);
  });
});

describe('TK-018 and P-MO-60', () => {
  test('wealth-holdings.csv is Wealth’s import template, formula-safe; archived assets are left out', () => {
    const at = '2026-10-01T10:00:00.000Z';
    const positions = [manualSourcePosition({category: 'Stocks', name: 'Apple', symbol: 'AAPL', quantity: '10', value: '1850.40', currency: 'USD'}, 'a2', at), manualSourcePosition({category: 'Property', name: '=House', quantity: '1', value: '350000', currency: 'EUR'}, 'a4', at), {...manualSourcePosition({category: 'Cash', name: 'Old cash', quantity: '1', currency: 'EUR'}, 'a5', at), archivedAt: at}];
    const {csv} = collectEverything({[PLATFORM_KEY]: JSON.stringify({...emptyPlatform(), positions})}, APP);
    expect(lines(csv['wealth-holdings.csv'])).toEqual(['"Name","Asset","Quantity","Kind of asset","Value","Currency","Notes"', '"Apple","AAPL","10","Stocks","1850.40","USD",""', '"\'=House","","1","Property","350000.00","EUR",""']);
    expect(lines(collectEverything({}, APP).csv['wealth-holdings.csv'])).toEqual(['"Name","Asset","Quantity","Kind of asset","Value","Currency","Notes"']);
  });
  test('weights.csv adds kg (exact) and lb (converted, two decimals)', () => {
    const health = {...createEmptyHealth(), weights: [{id: 'health_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', date: '2026-10-01', grams: 80500, createdAt: '2026-10-01T08:00:00Z', updatedAt: '2026-10-01T08:00:00Z'}]};
    const rows = lines(collectEverything({[HEALTH_STORAGE_KEY]: JSON.stringify(health)}, APP).csv['weights.csv']);
    expect(rows[0]).toMatch(/,"kg","lb_converted"$/);
    expect(rows[1]).toMatch(/,"80\.5","177\.47"$/);
  });
});
