import {stepsTrack} from '../../../ai/local-answers/exact/health';
import type {Period} from '../../../ai/local-answers/exact/period';
import type {Track} from '../../../ai/local-answers/exact/track';
import {weekStart} from '../../../ai/tools/range';
import type {HealthData} from '../../../health';
import {addLocalDays} from '../../../local-date';
import type {MoodDay} from '../../../moods/schema';
import {formatDate, formatMonth, formatNumber} from '../../../visual-format';
import {MOOD_WORDS} from '../../../wrap-up/engine';
import {calendarOf, dayNames, periodLabel, widgetPeriod, type CalendarView} from './calendar';
import {asOfDay} from './health-scan';
import type {AxWords} from './health-trend';

/**
 * Session AS (ADR-042 Part 2, family: heat): days as cells whose light says how much.
 * - Steps heat: the last 13 weeks, a column a week (Monday first), a cell a day, lit in four steps by the day's steps —
 *   against the person's own step target where one is set, else against the highest day shown. A day with nothing logged
 *   is an unlit dashed cell (unknown, never zero); the steps are the exact layer's own track.
 * - Mood map: a month of days, each coloured by the step of the mood kept that evening (Health → the wrap-up's mood, one
 *   a day, 1–5, in the wrap-up's own words). Counts only: no average, no score, no judgement.
 */
export const HEAT_WEEKS = 13;
export type HeatCell = {date: string; /** 'none': nothing logged; 'open': today, nothing yet; 'ahead': still to come. */ state: 'lit' | 'none' | 'open' | 'ahead'; level: 0 | 1 | 2 | 3 | 4; value: number | null; today: boolean; words: string};
export type HeatView = {
  from: string; to: string;
  /** Thirteen weeks, oldest first; each Monday to Sunday. */
  weeks: HeatCell[][];
  /** The month's name over the first week that starts in it. */
  months: {week: number; label: string}[];
  days: number; logged: number; average: number | null; best: {date: string; value: number} | null;
  target: number | null;
  /** What each of the four steps of light means, in words. */
  key: (readonly [string, string])[];
  any: boolean; words: AxWords;
};
export function stepsHeat(health: HealthData, today: string): HeatView {
  const track = stepsTrack(health, today), target = track.measure!.target, from = addLocalDays(weekStart(today), -(HEAT_WEEKS - 1) * 7), text = (v: number) => `${formatNumber(Math.round(v))} steps`;
  const dates = Array.from({length: HEAT_WEEKS * 7}, (_, i) => addLocalDays(from, i)), past = dates.filter(d => d <= today), by = new Map(track.points(past).map(p => [p.date, p.value] as const));
  const known = past.flatMap(date => { const value = by.get(date) ?? null; return value === null ? [] : [{date, value}]; }), top = Math.max(1, ...known.map(k => k.value));
  const level = (v: number): 1 | 2 | 3 | 4 => target !== null ? (v >= target * 1.25 ? 4 : v >= target ? 3 : v >= target / 2 ? 2 : 1) : (v > top * .75 ? 4 : v > top * .5 ? 3 : v > top * .25 ? 2 : 1);
  const cell = (date: string): HeatCell => {
    const value = date > today ? null : by.get(date) ?? null, day = formatDate(date, {weekday: true, year: false});
    if (date > today) return {date, state: 'ahead', level: 0, value: null, today: false, words: `${day}: still to come`};
    if (value === null) return {date, state: date === today ? 'open' : 'none', level: 0, value: null, today: date === today, words: `${day}: nothing logged${date === today ? ' yet' : ''}`};
    return {date, state: 'lit', level: level(value), value, today: date === today, words: `${day}: ${text(value)}`};
  };
  const weeks = Array.from({length: HEAT_WEEKS}, (_, w) => dates.slice(w * 7, w * 7 + 7).map(cell));
  const months = weeks.flatMap((week, w) => { const first = week[0]!.date, prev = w ? weeks[w - 1]![0]!.date : null; return !prev || prev.slice(0, 7) !== first.slice(0, 7) ? [{week: w, label: formatMonth(`${first}T12:00:00Z`, {year: false, timeZone: 'UTC'})}] : []; })
    // A month's name needs about three weeks of room: one that starts too close to the next, or to the right edge, is left out.
    .filter((m, i, all) => m.week <= HEAT_WEEKS - 3 && (i === all.length - 1 || all[i + 1]!.week - m.week >= 3));
  const sum = known.reduce((a, k) => a + k.value, 0), average = known.length ? sum / known.length : null, best = known.length ? known.reduce((a, k) => k.value > a.value ? k : a) : null;
  const reached = target === null ? null : known.filter(k => k.value >= target).length;
  const key: (readonly [string, string])[] = target !== null
    ? [['h1', 'Under half your target'], ['h2', 'Half or more'], ['h3', 'Target reached'], ['h4', 'A quarter over or more'], ['none', 'Nothing logged']]
    : [['h1', 'Up to a quarter of your highest day'], ['h2', 'Up to half'], ['h3', 'Up to three quarters'], ['h4', 'Near your highest'], ['none', 'Nothing logged']];
  const none = past.filter(d => !by.has(d) || by.get(d) === null).filter(d => d !== today);
  const span = `${formatDate(from, {year: false})} – ${formatDate(today, {year: false})}`;
  return {from, to: today, weeks, months, days: past.length, logged: known.length, average, best, target, key, any: known.length > 0 || track.points([today])[0]!.value !== null,
    words: {
      figure: average === null ? '—' : formatNumber(Math.round(average)), unit: 'steps a day', label: 'on average · the last 13 weeks',
      note: [`${formatNumber(known.length)} of ${formatNumber(past.length)} days logged`, reached !== null ? `target ${formatNumber(target!)} reached on ${formatNumber(reached)}` : '', best ? `highest ${text(best.value)}, ${asOfDay(best.date, today)}` : ''].filter(Boolean).join(' · '),
      asOf: `${span} · ${formatNumber(known.length)} days logged`, caption: 'Steps, the last 13 weeks',
      rows: [
        ['Average a day', average === null ? 'Nothing logged' : `${text(average)} over ${formatNumber(known.length)} days logged`],
        ['Days logged', `${formatNumber(known.length)} of ${formatNumber(past.length)}`],
        ['Your target', target === null ? 'Not set' : `${text(target)}, reached on ${formatNumber(reached!)} of ${formatNumber(known.length)} days logged`],
        ...(best ? [['Highest day', `${text(best.value)}, ${asOfDay(best.date, today)}`] as const] : []),
        ['Nothing logged (unknown, not counted)', none.length ? `${formatNumber(none.length)} days` : 'None'],
        ...weeks.map(week => { const lit = week.filter(c => c.value !== null); return [`Week of ${formatDate(week[0]!.date, {year: false})}`, lit.length ? lit.map(c => `${formatDate(c.date, {year: false})} ${formatNumber(c.value!)}`).join(', ') : 'Nothing logged'] as const; }),
      ],
    }};
}

