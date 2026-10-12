import {describe, expect, it} from 'vitest';
import {goalTree, rollUp, rollUpWords} from './goal-hierarchy';
import {emptyGoalExtras, setGoalParent} from './goal-extras/store';
import type {GoalSummary} from './goal-summary';

const g = (key: string, current: string, currency = 'USD', status: GoalSummary['status'] = 'active', extra: Partial<GoalSummary> = {}) => ({key, current, currency, status, target: '100', ...extra}) as GoalSummary;
const at = '2026-10-11T12:00:00.000Z';

describe('G5 goal hierarchy (Session AA-Cloud Part 2)', () => {
  it('sums sub-goals in the parent’s unit against the parent’s target', () => {
    const r = rollUp({currency: 'USD', target: '1000'}, [g('a', '250.5'), g('b', '149.5')]);
    expect(r).toEqual({kind: 'sum', current: '400', target: '1000', currency: 'USD', share: 0.4});
    expect(rollUpWords(r!, (v, c) => `${c} ${v}`)).toBe('USD 400 of USD 1000 from its sub-goals');
  });
  it('another unit, an at-least value or no parent target: counts done sub-goals instead (nothing converted)', () => {
    expect(rollUp({currency: 'USD', target: '1000'}, [g('a', '10'), g('b', '5', 'EUR', 'completed')])).toEqual({kind: 'count', done: 1, total: 2});
    expect(rollUp({currency: 'USD', target: '1000'}, [g('a', '10', 'USD', 'completed', {progressBound: 'at-least'})])).toEqual({kind: 'count', done: 1, total: 1});
    expect(rollUp({currency: 'books', target: undefined}, [g('a', '1', 'books', 'completed'), g('b', '0', 'books'), g('c', '0', 'books')])).toEqual({kind: 'count', done: 1, total: 3});
    expect(rollUpWords({kind: 'count', done: 3, total: 5}, v => v)).toBe('3 of 5 sub-goals done');
    expect(rollUp({currency: 'USD', target: '1'}, [])).toBeNull();
  });
  it('the share is held to 0–1', () => {
    expect(rollUp({currency: 'USD', target: '100'}, [g('a', '250')])).toMatchObject({share: 1});
  });
  it('builds a tree; a sub-goal whose parent is not shown is a top goal', () => {
    let x = setGoalParent(emptyGoalExtras(), 'private:q1', 'private:year', at);
    x = setGoalParent(x, 'private:jan', 'private:q1', at);
    x = setGoalParent(x, 'private:lost', 'private:gone', at);
    expect(goalTree(['private:year', 'private:q1', 'private:jan', 'private:lost'], x)).toEqual([
      {key: 'private:year', children: [{key: 'private:q1', children: [{key: 'private:jan', children: []}]}]},
      {key: 'private:lost', children: []},
    ]);
  });
});
