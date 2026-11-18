import {expect, test} from 'vitest';
import {moneyLogSchema} from '../../../money-log/schema';
import {buildShowcase} from '../../../showcase-data';
import {calendarOf, calendarWords, widgetPeriod} from './calendar';
import {axPlain, cashRiver, categoryRanks, savingsRate, spendTrack, spendingCompare, spendingHeat, spendingRadar} from './money-spend';

/** Session AS (ADR-042 Part 2, Wealth): the money-log answer widgets count what the exact answers state (the Showcase on 17 November 2026). */
const DAY = '2026-11-17', log = moneyLogSchema.parse(JSON.parse(buildShowcase(DAY, 'UTC').records['zigoals:money-log:v1']!)).entries;
const P = (token: string) => widgetPeriod(token, DAY);

test('ranked bars: November’s spending by category, each with its share in whole percents; income by category', () => {
  const spent = categoryRanks(log, 'expense', P('this-month'));
  expect(spent).toMatchObject({state: 'live', currency: 'EUR', totalCents: 43559, total: '€435.59', entries: 14, max: 18710, others: [], lastDate: '2026-11-17'});
  expect(spent.rows.map(r => [r.label, r.text, r.percent])).toEqual([['Groceries', '€187.10', '43%'], ['Bills', '€120.00', '28%'], ['Food & drink', '€49.10', '11%'], ['Shopping', '€35.00', '8%'], ['Fun', '€24.00', '6%'], ['Transport', '€10.40', '2%'], ['Subscriptions', '€9.99', '2%']]);
  const income = categoryRanks(log, 'income', P('this-month'));
  expect(income).toMatchObject({state: 'live', total: '€2,550.00', entries: 2, lastDate: '2026-11-14'});
  expect(income.rows.map(r => [r.label, r.text, r.percent])).toEqual([['Salary', '€2,400.00', '94%'], ['Freelance', '€150.00', '6%']]);
  // A period with nothing logged is quiet, never a zero; a log with nothing of the kind is empty.
  expect(categoryRanks(log, 'expense', P('month:2026-09'))).toMatchObject({state: 'quiet', rows: [], total: '—', lastDate: '2026-11-17'});
  expect(categoryRanks([], 'expense', P('this-month'))).toMatchObject({state: 'empty', rows: [], currency: null});
  expect(axPlain('Rent · SHOWCASE DATA')).toBe('Rent'); expect(axPlain('Groceries')).toBe('Groceries');
});
test('currencies are never added: the larger leads and the other is named beside it', () => {
  const mixed = [...log, {id: 'x', kind: 'expense' as const, amount: '20.00', currency: 'USD', category: 'Travel', date: '2026-11-10', createdAt: '2026-11-10T10:00:00.000Z'}];
  const spent = categoryRanks(mixed, 'expense', P('this-month'));
  expect(spent).toMatchObject({currency: 'EUR', total: '€435.59', others: [{currency: 'USD', text: '$20.00'}]});
  expect(spent.rows.some(r => r.label === 'Travel')).toBe(false);
  expect(cashRiver(mixed, P('this-month'))).toMatchObject({currency: 'EUR', spending: '€435.59', others: ['USD']});
  expect(spendingHeat(mixed, DAY)).toMatchObject({total: '€611.99', others: ['USD']});
});
test('the radar: at most eight spokes with the rest as Other; the period before is unknown when nothing was logged in it', () => {
  const month = spendingRadar(log, P('this-month'), DAY);
  expect(month).toMatchObject({state: 'live', total: '€435.59', beforeCents: null, beforeTotal: null, folded: 0, max: 18710});
  expect(month.spokes).toHaveLength(7); expect(month.spokes.every(s => s.before === null)).toBe(true);
  const thirty = spendingRadar(log, P('last-30-days'), DAY);
  expect(thirty).toMatchObject({total: '€570.79', beforeCents: 4120, beforeTotal: '€41.20', folded: 2, max: 22680});
  expect(thirty.spokes.map(s => s.label)).toEqual(['Groceries', 'Bills', 'Food & drink', 'Gifts', 'Shopping', 'Fun', 'Health', 'Other']);
  expect(thirty.spokes[0]).toMatchObject({nowText: '€226.80', beforeText: '€41.20', percent: '40%'});
  expect(thirty.spokes.at(-1)).toMatchObject({now: 2039, nowText: '€20.39', before: 0});
  expect(thirty.before).toMatchObject({from: '2026-09-19', to: '2026-10-18'});
  expect(spendingRadar([], P('this-month'), DAY)).toMatchObject({state: 'empty', spokes: []});
});
test('twins: a period beside the one before, the difference in words; an unlogged side is unknown', () => {
  expect(spendingCompare(log, 'expense', P('last-30-days'), DAY)).toMatchObject({state: 'live', now: '€570.79', was: '€41.20', beforeWords: 'Sep 19 – Oct 18', diffCents: 52959, delta: '€529.59 more than the period before'});
  expect(spendingCompare(log, 'expense', P('this-week'), DAY)).toMatchObject({now: '€55.60', was: '€56.10', beforeWords: 'Nov 9 – Nov 10', delta: '€0.50 less than the period before'});
  expect(spendingCompare(log, 'expense', P('this-month'), DAY)).toMatchObject({nowCents: 43559, beforeCents: null, was: 'nothing logged', diffCents: null, delta: 'Nothing logged the period before, so no difference to state'});
  expect(spendingCompare(log, 'income', P('this-month'), DAY)).toMatchObject({kind: 'income', now: '€2,550.00', beforeCents: null});
  expect(spendingCompare(log, 'expense', P('month:2026-08'), DAY).state).toBe('quiet');
  expect(spendingCompare([], 'expense', P('this-month'), DAY)).toMatchObject({state: 'empty', nowCents: null, currency: null});
});
test('the share of income not spent is a figure from the log; without income it says so', () => {
  expect(savingsRate(log, P('this-month'))).toMatchObject({state: 'live', income: '€2,550.00', spending: '€435.59', keptCents: 211441, kept: '€2,114.41', rate: 83, percent: '83%'});
  expect(savingsRate(log, P('month:2026-10'))).toMatchObject({state: 'no-income', rate: null, percent: '—', income: 'nothing logged', spending: '€176.40'});
  expect(savingsRate(log.filter(e => e.kind === 'income'), P('this-month'))).toMatchObject({state: 'no-spending', rate: null, income: '€2,550.00', spending: 'nothing logged'});
  const more = [...log, {id: 'y', kind: 'expense' as const, amount: '3000.00', currency: 'EUR', category: 'Home', date: '2026-11-11', createdAt: '2026-11-11T10:00:00.000Z'}];
  expect(savingsRate(more, P('this-month'))).toMatchObject({keptCents: -88559, kept: '€885.59', rate: -35});
  expect(savingsRate([], P('this-month'))).toMatchObject({state: 'empty', rate: null});
});
test('the days with spending as a calendar track: 12 past days lit in November, €51.40 on the 16th, today still open', () => {
  const track = spendTrack(log, DAY, 'EUR'), view = calendarOf(track, P('this-month'), DAY, 'done');
  expect(view.lit).toEqual(['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16']);
  const of = (date: string) => view.weeks.flat().find(c => c.date === date)!;
  expect(of('2026-11-16')).toMatchObject({state: 'done', value: 5140}); expect(of('2026-11-04')).toMatchObject({state: 'none', value: null}); expect(of('2026-11-17')).toMatchObject({state: 'open', today: true, value: 420});
  expect(track.measure!.text(5140, 'en')).toBe('€51.40');
  expect(calendarWords(view, track, 'done', DAY)).toMatchObject({figure: '12', unit: 'days', label: 'spent · this month', note: 'Spending · 12 of 16 days'});
  expect(calendarOf(spendTrack([], DAY, null), P('this-month'), DAY, 'done').lit).toEqual([]);
});
test('heat: thirteen weeks ending this week, a cell a day, lit by the amount; a day with nothing logged is unlit', () => {
  const heat = spendingHeat(log, DAY);
  expect(heat).toMatchObject({state: 'live', from: '2026-08-24', to: DAY, total: '€611.99', daysWith: 18, days: 86, peak: {date: '2026-11-08', text: '€120.00'}});
  expect(heat.weeks).toHaveLength(13); expect(heat.weeks.every(w => w.length === 7)).toBe(true);
  expect(heat.weeks.at(-1)!.map(c => `${c.level}${c.ahead ? 'a' : ''}`)).toEqual(['2', '1', '0a', '0a', '0a', '0a', '0a']);
  const cell = (date: string) => heat.weeks.flat().find(c => c.date === date)!;
  expect(cell('2026-11-08')).toMatchObject({cents: 12000, level: 4, words: 'Sun, Nov 8: €120.00'}); expect(cell('2026-11-04')).toMatchObject({cents: null, level: 0, words: 'Wed, Nov 4: nothing logged'});
  expect(heat.months).toEqual([{week: 0, label: 'Aug'}, {week: 1, label: 'Sep'}, {week: 5, label: 'Oct'}, {week: 9, label: 'Nov'}]);
  expect(spendingHeat([], DAY)).toMatchObject({state: 'empty', peak: null, daysWith: 0, total: '—'});
});
test('the river: income and spending per day, week or month, and the gap between them in words', () => {
  const month = cashRiver(log, P('this-month'));
  expect(month).toMatchObject({state: 'live', step: 'day', income: '€2,550.00', spending: '€435.59', netCents: 211441, gap: '€2,114.41 more in than out', max: 240000});
  expect(month.buckets).toHaveLength(17);
  expect(month.buckets[15]).toEqual({from: '2026-11-16', to: '2026-11-16', label: 'Nov 16', income: null, spending: 5140}); expect(month.buckets[3]).toMatchObject({income: null, spending: null});
  const quarter = cashRiver(log, P('last-90-days'));
  expect(quarter).toMatchObject({step: 'week', spending: '€611.99', gap: '€1,938.01 more in than out'});
  expect(quarter.buckets).toHaveLength(14); expect(quarter.buckets.at(-2)).toEqual({from: '2026-11-09', to: '2026-11-15', label: 'Nov 9 – Nov 15', income: 240000, spending: 15419});
  const year = cashRiver(log, P('this-year'));
  expect(year.step).toBe('month'); expect(year.buckets.map(b => b.label).slice(-2)).toEqual(['Oct', 'Nov']); expect(year.buckets.at(-2)).toMatchObject({income: null, spending: 17640});
  expect(cashRiver(log, P('month:2026-10'))).toMatchObject({income: 'nothing logged', netCents: null, gap: 'no income logged'});
  expect(cashRiver([], P('this-month'))).toMatchObject({state: 'empty', currency: null, netCents: null});
});
