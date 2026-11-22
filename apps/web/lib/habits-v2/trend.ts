import {addLocalDays} from '../local-date';
import {habitDay, latestHabitRule, type Habit} from '../habits';

/**
 * Session AV lane 2 (health r3; LEDGER #276, Way of Life's Trend): per habit, the last 30 days beside the 30 before, as a
 * plain word — more often, about the same, less often — with both shares, and the habits listed by it. Counted the way
 * `habitTrends` counts (lib/habits.ts): a scheduled day that is decided (done, or not done) counts; skipped, paused, rest
 * and still-open days count for nothing either way. A window needs at least 5 such days, else "not enough days yet".
 * A share 10 points or more apart is "more often" or "less often"; closer is "about the same". Calm words only: no
 * "needs attention", no warning. Derived, nothing stored. Pure.
 */
export const TREND_DAYS = 30, TREND_MIN_DAYS = 5, TREND_STEP = 10;
export type TrendWord = 'more' | 'same' | 'less';
export type Window = {done: number; days: number; share: number | null};
export type HabitTrend = {habitId: string; title: string; recent: Window; before: Window; word: TrendWord | null};
export const TREND_WORDS: Record<TrendWord, string> = {more: 'More often', same: 'About the same', less: 'Less often'};

function windowOf(habit: Habit, from: string, to: string, today: string): Window {
  let done = 0, days = 0;
  for (let date = from < habit.startDate ? habit.startDate : from; date <= to; date = addLocalDays(date, 1)) {
    const r = habitDay(habit, date, today);
    if (!r.scheduled || r.status === 'due' || r.status === 'partial' || r.status === 'skipped' || r.status === 'not-scheduled') continue;
    days++; if (r.status === 'complete') done++;
  }
  return {done, days, share: days >= TREND_MIN_DAYS ? Math.round(done / days * 100) : null};
}
/** One habit's trend: today and the 29 days before it, beside the 30 days before those. */
export function habitTrend30(habit: Habit, today: string): HabitTrend {
  const recent = windowOf(habit, addLocalDays(today, -(TREND_DAYS - 1)), today, today);
  const before = windowOf(habit, addLocalDays(today, -(2 * TREND_DAYS - 1)), addLocalDays(today, -TREND_DAYS), today);
  const word: TrendWord | null = recent.share === null || before.share === null ? null : recent.share - before.share >= TREND_STEP ? 'more' : before.share - recent.share >= TREND_STEP ? 'less' : 'same';
  return {habitId: habit.id, title: habit.title, recent, before, word};
}
const ORDER: Record<TrendWord, number> = {more: 0, same: 1, less: 2};
/** The active habits by their trend: more often first (the biggest rise first), then about the same, then less often, then those without enough days. */
export function habitTrendList(habits: readonly Habit[], today: string): HabitTrend[] {
  return habits.filter(h => latestHabitRule(h).state === 'active').map(h => habitTrend30(h, today)).sort((a, b) => {
    if (!a.word || !b.word) return a.word ? -1 : b.word ? 1 : a.title.localeCompare(b.title);
    return ORDER[a.word] - ORDER[b.word] || ((b.recent.share! - b.before.share!) - (a.recent.share! - a.before.share!)) || a.title.localeCompare(b.title);
  });
}
/** "80% (24 of 30 days) in the last 30 days, 60% (18 of 30) the 30 before: more often." */
export function trendSentence(t: HabitTrend): string {
  const part = (w: Window) => w.share === null ? `${w.days} ${w.days === 1 ? 'day' : 'days'} counted` : `${w.share}% (${w.done} of ${w.days} ${w.days === 1 ? 'day' : 'days'})`;
  if (!t.word) return `Not enough days yet to compare: the last 30 days ${part(t.recent)}, the 30 before ${part(t.before)}. Each needs ${TREND_MIN_DAYS} scheduled days that are done or not done.`;
  return `${part(t.recent)} in the last 30 days, ${part(t.before)} the 30 before: ${TREND_WORDS[t.word].toLowerCase()}.`;
}
