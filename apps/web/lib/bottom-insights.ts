/**
 * Summaries for the sections at the bottom of each page (UI design pass, Part 8). Real records only, no
 * projections or advice. A day without a record is null ("no entry"), never zero; units and currencies
 * stay separate.
 */
import {splitWealthTotals} from './wealth-total';
import type {wealthOverview} from './wealth';
import {portfolioComposition} from './product-insights';
// CI13 (weights): the week, rhythm, timeline and Health summaries are in their own modules (each page loads only its own);
// re-exported here unchanged.
export {lastDays, WEEKDAYS, weekAcross, habitRhythm, weekWealthChange} from './bottom-week';
export {goalTimeline} from './bottom-goal-timeline';
export {healthWeek, careRows, loggedDaysOfWeek, type HealthWeekDay, type CareRow} from './bottom-health-week';

/** Wealth: how the known value of the headline currency is spread across asset classes, and valuation coverage. */
export function wealthAllocation(overview: ReturnType<typeof wealthOverview>) {
  const {primary} = splitWealthTotals(overview.subtotals), valued = overview.rows.filter(r => r.value !== undefined).length;
  // Session AF Gate C (design critique 1): the same class shares as Wealth's composition (one class map, one rounding), so a
  // class reads the same figure, to the same two decimals, in both places; largest first.
  const group = primary && primary.value > 0n ? portfolioComposition(overview).find(g => g.currency === primary.currency) : undefined;
  const classes = group ? group.segments.filter(s => s.value > 0n).map(s => ({assetClass: s.label, value: s.value, share: s.basisPoints / 100})).sort((a, b) => b.share - a.share) : [];
  return {currency: primary?.currency, classes, otherCurrencies: overview.subtotals.filter(s => s !== primary).map(s => s.currency), coverage: {valued, total: overview.rows.length}};
}

