import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, type HabitInput} from '../habits';
import {createEmptyHealth} from '../health';
import {emptyPlatform, privateGoalSchema, type Platform} from '../positions';
import {emptyGoalExtras} from '../goal-extras/store';
import {lifeReview, reviewPeriod} from './engine';

/** Session AL second pass (L3; NB-227): the Life review groups a goal's milestone flips and says "1 day". Fictional data. */
const TODAY = '2026-11-04', HID = '11111111-1111-4111-8111-111111111111';
const input: HabitInput = {title: 'Stretch', category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}};
const goal = privateGoalSchema.parse({id: '7', name: 'FarmB', type: 'PROJECT', status: 'active', asset: 'MILESTONE', denom: 'milestone', decimals: 0, target: '2', notes: '', createdAt: '2026-11-01T08:00:00.000Z', milestones: [{id: 'm0', title: 'Step 1', done: true}, {id: 'm1', title: 'Step 2', done: false}]});
const flip = (minute: number) => ({kind: 'milestone', goalId: '7', label: 'Goal milestones changed', capturedAt: `${TODAY}T04:${String(minute).padStart(2, '0')}:00.000Z`});
const platform = {...emptyPlatform(), goals: [goal], goalHistory: Array.from({length: 14}, (_, i) => flip(i))} as unknown as Platform;

describe('NB-227: Life review', () => {
  const run = () => {
    let habits = createHabit(emptyHabitData(), input, new Date('2026-11-04T06:00:00Z'), HID);
    habits = logHabitValue(habits, HID, TODAY, 1, {mode: 'set'}, new Date(`${TODAY}T07:00:00Z`));
    return lifeReview({window: reviewPeriod('week', TODAY), habits, health: createEmptyHealth(), platform, goals: [{key: 'private:7', id: '7', name: 'FarmB', href: '/app/goals/tracked/7', status: 'active'}], averages: [], extras: emptyGoalExtras(), history: [], today: TODAY});
  };
  test('fourteen milestone flips on one goal are one line, with how the milestones stand now', () => {
    const r = run();
    expect(r.goalsMoved).toEqual([{name: 'FarmB', href: '/app/goals/tracked/7', line: 'Milestones changed 14 times · 1 of 2 milestones done now'}]);
  });
  test('a one-day streak reads "1 day", never "1 days"', () => {
    expect(run().highlights.find(h => h.startsWith('Longest streak'))).toBe('Longest streak: Stretch, 1 day');
  });
});
