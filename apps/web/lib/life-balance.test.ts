import {describe, expect, it} from 'vitest';
import {balanceOf, goalItem} from './life-balance';
import {addCustomArea, emptyGoalExtras, setGoalArea} from './goal-extras/store';
import type {GoalSummary} from './goal-summary';
import type {ContributionEvent} from './positions';

describe('G2 life balance (Session AA-Cloud Part 2)', () => {
  it('averages known shares per area, counts activity, and leaves unknown out (never zero)', () => {
    const {areas, unassigned} = balanceOf(emptyGoalExtras(), [
      {area: 'wealth', share: 0.5, activity: 2}, {area: 'wealth', share: 1, activity: 1}, {area: 'wealth', share: null, activity: 0},
      {area: 'health', share: null, activity: 9}, {area: undefined, share: 0.3, activity: 1},
    ]);
    expect(areas.find(a => a.id === 'wealth')).toMatchObject({items: 3, progress: 0.75, activity: 3});
    expect(areas.find(a => a.id === 'health')).toMatchObject({items: 1, progress: null, activity: 9});
    expect(areas.find(a => a.id === 'fun')).toMatchObject({items: 0, progress: null, activity: 0});
    expect(unassigned).toBe(1);
    expect(areas).toHaveLength(7);
  });
  it('shares are held to 0–1; custom areas join the wheel', () => {
    const {extras, id} = addCustomArea(emptyGoalExtras(), 'Garden', '#55cc88');
    const {areas} = balanceOf(extras, [{area: id, share: 1.7, activity: 0}, {area: id, share: -1, activity: 0}]);
    expect(areas.at(-1)).toMatchObject({id: 'custom-garden', label: 'Garden', progress: 0.5});
  });
  it('a goal’s default area, its share and this month’s contributions', () => {
    const goal = {key: 'private:7', type: 'VALUE', progressPct: '45.00', status: 'active'} as GoalSummary;
    const ev = (day: string, goalId = '7') => ({goalScope: 'private', goalId, occurredAt: `${day}T09:00:00.000Z`}) as ContributionEvent;
    const item = goalItem(goal, emptyGoalExtras(), [ev('2026-10-02'), ev('2026-10-09'), ev('2026-09-30'), ev('2026-10-03', '8'), ev('2026-10-20')], '2026-10-11');
    expect(item).toEqual({area: 'wealth', share: 0.45, activity: 2});
    expect(goalItem({...goal, type: 'PROJECT'} as GoalSummary, emptyGoalExtras(), [], '2026-10-11').area).toBeUndefined();
    expect(goalItem({...goal, progressBound: 'unavailable'} as GoalSummary, emptyGoalExtras(), [], '2026-10-11').share).toBeNull();
    const chosen = setGoalArea(emptyGoalExtras(), 'private:7', 'career', '2026-10-11T00:00:00.000Z');
    expect(goalItem(goal, chosen, [], '2026-10-11').area).toBe('career');
  });
});
