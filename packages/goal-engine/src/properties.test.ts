import { describe, expect, it } from 'vitest';
import { evaluateGoal, type GoalEvaluation, type GoalInput } from './index';

const SEEDS = [0x5eed, 0xc0ffee, 0xdeadbeef];
const UNIT = 10n ** 18n;

// An exact integer comparator, independent of the engine's Decimal constructor,
// interest/annuity calculations, and output rounding.
function units(value: string): bigint {
  expect(value).toMatch(/^\d+(?:\.\d{1,18})?$/);
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole!) * UNIT + BigInt(fraction.padEnd(18, '0'));
}
function money(value: bigint): string {
  const fraction = (value % UNIT).toString().padStart(18, '0').replace(/0+$/, '');
  return `${value / UNIT}${fraction ? `.${fraction}` : ''}`;
}
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}
const dates = [
  ['1900-01-31', '1901-01-31'],
  ['2000-02-29', '2004-02-29'],
  ['2024-01-31', '2024-02-29'],
  ['2024-01-31', '2024-03-30'],
  ['2024-05-15', '2024-05-14'],
  ['2100-01-30', '2101-03-30'],
  ['9899-01-31', '9999-01-31'],
] as const;
const rates = ['-1', '-0.5', '0', '0.05', '1', '10'] as const;
const scales = [1n, UNIT, 10n ** 36n, 10n ** 48n];
function inputs(seed: number): GoalInput[] {
  const next = random(seed);
  return Array.from({ length: 24 }, (_, i) => {
    const scale = scales[i % scales.length]!;
    const target = BigInt(1 + next() % 1000) * scale;
    const [currentDate, targetDate] = dates[i % dates.length]!;
    return {
      targetValue: money(target),
      currentValue: money(target * BigInt(next() % 151) / 100n),
      plannedMonthlyContribution: money(BigInt(next() % 200) * scale),
      annualReturnAssumption: rates[i % rates.length]!,
      currentDate, targetDate,
    };
  });
}
const numericFields = [
  'progressPct', 'amountRemaining', 'requiredContribution',
  'fundingRequiredContribution', 'projectedValueAtTargetDate',
  'shortfallAtTargetDate', 'surplusAtTargetDate',
] as const satisfies readonly (keyof GoalEvaluation)[];

function validDate(value: string) {
  expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  expect(Number.isFinite(parsed.getTime())).toBe(true);
  // ECMAScript normalizes impossible dates, so round-trip equality detects them.
  expect(parsed.toISOString().slice(0, 10)).toBe(value);
}

