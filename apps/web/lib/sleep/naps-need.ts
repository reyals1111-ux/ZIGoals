import {addDays} from '../zone-time';
import {asleep, nightDay, wakeClock} from './night';
import {BALANCE_DAYS, BALANCE_MIN_NIGHTS, dailySeries, type Balance} from './engine';
import type {Sleep, SleepNight} from './schema';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #237, #238, Rise's naps and sleep need): two readings from the person's own log,
 * derived, nothing stored.
 * - Naps in the balance: the ended naps of the last 14 days, each added to the day it ended on, beside the nights-only
 *   balance (lib/sleep/engine.ts sleepBalance, which stays as it was). A nap-only day is not a night: a nap counts only
 *   on a day with a logged night, so a nap never stands in for a missing night.
 * - A nap's lift on the day's energy curve (lib/energy-curve/curve.ts): its end and length, an estimate.
 * - The sleep need from your own nights: the middle (median) of your weekend nights' time asleep over the last 30 days
 *   (the nights before Saturday and Sunday, when most people wake without an alarm), with at least four of them; else the
 *   middle of the longer half of all nights, with at least ten. Rounded to 15 minutes, between 5 and 11 hours. Offered as a
 *   suggested goal, labelled an estimate; nothing changes until the person keeps it (the existing goal write).
 */
export const NEED_DAYS = 30, NEED_MIN_FREE = 4, NEED_MIN_ALL = 10, NEED_LOW = 300, NEED_HIGH = 660, NEED_STEP = 15;

/** The ended naps whose day (the day they ended, in their own zone) is `date`, earliest first. */
export function napsOn(s: Sleep, date: string): SleepNight[] {
  return s.nights.filter(n => n.kind === 'nap' && n.end !== null && nightDay(n) === date).sort((a, b) => a.start.localeCompare(b.start));
}
const napMinutes = (n: SleepNight) => asleep(n)?.minutes ?? 0;

export type NapBalance = Balance & {naps: number; napMinutes: number};
/**
 * The 14-day balance with naps counted, or null when it would read the same as the nights-only one (no nap on a day with a
 * logged night) or there is no goal or too few nights. `perNight` is time asleep plus naps, less the goal, on average.
 */
export function balanceWithNaps(s: Sleep, today: string): NapBalance | null {
  if (!s.goal) return null;
  const logged = dailySeries(s, today, BALANCE_DAYS).filter(p => p.asleep !== null);
  if (logged.length < BALANCE_MIN_NIGHTS) return null;
  let naps = 0, extra = 0;
  for (const p of logged) for (const n of napsOn(s, p.date)) { naps++; extra += napMinutes(n); }
  if (!naps) return null;
  const goal = s.goal.minutes, total = logged.reduce((t, p) => t + p.asleep!, 0) + extra;
  return {perNight: Math.round((total - goal * logged.length) / logged.length), nights: logged.length, goal, naps, napMinutes: extra};
}

/** Today's naps as the energy curve reads them: when each ended (minutes after midnight) and how long it lasted. */
export function napsForCurve(s: Sleep, today: string): {end: number; minutes: number}[] {
  return napsOn(s, today).map(n => ({end: wakeClock(n)!, minutes: napMinutes(n)})).filter(n => n.minutes > 0);
}

export type SleepNeed = {minutes: number; nights: number; from: 'weekends' | 'longer-half'; goal: number | null};
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
/** The estimate of the person's sleep need from the last 30 days of nights, or null with too few of them. */
export function sleepNeed(s: Sleep, today: string): SleepNeed | null {
  const days = dailySeries(s, today, NEED_DAYS).filter(p => p.asleep !== null && p.asleep > 0);
  const free = days.filter(p => weekday(p.date) === 6 || weekday(p.date) === 0);
  let pick: number[], from: SleepNeed['from'];
  if (free.length >= NEED_MIN_FREE) { pick = free.map(p => p.asleep!); from = 'weekends'; }
  else if (days.length >= NEED_MIN_ALL) { pick = days.map(p => p.asleep!).sort((a, b) => b - a).slice(0, Math.ceil(days.length / 2)); from = 'longer-half'; }
  else return null;
  const minutes = Math.min(NEED_HIGH, Math.max(NEED_LOW, Math.round(median(pick) / NEED_STEP) * NEED_STEP));
  return {minutes, nights: pick.length, from, goal: s.goal?.minutes ?? null};
}
/** The estimate in a line (`hm` formats minutes the way the page does). */
export function needWords(n: SleepNeed, hm: (m: number) => string): string {
  const base = n.from === 'weekends'
    ? `About ${hm(n.minutes)}: the middle of your ${n.nights} weekend nights in the last 30 days, when most people wake without an alarm.`
    : `About ${hm(n.minutes)}: the middle of your ${n.nights} longer nights in the last 30 days (fewer than ${NEED_MIN_FREE} weekend nights are logged).`;
  const vs = n.goal === null ? ' You have no sleep goal yet.' : n.goal === n.minutes ? ' That is your goal already.' : ` Your goal is ${hm(n.goal)}.`;
  return `${base}${vs} An estimate from your own log, not a measurement and not medical advice.`;
}
/** The first day of the window the estimate reads (for "since"). */
export const needFrom = (today: string) => addDays(today, 1 - NEED_DAYS);
