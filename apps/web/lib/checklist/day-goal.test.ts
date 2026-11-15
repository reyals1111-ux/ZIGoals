import {describe, expect, test} from 'vitest';
import {checklistStreak, mendableDays} from './streak';
import {DAY_GOAL_KEY_LITERAL, dayCounts, dotsNeeded, emptyDayGoal, needOn} from './day-goal-core';
import {readDayGoal} from './day-goal-read';
import {DAY_GOAL_KEY, chooseDayGoal, dayGoalSchema} from './day-goal';
import {checklistOrbitDays} from '../game/xp';
import type {ChecklistDays} from './schema';
import type {HabitData} from '../habits';
import type {HealthData} from '../health';

/** Session AP (owner decision 14 Nov, ADR-040): "A day counts as done at N". */
const days = (map: Record<string, [number, number, boolean?]>): ChecklistDays => ({version: 1, days: Object.fromEntries(Object.entries(map).map(([d, [total, done, perfect]]) => [d, {total, done, ...(perfect ? {perfect} : {})}]))});
const history = days({'2026-11-08': [6, 4], '2026-11-09': [6, 6, true], '2026-11-10': [3, 3], '2026-11-11': [6, 5], '2026-11-12': [6, 4], '2026-11-13': [6, 2]});
const today = '2026-11-14';

describe('off by default: exactly the Checklist rule before', () => {
  test('no record, an empty record and need null give the same streak as no goal at all', () => {
    const base = checklistStreak(history, today, {total: 6, done: 6});
    for (const goal of [undefined, null, emptyDayGoal(), {version: 1 as const, changes: [{from: '2026-01-01', need: null}]}]) expect(checklistStreak(history, today, {total: 6, done: 6}, goal)).toEqual(base);
    expect(mendableDays(history, today, emptyDayGoal())).toEqual(mendableDays(history, today));
  });
  test('every dot: 4 of 6 does not count; 6 of 6 does', () => {
    expect(dayCounts({total: 6, done: 4}, null)).toBe(false);
    expect(dayCounts({total: 6, done: 6}, null)).toBe(true);
    expect(dayCounts({total: 0, done: 0}, null)).toBe(false);
  });
});

describe('on: min(N, the day\'s dots)', () => {
  test('4 counts 4 of 6, and a three-dot day at 3 of 3', () => {
    expect(dotsNeeded(6, 4)).toBe(4);
    expect(dotsNeeded(3, 4)).toBe(3);
    expect(dayCounts({total: 6, done: 4}, 4)).toBe(true);
    expect(dayCounts({total: 3, done: 2}, 4)).toBe(false);
    expect(dayCounts({total: 3, done: 3}, 4)).toBe(true);
  });
  test('the flame counts each day by the rule of that day; days before the first change keep "every dot"', () => {
    const goal = chooseDayGoal(emptyDayGoal(), '2026-11-11', 4);
    // 11th (5/6), 12th (4/6) count from the change on; the 13th (2/6) breaks; today (4/6) counts.
    expect(checklistStreak(history, today, {total: 6, done: 4}, goal).current).toBe(1);
    const noBreak = days({...Object.fromEntries(Object.entries(history.days).filter(([d]) => d !== '2026-11-13').map(([d, v]) => [d, [v.total, v.done, v.perfect]]))} as never);
    const s = checklistStreak(noBreak, '2026-11-13', {total: 6, done: 4}, goal);
    // 13th today (4/6 counts), 12th, 11th count under 4; the 10th (3/3) and 9th (6/6) count under every dot; the 8th (4/6)
    // was before the change, so it never counts — it is not re-counted.
    expect(s.current).toBe(5);
    expect(checklistStreak(noBreak, '2026-11-13', {total: 6, done: 4}).current).toBe(0);
  });
  test('a Perfect orbit still needs every dot, whatever the rule', () => {
    const goal = chooseDayGoal(emptyDayGoal(), '2026-11-01', 2);
    const s = checklistStreak(days({'2026-11-12': [6, 2, true], '2026-11-13': [6, 6, true]}), today, null, goal);
    expect(s.perfectDays).toBe(1);
    const stores = {habits: {habits: []} as unknown as HabitData, health: {} as HealthData, checklist: days({'2026-11-12': [6, 2, true], '2026-11-13': [6, 6, true]}), dayGoal: goal};
    expect(checklistOrbitDays(stores, today)).toEqual([{day: '2026-11-12', perfect: false}, {day: '2026-11-13', perfect: true}]);
    expect(checklistOrbitDays({...stores, dayGoal: null}, today)).toEqual([{day: '2026-11-13', perfect: true}]);
  });
  test('mendable days follow the rule of their day', () => {
    const goal = chooseDayGoal(emptyDayGoal(), '2026-11-11', 4);
    expect(mendableDays(history, today, goal)).toEqual(['2026-11-13', '2026-11-08']);
  });
});

