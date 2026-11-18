import {caloriesTrack, heartTrack, sleepTrack, stepsTrack, waterTrack} from '../../../ai/local-answers/exact/health';
import type {Period} from '../../../ai/local-answers/exact/period';
import {tally, type DayPoint} from '../../../ai/local-answers/exact/series';
import type {Track} from '../../../ai/local-answers/exact/track';
import type {HealthData} from '../../../health';
import {formatDate, formatNumber, formatWeekday} from '../../../visual-format';
import {RANGE_DAYS, type WidgetParams, type WidgetRange} from '../../stage/record';
import {durationWords} from '../../widgets/words';
import {logDayWords, weightCard, weightRows, type WeightCard} from '../weight';
import {periodLabel, widgetPeriod} from './calendar';
import {asOfDay, latestPoint, type ScanWords} from './health-scan';

/**
 * Session AS (ADR-042 Part 2, family: trends): one measure of Health over a period, a value a day, from the exact layer's
 * own tracks (lib/ai/local-answers/exact/health.ts), so the line and the sentence cannot disagree. A day with nothing
 * logged is a gap (null), never a zero. The person's own goal is a line (and, for a goal to reach, a band above it);
 * nothing is judged: a figure is said beside the goal, in words.
 */
export type TrendKind = 'sleep-trend' | 'steps-trend' | 'heart-trend' | 'calorie-trend';
export type TrendView = {
  kind: TrendKind; period: Period; name: string;
  dates: string[]; values: (number | null)[];
  logged: number; average: number | null;
  latest: DayPoint | null; lowest: DayPoint | null; highest: DayPoint | null;
  /** The person's own goal or target, in the track's unit; `reach`: a goal to reach (a band above the line), else a line only. */
  target: number | null; reach: boolean;
  /** Logged days at or above a goal to reach; null without one. */
  reached: number | null;
  text: (value: number) => string;
  /** Whether the track holds anything at all (looking back a year): false gives the teaching notice. */
  any: boolean;
};
/** What a Health answer widget says beside its drawing: the figure and its words, the foot's as-of, and the table. */
export type AxWords = ScanWords;

