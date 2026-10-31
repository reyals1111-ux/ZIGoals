import {monthStarts, yearWeeks} from '../habits-extras/year';
import {formatDate} from '../visual-format';
import {MOOD_WORDS} from '../wrap-up/engine';
import {ENERGY_WORDS} from '../energy/schema';

/**
 * Session AK (lane S, item 13; COMPETITORS.md (b) 13, Daylio's Year in Pixels [14]): a year of the person's own days,
 * one square each, coloured by the day's mood (Health's moods, 1–5) or energy (zigoals:energy:v1, 1–5). It reuses the
 * habit year view's 53 × 7 layout (lib/habits-extras/year.ts: weeks Monday first, the first column holding 1 January).
 * A day without a rating stays empty, never a low value; days ahead and outside the year are blank. Every square has a
 * label in words, so colour is never the only way to read it.
 */
export type PixelMetric = 'mood' | 'energy';
export type Pixel = {date: string; value: number | null; inYear: boolean; future: boolean; entries: number; word: string | null};
export type PixelYear = {weeks: Pixel[][]; months: {label: string; week: number}[]; counts: [number, number, number, number, number]; rated: number; summary: string};
/** The app's own words for each level (the wrap-up's moods, the check-in's energy). */
export const levelWord = (metric: PixelMetric, v: number): string => { const w = (metric === 'mood' ? MOOD_WORDS : ENERGY_WORDS.en)[v - 1]; return w ? w[0]!.toUpperCase() + w.slice(1) : String(v); };

export type PixelSources = {moods?: Readonly<Record<string, {mood: number}>>; energy?: Readonly<Record<string, {energy: number}>>; journalDates?: readonly string[]; words?: Readonly<Record<string, {word: string}>>};
const rating = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;

export function pixelYear(year: number, today: string, metric: PixelMetric, src: PixelSources): PixelYear {
  const journal = new Map<string, number>(); for (const d of src.journalDates ?? []) journal.set(d, (journal.get(d) ?? 0) + 1);
  const counts: PixelYear['counts'] = [0, 0, 0, 0, 0];
  let rated = 0;
  const grid = yearWeeks(year);
  const weeks = grid.map(week => week.map(date => {
    const inYear = date.startsWith(`${year}-`), future = date > today;
    const value = !inYear || future ? null : rating(metric === 'mood' ? src.moods?.[date]?.mood : src.energy?.[date]?.energy);
    if (value !== null) { counts[value - 1] = (counts[value - 1] ?? 0) + 1; rated++; }
    return {date, value, inYear, future, entries: inYear && !future ? journal.get(date) ?? 0 : 0, word: inYear && !future ? src.words?.[date]?.word ?? null : null};
  }));
  const what = metric === 'mood' ? 'mood' : 'energy';
  const summary = rated ? `${year}: ${rated} ${rated === 1 ? 'day' : 'days'} with a ${what} rating. ${counts.map((n, i) => `${levelWord(metric, i + 1)} ${n}`).join(', ')}.` : `${year}: no ${what} rating yet.`;
  return {weeks, months: monthStarts(grid, year), counts, rated, summary};
}
/** A square's label in words ("Tuesday, Mar 3, 2026: mood Good, 4 of 5 · calm · 1 journal entry"). */
export function pixelLabel(p: Pixel, metric: PixelMetric): string {
  const day = formatDate(p.date, {weekday: true});
  if (!p.inYear) return day;
  if (p.future) return `${day}: ahead`;
  const parts = [p.value === null ? `no ${metric} rating` : `${metric} ${levelWord(metric, p.value)}, ${p.value} of 5`];
  if (p.word) parts.push(p.word);
  if (p.entries) parts.push(`${p.entries} journal ${p.entries === 1 ? 'entry' : 'entries'}`);
  return `${day}: ${parts.join(' · ')}`;
}
/** The years the toggle can step through: the first year with any rating or entry up to this year. */
export function pixelYears(today: string, src: PixelSources): number[] {
  const all = [...Object.keys(src.moods ?? {}), ...Object.keys(src.energy ?? {}), ...(src.journalDates ?? [])].filter(d => /^\d{4}-/.test(d)).sort();
  const last = Number(today.slice(0, 4)), first = Math.max(last - 10, Math.min(last, Number((all[0] ?? today).slice(0, 4))));
  return Array.from({length: last - first + 1}, (_, i) => first + i);
}
/** Keyboard movement in the grid: arrows by a day (up/down) or a week (left/right), Home/End to the year's ends. */
export function moveDay(weeks: readonly Pixel[][], at: {w: number; d: number}, key: string): {w: number; d: number} | null {
  const W = weeks.length, ok = (w: number, d: number) => w >= 0 && w < W && d >= 0 && d < 7 && weeks[w]![d]!.inYear;
  const flat = weeks.flatMap((week, w) => week.map((p, d) => ({w, d, p}))).filter(x => x.p.inYear);
  const index = flat.findIndex(x => x.w === at.w && x.d === at.d);
  const step = (n: number) => { const x = flat[index + n]; return x ? {w: x.w, d: x.d} : null; };
  switch (key) {
    case 'ArrowDown': return step(1);
    case 'ArrowUp': return step(-1);
    case 'ArrowRight': return ok(at.w + 1, at.d) ? {w: at.w + 1, d: at.d} : null;
    case 'ArrowLeft': return ok(at.w - 1, at.d) ? {w: at.w - 1, d: at.d} : null;
    case 'Home': return flat[0] ? {w: flat[0].w, d: flat[0].d} : null;
    case 'End': return flat.at(-1) ? {w: flat.at(-1)!.w, d: flat.at(-1)!.d} : null;
    default: return null;
  }
}
/** Where a day sits in the grid, or null when it is not in that year. */
export function findDay(weeks: readonly Pixel[][], date: string): {w: number; d: number} | null {
  for (let w = 0; w < weeks.length; w++) { const d = weeks[w]!.findIndex(p => p.date === date && p.inYear); if (d >= 0) return {w, d}; }
  return null;
}