describe('the record: dated changes, never re-counting', () => {
  test('a change applies from its day; a second change the same day replaces it; choosing the rule in force changes nothing', () => {
    let g = chooseDayGoal(emptyDayGoal(), '2026-11-10', 4);
    expect(g.changes).toEqual([{from: '2026-11-10', need: 4}]);
    expect(chooseDayGoal(g, '2026-11-12', 4)).toBe(g);
    g = chooseDayGoal(g, '2026-11-12', 3);
    g = chooseDayGoal(g, '2026-11-12', 5);
    expect(g.changes).toEqual([{from: '2026-11-10', need: 4}, {from: '2026-11-12', need: 5}]);
    expect(chooseDayGoal(g, '2026-11-12', 4).changes).toEqual([{from: '2026-11-10', need: 4}]);
    g = chooseDayGoal(g, '2026-11-13', null);
    expect([needOn(g, '2026-11-09'), needOn(g, '2026-11-10'), needOn(g, '2026-11-12'), needOn(g, '2026-11-13'), needOn(g, '2027-01-01')]).toEqual([null, 4, 5, null, null]);
  });
  test('a change dated after today (another device\'s clock) is dropped by the next choice, never kept in force', () => {
    const g = {version: 1 as const, changes: [{from: '2026-12-01', need: 3}]};
    expect(chooseDayGoal(g, today, 4).changes).toEqual([{from: today, need: 4}]);
  });
  test('the schema and the schema-free reader agree, and refuse what the write never makes', () => {
    const good = {version: 1, changes: [{from: '2026-11-10', need: 4}, {from: '2026-11-12', need: null}]};
    expect(readDayGoal(JSON.stringify(good))).toEqual(good);
    expect(dayGoalSchema.safeParse(good).success).toBe(true);
    for (const bad of [
      {version: 2, changes: []}, {version: 1}, {version: 1, changes: [{from: '2026-11-10', need: 0}]}, {version: 1, changes: [{from: '2026-11-10', need: 31}]},
      {version: 1, changes: [{from: '2026-13-10', need: 4}]}, {version: 1, changes: [{from: '2026-11-10', need: 4, extra: 1}]}, {version: 1, changes: [], extra: true},
      {version: 1, changes: [{from: '2026-11-12', need: 4}, {from: '2026-11-10', need: 3}]}, {version: 1, changes: [{from: '2026-11-12', need: 4}, {from: '2026-11-12', need: 3}]},
      {version: 1, changes: [{from: '2026-11-12', need: 2.5}]},
    ]) {
      expect(readDayGoal(JSON.stringify(bad)), JSON.stringify(bad)).toEqual(emptyDayGoal());
      expect(dayGoalSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
    expect(readDayGoal('not json')).toEqual(emptyDayGoal());
    expect(DAY_GOAL_KEY).toBe(DAY_GOAL_KEY_LITERAL);
  });
  test('a full list throws rather than dropping an old change', () => {
    const changes = Array.from({length: 400}, (_, i) => ({from: new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10), need: i % 2 ? 3 : null}));
    expect(() => chooseDayGoal({version: 1, changes}, '2026-11-14', 5)).toThrow(/too many/);
  });
});
