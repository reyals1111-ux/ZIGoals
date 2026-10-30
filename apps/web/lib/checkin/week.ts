import {addLocalDays, localWeekday} from '../local-date';

/**
 * Session AJ (item 10, D14; COMPANIONS.md P2): the week of check-ins. This week (Monday to Sunday) as an energy and a
 * mood per day; a day without a check-in is "no check-in", never a gap to fill. Shown once 4 of the week's days have
 * one. A comparison with the 4 weeks before (only with 14 rated days there): "about the same" under 0.3 points, else
 * "higher" or "lower" — never "better" or "worse". A weekday line over the last 8 weeks when 28 days are rated, the two
 * weekdays named have 4 ratings each and differ by 0.5 or more: an early sign, or consistent when both 4-week halves keep
 * that order. The comparisons are counted from the Monday, so they hold through the week.
 */
export type WeekDay = {date: string; energy: number | null; mood: number | null};
export type Compare = {kind: 'same' | 'higher' | 'lower'; previous: number};
export type WeekPattern = {
  week: WeekDay[]; rated: number; shown: boolean;
  energy: number | null; mood: number | null;
  compareEnergy: Compare | null; compareMood: Compare | null;
  weekday: {series: 'energy' | 'mood'; highest: {weekday: number; value: number}; lowest: {weekday: number; value: number}; label: 'early' | 'consistent'} | null;
};
export const WEEKDAY_NAMES = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'] as const;
type Values = Readonly<Record<string, number>>;
const avg = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
/** Monday = 0 … Sunday = 6. */
const isoWeekday = (date: string) => (localWeekday(date) + 6) % 7;
export function weekPattern({energy, mood, today}: {energy: Values; mood: Values; today: string}): WeekPattern {
  const monday = addLocalDays(today, -isoWeekday(today));
  const week = Array.from({length: 7}, (_, i) => { const date = addLocalDays(monday, i); return {date, energy: date <= today ? energy[date] ?? null : null, mood: date <= today ? mood[date] ?? null : null}; });
  const rated = week.filter(d => d.energy !== null || d.mood !== null).length;
  const values = (series: Values, from: string, to: string) => Object.entries(series).filter(([d]) => d >= from && d <= to).map(([, v]) => v);
  const compare = (series: Values, now: number | null): Compare | null => {
    const prev = values(series, addLocalDays(monday, -28), addLocalDays(monday, -1)), previous = avg(prev);
    if (now === null || previous === null || prev.length < 14) return null;
    const diff = now - previous;
    return {kind: Math.abs(diff) < 0.3 ? 'same' : diff > 0 ? 'higher' : 'lower', previous};
  };
  const thisWeek = (k: 'energy' | 'mood') => avg(week.map(d => d[k]).filter((v): v is number => v !== null));
  const e = thisWeek('energy'), m = thisWeek('mood');
  // The weekday line, from the 56 days before this Monday (so it holds through the week).
  const weekdayOf = (series: Values, label: 'energy' | 'mood') => {
    const from = addLocalDays(monday, -56), to = addLocalDays(monday, -1), mid = addLocalDays(monday, -28);
    const days = Object.entries(series).filter(([d]) => d >= from && d <= to);
    if (days.length < 28) return null;
    const by = (rows: [string, number][]) => Array.from({length: 7}, (_, w) => rows.filter(([d]) => isoWeekday(d) === w).map(([, v]) => v));
    const all = by(days), means = all.map(v => (v.length >= 4 ? avg(v) : null));
    const candidates = means.map((v, w) => ({weekday: w, value: v})).filter((x): x is {weekday: number; value: number} => x.value !== null);
    if (candidates.length < 2) return null;
    const highest = candidates.reduce((a, b) => (b.value > a.value ? b : a)), lowest = candidates.reduce((a, b) => (b.value < a.value ? b : a));
    if (highest.value - lowest.value < 0.5) return null;
    const half = (rows: [string, number][]) => { const h = by(rows); const hi = avg(h[highest.weekday]!), lo = avg(h[lowest.weekday]!); return hi !== null && lo !== null && hi > lo; };
    const consistent = half(days.filter(([d]) => d < mid)) && half(days.filter(([d]) => d >= mid));
    return {series: label, highest, lowest, label: consistent ? 'consistent' as const : 'early' as const};
  };
  return {week, rated, shown: rated >= 4, energy: e, mood: m, compareEnergy: compare(energy, e), compareMood: compare(mood, m), weekday: weekdayOf(energy, 'energy') ?? weekdayOf(mood, 'mood')};
}
/** The plain sentences of a shown week (English; the words never rank days as good or bad). */
export function weekLines(p: WeekPattern): string[] {
  if (!p.shown) return [];
  const one = (v: number) => v.toFixed(1);
  const parts = [p.energy !== null ? `energy averaged ${one(p.energy)} of 5` : null, p.mood !== null ? `mood ${one(p.mood)} of 5` : null].filter(Boolean);
  const lines = [`This week: ${parts.join('; ')}.`];
  const cmp = (name: string, c: Compare | null) => c ? (c.kind === 'same' ? `${name}: about the same as your previous 4 weeks.` : `${name}: ${c.kind} than your previous 4 weeks (${one(c.previous)}).`) : null;
  for (const line of [cmp('Energy', p.compareEnergy), cmp('Mood', p.compareMood)]) if (line) lines.push(line);
  if (p.weekday) lines.push(`Your ${p.weekday.series} was highest on ${WEEKDAY_NAMES[p.weekday.highest.weekday]} (${one(p.weekday.highest.value)}) and lowest on ${WEEKDAY_NAMES[p.weekday.lowest.weekday]} (${one(p.weekday.lowest.value)}), over the 8 weeks before this one (${p.weekday.label === 'consistent' ? 'consistent' : 'an early sign'}).`);
  return lines;
}
