import {withFocusDay} from './habit-options/rule';
/**
 * Session AV (owner follow-up 1, F-FOCUS-HABIT; Finch's Goal of the Day): one habit picked as today's focus. Kept as the
 * optional `focus` field ({date, habitId}) of the loose habit extras record (`zigoals:habit-extras:v1`; TIER 3 stored
 * format, additive: older builds keep it untouched and do not show it), which is exported, erased and synced with the
 * extras as it is. It holds only on its date: the next day nothing is focused until the person picks again. Plain
 * checks (no schema module), so the habit card's first chunk gains nothing. Pure.
 */
export type HabitFocus = {date: string; habitId: string};
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Today's focus habit id, or null (none picked, picked on another day, or unreadable). */
export function focusOf(extras: unknown, today: string): string | null {
  const f = (extras as {focus?: unknown} | null | undefined)?.focus as Partial<HabitFocus> | undefined;
  return f && typeof f.habitId === 'string' && f.habitId.length > 0 && f.habitId.length <= 100 && typeof f.date === 'string' && DAY.test(f.date) && f.date === today ? f.habitId : null;
}
/**
 * The extras with `habitId` as today's focus, or with no focus (null). Every other field is kept as it is. Session AV
 * lane 2 (LEDGER #52): the day's pick is also kept in `focusDays` (lib/habit-options/rule.ts), so the focus bonus XP of a
 * past day stays earned once the focus moves on.
 */
export function withFocus<T extends object>(extras: T, habitId: string | null, today: string): T {
  const {focus: _drop, focusDays: _days, ...rest} = extras as T & {focus?: unknown; focusDays?: unknown}; void _drop;
  const focusDays = withFocusDay(_days, today, habitId);
  return {...rest, ...(habitId ? {focus: {date: today, habitId}} : {}), ...(focusDays ? {focusDays} : {})} as T;
}
