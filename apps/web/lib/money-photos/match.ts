import type {MoneyEntry} from '../money-log/schema';
import {minorUnits} from '../money-split/parts';

/**
 * Session AV lane 2 (money; Monarch matches a receipt to an imported transaction by amount and date): the entries a
 * receipt can belong to — spending only, within a week of the receipt's day, the same amount first (when the amount is
 * known: typed by the person or read by their own AI), then the nearest day, then those without a photo yet. Pure; the
 * person chooses, nothing is matched for them.
 */
export const MATCH_DAYS = 7;
const DAY = 86_400_000;
const gap = (a: string, b: string) => Math.abs(Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / DAY;
export type ReceiptMatch = {entry: MoneyEntry; days: number; sameAmount: boolean};
export function receiptMatches(entries: readonly MoneyEntry[], receipt: {date: string; cents?: number | null; currency?: string}, withPhoto: ReadonlySet<string> = new Set(), max = 8): ReceiptMatch[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receipt.date)) return [];
  return entries.filter(e => e.kind === 'expense' && (!receipt.currency || e.currency === receipt.currency) && gap(e.date, receipt.date) <= MATCH_DAYS)
    .map(entry => ({entry, days: Math.round(gap(entry.date, receipt.date)), sameAmount: receipt.cents != null && minorUnits(entry.amount) === receipt.cents}))
    .filter(m => receipt.cents == null || m.sameAmount || m.days <= 1)
    .sort((a, b) => Number(b.sameAmount) - Number(a.sameAmount) || a.days - b.days || Number(withPhoto.has(a.entry.id)) - Number(withPhoto.has(b.entry.id)) || b.entry.createdAt.localeCompare(a.entry.createdAt))
    .slice(0, max);
}
/** The one entry a receipt draft most likely is already (the same amount within 3 days), or null: then a new entry is drafted. */
export function draftAlreadyLogged(entries: readonly MoneyEntry[], draft: {amount?: string; date?: string; currency?: string}): MoneyEntry | null {
  if (!draft.amount || !draft.date || !/^\d{1,10}(\.\d{1,2})?$/.test(draft.amount)) return null;
  const best = receiptMatches(entries, {date: draft.date, cents: minorUnits(draft.amount), ...(draft.currency ? {currency: draft.currency} : {})}).find(m => m.sameAmount && m.days <= 3);
  return best?.entry ?? null;
}
/** A photo file's own day (its last change, in local time), as the receipt's day when nothing else says it. */
export const fileDay = (lastModified: number) => { const d = new Date(lastModified); return Number.isFinite(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''; };
