import {describe, expect, it} from 'vitest';
import {createEmptyHealth, healthSchema, type HealthDiaryEntry} from '../health';
import {challengeWeek, mondayOf, startChallenge, stopChallenge} from './challenge';
import {emptyFoodPlus} from './schema';

/** Session AV lane 2 (food, LEDGER #90; MyFitnessPal's challenges): a weekly logging challenge you set yourself. */
const entry = (date: string, n = 1): HealthDiaryEntry => ({id: `health_diary-ch-${date.replace(/-/g, '')}-${n}`, sourceId: 'health_food-fict-001', sourceKind: 'food', snapshot: {name: 'Fictional soup', servingGrams: 300, nutrients: {kcal: 200, proteinMg: null, carbsMg: null, fatMg: null}}, date, meal: 'Lunch', quantityMilli: 1000, createdAt: `${date}T12:00:00.000Z`, updatedAt: `${date}T12:00:00.000Z`});
const health = (dates: string[]) => healthSchema.parse({...createEmptyHealth(), diary: dates.flatMap(d => [entry(d), entry(d, 2)])});
describe('the weekly logging challenge', () => {
  it('starts on the week\'s Monday; 1 to 7 days; stopping keeps the diary', () => {
    expect(mondayOf('2026-11-22')).toBe('2026-11-16');
    expect(mondayOf('2026-11-23')).toBe('2026-11-23');
    const r = startChallenge(emptyFoodPlus(), 5, '2026-11-25');
    expect(r.challenge).toEqual({daysPerWeek: 5, since: '2026-11-23'});
    expect(startChallenge(r, 5, '2026-12-09').challenge!.since).toBe('2026-11-23');
    expect(startChallenge(r, 4, '2026-12-09').challenge).toEqual({daysPerWeek: 4, since: '2026-12-07'});
    expect(() => startChallenge(r, 8, '2026-11-25')).toThrow('Choose 1 to 7 days a week.');
    expect(stopChallenge(r).challenge).toBeUndefined();
    expect(challengeWeek(health([]), emptyFoodPlus(), '2026-11-25')).toBeNull();
  });
  it('counts the days with an entry this week, what is left, and the weeks met in a row', () => {
    const r = {...emptyFoodPlus(), challenge: {daysPerWeek: 3, since: '2026-11-09'}};
    // Week of 9 Nov: 3 days (met); week of 16 Nov: 3 days (met); this week (23 Nov): Monday and Tuesday so far.
    const h = health(['2026-11-09', '2026-11-10', '2026-11-12', '2026-11-16', '2026-11-18', '2026-11-22', '2026-11-23', '2026-11-24']);
    const w = challengeWeek(h, r, '2026-11-25')!;
    expect([w.logged, w.met, w.daysLeft, w.reachable, w.loggedToday]).toEqual([2, false, 5, true, false]);
    expect([w.weeksInRow, w.weeksMet, w.weeksTotal]).toEqual([2, 2, 3]);
    expect(w.days.map(d => d.logged)).toEqual([true, true, false, false, false, false, false]);
    const met = challengeWeek(health(['2026-11-23', '2026-11-24', '2026-11-25']), {...r, challenge: {daysPerWeek: 3, since: '2026-11-23'}}, '2026-11-25')!;
    expect([met.met, met.weeksInRow, met.weeksTotal]).toEqual([true, 1, 1]);
    const late = challengeWeek(health(['2026-11-23']), {...r, challenge: {daysPerWeek: 7, since: '2026-11-23'}}, '2026-11-28')!;
    expect([late.reachable, late.daysLeft]).toEqual([false, 2]);
  });
});
