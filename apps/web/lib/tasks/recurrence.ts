import {addLocalDays, localWeekday} from '../local-date';
import type {Recur} from './schema';

/**
 * Session AL (Part 8, P-LS-02): the repeat rules of Tasks, a small hand-written engine with no dependency. Pure: every
 * function takes the days it needs ("YYYY-MM-DD", floating local days). A rule names the next due day after a finish:
 * - from the due day (the plan): "every Monday" stays on Mondays even when one is finished late; occurrences that fell
 *   in the past while it was overdue are skipped, so the next one is today or later;
 * - from the day it was finished ("every! 3 days", TickTick's "after completion"): N units after that day.
 * `until` and `left` end the series: `next` returns null when nothing is left.
 */
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDINAL = (n: number) => n === -1 ? 'last' : ['', 'first', 'second', 'third', 'fourth', 'fifth'][n] ?? `${n}th`;
const suffix = (n: number) => n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';

const parts = (date: string) => ({y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)), d: Number(date.slice(8, 10))});
const ymd = (y: number, m: number, d: number) => `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
/** Months added, the day clamped to the month's last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(date: string, months: number, day?: number): string {
  const {y, m, d} = parts(date), index = y * 12 + (m - 1) + months, ny = Math.floor(index / 12), nm = index % 12 + 1;
  const want = day === undefined ? d : day === -1 ? 31 : day;
  return ymd(ny, nm, Math.min(want, daysInMonth(ny, nm)));
}
/** The nth weekday of a month (n -1 = the last), or null when the month has no fifth one. */
export function nthWeekday(y: number, m: number, n: number, weekday: number): string | null {
  if (n === -1) { const last = ymd(y, m, daysInMonth(y, m)); return addLocalDays(last, -((localWeekday(last) - weekday + 7) % 7)); }
  const first = ymd(y, m, 1), date = addLocalDays(first, (weekday - localWeekday(first) + 7) % 7 + 7 * (n - 1));
  return parts(date).m === m ? date : null;
}
const weekIndex = (date: string) => Math.floor((Date.parse(`${addLocalDays(date, -((localWeekday(date) + 6) % 7))}T00:00:00Z`) / 86_400_000) / 7);

/** The first occurrence strictly after `after`, counted from `anchor` (the series' current day). */
function occurrenceAfter(rule: Recur, anchor: string, after: string): string | null {
  const n = rule.interval;
  switch (rule.every) {
    case 'day': {
      const gap = Math.max(1, Math.ceil((Date.parse(`${after}T00:00:00Z`) - Date.parse(`${anchor}T00:00:00Z`)) / 86_400_000 / n + 1e-9));
      let date = addLocalDays(anchor, gap * n);
      while (date <= after) date = addLocalDays(date, n);
      return date;
    }
    case 'week': {
      const days = rule.weekdays?.length ? rule.weekdays : [localWeekday(anchor)], start = weekIndex(anchor);
      // Day by day, at most two years of a rule's weeks (a "every 52 weeks" rule fits).
      for (let date = addLocalDays(after, 1), i = 0; i < 366 * 2 + 7 * n; i++, date = addLocalDays(date, 1)) {
        if (days.includes(localWeekday(date)) && (weekIndex(date) - start) % n === 0) return date;
      }
      return null;
    }
    case 'month': {
      const {y, m} = parts(anchor);
      for (let k = 0; k <= 12 * 40; k += n) {
        const index = y * 12 + (m - 1) + k, ny = Math.floor(index / 12), nm = index % 12 + 1;
        const date = rule.nth ? nthWeekday(ny, nm, rule.nth.n, rule.nth.weekday) : ymd(ny, nm, Math.min(rule.monthDay === -1 ? 31 : rule.monthDay ?? parts(anchor).d, daysInMonth(ny, nm)));
        if (date && date > after) return date;
      }
      return null;
    }
    case 'year': {
      const {y, m, d} = parts(anchor);
      for (let k = 0; k <= 400; k += n) { const date = ymd(y + k, m, Math.min(d, daysInMonth(y + k, m))); if (date > after) return date; }
      return null;
    }
  }
}

/**
 * The first due day of a new repeating task: `start` itself when it matches the rule, else the first match after it
 * ("every Monday" typed on a Wednesday starts next Monday; "every month on the 1st" starts on the next 1st).
 */
export function firstDue(rule: Recur, start: string): string {
  if (matches(rule, start)) return start;
  return occurrenceAfter({...rule, interval: rule.every === 'day' || rule.every === 'year' ? rule.interval : 1}, start, start) ?? start;
}
/** Whether a day fits the rule's shape (weekday, day of month, nth weekday); intervals are counted from the start. */
export function matches(rule: Recur, date: string): boolean {
  const {y, m, d} = parts(date);
  if (rule.every === 'week') return !rule.weekdays?.length || rule.weekdays.includes(localWeekday(date));
  if (rule.every === 'month') return rule.nth ? nthWeekday(y, m, rule.nth.n, rule.nth.weekday) === date : rule.monthDay === undefined || d === Math.min(rule.monthDay === -1 ? 31 : rule.monthDay, daysInMonth(y, m));
  return true;
}

/**
 * The next due day after an occurrence is finished (or skipped), with the rule's count taken down by one; null when the
 * series has ended (its `until` passed or nothing left). `due` is the occurrence's day (the finish day when it had none).
 */
export function nextOccurrence(rule: Recur, due: string, finishedDay: string, today: string): {due: string; rule: Recur} | null {
  if (rule.left !== undefined && rule.left <= 1) return null;
  let next: string | null;
  if (rule.afterDone) {
    next = rule.every === 'day' ? addLocalDays(finishedDay, rule.interval) : rule.every === 'week' ? addLocalDays(finishedDay, 7 * rule.interval) : rule.every === 'month' ? addMonths(finishedDay, rule.interval) : addMonths(finishedDay, 12 * rule.interval);
  } else {
    next = occurrenceAfter(rule, due, due);
    // Occurrences missed while it was overdue are skipped: the next one is today or later.
    let guard = 0;
    while (next && next < today && guard++ < 5000) next = occurrenceAfter(rule, due, next);
  }
  if (!next || (rule.until && next > rule.until)) return null;
  return {due: next, rule: rule.left !== undefined ? {...rule, left: rule.left - 1} : rule};
}

/** The next few due days of a series, for the editor's preview ("Next: Mon 3 Nov, Mon 10 Nov, …"). */
export function upcoming(rule: Recur, due: string, count = 3): string[] {
  const out = [due];
  let current = due, r = rule;
  while (out.length < count) { const next = nextOccurrence({...r, afterDone: false}, current, current, current); if (!next) break; out.push(next.due); current = next.due; r = next.rule; }
  return out;
}

/** The rule in plain words: "Every 2 weeks on Mon, Wed", "Every month on the 1st", "Every 3 days after it's done". */
export function describeRecur(rule: Recur): string {
  const n = rule.interval, every = n === 1 ? 'Every' : `Every ${n}`;
  const unit = (one: string) => n === 1 ? one : `${one}s`;
  let text: string;
  if (rule.every === 'day') text = `${every} ${unit('day')}`;
  else if (rule.every === 'week') {
    const days = [...(rule.weekdays ?? [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    const named = days.length === 5 && [1, 2, 3, 4, 5].every(d => days.includes(d)) ? 'weekday' : days.length === 7 ? 'day' : null;
    text = named && n === 1 ? `Every ${named}` : days.length ? `${every} ${unit('week')} on ${days.map(d => WEEKDAY_NAMES[d]!.slice(0, 3)).join(', ')}` : `${every} ${unit('week')}`;
  } else if (rule.every === 'month') {
    text = rule.nth ? `${every} ${unit('month')} on the ${ORDINAL(rule.nth.n)} ${WEEKDAY_NAMES[rule.nth.weekday]}` : rule.monthDay === -1 ? `${every} ${unit('month')} on the last day` : rule.monthDay ? `${every} ${unit('month')} on the ${rule.monthDay}${suffix(rule.monthDay)}` : `${every} ${unit('month')}`;
  } else text = `${every} ${unit('year')}`;
  if (rule.afterDone) text += ' after it’s done';
  if (rule.until) text += ` until ${rule.until}`;
  if (rule.left !== undefined) text += ` (${rule.left} left)`;
  return text;
}
