import {describe, expect, test} from 'vitest';
import {countedBetween, countedByCategoryBetween, countedCents, countedKind, inFigures, isCounted, isRefund, isSpending} from './counted';
import {byCategory, totals} from './engine';
import {markRefund, refundOffers, refundShare, refundTargets, unmarkRefund, withRefundShare} from './refunds';
import {shareCost, unshareCost} from '../money-more/people';
import {emptyMoneyMore} from '../money-more/schema';
import {emptyMoneyLog, moneyEntrySchema, moneyLogSchema, type MoneyEntry} from './schema';
import {searchEntries} from './search';
import {countedAs, sheetRows} from './sheet';
import {monthView} from '../budgets/engine';
import {readyToAssign} from '../budgets/ready-to-assign';
import {monthRecap} from '../budgets/recap';
import {averageSpent} from '../budgets/assign';
import {emptyBudgetPeriods, incomeToFill, periodRows} from '../budgets/periods';
import {yearSoFar} from '../budgets/year-so-far';
import {emptyBudgets, type BudgetsRecord} from '../budgets/schema';
import {challengeStates, payeeRows, yearRecap} from '../money-notices';
import {spendingPace} from '../money-insights/spending-pace';
import {vsLastMonth} from '../money-insights/month-compare';
import {incomeFlow} from '../money-insights/income-flow';
import {cashFlow, topPayees} from '../money-insights/cash-flow';
import {monthCalendar} from '../money-insights/month-days';
import {ledger} from '../ai/local-answers/exact/money';
import {resolvePeriod} from '../ai/local-answers/exact/period';
import {cashRiver, categoryRanks, savingsRate, spendingHeat, spendTrack} from '../nova/cards/ax/money-spend';
import {spendingCard} from '../nova/cards/spending';
import {byPaidWith, bySub} from '../money-more/quick';
import {payeeBudgets} from '../money-more/own-budgets';
import {tagTotals} from '../money-tags/tags';
import {compare, spendBasis, type CompareSources} from '../compare/engine';
import {createHabit, emptyHabitData, logHabitCount, type HabitData} from '../habits';
import {addLocalDays} from '../local-date';
import {av2MoneyAnswer} from '../ai/local-answers/av2-money';
import {novaEnv, showcaseAll} from '../ai/evals/as/harness';
import {mineParts} from './counted';
import {barWidths} from './bars';
import {yourDays} from '../life-review/your-days';

/**
 * Session AV lane 2, round 6 (money; Banktivity's refund, LEDGER #425): a refund is stored as income with `refund: true` in
 * an expense category, and every figure counts it by the shared rule as spending below zero in that category, never as
 * income: Wealth → Spending, the budgets (month, pay period, year so far, recaps, challenges, payee watch, the fill),
 * NOVA's and ZIGi's exact answers and cards, the insights (pace, last month, income flow, cash flow, the calendar) and
 * Compare. The probe month: €100 of groceries, a €30 refund of them, €1,000 salary.
 */
const TODAY = '2026-11-20';
const e = (id: string, amount: string, extra: Partial<MoneyEntry> = {}): MoneyEntry => ({id, kind: 'expense', amount, currency: 'EUR', category: 'Groceries', note: 'Albert Heijn', date: '2026-11-10', createdAt: '2026-11-10T10:00:00.000Z', ...extra});
const refund = (id: string, amount: string, extra: Partial<MoneyEntry> = {}) => e(id, amount, {kind: 'income', refund: true, date: '2026-11-12', createdAt: '2026-11-12T10:00:00.000Z', ...extra});
const PROBE: MoneyEntry[] = [e('g', '100.00'), refund('r', '30.00', {refundOf: 'g'}), e('s', '1000.00', {kind: 'income', category: 'Salary', note: 'Work', date: '2026-11-01'})];
const month = resolvePeriod('this-month', TODAY)!;
const budgets: BudgetsRecord = {...emptyBudgets(), budgets: [{id: 'food', category: 'Groceries', currency: 'EUR', monthly: '200.00', rollover: false, since: '2026-01'}], payees: [{payee: 'Albert Heijn', currency: 'EUR', amount: '150.00'}]};

