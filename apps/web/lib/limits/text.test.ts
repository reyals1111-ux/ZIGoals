import {describe, expect, it} from 'vitest';
import {metadataSchema} from '@zigoals/shared-types';
import {ADD_TEXT_MAX, TEXT_LIMITS} from './text';
import {TEXT_LIMITS as PLAUSIBLE} from './plausibility';
import {PROJECT_NAME_MAX, TASK_TITLE_MAX} from '../tasks/schema';
import {QUICK_NAME_MAX} from '../checklist/quick-add';
import {MAX_LABEL} from '../checklist/store';
import {activeHabitNamed, createHabit, emptyHabitData, habitInputSchema, sameHabitNameNotice, setHabitState, type HabitInput} from '../habits';
import {averageGoalSchema} from '../average-goals/store';
import {healthGoalSchema} from '../positions';

// Session AO (M-011, LS-H29): one limits table for every form's name or title; no value changed.
describe('the one text limits table', () => {
  it('holds each record kind once, with the numbers the forms already used', () => {
    expect(TEXT_LIMITS).toEqual({goalName: 80, averageGoalName: 100, healthGoalName: 100, habitTitle: 100, taskTitle: 140, taskListName: 60, checklistItem: 60, memoryNote: 500});
    expect(ADD_TEXT_MAX).toBe(140);
  });
  it('the schemas and constants read the same numbers', () => {
    expect(TEXT_LIMITS.taskTitle).toBe(TASK_TITLE_MAX); expect(TEXT_LIMITS.taskListName).toBe(PROJECT_NAME_MAX);
    expect(QUICK_NAME_MAX).toBe(TEXT_LIMITS.habitTitle); expect(MAX_LABEL).toBe(TEXT_LIMITS.checklistItem);
    // A goal's name: the creator, goal details and the shared goal metadata agree on 80.
    expect(PLAUSIBLE.name.max).toBe(TEXT_LIMITS.goalName);
    const meta = (name: string) => metadataSchema.shape.name.safeParse(name).success;
    expect(meta('x'.repeat(TEXT_LIMITS.goalName))).toBe(true); expect(meta('x'.repeat(TEXT_LIMITS.goalName + 1))).toBe(false);
    const habit = (title: string) => habitInputSchema.safeParse({...INPUT, title}).success;
    expect(habit('x'.repeat(TEXT_LIMITS.habitTitle))).toBe(true); expect(habit('x'.repeat(TEXT_LIMITS.habitTitle + 1))).toBe(false);
    expect(averageGoalSchema.shape.name.safeParse('x'.repeat(TEXT_LIMITS.averageGoalName + 1)).success).toBe(false);
    expect(averageGoalSchema.shape.name.safeParse('x'.repeat(TEXT_LIMITS.averageGoalName)).success).toBe(true);
    expect(healthGoalSchema.shape.name.safeParse('x'.repeat(TEXT_LIMITS.healthGoalName + 1)).success).toBe(false);
    expect(healthGoalSchema.shape.name.safeParse('x'.repeat(TEXT_LIMITS.healthGoalName)).success).toBe(true);
  });
});

const INPUT: HabitInput = {title: 'H1 water', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1};
describe('a habit name already in use (LS-H29)', () => {
  const AT = new Date('2026-11-02T08:00:00Z'), ID = '92000000-0000-4000-8000-0000000000a1';
  const data = createHabit(emptyHabitData(), INPUT, AT, ID);
  it('finds an active habit with the same name, ignoring case and outer spaces, never the habit itself', () => {
    expect(activeHabitNamed(data.habits, 'H1 water')?.id).toBe(ID);
    expect(activeHabitNamed(data.habits, '  h1 WATER ')?.id).toBe(ID);
    expect(activeHabitNamed(data.habits, 'H1 water', ID)).toBeUndefined();
    expect(activeHabitNamed(data.habits, 'H1 waters')).toBeUndefined();
    expect(activeHabitNamed(data.habits, '   ')).toBeUndefined();
  });
  it('a paused habit is not "already" one you have going', () => {
    const paused = setHabitState(data, ID, 'paused', AT);
    expect(activeHabitNamed(paused.habits, 'H1 water')).toBeUndefined();
  });
  it('says it in one sentence, and saving a second one stays allowed', () => {
    expect(sameHabitNameNotice(' H1 water ')).toBe('You already have a habit called “H1 water”.');
    const twice = createHabit(data, INPUT, AT, '92000000-0000-4000-8000-0000000000a2');
    expect(twice.habits.filter(h => h.title === 'H1 water')).toHaveLength(2);
  });
});
