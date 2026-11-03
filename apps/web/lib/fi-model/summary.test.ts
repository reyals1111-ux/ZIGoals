import {describe, expect, test} from 'vitest';
import {fiIssue, runFiModel, type FiInput} from './model';
import {fiIssueField, fiSummary} from './summary';

const base: FiInput = {invested: 50_000, yearlySpend: 30_000, withdrawalPct: 4, monthlyContribution: 1_000, returnPct: 5, volatilityPct: 15, years: 50};
const money = (n: number) => `€${Math.round(n).toLocaleString('en')}`;
describe('Financial freedom polish (Session AK F5a, item 4)', () => {
  test('the issue names the same field fiIssue refuses', () => {
    const cases: [Partial<FiInput>, string][] = [[{invested: -1}, 'invested'], [{yearlySpend: 0}, 'yearlySpend'], [{monthlyContribution: Number.NaN}, 'monthlyContribution'], [{withdrawalPct: 11}, 'withdrawalPct'], [{returnPct: 30}, 'returnPct'], [{volatilityPct: 61}, 'volatilityPct'], [{years: 2.5}, 'years']];
    for (const [patch, field] of cases) { const i = {...base, ...patch}; expect(fiIssue(i)).not.toBeNull(); expect(fiIssueField(i)).toBe(field); }
    expect(fiIssueField(base)).toBeNull();
  });
  test('the plain line: half the paths, a slow path, already there, and never', () => {
    const line = fiSummary(runFiModel(base), 50, money);
    expect(line).toMatch(/^In this model, half of the paths reach your target of €750,000 within \d+(\.\d)? years; a slow path \(1 in 10\) takes \d+(\.\d)? years or more\.$/);
    expect(fiSummary(runFiModel({...base, invested: 800_000}), 50, money)).toMatch(/already at your target/);
    expect(fiSummary(runFiModel({...base, invested: 0, monthlyContribution: 0, years: 5}), 5, money)).toMatch(/none of the paths reach .* within 5 years/);
    const some = runFiModel({...base, years: 12});
    if (some.yearsTo.p50 === null && some.reached > 0) expect(fiSummary(some, 12, money)).toMatch(/fewer than half/);
  });
});