describe('the shared rule', () => {
  test('a refund is spending below zero, never income; left out or a transfer it counts nowhere', () => {
    const r = PROBE[1]!;
    expect([isRefund(r), isCounted(r), inFigures(r), isSpending(r), countedKind(r)]).toEqual([true, false, true, true, 'expense']);
    expect(PROBE.map(countedCents)).toEqual([10000, -3000, 100000]);
    expect(mineParts(r)).toEqual([{cents: -3000, category: 'Groceries'}]);
    expect(inFigures({...r, excluded: true})).toBe(false); expect(inFigures({...r, transfer: 'x'})).toBe(false);
    // `refund` on an expense means nothing: it stays an expense.
    expect(isRefund({...PROBE[0]!, refund: true})).toBe(false); expect(countedCents({...PROBE[0]!, refund: true})).toBe(10000);
    // A refund of a shared cost counts the person's share of it.
    expect(countedCents(refund('rs', '30.00', {share: '10.00'}))).toBe(-1000);
  });
  test('Wealth → Spending: €70 spent, €1,000 in, Groceries €70', () => {
    expect(totals(PROBE, '2026-11-01', '2026-11-30')).toEqual([{currency: 'EUR', expenses: 7000, income: 100000, count: 3}]);
    expect(byCategory(PROBE, '2026-11-01', '2026-11-30')).toEqual([{category: 'Groceries', currency: 'EUR', total: 7000, count: 2}]);
    expect(byCategory(PROBE, '2026-11-01', '2026-11-30', 'income').map(c => c.category)).toEqual(['Salary']);
    expect(countedBetween(PROBE, '2026-11-01', '2026-11-30').get('EUR')).toBe(7000);
    expect(countedBetween(PROBE, '2026-11-01', '2026-11-30', {kind: 'income'}).get('EUR')).toBe(100000);
    expect(countedByCategoryBetween(PROBE, '2026-11-01', '2026-11-30')).toEqual([{category: 'Groceries', currency: 'EUR', total: 7000, count: 2}]);
  });
  test('an older build’s record reads: the flags are kept, an unreadable one dropped', () => {
    const parsed = moneyEntrySchema.parse({...PROBE[1], refundOf: 'g'});
    expect(parsed).toMatchObject({kind: 'income', refund: true, refundOf: 'g'});
    const odd = moneyEntrySchema.parse({...PROBE[1], refund: 'yes', refundOf: '../x'});
    expect([odd.refund, odd.refundOf, isRefund(odd)]).toEqual([undefined, undefined, false]);
    expect(moneyLogSchema.parse({...emptyMoneyLog(), entries: PROBE}).entries[1]).toMatchObject({refund: true});
  });
});

describe('budgets', () => {
  test('the month budget, its pace, the pay period, the year so far and the three-month average spend €70', () => {
    expect(monthView(PROBE, budgets, '2026-11', TODAY).rows[0]).toMatchObject({spent: 7000, left: 13000});
    expect(periodRows(PROBE, budgets, emptyBudgetPeriods(), TODAY)[0]).toMatchObject({spent: 7000, left: 13000});
    expect(yearSoFar(budgets, PROBE, TODAY).rows[0]!.months.find(m => m.month === '2026-11')).toMatchObject({spent: 7000});
    expect(averageSpent(PROBE, 'Groceries', 'EUR', '2026-12')).toEqual({cents: 7000, months: 1});
  });
  test('ready to assign: a refund is not income; a paycheck fill never offers a refund', () => {
    expect(readyToAssign(PROBE, budgets, '2026-11')).toEqual([{currency: 'EUR', status: 'ok', income: 100000, held: 20000, ready: 80000, incomeEntries: 1}]);
    const plan = {...emptyBudgetPeriods(), fill: {items: [{budgetId: 'food', amount: '200.00'}]}};
    expect(incomeToFill([PROBE[1]!], budgets, plan, '2026-11-14')).toBeNull();
  });
  test('the recaps, the challenge, the payee watch and the payee budget', () => {
    expect(monthRecap(PROBE, budgets, '2026-11', TODAY)).toMatchObject([{spent: 7000, income: 100000, top: [{category: 'Groceries', cents: 7000}], largest: {cents: 10000}}]);
    expect(yearRecap(PROBE, null, '2026', TODAY)).toMatchObject([{spent: 7000, income: 100000, top: [{category: 'Groceries', cents: 7000}], largest: {cents: 10000}}]);
    expect(challengeStates({...budgets, challenges: [{id: 'c', category: 'Groceries', currency: 'EUR', month: '2026-11'}]}, PROBE, TODAY)).toMatchObject([{spent: 7000}]);
    expect(payeeRows(budgets, PROBE, TODAY)).toMatchObject([{thisMonth: 7000}]);
    expect(payeeBudgets(budgets, PROBE, TODAY)).toMatchObject([{thisMonth: 7000, left: 8000}]);
  });
});

