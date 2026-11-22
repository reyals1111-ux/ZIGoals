/**
 * Review B6O-5: the width of This month by category's bar, in percent of the currency's biggest spending, or null for a
 * category at or below zero (a refund larger than what was spent there this month: no bar, the amount says it). The
 * biggest is taken over the totals above zero only, so a row below zero never draws a full bar and nothing is NaN. Pure.
 */
export function barWidths<T extends {currency: string; total: number}>(rows: readonly T[]): (number | null)[] {
  const most = new Map<string, number>();
  for (const r of rows) if (r.total > 0) most.set(r.currency, Math.max(most.get(r.currency) ?? 0, r.total));
  return rows.map(r => { const max = most.get(r.currency); return r.total > 0 && max ? Math.max(4, Math.round(100 * r.total / max)) : null; });
}
