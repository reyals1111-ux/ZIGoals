import {addLocalDays, localWeekday} from '../../../local-date';
import {formatDate, formatMonth, formatWeekday} from '../../../visual-format';
import {resolvePeriod, type Period} from '../../../ai/local-answers/exact/period';
import {runBest, tally, type DayPoint, type DayState, type Tally} from '../../../ai/local-answers/exact/series';
import type {Track} from '../../../ai/local-answers/exact/track';
import {weekStart} from '../../../ai/tools/range';

/**
 * Session AS (ADR-042 Part 2, family 1: month calendars): the figures of a calendar widget — one track (a habit, a
 * target, a log) over a period, as weeks of days. The days are the exact layer's own points (lib/ai/local-answers/exact:
 * the same `Track` the sentence was written from), so the widget and the words cannot disagree.
 *
 * A period inside one calendar month is drawn as that whole month (days after today are still to come, days outside the
 * period are dimmed); a longer one as the weeks that hold it, six at most, ending on its last day.
 */
export type CalState = DayState | 'ahead';
export type CalCell = {date: string; day: number; state: CalState; today: boolean; inPeriod: boolean; value: number | null; words: string};
export type CalendarView = {
  period: Period; title: string;
  /** Monday first: the weekday letters over the columns. */
  weekdays: string[];
  weeks: CalCell[][];
  tally: Tally;
  /** The days this calendar lights (not done: missed, skipped, below a target, nothing logged; or done), oldest first. */
  lit: string[];
  longestRun: number;
};
/** The period a widget shows: its own token, else the kind's default; never empty. */
export function widgetPeriod(token: string | undefined, today: string, fallback = 'this-month'): Period {
  return (token ? resolvePeriod(token, today) : null) ?? resolvePeriod(fallback, today) ?? resolvePeriod('today', today)!;
}
const pad = (n: number) => String(n).padStart(2, '0');
const WORDS: Record<CalState, string> = {done: 'done', part: 'partly done', missed: 'missed', skipped: 'skipped', open: 'still open', rest: 'not due', none: 'nothing logged', ahead: 'still to come'};
export const calStateWords = (state: CalState, track: Pick<Track, 'did' | 'not' | 'kind'>): string => state === 'done' ? track.did[0] : state === 'part' && track.kind !== 'habit' ? track.not[0] : state === 'none' && track.kind === 'event' ? track.not[0] : WORDS[state];
/** Which states a calendar lights: the days not done (the default), or the days done. */
export type Lit = 'not-done' | 'done';
export const isLit = (state: CalState, lit: Lit, kind: Track['kind']): boolean => lit === 'done' ? state === 'done' : state === 'missed' || state === 'skipped' || state === 'part' || (state === 'none' && kind !== 'habit');
export function calendarOf(track: Track, period: Period, today: string, lit: Lit = 'not-done'): CalendarView {
  const month = period.from.slice(0, 7) === period.to.slice(0, 7);
  const year = Number(period.to.slice(0, 4)), m = Number(period.to.slice(5, 7)) - 1;
  const first = month ? `${period.to.slice(0, 8)}01` : period.from, last = month ? `${year}-${pad(m + 1)}-${pad(new Date(Date.UTC(year, m + 1, 0)).getUTCDate())}` : period.to;
  let start = weekStart(first);
  const end = addLocalDays(weekStart(last), 6);
  // Six weeks at most: a longer period keeps its newest weeks.
  while ((Date.parse(end) - Date.parse(start)) / 86_400_000 >= 42) start = addLocalDays(start, 7);
  const dates: string[] = [];
  for (let d = start; d <= end; d = addLocalDays(d, 1)) dates.push(d);
  const past = dates.filter(d => d <= today), by = new Map(track.points(past).map(p => [p.date, p] as const));
  const cell = (date: string): CalCell => {
    const p: DayPoint | undefined = by.get(date), inMonth = !month || date.slice(0, 7) === period.to.slice(0, 7);
    const state: CalState = date > today ? 'ahead' : p?.state ?? 'rest', inPeriod = inMonth && date >= period.from && date <= period.to && (period.weekday === null || localWeekday(date) === period.weekday);
    return {date, day: Number(date.slice(8, 10)), state: inMonth ? state : 'rest', today: date === today, inPeriod: inPeriod || (inMonth && date > today), value: p?.value ?? null, words: `${formatDate(date, {weekday: true, year: false})}: ${calStateWords(state, track)}`};
  };
  const weeks: CalCell[][] = [];
  for (let i = 0; i < dates.length; i += 7) weeks.push(dates.slice(i, i + 7).map(cell));
  const points = track.points(period.days), T = tally(points);
  return {
    period, title: month ? formatMonth(`${period.to}T12:00:00Z`, {timeZone: 'UTC'}) : `${formatDate(period.from, {year: false})} – ${formatDate(period.to, {year: false})}`,
    weekdays: Array.from({length: 7}, (_, i) => formatWeekday(addLocalDays(start, i)).slice(0, 1)), weeks, tally: T,
    // Today is lit only once it is done and the done days are asked for (an open today is never counted either way).
    lit: points.filter(p => isLit(p.state, lit, track.kind) && (p.date !== today || (lit === 'done' && p.state === 'done'))).map(p => p.date), longestRun: runBest(points).days,
  };
}
/** The period in the widget's own words: "this month", "last week", "the last 14 days", "since Nov 1", "Mondays this month". */
export function periodLabel(period: Period, today: string): string {
  const base = period.token.split('@')[0]!, fixed: Record<string, string> = {today: 'today', yesterday: 'yesterday', 'this-week': 'this week', 'last-week': 'last week', 'this-month': 'this month', 'last-month': 'last month', 'this-year': 'this year', 'last-year': 'last year'};
  const words = fixed[base] ?? (base.startsWith('last-') ? `the last ${base.split('-')[1]} days` : base.startsWith('since:') ? `since ${formatDate(period.from, {year: period.from.slice(0, 4) !== today.slice(0, 4)})}` : base.startsWith('on:') ? formatDate(period.from, {weekday: true, year: false}) : formatMonth(`${period.from}T12:00:00Z`, {timeZone: 'UTC'}));
  return period.weekday === null ? words : `${['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][period.weekday]}, ${words}`;
}
/** A short list of days for the table and the supports: "Nov 3, Nov 12" (twelve at most, then "and N more"). */
export function dayNames(dates: readonly string[], max = 12): string {
  const shown = dates.slice(0, max).map(d => formatDate(d, {year: false})), more = dates.length - shown.length;
  return more > 0 ? `${shown.join(', ')} and ${more} more` : shown.join(', ');
}