describe('NOVA’s and ZIGi’s answers and cards', () => {
  test('the exact ledger: €70 spent; €1,000 came in', () => {
    expect(ledger(PROBE, 'expense', month).total).toBe(7000);
    expect(ledger(PROBE, 'income', month)).toMatchObject({total: 100000});
    expect(ledger(PROBE, 'income', month).own.map(x => x.id)).toEqual(['s']);
  });
  test('the ranks, the gauge, the river, the heat, the days and the spending card', () => {
    expect(categoryRanks(PROBE, 'expense', month)).toMatchObject({totalCents: 7000, rows: [{label: 'Groceries', cents: 7000}]});
    expect(savingsRate(PROBE, month)).toMatchObject({incomeCents: 100000, spendingCents: 7000});
    expect(cashRiver(PROBE, month)).toMatchObject({incomeCents: 100000, spendingCents: 7000});
    expect(spendingHeat(PROBE, TODAY)).toMatchObject({totalCents: 7000});
    const days = spendTrack(PROBE, TODAY, 'EUR').points(['2026-11-10', '2026-11-12']);
    expect(days.map(d => [d.value, d.state])).toEqual([[10000, 'done'], [-3000, 'none']]);
    expect(spendingCard({entries: PROBE}, TODAY, 'month')).toMatchObject({totalCents: 7000, largest: {cents: 10000}});
  });
  test('the left-out answer never lists a refund as left out', () => {
    const base = novaEnv(showcaseAll()), env = {...base, moneyLog: {...base.moneyLog!, entries: PROBE}};
    const r = av2MoneyAnswer('which entries are not counted in my totals', env);
    expect(r && 'text' in r ? r.text : '').toMatch(/^Nothing is left out/);
  });
});

describe('Spending’s other figures', () => {
  test('the pace, last month, the income flow, cash flow, top payees and the calendar', () => {
    const before = [e('o1', '50.00', {date: '2026-10-05'}), e('o2', '50.00', {date: '2026-09-05'}), e('o3', '50.00', {date: '2026-08-05'})];
    const all = [...PROBE, ...before];
    expect(spendingPace(all, 'EUR', TODAY)).toMatchObject({status: 'ok', thisMonth: 7000});
    expect(vsLastMonth(all, 'EUR', TODAY).rows).toMatchObject([{category: 'Groceries', thisMonth: 7000, lastMonth: 5000}]);
    expect(incomeFlow(PROBE, 'EUR', '2026-11')).toMatchObject({income: 100000, spent: 7000, sources: [{label: 'Salary', cents: 100000}]});
    expect(cashFlow(PROBE, 'EUR', TODAY).months).toMatchObject([{month: '2026-11', income: 100000, spending: 7000}]);
    expect(topPayees(PROBE, 'EUR', TODAY).payees).toMatchObject([{thisMonth: 7000}]);
    const cal = monthCalendar(PROBE, '2026-11', 'EUR', TODAY);
    expect(cal).toMatchObject({spent: 7000, received: 100000});
  });
  test('by how it was paid, by subcategory, tags, the sheet and the search', () => {
    expect(byPaidWith(PROBE, '2026-11-01', '2026-11-30')).toMatchObject([{method: 'unmarked', cents: 7000}]);
    expect(bySub(PROBE, 'Groceries', '2026-11-01', '2026-11-30', mineParts)).toMatchObject([{sub: null, cents: 7000}]);
    expect(tagTotals(PROBE, {version: 1, tags: {g: ['trip'], r: ['trip']}}, '2026-11-01', '2026-11-30')).toMatchObject([{tag: 'trip', spent: 7000, received: 0}]);
    expect(sheetRows(PROBE, '2026-11-01', '2026-11-30').map(r => [r.id, r.counted, r.as])).toEqual([['r', -3000, 'refund'], ['g', 10000, 'counted'], ['s', 100000, 'counted']]);
    expect(countedAs({...PROBE[1]!, excluded: true})).toBe('left out');
    expect(searchEntries(PROBE, {counted: 'counted'}).map(x => x.id).sort()).toEqual(['g', 'r', 's']);
    expect(searchEntries(PROBE, {counted: 'left-out'})).toEqual([]);
  });
});

