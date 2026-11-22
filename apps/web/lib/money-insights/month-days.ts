import {addLocalDays} from '../local-date';
import {monthOf, totals} from '../money-log/engine';
import {budgetDayParts} from '../money-log/counted';
import type {MoneyEntry} from '../money-log/schema';
import {shiftMonth} from '../budgets/engine';

/**
 * Session AV lane 2, round 4 (money; Lunch Money's calendar, LEDGER #338): the month as a calendar of what was spent and
 * received each day, per currency, never converted. Pure; nothing stored.
 *
 * One figure: each day's income is Wealth → Spending's own `totals` for that day (lib/money-log/engine.ts: an entry left
 * out of the figures, both sides of a transfer and a Settle-up refund are not counted). Each day's spending is the
 * shared rule's `budgetDayParts` (lib/money-log/counted.ts): the person's own share of a shared cost, and a cost spread
 * over months by its share on its day in each month — so the month's days add up to what the budgets count. A day with
 * nothing in the log is empty (unknown), never a zero; a day whose entries are all left out says so by its count.
 */
export type CalendarDay = {date: string; day: number; inMonth: boolean; today: boolean; future: boolean; spent: number; received: number; count: number;
  /** 0: nothing spent; 1–3: a quiet shade for the larger days (a third, two thirds of the month's largest day). */
  level: 0 | 1 | 2 | 3};
export type MonthCalendar = {month: string; currency: string; weeks: CalendarDay[][]; spent: number; received: number; days: number; largest: CalendarDay | null};

/** The currencies with something in the log in the month (spending spread into it too), A to Z. */
export function calendarCurrencies(entries: readonly MoneyEntry[], month: string): string[] {
  const set = new Set<string>();
  for (const e of entries) if (e.date.slice(0, 7) === month || (e.spread && budgetDayParts(e).some(d => d.date.slice(0, 7) === month))) set.add(e.currency);
  return [...set].sort();
}
/** The months the calendar can page through: from the log's first month to today's (today's month at least). */
export function calendarMonths(entries: readonly MoneyEntry[], today: string): string[] {
  const last = today.slice(0, 7), first = entries.reduce((m, e) => e.date.slice(0, 7) < m ? e.date.slice(0, 7) : m, last), out: string[] = [];
  for (let m = first; m <= last && out.length < 600; m = shiftMonth(m, 1)) out.push(m);
  return out;
}

export function monthCalendar(entries: readonly MoneyEntry[], month: string, currency: string, today: string, weekStartsOn: 'monday' | 'sunday' = 'monday'): MonthCalendar {
  const {start, end} = monthOf(`${month}-01`), mine = entries.filter(e => e.currency === currency);
  const spent = new Map<string, number>(), counts = new Map<string, number>();
  for (const e of mine) {
    if (e.date >= start && e.date <= end) counts.set(e.date, (counts.get(e.date) ?? 0) + 1);
    if (e.kind !== 'expense') continue;
    for (const d of budgetDayParts(e)) if (d.date >= start && d.date <= end) spent.set(d.date, (spent.get(d.date) ?? 0) + d.parts.reduce((s, p) => s + p.cents, 0));
  }
  const inMonth = mine.filter(e => e.date >= start && e.date <= end && e.kind === 'income');
  const received = (date: string) => totals(inMonth, date, date).find(t => t.currency === currency)?.income ?? 0;
  const weekday = new Date(`${start}T12:00:00Z`).getUTCDay(), back = weekStartsOn === 'monday' ? (weekday + 6) % 7 : weekday;
  const days: CalendarDay[] = [];
  for (let date = addLocalDays(start, -back); date <= end || days.length % 7; date = addLocalDays(date, 1)) {
    const own = date >= start && date <= end;
    days.push({date, day: Number(date.slice(8)), inMonth: own, today: date === today, future: date > today, spent: own ? spent.get(date) ?? 0 : 0, received: own ? received(date) : 0, count: own ? counts.get(date) ?? 0 : 0, level: 0});
  }
  const max = Math.max(0, ...days.map(d => d.spent));
  for (const d of days) d.level = !d.spent || !max ? 0 : d.spent >= max * 2 / 3 ? 3 : d.spent >= max / 3 ? 2 : 1;
  const own = days.filter(d => d.inMonth), largest = max ? own.find(d => d.spent === max) ?? null : null;
  return {month, currency, weeks: Array.from({length: days.length / 7}, (_, i) => days.slice(i * 7, i * 7 + 7)), spent: own.reduce((s, d) => s + d.spent, 0), received: own.reduce((s, d) => s + d.received, 0), days: own.filter(d => d.count > 0 || d.spent > 0).length, largest};
}
/** The month's days with something to show, largest spending first (for the answers and the phone list). */
export const busiestDays = (cal: MonthCalendar, n = 3) => cal.weeks.flat().filter(d => d.inMonth && d.spent > 0).sort((a, b) => b.spent - a.spent || a.date.localeCompare(b.date)).slice(0, n);
