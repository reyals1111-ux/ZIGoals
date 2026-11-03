import {chessOf} from './engine';
import type {DashboardSettings} from '../../dashboard-settings';
import {habitCalendarDay, habitDay, habitRuleOn, logHabitValue, smartDoneValue, type HabitData} from '../../habits';

/**
 * Session AK (ADR-036 Q8, lane C): solving Lichess's daily puzzle on the Chess page ticks off the habit set in Chess,
 * the same way a finished game does (engine.ts `chessCheckIn`): once a day, while that habit is still due, and the same
 * day marker (`markApplied`), so a game and a puzzle on one day tick it once, and a day the person undid stays undone.
 */
export function puzzleCheckIn(habits: HabitData, settings: DashboardSettings, now: Date): {habitId: string; day: string} | null {
  const chess = chessOf(settings), habit = chess?.habit ? habits.habits.find(h => h.id === chess.habit!.id) : undefined;
  if (!chess || !habit) return null;
  const day = habitCalendarDay(habits, now);
  if (chess.applied.some(a => a.date === day)) return null;
  const rule = habitRuleOn(habit, day);
  if (!rule || rule.type !== 'build' || habitDay(habit, day, day).status !== 'due') return null;
  return {habitId: habit.id, day};
}
export function applyPuzzleCheckIn(habits: HabitData, item: {habitId: string; day: string}, now: Date): HabitData {
  const habit = habits.habits.find(h => h.id === item.habitId), rule = habit ? habitRuleOn(habit, item.day) : undefined;
  if (!habit || !rule || rule.type !== 'build' || habitDay(habit, item.day, item.day).status !== 'due') return habits;
  return logHabitValue(habits, habit.id, item.day, smartDoneValue(rule), {note: 'Ticked off by Chess: the daily puzzle solved.'}, now);
}
