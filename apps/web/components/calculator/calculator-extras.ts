import Decimal from 'decimal.js';
import {compound, LIMITS, type CompoundInput, type CompoundResult} from '../../lib/compound/engine';
import {parseNumberInput} from '../../lib/numbers/parse';
import {CSV_FORMULA_START} from '../../lib/export/csv-safe';

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

// Session AL (security delta review B, SB-7): the shared formula guard (lib/export/csv-safe.ts) for any text cell; a plain
// number (a negative one too) stays a number, so the format a spreadsheet reads is unchanged.
const csvCell = (v: string | number) => { const raw = String(v), t = CSV_FORMULA_START.test(raw) && !/^-?\d+(?:\.\d+)?$/.test(raw) ? `'${raw}` : raw; return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
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

/**
 * Session AL final pass (N-TK-18, AL-DECIMAL-INPUT-001): what is wrong with the "Another return" box, in words, or null
 * (empty is fine: no extra line). "-abc5" had stayed in the box with no word and no line drawn.
 */
export function customReturnIssue(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const read = parseNumberInput(text, {allowNegative: true});
  if (!read.ok || !Number.isFinite(read.value)) return 'Enter a yearly return in percent, like 7 or -2.5.';
  if (read.value < -50 || read.value > LIMITS.ratePercent) return `Enter a yearly return from -50 to ${LIMITS.ratePercent} %.`;
  return null;
}
