import {addLocalDays} from '../local-date';
import {wallClock} from '../notify/zone';
import type {Habit} from '../habits';

/**
 * Session AK (F5b): a habit's usual time, learned on this device from when its check-ins were made ("You usually do this
 * around 07:40"). Only same-day manual check-ins count: an entry written on a later day is a catch-up, an entry from Health
 * was made by the app, and a skip or a slip says nothing about when the habit is done. The time is offered, never applied:
 * the person chooses whether it becomes the reminder. Nothing is stored; it is worked out each time from the journal.
 */
export const SUGGEST_WINDOW_DAYS = 42, SUGGEST_MIN_SAMPLES = 5, SUGGEST_MAX_SPREAD = 60, SUGGEST_ROUND = 5, SUGGEST_CLOSE = 15;
export type TimeSuggestion = {time: string; samples: number; spreadMinutes: number};
type Entry = Habit['entries'][number];

/** The minutes after midnight (in `zone`) of each same-day manual check-in from the last `windowDays` days through `today`. */
export function checkInMinutes(entries: readonly Entry[], zone: string, today: string, windowDays = SUGGEST_WINDOW_DAYS): number[] {
  const from = addLocalDays(today, -(windowDays - 1)), out: number[] = [];
  for (const e of entries) {
    if (e.disposition !== 'logged' || !(e.count > 0) || e.source === 'health' || e.date < from || e.date > today) continue;
    const ms = Date.parse(e.updatedAt); if (!Number.isFinite(ms)) continue;
    let wall; try { wall = wallClock(ms, zone); } catch { continue; }
    if (wall.date !== e.date) continue;
    out.push(wall.hour * 60 + wall.minute);
  }
  return out;
}
const pad = (n: number) => String(n).padStart(2, '0');
export const clockOf = (minutes: number) => { const m = ((Math.round(minutes) % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
const quantile = (sorted: readonly number[], q: number) => { const at = (sorted.length - 1) * q, lo = Math.floor(at), hi = Math.ceil(at); return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (at - lo); };
/**
 * The usual time of a set of minutes: the day is cut at the widest gap between check-ins (so 23:50 and 00:10 sit together),
 * then the median, rounded to five minutes. Null with fewer than `minSamples` or when the middle half spreads wider than
 * `maxSpread` minutes (no usual time to speak of).
 */
export function usualTime(minutes: readonly number[], {minSamples = SUGGEST_MIN_SAMPLES, maxSpread = SUGGEST_MAX_SPREAD}: {minSamples?: number; maxSpread?: number} = {}): TimeSuggestion | null {
  if (minutes.length < Math.max(1, minSamples)) return null;
  const sorted = [...minutes].map(m => ((m % 1440) + 1440) % 1440).sort((a, b) => a - b);
  let cut = 0, widest = sorted[0]! + 1440 - sorted[sorted.length - 1]!;
  for (let i = 1; i < sorted.length; i++) { const gap = sorted[i]! - sorted[i - 1]!; if (gap > widest) { widest = gap; cut = i; } }
  const unwrapped = [...sorted.slice(cut), ...sorted.slice(0, cut).map(m => m + 1440)];
  const spread = quantile(unwrapped, 0.75) - quantile(unwrapped, 0.25);
  if (spread > maxSpread) return null;
  const median = quantile(unwrapped, 0.5);
  return {time: clockOf(Math.round(median / SUGGEST_ROUND) * SUGGEST_ROUND), samples: unwrapped.length, spreadMinutes: Math.round(spread)};
}
const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
/** How far apart two clock times are, across midnight too (0–720). */
export const clockDistance = (a: string, b: string) => { const d = Math.abs(minutesOf(a) - minutesOf(b)) % 1440; return Math.min(d, 1440 - d); };
/**
 * The suggestion for one habit, or null: a build habit only (a quit or limit habit has no time it is "done"), and not when
 * the reminder already sits within SUGGEST_CLOSE minutes of the usual time.
 */
export function suggestHabitTime(habit: Pick<Habit, 'entries' | 'rules'>, zone: string, today: string, current: string | null = null): TimeSuggestion | null {
  const rule = habit.rules.at(-1);
  if (!rule || rule.type !== 'build' || rule.state === 'archived') return null;
  const found = usualTime(checkInMinutes(habit.entries, zone, today));
  if (!found || (current && /^\d{2}:\d{2}$/.test(current) && clockDistance(current, found.time) <= SUGGEST_CLOSE)) return null;
  return found;
}
