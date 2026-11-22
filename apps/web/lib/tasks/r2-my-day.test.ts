import {describe, expect, it} from 'vitest';
import {addTask, finishTask} from './engine';
import {emptyTasks, TASKS, TASKS_KEY} from './schema';
import {TASK_PLAN, emptyTaskPlan, setPlanPrefs, taskPlanSchema} from './plan-record';
import {MY_DAY_VIEW, carriedPicks, lastPicks, pickForToday, picksToday, readMyDay, tidyPicks} from './my-day';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {readEverything} from '../export/everything';

/** Session AV lane 2 (tasks-r2, LEDGER #223; Microsoft To Do's My Day): a pick for today that keeps the task's own day. */
const today = '2026-11-23', at = new Date('2026-11-23T08:00:00Z');
const memory = (m = new Map<string, string>()) => ({get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()}) as Storage;

describe('picks for today (LEDGER #223)', () => {
  it('a pick holds its day; a new day starts empty and keeps the last day as “before”', () => {
    let plan = pickForToday(emptyTaskPlan(), ['task_a', 'task_b'], '2026-11-20', true);
    expect(picksToday(readMyDay(plan.myDay), '2026-11-20')).toEqual(['task_a', 'task_b']);
    // Overnight: nothing is picked for the next day, and the last day's picks are offered back.
    expect(picksToday(readMyDay(plan.myDay), '2026-11-21')).toEqual([]);
    expect(lastPicks(readMyDay(plan.myDay), '2026-11-23')).toEqual({day: '2026-11-20', ids: ['task_a', 'task_b']});
    plan = pickForToday(plan, ['task_c'], today, true);
    expect(plan.myDay).toEqual({day: today, ids: ['task_c'], before: {day: '2026-11-20', ids: ['task_a', 'task_b']}});
    // Picking a carried task back takes it out of “From …”; unpicking leaves the rest.
    plan = pickForToday(plan, ['task_a'], today, true);
    expect(carriedPicks(readMyDay(plan.myDay), today, () => true)).toEqual({day: '2026-11-20', ids: ['task_b']});
    plan = pickForToday(plan, ['task_c', 'task_a'], today, false);
    expect(plan.myDay).toEqual({day: today, ids: [], before: {day: '2026-11-20', ids: ['task_a', 'task_b']}});
    // An empty day with no last day takes the field off the record.
    expect(pickForToday(pickForToday(emptyTaskPlan(), ['task_x'], today, true), ['task_x'], today, false)).toEqual({version: 1});
  });
  it('the task keeps its own day and deadline (nothing in the task list changes)', () => {
    const r = addTask(emptyTasks(), {title: 'Fictional report', due: '2026-11-27', deadline: '2026-11-30'}, {id: 't1', at, today});
    const plan = pickForToday(emptyTaskPlan(), ['t1'], today, true);
    expect(r.tasks[0]).toMatchObject({due: '2026-11-27', deadline: '2026-11-30'});
    expect(picksToday(readMyDay(plan.myDay), today)).toEqual(['t1']);
  });
  it('only open picks carry; done or removed ones are left out, and tidy drops gone ids', () => {
    let r = addTask(addTask(emptyTasks(), {title: 'A'}, {id: 'a', at, today: '2026-11-22'}), {title: 'B'}, {id: 'b', at, today: '2026-11-22'});
    r = finishTask(r, 'a', at, {today});
    const plan = pickForToday(emptyTaskPlan(), ['a', 'b', 'gone'], '2026-11-22', true), open = (id: string) => r.tasks.some(t => t.id === id && !t.doneAt);
    expect(carriedPicks(readMyDay(plan.myDay), today, open)).toEqual({day: '2026-11-22', ids: ['b']});
    const now = pickForToday(emptyTaskPlan(), ['a', 'b', 'gone'], today, true);
    expect(tidyPicks(now, today, open).myDay).toEqual({day: today, ids: ['b']});
    expect(tidyPicks(now, '2026-11-24', open)).toBe(now);
  });
  it('a value this build cannot read is no picks; the plan record still reads', () => {
    expect(readMyDay({day: 'friday', ids: ['a']})).toBeNull();
    expect(readMyDay({day: today, ids: ['ok', 'not ok', 7, 'ok']})).toEqual({day: today, ids: ['ok']});
    expect(readMyDay({day: today, ids: [], before: {day: '2027-01-01', ids: ['later']}})).toEqual({day: today, ids: []});
    const parsed = taskPlanSchema.parse({version: 1, dailyGoal: 3, myDay: 'odd'});
    expect(parsed).toEqual({version: 1, dailyGoal: 3});
    expect(readDeviceRecord(memory(new Map([[TASK_PLAN.key, JSON.stringify({version: 1, myDay: {day: today, ids: ['t1']}})]])), MY_DAY_VIEW).data).toEqual({day: today, ids: ['t1']});
    expect(readDeviceRecord(memory(), MY_DAY_VIEW).data).toBeNull();
  });
  it('the planning record writes picks through its schema; at most 100', () => {
    const s = memory();
    updateDeviceRecord(s, TASK_PLAN, p => pickForToday(p, ['t1'], today, true));
    expect(readDeviceRecord(s, TASK_PLAN).data.myDay).toEqual({day: today, ids: ['t1']});
    const many = Array.from({length: 100}, (_, i) => `t${i}`);
    expect(() => pickForToday(pickForToday(emptyTaskPlan(), many, today, true), ['one-more'], today, true)).toThrow(/My Day holds 100 tasks/);
  });
});

describe('Export, erase and restore keep My Day (TIER 3 stored formats)', () => {
  it('the picks round-trip with the planning record and the task list', async () => {
    const r = addTask(emptyTasks(), {title: 'Fictional call', due: '2026-11-28'}, {id: 't1', at, today});
    const plan = pickForToday(setPlanPrefs(pickForToday(emptyTaskPlan(), ['t0'], '2026-11-20', true), {dailyGoal: 2}), ['t1'], today, true);
    const storage = memory(new Map([[TASKS_KEY, JSON.stringify(r)], [TASK_PLAN.key, JSON.stringify(plan)]]));
    const {texts} = await readEverything(storage);
    const exported = {tasks: texts[TASKS_KEY]!, plan: storage.getItem(TASK_PLAN.key)!};
    storage.clear();
    expect(readDeviceRecord(storage, TASK_PLAN).data).toEqual({version: 1});
    storage.setItem(TASKS_KEY, exported.tasks); storage.setItem(TASK_PLAN.key, exported.plan);
    expect(readDeviceRecord(storage, TASK_PLAN).data.myDay).toEqual({day: today, ids: ['t1'], before: {day: '2026-11-20', ids: ['t0']}});
    expect(readDeviceRecord(storage, TASKS).data.tasks[0]!.due).toBe('2026-11-28');
  });
});
