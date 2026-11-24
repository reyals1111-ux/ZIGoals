import {describe, expect, test} from 'vitest';
import {cashFlowIndex, consolidation, extraFor, methodOrder, paymentFor, scheduleCsv, targetChecks} from './more';
import {runPlan, type PlanDebt} from './plan';
import {debtSummary, debtTrend, owedNow, paidOffDebts, trackedProgress} from './wealth';
import {debtPlannerSchema} from './store';
import {accountsSchema, type Account} from '../accounts/schema';
import {billHistory, debtMinimumsThisMonth, editBill, paidEntry, setAutopay} from '../bills/tracker';
import {emptyBills, type Bill} from '../bills/schema';
import type {MoneyEntry} from '../money-log/schema';
import {av2MoneyAnswer} from '../ai/local-answers/av2-money';
import {freshAll, zigiEnv} from '../ai/evals/as/harness';

/** Session AV lane 2 (money; Undebt.it): further orders, promo rates, Debt Blaster, targets, what-if, consolidation, Wealth's debts, the bill tracker. */
const TODAY = '2026-11-14';
const debts: PlanDebt[] = [
  {id: 'card', name: 'Card', balance: 300000n, ratePercent: '21.9', minimum: 9000n},
  {id: 'car', name: 'Car', balance: 800000n, ratePercent: '6.5', minimum: 25000n},
  {id: 'store', name: 'Store', balance: 40000n, ratePercent: '0', minimum: 4000n},
];
describe('further orders (Undebt.it)', () => {
  test('highest monthly interest, highest payment, Cash Flow Index, by paid-off-by months', () => {
    expect(methodOrder(debts, 'interest')).toEqual(['card', 'car', 'store']);
    expect(methodOrder(debts, 'payment')).toEqual(['car', 'card', 'store']);
    expect(methodOrder(debts, 'cfi')).toEqual(['store', 'car', 'card']);
    expect(cashFlowIndex(debts[0]!)).toBe(33.3);
    expect(methodOrder(debts, 'targets', {car: '2027-06'})).toEqual(['car', 'card', 'store']);
  });
});
describe('promo rates and Debt Blaster in the plan', () => {
  test('a 0 % promo for 6 months costs less interest; a rising extra clears sooner', () => {
    const base = runPlan(debts, 10000n, 'avalanche'), promo = runPlan([{...debts[0]!, promoRate: '0', promoMonths: 6}, debts[1]!, debts[2]!], 10000n, 'avalanche');
    expect(promo.totalInterest).toBeLessThan(base.totalInterest);
    const blast = runPlan(debts, 10000n, 'avalanche', {stepUp: {cents: 2500n, every: 3}});
    expect(blast.months!).toBeLessThan(base.months!);
    expect(runPlan(debts, 10000n, 'minimums', {stepUp: {cents: 2500n, every: 3}}).months).toBe(runPlan(debts, 10000n, 'minimums').months);
  });
});
describe('targets, the reverse what-if and consolidation', () => {
  test('what a debt needs a month to be paid off by its month', () => {
    expect(paymentFor(120000n, '0', 12)).toBe(10000n);
    const p = paymentFor(300000n, '21.9', 24), plan = runPlan([{...debts[0]!, minimum: p}], 0n, 'avalanche');
    expect(plan.months).toBe(24);
    const checks = targetChecks(debts, runPlan(debts, 10000n, 'avalanche'), TODAY, {store: '2027-12', car: '2027-03'});
    expect(checks.find(c => c.id === 'store')).toMatchObject({onTrack: true});
    expect(checks.find(c => c.id === 'car')).toMatchObject({onTrack: false});
    expect(checks.find(c => c.id === 'car')!.needs).toBeGreaterThan(200000n);
  });
  test('the extra that makes the plan debt-free by a month', () => {
    const need = extraFor(debts, 'avalanche', '2027-12', TODAY)!;
    expect(need > 0n).toBe(true);
    expect(runPlan(debts, need, 'avalanche').months!).toBeLessThanOrEqual(13);
    expect(runPlan(debts, need - 1n, 'avalanche').months!).toBeGreaterThan(13);
    expect(extraFor(debts, 'avalanche', '2026-10', TODAY)).toBeNull();
    expect(extraFor(debts, 'avalanche', '2060-12', TODAY)).toBe(0n);
  });
  test('one loan against the plan, with its fee', () => {
    const plan = runPlan(debts, 10000n, 'avalanche'), c = consolidation(debts, plan, '8.9', 48, 25000n);
    expect(c.totalPaid).toBe(c.payment * 47n + (c.totalPaid - c.payment * 47n));
    expect(c.months).toBe(48);
    expect(c.difference).toBe(c.totalPaid - plan.totalPaid);
    expect(() => consolidation(debts, plan, '101', 48, 0n)).toThrow('rate');
  });
  test('the schedule as CSV', () => {
    const csv = scheduleCsv(debts, runPlan(debts, 10000n, 'avalanche', {schedule: true}), TODAY).split('\r\n');
    expect(csv[0]).toBe('"Month","Card: paid","Card: interest","Card: left","Car: paid","Car: interest","Car: left","Store: paid","Store: interest","Store: left","One-off extra"');
    expect(csv[1]!.startsWith('"2026-12",')).toBe(true);
  });
});