const TRACK: Record<TrendKind, (health: HealthData, today: string) => Track> = {'sleep-trend': sleepTrack, 'steps-trend': stepsTrack, 'heart-trend': heartTrack, 'calorie-trend': caloriesTrack};
/** The period a trend shows by default: the last 30 days, as the answer's own default for a trend or an average. */
export const TREND_DEFAULT = 'last-30-days';
export function trendOf(kind: TrendKind, health: HealthData, token: string | undefined, today: string): TrendView {
  const track = TRACK[kind](health, today), period = widgetPeriod(token, today, TREND_DEFAULT), points = track.points(period.days), T = tally(points), m = track.measure!;
  // Calories have no target to reach in the exact layer (eating more is not "done"); the person's own kcal target is still a line.
  const target = kind === 'calorie-trend' ? health.targets.kcal ?? null : m.target, reach = kind !== 'calorie-trend' && target !== null;
  const known = points.filter(p => p.value !== null);
  return {
    kind, period, name: track.name, dates: points.map(p => p.date), values: points.map(p => p.value), logged: T.valued, average: T.valued ? T.total / T.valued : null,
    latest: known.at(-1) ?? null, lowest: T.lowest, highest: T.best, target, reach, reached: reach ? known.filter(p => p.value! >= target!).length : null,
    text: v => m.text(v, 'en'), any: latestPoint(track, today) !== null,
  };
}
const split = (text: string): [string, string] => { const at = text.indexOf(' '); return at < 0 ? [text, ''] : [text.slice(0, at), text.slice(at + 1)]; };
const days = (n: number, word = 'day') => `${formatNumber(n)} ${n === 1 ? word : `${word}s`}`;
/** The newest logged days as rows (62 at most, then how many earlier ones there are). */
function dayRows(view: Pick<TrendView, 'dates' | 'values' | 'text'>, today: string): (readonly [string, string])[] {
  const known = view.dates.map((date, i) => ({date, value: view.values[i]!})).filter(p => p.value !== null), shown = known.slice(-62);
  return [...(known.length > shown.length ? [['Earlier days', `${days(known.length - shown.length)} more, not listed`] as const] : []), ...shown.map(p => [formatDate(p.date, {weekday: true, year: p.date.slice(0, 4) !== today.slice(0, 4)}), view.text(p.value)] as const)];
}
export function trendWords(view: TrendView, today: string): AxWords {
  const period = periodLabel(view.period, today), night = view.kind === 'sleep-trend', unitWord = night ? 'night' : 'day';
  const t = view.text, on = (p: DayPoint) => `${t(p.value!)}, ${asOfDay(p.date, today)}`;
  const base: (readonly [string, string])[] = [
    [night ? 'Average a night' : 'Average a day', view.average === null ? 'Nothing logged' : `${t(view.average)} over ${days(view.logged, unitWord)} logged`],
    ...(view.lowest && view.highest ? [['Lowest', on(view.lowest)] as const, ['Highest', on(view.highest)] as const] : []),
    [night ? 'Your sleep goal' : view.kind === 'heart-trend' ? 'A target' : 'Your target', view.target === null ? 'Not set' : `${t(view.target)}${view.reached !== null ? `, reached on ${view.reached} of ${days(view.logged, unitWord)} logged` : ''}`],
    ...dayRows(view, today),
  ];
  const asOf = `${period} · ${days(view.logged, unitWord)} logged`;
  if (view.average === null) return {figure: '—', label: `nothing logged · ${period}`, note: `${view.name}: no ${unitWord} logged in this period`, asOf, caption: `${view.name}, ${period}`, rows: base};
  if (view.kind === 'heart-trend') {
    const [figure, unit] = split(t(view.latest!.value!));
    return {figure, unit, label: `resting heart rate · recorded ${asOfDay(view.latest!.date, today)}`, note: `Average ${t(view.average)} over ${days(view.logged)} · the latest record, not a live reading`, asOf, caption: `Resting heart rate, ${period}`,
      rows: [['Latest record', on(view.latest!)], ...base.filter(r => r[0] !== 'A target')]};
  }
  const goal = view.target === null ? null : night ? `Goal ${t(view.target)}` : view.kind === 'calorie-trend' ? `Your target: ${t(view.target)}` : `Target ${t(view.target)}`;
  const note = [goal ? `${goal}${view.reached !== null ? ` · reached on ${view.reached} of ${days(view.logged, unitWord)}` : ''}` : `${days(view.logged, unitWord)} logged`, view.highest && view.logged > 1 ? `highest ${t(view.highest.value!)}` : ''].filter(Boolean).join(' · ');
  if (night) { const [figure, unit] = split(durationWords(Math.round(view.average))); return {figure, unit, label: `asleep a night on average · ${period}`, note, asOf, caption: `Sleep, ${period}`, rows: base}; }
  const [figure, unit] = split(t(view.average));
  return {figure, unit: `${unit} a day`, label: `on average · ${period}`, note, asOf, caption: `${view.name}, ${period}`, rows: base};
}

