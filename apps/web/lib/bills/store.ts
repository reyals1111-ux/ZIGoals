import {cents, fromCents} from '../money-log/engine';
import {amountText, currencyCode} from '../money-log/schema';
import {PER_MONTH, dueDatesBetween, dueOnOrAfter} from './cadence';
import type {BillCandidate} from './detect';
import {MAX_BILLS, MAX_DISMISSED, billsSchema, type Bill, type BillCadence, type BillsRecord} from './schema';

/**
 * Session AK (7.3): the bills record's changes and figures, pure. Every change returns a valid record or throws with a
 * plain reason; nothing here pays, cancels or moves money. Figures are cents per currency, never added across
 * currencies; the monthly figure is an estimate (a weekly bill counts 52 ÷ 12 times) and says so where it is shown.
 */
export function confirmCandidate(record: BillsRecord, candidate: BillCandidate, id: string, now: Date): BillsRecord {
  if (record.bills.some(b => b.matchKey === candidate.key)) return record;
  if (record.bills.length >= MAX_BILLS) throw Error(`Up to ${MAX_BILLS} bills.`);
  const bill: Bill = {id, title: candidate.title, amount: candidate.amount, currency: candidate.currency, cadence: candidate.cadence, nextDue: candidate.nextDue, origin: 'detected', matchKey: candidate.key, category: candidate.category, createdAt: now.toISOString()};
  return billsSchema.parse({...record, bills: [...record.bills, bill]});
}
export type ManualBill = {title: string; amount: string; currency: string; cadence: BillCadence; nextDue: string; category?: string};
/** Checks a hand-written bill; returns a plain reason or null. */
export function manualBillIssue(input: ManualBill): string | null {
  if (!input.title.trim()) return 'Give the bill a name.';
  if (!amountText.safeParse(input.amount).success) return 'Enter an amount above zero, with at most two decimals (for example 9.99).';
  if (!currencyCode.safeParse(input.currency).success) return 'Choose a currency.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.nextDue) || Number.isNaN(Date.parse(`${input.nextDue}T00:00:00Z`))) return 'Choose the next due date.';
  return null;
}
export function addManualBill(record: BillsRecord, input: ManualBill, id: string, now: Date): BillsRecord {
  const issue = manualBillIssue(input); if (issue) throw Error(issue);
  if (record.bills.length >= MAX_BILLS) throw Error(`Up to ${MAX_BILLS} bills.`);
  const bill: Bill = {id, title: input.title.trim().slice(0, 80), amount: input.amount, currency: input.currency, cadence: input.cadence, nextDue: input.nextDue, origin: 'manual', ...(input.category ? {category: input.category} : {}), createdAt: now.toISOString()};
  return billsSchema.parse({...record, bills: [...record.bills, bill]});
}
export const removeBill = (record: BillsRecord, id: string): BillsRecord => billsSchema.parse({...record, bills: record.bills.filter(b => b.id !== id)});
/** The person's "not a bill": kept with the day, the oldest dropped beyond the cap. */
export function dismissCandidate(record: BillsRecord, key: string, today: string): BillsRecord {
  if (record.dismissed.some(d => d.key === key)) return record;
  return billsSchema.parse({...record, dismissed: [...record.dismissed, {key, at: today}].slice(-MAX_DISMISSED)});
}
export const undismissCandidate = (record: BillsRecord, key: string): BillsRecord => billsSchema.parse({...record, dismissed: record.dismissed.filter(d => d.key !== key)});
/** The note to self and its optional day; an empty note removes both. */
export function setCancelNote(record: BillsRecord, id: string, note: string, cancelBy?: string): BillsRecord {
  const text = note.trim().slice(0, 300);
  return billsSchema.parse({...record, bills: record.bills.map(b => {
    if (b.id !== id) return b;
    const rest = {...b}; delete rest.cancelNote; delete rest.cancelBy;
    return text ? {...rest, cancelNote: text, ...(cancelBy ? {cancelBy} : {})} : rest;
  })});
}

