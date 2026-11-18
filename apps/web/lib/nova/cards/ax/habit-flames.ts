import {habitName} from '../../../ai/local-answers/exact/habits';
import {habitStats, latestHabitRule, type Habit} from '../../../habits';
import {streakWords} from '../../holo/habits';

/**
 * Session AS (ADR-042 Part 2, family: flames): each active habit's streak as a flame. The figures are the Habits page's
 * own (lib/habits.ts `habitStats`: a skipped day neither adds to a streak nor breaks it; only a missed day resets), so
 * "what are my streaks" and this widget say one thing. `by` picks what a flame's height follows: the streak running now
 * (the longest first) or the longest ever (with the one running now beside it). A habit with no streak running is an
 * unlit ember, never left out. With `ref` only that habit is shown.
 */
export type Flame = {
  id: string; name: string; current: number; best: number; unit: string;
  /** The flame's height against the tallest one shown (0–1); `bestShare` the same for the longest streak ever. */
  share: number; bestShare: number;
  text: string; bestText: string;
};
export type FlamesView = {
  flames: Flame[];
  /** Whether one habit was asked for (`ref`). */
  one: boolean;
  /** Habits with a streak running now, of the active ones; `more`: active habits beyond the flames shown. */
  running: number; total: number; more: number;
  /** The habit with the longest streak ever, and the one with the longest running now. */
  longest: Flame | null; lead: Flame | null;
};
export function streakFlames(habits: readonly Habit[], today: string, {ref, by = 'current', cap = 6}: {ref?: string; by?: 'current' | 'best'; cap?: number} = {}): FlamesView {
  const live = habits.filter(h => latestHabitRule(h).state !== 'archived');
  const all = live.map(h => { const s = habitStats(h, today), best = Math.max(s.bestStreak, s.currentStreak); return {id: h.id, name: habitName(h), current: s.currentStreak, best, unit: s.streakUnit as string}; });
  const days = (f: {unit: string}) => Number(f.unit === 'days');
  // Ties: by name for the streaks running now, in the habits' own order for the longest ever (as the exact layer's sentence names them).
  const sorted = [...all].sort((a, b) => days(b) - days(a) || (by === 'best' ? b.best - a.best : b.current - a.current || b.best - a.best || a.name.localeCompare(b.name)));
  const asked = ref ? sorted.find(f => f.id === ref) : undefined, shown = asked ? [asked] : sorted.slice(0, Math.max(1, cap));
  // One scale for each unit (a streak of weeks is not drawn against one of days).
  const top = (unit: string) => Math.max(1, ...shown.filter(f => f.unit === unit).map(f => by === 'best' || asked ? f.best : f.current));
  const flame = (f: (typeof all)[number]): Flame => ({...f, share: Math.min(1, f.current / top(f.unit)), bestShare: Math.min(1, f.best / top(f.unit)), text: streakWords(f.current, f.unit), bestText: streakWords(f.best, f.unit)});
  const flames = shown.map(flame), byBest = [...all].sort((a, b) => b.best - a.best)[0];
  const byNow = [...all].sort((a, b) => days(b) - days(a) || b.current - a.current || a.name.localeCompare(b.name))[0];
  return {flames, one: !!asked, running: all.filter(f => f.current > 0).length, total: all.length, more: asked ? 0 : all.length - flames.length,
    longest: byBest && byBest.best > 0 ? flame(byBest) : null, lead: byNow && byNow.current > 0 ? flame(byNow) : null};
}
