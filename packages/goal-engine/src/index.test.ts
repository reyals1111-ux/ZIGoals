import { describe, expect, it } from 'vitest';
import { evaluateGoal } from './index';

const base = {
  targetValue: '1200', currentValue: '0', currentDate: '2024-01-31',
  targetDate: '2025-01-31', plannedMonthlyContribution: '100', annualReturnAssumption: '0',
};

describe('evaluateGoal', () => {
  it('funds twelve anchored calendar periods exactly at zero return', () => {
    expect(evaluateGoal(base)).toMatchObject({
      progressPct: '0', amountRemaining: '1200', contributionPeriodsRemaining: 12,
      requiredContribution: '100', fundingRequiredContribution: '100',
      projectedValueAtTargetDate: '1200', shortfallAtTargetDate: '0', surplusAtTargetDate: '0',
      projectedCompletionDate: '2025-01-31', fundingHealth: 'ON_TRACK',
    });
  });
});

// Literals below are hand-calculated; the annual rates are exactly 1.01^12-1 and .99^12-1.
describe('illustrative returns remain independent of funding health', () => {
  it.each([
    ['0.126825030131969720661201', '1110', '490'],
    ['-0.113615128283870719341199', '1090', '510'],
  ])('compounds principal before the end-of-period contribution at rate %s', (rate, projected, required) => {
    expect(evaluateGoal({ ...base, targetValue: '1500', currentValue: '1000', targetDate: '2024-02-29', annualReturnAssumption: rate })).toMatchObject({
      projectedValueAtTargetDate: projected, requiredContribution: required,
      fundingRequiredContribution: '500', fundingHealth: 'BEHIND',
    });
  });
  it('compounds multiple periods without rounding money each month', () => {
    expect(evaluateGoal({ ...base, targetValue: '2000', currentValue: '1000', targetDate: '2024-03-31', annualReturnAssumption: '0.126825030131969720661201' })).toMatchObject({ projectedValueAtTargetDate: '1221.1' });
  });
  it('requires zero contributions when assumed growth alone covers the target', () => {
    expect(evaluateGoal({ ...base, targetValue: '1005', currentValue: '1000', plannedMonthlyContribution: '0', targetDate: '2024-02-29', annualReturnAssumption: '0.126825030131969720661201' })).toMatchObject({ requiredContribution: '0', fundingRequiredContribution: '5', fundingHealth: 'BEHIND', projectedCompletionDate: '2024-02-29' });
  });
  it('keeps zero-return health on track despite a negative scenario shortfall', () => {
    expect(evaluateGoal({ ...base, annualReturnAssumption: '-0.5' })).toMatchObject({ fundingHealth: 'ON_TRACK' });
    expect(evaluateGoal({ ...base, annualReturnAssumption: '-0.5' }).shortfallAtTargetDate).not.toBe('0');
  });
});

describe('funding status', () => {
  it.each([
    ['0', '100', 'ON_TRACK'], ['0', '105', 'ON_TRACK'], ['0', '120', 'AHEAD'],
    ['0', '99', 'BEHIND'], ['1200', '0', 'COMPLETED'], ['1500', '0', 'COMPLETED'],
  ])('uses actual zero-return periods for current=%s contribution=%s', (currentValue, plannedMonthlyContribution, fundingHealth) => {
    expect(evaluateGoal({ ...base, currentValue, plannedMonthlyContribution }).fundingHealth).toBe(fundingHealth);
  });
  it('shows overfunding progress without making remaining or required negative', () => {
    expect(evaluateGoal({ ...base, currentValue: '1500', plannedMonthlyContribution: '0' })).toMatchObject({
      progressPct: '125', amountRemaining: '0', requiredContribution: '0', fundingRequiredContribution: '0', surplusAtTargetDate: '300', shortfallAtTargetDate: '0', projectedCompletionDate: '2024-01-31', projectedCompletionStatus: 'completed',
    });
  });
  it.each(['2024-01-31', '2023-12-31'])('treats an unmet deadline %s as an immediate gap', targetDate => {
    expect(evaluateGoal({ ...base, currentValue: '200', targetDate })).toMatchObject({ contributionPeriodsRemaining: 0, requiredContribution: '1000', fundingRequiredContribution: '1000', requiredContributionTiming: 'immediate', projectedValueAtTargetDate: '200', fundingHealth: 'BEHIND' });
  });
});

describe('calendar anchor', () => {
  it.each([
    ['2023-01-31', '2023-02-28', 1], ['2024-01-31', '2024-02-29', 1],
    ['2024-01-31', '2024-03-30', 1], ['2024-01-31', '2024-03-31', 2],
    ['2024-01-30', '2024-03-29', 1], ['2024-01-30', '2024-03-30', 2],
    ['2023-01-29', '2023-03-28', 1], ['2023-01-29', '2023-03-29', 2],
    ['2024-02-29', '2025-02-28', 12], ['2024-05-15', '2024-06-14', 0],
    ['2024-05-15', '2024-06-15', 1], ['2024-05-15', '2024-06-30', 1],
  ])('counts %s through %s as %i full scheduled contributions', (currentDate, targetDate, periods) => {
    expect(evaluateGoal({ ...base, currentDate, targetDate }).contributionPeriodsRemaining).toBe(periods);
  });
  it('restores the original day after a clamped February completion', () => {
    expect(evaluateGoal({ ...base, targetValue: '200' }).projectedCompletionDate).toBe('2024-03-31');
  });
});

