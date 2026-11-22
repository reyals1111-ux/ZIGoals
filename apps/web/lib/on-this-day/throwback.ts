import {addLocalDays} from '../local-date';
import {isSealed} from '../journal/letters';
import {ON_THIS_DAY_MAX, agoLabel, anniversaryIn, daysInMonth, onThisDay, type DatedEntry, type OnThisDayItem} from './on-this-day';

/**
 * Session AV lane 2 (r4-mind; LEDGER #309, Journey's throwbacks a week, a month and a year back): the Journal's "On this
 * day" with all three beside each other — today's date in earlier years first (as before), then the same day a month
 * ago, then a week ago — and the morning notification's wakes: a day with a memory says only how long ago ("A memory from
 * a year ago"), never a word of it, and only when the person switched it on. Today's card keeps `onThisDay` as it was.
 * Entries set aside with "Not this one" stay away everywhere, and a letter still folded away is never one (review B4D-4).
 * Pure.
 */
export type ThrowbackItem<E extends DatedEntry = DatedEntry> = OnThisDayItem<E> & {weeks?: number | null};
const parse = (d: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); return m ? {y: Number(m[1]), m: Number(m[2]), d: Number(m[3])} : null; };
/** The entries of the same day a month ago (the 31st meets a shorter month's last day, as on this day does). */
function monthAgo<E extends DatedEntry>(shown: readonly E[], today: string): E[] {
  const t = parse(today); if (!t) return [];
  const prevY = t.m === 1 ? t.y - 1 : t.y, prevM = t.m === 1 ? 12 : t.m - 1;
  return shown.filter(e => { const p = parse(e.date); return !!p && p.y === prevY && p.m === prevM && Math.min(p.d, daysInMonth(t.y, t.m)) === t.d; });
}
type Letter = DatedEntry & {opensOn?: string};
export function throwbacks<E extends Letter>(entries: readonly E[], today: string, {hidden = [], max = ON_THIS_DAY_MAX}: {hidden?: readonly string[]; max?: number} = {}): ThrowbackItem<E>[] {
  if (!parse(today)) return [];
  // Review B4D-4: a letter still folded away (round 3's `opensOn`, lib/journal/letters.ts isSealed) is never a memory —
  // not a week, a month or a year back, and never the morning notification; it opens on its own day.
  const skip = new Set(hidden), shown = entries.filter(e => !skip.has(e.id) && e.text.trim() && !isSealed(e, today));
  const years = onThisDay(shown, today, {max: Number.MAX_SAFE_INTEGER}).filter(i => i.years !== null);
  const month = monthAgo(shown, today).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).map(entry => ({entry, years: null, months: 1, label: agoLabel(null, 1)}));
  const weekDay = addLocalDays(today, -7), week = shown.filter(e => e.date === weekDay).sort((a, b) => a.id.localeCompare(b.id)).map(entry => ({entry, years: null, months: null, weeks: 1, label: 'A week ago'}));
  return [...years, ...month, ...week].slice(0, max);
}
/** How long ago, in the notification's words: "a year ago", "3 years ago", "a month ago", "a week ago". */
export const agoWords = (i: Pick<ThrowbackItem, 'years' | 'months' | 'weeks'>) => i.years ? (i.years === 1 ? 'a year ago' : `${i.years} years ago`) : i.months ? 'a month ago' : 'a week ago';
/**
 * The mornings a memory wakes the device: today and tomorrow (the plan's 48 hours), each a day with a throwback, said by
 * its first memory (a year back before a month, a month before a week). An id and a day and those words only; never a word of the entry.
 */
export function memoryWakes(entries: readonly Letter[], display: {onThisDay?: boolean; hidden?: readonly string[]; memoryNotify?: boolean}, today: string): {id: string; date: string; detail: string}[] {
  if (display.memoryNotify !== true || display.onThisDay === false) return [];
  return [today, addLocalDays(today, 1)].flatMap(date => { const first = throwbacks(entries, date, {hidden: display.hidden ?? [], max: 1})[0]; return first ? [{id: `memory:${date}`, date, detail: agoWords(first)}] : []; });
}
/**
 * Session AV lane 2 (r6-notes; LEDGER #403, Diarium's "on this day" for any day): the entries written on another day's
 * date in the years before it — the day before or after today with the arrows, or a day chosen on the journal calendar —
 * nearest year first ("2 years earlier"). As for today: entries set aside with "Not this one" and letters still folded
 * away (as of today, the real day) stay out. 29 February meets 28 February in a common year. Pure.
 */
export function onDate<E extends Letter>(entries: readonly E[], day: string, today: string, {hidden = [], max = 20}: {hidden?: readonly string[]; max?: number} = {}): ThrowbackItem<E>[] {
  const d = parse(day); if (!d || !parse(today)) return [];
  const skip = new Set(hidden), out: ThrowbackItem<E>[] = [];
  for (const e of entries) {
    if (skip.has(e.id) || !e.text.trim() || isSealed(e, today)) continue;
    const p = parse(e.date); if (!p || p.y >= d.y) continue;
    if (anniversaryIn(e.date, d.y) === day) { const years = d.y - p.y; out.push({entry: e, years, months: null, label: years === 1 ? 'A year earlier' : `${years} years earlier`}); }
  }
  return out.sort((a, b) => a.years! - b.years! || a.entry.date.localeCompare(b.entry.date) || a.entry.id.localeCompare(b.entry.id)).slice(0, max);
}
