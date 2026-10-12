import Decimal from 'decimal.js';
import * as z from 'zod';

/**
 * The compound interest calculator (Session AA-Cloud Part 3). Exact decimal maths (decimal.js at 40 significant digits),
 * period by period, with the contribution's own frequency and the account's compounding frequency independent: each
 * contribution period earns the effective rate (1 + r/n)^(n/k) − 1, where n is compoundings and k contributions a year.
 * Contributions come at the start or the end of each period and may rise each year by a percentage; an inflation rate,
 * when given, also shows each year's value in today's money. Every result is an estimate from the person's own
 * assumptions; returns are not guaranteed, and nothing here is advice.
 */
const D = Decimal.clone({precision: 40, rounding: Decimal.ROUND_HALF_EVEN});
export const COMPOUNDING = {yearly: 1, quarterly: 4, monthly: 12, daily: 365} as const;
export const FREQUENCY = {weekly: 52, monthly: 12, yearly: 1} as const;
export type Compounding = keyof typeof COMPOUNDING;
export type Frequency = keyof typeof FREQUENCY;
export const MILESTONES = [10_000, 100_000, 1_000_000] as const;
export const LIMITS = {years: 60, ratePercent: 100, increasePercent: 50, inflationPercent: 25, amount: '1000000000000'} as const;

const amount = z.string().regex(/^\d{1,13}(\.\d{1,2})?$/, 'Write an amount with up to two decimals.');
const percent = (min: number, max: number) => z.number().finite().min(min).max(max);
export const compoundInputSchema = z.looseObject({
  start: amount,
  contribution: amount,
  frequency: z.enum(['weekly', 'monthly', 'yearly']),
  ratePercent: percent(-50, LIMITS.ratePercent),
  years: z.number().int().min(1).max(LIMITS.years),
  compounding: z.enum(['yearly', 'quarterly', 'monthly', 'daily']),
  timing: z.enum(['start', 'end']),
  increasePercent: percent(0, LIMITS.increasePercent),
  inflationPercent: percent(0, LIMITS.inflationPercent),
  currency: z.enum(['USD', 'EUR']),
});
export type CompoundInput = z.infer<typeof compoundInputSchema>;
export const DEFAULT_INPUT: CompoundInput = {start: '1000', contribution: '200', frequency: 'monthly', ratePercent: 5, years: 20, compounding: 'monthly', timing: 'end', increasePercent: 0, inflationPercent: 0, currency: 'USD'};

export type YearRow = {year: number; contributedThisYear: string; contributed: string; growth: string; balance: string; real: string | null};
export type Milestone = {threshold: number; year: number; period: number; periodsPerYear: number};
export type CompoundResult = {final: string; contributed: string; growth: string; realFinal: string | null; rows: YearRow[]; milestones: Milestone[]; perPeriodRate: string};

/** The effective rate for one contribution period. */
export function periodRate(ratePercent: number, compounding: Compounding, frequency: Frequency): Decimal {
  const r = new D(ratePercent).div(100), n = COMPOUNDING[compounding], k = FREQUENCY[frequency];
  if (r.isZero()) return new D(0);
  const base = new D(1).plus(r.div(n));
  if (base.lte(0)) throw Error('That return would lose everything in one period.');
  return base.pow(new D(n).div(k)).minus(1);
}

export function compound(raw: CompoundInput): CompoundResult {
  const input = compoundInputSchema.parse(raw);
  const k = FREQUENCY[input.frequency], rate = periodRate(input.ratePercent, input.compounding, input.frequency);
  const growthFactor = new D(1).plus(rate), increase = new D(1).plus(new D(input.increasePercent).div(100)), inflation = new D(1).plus(new D(input.inflationPercent).div(100));
  let balance = new D(input.start), contributed = new D(input.start), payment = new D(input.contribution);
  const rows: YearRow[] = [], milestones: Milestone[] = [], pending: number[] = MILESTONES.filter(m => balance.lt(m));
  let period = 0;
  for (let year = 1; year <= input.years; year++) {
    let thisYear = new D(0);
    for (let p = 0; p < k; p++) {
      if (input.timing === 'start') { balance = balance.plus(payment); balance = balance.times(growthFactor); }
      else { balance = balance.times(growthFactor); balance = balance.plus(payment); }
      contributed = contributed.plus(payment); thisYear = thisYear.plus(payment); period++;
      while (pending.length && balance.gte(pending[0]!)) milestones.push({threshold: pending.shift()!, year, period, periodsPerYear: k});
    }
    const real = input.inflationPercent > 0 ? balance.div(inflation.pow(year)) : null;
    rows.push({year, contributedThisYear: thisYear.toFixed(2), contributed: contributed.toFixed(2), growth: balance.minus(contributed).toFixed(2), balance: balance.toFixed(2), real: real ? real.toFixed(2) : null});
    payment = payment.times(increase);
  }
  const last = rows.at(-1)!;
  return {final: last.balance, contributed: last.contributed, growth: last.growth, realFinal: last.real, rows, milestones, perPeriodRate: rate.toSignificantDigits(12).toString()};
}

/** "What if": the same plan with another return, or started earlier (more years to the same end). */
export type WhatIf = {id: string; label: string; input: CompoundInput};
export function whatIfs(input: CompoundInput): WhatIf[] {
  const out: WhatIf[] = [];
  if (input.ratePercent + 2 <= LIMITS.ratePercent) out.push({id: 'higher', label: `${fmtPct(input.ratePercent + 2)} return`, input: {...input, ratePercent: round2(input.ratePercent + 2)}});
  if (input.ratePercent - 2 >= -50) out.push({id: 'lower', label: `${fmtPct(input.ratePercent - 2)} return`, input: {...input, ratePercent: round2(input.ratePercent - 2)}});
  if (input.years + 5 <= LIMITS.years) out.push({id: 'earlier', label: 'Started 5 years earlier', input: {...input, years: input.years + 5}});
  return out;
}
const round2 = (n: number) => Math.round(n * 100) / 100;
const fmtPct = (n: number) => `${round2(n)} %`;
/** A milestone's moment in words: "Year 7, period 3 of 12". */
export const milestoneWhen = (m: Milestone) => m.periodsPerYear === 1 ? `Year ${m.year}` : `Year ${m.year}, ${m.periodsPerYear === 12 ? 'month' : 'week'} ${m.period - (m.year - 1) * m.periodsPerYear}`;
