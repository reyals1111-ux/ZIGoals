import {describe, expect, test} from 'vitest';
import {createEmptyHealth, healthSchema} from '../health';
import {dailyData, saveHealthPreferences, waterSummary} from '../health-daily';
import {exerciseData} from '../health-counters';
import {createHabit, emptyHabitData, habitDataSchema, saveHabitTimezone, type HabitData} from '../habits';
import {applyQuickAdd, quickAddDays} from './save';
import {parse} from './parse';
import type {QuickAddContext, QuickAddKnown} from './types';

const NOW = new Date('2026-10-01T11:30:00.000Z');
const HOST_ZONES = ['Pacific/Kiritimati', 'Pacific/Auckland', 'Asia/Tokyo', 'Asia/Kolkata', 'Europe/Brussels', 'Europe/London', 'UTC', 'America/Sao_Paulo', 'America/New_York', 'America/Los_Angeles', 'Pacific/Honolulu'];
function health(zone: string | null) { const base = createEmptyHealth(); return saveHealthPreferences(base, {...dailyData(base).preferences, timezone: zone}); }
function habits(zone: string | null): HabitData {
  let data = emptyHabitData();
  if (zone) data = saveHabitTimezone(data, zone);
  data = createHabit(data, {title: 'Meditate', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, target: 10, measurement: {kind: 'count', unit: 'times'}}, new Date('2026-09-01T00:00:00.000Z'), '11111111-1111-4111-8111-111111111111');
  return data;
}
const context = (data: HabitData): QuickAddContext => ({habits: data.habits.map(h => ({id: h.id, title: h.title, unit: 'times', kind: 'count', target: 10})), counters: exerciseData(createEmptyHealth()).counters.map(c => ({id: c.id, name: c.name})), waterUnit: 'ml', weightUnit: 'kg'});
const known = (text: string, data: HabitData): QuickAddKnown => { const r = parse(text, 'en', context(data)); if (r.kind === 'ambiguous' || r.kind === 'needs-more' || r.kind === 'unknown') throw Error(`${text}: ${r.kind}`); return r; };

describe('A2 save mapping', () => {
  test('each kind writes exactly one ordinary record on the journal\'s own day', () => {
    const stores = {health: health('Pacific/Kiritimati'), habits: habits('Etc/GMT+12')};
    expect(quickAddDays(stores, NOW)).toEqual({health: '2026-10-02', habits: '2026-09-30'});
    const water = applyQuickAdd(known('drank 2 glasses of water', stores.habits), stores, NOW, 'health_quick-water');
    const entry = dailyData(water.health!).water[0]!;
    expect(entry).toMatchObject({id: 'health_quick-water', date: '2026-10-02', amountMilli: 500_000, unit: 'ml', createdAt: NOW.toISOString()});
    expect(waterSummary(water.health!, '2026-10-02').millilitres).toBe(500);
    const weight = applyQuickAdd(known('weight 78.4', stores.habits), stores, NOW, 'health_quick-weight');
    expect(weight.health!.weights).toEqual([{id: 'health_quick-weight', date: '2026-10-02', grams: 78_400, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString()}]);
    const steps = applyQuickAdd(known('walked 8000 steps in 70 min', stores.habits), stores, NOW, 'health_quick-steps');
    expect(steps.health!.activity).toMatchObject([{id: 'health_quick-steps', date: '2026-10-02', name: 'Walk', steps: 8000, minutes: 70}]);
    const run = applyQuickAdd(known('ran 5k in 28 min', stores.habits), stores, NOW, 'health_quick-run');
    expect(run.health!.activity).toMatchObject([{name: 'Run · 5 km', steps: 0, minutes: 28, date: '2026-10-02'}]);
    const sleep = applyQuickAdd(known('slept 7h30', stores.habits), stores, NOW, 'health_quick-sleep');
    expect(sleep.health!.activity).toMatchObject([{name: 'Sleep', steps: 0, minutes: 450}]);
    const pushups = applyQuickAdd(known('+2 pushups', stores.habits), stores, NOW);
    const counter = exerciseData(stores.health).counters.find(c => /push/i.test(c.name))!;
    expect(exerciseData(pushups.health!).days).toMatchObject([{counterId: counter.id, date: '2026-10-02', count: 2}]);
    const habit = applyQuickAdd(known('meditated', stores.habits), stores, NOW);
    expect(habit.habits!.habits[0]!.entries).toMatchObject([{date: '2026-09-30', count: 1, disposition: 'logged'}]);
    expect(habit.habitTotal).toEqual({value: 1, target: 10, unit: 'times'});
    for (const write of [water, weight, steps, run, sleep, pushups]) { expect(write.habits).toBeUndefined(); healthSchema.parse(write.health); }
    expect(habit.health).toBeUndefined(); habitDataSchema.parse(habit.habits);
  });
  test('"yesterday" is one day earlier in each journal, whatever the host zone', () => {
    const stores = {health: health('Pacific/Kiritimati'), habits: habits('Etc/GMT+12')};
    const water = applyQuickAdd(known('drank 3 glasses yesterday', stores.habits), stores, NOW, 'health_quick-yesterday');
    expect(dailyData(water.health!).water[0]!.date).toBe('2026-10-01');
    const habit = applyQuickAdd(known('meditated yesterday', stores.habits), stores, NOW);
    expect(habit.habits!.habits[0]!.entries[0]!.date).toBe('2026-09-29');
    for (const zone of HOST_ZONES) {
      const local = {health: health(zone), habits: habits(zone)};
      const days = quickAddDays(local, NOW);
      const expected = new Intl.DateTimeFormat('en-CA', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'}).format(NOW);
      expect(days, zone).toEqual({health: expected, habits: expected});
    }
  });
  test('the DST day in Brussels is one day for both journals', () => {
    const at = new Date('2026-10-25T01:30:00.000Z'), stores = {health: health('Europe/Brussels'), habits: habits('Europe/Brussels')};
    expect(quickAddDays(stores, at)).toEqual({health: '2026-10-25', habits: '2026-10-25'});
    expect(quickAddDays(stores, new Date('2026-10-25T22:59:00.000Z'))).toEqual({health: '2026-10-25', habits: '2026-10-25'});
    expect(quickAddDays(stores, new Date('2026-10-25T23:00:00.000Z'))).toEqual({health: '2026-10-26', habits: '2026-10-26'});
  });
  test('a habit refuses a day it was not scheduled with its own message', () => {
    const stores = {health: health(null), habits: habits(null)};
    stores.habits = createHabit(emptyHabitData(), {title: 'Meditate', category: 'Mind', description: '', notes: '', schedule: {kind: 'weekdays', days: [1]}, target: 10, measurement: {kind: 'count', unit: 'times'}}, new Date('2026-09-01T00:00:00.000Z'));
    expect(() => applyQuickAdd(known('meditated', stores.habits), stores, new Date('2026-10-01T12:00:00.000Z'))).toThrow();
  });
});