describe('Life review', () => {
  test('review B6O-1: Your days counts by the shared rule: €70 spent, €1,000 received; left out, transfers and shares as Spending', () => {
    expect(yourDays({start: '2026-11-01', end: '2026-11-30', money: {entries: PROBE}}).money).toEqual([{currency: 'EUR', spent: 70, received: 1000, entries: 3}]);
    expect(yourDays({start: '2026-11-01', end: '2026-11-30', money: {entries: [e('g', '100.00'), refund('r', '30.00')]}}).money).toEqual([{currency: 'EUR', spent: 70, received: 0, entries: 2}]);
    const marked = [e('g', '100.00', {share: '40.00'}), e('x', '9.00', {excluded: true}), e('t', '50.00', {transfer: 'p'}), refund('rx', '5.00', {excluded: true}), e('i', '20.00', {kind: 'income', category: 'Gifts received', transfer: 'p'})];
    expect(yourDays({start: '2026-11-01', end: '2026-11-30', money: {entries: marked}}).money).toEqual([{currency: 'EUR', spent: 40, received: 0, entries: 1}]);
  });
});

test('review B6O-5: This month’s bars never draw a category at or below zero, and are never NaN', () => {
  // €50 of clothing on 28 Oct and its €50 refund on 2 Nov: November's only EUR row is −€50.00.
  const nov = byCategory([e('c', '50.00', {category: 'Shopping', date: '2026-10-28'}), refund('rc', '50.00', {category: 'Shopping', date: '2026-11-02'})], '2026-11-01', '2026-11-30');
  expect(nov).toEqual([{category: 'Shopping', currency: 'EUR', total: -5000, count: 1}]);
  expect(barWidths(nov)).toEqual([null]);
  expect(barWidths([{currency: 'EUR', total: 0}])).toEqual([null]);
  expect(barWidths([{currency: 'EUR', total: 8000}, {currency: 'EUR', total: 100}, {currency: 'EUR', total: -5000}, {currency: 'USD', total: -10}, {currency: 'USD', total: 2000}])).toEqual([100, 4, null, null, 100]);
});

