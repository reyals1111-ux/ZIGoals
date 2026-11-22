import {addDays, wallClock} from '../zone-time';
import {nightDay} from './night';
import type {Sleep} from './schema';

/**
 * Session AV lane 2, round 4 (health; LEDGER #333, Pillow's "optimal bedtime and chronotype"): "Your timing" — the middle
 * of sleep on weekend nights (the nights before Saturday and Sunday, when most people wake without an alarm, as the sleep
 * need reads them: lib/sleep/naps-need.ts) beside weekday nights over the last 30 days, and an earlier, middle or later
 * word from the weekend middle. The middle of sleep on free days is the measure the Munich ChronoType Questionnaire uses
 * (Roenneberg, Wirz-Justice and Merrow, 2003); the word is an estimate from the person's own nights, never a type to
 * change and not medical advice. Derived, nothing stored. Pure.
 */
export const TIMING_DAYS = 30, TIMING_MIN_NIGHTS = 4, SAME_WITHIN = 15;
/** The word's edges on the weekend middle of sleep, in minutes after midnight: before 3:00 earlier, after 5:00 later. */
export const EARLIER_BEFORE = 180, LATER_AFTER = 300;
export type SleepTiming = {free: {mid: number; nights: number}; work: {mid: number; nights: number}; shift: number; word: 'earlier' | 'middle' | 'later'};
/** Minutes after midnight, read on a clock that starts at 18:00 so a night's middle never wraps (02:00 is 26 × 60 − 1440…). */
const fromEvening = (m: number) => (m + 360) % 1440;
const toClock = (e: number) => ((e - 360) % 1440 + 1440) % 1440;
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
/** The middle of one night, in minutes after midnight where it was lived. */
export function sleepMiddle(n: Sleep['nights'][number]): number | null {
  if (!n.end) return null;
  const mid = (Date.parse(n.start) + Date.parse(n.end)) / 2;
  try { return wallClock(mid, n.timeZone).minutes; } catch { return null; }
}
/** The timing over the last 30 days, or null with fewer than four weekend or four weekday nights. */
export function sleepTiming(s: Sleep, today: string): SleepTiming | null {
  const from = addDays(today, 1 - TIMING_DAYS), free: number[] = [], work: number[] = [];
  for (const n of s.nights) {
    if (n.kind !== 'night' || !n.end) continue;
    const day = nightDay(n), mid = sleepMiddle(n);
    if (!day || day < from || day > today || mid === null) continue;
    (weekday(day) === 6 || weekday(day) === 0 ? free : work).push(fromEvening(mid));
  }
  if (free.length < TIMING_MIN_NIGHTS || work.length < TIMING_MIN_NIGHTS) return null;
  const f = Math.round(median(free)), w = Math.round(median(work)), clock = toClock(f);
  return {free: {mid: clock, nights: free.length}, work: {mid: toClock(w), nights: work.length}, shift: f - w, word: clock < EARLIER_BEFORE || clock >= 1080 ? 'earlier' : clock > LATER_AFTER && clock < 1080 ? 'later' : 'middle'};
}
/** "On weekends you sleep about 1 h 20 min later than on weekdays." (`hm` formats minutes the way the page does.) */
export function shiftWords(t: SleepTiming, hm: (m: number) => string): string {
  const off = Math.round(Math.abs(t.shift) / 5) * 5;
  return off < SAME_WITHIN ? 'On weekends you sleep at about the same time as on weekdays.' : `On weekends you sleep about ${hm(off)} ${t.shift > 0 ? 'later' : 'earlier'} than on weekdays.`;
}
export function shiftWordsNl(t: SleepTiming, hm: (m: number) => string): string {
  const off = Math.round(Math.abs(t.shift) / 5) * 5;
  return off < SAME_WITHIN ? 'In het weekend slaap je op ongeveer dezelfde tijd als door de week.' : `In het weekend slaap je ongeveer ${hm(off)} ${t.shift > 0 ? 'later' : 'eerder'} dan door de week.`;
}
export const TIMING_WORDS = {earlier: 'an earlier sleeper', middle: 'in the middle', later: 'a later sleeper'} as const;
export const TIMING_WORDS_NL = {earlier: 'een vroege slaper', middle: 'ertussenin', later: 'een late slaper'} as const;
