import {describe, expect, it} from 'vitest';
import {createEmptyHealth, saveWeight, setHealthTargets, type HealthData} from '../../health';
import {dailyData, saveHealthPreferences} from '../../health-daily';
import {addLocalDays} from '../../local-date';
import {asOfWords, logDayWords, rangeOf, weightCard, weightRows} from './weight';

/** Session AM (ADR-038): the Weight widget's figures. Fictional readings; the display locale is the default (en-US). */
const DAY = '2026-11-11', AT = '2026-11-11T12:00:00.000Z';
const hid = (n: number) => `health_00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let n = 0;
const weigh = (d: HealthData, offset: number, grams: number) => saveWeight(d, {id: hid(++n), date: addLocalDays(DAY, offset), grams}, AT);
const withGoal = (d: HealthData, grams: number | null) => setHealthTargets(d, {...d.targets, weightGrams: grams});

describe('the range and the as-of words', () => {
  it('a range ends on the day and covers its own number of days; month is the default', () => {
    expect(rangeOf(undefined, DAY)).toMatchObject({range: 'month', days: 30, from: '2026-10-13', to: DAY, words: 'the last 30 days'});
    expect(rangeOf('week', DAY)).toMatchObject({days: 7, from: '2026-11-05'});
    expect(rangeOf('year', DAY)).toMatchObject({days: 365, from: '2025-11-12', words: 'the last 12 months'});
    expect(rangeOf('decade' as never, DAY, 'week').range).toBe('week');
  });
  it('a log\'s day in words: today, yesterday, a date, and its year when that is another year', () => {
    expect(logDayWords(DAY, DAY)).toBe('today');
    expect(logDayWords('2026-11-10', DAY)).toBe('yesterday');
    expect(logDayWords('2026-11-09', DAY)).toBe('Nov 9');
    expect(logDayWords('2025-11-09', DAY)).toBe('Nov 9, 2025');
    expect(asOfWords('2026-11-09', DAY)).toBe('latest log Nov 9');
    expect(asOfWords(null, DAY)).toBeNull();
  });
});

describe('weightCard', () => {
  it('nothing logged: no hero, no change, every day a gap, no zero anywhere', () => {
    const card = weightCard(createEmptyHealth(), DAY);
    expect(card.latest).toBeNull(); expect(card.hero).toBeNull(); expect(card.change).toBeNull(); expect(card.note).toBeNull();
    expect(card.values).toHaveLength(30); expect(card.values.every(v => v === null)).toBe(true);
    expect(card.lowest).toBeNull(); expect(card.average).toBeNull(); expect(card.asOf).toBeNull();
    expect(card.logged).toMatchObject({days: 0, of: 30, hearts: {of: 10, filled: 0}});
    expect(weightRows(card, DAY)).toEqual([]);
  });
  it('one reading: the hero and its date, no change (and why), the line has one point', () => {
    const card = weightCard(weigh(createEmptyHealth(), -2, 76_800), DAY);
    expect(card.hero).toEqual({value: '76.8', unit: 'kg'});
    expect(card.latest).toMatchObject({date: '2026-11-09', text: '76.8 kg'});
    expect(card.change).toBeNull();
    expect(card.note).toBe('One weigh-in in the last 30 days');
    expect(card.values.filter(v => v !== null)).toEqual([76_800]);
    expect(card.edges.dates).toBeNull();
    expect(card.asOf).toBe('latest log Nov 9');
    expect(card.logged.text).toBe('1 of 30 days logged');
  });
  it('a range: the change since the first log in it, lowest, highest, average, gaps kept as gaps', () => {
    let d = createEmptyHealth();
    d = weigh(d, -29, 78_000); d = weigh(d, -20, 78_400); d = weigh(d, -10, 77_100); d = weigh(d, 0, 76_800);
    const card = weightCard(d, DAY, 'month');
    expect(card.values).toHaveLength(30);
    expect(card.values[0]).toBe(78_000); expect(card.values[1]).toBeNull(); expect(card.values.at(-1)).toBe(76_800);
    expect(card.values.filter(v => v === null)).toHaveLength(26);
    expect(card.change).toMatchObject({grams: -1200, direction: 'down', text: 'down 1.2 kg since Oct 13', good: null});
    expect(card.lowest?.text).toBe('76.8 kg'); expect(card.highest).toMatchObject({text: '78.4 kg', date: '2026-10-22'});
    expect(card.average?.text).toBe('77.6 kg');
    expect(card.edges).toEqual({min: '76.8 kg', max: '78.4 kg', dates: ['Oct 13', 'Today']});
    expect(card.logged.hearts.filled).toBeCloseTo(4 / 30 * 10);
    expect(card.asOf).toBe('latest log today');
    const rows = Object.fromEntries(weightRows(card, DAY));
    expect(rows['Latest weigh-in']).toBe('76.8 kg, today');
    expect(rows['Change in the last 30 days']).toBe('down 1.2 kg since Oct 13');
    expect(rows['Your weight goal']).toBe('Not set');
    expect(rows['Days logged']).toBe('4 of 30 days logged');
  });
  it('down is only good with a weight goal below; up is good toward a goal above; the goal is the line', () => {
    let d = createEmptyHealth();
    d = weigh(d, -6, 78_000); d = weigh(d, 0, 77_000);
    expect(weightCard(d, DAY).change?.good).toBeNull();
    const lose = weightCard(withGoal(d, 72_000), DAY);
    expect(lose.change).toMatchObject({direction: 'down', good: true}); expect(lose.target).toEqual({grams: 72_000, text: '72 kg'});
    expect(lose.edges.min).toBeUndefined(); expect(lose.edges.max).toBe('78 kg');
    const gain = weightCard(withGoal(d, 82_000), DAY);
    expect(gain.change).toMatchObject({direction: 'down', good: false}); expect(gain.edges.max).toBeUndefined();
    expect(Object.fromEntries(weightRows(gain, DAY))['Change in the last 30 days']).toBe('down 1 kg since Nov 5 (away from your weight goal)');
    let up = createEmptyHealth(); up = weigh(up, -6, 60_000); up = weigh(up, 0, 61_500);
    expect(weightCard(withGoal(up, 65_000), DAY).change).toMatchObject({direction: 'up', text: 'up 1.5 kg since Nov 5', good: true});
    // As far past the goal as it was short of it: neither nearer nor farther.
    let past = createEmptyHealth(); past = weigh(past, -6, 71_000); past = weigh(past, 0, 69_000);
    expect(weightCard(withGoal(past, 70_000), DAY).change?.good).toBeNull();
  });
  it('a change too small to write reads as no change, with no judgement', () => {
    let d = createEmptyHealth(); d = weigh(d, -3, 70_000); d = weigh(d, 0, 70_020);
    expect(weightCard(withGoal(d, 65_000), DAY).change).toMatchObject({direction: 'flat', text: 'no change since Nov 8', good: null});
  });
  it('readings outside the range are not in it; the hero is still the latest reading there is, with its date', () => {
    let d = createEmptyHealth(); d = weigh(d, -40, 80_000); d = weigh(d, -12, 79_000);
    const week = weightCard(d, DAY, 'week');
    expect(week.values).toHaveLength(7); expect(week.readings).toHaveLength(0);
    expect(week.hero).toEqual({value: '79', unit: 'kg'}); expect(week.note).toBe('No weigh-ins in the last 7 days');
    expect(week.logged.hearts).toEqual({of: 7, filled: 0}); expect(week.asOf).toBe('latest log Oct 30');
    const quarter = weightCard(d, DAY, 'quarter');
    expect(quarter.values).toHaveLength(90); expect(quarter.change?.text).toBe('down 1 kg since Oct 2');
    // A reading logged for a later day is not today's figure.
    expect(weightCard(weigh(d, 3, 50_000), DAY).latest?.grams).toBe(79_000);
  });
  it('pounds: every figure in the person\'s unit, readings at their own precision', () => {
    let d = createEmptyHealth(); d = weigh(d, -7, 81_647); d = weigh(d, 0, 80_830);
    d = saveHealthPreferences(withGoal(d, 77_111), {...dailyData(d).preferences, weightUnit: 'lb'});
    const card = weightCard(d, DAY);
    expect(card.unit).toBe('lb'); expect(card.hero).toEqual({value: '178.2', unit: 'lb'});
    expect(card.change?.text).toBe('down 1.8 lb since Nov 4'); expect(card.target?.text).toBe('170 lb');
    expect(card.highest?.text).toBe('180 lb');
    // A reading with a hundredth keeps it; the average follows the readings' precision.
    let k = createEmptyHealth(); k = weigh(k, -1, 70_550); k = weigh(k, 0, 70_450);
    const fine = weightCard(k, DAY);
    expect(fine.hero).toEqual({value: '70.45', unit: 'kg'}); expect(fine.average?.text).toBe('70.5 kg');
  });
});
