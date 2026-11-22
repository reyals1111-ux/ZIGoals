import {describe, expect, test} from 'vitest';
import {createEmptyHealth, quickLogFood, type HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {withHealthGroup} from '../vault/w-homes';
import type {Sleep} from '../sleep/schema';
import {compare, CONFOUNDERS, factorOptions} from './engine';
import {lateMealCount, lateMealDays, lateMealRule} from './late-meal';
import {foodPlusSchema} from '../food-plus/schema';

/**
 * Session AV lane 2 (r5-body; Bevel, LEDGER #371): a late-meal night from the food log in Compare, beside the hand-set
 * tag — food of at least the person's own number of kcal logged within their own hours before bedtime. A fact, never a
 * cause; unknown is never "without".
 */
const TODAY = '2026-11-20';
const id = (s: string) => `health_${s.padEnd(8, '0')}`;
/** 40 days ending yesterday: on even days a 600 kcal dinner at 21:30 and bed at 23:00, a 6 h night; on odd days the same dinner at 18:00 and an 8 h night. */
function world(): HealthData {
  let h = createEmptyHealth();
  const nights: Sleep['nights'] = [], AT = `${TODAY}T08:00:00.000Z`;
  for (let i = 0; i < 40; i++) {
    const day = addLocalDays(TODAY, -40 + i), even = i % 2 === 0;
    h = quickLogFood(h, {foodId: id(`food-${String(i).padStart(4, '0')}`), logId: id(`logs-${String(i).padStart(4, '0')}`), name: 'Fictional dinner', servingGrams: 300, nutrients: {kcal: 600, proteinMg: null, carbsMg: null, fatMg: null}, date: day, meal: 'Dinner'}, `${day}T${even ? '21:30' : '18:00'}:00.000Z`);
    nights.push({id: `health_sleep-fictional-${day}`, kind: 'night', source: 'manual', start: `${day}T23:00:00.000Z`, end: `${addLocalDays(day, 1)}T${even ? '05' : '07'}:00:00.000Z`, timeZone: 'UTC', createdAt: AT, updatedAt: AT});
  }
  return withHealthGroup(h, 'sleep', {version: 1, nights} as Sleep, false);
}

describe('the late-meal days', () => {
  test('food at or above the number within the hours before bed; earlier food is "without"; no food is unknown', () => {
    const h = world(), days = lateMealDays(h, null, 'UTC');
    expect(days.get(addLocalDays(TODAY, -40))).toBe(true);
    expect(days.get(addLocalDays(TODAY, -39))).toBe(false);
    expect(lateMealCount(days, TODAY)).toEqual({late: 20, known: 40});
    expect(lateMealDays(withHealthGroup(createEmptyHealth(), 'sleep', {version: 1, nights: []} as Sleep, false), null, 'UTC').size).toBe(0);
  });
  test('the person’s own numbers: a 6-hour window takes the 18:00 dinner in too; 700 kcal leaves both out', () => {
    const h = world();
    expect(lateMealCount(lateMealDays(h, foodPlusSchema.parse({version: 1, lateMeal: {hours: 6, kcal: 300}}), 'UTC'), TODAY).late).toBe(40);
    expect(lateMealCount(lateMealDays(h, foodPlusSchema.parse({version: 1, lateMeal: {hours: 3, kcal: 700}}), 'UTC'), TODAY).late).toBe(0);
    expect(lateMealRule(null)).toEqual({hours: 3, kcal: 300});
  });
  test('an eaten-at time the person took off makes that day unknown, never "without"', () => {
    const h = world(), entry = h.diary[1]!;
    const days = lateMealDays(h, foodPlusSchema.parse({version: 1, times: {[entry.id]: 'none'}}), 'UTC');
    expect(days.has(entry.date)).toBe(false);
  });
});

describe('in Compare, beside the hand-set tag', () => {
  test('offered in "Sleep tags"; the nights after late-meal days set beside the others, as a fact', () => {
    const src = {health: world(), zone: 'UTC'};
    expect(factorOptions(src, TODAY).find(f => f.id === 'late-meal')).toEqual({id: 'late-meal', kind: 'late-meal', label: 'Late meal (from your food log)', group: 'Sleep tags'});
    const r = compare(src, 'late-meal', 'sleep', 'same', TODAY)!;
    expect(r.counts).toBe('20 days with, 20 without');
    expect(r.sentence).toBe('On days with 300 kcal or more logged in the 3 hours before bed, you slept 6 h that night on average; on other days, 8 h.');
    expect(r.confounder).toBe(CONFOUNDERS['late-meal']);
    for (const w of ['hurt', 'cause', 'because', 'bad for', 'should']) expect(`${r.sentence} ${r.confounder}`.toLowerCase()).not.toContain(w);
  });
  test('without food or nights it is not offered', () => {
    expect(factorOptions({health: createEmptyHealth()}, TODAY).some(f => f.id === 'late-meal')).toBe(false);
  });
});
