import {billOccurrences, monthlyEstimate, nextDueOf, totalsByCurrency} from '../../bills/store';
import type {BillCadence, BillsRecord} from '../../bills/schema';
import {fromCents} from '../../money-log/engine';
import {formatCurrencyAmount, formatDate} from '../../visual-format';
import {daysBetween} from '../widgets/words';

/**
 * Session AM (ADR-038; art direction §4, Wealth): the "Upcoming bills" widget's figures, pure, from the bills the person
 * keeps as reminders (lib/bills/store.ts, as Wealth → Upcoming bills, "Next bill and contribution" and the `bills` tool
 * read them): each bill once, at its next due date, in date order. An amount stays the bill's own decimal text in its
 * own currency (never converted); the totals are per currency, never added across, and the monthly figure is an
 * estimate and says so. ZIGoals never pays or cancels anything: this only counts days.
 */
/** "today", "tomorrow", "in 5 days", "overdue by 1 day", "overdue by 3 days". */
export function dueWords(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 1) return `in ${days} days`;
  return `overdue by ${-days} ${days === -1 ? 'day' : 'days'}`;
}
/** How near a due date is, for the countdown dial: full on the day (and when overdue), empty a month or more ahead. */
export const NEAR_DAYS = 30;
export const nearness = (days: number): number => days <= 0 ? 1 : Math.max(0, 1 - days / NEAR_DAYS);
export type BillLine = {id: string; title: string; amount: string; currency: string; cadence: BillCadence; due: string; days: number; overdue: boolean; when: string; near: number};
export type BillsCard = {
  state: 'empty' | 'live';
  /** Every bill at its next due date, soonest first. */
  lines: BillLine[];
  next: BillLine | null;
  /** What falls due in the next 30 days, per currency (a weekly bill counts each time it comes). */
  month: {currency: string; text: string; count: number}[];
  /** What the bills come to in a typical month, per currency: an estimate. */
  typical: {currency: string; text: string}[];
};
const money = (amountCents: number, currency: string) => formatCurrencyAmount(fromCents(amountCents), currency);
export const billDay = (due: string) => formatDate(due, {weekday: true, year: false});

/** One line for a bill due on `due`, seen from `today` (a due date before today reads as overdue). */
export function billLine(bill: {id: string; title: string; amount: string; currency: string; cadence: BillCadence}, due: string, today: string): BillLine {
  const days = daysBetween(today, due);
  return {id: bill.id, title: bill.title, amount: formatCurrencyAmount(bill.amount, bill.currency), currency: bill.currency, cadence: bill.cadence, due, days, overdue: days < 0, when: dueWords(days), near: nearness(days)};
}
export function billsCard(record: BillsRecord, today: string): BillsCard {
  const lines = record.bills.map(b => billLine(b, nextDueOf(b, today), today)).sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
  return {
    state: lines.length ? 'live' : 'empty', lines, next: lines[0] ?? null,
    month: totalsByCurrency(billOccurrences(record, today, NEAR_DAYS)).map(t => ({currency: t.currency, text: money(t.cents, t.currency), count: t.count})),
    typical: monthlyEstimate(record).map(m => ({currency: m.currency, text: money(m.cents, m.currency)})),
  };
}
/** The widget's table for assistive technology: the same figures as text. */
export function billsRows(card: BillsCard, shown = card.lines.length): [string, string][] {
  return [
    ...card.lines.slice(0, shown).map((l, i) => [i === 0 ? `Next bill: ${l.title}` : l.title, `${l.amount}, due ${billDay(l.due)}, ${l.when}`] as [string, string]),
    ...(card.lines.length > shown ? [['More bills', `${card.lines.length - shown} more on Wealth`] as [string, string]] : []),
    ...card.month.map(m => [`Due in the next ${NEAR_DAYS} days in ${m.currency}`, `${m.text} across ${m.count} ${m.count === 1 ? 'due date' : 'due dates'}`] as [string, string]),
    ...card.typical.map(t => [`A typical month in ${t.currency}, an estimate`, `about ${t.text}`] as [string, string]),
  ];
}