describe('bounded completion simulation', () => {
  it.each(['0', '-0.5', '0.5'])('identifies zero capital and zero contribution as unreachable at %s', annualReturnAssumption => {
    expect(evaluateGoal({ ...base, plannedMonthlyContribution: '0', annualReturnAssumption })).toMatchObject({ projectedCompletionDate: null, projectedCompletionStatus: 'unreachable' });
  });
  it('identifies a declining scenario whose steady state cannot meet the goal', () => {
    expect(evaluateGoal({ ...base, targetValue: '20000', annualReturnAssumption: '-0.113615128283870719341199' })).toMatchObject({ projectedCompletionDate: null, projectedCompletionStatus: 'unreachable' });
  });
  it('does not mistake an asymptote equal to target for a reachable goal', () => {
    expect(evaluateGoal({ ...base, targetValue: '10000', annualReturnAssumption: '-0.113615128283870719341199' })).toMatchObject({ projectedCompletionDate: null, projectedCompletionStatus: 'unreachable' });
  });
  it('distinguishes eventual completion beyond 1200 periods from impossible', () => {
    expect(evaluateGoal({ ...base, targetValue: '1201', plannedMonthlyContribution: '1' })).toMatchObject({ projectedCompletionDate: null, projectedCompletionStatus: 'beyond_horizon', completionHorizonPeriods: 1200 });
  });
  it('includes a completion at the horizon boundary', () => {
    expect(evaluateGoal({ ...base, plannedMonthlyContribution: '1' })).toMatchObject({ projectedCompletionDate: '2124-01-31', projectedCompletionStatus: 'projected' });
  });
  it('supports complete monthly loss and a sufficient end-period contribution', () => {
    expect(evaluateGoal({ ...base, targetValue: '100', annualReturnAssumption: '-1' })).toMatchObject({ projectedValueAtTargetDate: '100', requiredContribution: '100', projectedCompletionDate: '2024-02-29' });
  });
});

describe('precision and purity', () => {
  it('retains integer precision far above Number.MAX_SAFE_INTEGER', () => {
    expect(evaluateGoal({ ...base, targetValue: '999999999999999999999999999999999999', currentValue: '999999999999999999999999999999999998', plannedMonthlyContribution: '0' })).toMatchObject({ amountRemaining: '1', shortfallAtTargetDate: '1' });
  });
  it('retains the smallest permitted fractional unit', () => {
    expect(evaluateGoal({ ...base, targetValue: '0.000000000000000003', currentValue: '0.000000000000000001', plannedMonthlyContribution: '0.000000000000000001', targetDate: '2024-03-31' })).toMatchObject({ amountRemaining: '0.000000000000000002', requiredContribution: '0.000000000000000001', projectedValueAtTargetDate: '0.000000000000000003', fundingHealth: 'ON_TRACK' });
  });
  it('rounds required contributions upwards so repeating thirds cannot underfund', () => {
    expect(evaluateGoal({ ...base, targetValue: '1', targetDate: '2024-04-30', plannedMonthlyContribution: '0.333333333333333333' })).toMatchObject({ requiredContribution: '0.333333333333333334', fundingRequiredContribution: '0.333333333333333334', fundingHealth: 'BEHIND', shortfallAtTargetDate: '0.000000000000000001' });
  });
  it('produces identical results without mutating frozen input or depending on time', () => {
    const frozen = Object.freeze({ ...base, annualReturnAssumption: '0.05' });
    expect(evaluateGoal(frozen)).toEqual(evaluateGoal(frozen));
  });
});

describe('explicit input rejection', () => {
  it.each([
    { targetValue: '0' }, { targetValue: '-1' }, { currentValue: '-1' }, { plannedMonthlyContribution: '-1' },
    { currentValue: 'NaN' }, { currentValue: 'Infinity' }, { currentValue: '1e1000000' }, { currentValue: ' 1' },
    { currentValue: '1.0000000000000000001' }, { currentValue: '1000000000000000000000000000000000001' },
    { currentValue: 0.1 }, { annualReturnAssumption: 'NaN' }, { annualReturnAssumption: Infinity },
    { annualReturnAssumption: '-1.01' }, { annualReturnAssumption: '10.01' },
    { currentDate: '2023-02-29' }, { currentDate: '2024-02-30' }, { currentDate: '2024-13-01' },
    { currentDate: '2024-1-01' }, { currentDate: '2024-01-31T00:00:00Z' },
    { currentDate: '9900-01-01' }, { targetDate: '2124-02-01' }, { targetDate: 'garbage' },
  ])('rejects invalid field override %j', override => {
    expect(() => evaluateGoal({ ...base, ...override } as never)).toThrow();
  });
  it('rejects a missing input object', () => {
    expect(() => evaluateGoal(null as never)).toThrow();
  });
  it('supports a finite numeric fractional annual assumption', () => {
    expect(evaluateGoal({ ...base, annualReturnAssumption: 0.05 })).toEqual(evaluateGoal({ ...base, annualReturnAssumption: '0.05' }));
  });
});

describe('required annuity and numeric rate boundaries', () => {
  it.each([
    ['0.126825030131969720661201', '1422.1'],
    ['-0.113615128283870719341199', '1378.1'],
  ])('includes the growth of earlier contributions when solving required funding at %s', (annualReturnAssumption, targetValue) => {
    expect(evaluateGoal({ ...base, currentValue: '1000', targetDate: '2024-03-31', annualReturnAssumption, targetValue }).requiredContribution).toBe('200');
  });
  it('accepts finite numeric annual rates rendered exponentially by JavaScript', () => {
    expect(evaluateGoal({ ...base, annualReturnAssumption: 1e-7 })).toEqual(evaluateGoal({ ...base, annualReturnAssumption: '0.0000001' }));
  });
});
