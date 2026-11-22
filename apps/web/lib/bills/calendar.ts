import {weekStart} from '../ai/tools/range';
import {addLocalDays} from '../local-date';
import {cents} from '../money-log/engine';
import {formatDate, formatMonth, formatWeekday} from '../visual-format';
import {axMoney, axPlain, spanWords} from '../nova/cards/ax/money-spend';
import {addMonths, dueDatesBetween, dueOnOrAfter} from './cadence';
import {monthDueDates} from './month';
import {totalsByCurrency} from './store';
import type {BillsRecord} from './schema';

/**
 * Session AV (fresh-agent check q2, rank 10; Rocket Money's bill calendar): Upcoming bills on a calendar, either the next
 * 31 days from today (as NOVA's "Bill calendar" widget draws them, lib/nova/cards/ax/money-bills.ts billGrid) or one
 * calendar month you page through, from this month up to a year ahead. Each day carries its bills with their amounts
 * and the day's total per currency (never added across currencies); the month that holds today also shows its earlier
 * dates, counted back from each bill's next due date (lib/bills/month.ts monthDueDates). Reminders only. Pure.
 */
export const CALENDAR_DAYS = 31, MONTHS_AHEAD = 11;
export type CalendarBill = {id: string; title: string; cents: number; currency: string; amount: string};
export type CalendarDay = {date: string; day: number; inRange: boolean; today: boolean; bills: CalendarBill[]; totals: {currency: string; text: string}[]; words: string};
export type BillCalendar = {
  /** "next": the 31 days from today; otherwise the month shown, "YYYY-MM". */
  shown: 'next' | string;
  from: string; to: string;
  /** "the next 31 days" or "December 2026". */
  title: string; span: string;
  weekdays: string[]; weeks: CalendarDay[][];
  due: (CalendarBill & {date: string; dateWords: string})[];
  totals: {currency: string; text: string; count: number}[];
};
const longDay = (date: string, today: string) => formatDate(date, {weekday: true, year: !date.startsWith(today.slice(0, 4))});
/** The month `offset` months after today's month, "YYYY-MM" (0 is this month). */
export const monthAfter = (today: string, offset: number) => addMonths(`${today.slice(0, 7)}-01`, offset).slice(0, 7);
export function billCalendar(record: BillsRecord, today: string, shown: 'next' | string = 'next'): BillCalendar {
  const month = shown !== 'next' && /^\d{4}-\d{2}$/.test(shown) ? shown : null;
  const from = month ? `${month}-01` : today;
  const to = month ? addLocalDays(dueOnOrAfter(from, 'monthly', addLocalDays(from, 1)), -1) : addLocalDays(today, CALENDAR_DAYS - 1);
  const due = record.bills.flatMap(b => (month ? monthDueDates(b.nextDue, b.cadence, from, to, today) : dueDatesBetween(b.nextDue, b.cadence, from, to))
    .map(date => ({id: b.id, title: axPlain(b.title), cents: cents(b.amount), currency: b.currency, amount: axMoney(cents(b.amount), b.currency), date, dateWords: longDay(date, today)})))
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  const start = weekStart(from), end = addLocalDays(weekStart(to), 6), weeks: CalendarDay[][] = [];
  const outWords = month ? 'outside this month' : `outside these ${CALENDAR_DAYS} days`;
  for (let monday = start; monday <= end; monday = addLocalDays(monday, 7)) weeks.push(Array.from({length: 7}, (_, i) => {
    const date = addLocalDays(monday, i), inRange = date >= from && date <= to, bills = inRange ? due.filter(d => d.date === date) : [];
    const totals = totalsByCurrency(bills.map(b => ({amountCents: b.cents, currency: b.currency}))).map(t => ({currency: t.currency, text: axMoney(t.cents, t.currency)}));
    return {date, day: Number(date.slice(8, 10)), inRange, today: date === today, bills, totals,
      words: `${longDay(date, today)}: ${bills.length ? bills.map(b => `${b.title} ${b.amount}`).join(', ') : inRange ? 'no bill due' : outWords}`};
  }));
  return {shown: month ?? 'next', from, to, title: month ? formatMonth(from) : `the next ${CALENDAR_DAYS} days`, span: spanWords(from, to),
    weekdays: Array.from({length: 7}, (_, i) => formatWeekday(addLocalDays(start, i)).slice(0, 1)), weeks, due,
    totals: totalsByCurrency(due.map(d => ({amountCents: d.cents, currency: d.currency}))).map(t => ({currency: t.currency, text: axMoney(t.cents, t.currency), count: t.count}))};
}