describe('Compare', () => {
  test('the day’s spending and the spending factor are lowered by a refund that day', () => {
    const HABIT = '92000000-0000-4000-8000-000000000611', today = '2026-10-31', start = addLocalDays(today, -40);
    let habits: HabitData = createHabit(emptyHabitData(), {title: 'Walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date(`${addLocalDays(start, -1)}T08:00:00Z`), HABIT);
    const entries: MoneyEntry[] = [];
    for (let i = 0; i < 40; i++) {
      const day = addLocalDays(start, i), even = i % 2 === 0;
      if (even) habits = logHabitCount(habits, HABIT, day, 1, '', new Date(`${day}T20:00:00Z`));
      entries.push(e(`d${i}`, '30.00', {date: day}));
      if (even) entries.push(refund(`r${i}`, '20.00', {date: day}));
    }
    const src: CompareSources = {habits, money: {entries}};
    expect(compare(src, `habit:${HABIT}`, 'spend:EUR', 'same', today)).toMatchObject({withValue: 10, withoutValue: 30});
    expect(spendBasis(src, today)).toEqual({currency: 'EUR', usual: 10});
  });
});

describe('marking a refund', () => {
  const log = {...emptyMoneyLog(), entries: [e('g', '100.00', {account: 'Card'}), e('in', '30.00', {kind: 'income', category: 'Other income', account: 'Card', date: '2026-11-12'}), e('t', '30.00', {kind: 'income', category: 'Other', transfer: 'x'})]};
  const AT = '2026-11-20T10:00:00.000Z';
  test('money back from a payee paid before is offered, never a transfer or one already a refund', () => {
    expect(refundOffers(log.entries).map(o => [o.entry.id, o.purchase.id])).toEqual([['in', 'g']]);
    expect(refundOffers(log.entries, new Set(['g']))).toEqual([]);
    expect(refundOffers([e('g2', '10.00'), ...log.entries.slice(1)]).length).toBe(0); // the purchase is smaller than the money back
  });
  test('marked: income with `refund` in the purchase’s category, its history; unmarked: money received again', () => {
    const marked = markRefund(log, 'in', {category: 'Groceries', of: 'g'}, AT), entry = marked.entries[1]!;
    expect(entry).toMatchObject({kind: 'income', refund: true, refundOf: 'g', category: 'Groceries', history: [{by: 'you', field: 'category', from: 'Other income', to: 'Groceries'}]});
    expect(totals(marked.entries, '2026-11-01', '2026-11-30')[0]).toMatchObject({expenses: 7000, income: 0});
    expect(() => markRefund(log, 't', {category: 'Groceries'}, AT)).toThrow(/transfer/);
    expect(() => markRefund(log, 'in', {category: 'Groceries', of: 'nope'}, AT)).toThrow(/no longer/);
    const back = unmarkRefund(marked, 'in', 'Other income', AT).entries[1]!;
    expect(back).not.toHaveProperty('refund'); expect(back).not.toHaveProperty('refundOf'); expect(back.category).toBe('Other income');
  });
  test('review B6O-4: a refund of a shared cost counts the person’s share of it — €120 dinner, my share €40, €120 back: €0', () => {
    const dinner = e('d', '120.00', {category: 'Food & drink', note: 'Trattoria', share: '40.00', account: 'Card'});
    const back = e('b', '120.00', {kind: 'income', category: 'Other income', note: 'Trattoria', account: 'Card', date: '2026-11-12'});
    const shared = {...emptyMoneyLog(), entries: [dinner, back]};
    expect(refundOffers(shared.entries).map(o => o.entry.id)).toEqual(['b']);
    const marked = markRefund(shared, 'b', {category: 'Food & drink', of: 'd'}, AT);
    expect(marked.entries[1]).toMatchObject({refund: true, refundOf: 'd', share: '40.00'});
    expect(byCategory(marked.entries, '2026-11-01', '2026-11-30')).toEqual([{category: 'Food & drink', currency: 'EUR', total: 0, count: 2}]);
    expect(totals(marked.entries, '2026-11-01', '2026-11-30')[0]).toMatchObject({expenses: 0, income: 0});
    // Part of it back: by the same share, exact cents (to the nearest cent).
    expect([refundShare('30.00', dinner), refundShare('10.00', dinner), refundShare('0.01', dinner), refundShare('5.00', {amount: '5.00'})]).toEqual(['10.00', '3.33', undefined, undefined]); // a cent back is one cent: whole
    // Not linked, or linked to a purchase not shared: whole; unmarked: money received counts whole again.
    expect(markRefund(shared, 'b', {category: 'Food & drink'}, AT).entries[1]).not.toHaveProperty('share');
    expect(unmarkRefund(marked, 'b', 'Other income', AT).entries[1]).not.toHaveProperty('share');
    // The purchase shared (or not) afterwards: its refunds follow.
    const later = markRefund({...shared, entries: [e('d', '120.00', {category: 'Food & drink', note: 'Trattoria', account: 'Card'}), back]}, 'b', {category: 'Food & drink', of: 'd'}, AT);
    expect(later.entries[1]).not.toHaveProperty('share');
    const more = emptyMoneyMore();
    const split = shareCost(later, more, 'd', '60.00', [{name: 'Sam', amount: '60.00'}], () => 'o1').log;
    expect(split.entries[1]).toMatchObject({share: '60.00'});
    expect(unshareCost(split, more, 'd').log.entries[1]).not.toHaveProperty('share');
    // A refund whose purchase is gone keeps the share it has; any other entry is as it is.
    expect(withRefundShare([], marked.entries[1]!)).toBe(marked.entries[1]);
    expect(withRefundShare(marked.entries, dinner)).toBe(dinner);
  });
  test('the purchases a refund can point at: its category and currency, before it, newest first', () => {
    expect(refundTargets([e('a', '5.00', {date: '2026-11-01'}), e('b', '5.00', {date: '2026-11-11'}), e('c', '5.00', {category: 'Fun'}), e('d', '5.00', {date: '2026-11-15'})], {id: 'r', currency: 'EUR', category: 'groceries', date: '2026-11-12'}).map(x => x.id)).toEqual(['b', 'a']);
  });
});
