// @vitest-environment jsdom
import {Blob as NodeBlob} from 'node:buffer';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {eraseEverything} from '../erase-everything';
import {planParts} from '../restore/plan';
import {openBackup} from '../restore/read-backup';
import {applyRestore, forgetRestoreUndo} from '../restore/apply';
import {TASKS_KEY, taskSchema, tasksSchema} from './schema';
import {TASK_PLAN_KEY, taskPlanSchema} from './plan-record';
import {UI_PREFS_KEY} from '../ab-design-keys';
import {uiPrefsSchema} from '../ui-prefs/schema';

/**
 * Session AV lane 2 (r5-plan; TIER 3 (stored formats), additive only): every new optional field of round 5's planning rows —
 * a task's `state`, `plan`, `block`, `travel` and `place`; the planning record's `blocks` and `eventTravel`; the UI prefs'
 * `secondZone` — survives Export everything → Erase everything → Restore (replace), read back exactly as written (the UI
 * prefs are exported and erased, never restored, as before); a value this build cannot read is dropped on read, never
 * failing its record; an older reader sees a cancelled task as finished.
 */
const NOW = new Date('2026-11-22T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
Object.defineProperty(navigator, 'locks', {configurable: true, value: {request: async (_key: string, work: () => unknown) => work()}});
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo(); });
afterEach(() => { localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo(); });
async function roundTrip(records: Record<string, unknown>): Promise<Record<string, unknown>> {
  const values = Object.fromEntries(Object.entries(records).map(([k, v]) => [k, JSON.stringify(v)]));
  const zip = buildEverythingZip(collectEverything(values, APP), {date: '2026-11-22', showcase: false, now: NOW});
  const opened = await openBackup(new NodeBlob([zip.bytes]) as unknown as Blob);
  for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  await eraseEverything({localStorage, sessionStorage, indexedDB: null});
  for (const k of Object.keys(values)) expect(localStorage.getItem(k)).toBeNull();
  const parts = planParts(opened.json).filter(p => Object.keys(values).includes(p.key));
  expect(parts.length).toBe(Object.keys(values).length);
  const outcome = await applyRestore(opened, parts.map(part => ({part, mode: 'replace' as const})), {vision: false, progress: false});
  expect(outcome.failed).toEqual([]);
  return Object.fromEntries(Object.keys(values).map(k => [k, JSON.parse(localStorage.getItem(k) ?? 'null')]));
}
const at = '2026-11-20T10:00:00.000Z';
const TASKS = tasksSchema.parse({version: 1, tasks: [
  {id: 'deep', title: 'Fictional chapter', priority: 'normal', createdAt: at, due: '2026-11-23', block: 'blk_deep', state: {kind: 'doing', at}},
  {id: 'gone', title: 'Fictional tickets', priority: 'normal', createdAt: at, doneAt: at, state: {kind: 'cancelled', at}},
  {id: 'week', title: 'Fictional gutters', priority: 'normal', createdAt: at, plan: {kind: 'week', of: '2026-11-23'}},
  {id: 'month', title: 'Fictional tax letter', priority: 'normal', createdAt: at, plan: {kind: 'month', of: '2026-12-01'}},
  {id: 'dentist', title: 'Fictional dentist', priority: 'normal', createdAt: at, due: '2026-11-24', time: '09:00', travel: 20, place: 'Fictional Street 1, Utrecht'},
]});
const PLAN = taskPlanSchema.parse({version: 1, blocks: [
  {id: 'blk_deep', name: 'Deep work', colour: 'teal', from: '09:00', to: '11:00', days: [1, 3, 5]},
  {id: 'blk_once', name: 'Errands', colour: 'yellow', from: '14:00', to: '15:30', on: '2026-11-25'},
], eventTravel: {'0123456789abcdef': 25}});
const PREFS = uiPrefsSchema.parse({version: 1, secondZone: 'America/New_York'});

