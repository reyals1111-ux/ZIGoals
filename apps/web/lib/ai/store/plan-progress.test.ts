import {expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitCount} from '../../habits';
import {planProgress} from './plan-progress';
import type {ZigiPlan} from './plans';

/** Session AI (feature 8): a ZIGi plan's progress across the habits and the goal it added. */
const TODAY = '2026-10-28', HABIT = '93000000-0000-4000-8000-000000000001';
const plan: ZigiPlan = {id: 'b_1', title: 'Your 10k plan', createdAt: '2026-10-20T08:00:00.000Z', updatedAt: '2026-10-20T08:00:00.000Z', items: [
  {sig: '00000001', kind: 'create-goal', label: 'Create the goal "Run 10 km"', outcome: 'added'},
  {sig: '00000002', kind: 'create-habit', label: 'Create the habit "Run"', outcome: 'added'},
  {sig: '00000003', kind: 'create-habit', label: 'Create the habit "Stretch"', outcome: 'dismissed'},
  {sig: '00000004', kind: 'create-habit', label: 'Create the habit "Swim"', outcome: 'added'},
]};
test('added steps only: the habit\'s last 7 days, the goal\'s progress, and a renamed record said plainly', () => {
  let habits = createHabit(emptyHabitData(), {title: 'Run', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-10-01T08:00:00Z'), HABIT);
  for (const day of ['2026-10-28', '2026-10-27', '2026-10-25']) habits = logHabitCount(habits, HABIT, day, 1, '', new Date(`${day}T20:00:00Z`));
  const lines = planProgress(plan, {habits, goals: [{name: 'Run 10 km', progressPct: '40.00', href: '/app/goals/private:1', status: 'active'}], today: TODAY});
  expect(lines).toEqual([
    {label: 'Run 10 km', text: '40% of the target so far.', href: '/app/goals/private:1'},
    {label: 'Run', text: 'Last 7 days: 3 of 7 scheduled days done.', href: '/app/habits'},
    {label: 'Swim', text: 'Not found under this name any more (renamed or removed).', href: null},
  ]);
});
