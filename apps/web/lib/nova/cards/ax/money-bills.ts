import {weekStart} from '../../../ai/tools/range';
import type {BillsRecord} from '../../../bills/schema';
import {billOccurrences, totalsByCurrency} from '../../../bills/store';
import {addLocalDays} from '../../../local-date';
import {formatDate, formatWeekday} from '../../../visual-format';
import {billsCard, dueWords, type BillLine} from '../bills';
import {axMoney, axPlain, spanWords} from './money-spend';

/**
 * Session AS (ADR-042 Part 2, Wealth): the figures of the three answer widgets about bills — the next 31 days as a grid
 * with the due days lit, the next bills on a time axis, and the next bill as a countdown dial. Every date and amount is
 * the bills' own (lib/bills/store.ts, through lib/nova/cards/bills.ts as "Upcoming bills" reads them): a bill in its own
 * currency, totals per currency and never added across. A bill is a reminder the person keeps: nothing here pays,
 * cancels or moves anything, and a due date is a date, not a forecast.
 */
export const BILL_DAYS = 31;
export type BillDue = {id: string; title: string; amount: string; date: string; dateWords: string; days: number; when: string};
export type BillDay = {date: string; day: number; /** Inside the 31 days from today. */ inRange: boolean; today: boolean; bills: BillDue[]; words: string};
export type BillGrid = {
  state: 'empty' | 'live';
  from: string; to: string; span: string;
  /** Monday first. */
  weekdays: string[]; weeks: BillDay[][];
  /** Every due date in the 31 days, earliest first (a weekly bill each time it comes). */
  due: BillDue[];
  dueDays: number;
  /** What falls due in the 31 days, per currency. */
  totals: {currency: string; text: string; count: number}[];
  /** The next bill at all, also when it lies after the 31 days. */
  next: BillLine | null;
  overdue: BillLine[];
};
const longDay = (date: string, today: string) => formatDate(date, {weekday: true, year: !date.startsWith(today.slice(0, 4))});
const plainLine = (line: BillLine): BillLine => ({...line, title: axPlain(line.title)});
export function billGrid(record: BillsRecord, today: string): BillGrid {
  const to = addLocalDays(today, BILL_DAYS - 1), card = billsCard(record, today), hits = billOccurrences(record, today, BILL_DAYS - 1);
  const due: BillDue[] = hits.map(o => { const days = Math.round((Date.parse(o.due) - Date.parse(today)) / 86_400_000); return {id: o.billId, title: axPlain(o.title), amount: axMoney(o.amountCents, o.currency), date: o.due, dateWords: longDay(o.due, today), days, when: dueWords(days)}; });
  const start = weekStart(today), end = addLocalDays(weekStart(to), 6), weeks: BillDay[][] = [];
  for (let monday = start; monday <= end; monday = addLocalDays(monday, 7)) weeks.push(Array.from({length: 7}, (_, i) => {
    const date = addLocalDays(monday, i), bills = due.filter(d => d.date === date), inRange = date >= today && date <= to;
    return {date, day: Number(date.slice(8, 10)), inRange, today: date === today, bills, words: `${longDay(date, today)}: ${bills.length ? bills.map(b => `${b.title} ${b.amount}`).join(', ') : inRange ? 'no bill due' : 'outside these 31 days'}`};
  }));
  return {state: record.bills.length ? 'live' : 'empty', from: today, to, span: spanWords(today, to), weekdays: Array.from({length: 7}, (_, i) => formatWeekday(addLocalDays(start, i)).slice(0, 1)), weeks, due,
    dueDays: new Set(due.map(d => d.date)).size, totals: totalsByCurrency(hits).map(t => ({currency: t.currency, text: axMoney(t.cents, t.currency), count: t.count})),
    next: card.next ? plainLine(card.next) : null, overdue: card.lines.filter(l => l.overdue).map(plainLine)};
}

export type BillMark = BillLine & {/** Its number on the axis and in the list. */ n: number; /** Where it stands on the axis from today (0) to the last bill shown (1); an overdue bill stands at today's edge. */ at: number};
export type BillTimeline = {
  state: 'empty' | 'live';
  /** Each bill once, at its next due date, soonest first. */
  marks: BillMark[];
  more: number; count: number;
  /** The days the axis spans, from today to the last bill shown. */
  spanDays: number; endWords: string | null;
  next: BillLine | null; overdue: number;
  /** What falls due in the next 30 days, per currency. */
  month: {currency: string; text: string; count: number}[];
};
export function billTimeline(record: BillsRecord, today: string, shown = 6): BillTimeline {
  const card = billsCard(record, today), lines = card.lines.slice(0, shown).map(plainLine), last = lines.at(-1), spanDays = Math.max(1, ...lines.map(l => l.days));
  return {state: card.state, marks: lines.map((l, i) => ({...l, n: i + 1, at: Math.max(0, Math.min(1, l.days / spanDays))})), more: card.lines.length - lines.length, count: card.lines.length,
    spanDays, endWords: last ? last.date : null, next: lines[0] ?? null, overdue: card.lines.filter(l => l.overdue).length, month: card.month};
}

/** The next bill as a countdown: the dial runs over the last thirty days before the due date (lib/nova/cards/bills.ts nearness). */
export type BillDial = {state: 'empty' | 'live'; next: BillLine | null; /** The bills after the next one. */ after: number};
export function billDial(record: BillsRecord, today: string): BillDial {
  const card = billsCard(record, today);
  return {state: card.next ? 'live' : 'empty', next: card.next ? plainLine(card.next) : null, after: Math.max(0, card.lines.length - 1)};
}
