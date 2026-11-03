/**
 * Session AK (BUILD list 2 #3, lane B2a): "On this day" in the Journal — what the person wrote on today's date in
 * earlier years, or, when no year matches, about a month ago. Pure: dates are the journal's calendar keys (YYYY-MM-DD)
 * and today is the caller's local date, so nothing moves with a time zone. 29 February meets 28 February in a common
 * year (its anniversary that year); a day of the month the previous month does not have meets that month's last day.
 * Entries the person chose not to see again here (`hidden`) are left out. Nothing is stored or sent.
 */
export type DatedEntry = {id: string; date: string; text: string};
export type OnThisDayItem<E extends DatedEntry = DatedEntry> = {entry: E; years: number | null; months: number | null; label: string};
export const ON_THIS_DAY_MAX = 5;
/** The first lines shown before "Read it all". */
export const PREVIEW_CHARS = 220;

const parse = (d: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); return m ? {y: Number(m[1]), m: Number(m[2]), d: Number(m[3])} : null; };
const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const daysInMonth = (y: number, m: number) => [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;

/** The entry's date that falls in `year` (29 February becomes 28 February in a common year). */
export function anniversaryIn(date: string, year: number): string | null {
  const p = parse(date); if (!p) return null;
  const day = Math.min(p.d, daysInMonth(year, p.m));
  return `${String(year).padStart(4, '0')}-${String(p.m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export const agoLabel = (years: number | null, months: number | null) => years ? `${years} ${years === 1 ? 'year' : 'years'} ago` : months === 1 ? 'A month ago' : '';

/**
 * Today's memories, newest year first (1 year ago, 2 years ago, 3 or more…); only when no earlier year matches, the
 * entries from the same day a month ago. At most `max` entries; an empty list means the card stays away.
 */
export function onThisDay<E extends DatedEntry>(entries: readonly E[], today: string, {hidden = [], max = ON_THIS_DAY_MAX}: {hidden?: readonly string[]; max?: number} = {}): OnThisDayItem<E>[] {
  const t = parse(today); if (!t) return [];
  const skip = new Set(hidden), shown = entries.filter(e => !skip.has(e.id) && e.text.trim());
  const byYear: OnThisDayItem<E>[] = [];
  for (const e of shown) {
    const p = parse(e.date); if (!p || p.y >= t.y) continue;
    if (anniversaryIn(e.date, t.y) === today) byYear.push({entry: e, years: t.y - p.y, months: null, label: agoLabel(t.y - p.y, null)});
  }
  if (byYear.length) return byYear.sort((a, b) => a.years! - b.years! || a.entry.date.localeCompare(b.entry.date) || a.entry.id.localeCompare(b.entry.id)).slice(0, max);
  const prevY = t.m === 1 ? t.y - 1 : t.y, prevM = t.m === 1 ? 12 : t.m - 1;
  const byMonth: OnThisDayItem<E>[] = [];
  for (const e of shown) {
    const p = parse(e.date); if (!p || p.y !== prevY || p.m !== prevM) continue;
    // The entry's day, moved into this month: the 31st meets the last day of a shorter month.
    if (Math.min(p.d, daysInMonth(t.y, t.m)) === t.d) byMonth.push({entry: e, years: null, months: 1, label: agoLabel(null, 1)});
  }
  return byMonth.sort((a, b) => b.entry.date.localeCompare(a.entry.date) || a.entry.id.localeCompare(b.entry.id)).slice(0, max);
}

/** The first lines of an entry, cut at a word, with an ellipsis when there is more. */
export function preview(text: string, chars = PREVIEW_CHARS): {text: string; more: boolean} {
  const clean = text.trim();
  if (clean.length <= chars) return {text: clean, more: false};
  const cut = clean.slice(0, chars), space = cut.lastIndexOf(' ');
  return {text: `${(space > chars * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`, more: true};
}
