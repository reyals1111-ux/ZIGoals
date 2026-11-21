import type {MoneyEntry} from './schema';
import {entryParts} from '../money-split/parts';

/**
 * Session AV (owner follow-up 1, F-MONEY-SEARCH; Copilot, Monarch, YNAB): the whole money log searched and filtered —
 * words (in the category, a part's category, the note, or the amount as written), spending or income, a category, and
 * a date range — newest first. The total of the results comes from lib/money-log/selection.ts (per currency, never
 * converted). Case and accents do not matter. Pure; nothing stored.
 */
export type MoneyQuery = {text?: string; kind?: 'all' | 'expense' | 'income'; category?: string; from?: string; to?: string};
const fold = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
export function searchEntries(entries: readonly MoneyEntry[], q: MoneyQuery): MoneyEntry[] {
  const words = fold(q.text ?? '').split(/\s+/).filter(Boolean), cat = q.category ? fold(q.category) : '';
  return entries.filter(e => {
    if (q.kind && q.kind !== 'all' && e.kind !== q.kind) return false;
    if (q.from && e.date < q.from) return false;
    if (q.to && e.date > q.to) return false;
    const cats = [e.category, ...entryParts(e).map(p => p.category)].map(fold);
    if (cat && !cats.includes(cat)) return false;
    if (!words.length) return true;
    const hay = `${cats.join(' ')} ${fold(e.note ?? '')} ${e.amount} ${e.amount.replace('.', ',')} ${e.currency.toLowerCase()}`;
    return words.every(w => hay.includes(w));
  }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}
/** Every category used in the log, A to Z (for the category filter). */
export const usedCategories = (entries: readonly MoneyEntry[]) => [...new Set(entries.flatMap(e => [e.category, ...entryParts(e).map(p => p.category)]))].sort((a, b) => a.localeCompare(b));
