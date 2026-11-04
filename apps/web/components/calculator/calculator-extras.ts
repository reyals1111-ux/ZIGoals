import Decimal from 'decimal.js';
import {compound, type CompoundInput, type CompoundResult} from '../../lib/compound/engine';

/**
 * Session AL (Part 15, C-TK-29 / P-TK-95): what regular contribution would reach a target in the same plan, keeping
 * every other assumption. The balance grows with the contribution, so a bisection on whole cents finds the smallest
 * one that reaches it. Null when the start alone already reaches it ('reached'), or when even the largest amount the
 * calculator models would not ('out-of-range').
 */
export type Solved = {contribution: string} | {reached: true} | {outOfRange: true};
const MAX_CONTRIBUTION = new Decimal('1000000000000');
export function contributionFor(input: CompoundInput, target: string): Solved {
  const goal = new Decimal(target);
  const at = (c: Decimal) => { try { return new Decimal(compound({...input, contribution: c.toFixed(2)}).final); } catch { return null; } };
  const none = at(new Decimal(0));
  if (none && none.gte(goal)) return {reached: true};
  const most = at(MAX_CONTRIBUTION);
  if (!most || most.lt(goal)) return {outOfRange: true};
  let low = new Decimal(0), high = MAX_CONTRIBUTION;
  // Cents: about 47 halvings from a trillion; a few more for safety.
  for (let i = 0; i < 60 && high.minus(low).gt('0.01'); i++) {
    const mid = low.plus(high).div(2).toDecimalPlaces(2, Decimal.ROUND_DOWN), value = at(mid);
    if (value && value.gte(goal)) high = mid; else low = mid;
  }
  return {contribution: high.toFixed(2)};
}

const csvCell = (v: string | number) => { const t = String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
/**
 * Session AL (Part 15, C-TK-31 / P-TK-97): the year-by-year table as a CSV the person can keep or print, with the
 * assumptions on top so the numbers never travel without them. Plain decimals (no symbols) so a spreadsheet reads them.
 */
export function calculatorCsv(input: CompoundInput, result: CompoundResult, assumptions: string): string {
  const real = result.realFinal !== null;
  const lines = [
    ['ZIGoals compound interest estimate (not a promise; returns are not guaranteed)'],
    [assumptions],
    [],
    ['Year', 'Months', `Put in that year (${input.currency})`, `Put in so far (${input.currency})`, `Growth so far (${input.currency})`, `Balance (${input.currency})`, ...(real ? [`In today's money (${input.currency})`] : [])],
    ...result.rows.map(r => [r.year, r.months ?? '', r.contributedThisYear, r.contributed, r.growth, r.balance, ...(real ? [r.real ?? ''] : [])]),
  ];
  return lines.map(l => l.map(csvCell).join(',')).join('\n') + '\n';
}
