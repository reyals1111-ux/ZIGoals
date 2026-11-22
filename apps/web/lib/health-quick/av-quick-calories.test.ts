import {describe, expect, it} from 'vitest';
import {createEmptyHealth, dailyHealthSummary, healthSchema} from '../health';
import {copyMealFromDayBefore} from './quick';
import {QUICK_KCAL_NAME, quickCalories} from './calories';

/** Session AV (owner follow-up 1, F-QUICK-KCAL): calories alone, without a food in the library. */
const AT = '2026-11-23T08:00:00.000Z';
describe('Session AV (F-QUICK-KCAL)', () => {
  it('logs calories alone to a day and meal; macros unknown, never zero; the library untouched', () => {
    const h = quickCalories(createEmptyHealth(), {id: 'health_quickkcal-0001', sourceId: 'health_quickkcal-src-0001', kcal: '450', date: '2026-11-23', meal: 'Lunch'}, AT);
    expect(h.foods).toEqual([]);
    expect(h.diary).toHaveLength(1);
    expect(h.diary[0]).toMatchObject({meal: 'Lunch', quantityMilli: 1000, snapshot: {name: QUICK_KCAL_NAME, servingGrams: null, nutrients: {kcal: 450, proteinMg: null, carbsMg: null, fatMg: null}}});
    const named = quickCalories(h, {id: 'health_quickkcal-0002', sourceId: 'health_quickkcal-src-0002', kcal: '120', name: '  a fictional  biscuit ', date: '2026-11-23', meal: 'Snacks'}, AT);
    expect(named.diary[1]!.snapshot.name).toBe('a fictional biscuit');
    expect(JSON.stringify(dailyHealthSummary(named, '2026-11-23'))).toContain('570');
    expect(healthSchema.safeParse(JSON.parse(JSON.stringify(named))).success).toBe(true);
  });
  it('refuses zero, a word or more than 10,000 kcal, with the range', () => {
    for (const kcal of ['0', 'lots', '10001']) expect(() => quickCalories(createEmptyHealth(), {id: 'health_quickkcal-0001', sourceId: 'health_quickkcal-src-0001', kcal, date: '2026-11-23', meal: 'Lunch'}, AT)).toThrow();
    expect(() => quickCalories(createEmptyHealth(), {id: 'health_quickkcal-0001', sourceId: 'health_quickkcal-src-0001', kcal: '0', date: '2026-11-23', meal: 'Lunch'}, AT)).toThrow('Enter 1 to 10,000 kcal.');
  });
  it('copies to the next day like any entry (its snapshot goes with it)', () => {
    const h = quickCalories(createEmptyHealth(), {id: 'health_quickkcal-0001', sourceId: 'health_quickkcal-src-0001', kcal: '300', date: '2026-11-22', meal: 'Breakfast'}, AT);
    const copied = copyMealFromDayBefore(h, '2026-11-23', 'Breakfast', 'health_copyop-00000001', AT);
    expect(copied.diary.filter(e => e.date === '2026-11-23').map(e => e.snapshot.nutrients.kcal)).toEqual([300]);
  });
});
