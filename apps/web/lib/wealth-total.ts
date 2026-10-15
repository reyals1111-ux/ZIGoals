/**
 * The Wealth headline (UI design pass, Part 5). No exchange rate exists in the app, so currencies are never
 * converted or combined: the headline shows one currency and the others follow on their own line.
 * The headline currency is the one with the largest known total (there is no primary-currency setting);
 * a tie keeps the existing currency order. Comparing the magnitudes picks what to show first; nothing is added.
 */
export type CurrencyTotal = {currency: string; value: bigint};
/**
 * Session AB-Design (owner request 24): the headline is the person's base currency (USD by default, EUR if chosen,
 * zigoals:ui-prefs:v1) when anything is held in it; other currencies follow as "held in …", never converted. With
 * nothing in the base currency the largest other total leads, as before, so a figure never disappears.
 */
export function splitWealthTotals<T extends CurrencyTotal>(subtotals: readonly T[], base?: string): {primary?: T; others: T[]; baseEmpty?: boolean} {
  if (!subtotals.length) return base ? {others: [], baseEmpty: true} : {others: []};
  const inBase = base ? subtotals.find(s => s.currency === base) : undefined;
  const primary = inBase ?? subtotals.reduce((best, s) => s.value > best.value ? s : best, subtotals[0]!);
  const split = {primary, others: subtotals.filter(s => s !== primary)};
  return base ? {...split, baseEmpty: !inBase} : split;
}
