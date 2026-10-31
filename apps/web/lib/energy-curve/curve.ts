import {dailySeries, sleepBalance, type Balance} from '../sleep/engine';
import {focusWindow, WINDOW_FROM, WINDOW_TO} from '../sleep/focus-window';
import type {Sleep} from '../sleep/schema';

/**
 * Session AK (lane S, item 9; COMPETITORS.md (b) 9, Rise's energy schedule [17]): a simple curve of how alert a person
 * may feel through the day, an ESTIMATE from their sleep times, never a measurement. A plain model with fixed shapes:
 * - grogginess just after waking that fades over the first hour or so;
 * - the focus window of lib/sleep/focus-window.ts (2–4 h after waking, an hour shorter after a short night), so Today's
 *   card and this curve never disagree;
 * - a fixed afternoon dip 7–9 h after waking (the post-lunch circadian dip many people notice);
 * - a second, smaller lift 10–13 h after waking, then a slope into the evening;
 * - a lower curve overall when the 14-night sleep balance (lib/sleep/engine.ts) is under the person's goal.
 * The suggested bedtime window comes from the usual wake time (the circular mean of the last 14 nights' wake times) and
 * the sleep need: the person's own goal, or 8 hours (said so) without one. Nothing is stored; nothing is sent.
 */
export const STEP = 15, SPAN = 18 * 60, DIP_FROM = 7 * 60, DIP_TO = 9 * 60, DEFAULT_NEED = 480, FALL_ASLEEP = 20, BED_WINDOW = 30;
export type CurvePoint = {at: number; level: number};
export type EnergyCurve = {
  /** Minutes after midnight of the wake time used; `at` values run from it (they may pass 1440, the next day). */
  wake: number; wakeFrom: 'today' | 'usual';
  points: CurvePoint[];
  focus: {from: number; to: number}; dip: {from: number; to: number}; bedtime: {from: number; to: number};
  need: number; needFrom: 'goal' | 'default'; balance: Balance | null; short: boolean; nights: number;
};
const gauss = (t: number, centre: number, width: number) => Math.exp(-((t - centre) ** 2) / (2 * width ** 2));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The usual wake time over the last 14 days' nights (a circular mean, so 23:50 and 00:10 are 20 min apart), or null. */
export function usualWake(sleep: Sleep, today: string): {minutes: number; nights: number} | null {
  const wakes = dailySeries(sleep, today, 14).filter(p => p.wake !== null).map(p => p.wake!);
  if (!wakes.length) return null;
  const a = (m: number) => m / 1440 * 2 * Math.PI;
  const angle = Math.atan2(wakes.reduce((t, w) => t + Math.sin(a(w)), 0), wakes.reduce((t, w) => t + Math.cos(a(w)), 0));
  return {minutes: Math.round(((angle / (2 * Math.PI) * 1440) % 1440 + 1440) % 1440), nights: wakes.length};
}
/** The level (0–1, a relative shape with no unit) `t` minutes after waking, for a given sleep balance per night. */
export function levelAt(t: number, perNight: number, short: boolean): number {
  const h = t / 60, debt = clamp(-perNight / 60, 0, 3) + (short ? 0.5 : 0);
  const inertia = -0.4 * Math.exp(-h / 0.7);
  const morning = 0.12 * gauss(h, 3, 1.2), dip = -0.2 * gauss(h, (DIP_FROM + DIP_TO) / 120, 0.9), evening = 0.08 * gauss(h, 11.5, 1.5);
  const pressure = -(0.012 + 0.006 * debt) * h, night = -0.3 / (1 + Math.exp(-(h - 15.5) / 0.8));
  return clamp(0.82 + inertia + morning + dip + evening + pressure + night - 0.04 * debt, 0.05, 1);
}
/** The day's curve, or null without a single night to read a wake time from. */
export function energyCurve(sleep: Sleep, today: string): EnergyCurve | null {
  const fw = focusWindow(sleep, today), usual = usualWake(sleep, today);
  const wake = fw?.wake ?? usual?.minutes ?? null;
  if (wake === null) return null;
  const balance = sleepBalance(sleep, today), short = fw?.short ?? false, perNight = balance?.perNight ?? 0;
  const points: CurvePoint[] = [];
  for (let t = 0; t <= SPAN; t += STEP) points.push({at: wake + t, level: Math.round(levelAt(t, perNight, short) * 1000) / 1000});
  const need = sleep.goal?.minutes ?? DEFAULT_NEED, nextWake = (usual?.minutes ?? wake) + 1440;
  const asleepBy = nextWake - need - FALL_ASLEEP;
  return {
    wake, wakeFrom: fw ? 'today' : 'usual', points,
    focus: fw ? {from: fw.from, to: fw.to} : {from: wake + WINDOW_FROM, to: wake + WINDOW_TO},
    dip: {from: wake + DIP_FROM, to: wake + DIP_TO},
    bedtime: {from: asleepBy - BED_WINDOW, to: asleepBy},
    need, needFrom: sleep.goal ? 'goal' : 'default', balance, short, nights: usual?.nights ?? 0,
  };
}
/** "Now" on the curve (minutes after midnight of `nowMinutes`, moved past midnight when the curve is), or null outside it. */
export function nowOn(curve: EnergyCurve, nowMinutes: number): number | null {
  const at = nowMinutes < curve.wake && nowMinutes + 1440 <= curve.wake + SPAN ? nowMinutes + 1440 : nowMinutes;
  return at >= curve.wake && at <= curve.wake + SPAN ? at : null;
}
/** The summary a screen reader hears, and the "Why?" text (`clock` formats minutes after midnight as the page does). */
export function curveSummary(c: EnergyCurve, clock: (m: number) => string): string {
  return `An estimate from your sleep times: a good focus window ${clock(c.focus.from)} to ${clock(c.focus.to)}, a likely dip ${clock(c.dip.from)} to ${clock(c.dip.to)}, and a suggested bedtime between ${clock(c.bedtime.from)} and ${clock(c.bedtime.to)}.`;
}
export function curveWhy(c: EnergyCurve, clock: (m: number) => string, minutes: (m: number) => string): string {
  const wake = c.wakeFrom === 'today' ? `You woke at ${clock(c.wake)} today.` : `No night ending today is logged yet, so this starts from your usual wake time, ${clock(c.wake)} (${c.nights} ${c.nights === 1 ? 'night' : 'nights'} in the last 14 days).`;
  const balance = c.balance ? c.balance.perNight < -10 ? ` Over the last 14 days you slept about ${minutes(-c.balance.perNight)} under your goal a night, so the whole curve sits a little lower.` : ' Over the last 14 days you slept around your goal.' : '';
  const need = c.needFrom === 'goal' ? `your goal of ${minutes(c.need)}` : `8 hours, a common figure (set your own goal to change it)`;
  return `${wake}${balance} Many people feel most alert two to four hours after waking and notice a dip about seven to nine hours after waking. The bedtime window leaves ${need} of sleep before your usual wake time, with a little time to fall asleep. It is an estimate from your sleep times, not a measurement and not medical advice; you know your day best.`;
}
