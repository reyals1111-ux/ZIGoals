import {expect, test} from 'vitest';
import {accountsSchema, emptyAccounts} from '../../../accounts/schema';
import {budgetsSchema} from '../../../budgets/schema';
import {moneyLogSchema} from '../../../money-log/schema';
import {emptyNetworthHistory, networthHistorySchema} from '../../../networth-history';
import {buildShowcase} from '../../../showcase-data';
import {widgetPeriod} from './calendar';
import {budgetGauges, debtRanks, netWorthRiver} from './money-worth';

/** Session AS (ADR-042 Part 2, Wealth): debts, the recorded net worth and the budgets as their pages state them (the Showcase on 17 November 2026). */
const DAY = '2026-11-17', R = buildShowcase(DAY, 'UTC').records, read = (key: string) => JSON.parse(R[key]!);
const accounts = accountsSchema.parse(read('zigoals:accounts:v1')), history = networthHistorySchema.parse(read('zigoals:networth-history:v1'));
const budgets = budgetsSchema.parse(read('zigoals:budgets:v1')), log = moneyLogSchema.parse(read('zigoals:money-log:v1')).entries;

test('debts by balance: the accounts kept as debts, the largest first, in their own currency', () => {
  const debts = debtRanks(accounts, DAY);
  expect(debts).toMatchObject({state: 'live', currency: 'USD', totalCents: 755100, total: '$7,551.00', count: 2, max: 691100, noBalance: [], others: [], lastDate: DAY});
  expect(debts.rows.map(r => [r.label, r.text, r.percent])).toEqual([['Car loan', '$6,911.00', '92%'], ['Credit card', '$640.00', '8%']]);
  // A debt with no balance yet is unknown, never a zero; without any debt there is no figure.
  const blank = {...accounts, items: accounts.items.map(a => a.kind === 'credit-card' ? {...a, snapshots: []} : a)};
  expect(debtRanks(blank, DAY)).toMatchObject({total: '$6,911.00', noBalance: ['Credit card']}); expect(debtRanks(blank, DAY).rows).toHaveLength(1);
  expect(debtRanks({...accounts, items: accounts.items.filter(a => a.kind === 'cash')}, DAY).state).toBe('empty');
  expect(debtRanks(emptyAccounts(), DAY)).toMatchObject({state: 'empty', rows: [], currency: null});
});
test('the recorded net worth as a river: the last 90 days, the change from the first to the last recorded day, gaps kept as gaps', () => {
  const river = netWorthRiver(history, widgetPeriod('last-90-days', DAY), DAY);
  expect(river).toMatchObject({state: 'live', currency: 'USD', otherCurrencies: ['EUR'], recorded: 57, notRecorded: 11, unknownDays: 0, since: '2026-09-11'});
  expect(river.latest).toMatchObject({day: DAY, cents: 51641400n});
  expect(river.change).toEqual({cents: 4041900n, direction: 'up', since: '2026-09-11', percent: 8.491});
  expect(river.high).toEqual({day: '2026-11-15', cents: 52410000n}); expect(river.low).toEqual({day: '2026-09-16', cents: 47208000n});
  expect(river.days).toHaveLength(68); expect(river.days[0]).toEqual({day: '2026-09-11', value: 475995}); expect(river.days.at(-1)).toEqual({day: DAY, value: 516414});
  expect(river.days.filter(d => d.value === null).map(d => d.day)).toEqual(['2026-09-17', '2026-09-25', '2026-10-03', '2026-10-11', '2026-10-19', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-11-04', '2026-11-12']);
  const week = netWorthRiver(history, widgetPeriod('this-week', DAY), DAY);
  expect(week).toMatchObject({recorded: 2, notRecorded: 0}); expect(week.change).toMatchObject({cents: -474300n, direction: 'down', since: '2026-11-16'});
  expect(netWorthRiver(history, widgetPeriod('month:2026-08', DAY), DAY)).toMatchObject({state: 'quiet', days: [], change: null, latest: null});
  expect(netWorthRiver(emptyNetworthHistory(), widgetPeriod('last-90-days', DAY), DAY)).toMatchObject({state: 'empty', days: [], currency: null});
});
test('each budget as a gauge: spent of available this month, and over said in words', () => {
  const view = budgetGauges(budgets, log, DAY);
  expect(view).toMatchObject({state: 'live', month: '2026-11', within: 3, count: 3, daysLeft: 14, over: []});
  expect(view.gauges.map(g => [g.label, g.percent, g.spent, g.available, g.words])).toEqual([['Groceries', '75%', '€187.10', '€250.00', '€62.90 left'], ['Food & drink', '41%', '€49.10', '€120.00', '€70.90 left'], ['Fun', '40%', '€24.00', '€60.00', '€36.00 left']]);
  const more = [...log, {id: 'z', kind: 'expense' as const, amount: '50.00', currency: 'EUR', category: 'Fun', date: '2026-11-15', createdAt: '2026-11-15T10:00:00.000Z'}];
  const over = budgetGauges(budgets, more, DAY);
  expect(over).toMatchObject({within: 2}); expect(over.gauges[0]).toMatchObject({label: 'Fun', over: true, percent: '123%', words: 'over by €14.00'});
  expect(budgetGauges({version: 1, budgets: []}, log, DAY)).toMatchObject({state: 'empty', gauges: [], count: 0});
});
