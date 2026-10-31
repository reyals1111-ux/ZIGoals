import {describe, expect, test} from 'vitest';
import {EXAMPLE_DEBTS, EXAMPLE_EXTRA, addMonths, centsText, comparePlans, comparisonWords, firstPaymentMonth, monthlyInterest, parseCents, payoffMonth, planIssue, rateE4, runPlan, strategyOrder, toCents, type PlanDebt} from './plan';
import {debtPlannerSchema} from './store';
import {showcaseDebtPlanner} from './showcase';
import {showcaseAccounts} from '../accounts/showcase';
import {isDebtKind} from '../accounts/schema';

const debt = (id: string, balance: bigint, ratePercent: string, minimum: bigint): PlanDebt => ({id, name: id, balance, ratePercent, minimum});
describe('the debt payoff planner (Session AK F5a, item 1)', () => {
  test('rates, interest and cents are exact', () => {
    expect(rateE4('21.9')).toBe(219_000n);
    expect(rateE4('0')).toBe(0n);
    expect(rateE4('100')).toBe(1_000_000n);
    expect(rateE4('100.5')).toBeNull();
    expect(rateE4('abc')).toBeNull();
    expect(rateE4('5,25')).toBe(52_500n);
    // 1,000.00 at 12 % a year: 10.00 a month.
    expect(monthlyInterest(100_000n, rateE4('12')!)).toBe(1_000n);
    // 123.45 at 19.99 %: 2.0565… → 2.06 (half up).
    expect(monthlyInterest(12_345n, rateE4('19.99')!)).toBe(206n);
    expect(monthlyInterest(100_000n, 0n)).toBe(0n);
    expect(parseCents('1250,5')).toBe(125_050n);
    expect(parseCents('1250.50')).toBe(125_050n);
    expect(parseCents('1,250.50')).toBeNull();
    expect(parseCents('-3')).toBeNull();
    expect(parseCents('')).toBeNull();
    expect(centsText(-1_205n)).toBe('-12.05');
    expect(centsText(7n)).toBe('0.07');
    expect(toCents(123_456n, 3)).toBe(12_346n);
    expect(toCents(5n, 0)).toBe(500n);
  });
  test('one debt amortises month by month in cents; what is paid is the balance plus the interest', () => {
    const r = runPlan([debt('a', 100_000n, '12', 10_000n)], 0n, 'avalanche');
    expect(r.balances.slice(0, 4)).toEqual([100_000n, 91_000n, 81_910n, 72_729n]); // 1010−100, 919.10−100, 827.29−100
    expect(r.months).toBe(11);
    expect(r.totalPaid).toBe(100_000n + r.totalInterest);
    expect(r.balances.at(-1)).toBe(0n);
    expect(r.payoffs).toEqual([{id: 'a', name: 'a', month: 11, interest: r.totalInterest}]);
  });
  test('snowball orders by the smallest balance, avalanche by the highest rate; ties are stable', () => {
    const debts = [debt('car', 650_000n, '6.4', 19_000n), debt('card', 120_000n, '22.9', 3_500n), debt('store', 40_000n, '27.9', 2_500n), debt('loan', 40_000n, '9', 2_000n)];
    expect(strategyOrder(debts, 'snowball').map(d => d.id)).toEqual(['store', 'loan', 'card', 'car']);
    expect(strategyOrder(debts, 'avalanche').map(d => d.id)).toEqual(['store', 'card', 'loan', 'car']);
  });
  test('the example: avalanche never costs more interest than snowball; both beat minimums only; freed minimums roll on', () => {
    const c = comparePlans(EXAMPLE_DEBTS, EXAMPLE_EXTRA);
    expect(c.avalanche.totalInterest).toBeLessThanOrEqual(c.snowball.totalInterest);
    expect(c.avalanche.months).not.toBeNull();
    expect(c.minimums.months).not.toBeNull();
    expect(c.avalanche.months!).toBeLessThan(c.minimums.months!);
    expect(c.savedAvalanche).toBe(c.minimums.totalInterest - c.avalanche.totalInterest);
    expect(c.savedAvalanche! > 0n).toBe(true);
    for (const r of [c.snowball, c.avalanche, c.minimums]) expect(r.totalPaid).toBe(EXAMPLE_DEBTS.reduce((t, d) => t + d.balance, 0n) + r.totalInterest);
    expect(c.snowball.payoffs[0]!.id).toBe('example-store');
    expect(c.avalanche.payoffs.map(p => p.id)).toContain('example-car');
    // The budget stays the same each month: never more is paid than the minimums plus the extra.
    const budget = EXAMPLE_DEBTS.reduce((t, d) => t + d.minimum, 0n) + EXAMPLE_EXTRA;
    for (let m = 1; m < c.avalanche.balances.length; m++) expect(c.avalanche.totalPaid >= 0n && c.avalanche.balances[m - 1]! - c.avalanche.balances[m]! <= budget).toBe(true);
  });
  test('a payment that never covers the interest has no date (null), never a guess', () => {
    const c = comparePlans([debt('a', 1_000_000n, '24', 1_000n)], 0n);
    expect(c.snowball.months).toBeNull();
    expect(c.minimums.months).toBeNull();
    expect(c.savedSnowball).toBeNull();
    expect(comparisonWords(c, centsText)).toMatch(/not cleared within 100 years/);
  });
  test('the words say which order costs less, or that they are the same', () => {
    const same = comparePlans([debt('a', 50_000n, '10', 5_000n)], 1_000n);
    expect(comparisonWords(same, centsText)).toMatch(/come out the same/);
    const words = comparisonWords(comparePlans(EXAMPLE_DEBTS, EXAMPLE_EXTRA), centsText);
    expect(words).toMatch(/^Avalanche costs \d+\.\d{2} less interest than snowball/);
  });
  test('inputs out of range are refused in plain words; unknown is not zero', () => {
    expect(planIssue([], 0n)).toMatch(/at least one debt/);
    expect(planIssue([debt('a', 100n, '', 10n)], 0n)).toMatch(/yearly rate for a/);
    expect(planIssue([debt('a', 100n, '5', 0n)], 0n)).toMatch(/minimum monthly payment for a/);
    expect(planIssue([debt('a', 0n, '5', 10n)], 0n)).toMatch(/what you owe on a/);
    expect(planIssue([debt('a', 100n, '5', 10n)], -1n)).toMatch(/extra/);
    expect(() => runPlan([], 0n, 'snowball')).toThrow(/at least one debt/);
  });
  test('months and dates', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(firstPaymentMonth('2026-10-31')).toBe('2026-11');
    expect(payoffMonth('2026-10-31', 1)).toBe('2026-11');
    expect(payoffMonth('2026-10-31', 14)).toBe('2027-12');
    expect(payoffMonth('2026-10-31', null)).toBeNull();
  });
  test('the stored figures are optional and bounded; the Showcase names the Showcase debts, labelled', () => {
    expect(debtPlannerSchema.parse({version: 1})).toEqual({version: 1});
    expect(debtPlannerSchema.safeParse({version: 1, extra: '-5'}).success).toBe(false);
    expect(debtPlannerSchema.safeParse({version: 1, debts: {x: {ratePercent: '101'}}}).success).toBe(false);
    expect(debtPlannerSchema.safeParse({version: 1, debts: {x: {minimum: '25.00', later: 1}}, later: true}).success).toBe(true);
    const s = showcaseDebtPlanner('2026-10-31'), debts = showcaseAccounts('2026-10-31').items.filter(a => isDebtKind(a.kind)).map(a => a.id);
    expect(Object.keys(s.debts!).sort()).toEqual(debts.sort());
    expect(s.note).toMatch(/SHOWCASE DATA/);
  });
});
