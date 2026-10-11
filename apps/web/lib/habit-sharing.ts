import type { Habit, HabitData } from "./habits";

/** Deep equality for parsed JSON data (plain objects, arrays and primitives). */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!sameJson(a[i], b[i])) return false;
    return true;
  }
  if (Array.isArray(b)) return false;
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  for (const key of keys) if (!Object.prototype.hasOwnProperty.call(right, key) || !sameJson(left[key], right[key])) return false;
  return true;
}

/**
 * Keeps every unchanged habit object from the previous read (Session G, Part 2). Each save or refresh parses the whole
 * store, which gives every habit a new identity; sharing the unchanged ones lets one check-in re-render one card, and
 * lets per-habit results (lib/habits.ts memo) be reused. Equal data returns the previous object itself.
 */
export function shareHabitData(previous: HabitData, next: HabitData): HabitData {
  if (previous === next) return previous;
  const before = new Map(previous.habits.map((habit) => [habit.id, habit]));
  let reused = previous.habits.length === next.habits.length;
  const habits = next.habits.map((habit, index): Habit => {
    const old = before.get(habit.id);
    if (old && sameJson(old, habit)) { if (previous.habits[index] !== old) reused = false; return old; }
    reused = false; return habit;
  });
  const { habits: _previousHabits, ...previousRest } = previous, { habits: _nextHabits, ...nextRest } = next;
  void _previousHabits; void _nextHabits;
  if (reused && sameJson(previousRest, nextRest)) return previous;
  return { ...next, habits };
}
