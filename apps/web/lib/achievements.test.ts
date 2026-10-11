import {describe, expect, it} from 'vitest';
import {achievementsOf, durationWords} from './achievements';
import {emptyGoalExtras, setGoalArea, setGoalStory} from './goal-extras/store';
import type {PrivateGoal} from './positions';
import type {AverageGoal} from './average-goals/store';

const at = '2026-10-11T10:00:00.000Z';
const goal = (id: string, status: PrivateGoal['status'], lifecycle: {kind: string; at: string}[] = []) => ({id, name: `Goal ${id}`, status, createdAt: '2026-01-01T09:00:00.000Z', lifecycle}) as unknown as PrivateGoal;

describe('G7 Hall of achievements (Session AA-Cloud Part 2)', () => {
  it('lists finished goals with their finish day, duration, area and story, newest first', () => {
    let x = setGoalStory(emptyGoalExtras(), 'private:1', 'Ran it in the rain.', at);
    x = setGoalArea(x, 'private:1', 'health', at);
    const list = achievementsOf([goal('1', 'completed', [{kind: 'completed', at: '2026-03-01T10:00:00.000Z'}, {kind: 'reopened', at: '2026-03-02T10:00:00.000Z'}, {kind: 'completed', at: '2026-04-10T10:00:00.000Z'}]), goal('2', 'active'), goal('3', 'completed', [{kind: 'completed', at: '2026-08-01T10:00:00.000Z'}])], [], x);
    expect(list.map(a => a.key)).toEqual(['private:3', 'private:1']);
    expect(list[1]).toMatchObject({finished: '2026-04-10', days: 99, area: 'health', areaLabel: 'Health', story: 'Ran it in the rain.'});
  });
  it('an older record without a completion step says the day is not recorded', () => {
    const [a] = achievementsOf([goal('4', 'completed')], [], emptyGoalExtras());
    expect(a).toMatchObject({finished: null, days: null});
    expect(durationWords(a!.days)).toBe('Finish day not recorded');
  });
  it('finished average goals join the hall', () => {
    const avg = {id: 'sleep', name: 'Sleep 7 h', metric: 'sleep-hours', status: 'completed', createdAt: '2026-09-01T08:00:00.000Z', completedAt: '2026-09-29T08:00:00.000Z'} as AverageGoal;
    expect(achievementsOf([], [avg], emptyGoalExtras())[0]).toMatchObject({key: 'average:sleep', days: 28, area: 'health'});
  });
  it('durations in plain words', () => {
    expect(durationWords(0)).toBe('Finished the day it started');
    expect(durationWords(1)).toBe('1 day');
    expect(durationWords(45)).toBe('45 days');
    expect(durationWords(120)).toBe('4 months');
    expect(durationWords(900)).toBe('2 years');
  });
});