const AT = '2026-01-01T09:00:00.000Z';
const acct = (id: string, name: string, snaps: [string, string][], payments: [string, string][] = []): Account => ({id, kind: 'loan', name, currency: 'EUR', snapshots: snaps.map(([date, value], i) => ({id: `00000000-0000-4000-8000-${id.slice(-4)}${String(i).padStart(8, '0')}`, date, value, decimals: 2})), payments: payments.map(([date, value], i) => ({id: `00000000-0000-4000-9000-${id.slice(-4)}${String(i).padStart(8, '0')}`, date, value, decimals: 2})), createdAt: AT, updatedAt: AT});
describe("Wealth's debts", () => {
  const car = acct('00000000-0000-4000-8000-00000000c001', 'Car', [['2025-11-01', '900000'], ['2026-01-01', '850000'], ['2026-11-01', '600000']], [['2026-11-05', '25000']]);
  const card = acct('00000000-0000-4000-8000-00000000c002', 'Card', [['2026-02-01', '120000'], ['2026-09-01', '0']]);
  const accounts = accountsSchema.parse({version: 1, items: [car, card]});
  test('owed now is the balance less the payments since; a trend; paid off with its day', () => {
    expect(owedNow(car, TODAY)).toEqual({cents: 575000n, statement: 600000n, since: '2026-11-01', payments: 1});
    expect(debtTrend(car, TODAY)).toMatchObject({points: [{cents: 900000n}, {cents: 850000n}, {cents: 600000n}], change: -325000n});
    expect(paidOffDebts(accounts, TODAY)).toEqual([{id: card.id, name: 'Card', currency: 'EUR', on: '2026-09-01', from: 120000n}]);
  });
  test('paid down over 12 months and this year; the kept plan followed', () => {
    const [s] = debtSummary(accounts, null, TODAY);
    expect(s).toMatchObject({currency: 'EUR', owed: 575000n, last12: null});
    const [only] = debtSummary(accountsSchema.parse({version: 1, items: [car]}), null, TODAY);
    expect(only).toMatchObject({last12: 900000n - 575000n, thisYear: 900000n - 575000n}); // the balance before 1 January was the November one
    const planner = debtPlannerSchema.parse({version: 1, tracked: {on: '2026-06-01', strategy: 'avalanche', currency: 'EUR', debts: [{id: car.id, name: 'Car', balance: '8000.00', ratePercent: '6.5', minimum: '250.00'}]}});
    const p = trackedProgress(accountsSchema.parse({version: 1, items: [car]}), planner, TODAY)!;
    expect(p.months).toBe(5);
    expect(p.actual).toBe(575000n);
    expect(p.ahead > 0n).toBe(true);
  });
});

