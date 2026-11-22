// @vitest-environment jsdom
import {Blob as NodeBlob} from 'node:buffer';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {eraseEverything} from '../erase-everything';
import {planParts} from '../restore/plan';
import {openBackup} from '../restore/read-backup';
import {applyRestore, forgetRestoreUndo} from '../restore/apply';
import {TASKS_KEY, recurSchema, taskSchema, tasksSchema} from './schema';
import {TASK_PLAN_KEY, taskPlanSchema} from './plan-record';

/**
 * Session AV lane 2 (r4-plan; TIER 3 (stored formats), additive only): every new optional field of round 4's planning rows
 * — a task's `chunk`, `after` and `afterHours`, a repeat's `flex`, the planning record's `workHours` — survives Export
 * everything → Erase everything → Restore (replace), read back exactly as written; a value this build cannot read is
 * dropped on read, never failing its record; the repeat an older build reads stays a fixed one.
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
  {id: 'venue', title: 'Fictional venue booking', priority: 'normal', createdAt: at, minutes: 240, chunk: 60, spent: 60},
  {id: 'invites', title: 'Fictional invitations', priority: 'normal', createdAt: at, minutes: 45, after: ['venue'], afterHours: true},
  {id: 'plants', title: 'Fictional plants', priority: 'normal', createdAt: at, due: '2026-11-29', recur: {every: 'week', interval: 1, weekdays: [0], flex: 'week', text: 'once a week'}},
]});
const PLAN = taskPlanSchema.parse({version: 1, workHours: {days: {'1': [{from: '09:00', to: '12:30'}, {from: '13:30', to: '17:30'}], '0': []}, after: {from: '20:30', to: '23:00'}}});

describe('Session AV lane 2 (r4-plan): new fields survive export, erase and restore', () => {
  test('tasks: the smallest piece, the tasks waited for, after hours, a floating repeat; the planning record: working hours', async () => {
    const back = await roundTrip({[TASKS_KEY]: TASKS, [TASK_PLAN_KEY]: PLAN});
    expect(tasksSchema.parse(back[TASKS_KEY])).toEqual(TASKS);
    expect(taskPlanSchema.parse(back[TASK_PLAN_KEY])).toEqual(PLAN);
    expect(TASKS.tasks[0]).toMatchObject({chunk: 60});
    expect(TASKS.tasks[1]).toMatchObject({after: ['venue'], afterHours: true});
    expect(TASKS.tasks[2]!.recur).toMatchObject({flex: 'week', every: 'week', weekdays: [0]});
    expect(PLAN.workHours?.days?.['1']).toHaveLength(2);
    expect(PLAN.workHours?.days?.['0']).toEqual([]);
  });
});
describe('tolerant reads and older readers', () => {
  test('a value this build cannot read is dropped, never the task or the record', () => {
    const odd = taskSchema.parse({id: 'x', title: 'Odd', priority: 'normal', createdAt: at, chunk: 5, after: ['a', 'a', 'b c', 7, 'b', 'c', 'd'], afterHours: 'yes'});
    expect(odd.chunk).toBeUndefined(); expect(odd.afterHours).toBeUndefined();
    expect(odd.after).toEqual(['a', 'b', 'c']);
    expect(taskSchema.parse({id: 'y', title: 'Odd', priority: 'normal', createdAt: at, after: 'a'}).after).toBeUndefined();
    expect(taskSchema.parse({id: 'z', title: 'Odd', priority: 'normal', createdAt: at, chunk: 300}).chunk).toBeUndefined();
    expect(recurSchema.parse({every: 'week', interval: 1, flex: 'fortnight'}).flex).toBeUndefined();
    const plan = taskPlanSchema.parse({version: 1, workHours: {days: {'1': [{from: '12:00', to: '09:00'}, {from: '09:00', to: '12:00'}, {from: '11:00', to: '13:00'}, {from: '14:00', to: '18:00'}, {from: '19:00', to: '20:00'}], '7': [{from: '09:00', to: '10:00'}], '2': 'all day'}, after: {from: '25:00', to: '26:00'}}});
    expect(plan.workHours?.days).toEqual({'1': [{from: '09:00', to: '12:00'}, {from: '14:00', to: '18:00'}]});
    expect(plan.workHours?.after).toBeUndefined();
    expect(taskPlanSchema.parse({version: 1, workHours: 'nine to five'}).workHours).toBeUndefined();
  });
  test('an older build reads the floating repeat as a fixed one: every week on Sunday, every month on its last day', () => {
    // The older rule is recurSchema without `flex`: its every, interval, weekdays and monthDay are all it reads.
    const week = recurSchema.parse({every: 'week', interval: 1, weekdays: [0], flex: 'week'}), month = recurSchema.parse({every: 'month', interval: 1, monthDay: -1, flex: 'month'});
    const {flex: _w, ...olderWeek} = week; void _w; const {flex: _m, ...olderMonth} = month; void _m;
    expect(recurSchema.parse(olderWeek)).toEqual({every: 'week', interval: 1, weekdays: [0]});
    expect(recurSchema.parse(olderMonth)).toEqual({every: 'month', interval: 1, monthDay: -1});
  });
});
