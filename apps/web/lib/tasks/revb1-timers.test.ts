import {describe, expect, test} from 'vitest';
import {TASK_PLAN_KEY, timerOnDone, withTimedMinutes} from './plan-key';
import {emptyTaskPlan, settleTimers, startTimer, taskPlanSchema} from './plan-record';
import {addTask, finishTask} from './engine';
import {emptyTasks, tasksSchema} from './schema';

/**
 * Session AV lane 2 (review b1 #2, Major): a task ticked Done while its timer runs keeps the minutes, as Stop does — on
 * the Done box itself (timerOnDone + withTimedMinutes) and, for a task finished where the box could not stop the timer,
 * when Tasks → Today next tidies the timers (settleTimers, up to the finish time).
 */
const at = new Date('2026-11-22T09:00:00.000Z'), today = '2026-11-22';
const memory = (entries: Record<string, string> = {}) => { const m = new Map(Object.entries(entries)); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m}; };
const record = () => addTask(emptyTasks(), {title: 'Write the fictional report', minutes: 60}, {id: 'task_report', at, today});

describe('Done while the timer runs', () => {
  test('the Done box reads the running minutes, adds them to the time spent and then stops the timer', () => {
    const plan = startTimer(emptyTaskPlan(), 'task_report', at.getTime());
    const store = memory({[TASK_PLAN_KEY]: JSON.stringify({...plan, dayLimit: 240})});
    const timed = timerOnDone(store, 'task_report', at.getTime() + 40 * 60_000)!;
    expect(timed.minutes).toBe(40);
    // Nothing is written before the change is kept.
    expect(JSON.parse(store.getItem(TASK_PLAN_KEY)!).timers).toHaveLength(1);
    const done = withTimedMinutes(finishTask(record(), 'task_report', new Date(at.getTime() + 40 * 60_000), {today}), 'task_report', timed.minutes);
    expect(tasksSchema.parse(done).tasks[0]).toMatchObject({spent: 40, doneAt: expect.any(String)});
    timed.stop();
    const after = taskPlanSchema.parse(JSON.parse(store.getItem(TASK_PLAN_KEY)!));
    expect(after.timers).toBeUndefined();
    expect(after.dayLimit).toBe(240);
  });
  test('time already spent grows; no timer, or a record it cannot read, changes nothing', () => {
    const r = withTimedMinutes(withTimedMinutes(record(), 'task_report', 15), 'task_report', 25);
    expect(r.tasks[0]!.spent).toBe(40);
    expect(withTimedMinutes(record(), 'task_report', 0)).toEqual(record());
    expect(timerOnDone(memory({[TASK_PLAN_KEY]: JSON.stringify(emptyTaskPlan())}), 'task_report', at.getTime())).toBeNull();
    expect(timerOnDone(memory({[TASK_PLAN_KEY]: '{not json'}), 'task_report', at.getTime())).toBeNull();
    expect(timerOnDone(memory(), 'task_report', at.getTime())).toBeNull();
  });
  test('a task finished elsewhere: the timer gives its minutes up to the finish; a gone task’s timer is dropped', () => {
    let plan = startTimer(emptyTaskPlan(), 'task_report', at.getTime());
    plan = startTimer(plan, 'task_gone', at.getTime());
    plan = startTimer(plan, 'task_open', at.getTime());
    const tasks = addTask(finishTask(record(), 'task_report', new Date(at.getTime() + 40 * 60_000), {today}), {title: 'Still open'}, {id: 'task_open', at, today});
    const out = settleTimers(plan, tasks);
    expect(out.spent).toEqual([{taskId: 'task_report', minutes: 40}]);
    expect(out.plan.timers!.map(t => t.taskId)).toEqual(['task_open']);
    // Settled once: nothing is left to add the second time.
    expect(settleTimers(out.plan, tasks)).toEqual({plan: out.plan, spent: []});
  });
});