describe('Session AV lane 2 (r5-plan): new fields survive export, erase and restore', () => {
  test('tasks: doing and cancelled, a week or a month, a block, travel minutes and a place; the planning record: blocks and event travel', async () => {
    const back = await roundTrip({[TASKS_KEY]: TASKS, [TASK_PLAN_KEY]: PLAN});
    expect(tasksSchema.parse(back[TASKS_KEY])).toEqual(TASKS);
    expect(taskPlanSchema.parse(back[TASK_PLAN_KEY])).toEqual(PLAN);
    expect(TASKS.tasks[0]).toMatchObject({block: 'blk_deep', state: {kind: 'doing'}});
    expect(TASKS.tasks[3]).toMatchObject({plan: {kind: 'month', of: '2026-12-01'}});
    expect(TASKS.tasks[4]).toMatchObject({travel: 20, place: 'Fictional Street 1, Utrecht'});
    expect(PLAN.blocks).toHaveLength(2);
    expect(PLAN.eventTravel).toEqual({'0123456789abcdef': 25});
  });
  test('the second time zone is exported and erased (display choices are never restored, as before)', async () => {
    const values = {[UI_PREFS_KEY]: JSON.stringify(PREFS)};
    const device = collectEverything(values, APP).json.device as Record<string, unknown>;
    expect(uiPrefsSchema.parse(device.uiPrefs)).toEqual(PREFS);
    localStorage.setItem(UI_PREFS_KEY, values[UI_PREFS_KEY]);
    await eraseEverything({localStorage, sessionStorage, indexedDB: null});
    expect(localStorage.getItem(UI_PREFS_KEY)).toBeNull();
  });
});
describe('tolerant reads and older readers', () => {
  test('a value this build cannot read is dropped, never the task', () => {
    const odd = taskSchema.parse({id: 'x', title: 'Odd', priority: 'normal', createdAt: at, state: {kind: 'paused', at}, plan: {kind: 'month', of: '2026-12-05'}, block: 'a b', travel: 0, place: ''});
    for (const k of ['state', 'plan', 'block', 'travel', 'place'] as const) expect(odd[k]).toBeUndefined();
    expect(taskSchema.parse({id: 'y', title: 'Odd', priority: 'normal', createdAt: at, travel: 601, place: 'x'.repeat(201), plan: {kind: 'year', of: '2026-01-01'}})).toMatchObject({id: 'y'});
    // A later build's field inside `state` is kept (the object is loose).
    expect(taskSchema.parse({id: 'z', title: 'Odd', priority: 'normal', createdAt: at, state: {kind: 'doing', at, by: 'later'}}).state).toEqual({kind: 'doing', at, by: 'later'});
  });
  test('a block or an event travel that cannot be read is dropped, never the others or the record', () => {
    const plan = taskPlanSchema.parse({version: 1, dailyGoal: 3, blocks: [
      {id: 'a', name: 'Deep work', colour: 'red', from: '09:00', to: '11:00', days: [1, 1, 9, 'x', 3]},
      {id: 'b', name: 'Backwards', colour: 'blue', from: '11:00', to: '09:00', days: [1]},
      {id: 'c', name: 'Nowhen', colour: 'blue', from: '09:00', to: '10:00'},
      {id: 'd', name: 'Nowhen either', colour: 'blue', from: '09:00', to: '10:00', days: [8]},
      'nonsense',
    ], eventTravel: {'0123456789abcdef': 15, 'not-an-id': 10, 'fedcba9876543210': 9999, 'aaaaaaaaaaaaaaaa': 2.5}});
    expect(plan.dailyGoal).toBe(3);
    expect(plan.blocks).toEqual([{id: 'a', name: 'Deep work', colour: 'blue', from: '09:00', to: '11:00', days: [1, 3]}]);
    expect(plan.eventTravel).toEqual({'0123456789abcdef': 15});
    expect(taskPlanSchema.parse({version: 1, blocks: 'x', eventTravel: [1]})).toEqual({version: 1});
  });
  test('the second zone: a name that cannot be a zone is dropped, the record kept', () => {
    expect(uiPrefsSchema.parse({version: 1, secondZone: '../etc', heroCollapsed: true})).toEqual({version: 1, heroCollapsed: true});
    expect(uiPrefsSchema.parse({version: 1, secondZone: 'Europe/Amsterdam'}).secondZone).toBe('Europe/Amsterdam');
  });
  test('an older reader of the task list (doneAt, no state) sees a cancelled task as finished, never open', () => {
    const cancelled = TASKS.tasks[1]!;
    expect(cancelled.doneAt).toBe(at);
    expect(TASKS.tasks.filter(t => !t.doneAt).map(t => t.id)).not.toContain('gone');
  });
});
