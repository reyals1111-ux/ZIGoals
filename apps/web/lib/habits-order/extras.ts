import * as z from 'zod';
import {habitExtrasSchema, type HabitExtras} from '../habits-extras/schema';
import {inOrder, orderRecord} from './reorder';

/**
 * Session AK (5.7): where the habit order and the list mode live. Both are OPTIONAL fields of the habit extras record
 * (`zigoals:habit-extras:v1`, lib/habits-extras/schema.ts), which is loose (`z.looseObject`), so a field it does not
 * name yet survives every parse and write unchanged; this module validates them on its own until the lead adds them to
 * the schema. The strict synced habit record (lib/habits.ts) is never touched.
 *
 * - `order` ({habitId: position}) travels with the habit extras through the encrypted extras sync: the order a person
 *   chose is the same on every device. Ids the journal no longer has are pruned on the next write here.
 * - `listMode` ("cards" | "compact") is how this screen shows the list: a display choice, kept on the device (the lead
 *   adds it to the record's device fields, as `folds` is).
 */
const habitId = z.string().min(1).max(100);
export const MAX_ORDERED_HABITS = 400;
export const habitOrderSchema = z.record(habitId, z.number().int().min(0).max(10_000)).refine(o => Object.keys(o).length <= MAX_ORDERED_HABITS, 'Too many habits remembered.');
export type HabitOrder = z.infer<typeof habitOrderSchema>;
export const HABIT_LIST_MODES = ['cards', 'compact'] as const;
export type HabitListMode = (typeof HABIT_LIST_MODES)[number];

/** The saved order, or null when there is none or it cannot be read (the list then keeps its usual order). */
export function habitOrderOf(extras: HabitExtras): HabitOrder | null {
  const parsed = habitOrderSchema.safeParse((extras as Record<string, unknown>).order);
  return parsed.success ? parsed.data : null;
}
/** The record with this order (ids not in `keep`, when given, are left out). Positions are 0…n−1 in the given order. */
export function withHabitOrder(extras: HabitExtras, ids: readonly string[], keep: ReadonlySet<string> | null = null): HabitExtras {
  const order = habitOrderSchema.parse(orderRecord(ids.filter(id => !keep || keep.has(id))));
  return habitExtrasSchema.parse({...extras, order: Object.keys(order).length ? order : undefined});
}
/** Habits in the person's order. */
export const orderedHabits = <T extends {id: string}>(habits: readonly T[], extras: HabitExtras): T[] => inOrder(habits, habitOrderOf(extras));
export function habitListModeOf(extras: HabitExtras): HabitListMode {
  const mode = (extras as Record<string, unknown>).listMode;
  return mode === 'compact' ? 'compact' : 'cards';
}
export function withHabitListMode(extras: HabitExtras, mode: HabitListMode): HabitExtras {
  return habitExtrasSchema.parse({...extras, listMode: mode === 'cards' ? undefined : mode});
}
