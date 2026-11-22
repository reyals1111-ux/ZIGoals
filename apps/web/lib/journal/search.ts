import {addLocalDays} from '../local-date';
import {inBook, type BookChoice} from './books';
import {hasTag} from './tags';
import type {Journal, JournalEntry} from './schema';

/**
 * Session AV lane 2 (journal; LEDGER #43, Day One's search by date and the calendar): one filter for the Journal's list —
 * the words or a #tag typed, a tag chip, a journal, and a day range (From / To, a day picked on the calendar, or a date
 * typed in the search: "2026-11-03", "2026-11", "3 nov", "november 2026"; a month alone needs its year). Newest first. Pure; nothing is stored.
 */
export type EntryFilter = {query?: string; tag?: string | null; book?: BookChoice; from?: string | null; to?: string | null; /** Session AV lane 2 (r3-notes; LEDGER #269): only the entries about this week, month or year. */ period?: string | null};
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS: Record<string, number> = {jan: 1, january: 1, januari: 1, feb: 2, february: 2, februari: 2, mar: 3, march: 3, mrt: 3, maart: 3, apr: 4, april: 4, may: 5, mei: 5, jun: 6, june: 6, juni: 6, jul: 7, july: 7, juli: 7, aug: 8, august: 8, augustus: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, okt: 10, oktober: 10, nov: 11, november: 11, dec: 12, december: 12};
const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
/**
 * A date typed in the search box as a day range, or null when it is words: "2026-11-03" (that day), "2026-11" (that
 * month), "3 nov" / "nov 3" / "3 november 2026" (that day; this year when no year), "november 2026" / "nov 2026" (that month).
 */
export function dateQuery(raw: string, today: string): {from: string; to: string} | null {
  const q = raw.trim().toLowerCase().replace(/[,.]/g, ' ').replace(/\s+/g, ' ');
  if (!q) return null;
  if (DAY.test(q)) return {from: q, to: q};
  let m = /^(\d{4})-(\d{2})$/.exec(q);
  if (m) { const y = Number(m[1]), mo = Number(m[2]); return mo >= 1 && mo <= 12 ? {from: `${m[1]}-${m[2]}-01`, to: `${m[1]}-${m[2]}-${pad(lastDay(y, mo))}`} : null; }
  const year = Number(today.slice(0, 4));
  m = /^(\d{1,2}) ([a-z]+)(?: (\d{4}))?$/.exec(q) ?? null;
  const dm = m ? {d: Number(m[1]), mon: m[2]!, y: m[3]} : (() => { const x = /^([a-z]+) (\d{1,2})(?: (\d{4}))?$/.exec(q); return x ? {d: Number(x[2]), mon: x[1]!, y: x[3]} : null; })();
  if (dm && MONTHS[dm.mon]) {
    const y = dm.y ? Number(dm.y) : year, mo = MONTHS[dm.mon]!;
    if (dm.d < 1 || dm.d > lastDay(y, mo)) return null;
    const d = `${y}-${pad(mo)}-${pad(dm.d)}`; return {from: d, to: d};
  }
  // A month alone needs its year ("november 2026"): "may" or "march" alone are words people write.
  const month = /^([a-z]+) (\d{4})$/.exec(q);
  if (month && MONTHS[month[1]!]) { const y = Number(month[2]), mo = MONTHS[month[1]!]!; return {from: `${y}-${pad(mo)}-01`, to: `${y}-${pad(mo)}-${pad(lastDay(y, mo))}`}; }
  return null;
}
const wordsMatch = (e: JournalEntry, q: string) => { const w = q.toLowerCase(); return e.text.toLowerCase().includes(w) || (e.tags ?? []).some(t => t.toLowerCase().includes(w.replace(/^#/, ''))); };
/** The entries the filter keeps, newest first. A typed date filters by day; any other words by text and tags. */
export function filterEntries(journal: Pick<Journal, 'entries' | 'journals'>, filter: EntryFilter, today: string): JournalEntry[] {
  const q = (filter.query ?? '').trim(), typedDate = dateQuery(q, today);
  const from = [filter.from, typedDate?.from].filter((d): d is string => !!d && DAY.test(d)).sort().at(-1) ?? null;
  const to = [filter.to, typedDate?.to].filter((d): d is string => !!d && DAY.test(d)).sort()[0] ?? null;
  return [...journal.entries].reverse().filter(e => hasTag(e, filter.tag ?? null) && inBook(journal, e, filter.book ?? 'all') && (!filter.period || e.period === filter.period)
    && (!from || e.date >= from) && (!to || e.date <= to) && (typedDate || !q || wordsMatch(e, q)));
}
/** The day range in words, for the list's line ("Nov 3, 2026" or "Nov 1 – Nov 30, 2026"). */
export const rangeIsDay = (from: string | null | undefined, to: string | null | undefined) => !!from && from === to;

/** One month for the calendar: its weeks (Monday first), each day with how many entries it holds. */
export type CalendarDay = {date: string; inMonth: boolean; count: number; future: boolean};
export function monthGrid(month: string, entries: readonly Pick<JournalEntry, 'date'>[], today: string): CalendarDay[][] {
  const first = `${month}-01`, y = Number(month.slice(0, 4)), mo = Number(month.slice(5, 7));
  const counts = new Map<string, number>(); for (const e of entries) if (e.date.startsWith(month)) counts.set(e.date, (counts.get(e.date) ?? 0) + 1);
  const weekday = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday 0
  let d = addLocalDays(first, -weekday);
  const last = `${month}-${pad(lastDay(y, mo))}`, weeks: CalendarDay[][] = [];
  while (d <= last) {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) { week.push({date: d, inMonth: d.startsWith(month), count: counts.get(d) ?? 0, future: d > today}); d = addLocalDays(d, 1); }
    weeks.push(week);
  }
  return weeks;
}
export const shiftMonth = (month: string, by: number) => { const y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7)) - 1 + by, yy = y + Math.floor(m / 12), mm = ((m % 12) + 12) % 12 + 1; return `${yy}-${pad(mm)}`; };
