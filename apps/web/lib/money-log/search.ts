import type {MoneyEntry} from './schema';
import {entryParts} from '../money-split/parts';
import {isCounted} from './counted';
import {payeePart} from './suggest';

/**
 * Session AV (owner follow-up 1, F-MONEY-SEARCH; Copilot, Monarch, YNAB): the whole money log searched and filtered —
 * words (in the category, a part's category, the note, or the amount as written), spending or income, a category, and
 * a date range — newest first. The total of the results comes from lib/money-log/selection.ts (per currency, never
 * converted). Case and accents do not matter. Pure; nothing stored.
 */
/** Session AV (fresh-agent check q2, rank 21; Monarch, Copilot): `minCents` / `maxCents`, an amount range (both included). */
/**
 * Session AV lane 2 (money; Monarch's exclude filters, payee and tag filters): `not` leaves out entries holding any of its
 * words; `payee` keeps one payee (the part of a note before " · "); `tagged` keeps the ids a tag names (the tags live in
 * their own record); `counted` keeps only counted entries or only the ones left out; `tax` only those marked
 * tax-deductible. The total of the results follows every filter.
 */
export type MoneyQuery = {text?: string; kind?: 'all' | 'expense' | 'income'; category?: string; from?: string; to?: string; minCents?: number; maxCents?: number;
  not?: string; payee?: string; tagged?: ReadonlySet<string>; counted?: 'all' | 'counted' | 'left-out'; tax?: boolean};
const fold = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
export function searchEntries(entries: readonly MoneyEntry[], q: MoneyQuery): MoneyEntry[] {
  const words = fold(q.text ?? '').split(/\s+/).filter(Boolean), cat = q.category ? fold(q.category) : '';
  const nots = fold(q.not ?? '').split(/[\s,]+/).filter(Boolean), payee = q.payee ? fold(q.payee).trim() : '';
  return entries.filter(e => {
    if (q.counted === 'counted' && !isCounted(e)) return false;
    if (q.counted === 'left-out' && isCounted(e)) return false;
    if (q.tax && !e.taxDeductible) return false;
    if (q.tagged && !q.tagged.has(e.id)) return false;
    if (payee && fold(payeePart(e.note ?? '')).trim() !== payee) return false;
    if (q.kind && q.kind !== 'all' && e.kind !== q.kind) return false;
    if (q.from && e.date < q.from) return false;
    if (q.to && e.date > q.to) return false;
    if (q.minCents !== undefined || q.maxCents !== undefined) {
      const amount = Math.round(Number(e.amount) * 100);
      if (q.minCents !== undefined && amount < q.minCents) return false;
      if (q.maxCents !== undefined && amount > q.maxCents) return false;
    }
    const cats = [e.category, ...entryParts(e).map(p => p.category)].map(fold);
    if (cat && !cats.includes(cat)) return false;
    const hay = `${cats.join(' ')} ${fold(e.note ?? '')} ${e.amount} ${e.amount.replace('.', ',')} ${e.currency.toLowerCase()}`;
    if (nots.some(w => hay.includes(w))) return false;
    return words.every(w => hay.includes(w));
  }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}
/** Every category used in the log, A to Z (for the category filter). */
export const usedCategories = (entries: readonly MoneyEntry[]) => [...new Set(entries.flatMap(e => [e.category, ...entryParts(e).map(p => p.category)]))].sort((a, b) => a.localeCompare(b));
/** Session AV lane 2 (money): every payee in the log (the part of a note before " · "), most used first, for the payee filter. */
export function usedPayees(entries: readonly MoneyEntry[], max = 200): string[] {
  const by = new Map<string, {name: string; n: number}>();
  for (const e of entries) { const name = payeePart(e.note ?? ''); if (!name) continue; const k = fold(name); const row = by.get(k) ?? {name, n: 0}; row.n++; by.set(k, row); }
  return [...by.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, max).map(r => r.name);
}
