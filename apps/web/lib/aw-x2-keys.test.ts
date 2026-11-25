import {describe, expect, test} from 'vitest';
import {AW_X2_DISPLAY_KEYS, AW_X2_FOCUS_SESSIONS_KEY_LITERAL, AW_X2_NEW_FIELDS, AW_X2_PERSONAL_KEYS, AW_X2_TASK_PLAN_KEY_LITERAL, AW_X2_TASKS_KEY_LITERAL} from './aw-x2-keys';
import {TASKS_KEY, tasksSchema} from './tasks/schema';
import {TASK_PLAN_KEY, taskPlanSchema} from './tasks/plan-record';
import {FOCUS_SESSIONS_KEY} from './focus-sessions/schema';

/** Session AW (X2): each literal equals its owner's constant, and each new field is one the owner's schema keeps. */
describe('X2 stored data', () => {
  test('literals equal their owners’ constants; no new device key', () => {
    expect(AW_X2_TASKS_KEY_LITERAL).toBe(TASKS_KEY);
    expect(AW_X2_TASK_PLAN_KEY_LITERAL).toBe(TASK_PLAN_KEY);
    expect(AW_X2_FOCUS_SESSIONS_KEY_LITERAL).toBe(FOCUS_SESSIONS_KEY);
    expect([...AW_X2_PERSONAL_KEYS, ...AW_X2_DISPLAY_KEYS]).toEqual([]);
  });
  test('the new fields are read by the owners’ schemas', () => {
    const task = tasksSchema.parse({version: 1, tasks: [{id: 't', title: 'Fictional', priority: 'normal', createdAt: '2026-11-20T09:00:00.000Z', dread: 2, moved: 3}]}).tasks[0]!;
    for (const f of AW_X2_NEW_FIELDS[TASKS_KEY]) expect(task[f]).toBeDefined();
    const plan = taskPlanSchema.parse({version: 1, timeTargets: [{id: 'tt_1', kind: 'label', of: 'writing', minutes: 300, per: 'week'}]});
    for (const f of AW_X2_NEW_FIELDS[TASK_PLAN_KEY]) expect(plan[f]).toBeDefined();
  });
});
