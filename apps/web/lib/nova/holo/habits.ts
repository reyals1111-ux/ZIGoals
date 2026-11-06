import {habitDay, habitStats, type Habit} from '../../habits';
import {habitConsistency} from '../../life-intelligence';

/**
 * Session AL Part 11 (lane L8): the habits HUD's figures, from the Habits page's own engine:
 * - today: the due habits as Today's focus counts them (a skipped rest day is not due) and how many are complete;
 * - streak rings: the three longest current streaks (lib/habits.ts habitStats, the card's "Current streak"), each against
 *   its own best, so a ring is full when the streak is at its best;
 * - the last seven days and the 30-day consistency: lib/life-intelligence.ts habitConsistency, the Habits page's "Your
 *   last 30 days" (days with a check-in out of 30) and "Your week in motion" (check-ins a day).
 */
export type StreakRing = {id: string; title: string; streak: number; best: number; unit: string; share: number};
export type HabitsHud = {
  due: number; done: number;
  rings: StreakRing[];
  week: {date: string; checkins: number; scheduled: number}[];
  activeDays: number; checkins: number;
  /** Habits on this device (0: a fresh start teaches). */
  count: number;
};
export function habitsHud(habits: readonly Habit[], today: string, rings = 3): HabitsHud {
  const due = habits.filter(h => { const d = habitDay(h, today, today); return d.scheduled && d.status !== 'skipped'; });
  const done = due.filter(h => habitDay(h, today, today).status === 'complete').length;
  const streaks = habits.map(h => ({h, s: habitStats(h, today)})).filter(x => x.s.currentStreak > 0 || x.s.bestStreak > 0)
    .sort((a, b) => b.s.currentStreak - a.s.currentStreak || b.s.bestStreak - a.s.bestStreak || a.h.title.localeCompare(b.h.title)).slice(0, rings)
    .map(({h, s}) => ({id: h.id, title: h.title, streak: s.currentStreak, best: Math.max(s.bestStreak, s.currentStreak), unit: s.streakUnit, share: s.bestStreak > 0 ? Math.min(1, s.currentStreak / Math.max(s.bestStreak, s.currentStreak)) : 0}));
  const c = habitConsistency([...habits], today);
  return {due: due.length, done, rings: streaks, week: c.week.map(d => ({date: d.date, checkins: d.checkins, scheduled: d.scheduled})), activeDays: c.activeDays, checkins: c.checkins, count: habits.length};
}
/** A streak in words: "12 days", "1 week". */
export function streakWords(n: number, unit: string): string {
  const one = unit.replace(/s$/, '');
  return `${n} ${n === 1 ? one : unit}`;
}
