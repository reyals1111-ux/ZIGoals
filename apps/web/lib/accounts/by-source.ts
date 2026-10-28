import {add, ZERO, type Money} from './net-worth';

/**
 * Session AI (B3, CO6): the holdings part of net worth split by where each value comes from, per currency and never
 * converted — a market price, the person's own value, or a value verified from a wallet. Read from Wealth's own rows
 * (lib/wealth.ts), the same values the total counts; nothing is stored. A holding without a value is counted apart.
 */
export type SourceKind = 'market' | 'own' | 'verified';
export const SOURCE_LABEL: Record<SourceKind, string> = {market: 'Market price', own: 'Your own value', verified: 'Verified from a wallet'};
export type BySource = {currency: string; parts: Partial<Record<SourceKind, Money>>; count: Partial<Record<SourceKind, number>>};
type Row = {currency?: string; value?: bigint; valuationState?: string; source?: string};
export const sourceOf = (row: Row): SourceKind => row.valuationState === 'manual' || row.source === 'Manual value' ? 'own' : row.source === 'Verified Position value' ? 'verified' : 'market';
export function holdingsBySource(rows: readonly Row[]): BySource[] {
  const by = new Map<string, BySource>();
  for (const r of rows) {
    if (r.value === undefined || !r.currency) continue;
    const k = sourceOf(r), entry = by.get(r.currency) ?? {currency: r.currency, parts: {}, count: {}};
    entry.parts[k] = add(entry.parts[k] ?? ZERO, {value: r.value, decimals: 2});
    entry.count[k] = (entry.count[k] ?? 0) + 1;
    by.set(r.currency, entry);
  }
  return [...by.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
