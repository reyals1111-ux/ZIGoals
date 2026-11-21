import {habitDay, habitRuleOn, type HabitData} from './habits';
import {addLocalDays} from './local-date';
import {isDeletedHabit} from './habit-delete';

/**
 * Session AV (owner follow-up 1, F-YESTERDAY; Habitica's "Record yesterday's activity"): yesterday's daily habits left
 * open, in one list, to tick late in one go. Only "build" habits with a daily target that were scheduled yesterday and
 * are not complete (nothing logged, or part of the target); quit and limit habits are left out (not doing them is the
 * point), as are skipped, paused and weekly-target habits. `missing` is what "Done" adds to reach yesterday's target.
 * Nothing new is stored. Session AV (q4 #19): the list is shown until each habit is handled or "Not now"; `loggedToday` is
 * still said (read by no screen now) and no longer hides it. Session AV (F-MISS-REASON): a habit marked
 * "not done" for yesterday with what got in the way (`whatGotInTheWay`) leaves the list; the reason is the day's note.
 * Pure.
 */
export type OpenYesterday = {id: string; title: string; count: number; target: number; missing: number};
export function yesterdaysOpen(data: HabitData, today: string): {day: string; open: OpenYesterday[]; loggedToday: boolean} {
  const day = addLocalDays(today, -1), open: OpenYesterday[] = [];
  let loggedToday = false;
  for (const h of data.habits) {
    if (isDeletedHabit(h)) continue;
    if (h.entries.some(e => e.date === today && (e.count > 0 || e.disposition !== 'logged'))) loggedToday = true;
    const rule = habitRuleOn(h, day);
    if (!rule || rule.type !== 'build' || rule.targetPeriod !== 'day') continue;
    // Session AV (F-MISS-REASON): a day the person already marked not done, with what got in the way, is handled.
    if (h.entries.some(e => e.date === day && e.disposition === 'failed')) continue;
    const d = habitDay(h, day, today);
    if (d.status !== 'failed' && d.status !== 'partial' && d.status !== 'due') continue;
    const missing = Math.max(0, d.target - d.count);
    if (missing > 0) open.push({id: h.id, title: h.title, count: d.count, target: d.target, missing});
  }
  return {day, open, loggedToday};
}

/** Session AV (owner follow-up 1, F-MISS-REASON; Habitify's "what got in the way"): the reasons offered, in plain words. */
export const MISS_REASONS = ['Too tired', 'Too busy', 'Forgot', 'Away from home', 'Not feeling well'] as const;
/** The day's note for a miss: the chosen reason, then the person's own words, at most 200 characters. */
export function missNote(reason: string, words = ''): string {
  return [reason.trim(), words.replace(/\s+/g, ' ').trim()].filter(Boolean).join(' — ').slice(0, 200);
}
/**
 * Session AV (q4 #32; Habitify shows the reasons back): how often each reason was given for a "not done" in the last
 * `days` days, most first, from the day's notes ("Too busy — rain" counts as Too busy). Own words alone are not counted.
 */
export function missReasonCounts(entries: readonly {date: string; disposition: string; note?: string}[], today: string, days = 90): {reason: string; count: number}[] {
  const from = addLocalDays(today, 1 - days), counts = new Map<string, number>();
  for (const e of entries) {
    if (e.disposition !== 'failed' || e.date < from || e.date > today || !e.note) continue;
    const reason = MISS_REASONS.find(r => e.note === r || e.note!.startsWith(`${r} — `));
    if (reason) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts].map(([reason, count]) => ({reason, count})).sort((a, b) => b.count - a.count || MISS_REASONS.indexOf(a.reason as never) - MISS_REASONS.indexOf(b.reason as never));
}
