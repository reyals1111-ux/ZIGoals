import Decimal from 'decimal.js';

// A private constructor prevents another application's Decimal.set from changing results.
const D = Decimal.clone({ precision: 160, rounding: Decimal.ROUND_HALF_UP });
const HORIZON = 1200;
const ZERO = new D(0);

export interface GoalInput {
  targetValue: string;
  currentValue: string;
  currentDate: string;
  targetDate: string;
  plannedMonthlyContribution: string;
  /** Fractional effective annual return: 0.05 means 5%. Illustrative only. */
  annualReturnAssumption: string | number;
}

export type FundingHealth = 'COMPLETED' | 'AHEAD' | 'ON_TRACK' | 'BEHIND';
export type ProjectedCompletionStatus = 'completed' | 'projected' | 'unreachable' | 'beyond_horizon';
export interface GoalEvaluation {
  progressPct: string;
  amountRemaining: string;
  contributionPeriodsRemaining: number;
  requiredContribution: string;
  fundingRequiredContribution: string;
  requiredContributionTiming: 'monthly' | 'immediate';
  projectedValueAtTargetDate: string;
  shortfallAtTargetDate: string;
  surplusAtTargetDate: string;
  projectedCompletionDate: string | null;
  projectedCompletionStatus: ProjectedCompletionStatus;
  completionHorizonPeriods: number;
  fundingHealth: FundingHealth;
  fundingHealthExplanation: string;
  explanation: string;
}

interface CalendarDate { year: number; month: number; day: number }

function daysInMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseDate(value: unknown, field: string): CalendarDate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`${field} must be a calendar date in YYYY-MM-DD format`);
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError(`${field} is not a valid calendar date in 1900–9999`);
  }
  return { year, month, day };
}