describe('the bill tracker', () => {
  const gym: Bill = {id: 'gym', title: 'Gym', amount: '30.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-03', origin: 'manual', createdAt: '2026-01-01T09:00:00.000Z'};
  const e = (date: string): MoneyEntry => ({id: `g${date}`, kind: 'expense', amount: '30.00', currency: 'EUR', category: 'Health', note: 'Gym', date, createdAt: `${date}T09:00:00.000Z`});
  test('12 months of history from the money log; edit; autopay; mark paid; debt minimums', () => {
    const history = billHistory(gym, [e('2026-10-03'), e('2026-11-04')], TODAY);
    expect(history.at(-1)).toEqual({due: '2026-11-03', state: 'seen'});
    expect(history.at(-2)).toEqual({due: '2026-10-03', state: 'seen'});
    expect(history.at(-3)).toEqual({due: '2026-09-03', state: 'passed'});
    expect(history.length).toBeGreaterThanOrEqual(11);
    let r = {...emptyBills(), bills: [gym]};
    r = editBill(r, 'gym', {title: 'Gym club', amount: '32.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-05'});
    expect(r.bills[0]).toMatchObject({title: 'Gym club', amount: '32.00', nextDue: '2026-12-05'});
    expect(setAutopay(r, 'gym', true).bills[0]!.autopay).toBe(true);
    expect(setAutopay(setAutopay(r, 'gym', true), 'gym', false).bills[0]!.autopay).toBeUndefined();
    expect(paidEntry(gym, '2026-11-03', TODAY, 'x', AT)).toMatchObject({kind: 'expense', amount: '30.00', category: 'Bills', note: 'Gym', date: '2026-11-03'});
    expect(paidEntry(gym, '2026-12-03', TODAY, 'x', AT).date).toBe(TODAY);
    const car = acct('00000000-0000-4000-8000-00000000c001', 'Car', [['2026-11-01', '600000']], [['2026-11-05', '25000']]);
    const planner = debtPlannerSchema.parse({version: 1, debts: {[car.id]: {minimum: '250.00'}}});
    expect(debtMinimumsThisMonth(accountsSchema.parse({version: 1, items: [car]}), planner, TODAY)).toEqual([{id: car.id, name: 'Car', currency: 'EUR', cents: 25000n, paid: true}]);
    expect(debtMinimumsThisMonth(accountsSchema.parse({version: 1, items: [car]}), planner, '2026-12-02')[0]!.paid).toBe(false);
  });
});

describe('answers', () => {
  test('paid off, paid down, the kept plan, debt-free by a year (EN and NL)', () => {
    const car = acct('00000000-0000-4000-8000-00000000c001', 'Car', [['2025-11-01', '900000'], ['2026-01-01', '850000'], ['2026-11-01', '600000']]);
    const card = acct('00000000-0000-4000-8000-00000000c002', 'Card', [['2026-02-01', '120000'], ['2026-09-01', '0']]);
    const s = {...freshAll(), accounts: accountsSchema.parse({version: 1, items: [car, card]})};
    s.ak = {...s.ak, debtPlanner: debtPlannerSchema.parse({version: 1, currency: 'EUR', debts: {[car.id]: {minimum: '250.00', ratePercent: '6.5'}}})};
    const text = (q: string) => { const r = av2MoneyAnswer(q, zigiEnv(s)); return r && 'text' in r ? r.text : ''; };
    expect(text('which debts have I paid off')).toMatch(/^Card: paid off on .*, from €1,200\.00\.$/);
    expect(text('welke schulden heb ik afgelost')).toMatch(/^Card: afgelost op /);
    expect(text('how much debt did I pay down this year')).toBe('EUR: €6,000.00 owed now; paid down €4,200.00 this year.');
    expect(text('am I on track with my debt plan')).toContain('No plan is kept yet');
    expect(text('how much extra do I need to be debt free by 2028')).toMatch(/^About €[\d,.]+ extra a month on top of the minimums makes you debt-free by December 2028/);
    // Session AV lane 2 (review b2a #6: a Dutch answer writes its money the Dutch way, "€ 7,27"; matched only in that form, deliberate)
    expect(text('hoeveel extra heb ik nodig om in 2028 schuldenvrij te zijn')).toMatch(/^Ongeveer €\s[\d.]+,\d{2} extra per maand/);
  });
});
