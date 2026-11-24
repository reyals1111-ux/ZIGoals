import {clockFromMidnight, dailySeries, nightsIn} from './engine';
import type {Sleep} from './schema';
import {addDays, instantAt, wallClock} from '../zone-time';

/**
 * Session AV lane 2, round 6 (r6-body; LEDGER #419, AutoSleep's bedtime): tonight's bedtime, said as a fact from the
 * person's own goal and nights: "Bed by 22:50 for your 7 h 30 before your usual 06:45 wake". The wake time is the usual
 * one of the last 14 nights (the middle one of those logged, at least 4), or one typed for tomorrow (kept on the page for
 * that night only); the usual time to fall asleep is the middle of the times typed in those nights (at least 3), else it
 * is left out and the line says so. The bedtime window the person typed in their goal wins when set. Never "you must
 * sleep earlier"; nothing stored. Pure.
 */
export const TONIGHT_NIGHTS = 14, TONIGHT_MIN_WAKES = 4, TONIGHT_MIN_LATENCIES = 3;
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2); };
export type Tonight =
  | {kind: 'no-goal'}
  | {kind: 'window'; from: string; to: string; goal: number}
  | {kind: 'needs-wake'; goal: number; wakes: number}
  | {kind: 'bedtime'; bed: string; wake: string; wakeFrom: 'usual' | 'typed'; goal: number; latency: number | null; nights: number};
/**
 * `typedWake` ("06:30") is the wake time the person typed for tomorrow, if any. `zone` is where tonight is lived (the
 * Sleep page's zone; this device's when left out). Review B6P-3: the bedtime is worked out from real instants there —
 * tomorrow's wake instant less the goal and the time to fall asleep — so it is right on a daylight-saving night (with
 * the clocks going back, a 06:45 wake and 7 h 30 is bed by 00:15, not 23:15).
 */
export function tonight(s: Sleep, today: string, typedWake?: string | null, zone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): Tonight {
  const goal = s.goal?.minutes;
  if (!goal) return {kind: 'no-goal'};
  if (s.goal?.bedFrom && s.goal.bedTo) return {kind: 'window', from: s.goal.bedFrom, to: s.goal.bedTo, goal};
  const points = dailySeries(s, today, TONIGHT_NIGHTS).filter(p => p.wake !== null);
  const latencies = nightsIn(s, today, TONIGHT_NIGHTS).filter(n => typeof n.latencyMin === 'number').map(n => n.latencyMin!);
  const latency = latencies.length >= TONIGHT_MIN_LATENCIES ? median(latencies) : null;
  const typed = typedWake && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(typedWake) ? Number(typedWake.slice(0, 2)) * 60 + Number(typedWake.slice(3)) : null;
  if (typed === null && points.length < TONIGHT_MIN_WAKES) return {kind: 'needs-wake', goal, wakes: points.length};
  const wake = typed ?? median(points.map(p => p.wake!));
  const wakeClock = clockFromMidnight(wake), bed = wallClock(instantAt(addDays(today, 1), wakeClock, zone) - (goal + (latency ?? 0)) * 60_000, zone).clock;
  return {kind: 'bedtime', bed, wake: wakeClock, wakeFrom: typed === null ? 'usual' : 'typed', goal, latency, nights: points.length};
}