/* ---- Weight: the Weight card's own figures (lib/nova/cards/weight.ts), over the range the answer names ---- */
/** The range a weight trend shows: its own, else the one its period reads as (as the answer does: up to 8 days a week, 45 a month, 120 a quarter), else a month. */
export function weightRange(params: WidgetParams | undefined, today: string): WidgetRange {
  if (params?.range && Object.hasOwn(RANGE_DAYS, params.range)) return params.range;
  if (!params?.period) return 'month';
  const n = widgetPeriod(params.period, today, TREND_DEFAULT).days.length;
  return n <= 8 ? 'week' : n <= 45 ? 'month' : n <= 120 ? 'quarter' : 'year';
}
export type WeightTrendView = {card: WeightCard; words: AxWords};
export function weightTrend(health: HealthData, params: WidgetParams | undefined, today: string): WeightTrendView {
  const card = weightCard(health, today, weightRange(params, today));
  if (!card.latest || !card.hero) return {card, words: {figure: '—', label: 'no weight logged', note: '', asOf: card.window.words, caption: 'Your weight', rows: []}};
  const change = card.change ? `${card.change.text[0]!.toUpperCase()}${card.change.text.slice(1)}` : card.note ?? '';
  return {card, words: {
    figure: card.hero.value, unit: card.hero.unit, label: `weight · logged ${logDayWords(card.latest.date, today)}`,
    note: [change, card.target ? `your goal: ${card.target.text}` : ''].filter(Boolean).join(' · '),
    asOf: `${card.window.words} · ${card.logged.text}`, caption: `Your weight, ${card.window.words}`, rows: weightRows(card, today),
  }};
}

/* ---- Water: the last days as columns against the target ---- */
export type WaterDayCol = {date: string; label: string; value: number | null; text: string; state: DayPoint['state']};
export type WaterWeekView = {
  period: Period;
  /** The newest days of the period, fourteen at most, oldest first. */
  days: WaterDayCol[];
  target: number | null; targetText: string | null;
  /** Over the whole period: the amount, the days logged, the days of them that reached the target, and whether today is still open. */
  total: number; logged: number; reached: number; open: boolean;
  any: boolean; words: AxWords;
};
export const WATER_COLUMNS = 14;
export function waterWeek(health: HealthData, token: string | undefined, today: string): WaterWeekView {
  const track = waterTrack(health, today), m = track.measure!, period = widgetPeriod(token, today, 'last-7-days'), points = track.points(period.days), T = tally(points), label = periodLabel(period, today);
  const shown = points.slice(-WATER_COLUMNS), text = (v: number) => m.text(v, 'en');
  const cols = shown.map(p => ({date: p.date, label: formatWeekday(p.date).slice(0, shown.length > 7 ? 1 : 3), value: p.value, text: p.value === null ? (p.date === today ? 'nothing logged yet' : 'nothing logged') : text(p.value), state: p.state}));
  // Reached, of the days logged (as the answer counts them); today is said to be still open until it reaches the target.
  const target = m.target, open = points.some(p => p.state === 'open');
  const average = T.valued ? text(T.total / T.valued) : null;
  const words: AxWords = !T.valued ? {figure: '—', label: `nothing logged · ${label}`, note: 'Water: nothing logged in this period', asOf: label, caption: `Water, ${label}`, rows: []}
    : target !== null ? {figure: String(T.done), unit: `of ${days(T.valued)}`, label: `water target reached · ${label}`, note: `${text(T.total)} in all, ${average} a day${open ? ' · today still open' : ''}`, asOf: `${label} · target ${text(target)}`, caption: `Water, ${label}`, rows: []}
    : (() => { const [figure, unit] = split(average!); return {figure, unit: `${unit} a day`, label: `on average · ${label}`, note: `${text(T.total)} in all on ${days(T.valued)} · no target set`, asOf: label, caption: `Water, ${label}`, rows: []}; })();
  words.rows = [
    ...(target !== null ? [['Target reached', `${T.done} of ${days(T.valued)} logged${open ? '; today is still open' : ''}`] as const, ['Your target', `${text(target)} a day`] as const] : [['Your target', 'Not set'] as const]),
    ['In all', T.valued ? `${text(T.total)} on ${days(T.valued)}, ${average} a day` : 'Nothing logged'],
    ...cols.map(c => [formatDate(c.date, {weekday: true, year: false}), c.text] as const),
  ];
  return {period, days: cols, target, targetText: target === null ? null : text(target), total: T.total, logged: T.valued, reached: T.done, open, any: latestPoint(track, today) !== null, words};
}
