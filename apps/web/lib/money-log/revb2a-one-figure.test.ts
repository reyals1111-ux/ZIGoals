import {describe, expect, test} from 'vitest';
import {ledger} from '../ai/local-answers/exact/money';
import {resolvePeriod} from '../ai/local-answers/exact/period';
import {cashRiver, categoryRanks, savingsRate, spendTrack, spendingCompare, spendingHeat} from '../nova/cards/ax/money-spend';
import {budgetDayParts, countedCents} from './counted';
import {periodRows, setPeriods, emptyBudgetPeriods} from '../budgets/periods';
import {monthView} from '../budgets/engine';
import {emptyBudgets, type BudgetsRecord} from '../budgets/schema';
import {av2TasksAnswer} from '../ai/local-answers/av2-tasks';
import {novaEnv, showcaseAll} from '../ai/evals/as/harness';
import {challengeStates, payeeRows, yearRecap} from '../money-notices';
import {payeeBudgets} from '../money-more/own-budgets';
import {monthRecap} from '../budgets/recap';
import {averageSpent} from '../budgets/assign';
import {totals} from './engine';
import type {MoneyEntry} from './schema';

/**
 * Review b2a #1–#3 (one month's spending is one figure everywhere): the reviewer's probe month — €10 counted, €50 marked
 * "Not part of my spending", €30 shared with "your share" €10 — is €20 spent in Wealth → Spending (`totals`), and so in
 * NOVA's and ZIGi's exact money answers, NOVA's spending widgets, the pay-period budgets, the payee budgets, the payee
 * watch and the challenges. A card payment matched as a transfer (both sides) and a Settle-up refund (a left-out income
 * entry) are neither spending nor income.
 */
const TODAY = '2026-11-20';
const e = (id: string, amount: string, extra: Partial<MoneyEntry> = {}): MoneyEntry => ({id, kind: 'expense', amount, currency: 'EUR', category: 'Groceries', note: 'Albert Heijn', date: '2026-11-10', createdAt: '2026-11-10T10:00:00.000Z', ...extra});
/** The probe month, a transfer pair (the card's payment out of the current account, and its side on the card) and a refund. */
const PROBE: MoneyEntry[] = [
  e('a', '10.00'), e('b', '50.00', {excluded: true}), e('c', '30.00', {share: '10.00'}),
  e('t1', '200.00', {category: 'Bills', note: 'Card payment', date: '2026-11-12', transfer: 't2'}),
  e('t2', '200.00', {kind: 'income', category: 'Other', note: 'Card payment', date: '2026-11-12', transfer: 't1'}),
  e('r', '20.00', {kind: 'income', category: 'Refund', note: 'Sam paid back · shared costs', date: '2026-11-14', excluded: true}),
  e('s', '1000.00', {kind: 'income', category: 'Salary', note: 'Work', date: '2026-11-01'}),
];
const month = resolvePeriod('this-month', TODAY)!;

describe('Wealth → Spending is the reference', () => {
  test('the probe month: €20.00 spent, €1,000.00 in (no transfer, no refund)', () => {
    expect(totals(PROBE, '2026-11-01', '2026-11-30')).toEqual([{currency: 'EUR', expenses: 2000, income: 100000, count: 3}]);
    expect(PROBE.map(countedCents)).toEqual([1000, 0, 1000, 0, 0, 0, 100000]);
  });
});
describe('B2A-1: NOVA and ZIGi exact money answers and NOVA’s spending widgets', () => {
  test('ledger: €20.00 spent in two counted entries; €1,000.00 came in', () => {
    const spent = ledger(PROBE, 'expense', month);
    expect(spent.total).toBe(2000); expect(spent.own.map(x => x.id)).toEqual(['a', 'c']);
    expect(ledger(PROBE, 'income', month).total).toBe(100000);
    expect(ledger(PROBE, 'expense', month, 'Bills').currency).toBeNull();
  });
  test('the ranks, the twins and the savings gauge say the same figures', () => {
    expect(categoryRanks(PROBE, 'expense', month)).toMatchObject({totalCents: 2000, total: '€20.00', entries: 2, rows: [{label: 'Groceries', cents: 2000, percent: '100%'}]});
    expect(spendingCompare(PROBE, 'expense', month, TODAY)).toMatchObject({nowCents: 2000});
    expect(savingsRate(PROBE, month)).toMatchObject({incomeCents: 100000, spendingCents: 2000, keptCents: 98000});
  });
  test('the days with spending, the heat and the river count the same €20.00', () => {
    const track = spendTrack(PROBE, TODAY, 'EUR'), days = track.points(['2026-11-10', '2026-11-12', '2026-11-14']);
    expect(days.map(d => [d.date, d.value, d.state])).toEqual([['2026-11-10', 2000, 'done'], ['2026-11-12', null, 'none'], ['2026-11-14', null, 'none']]);
    expect(spendingHeat(PROBE, TODAY)).toMatchObject({totalCents: 2000, daysWith: 1, peak: {date: '2026-11-10', cents: 2000}});
    expect(cashRiver(PROBE, month)).toMatchObject({incomeCents: 100000, spendingCents: 2000, netCents: 98000});
  });
});