/* ---- Mood map ---- */
export type MoodMapView = {
  view: CalendarView; period: Period;
  /** Days with a mood in the period, and how many fell on each of the five steps (Hard … Great). */
  logged: number; counts: number[];
  key: (readonly [string, string])[];
  /** Whether a mood was ever kept. */
  any: boolean; words: AxWords;
};
export const moodWord = (step: number): string => MOOD_WORDS[Math.max(1, Math.min(5, Math.round(step))) - 1]!;
/** The moods as a track of days (a day with a mood counts; its value is the mood's step, 1–5), so the map is the calendar family's own grid. */
export function moodTrack(days: Readonly<Record<string, Pick<MoodDay, 'mood'>>>, today: string): Track {
  return {key: 'mood', domain: 'health', name: 'Mood', kind: 'event', did: ['a mood kept', 'een stemming bewaard'], not: ['no mood kept', 'geen stemming bewaard'], source: ['Your Health records', 'Je Health-gegevens'],
    points: dates => dates.map(date => { const value = days[date]?.mood ?? null; return {date, value, state: value === null ? (date === today ? 'open' : 'none') : 'done'}; }),
    measure: {text: v => moodWord(v), kind: 'level', target: null}, widgets: () => []};
}
export function moodMap(days: Readonly<Record<string, Pick<MoodDay, 'mood'>>>, token: string | undefined, today: string): MoodMapView {
  const track = moodTrack(days, today), period = widgetPeriod(token, today, 'this-month'), view = calendarOf(track, period, today, 'done'), label = periodLabel(period, today);
  const points = track.points(period.days).filter(p => p.value !== null), counts = [1, 2, 3, 4, 5].map(step => points.filter(p => p.value === step).length);
  const most = Math.max(...counts), top = most ? counts.flatMap((n, i) => n === most ? [moodWord(i + 1)] : []) : [];
  const n = points.length, dayWord = (c: number) => `${formatNumber(c)} ${c === 1 ? 'day' : 'days'}`;
  return {view, period, logged: n, counts, any: Object.keys(days).some(d => d <= today), key: [...[1, 2, 3, 4, 5].map(step => [`m${step}`, moodWord(step)] as const), ['none', 'No mood kept'] as const],
    words: {
      figure: String(n), unit: n === 1 ? 'day' : 'days', label: `with a mood · ${label}`,
      note: n ? `Most often: ${top.join(' and ')} (${dayWord(most)})` : 'No mood kept in this period',
      asOf: `${view.title} · ${label}`, caption: `Your mood by day, ${label}`,
      rows: [['Days with a mood', dayWord(n)], ...[5, 4, 3, 2, 1].map(step => { const on = points.filter(p => p.value === step).map(p => p.date); return [moodWord(step), on.length ? `${dayWord(on.length)}: ${dayNames(on, 31)}` : 'No day'] as const; })],
    }};
}