export type BillOccurrence = {billId: string; title: string; due: string; amountCents: number; currency: string; cadence: BillCadence; origin: Bill['origin']; cancelNote?: string; cancelBy?: string};
/** Every due date of every bill from today through `days` days ahead, earliest first. */
export function billOccurrences(record: BillsRecord, today: string, days = 30): BillOccurrence[] {
  const end = new Date(`${today}T12:00:00Z`); end.setUTCDate(end.getUTCDate() + days);
  const to = end.toISOString().slice(0, 10);
  return record.bills.flatMap(b => dueDatesBetween(b.nextDue, b.cadence, today, to).map(due => ({billId: b.id, title: b.title, due, amountCents: cents(b.amount), currency: b.currency, cadence: b.cadence, origin: b.origin, ...(b.cancelNote ? {cancelNote: b.cancelNote} : {}), ...(b.cancelBy ? {cancelBy: b.cancelBy} : {})})))
    .sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
}
/** The next due date of one bill, today or later. */
export const nextDueOf = (bill: Pick<Bill, 'nextDue' | 'cadence'>, today: string) => dueOnOrAfter(bill.nextDue, bill.cadence, today);
/** Totals per currency of a list of occurrences (never added across currencies). */
export function totalsByCurrency(items: readonly {amountCents: number; currency: string}[]): {currency: string; cents: number; count: number}[] {
  const by = new Map<string, {currency: string; cents: number; count: number}>();
  for (const i of items) { const t = by.get(i.currency) ?? {currency: i.currency, cents: 0, count: 0}; t.cents += i.amountCents; t.count++; by.set(i.currency, t); }
  return [...by.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
/** What the bills come to in a typical month, per currency: an estimate (weekly × 52 ÷ 12, quarterly ÷ 3, yearly ÷ 12). */
export function monthlyEstimate(record: BillsRecord): {currency: string; cents: number}[] {
  const by = new Map<string, number>();
  for (const b of record.bills) { const [n, d] = PER_MONTH[b.cadence]; by.set(b.currency, (by.get(b.currency) ?? 0) + cents(b.amount) * n / d); }
  return [...by].map(([currency, total]) => ({currency, cents: Math.round(total)})).sort((a, b) => a.currency.localeCompare(b.currency));
}
const format = (amountCents: number, currency: string) => {
  try { return new Intl.NumberFormat('en-GB', {style: 'currency', currency}).format(amountCents / 100); } catch { return `${fromCents(amountCents)} ${currency}`; }
};
/**
 * For the notification plan (Session AK Part 2, lib/notify/plan.ts `PlanInput.bills`): each bill's due dates in the next
 * `days` days as `{id, title, due, amount}`, the amount already formatted in its own currency ("€9.99"). The id is the
 * bill's id and the due date, so a weekly bill's two dates are two items. Pure.
 */
export function upcomingBills(record: BillsRecord, today: string, days = 30): {id: string; title: string; due: string; amount: string}[] {
  return billOccurrences(record, today, days).map(o => ({id: `${o.billId}-${o.due}`, title: o.title, due: o.due, amount: format(o.amountCents, o.currency)}));
}
/** A reminder to act on a note to self, on its day or within the next week. */
export function cancelReminders(record: BillsRecord, today: string, days = 7): {billId: string; title: string; cancelBy: string; note: string}[] {
  const end = new Date(`${today}T12:00:00Z`); end.setUTCDate(end.getUTCDate() + days);
  const to = end.toISOString().slice(0, 10);
  return record.bills.flatMap(b => b.cancelNote && b.cancelBy && b.cancelBy >= today && b.cancelBy <= to ? [{billId: b.id, title: b.title, cancelBy: b.cancelBy, note: b.cancelNote}] : []).sort((a, b) => a.cancelBy.localeCompare(b.cancelBy));
}
