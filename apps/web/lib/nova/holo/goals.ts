import {daysBetween, type Forecast, type ForecastPoint} from '../../goal-forecast';
import type {GoalSummary} from '../../goal-summary';
import {paceWords, wholePercent} from '../widgets/words';
import {isFinished} from '../../goals/finished';
import {averageKey} from '../../average-goals/store';

/**
 * Session AL Part 11 (lane L8): the goals HUD's figures.
 * - Progress arcs: the active goals as Today and NOVA's Goal pace summarise them (lib/goal-summary.ts), the percent in
 *   NOVA's one goal format (words.ts wholePercent: whole, the Goals page's rounding, a bound kept, "Unavailable" never a number),
 *   with milestone ticks at a quarter, a half and three quarters (ornaments: always drawn, never data).
 * - The pace line: the lead goal's recorded progress (lib/goal-forecast.ts privateGoalPoints, as the goal page's forecast
 *   panel and Today's pace forecasts read it) and, only when that forecast is an estimate, its projection band from today
 *   to the earliest and latest dates, always labelled "Estimate" with the forecast's own words.
 */
export type GoalArc = {key: string; name: string; href: string; pct: number | null; text: string; pace: ReturnType<typeof paceWords>};
export const MILESTONES = [25, 50, 75] as const;
/**
 * An average goal as the Goals page shows it (components/goals/average-goals.tsx): its ring is how close the rolling
 * average is to the target (lib/average-goals/progress.ts averageProgress `share`), full when met.
 */
export type AverageArcInput = {id: string; name: string; status: string; share: number | null; met: boolean | null};
/**
 * The goals' arcs, the Goals page's active goals in its order: the goal summaries, then (lane L8f, Part 13) the average
 * goals, which Today and Goals count among the active ones (lib/numbers/counts.ts activeGoalCount); `active` is that count.
 */
export function goalArcs(goals: readonly GoalSummary[], count = 3, averages: readonly AverageArcInput[] = []): {arcs: GoalArc[]; more: number; active: number} {
  const active = goals.filter(g => g.status === 'active'), avg = averages.filter(a => a.status === 'active');
  const all: GoalArc[] = [...active.map(g => {
    const known = g.progressBound !== 'unavailable' && /^\d+(\.\d+)?$/.test(g.progressPct);
    return {key: g.key, name: g.name, href: g.href, pct: known ? Math.min(100, Number(g.progressPct)) : null, text: wholePercent(g.progressPct, g.progressBound, isFinished(g)), pace: paceWords(g.fundingHealth)};
  }), ...avg.map(a => ({key: averageKey(a.id), name: a.name, href: `/app/goals/average/${encodeURIComponent(a.id)}`, pct: a.share === null ? null : Math.min(100, a.share * 100),
    text: a.share === null ? 'Unavailable' : wholePercent((a.share * 100).toFixed(4), undefined, a.met === true),
    pace: a.met === null ? {words: 'No days recorded yet', tone: 'unknown' as const} : a.met ? {words: 'On target', tone: 'good' as const} : {words: 'Not on target yet', tone: 'attention' as const}}))];
  const arcs = all.slice(0, count);
  return {arcs, more: Math.max(0, all.length - arcs.length), active: all.length};
}

export type PaceChart = {
  /** Days from the first recorded point to the chart's right edge. */
  span: number;
  /** The recorded line: days from the first point, and the value. */
  line: {t: number; v: number}[];
  target: number;
  /** Where today sits (days from the first point) and the value counted now. */
  now: {t: number; v: number};
  /** The labelled projection: to the target between the earliest and latest dates (latest null: open-ended). */
  band: {early: number; mid: number; late: number | null} | null;
  state: Forecast['state'];
};
export function paceChart(points: readonly ForecastPoint[], current: number, target: number, today: string, forecast: Forecast): PaceChart | null {
  const sorted = [...points].filter(p => p.day <= today && Number.isFinite(p.value)).sort((a, b) => a.day.localeCompare(b.day));
  if (!sorted.length || !(target > 0) || !Number.isFinite(current)) return null;
  const first = sorted[0]!.day, at = (day: string) => Math.max(0, daysBetween(first, day));
  const line = sorted.map(p => ({t: at(p.day), v: p.value})), now = {t: at(today), v: current};
  let band: PaceChart['band'] = null, span = Math.max(now.t, 1);
  if (forecast.state === 'estimate' && forecast.date && forecast.earliest) {
    const early = at(forecast.earliest), mid = at(forecast.date), late = forecast.latest ? at(forecast.latest) : null;
    band = {early, mid, late};
    // The open end of a band with no latest date reaches as far past the estimate again (drawn fading, "at the earliest").
    span = Math.max(span, late ?? mid + (mid - now.t));
  }
  return {span, line, target, now, band, state: forecast.state};
}