function scheduledDate(anchor: CalendarDate, period: number): string {
  const ordinal = anchor.year * 12 + anchor.month - 1 + period;
  const year = Math.floor(ordinal / 12);
  const month = ordinal % 12 + 1;
  const day = Math.min(anchor.day, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function money(value: unknown, field: string, positive = false): Decimal {
  if (typeof value !== 'string' || value.length > 56 || !/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(value)) {
    throw new TypeError(`${field} must be a nonnegative plain decimal string with at most 18 fractional digits`);
  }
  const parsed = new D(value);
  if (parsed.gt('1e36') || (positive && parsed.isZero())) {
    throw new RangeError(`${field} must be ${positive ? 'greater than zero and ' : ''}at most 10^36`);
  }
  return parsed;
}

function annualRate(value: unknown): Decimal {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('annualReturnAssumption must be finite');
    value = new D(value).toFixed();
  }
  if (typeof value !== 'string' || value.length > 40 || !/^-?(0|[1-9]\d*)(\.\d{1,36})?$/.test(value)) {
    throw new TypeError('annualReturnAssumption must be a plain decimal with at most 36 fractional digits');
  }
  const rate = new D(value);
  if (rate.lt(-1) || rate.gt(10)) throw new RangeError('annualReturnAssumption must be between -1 and 10');
  return rate;
}

function output(value: Decimal, rounding: Decimal.Rounding = Decimal.ROUND_HALF_UP): string {
  return value.toDecimalPlaces(18, rounding).toFixed();
}

/** Deterministic planning only; does not predict or promise investment performance. */
export function evaluateGoal(input: GoalInput): GoalEvaluation {
  if (!input || typeof input !== 'object') throw new TypeError('Goal input is required');
  const target = money(input.targetValue, 'targetValue', true);
  const current = money(input.currentValue, 'currentValue');
  const contribution = money(input.plannedMonthlyContribution, 'plannedMonthlyContribution');
  const rate = annualRate(input.annualReturnAssumption);
  const anchor = parseDate(input.currentDate, 'currentDate');
  parseDate(input.targetDate, 'targetDate');
  if (anchor.year > 9899) throw new RangeError('currentDate must leave room for the 100-year completion horizon');
  if (input.targetDate > scheduledDate(anchor, HORIZON)) throw new RangeError('targetDate exceeds the 1200-month planning horizon');

  let periods = 0;
  while (periods < HORIZON && scheduledDate(anchor, periods + 1) <= input.targetDate) periods++;
  // Round only the rate to 80 places; retain 160-digit internal money precision.
  const annualGrowth = rate.plus(1);
  const growth = annualGrowth.pow(new D(1).div(12)).toDecimalPlaces(80);
  const remaining = D.max(target.minus(current), ZERO);
  const completed = current.gte(target);

  // Express q^n as (1 + annualReturn)^floor(n/12) × q^(n mod 12).
  // Complete years use the supplied annual factor, never the rounded q^12.
  // Summing those same powers gives the end-of-period contribution annuity.
  // This preserves exact annual thresholds without tolerating real money gaps.
  const powers: Decimal[] = [new D(1)];
  const annuities: Decimal[] = [ZERO];
  function scenarioAt(period: number) {
    while (powers.length <= period) {
      const n = powers.length;
      powers.push(n >= 12 ? powers[n - 12]!.mul(annualGrowth) : powers[n - 1]!.mul(growth));
      annuities.push(annuities[n - 1]!.plus(powers[n - 1]!));
    }
    const principalGrowth = current.mul(powers[period]!);
    const contributionFactor = annuities[period]!;
    return { principalGrowth, contributionFactor, projected: principalGrowth.plus(contribution.mul(contributionFactor)) };
  }
  const { projected, principalGrowth, contributionFactor } = scenarioAt(periods);
  const required = completed ? ZERO : periods === 0 ? remaining : D.max(target.minus(principalGrowth).div(contributionFactor), ZERO);
  const fundingRequired = periods === 0 ? remaining : remaining.div(periods);
  const zeroReturnFinal = current.plus(contribution.mul(periods));
  let fundingHealth: FundingHealth;
  let fundingHealthExplanation: string;
  if (completed) {
    fundingHealth = 'COMPLETED';
    fundingHealthExplanation = 'Your current value has already reached the target.';
  } else if (periods === 0) {
    fundingHealth = 'BEHIND';
    fundingHealthExplanation = 'No scheduled contributions remain before the deadline. The remaining amount is needed immediately, assuming zero return.';
  } else if (zeroReturnFinal.lt(target)) {
    fundingHealth = 'BEHIND';
    fundingHealthExplanation = 'Your scheduled contributions fall short by the deadline, assuming zero future return.';
  } else if (current.plus(contribution.mul(periods - 1)).gte(target)) {
    fundingHealth = 'AHEAD';
    fundingHealthExplanation = 'Your plan reaches the target at least one full scheduled contribution period before the deadline, assuming zero future return.';
  } else {
    fundingHealth = 'ON_TRACK';
    fundingHealthExplanation = 'Your plan reaches the target in the final scheduled contribution period, assuming zero future return.';
  }

  let completionDate: string | null = completed ? input.currentDate : null;
  let completionStatus: ProjectedCompletionStatus = completed ? 'completed' : 'beyond_horizon';
  if (!completed) {
    // With q<1, a starting value below target cannot cross an equilibrium at/below
    // target. q=0 is special: equilibrium is reached in the very next period.
    const unreachable = growth.isZero() ? contribution.lt(target)
      : growth.lt(1) ? contribution.div(new D(1).minus(growth)).lte(target)
      : contribution.isZero() && (growth.eq(1) || current.isZero());
    if (unreachable) {
      completionStatus = 'unreachable';
    } else {
      for (let period = 1; period <= HORIZON; period++) {
        if (scenarioAt(period).projected.gte(target)) {
          completionDate = scheduledDate(anchor, period);
          completionStatus = 'projected';
          break;
        }
      }
    }
  }
  const completionExplanation = completionStatus === 'unreachable'
    ? 'The assumed constant return and contribution cannot reach this target.'
    : completionStatus === 'beyond_horizon'
      ? 'The target is not reached within the 1200-month completion horizon; it may be reached later.'
      : completionStatus === 'completed'
        ? 'The target is already reached today.'
        : 'The projected completion date uses the assumed return and scheduled contributions.';

  return {
    progressPct: output(current.div(target).mul(100)),
    amountRemaining: output(remaining),
    contributionPeriodsRemaining: periods,
    requiredContribution: output(required, Decimal.ROUND_CEIL),
    fundingRequiredContribution: output(fundingRequired, Decimal.ROUND_CEIL),
    requiredContributionTiming: periods === 0 ? 'immediate' : 'monthly',
    projectedValueAtTargetDate: output(projected),
    shortfallAtTargetDate: output(D.max(target.minus(projected), ZERO)),
    surplusAtTargetDate: output(D.max(projected.minus(target), ZERO)),
    projectedCompletionDate: completionDate,
    projectedCompletionStatus: completionStatus,
    completionHorizonPeriods: HORIZON,
    fundingHealth,
    fundingHealthExplanation,
    explanation: `Illustrative scenario only; returns are not guaranteed. ${completionExplanation} End-of-period monthly contributions use the original calendar day, clamped for short months, with no partial-month return or contribution. ${periods === 0 ? 'Required contribution is an immediate funding gap.' : 'Required contribution is the recurring monthly amount under this scenario.'}`,
  };
}
