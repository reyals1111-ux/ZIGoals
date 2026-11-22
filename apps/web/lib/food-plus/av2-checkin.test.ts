import {describe, expect, it} from 'vitest';
import {createEmptyHealth, healthSchema, type HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {coachCheckIn, goalDate, weekStartOf} from '../health-aa/coach';
import {energyEstimate} from '../health-aa/energy';
import {emptyHealthCoach} from '../health-aa/coach-schema';
import {coachPrefsOf} from './day-target';
import {isPartialDay, setCheckInWeekday, setPartialDay} from './checkin';
import {emptyFoodPlus, foodPlusSchema} from './schema';

/** Session AV lane 2 (food, LEDGER #106, #107; MacroFactor): the check-in day, partly logged days, the chosen pace, the goal date. */
const TODAY = '2026-10-07'; // a Wednesday
const stamp = (d: string) => `${d}T08:00:00.000Z`;
function health(): HealthData {
  const food = {id: 'health_food-0001', name: 'Fictional bowl', brand: '', servingGrams: 300, nutrients: {kcal: 1100, proteinMg: 30000, carbsMg: 60000, fatMg: 20000}, createdAt: stamp('2026-09-01'), updatedAt: stamp('2026-09-01')};
  const diary = [], weights = [];
  for (let i = 0; i < 28; i++) { const d = addLocalDays(TODAY, -i); for (const k of ['a', 'b']) diary.push({id: `health_diary-${String(i).padStart(3, '0')}-${k}`, sourceId: food.id, sourceKind: 'food' as const, snapshot: {name: food.name, servingGrams: 300, nutrients: food.nutrients}, date: d, meal: 'Lunch' as const, quantityMilli: 1000, createdAt: stamp(d), updatedAt: stamp(d)}); }
  for (let i = 27; i >= 0; i -= 2) { const d = addLocalDays(TODAY, -i); weights.push({id: `health_weight-${String(i).padStart(3, '0')}`, date: d, grams: 74000 + (27 - i) * -40, createdAt: stamp(d), updatedAt: stamp(d)}); }
  const h = healthSchema.parse({...createEmptyHealth(), foods: [food], diary, weights});
  return {...h, targets: {...h.targets, weightGrams: 70000, kcal: 2200}};
}
describe('the check-in day and partly logged days', () => {
  it('the week starts on the chosen weekday (Monday unless chosen)', () => {
    expect(weekStartOf(TODAY)).toBe('2026-10-05');
    expect(weekStartOf(TODAY, 5)).toBe('2026-10-02');
    expect(weekStartOf(TODAY, 3)).toBe(TODAY);
    expect(weekStartOf(TODAY, 0)).toBe('2026-10-04');
    const c = coachCheckIn(health(), emptyHealthCoach(), TODAY, 'kg', {checkInWeekday: 5});
    expect([c.weekStart, c.checkInWeekday]).toEqual(['2026-10-02', 5]);
    expect(() => setCheckInWeekday(emptyFoodPlus(), 7)).toThrow('Choose a day of the week.');
    expect(setCheckInWeekday(emptyFoodPlus(), 5).checkIn).toEqual({weekday: 5});
  });
  it('a partly logged day is left out of the energy estimate, and counted on the coach', () => {
    const h = health(), all = energyEstimate(h, TODAY);
    let r = setPartialDay(emptyFoodPlus(), addLocalDays(TODAY, -1), true);
    r = setPartialDay(r, addLocalDays(TODAY, -2), true);
    expect(isPartialDay(r, addLocalDays(TODAY, -1))).toBe(true);
    const prefs = coachPrefsOf(JSON.stringify(r)), less = energyEstimate(h, TODAY, prefs.partialDays);
    expect(less.loggedDays).toBe(all.loggedDays - 2);
    expect(coachCheckIn(h, emptyHealthCoach(), TODAY, 'kg', prefs).partialLeftOut).toBe(2);
    r = setPartialDay(setPartialDay(r, addLocalDays(TODAY, -1), false), addLocalDays(TODAY, -2), false);
    expect(r.checkIn).toBeUndefined();
  });
});
describe('the chosen pace and the goal date', () => {
  it('the coach uses the pace chosen on the maintenance card; without one, −0.4 kg toward a lower goal as before', () => {
    const h = health();
    expect(coachCheckIn(h, emptyHealthCoach(), TODAY).suggestion?.paceKg).toBe(-0.4);
    const prefs = coachPrefsOf(JSON.stringify(foodPlusSchema.parse({version: 1, pace: -0.25})));
    expect(prefs.paceKg).toBe(-0.25);
    const c = coachCheckIn(h, emptyHealthCoach(), TODAY, 'kg', prefs);
    expect(c.suggestion?.paceKg).toBe(-0.25);
    expect(c.eta!.byPace).toEqual({weeklyGrams: -250, date: expect.any(String), chosen: true});
    expect(c.eta!.byTrend!.date! > TODAY).toBe(true);
  });
  it('goalDate: the day the gap closes at a weekly change; none when moving away or no change', () => {
    expect(goalDate(73_000, 72_000, -250, TODAY)).toBe(addLocalDays(TODAY, 28));
    expect(goalDate(73_000, 72_000, 250, TODAY)).toBeNull();
    expect(goalDate(73_000, 72_000, 0, TODAY)).toBeNull();
    expect(goalDate(72_050, 72_000, -250, TODAY)).toBe(TODAY);
    expect(goalDate(null, 72_000, -250, TODAY)).toBeNull();
    expect(goalDate(120_000, 60_000, -50, TODAY)).toBeNull(); // more than ten years away
  });
  it('the schema-free reader never throws and takes only what it can read', () => {
    expect(coachPrefsOf('{')).toEqual({checkInWeekday: null, partialDays: new Set(), paceKg: null});
    expect(coachPrefsOf(JSON.stringify({version: 1, checkIn: {weekday: 9, partial: ['2026-10-01', 'x']}, pace: 3}))).toEqual({checkInWeekday: null, partialDays: new Set(['2026-10-01']), paceKg: null});
  });
});
