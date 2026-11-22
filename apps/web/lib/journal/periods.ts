import {addLocalDays} from '../local-date';
import {PERIOD, type JournalEntry} from './schema';
import {formatDate, formatMonth} from '../visual-format';

/**
 * Session AV lane 2 (r3-notes; LEDGER #269, Grid Diary's day, week, month and year "dimensions"): an entry can be about a
 * week (an ISO week, "2026-W47", Monday first), a month ("2026-11") or a year ("2026") instead of its day. The entry keeps
 * its own `date` (the day it was written; older builds show it there) and an optional `period`. Pure.
 */
export type PeriodKind = 'week' | 'month' | 'year';
export const kindOf = (period: string): PeriodKind | null => !PERIOD.test(period) ? null : period.includes('-W') ? 'week' : period.length === 7 ? 'month' : 'year';
const utc = (day: string) => new Date(`${day}T12:00:00Z`);
const pad = (n: number) => String(n).padStart(2, '0');
/** The ISO week of a day ("2026-W47"); the week belongs to the year its Thursday is in. */
export function isoWeek(day: string): string {
  const d = utc(day), weekday = (d.getUTCDay() + 6) % 7, thursday = new Date(d.getTime() + (3 - weekday) * 86_400_000), year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4, 12)), week1Monday = new Date(jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 86_400_000);
  return `${year}-W${pad(Math.round((thursday.getTime() - week1Monday.getTime() - 3 * 86_400_000) / (7 * 86_400_000)) + 1)}`;
}
/** The Monday an ISO week starts on. */
export function weekMonday(period: string): string {
  const [y, w] = [Number(period.slice(0, 4)), Number(period.slice(6))];
  const jan4 = `${y}-01-04`, monday1 = addLocalDays(jan4, -((utc(jan4).getUTCDay() + 6) % 7));
  return addLocalDays(monday1, (w - 1) * 7);
}
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
/** The first and last day of a period. */
export function periodRange(period: string): {from: string; to: string} {
  const k = kindOf(period);
  if (k === 'week') { const from = weekMonday(period); return {from, to: addLocalDays(from, 6)}; }
  if (k === 'month') { const y = Number(period.slice(0, 4)), m = Number(period.slice(5, 7)); return {from: `${period}-01`, to: `${period}-${pad(lastDay(y, m))}`}; }
  return {from: `${period}-01-01`, to: `${period}-12-31`};
}
/** The period of a kind that holds a day. */
export const periodOf = (kind: PeriodKind, day: string): string => kind === 'week' ? isoWeek(day) : kind === 'month' ? day.slice(0, 7) : day.slice(0, 4);
/** The period before. */
export function previousPeriod(period: string): string {
  const k = kindOf(period);
  if (k === 'week') return isoWeek(addLocalDays(weekMonday(period), -7));
  if (k === 'month') return addLocalDays(`${period}-01`, -1).slice(0, 7);
  return String(Number(period) - 1);
}
/** The choices Write offers: this day, then this and last week, month and year. */
export function periodChoices(today: string): {value: string; kind: PeriodKind | null; which: 'this' | 'last' | null}[] {
  const out: {value: string; kind: PeriodKind | null; which: 'this' | 'last' | null}[] = [{value: '', kind: null, which: null}];
  for (const kind of ['week', 'month', 'year'] as const) { const now = periodOf(kind, today); out.push({value: now, kind, which: 'this'}, {value: previousPeriod(now), kind, which: 'last'}); }
  return out;
}
/** The entries about a period, oldest first. */
export const entriesFor = (entries: readonly JournalEntry[], period: string): JournalEntry[] => entries.filter(e => e.period === period).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
/** The periods the entries are about, with their counts, newest first. */
export function periodsWritten(entries: readonly JournalEntry[]): {period: string; kind: PeriodKind; count: number}[] {
  const m = new Map<string, number>();
  for (const e of entries) if (e.period && kindOf(e.period)) m.set(e.period, (m.get(e.period) ?? 0) + 1);
  return [...m].map(([period, count]) => ({period, kind: kindOf(period)!, count})).sort((a, b) => periodRange(b.period).to.localeCompare(periodRange(a.period).to) || a.period.length - b.period.length);
}
/** Periods a month of the calendar shows: its year, the month, and the ISO weeks that touch it. */
export function periodsInMonth(month: string): string[] {
  const {from, to} = periodRange(month), weeks: string[] = [];
  for (let d = from; d <= to; d = addLocalDays(d, 1)) { const w = isoWeek(d); if (!weeks.includes(w)) weeks.push(w); }
  return [month.slice(0, 4), month, ...weeks];
}
/** A period in words: "Week 47 (Nov 16 – Nov 22, 2026)", "Nov 2026", "2026". */
export function periodWords(period: string): string {
  const k = kindOf(period);
  if (k === 'week') { const {from, to} = periodRange(period); return `Week ${Number(period.slice(6))} (${formatDate(from, {year: false})} – ${formatDate(to)})`; }
  return k === 'month' ? formatMonth(period) : period;
}
