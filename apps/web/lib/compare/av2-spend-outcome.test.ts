import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitCount, type HabitData, type HabitInput} from '../habits';
import {addLocalDays} from '../local-date';
import {CROSS_MIN_PER_SIDE} from '../insights/cross-pillar';
import {FORBIDDEN_INSIGHT_WORDS} from '../insights/engine';
import {compare, gapOf, isSpendOutcome, outcomeLabel, outcomeOptions, outcomeText, spendOutcomes, type CompareSources} from './engine';
import type {MoneyEntry} from '../money-log/schema';

/**
 * Session AV lane 2, round 3 (money; PocketGuard's Financial Wellness, LEDGER #296): the day's spending (all, or one
 * category) as a Compare outcome, by Wealth → Spending's own sums, under Compare's rules unchanged: a day with nothing in
 * the log is unknown, today is open, 14 days a side before a number, never a cause.
 */
const TODAY = '2026-10-31', HABIT = '92000000-0000-4000-8000-000000000601';
const INPUT: HabitInput = {title: 'Walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1};
const e = (date: string, amount: string, category = 'Fun', over: Partial<MoneyEntry> = {}): MoneyEntry => ({id: `${date}-${amount}-${category}`, kind: 'expense', amount, currency: 'EUR', category, date, createdAt: `${date}T12:00:00.000Z`, ...over});
/** `n` days ending yesterday: "Walk" done on even days; €10 spent on even days, €30 on odd ones (plus noise left out). */
function sources(n: number): CompareSources {
  const start = addLocalDays(TODAY, -n);
  let habits: HabitData = createHabit(emptyHabitData(), INPUT, new Date(`${addLocalDays(start, -1)}T08:00:00Z`), HABIT);
  const entries: MoneyEntry[] = [];
  for (let i = 0; i < n; i++) {
    const day = addLocalDays(start, i), even = i % 2 === 0;
    if (even) habits = logHabitCount(habits, HABIT, day, 1, '', new Date(`${day}T20:00:00Z`));
    entries.push(e(day, even ? '10.00' : '30.00', even ? 'Groceries' : 'Fun'));
    entries.push(e(day, '500.00', 'Fun', {id: `${day}-x`, excluded: true})); // left out of the figures: never counted
    if (i % 5 === 0) entries.push(e(day, '40.00', 'Fun', {id: `${day}-s`, share: '0.01'})); // a shared cost: my share only
  }
  return {habits, money: {entries}};
}

describe('the day’s spending as a Compare outcome', () => {
  test('offered from the money log: all spending in its main currency, then its categories', () => {
    expect(outcomeOptions({})).toEqual([]);
    const src = sources(40);
    expect(spendOutcomes(src).map(o => o.id)).toEqual(['spend:EUR', 'spend:EUR:Fun', 'spend:EUR:Groceries']);
    expect(outcomeOptions(src).map(o => o.id)).toEqual(['habits', 'spend:EUR', 'spend:EUR:Fun', 'spend:EUR:Groceries']);
    expect(outcomeLabel('spend:EUR')).toBe('Spent that day (EUR)'); expect(outcomeLabel('spend:EUR:Fun')).toBe('Spent on Fun (EUR)');
    expect(isSpendOutcome('spend:EUR:' + 'x'.repeat(30))).toBe(true); expect(isSpendOutcome('spend:eur')).toBe(false);
    expect(outcomeText('spend:EUR', 12.4)).toBe('€12.40');
  });
  test('a done habit beside what was spent that day: Wealth → Spending’s figures, the counts and the words', () => {
    const r = compare(sources(40), `habit:${HABIT}`, 'spend:EUR', 'same', TODAY)!;
    expect(r).toMatchObject({state: 'ready', withDays: 20, withoutDays: 20});
    // the €40 shared costs count €0.01 each (on 4 of the 20 days of each side); the €500 left out never counts
    expect(r.withValue).toBeCloseTo(10 + 0.04 / 20, 6);
    expect(r.withoutValue).toBeCloseTo(30 + 0.04 / 20, 6);
    expect(r.sentence).toBe('On days you completed “Walk”, you spent €10.00 that day on average; on other days, €30.00.');
    expect(FORBIDDEN_INSIGHT_WORDS.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(r.sentence!))).toEqual([]);
    expect(gapOf('spend:EUR', sources(40))).toBeGreaterThanOrEqual(1);
  });
  test('one category: a logged day without it counts 0; a day with nothing logged is unknown', () => {
    const r = compare(sources(40), `habit:${HABIT}`, 'spend:EUR:Groceries', 'same', TODAY)!;
    expect(r).toMatchObject({withValue: 10, withoutValue: 0});
    const sparse = sources(40), gone = new Set(Array.from({length: 40}, (_, i) => addLocalDays(TODAY, i - 40)).filter((_, i) => i % 4 === 1)); sparse.money = {entries: sparse.money!.entries.filter(x => !gone.has(x.date))};
    const s = compare(sparse, `habit:${HABIT}`, 'spend:EUR', 'same', TODAY)!;
    expect(s.withDays + s.withoutDays).toBe(30); // the 10 days with nothing logged are left out, never counted as zero
  });
  test('Compare’s rules unchanged: fewer than 14 days a side shows no number; next day pairs each day with the one after', () => {
    const r = compare(sources(20), `habit:${HABIT}`, 'spend:EUR', 'same', TODAY)!;
    expect(r).toMatchObject({state: 'pending', withValue: null, need: CROSS_MIN_PER_SIDE});
    const next = compare(sources(40), `habit:${HABIT}`, 'spend:EUR', 'next', TODAY)!;
    expect(next.withValue).toBeCloseTo(30 + 0.04 / 20, 6);
    expect(next.sentence).toContain('the next day on average');
  });
});
