import {addLocalDays} from '../local-date';
import {cents} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';
import {daysBetween, dueDatesBetween, dueOnOrAfter} from './cadence';
import {AMOUNT_TOLERANCE, normalisePayee} from './detect';
import type {BillsRecord} from './schema';

/**
 * Session AV (owner follow-up 1, F-BILLS-MONTH; Copilot's "paid this month", Rocket Money's "until payday"): this month's
 * bill dates — "seen" when the money log has a matching expense (the bill's payee or category, its currency, the amount
 * within 5 %, within 4 days of the date), "passed" when the date has gone by without one, "coming" otherwise — with
 * totals per currency (never converted); and the next payday as the money log's own regular monthly income shows it, with
 * what falls due before it. ZIGoals pays nothing; "seen" says only that the log has it. Pure.
 */
export const MATCH_DAYS = 4;
export type MonthBillState = 'seen' | 'passed' | 'coming';
export type MonthBill = {billId: string; title: string; due: string; cents: number; currency: string; state: MonthBillState};
export type MonthTotals = {currency: string; seen: number; left: number; seenCount: number; leftCount: number};
const payeeOf = (e: Pick<MoneyEntry, 'note' | 'category'>) => normalisePayee(e.note) || normalisePayee(e.category);
export function billsThisMonth(record: BillsRecord, entries: readonly MoneyEntry[], today: string): {lines: MonthBill[]; totals: MonthTotals[]} {
  const first = `${today.slice(0, 7)}-01`, last = addLocalDays(dueOnOrAfter(first, 'monthly', addLocalDays(first, 1)), -1);
  const used = new Set<string>(), lines: MonthBill[] = [];
  for (const b of record.bills) {
    const amount = cents(b.amount), payee = normalisePayee(b.title);
    for (const due of dueDatesBetween(b.nextDue, b.cadence, first, last)) {
      const hit = entries.find(e => e.kind === 'expense' && !used.has(e.id) && e.currency === b.currency && Math.abs(daysBetween(due, e.date)) <= MATCH_DAYS
        && Math.abs(cents(e.amount) - amount) <= amount * AMOUNT_TOLERANCE && ((!!payee && payeeOf(e) === payee) || (!!b.category && e.category === b.category && payeeOf(e) === normalisePayee(e.category))));
      if (hit) used.add(hit.id);
      lines.push({billId: b.id, title: b.title, due, cents: amount, currency: b.currency, state: hit ? 'seen' : due <= today ? 'passed' : 'coming'});
    }
  }
  lines.sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
  const totals = new Map<string, MonthTotals>();
  for (const l of lines) {
    const t = totals.get(l.currency) ?? {currency: l.currency, seen: 0, left: 0, seenCount: 0, leftCount: 0};
    if (l.state === 'seen') { t.seen += l.cents; t.seenCount++; } else { t.left += l.cents; t.leftCount++; }
    totals.set(l.currency, t);
  }
  return {lines, totals: [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency))};
}
/**
 * The next payday from the money log: the largest income source (payee or category) with at least two entries in the
 * last 100 days whose latest gap is 25 to 35 days, a month after its latest entry (moved to today or later). Null when
 * the log shows no such income.
 */
export function nextPayday(entries: readonly MoneyEntry[], today: string): {date: string; source: string; currency: string} | null {
  const from = addLocalDays(today, -100), groups = new Map<string, MoneyEntry[]>();
  for (const e of entries) if (e.kind === 'income' && e.date >= from && e.date <= today) { const k = `${e.currency}|${payeeOf(e)}`; groups.set(k, [...(groups.get(k) ?? []), e]); }
  let best: {date: string; source: string; currency: string; size: number} | null = null;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date)), a = sorted[sorted.length - 2]!, z = sorted[sorted.length - 1]!, gap = daysBetween(a.date, z.date);
    if (gap < 25 || gap > 35) continue;
    const size = cents(z.amount), date = dueOnOrAfter(z.date, 'monthly', addLocalDays(today, 1));
    if (!best || size > best.size) best = {date, source: (z.note?.split(' · ')[0]?.trim() || z.category).slice(0, 60), currency: z.currency, size};
  }
  return best && {date: best.date, source: best.source, currency: best.currency};
}
/** Bills not yet seen in the log that fall due from today up to the day before payday, per currency. */
export function dueBeforePayday(record: BillsRecord, entries: readonly MoneyEntry[], today: string, payday: string): {currency: string; cents: number; count: number}[] {
  const out = new Map<string, {currency: string; cents: number; count: number}>(), end = addLocalDays(payday, -1);
  const seen = new Set(billsThisMonth(record, entries, today).lines.filter(l => l.state === 'seen').map(l => `${l.billId}|${l.due}`));
  for (const b of record.bills) for (const due of dueDatesBetween(b.nextDue, b.cadence, today, end)) {
    if (seen.has(`${b.id}|${due}`)) continue;
    const t = out.get(b.currency) ?? {currency: b.currency, cents: 0, count: 0}; t.cents += cents(b.amount); t.count++; out.set(b.currency, t);
  }
  return [...out.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
