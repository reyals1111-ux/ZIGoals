/**
 * Session AK D1 (FIRST_RUN_REVIEW FR-17, owner decision 5): the habit form keeps how a habit is counted (habit type,
 * measurement, unit, target value, target period) under "More options", with the description, linked Goal, stack, end
 * and notes. The fold starts closed for a new habit and opens by itself when the person would otherwise miss something
 * inside it: on every edit (so a counted habit's target is in view; Session AH HA12 already opened it on edit), when a
 * template fills the counting fields, and when a refusal names a field inside it (that field then takes the focus).
 * The habit cards do not change.
 */

/** The counting choices a blank habit starts with; a habit or template that differs from them is "counted". */
export const HABIT_COUNTING_DEFAULTS = {type: 'build', measurement: 'count', unit: 'times', target: 1, targetPeriod: 'day'} as const;
export type HabitCounting = {type: string; measurement: string; unit?: string; target: number; targetPeriod: string};

/** True when these counting choices differ from a blank habit's (a yes/no habit already differs by its measurement). */
export function habitCountingDiffers(counting: HabitCounting): boolean {
  const d = HABIT_COUNTING_DEFAULTS;
  return counting.type !== d.type || counting.measurement !== d.measurement || (counting.unit ?? '') !== d.unit || counting.target !== d.target || counting.targetPeriod !== d.targetPeriod;
}

/** The form's named fields (useFieldErrors names) that sit inside "More options". */
export const HABIT_FOLD_FIELDS: ReadonlySet<string> = new Set(['target', 'goal', 'endCount']);

/** Whether a refusal about these fields must open the fold first, so its first field can take the focus. */
export function foldHoldsError(fields: readonly string[]): boolean {
  return fields.some(field => HABIT_FOLD_FIELDS.has(field));
}