describe.each(SEEDS)('seeded projection invariants, seed=%i', seed => {
  it('does not leak scenario state or emit negative gaps, NaN, Infinity, or impossible dates', () => {
    for (const input of inputs(seed)) {
      const frozen = Object.freeze(input);
      const before = { ...input };
      const result = evaluateGoal(frozen);
      // An unrelated intervening evaluation catches a leaked cache keyed only by
      // period, while frozen input catches mutation of the caller's plan.
      evaluateGoal({ ...input, annualReturnAssumption: '0', currentValue: '0' });
      expect(evaluateGoal(frozen)).toEqual(result);
      expect(input).toEqual(before);
      for (const field of numericFields) expect(units(result[field])).toBeGreaterThanOrEqual(0n);
      expect(Number.isInteger(result.contributionPeriodsRemaining)).toBe(true);
      expect(result.contributionPeriodsRemaining).toBeGreaterThanOrEqual(0);
      expect(result.contributionPeriodsRemaining).toBeLessThanOrEqual(1200);
      expect(result.shortfallAtTargetDate === '0' || result.surplusAtTargetDate === '0').toBe(true);
      const remaining = units(input.targetValue) - units(input.currentValue);
      expect(units(result.amountRemaining)).toBe(remaining > 0n ? remaining : 0n);
      if (result.projectedCompletionDate !== null) {
        validDate(result.projectedCompletionDate);
        expect(result.projectedCompletionDate >= input.currentDate).toBe(true);
        expect(['completed', 'projected']).toContain(result.projectedCompletionStatus);
      } else {
        expect(['unreachable', 'beyond_horizon']).toContain(result.projectedCompletionStatus);
      }
    }
  });

  it('never worsens a projection when contributions rise or demands more payment when capital rises', () => {
    for (const input of inputs(seed)) {
      const result = evaluateGoal(input);
      const moreContribution = evaluateGoal({ ...input, plannedMonthlyContribution: money(units(input.plannedMonthlyContribution) + units(input.targetValue)) });
      expect(units(moreContribution.projectedValueAtTargetDate)).toBeGreaterThanOrEqual(units(result.projectedValueAtTargetDate));
      expect(units(moreContribution.shortfallAtTargetDate)).toBeLessThanOrEqual(units(result.shortfallAtTargetDate));
      expect(units(moreContribution.surplusAtTargetDate)).toBeGreaterThanOrEqual(units(result.surplusAtTargetDate));
      // Required payment is a property of capital, target and deadline, not the
      // current planned payment; accidental use of planned funds in the solver fails.
      expect(moreContribution.requiredContribution).toBe(result.requiredContribution);
      expect(moreContribution.fundingRequiredContribution).toBe(result.fundingRequiredContribution);
      if (result.projectedCompletionDate !== null) {
        expect(moreContribution.projectedCompletionDate).not.toBeNull();
        expect(moreContribution.projectedCompletionDate! <= result.projectedCompletionDate).toBe(true);
      }
      const moreCapital = evaluateGoal({ ...input, currentValue: money(units(input.currentValue) + units(input.targetValue) / 2n) });
      expect(units(moreCapital.requiredContribution)).toBeLessThanOrEqual(units(result.requiredContribution));
      expect(units(moreCapital.fundingRequiredContribution)).toBeLessThanOrEqual(units(result.fundingRequiredContribution));
      const higherTarget = evaluateGoal({ ...input, targetValue: money(units(input.targetValue) * 2n) });
      expect(units(higherTarget.requiredContribution)).toBeGreaterThanOrEqual(units(result.requiredContribution));
      expect(units(higherTarget.fundingRequiredContribution)).toBeGreaterThanOrEqual(units(result.fundingRequiredContribution));
      // Changing an illustrative return must never improve the zero-return health.
      const zeroReturn = evaluateGoal({ ...input, annualReturnAssumption: '0' });
      expect(result.fundingHealth).toBe(zeroReturn.fundingHealth);
      expect(result.fundingRequiredContribution).toBe(zeroReturn.fundingRequiredContribution);
      if (result.contributionPeriodsRemaining > 0 && units(input.currentValue) < units(input.targetValue)) {
        // Feeding the quoted payment back through the real projection catches
        // downward rounding and omitted contribution growth without copying PMT.
        const funded = evaluateGoal({ ...input, plannedMonthlyContribution: result.requiredContribution });
        expect(funded.shortfallAtTargetDate).toBe('0');
      }
    }
  });

  it('recognizes equality and overfunding immediately even with total assumed loss or a past deadline', () => {
    for (const input of inputs(seed)) {
      for (const currentValue of [input.targetValue, money(units(input.targetValue) + 1n)]) {
        expect(evaluateGoal({ ...input, currentValue })).toMatchObject({
          amountRemaining: '0', requiredContribution: '0', fundingRequiredContribution: '0',
          projectedCompletionStatus: 'completed', projectedCompletionDate: input.currentDate,
          fundingHealth: 'COMPLETED',
        });
      }
      // One atomic unit below a large target must remain a real gap; Number
      // coercion and fuzzy completion comparisons both erase this distinction.
      const below = evaluateGoal({ ...input, currentValue: money(units(input.targetValue) - 1n), plannedMonthlyContribution: '0', annualReturnAssumption: '0' });
      expect(below.amountRemaining).toBe('0.000000000000000001');
      expect(below.fundingHealth).toBe('BEHIND');
      expect(below.projectedCompletionStatus).toBe('unreachable');
    }
  });
});

// Hand-checked calendar fixtures; no copied month-counting or interest algorithm.
it.each([
  ['1900-01-31', '1900-02-28', '1900-03-31'],
  ['2000-01-31', '2000-02-29', '2000-03-31'],
  ['2024-01-30', '2024-02-29', '2024-03-30'],
  ['2024-01-29', '2024-02-29', '2024-03-29'],
  ['2024-03-31', '2024-04-30', '2024-05-31'],
  ['2099-12-31', '2100-01-31', '2100-02-28'],
  ['2100-01-31', '2100-02-28', '2100-03-31'],
  ['9899-01-31', '9899-02-28', '9899-03-31'],
])('does not drift the original calendar anchor after %s', (currentDate, first, second) => {
  const input: GoalInput = { currentDate, targetDate: second, targetValue: '2', currentValue: '0', plannedMonthlyContribution: '1', annualReturnAssumption: '0' };
  const later = evaluateGoal(input);
  expect(later.projectedCompletionDate).toBe(second);
  expect(later.contributionPeriodsRemaining).toBe(2);
  expect(later.requiredContribution).toBe('1');
  const earlier = evaluateGoal({ ...input, targetDate: first });
  expect(earlier.requiredContribution).toBe('2');
  expect(earlier.fundingRequiredContribution).toBe('2');
  expect(evaluateGoal({ ...input, plannedMonthlyContribution: '2' }).projectedCompletionDate).toBe(first);
  for (const date of [first, second]) validDate(date);
});