/** What a calendar widget says beside its drawing: the answer as a figure and words, and the same as rows for a table. */
export type CalendarWords = {figure: string; unit: string; label: string; note: string; tone?: 'clear'; rows: (readonly [string, string])[]; key: (readonly [string, string])[]};
const dayCount = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;
export function calendarWords(view: CalendarView, track: Pick<Track, 'name' | 'kind' | 'did' | 'not' | 'measure' | 'quit'>, lit: Lit, today: string): CalendarWords {
  const T = view.tally, period = periodLabel(view.period, today), n = view.lit.length, habit = track.kind === 'habit', open = T.open > 0;
  let figure = n;
  const partPast = T.dates.part.filter(d => d !== today), nothing = track.kind === 'log' ? T.dates.none : [];
  const state = (date: string) => view.weeks.flat().find(c => c.date === date)!;
  const rows: (readonly [string, string])[] = [];
  let label: string, note: string, tone: 'clear' | undefined;
  if (lit === 'done') {
    // A skipped day is not due (critic round: "15 of 17 due days" read as two misses where there were none).
    const due = habit ? T.decided - T.skipped : T.decided;
    label = `${track.did[0]} · ${period}`; note = `${track.name}${due ? ` · ${T.done} of ${due} ${habit ? 'due ' : ''}days` : ''}${habit && T.skipped ? ` · ${T.skipped} skipped` : ''}`;
    rows.push([`${track.name}: ${track.did[0]}, ${period}`, n ? `${dayCount(n)}: ${dayNames(view.lit, 31)}` : 'No day']);
  } else {
    const what = habit ? 'not done' : track.kind === 'log' ? track.not[0] : track.not[0];
    label = `${what} · ${period}`;
    const miss = track.quit ? 'slipped' : 'missed';
    const bits = habit ? [T.missed ? `${T.missed} ${miss}` : '', T.skipped ? `${T.skipped} skipped` : '', partPast.length ? `${partPast.length} partly done` : ''].filter(Boolean)
      : track.kind === 'log' ? [partPast.length ? `${partPast.length} below your target` : '', nothing.length ? `${nothing.length} with nothing logged` : ''].filter(Boolean) : [];
    note = `${track.name}${bits.length ? ` · ${bits.join(', ')}` : ''}${open ? ' · today still open' : ''}`;
    // A log's figure is the days below its target: a day with nothing logged is unknown, said apart, never counted as below.
    // (With none below it, the figure is the days the target was reached, so "0 days" never stands beside "reached".)
    if (track.kind === 'log') figure = partPast.length || T.done;
    if (!partPast.length && track.kind === 'log' || !figure) { tone = 'clear'; label = habit ? `every due day done · ${period}` : track.kind === 'log' ? `${track.did[0]} on every day logged · ${period}` : `${track.did[0]} every day · ${period}`; }
    if (habit) { rows.push([track.quit ? 'Slipped (the habit came back that day)' : 'Missed (a due day not done)', T.missed ? `${dayCount(T.missed)}: ${dayNames(T.dates.missed, 31)}` : 'None']); rows.push(['Skipped (marked so; not counted as missed)', T.skipped ? `${dayCount(T.skipped)}: ${dayNames(T.dates.skipped, 31)}` : 'None']); if (partPast.length) rows.push(['Partly done', `${dayCount(partPast.length)}: ${dayNames(partPast, 31)}`]); }
    else if (track.kind === 'log') { rows.push([`${track.name}: ${track.not[0]}`, partPast.length ? `${dayCount(partPast.length)}: ${dayNames(partPast, 31)}` : 'None']); rows.push(['Nothing logged (unknown, not counted)', nothing.length ? `${dayCount(nothing.length)}: ${dayNames(nothing, 31)}` : 'None']); }
    else rows.push([`${track.name}: ${track.not[0]}`, n ? `${dayCount(n)}: ${dayNames(view.lit, 31)}` : 'None']);
  }
  rows.push([habit ? 'Done' : track.did[0], `${dayCount(T.done)}${T.decided ? ` of ${habit ? T.decided - T.skipped : T.decided}` : ''}`]);
  if (open) rows.push(['Today', 'Still open']);
  void state;
  const used = new Set(view.weeks.flat().filter(c => c.inPeriod).map(c => c.state));
  const key: (readonly [string, string])[] = lit === 'done' ? [['lit', track.did[0]]] : [
    ...(habit && used.has('missed') ? [['missed', track.quit ? 'Slipped' : 'Missed'] as const] : []), ...(habit && used.has('skipped') ? [['skipped', 'Skipped'] as const] : []),
    ...(!habit && track.kind === 'log' && used.has('part') ? [['part', track.not[0]] as const] : []), ...(track.kind !== 'habit' && used.has('none') ? [['none', track.kind === 'log' ? 'Nothing logged' : track.not[0]] as const] : []),
    ...(used.has('done') ? [['done', habit ? 'Done' : track.did[0]] as const] : []),
  ];
  return {figure: String(figure), unit: figure === 1 ? 'day' : 'days', label, note, ...(tone ? {tone} : {}), rows, key: [...key, ['today', 'Today']]};
}
