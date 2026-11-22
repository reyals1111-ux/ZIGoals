import {describe, expect, test} from 'vitest';
import {moneyWakes} from './money-notices';
import {loanWakes} from './money-more/people';
import {checkPortfolioMoves, portfolioMoveLine} from './price-alerts/moves';
import {neededIn} from './budgets/assign';
import {repeatProjectName} from './tasks/repeat-projects';
import type {CurrencyForecast} from './cash-forecast/model';
import type {MoneyEntry} from './money-log/schema';

/**
 * Session AV lane 2 (review b2a #7): batch 2's new money and day words go through the app's formatters — "€12.30", never
 * "EUR 12.30"; "Nov 26, 2026", never "2026-11-26" — in the device notices, the loan reminders, the portfolio move
 * alerts, a budget's target words and a repeating project's name. (Tests run in the display locale en-US.)
 */
const TODAY = '2026-11-14';
const forecast = (points: [string, number][]): CurrencyForecast => ({currency: 'EUR', known: true, startCents: BigInt(points[0]![1]), oldestBalance: TODAY, missingBalances: 0, points: points.map(([date, c]) => ({date, mid: BigInt(c)})), lowest: {date: points[0]![0], cents: BigInt(points[0]![1])}, lowestLow: null, events: [], everyday: {source: 'none', days: 0, outCents: 0n, inCents: 0n}, range: false});

describe('the app’s formatters in batch 2’s words', () => {
  test('device notices: over a budget, payday and the low line', () => {
    const e = (id: string, date: string, amount: string): MoneyEntry => ({id, kind: 'expense', amount, currency: 'EUR', category: 'Groceries', date, createdAt: `${date}T10:00:00.000Z`});
    const budgets = {version: 1 as const, budgets: [{id: 'g', category: 'Groceries', currency: 'EUR', monthly: '100.00', rollover: false, since: '2026-11'}]};
    const over = moneyWakes({entries: [e('a', '2026-11-12', '95.00'), e('b', '2026-11-13', '17.30')], budgets, rows: [], today: TODAY});
    expect(over).toContainEqual(expect.objectContaining({title: 'Groceries is over its budget', detail: '€12.30 over'}));
    const low = moneyWakes({entries: [], rows: [forecast([['2026-11-14', 80000], ['2026-11-26', 15000]])], line: {amount: '200.00', currency: 'EUR'}, today: TODAY});
    expect(low.map(w => w.detail)).toEqual(['below €200.00 around Nov 26, 2026', 'below €200.00 around Nov 26, 2026']);
    for (const w of [...over, ...low]) expect(`${w.title} ${w.detail ?? ''}`).not.toMatch(/EUR \d|\d{4}-\d{2}-\d{2}/);
  });
  test('a loan reminder, a portfolio move, a target and a repeating project', () => {
    const more = {version: 1 as const, loans: [{id: 'l1', kind: 'lent' as const, name: 'Noor', amount: '1234.50', currency: 'EUR', date: '2026-11-01', due: '2026-11-15', remind: true as const}]};
    expect(loanWakes(more, TODAY).map(w => w.detail)).toEqual(['€1,234.50 left', '€1,234.50 left']);
    const alert = {id: 'pm1', portfolioId: 'p1', portfolioName: 'Long term', currency: 'EUR' as const, base: '10000', percent: 10, direction: 'down' as const, active: true, createdAt: `${TODAY}T09:00:00.000Z`};
    expect(portfolioMoveLine(alert)).toBe('Long term worth 10% down from €10,000.00');
    expect(checkPortfolioMoves({version: 1, alerts: [], fired: [], portfolioMoves: [alert]} as never, () => '8900.4', `${TODAY}T10:00:00.000Z`).fired[0]!.text).toBe('Long term is worth -11% from €10,000.00: €8,900.40 now.');
    const b = {id: 'i', category: 'Insurance', currency: 'EUR', monthly: '50.00', rollover: true, since: '2026-11', need: {kind: 'yearly' as const, amount: '600.00', month: '2027-03'}};
    expect(neededIn(b, {carried: 0}, '2026-11')!.words).toBe('€600.00 by Mar 2027, 5 months left');
    expect(neededIn({...b, need: undefined}, {carried: 0, target: {amount: 30000, by: '2026-12', setAside: 0, toGo: 30000, perMonth: 15000, monthsLeft: 2, state: 'on-track', short: 0}}, '2026-11')!.words).toBe('towards €300.00 by Dec 2026');
    expect(repeatProjectName({name: 'Weekly reset'}, '2026-11-30')).toBe('Weekly reset · Nov 30, 2026');
    expect(repeatProjectName({name: 'A'.repeat(60)}, '2026-11-30').length).toBeLessThanOrEqual(55);
  });
});