const budgets: BudgetsRecord = {...emptyBudgets(), budgets: [
  {id: 'food', category: 'Groceries', currency: 'EUR', monthly: '100.00', rollover: false, since: '2026-01'},
  {id: 'bills', category: 'Bills', currency: 'EUR', monthly: '50.00', rollover: false, since: '2026-01'},
], payees: [{payee: 'Albert Heijn', currency: 'EUR', amount: '100.00'}]};
/** A yearly bill of €120 paid on 31 January, spread over twelve months: €10 a month, on the month's last day. */
const yearly = e('y', '120.00', {category: 'Bills', note: 'Insurance', date: '2026-01-31', spread: 12});
describe('B2A-2: pay-period budgets and ZIGi’s pay-period answer', () => {
  test('a calendar-month period spends what the month budgets spend: €20.00 of Groceries, nothing of a transfer', () => {
    const rows = periodRows(PROBE, budgets, emptyBudgetPeriods(), TODAY);
    expect(rows.map(r => [r.budget.id, r.spent, r.left])).toEqual([['food', 2000, 8000], ['bills', 0, 5000]]);
    expect(monthView(PROBE, budgets, '2026-11', TODAY).rows.map(r => [r.id, r.spent])).toEqual([['food', 2000], ['bills', 0]]);
  });
  test('a spread entry counts each month’s share on its day in that month, in payday months and weeks too', () => {
    expect(budgetDayParts(yearly).map(p => p.date).slice(0, 3)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    expect(budgetDayParts(yearly).reduce((s, p) => s + p.parts.reduce((t, x) => t + x.cents, 0), 0)).toBe(12000);
    expect(budgetDayParts(PROBE[1]!)).toEqual([]);
    const all = [...PROBE, yearly], month = periodRows(all, budgets, emptyBudgetPeriods(), TODAY).find(r => r.budget.id === 'bills')!;
    expect(month.spent).toBe(1000);
    expect(monthView(all, budgets, '2026-11', TODAY).rows.find(r => r.id === 'bills')!.spent).toBe(1000);
    // Payday the 25th: 25 Oct – 24 Nov holds October's share (31 Oct), not November's (30 Nov).
    const payday = periodRows(all, budgets, setPeriods(emptyBudgetPeriods(), {payday: 25}), TODAY);
    expect(payday.map(r => [r.budget.id, r.start, r.spent])).toEqual([['food', '2026-10-25', 2000], ['bills', '2026-10-25', 1000]]);
    const weekly = periodRows(all, budgets, setPeriods(emptyBudgetPeriods(), {every: {budgetId: 'bills', every: 'week'}}), '2026-11-30');
    expect(weekly.find(r => r.budget.id === 'bills')).toMatchObject({start: '2026-11-30', spent: 1000});
  });
  test('ZIGi’s pay-period answer says the same €20.00 (€80.00 left of €100.00) and reads the payday', () => {
    const base = novaEnv(showcaseAll()), env = {...base, moneyLog: {...base.moneyLog!, entries: PROBE}, nova: {...base.nova!, budgets}};
    expect(base.habitDay).toBe('2026-11-17');
    const say = (q: string, periods = emptyBudgetPeriods()) => { const r = av2TasksAnswer(q, env, {periods}); return r && 'text' in r ? r.text : ''; };
    expect(say('how much is left in my budgets this pay period')).toMatch(/• Groceries: €80\.00 of €100\.00 \(/);
    expect(say('hoeveel heb ik nog over in mijn budgetten deze periode')).toMatch(/• Groceries: €\s80,00 van €\s100,00 \(/);
    const viaNova = av2TasksAnswer('how much is left in my budgets this pay period', {...env, nova: {...env.nova, budgetPeriods: setPeriods(emptyBudgetPeriods(), {payday: 25})}});
    expect(viaNova && 'text' in viaNova ? viaNova.text : '').toMatch(/Groceries: €80\.00 of €100\.00 \(\w+, Oct 25 – \w+, Nov 24\)/);
  });
});

describe('B2A-3: payee budgets, the payee watch, challenges and the recaps count the person’s share', () => {
  test('the payee watch and the payee budget: €20.00 of €100.00 at the payee, as Wealth → Spending says', () => {
    expect(payeeRows(budgets, PROBE, TODAY)).toMatchObject([{payee: 'Albert Heijn', thisMonth: 2000, count: 2}]);
    expect(payeeBudgets(budgets, PROBE, TODAY)).toMatchObject([{thisMonth: 2000, amount: 10000, left: 8000, over: false, near: false}]);
  });
  test('a challenge, the month recap, the year recap and the three-month average spend €20.00', () => {
    const record = {...budgets, challenges: [{id: 'c1', category: 'Groceries', currency: 'EUR', month: '2026-11'}]};
    expect(challengeStates(record, PROBE, TODAY)).toMatchObject([{spent: 2000}]);
    expect(monthRecap(PROBE, budgets, '2026-11', TODAY)).toMatchObject([{spent: 2000, income: 100000, top: [{category: 'Groceries', cents: 2000}], largest: {cents: 1000}}]);
    expect(yearRecap(PROBE, null, '2026', TODAY)).toMatchObject([{spent: 2000, income: 100000, top: [{category: 'Groceries', cents: 2000}]}]);
    expect(averageSpent(PROBE, 'Groceries', 'EUR', '2026-12')).toEqual({cents: 2000, months: 1});
  });
});
