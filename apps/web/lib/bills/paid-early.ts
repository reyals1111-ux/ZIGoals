import {addLocalDays} from '../local-date';
import {cents} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';
import {AMOUNT_TOLERANCE} from './detect';
import {earlyDays, earlyFits, entryMatchKey, monthMatches} from './month';
import {billsSchema, MAX_DISMISSED, type Bill, type BillsRecord} from './schema';

/**
 * Session AV lane 2, round 5 (money; PocketSmith's "fix this bill", LEDGER #386): on a due date shown as passed, "Paid
 * early?" lists the expenses of the 14 days before it (6 for a weekly bill) in the bill's currency and within 5 % of its
 * amount that no other bill date already counts; one tap counts one as that payment — the bill's match words
 * (`matchKey`, an existing field) learn that entry's payee and category, so this date and later ones find it, even when
 * paid early. When a confirmed candidate's own words change, its old key goes to the dismissed list, so it is not offered
 * again as a new bill. Undo puts both back. ZIGoals pays nothing; the money log is not changed. Pure.
 */
export type EarlyCandidate = {entry: MoneyEntry; days: number; off: number};
export function paidEarlyCandidates(record: BillsRecord, entries: readonly MoneyEntry[], bill: Bill, due: string, today: string): EarlyCandidate[] {
  const {matched} = monthMatches(record, entries, today), used = new Set(matched.values()), amount = cents(bill.amount), from = addLocalDays(due, -earlyDays(bill.cadence));
  return entries.filter(e => e.kind === 'expense' && e.currency === bill.currency && !used.has(e.id) && e.date >= from && e.date < due && earlyFits(bill, e, due) && Math.abs(cents(e.amount) - amount) <= amount * AMOUNT_TOLERANCE)
    .map(entry => ({entry, days: Math.round((Date.parse(`${due}T12:00:00Z`) - Date.parse(`${entry.date}T12:00:00Z`)) / 86_400_000), off: Math.abs(cents(entry.amount) - amount)}))
    .sort((a, b) => a.off - b.off || a.days - b.days || a.entry.id.localeCompare(b.entry.id));
}
export type LearnedBefore = {billId: string; matchKey: string | null; dismissedKey: string | null};
/** The bill's match words set to this entry's; the old key of a confirmed candidate dismissed, so it is not offered again. */
export function countAsPayment(record: BillsRecord, billId: string, entry: MoneyEntry, today: string): {record: BillsRecord; before: LearnedBefore} {
  const bill = record.bills.find(b => b.id === billId);
  if (!bill) throw new Error('That bill is no longer here.');
  const key = `${entryMatchKey(entry)}|${bill.cadence}`.slice(0, 200), before0 = {billId, matchKey: bill.matchKey ?? null};
  const old = bill.matchKey && bill.matchKey !== key && bill.origin === 'detected' && !record.dismissed.some(d => d.key === bill.matchKey) ? bill.matchKey : null;
  const dismissed = old ? [...record.dismissed, {key: old, at: today}].slice(-MAX_DISMISSED) : record.dismissed;
  return {record: billsSchema.parse({...record, dismissed, bills: record.bills.map(b => b.id === billId ? {...b, matchKey: key} : b)}), before: {...before0, dismissedKey: old}};
}
/** Undo: the bill's match words as they were, and the key it dismissed taken off the list again (the rest as it is now). */
export function undoCountAsPayment(record: BillsRecord, before: LearnedBefore): BillsRecord {
  return billsSchema.parse({...record, dismissed: before.dismissedKey ? record.dismissed.filter(d => d.key !== before.dismissedKey) : record.dismissed, bills: record.bills.map(b => { if (b.id !== before.billId) return b; const {matchKey: _m, ...rest} = b; void _m; return before.matchKey ? {...rest, matchKey: before.matchKey} : rest; })});
}
