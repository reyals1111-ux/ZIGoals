import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, type HabitData, type HabitInput} from '../habits';
import {createEmptyHealth} from '../health';
import {celebrationId, firstSight, goalCelebration, pendingCelebrations} from './celebrate';
import {emptyGame, markBadgeSeen, markLevelSeen, setGameEnabled} from './schema';

const TODAY = '2026-10-07', AT = new Date('2026-06-01T06:00:00.000Z'), ID = '11111111-1111-4111-8111-111111111111';
const input: HabitInput = {title: 'Stretch', category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}};
function streak(days: number): HabitData { let d = createHabit(emptyHabitData(), input, AT, ID); for (let i = 0; i < days; i++) { const day = new Date(Date.parse(`${TODAY}T12:00:00Z`) - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10); d = logHabitValue(d, ID, day, 1, {mode: 'set'}, new Date(`${day}T07:00:00Z`)); } return d; }
describe('celebrations (S10): one-time, derived, never while the layer is off', () => {
  test('off → nothing; the first level seen is remembered, not celebrated; a later level, a new badge and a 100-day streak celebrate once', () => {
    const stores = {habits: streak(100), health: createEmptyHealth()};
    expect(pendingCelebrations(stores, emptyGame(), {}, TODAY)).toEqual([]);
    const on = setGameEnabled(emptyGame(), true);
    expect(pendingCelebrations(stores, on, {}, TODAY)).toEqual([]); // levelSeen undefined: the layer was just switched on; what is there is remembered, not celebrated
    expect(firstSight(stores, TODAY)).toMatchObject({level: 4, badgeIds: expect.arrayContaining(['first-step', 'streak-30', 'hundred'])});
    const first = pendingCelebrations(stores, markLevelSeen(on, 4), {}, TODAY);
    expect(first.filter(c => c.kind === 'badge').map(c => c.id)).toEqual(expect.arrayContaining([celebrationId.badge('first-step'), celebrationId.badge('streak-30'), celebrationId.badge('hundred')]));
    expect(first.find(c => c.kind === 'streak')).toMatchObject({id: celebrationId.streak(ID), title: '100 days · Stretch'});
    const later = pendingCelebrations(stores, markBadgeSeen(markLevelSeen(on, 3), 'hundred', TODAY), {[celebrationId.streak(ID)]: TODAY}, TODAY);
    expect(later.find(c => c.kind === 'level')).toMatchObject({id: 'level:4', semantic: 'level_up'}); // 1000 XP → level 4
    expect(later.some(c => c.id === celebrationId.badge('hundred'))).toBe(false); expect(later.some(c => c.kind === 'streak')).toBe(false);
    expect(pendingCelebrations(stores, markLevelSeen(on, 4), {'level:4': TODAY}, TODAY).some(c => c.kind === 'level')).toBe(false);
    expect(later.every(c => !/fail|guilt|lost|should/i.test(`${c.title} ${c.line}`))).toBe(true);
  });
  test('a fasting milestone celebrates once while the fast runs; a goal reached from the bus celebrates once a day per kind', () => {
    const stores = {habits: streak(1), health: createEmptyHealth()}, on = markLevelSeen(setGameEnabled(emptyGame(), true), 1);
    const fast = [{id: 'f1', hours: 16.2, targetHours: 16, endedAt: null}];
    expect(pendingCelebrations(stores, on, {}, TODAY, fast).find(c => c.kind === 'fast')).toMatchObject({id: 'fast:f1', title: '16 hours fasted'});
    expect(pendingCelebrations(stores, on, {'fast:f1': TODAY}, TODAY, fast).some(c => c.kind === 'fast')).toBe(false);
    expect(pendingCelebrations(stores, on, {}, TODAY, [{...fast[0]!, hours: 12}]).some(c => c.kind === 'fast')).toBe(false);
    expect(goalCelebration('goal_funded', {}, TODAY)).toMatchObject({id: `goal:goal_funded:${TODAY}`, title: 'Goal funded'});
    expect(goalCelebration('goal_funded', {[`goal:goal_funded:${TODAY}`]: TODAY}, TODAY)).toBeNull();
  });
});
