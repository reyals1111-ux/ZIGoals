import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, type HabitInput} from '../habits';
import {createEmptyHealth, type HealthData} from '../health';
import type {HealthGoal} from '../health-goals/schema';
import {orbitWords, orbitsFor, weekStart} from './rings';

// Session AP (feature 3): orbits from the person's own goals. Fictional records; Saturday 14 November 2026.
const TODAY = '2026-11-14', AT = '2026-11-01T07:00:00.000Z';
const health = (steps: {date: string; steps: number; minutes: number}[], stepTarget: number | null = null): HealthData => ({...createEmptyHealth(),
  targets: {...createEmptyHealth().targets, steps: stepTarget},
  activity: steps.map((a, i) => ({id: `health_activity-${String(i).padStart(3, '0')}`, name: 'Walk', createdAt: AT, updatedAt: AT, ...a}))});
const goal = (patch: Partial<HealthGoal>): HealthGoal => ({version: 1, id: '92000000-0000-4000-8000-0000000000b1', name: 'Walk more', measure: 'steps', direction: 'at-least', target: {value: '8000', decimals: 0}, unit: 'steps', window: {kind: 'rolling', weeks: 1}, status: 'active', createdAt: AT, updatedAt: AT, ...patch});
const habit = (input: Partial<HabitInput>) => createHabit(emptyHabitData(), {title: 'Gym', category: 'Fitness', description: '', notes: '', schedule: {kind: 'frequency', times: 3, period: 'week'}, target: 1, ...input} as HabitInput, new Date('2026-11-01T08:00:00Z'), '92000000-0000-4000-8000-0000000000c1');
const workout = (date: string, ended = true) => ({date, ...(ended ? {endedAt: `${date}T09:00:00.000Z`} : {})});

describe('orbits from the person\'s own goals', () => {
  test('with no goals, no orbit is drawn and each says where its goal is set', () => {
    const r = orbitsFor({health: createEmptyHealth(), goals: [], workouts: null, habits: null, today: TODAY});
    expect(r.orbits).toEqual([]);
    expect(r.missing.map(m => m.id)).toEqual(['steps', 'minutes', 'workouts']);
  });
  test('steps: today against the daily target, or else a steps goal\'s daily average', () => {
    const h = health([{date: TODAY, steps: 6000, minutes: 40}, {date: '2026-11-13', steps: 20000, minutes: 90}], 8000);
    expect(orbitsFor({health: h, goals: [], workouts: null, habits: null, today: TODAY}).orbits[0]).toMatchObject({id: 'steps', value: 6000, target: 8000, share: 0.75, reached: false, period: 'today'});
    const fromGoal = orbitsFor({health: health([{date: TODAY, steps: 9000, minutes: 0 + 1}]), goals: [goal({target: {value: '7500', decimals: 0}})], workouts: null, habits: null, today: TODAY}).orbits[0]!;
    expect(fromGoal).toMatchObject({value: 9000, target: 7500, share: 1, reached: true, source: 'Your goal “Walk more”'});
    expect(orbitWords(fromGoal)).toBe('9000 of 7500 steps today · reached');
  });
  test('active minutes: the goal\'s own window and count; a closed goal draws nothing', () => {
    const h = health([{date: TODAY, steps: 1, minutes: 30}, {date: '2026-11-10', steps: 1, minutes: 45}, {date: '2026-11-01', steps: 1, minutes: 99}]);
    const minutes = goal({name: 'Move', measure: 'activeMinutes', unit: 'min', target: {value: '150', decimals: 0}});
    expect(orbitsFor({health: h, goals: [minutes], workouts: null, habits: null, today: TODAY}).orbits).toEqual([expect.objectContaining({id: 'minutes', value: 75, target: 150, share: 0.5, period: 'the last week'})]);
    expect(orbitsFor({health: h, goals: [{...minutes, status: 'closed'}], workouts: null, habits: null, today: TODAY}).orbits).toEqual([]);
  });
  test('workout days: a weekly workout habit sets how many; finished workouts from Monday count once a day', () => {
    expect(weekStart(TODAY)).toBe('2026-11-09');
    const w = {workouts: [workout('2026-11-09'), workout('2026-11-09'), workout('2026-11-12'), workout('2026-11-14', false), workout('2026-11-08')]};
    const r = orbitsFor({health: createEmptyHealth(), goals: [], workouts: w, habits: habit({}), today: TODAY});
    expect(r.orbits).toEqual([expect.objectContaining({id: 'workouts', value: 2, target: 3, period: 'this week', unit: 'days'})]);
    // A weekly habit that is not about workouts, or a daily one, sets nothing.
    expect(orbitsFor({health: createEmptyHealth(), goals: [], workouts: w, habits: habit({title: 'Call mum'}), today: TODAY}).orbits).toEqual([]);
    expect(orbitsFor({health: createEmptyHealth(), goals: [], workouts: w, habits: habit({schedule: {kind: 'daily'}}), today: TODAY}).orbits).toEqual([]);
  });
  test('no calories anywhere, and none of another app\'s ring names', () => {
    const r = orbitsFor({health: health([{date: TODAY, steps: 100, minutes: 1}], 8000), goals: [goal({measure: 'activeMinutes', unit: 'min', target: {value: '150', decimals: 0}})], workouts: {workouts: []}, habits: habit({}), today: TODAY});
    const text = JSON.stringify(r);
    expect(text).not.toMatch(/kcal|calorie/i);
    expect(r.orbits.map(o => o.label)).toEqual(['Steps', 'Active minutes', 'Workout days']);
    expect(text).not.toMatch(/\b(Move|Exercise|Stand)\b/);
  });
});
