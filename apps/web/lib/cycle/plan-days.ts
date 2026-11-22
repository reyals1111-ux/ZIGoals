import {addLocalDays} from '../local-date';
import {MAX_CYCLE_LENGTH, nextPeriodEstimate, periodStarts} from './engine';
import type {Cycle} from './store';

/**
 * Session AV lane 2 (r3-plan, LEDGER #262; Structured's Cycle Seasons, without the seasons): the cycle on the day plan — for
 * each day, the day of the cycle ("Day 3 of your cycle") and whether it is a logged period day or inside the estimated
 * window of the next period (after three cycles, lib/cycle/engine.ts). Days and the log's own words only: no phases, no
 * seasons and no advice on what to plan (the no-medical-advice rule). A day after the estimated start gets no cycle day
 * (the count would be a guess). Pure.
 */
export type CyclePlanDay = {date: string; cycleDay: number | null; period: 'logged' | 'estimated' | null};
const between = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
export function cyclePlanDays(rec: Pick<Cycle, 'days'>, from: string, to: string, today: string): CyclePlanDay[] {
  const starts = periodStarts(rec), estimate = nextPeriodEstimate(rec, today), out: CyclePlanDay[] = [];
  for (let d = from, i = 0; d <= to && i < 62; d = addLocalDays(d, 1), i++) {
    const last = starts.filter(s => s <= d).at(-1), n = last ? between(last, d) + 1 : null;
    const logged = !!rec.days[d]?.flow, estimated = !logged && d > today && estimate.kind === 'range' && !estimate.passed && d >= estimate.from && d <= estimate.to;
    const guess = d > today && estimate.kind === 'range' && d >= estimate.from;
    out.push({date: d, cycleDay: n !== null && n <= MAX_CYCLE_LENGTH && !guess ? n : null, period: logged ? 'logged' : estimated ? 'estimated' : null});
  }
  return out;
}
/** The day's line in plain words: "Day 3 of your cycle · period day (logged)". Empty when there is nothing to say. */
export function cyclePlanLine(d: CyclePlanDay): string {
  return [d.cycleDay !== null ? `Day ${d.cycleDay} of your cycle` : '', d.period === 'logged' ? 'period day (logged)' : d.period === 'estimated' ? 'period may start (an estimate)' : ''].filter(Boolean).join(' · ');
}
