import {describe, expect, it} from 'vitest';
import {comparePlans, countdownWords, customOrder, lumpMonth, monthsBetween, planProgress, runPlan, type PlanDebt} from './plan';
import {debtPlannerSchema} from './store';

/** Session AV (owner follow-up 1, F-DEBT-PLAN; Undebt.it): your own order, one-off payments, the schedule, the countdown, the plan against what is recorded. */
const debt = (id: string, balance: bigint, ratePercent: string, minimum: bigint): PlanDebt => ({id, name: id, balance, ratePercent, minimum});
const DEBTS = [debt('card', 240_000n, '22.9', 7_000n), debt('store', 45_000n, '12.9', 2_500n), debt('car', 650_000n, '6.4', 19_000n)];
describe('Session AV (F-DEBT-PLAN)', () => {
  it('"Your order" runs the debts as given, the rest after them in avalanche order', () => {
    expect(customOrder(DEBTS, ['car']).map(d => d.id)).toEqual(['car', 'card', 'store']);
    expect(customOrder(DEBTS, ['store', 'nope', 'store']).map(d => d.id)).toEqual(['store', 'card', 'car']);
    const c = comparePlans(DEBTS, 10_000n, {order: ['car', 'store', 'card']});
    expect(c.custom!.order).toEqual(['car', 'store', 'card']);
    // Paying the cheapest loan first costs more interest than avalanche.
    expect(c.custom!.totalInterest > c.avalanche.totalInterest).toBe(true);
    expect(c.savedCustom).toBe(c.minimums.totalInterest - c.custom!.totalInterest);
    expect(comparePlans(DEBTS, 10_000n).custom).toBeUndefined();
  });
  it('a one-off payment lowers that month and every month after, never "minimums only"', () => {
    const plain = runPlan(DEBTS, 10_000n, 'avalanche'), once = runPlan(DEBTS, 10_000n, 'avalanche', {lumps: [{month: 3, cents: 100_000n}]});
    expect(once.balances.slice(0, 3)).toEqual(plain.balances.slice(0, 3));
    expect(plain.balances[3]! - once.balances[3]!).toBe(100_000n);
    expect(once.months! < plain.months!).toBe(true);
    expect(once.totalInterest < plain.totalInterest).toBe(true);
    expect(runPlan(DEBTS, 10_000n, 'minimums', {lumps: [{month: 1, cents: 100_000n}]}).balances).toEqual(runPlan(DEBTS, 10_000n, 'minimums').balances);
  });
  it('the schedule adds up: what was owed, plus interest, minus what was paid, each month', () => {
    const r = runPlan(DEBTS, 10_000n, 'snowball', {schedule: true, lumps: [{month: 2, cents: 5_000n}]});
    expect(r.schedule).toHaveLength(r.months!);
    let before = r.order.map(id => DEBTS.find(d => d.id === id)!.balance);
    for (const row of r.schedule!) {
      row.left.forEach((left, k) => expect(left).toBe(before[k]! + row.interest[k]! - row.paid[k]!));
      expect(row.paid.reduce((t, p) => t + p, 0n) <= 28_500n + 10_000n + row.lump).toBe(true);
      before = row.left;
    }
    expect(r.schedule![1]!.lump).toBe(5_000n);
    expect(r.schedule!.at(-1)!.left.every(l => l === 0n)).toBe(true);
    expect(runPlan(DEBTS, 0n, 'avalanche').schedule).toBeUndefined();
  });
  it('the countdown and the months between', () => {
    expect([countdownWords(1), countdownWords(11), countdownWords(12), countdownWords(27)]).toEqual(['1 month', '11 months', '1 year', '2 years and 3 months']);
    expect(monthsBetween('2026-11', '2027-02')).toBe(3);
    expect([lumpMonth('2026-11-23', '2026-12'), lumpMonth('2026-11-23', '2027-03'), lumpMonth('2026-11-23', '2026-11')]).toEqual([1, 4, null]);
  });
  it('the tracked plan against what the accounts show now: ahead when less is owed than the plan expected', () => {
    const start = {on: '2026-09-10', debts: [debt('card', 100_000n, '12', 10_000n)], extra: 0n, strategy: 'avalanche' as const};
    // Two payment months later (October and November) the plan expected 1,000 → 910 → 819.10.
    expect(planProgress(start, new Map([['card', 80_000n]]), '2026-11-23')).toEqual({months: 2, expected: 81_910n, actual: 80_000n, ahead: 1_910n, started: 100_000n});
    expect(planProgress(start, new Map(), '2026-11-23').actual).toBe(0n);
    expect(planProgress(start, new Map([['card', 100_000n]]), '2026-09-30')).toMatchObject({months: 0, expected: 100_000n, ahead: 0n});
  });
  it('the new fields are additive: an unreadable one is dropped, the rest of the record kept', () => {
    const r = debtPlannerSchema.parse({version: 1, extra: '100.00', order: ['a', 'b'], lumps: [{month: '2027-01', amount: '500.00'}], shown: 'custom',
      tracked: {on: '2026-11-23', strategy: 'custom', currency: 'EUR', debts: [{id: 'a', name: 'Card', balance: '1000.00', ratePercent: '19.9', minimum: '25.00'}], order: ['a']}});
    expect(r).toMatchObject({order: ['a', 'b'], shown: 'custom', tracked: {strategy: 'custom'}});
    const odd = debtPlannerSchema.parse({version: 1, extra: '100.00', order: 'a', lumps: [{month: '2027-13', amount: '5'}], shown: 'fastest', tracked: {on: 'soon'}});
    expect([odd.extra, odd.order, odd.lumps, odd.shown, odd.tracked]).toEqual(['100.00', undefined, undefined, undefined, undefined]);
  });
});
