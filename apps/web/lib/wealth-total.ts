/**
 * The Wealth headline (UI design pass, Part 5). No exchange rate exists in the app, so currencies are never
 * converted or combined: the headline shows one currency and the others follow on their own line.
 * The headline currency is the one with the largest known total (there is no primary-currency setting);
 * a tie keeps the existing currency order. Comparing the magnitudes picks what to show first; nothing is added.
 */
export type CurrencyTotal = {currency: string; value: bigint};
export function splitWealthTotals<T extends CurrencyTotal>(subtotals: readonly T[]): {primary?: T; others: T[]} {
  if (!subtotals.length) return {others: []};
  const primary = subtotals.reduce((best, s) => s.value > best.value ? s : best, subtotals[0]!);
  return {primary, others: subtotals.filter(s => s !== primary)};
}
