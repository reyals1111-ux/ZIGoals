import {addLocalDays} from '../local-date';
import {cents} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';
import {addMonths, CADENCE_DAYS, daysBetween, dueDatesBetween, dueOnOrAfter, stepDue} from './cadence';
import {AMOUNT_TOLERANCE, normalisePayee} from './detect';
import type {Bill, BillsRecord} from './schema';
// Session AW X7 (LEDGER #462): a bill that ends has no date after its last payment.
import {billTo} from './ends';

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
/**
 * Session AV (fresh-agent check q2, rank 42 Blocker): a confirmed or detected bill stores its NEXT due date, which is
 * after today, so this month's earlier dates lie before the anchor. Step back from the anchor by the cadence as well as
 * forward (the same clamped steps, so the 31st stays the month's last day), and keep the dates from `from` to `to`. A
 * date stepped back is kept only when it lies before `before` (today): a date still ahead but before the next due date
 * the person gave is not due (they said the next one is later).
 */
export function monthDueDates(anchor: string, cadence: Bill['cadence'], from: string, to: string, before: string): string[] {
  const out = new Set(dueDatesBetween(anchor, cadence, from, to));
  for (let k = -1, guard = 0; guard < 600; k--, guard++) {
    const due = stepDue(anchor, cadence, k);
    if (due < from) break;
    if (due <= to && due < before) out.add(due);
  }
  return [...out].sort();
}
/**
 * Session AV lane 2, round 5 (money; PocketSmith's "fix this bill", LEDGER #386): a bill paid early. An expense whose
 * payee and category are the bill's own match words (`matchKey`: `currency|category|payee|cadence`, as a confirmed
 * candidate keeps them, or as "Paid early?" learned them) also counts as the payment from up to 14 days before the due
 * date (6 for a weekly bill), not only within 4 days of it.
 */
export const EARLY_DAYS = 14, EARLY_DAYS_WEEKLY = 6;
export const earlyDays = (cadence: Bill['cadence']) => cadence === 'weekly' ? EARLY_DAYS_WEEKLY : EARLY_DAYS;
/** An entry's match words as a bill keeps them (without the cadence): `currency|category|payee`. */
export const entryMatchKey = (e: Pick<MoneyEntry, 'currency' | 'category' | 'note'>) => `${e.currency}|${e.category}|${normalisePayee(e.note) || normalisePayee(e.category)}`;
/** The due date one step before `due` on the bill's own steps from its anchor (the 31st stays the month's last day). */
export function previousDue(anchor: string, cadence: Bill['cadence'], due: string): string {
  const months = CADENCE_DAYS[cadence].months, guess = cadence === 'weekly' ? Math.round(daysBetween(anchor, due) / 7)
    : Math.round(((Number(due.slice(0, 4)) - Number(anchor.slice(0, 4))) * 12 + Number(due.slice(5, 7)) - Number(anchor.slice(5, 7))) / months);
  for (const k of [guess, guess - 1, guess + 1]) if (stepDue(anchor, cadence, k) === due) return stepDue(anchor, cadence, k - 1);
  return cadence === 'weekly' ? addLocalDays(due, -7) : addMonths(due, -months);
}
/**
 * Review b5k #1: an early payment belongs to this due date only when it lies outside the previous due date's own window
 * (more than 4 days after it) and is closer to this date than to that one — so a payment can satisfy one due date only,
 * even when the previous date fell in last month and its line is not built here.
 */
export function earlyFits(b: Pick<Bill, 'nextDue' | 'cadence'>, e: Pick<MoneyEntry, 'date'>, due: string): boolean {
  const before = daysBetween(e.date, due);
  if (before < 0 || before > earlyDays(b.cadence)) return false;
  const after = daysBetween(previousDue(b.nextDue, b.cadence, due), e.date);
  return after > MATCH_DAYS && before < after;
}
const learned = (b: Bill, e: MoneyEntry, due: string) => !!b.matchKey && b.matchKey.startsWith(`${entryMatchKey(e)}|`) && earlyFits(b, e, due);
/** This month's bill dates with the entry each one matched (by line: `billId|due`). */
export function monthMatches(record: BillsRecord, entries: readonly MoneyEntry[], today: string): {lines: MonthBill[]; matched: Map<string, string>} {
  const first = `${today.slice(0, 7)}-01`, last = addLocalDays(dueOnOrAfter(first, 'monthly', addLocalDays(first, 1)), -1);
  const used = new Set<string>(), lines: MonthBill[] = [], matched = new Map<string, string>();
  for (const b of record.bills) {
    const amount = cents(b.amount), payee = normalisePayee(b.title);
    for (const due of monthDueDates(b.nextDue, b.cadence, first, billTo(b, last), today)) {
      const near = (e: MoneyEntry) => e.kind === 'expense' && !used.has(e.id) && e.currency === b.currency && Math.abs(cents(e.amount) - amount) <= amount * AMOUNT_TOLERANCE;
      const hit = entries.find(e => near(e) && Math.abs(daysBetween(due, e.date)) <= MATCH_DAYS
        && ((!!payee && payeeOf(e) === payee) || (!!b.category && e.category === b.category && payeeOf(e) === normalisePayee(e.category))))
        ?? entries.find(e => near(e) && learned(b, e, due));
      if (hit) { used.add(hit.id); matched.set(`${b.id}|${due}`, hit.id); }
      lines.push({billId: b.id, title: b.title, due, cents: amount, currency: b.currency, state: hit ? 'seen' : due <= today ? 'passed' : 'coming'});
    }
  }
  return {lines, matched};
}
export function billsThisMonth(record: BillsRecord, entries: readonly MoneyEntry[], today: string): {lines: MonthBill[]; totals: MonthTotals[]} {
  const {lines} = monthMatches(record, entries, today);
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
  for (const b of record.bills) for (const due of dueDatesBetween(b.nextDue, b.cadence, today, billTo(b, end))) {
    if (seen.has(`${b.id}|${due}`)) continue;
    const t = out.get(b.currency) ?? {currency: b.currency, cents: 0, count: 0}; t.cents += cents(b.amount); t.count++; out.set(b.currency, t);
  }
  return [...out.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
