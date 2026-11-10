import {describe, expect, it} from 'vitest';
import {defaultMeal} from './default-meal';
import {mealAt} from './checklist/derive';
import type {HealthExtras} from './health-extras';

const at = (clock: string) => new Date(`2026-11-09T${clock}:00.000Z`);
const times = (t: Partial<Record<'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks', string>>): HealthExtras => ({version: 1, meals: Object.fromEntries(Object.entries(t).map(([m, time]) => [m, {time}]))} as HealthExtras);

describe('defaultMeal (A10-2)', () => {
  it('follows the time of day with no usual times set: 6:20 PM is Dinner, not Breakfast', () => {
    expect(['00:30', '03:59', '04:00', '06:59', '10:59', '11:00', '14:59', '15:00', '16:59', '17:00', '18:20', '21:59', '22:00', '23:30'].map(t => defaultMeal(at(t), 'UTC', null)))
      .toEqual(['Snacks', 'Snacks', 'Breakfast', 'Breakfast', 'Breakfast', 'Lunch', 'Lunch', 'Snacks', 'Snacks', 'Dinner', 'Dinner', 'Dinner', 'Snacks', 'Snacks']);
  });
  it('uses the same hours as a one-tap Checklist favourite (lib/checklist/derive mealAt), every quarter hour', () => {
    for (let m = 0; m < 24 * 60; m += 15) { const now = new Date(Date.UTC(2026, 10, 9, 0, m)); expect(defaultMeal(now, 'UTC', {version: 1})).toBe(mealAt(now, 'UTC')); }
  });
  it('reads the clock where the journal is lived, not UTC', () => {
    // 18:20 in Brussels (UTC+1 in November) is 17:20 UTC; 06:00 in New York (UTC−5) is 11:00 UTC.
    expect(defaultMeal(at('17:20'), 'Europe/Brussels', null)).toBe('Dinner');
    expect(defaultMeal(at('11:00'), 'America/New_York', null)).toBe('Breakfast');
  });
  it('with usual meal times, picks the meal whose time is nearest now, round the clock', () => {
    const mine = times({Breakfast: '07:00', Lunch: '12:00', Dinner: '18:00', Snacks: '15:30'});
    expect(['05:00', '06:59', '09:20', '14:00', '16:00', '18:20', '23:50', '02:00'].map(t => defaultMeal(at(t), 'UTC', mine)))
      .toEqual(['Breakfast', 'Breakfast', 'Breakfast', 'Snacks', 'Snacks', 'Dinner', 'Dinner', 'Breakfast']);
  });
  it('with only some times set, the others count at the middle of their usual hours (Snacks only with a time)', () => {
    const early = times({Breakfast: '06:45'});
    expect(['06:00', '18:20', '12:40', '17:00'].map(t => defaultMeal(at(t), 'UTC', early))).toEqual(['Breakfast', 'Dinner', 'Lunch', 'Dinner']);
  });
});
