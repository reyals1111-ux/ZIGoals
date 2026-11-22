// @vitest-environment jsdom
import {Blob as NodeBlob} from 'node:buffer';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import * as z from 'zod';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {eraseEverything} from '../erase-everything';
import {planParts} from '../restore/plan';
import {openBackup} from '../restore/read-backup';
import {applyRestore, forgetRestoreUndo} from '../restore/apply';
import {TASKS_KEY, recurSchema, tasksSchema} from './schema';
import {TASK_PLAN_KEY, taskPlanSchema} from './plan-record';
import {FOCUS_VIEW, readFocus} from './focus';

/**
 * Session AV lane 2 (r6-plan; TIER 3 (stored formats), additive only): every new optional field of round 6's planning rows —
 * a project's `hold`, `inOrder` and `review`, a task's `inOrder`, a repeat's `fromEnd` and `workday`, the record's
 * `labelGroups`, and the planning record's `focus` — survives Export everything → Erase everything → Restore (replace), read
 * back exactly as written; a value this build cannot read is dropped on read, never failing its record; an older reader
 * (one that knows none of these fields) still finds the plain `monthDay` it can follow.
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
const TASKS = tasksSchema.parse({version: 1,
  projects: [
    {id: 'p_house', name: 'Fictional house', colour: 'teal', order: 0, hold: {since: '2026-11-20', until: '2026-12-07'}, review: {every: 2, last: '2026-11-15'}},
    {id: 'p_party', name: 'Fictional party', colour: 'blue', order: 1, inOrder: true, review: {every: 1}},
    {id: 'p_garden', name: 'Fictional garden', colour: 'green', order: 2, hold: {since: '2026-11-21'}},
  ],
  labelGroups: [{id: 'lg_where', name: 'Where', labels: ['home', 'office', 'errand']}, {id: 'lg_energy', name: 'Energy', labels: ['low', 'high']}],
  tasks: [
    {id: 'venue', title: 'Fictional venue', priority: 'normal', createdAt: at, projectId: 'p_party', order: 10},
    {id: 'invites', title: 'Fictional invitations', priority: 'normal', createdAt: at, projectId: 'p_party', order: 20, inOrder: true},
    {id: 'rent', title: 'Fictional report', priority: 'normal', createdAt: at, due: '2026-11-20', recur: {every: 'month', interval: 1, monthDay: 20, fromEnd: {n: 2, weekday: 5}}},
    {id: 'pay', title: 'Fictional payroll', priority: 'normal', createdAt: at, due: '2026-11-30', recur: {every: 'month', interval: 1, monthDay: -1, workday: 'last'}},
  ]});
const PLAN = taskPlanSchema.parse({version: 1, focus: {projects: ['p_party'], areas: ['area_work']}});

describe('Session AV lane 2 (r6-plan): new fields survive export, erase and restore', () => {
  test('projects on hold, in order and up for review; a task in order; repeats from the month’s end; label groups; the focus', async () => {
    const back = await roundTrip({[TASKS_KEY]: TASKS, [TASK_PLAN_KEY]: PLAN});
    expect(tasksSchema.parse(back[TASKS_KEY])).toEqual(TASKS);
    expect(taskPlanSchema.parse(back[TASK_PLAN_KEY])).toEqual(PLAN);
    expect(TASKS.projects![0]).toMatchObject({hold: {since: '2026-11-20', until: '2026-12-07'}, review: {every: 2, last: '2026-11-15'}});
    expect(TASKS.projects![1]).toMatchObject({inOrder: true, review: {every: 1}});
    expect(TASKS.tasks[1]).toMatchObject({inOrder: true});
    expect(TASKS.tasks[2]!.recur).toMatchObject({fromEnd: {n: 2, weekday: 5}, monthDay: 20});
    expect(TASKS.tasks[3]!.recur).toMatchObject({workday: 'last', monthDay: -1});
    expect(TASKS.labelGroups).toHaveLength(2);
    expect(PLAN.focus).toEqual({projects: ['p_party'], areas: ['area_work']});
  });
});
describe('tolerant reads', () => {
  test('a value this build cannot read is dropped, never the record', () => {
    const odd = tasksSchema.parse({version: 1, projects: [{id: 'p', name: 'Fictional', colour: 'blue', order: 0, hold: {since: 'soon'}, inOrder: 'yes', review: {every: 0}}],
      labelGroups: [{id: 'g', name: 'Where', labels: ['home', 'with space', 'home']}, {id: 'bad', name: '', labels: ['x']}, {id: 'none', name: 'Empty', labels: ['@@']}],
      tasks: [{id: 't', title: 'Fictional', priority: 'normal', createdAt: at, inOrder: 1, due: '2026-11-20', recur: {every: 'month', interval: 1, monthDay: 20, fromEnd: {n: 7, weekday: 5}, workday: 'middle'}}]});
    expect(odd.projects![0]).toEqual({id: 'p', name: 'Fictional', colour: 'blue', order: 0});
    expect(odd.labelGroups).toEqual([{id: 'g', name: 'Where', labels: ['home']}]);
    expect(odd.tasks[0]!.inOrder).toBeUndefined();
    expect(odd.tasks[0]!.recur).toEqual({every: 'month', interval: 1, monthDay: 20});
    expect(taskPlanSchema.parse({version: 1, focus: {projects: ['ok', 'not ok'], areas: 'x'}}).focus).toEqual({projects: ['ok']});
    expect(taskPlanSchema.parse({version: 1, focus: {projects: []}}).focus).toBeUndefined();
    expect(readFocus('x')).toBeNull();
    expect(FOCUS_VIEW.schema.parse({version: 1, focus: {areas: ['area_work']}})).toEqual({areas: ['area_work']});
    expect(FOCUS_VIEW.schema.parse({version: 2, focus: {areas: ['area_work']}})).toBeNull();
  });
  test('an older reader (no fromEnd, no workday) follows the plain monthDay written beside them', () => {
    const {every, interval, monthDay, nth} = recurSchema.shape, older = z.object({every, interval, monthDay, nth});
    expect(older.parse(TASKS.tasks[2]!.recur)).toEqual({every: 'month', interval: 1, monthDay: 20});
    expect(older.parse(TASKS.tasks[3]!.recur)).toEqual({every: 'month', interval: 1, monthDay: -1});
  });
});
