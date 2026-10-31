import * as z from 'zod';
import {HABIT_EXTRAS_KEY} from '../aa-device-keys';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AA-Local Part 1: what a habit carries beyond its synced record, on this device only (ADR-022 B1): its life
 * area (AA-Cloud's ids, owner edit 1), a quit habit's cost per day for the "money saved" estimate (B10), whether a
 * duration habit rings a bell when its timer finishes (H2), and which time-of-day sections the person folded (H1).
 * Keyed by habit id; an entry for a habit that no longer exists is harmless and pruned on the next write. Loose, so a
 * later build's fields survive a round trip here.
 */
const habitId = z.string().min(1).max(100);
export const TIME_SECTIONS = ['morning', 'afternoon', 'evening', 'anytime'] as const;
export type TimeSection = (typeof TIME_SECTIONS)[number];
export const HABIT_LIST_MODES = ['cards', 'compact'] as const;
export const quitCostSchema = z.looseObject({perDay: z.number().finite().min(0).max(100_000), currency: z.enum(['EUR', 'USD'])});
export type QuitCost = z.infer<typeof quitCostSchema>;
export const habitExtrasSchema = z.looseObject({
  version: z.literal(1),
  areas: z.record(habitId, z.string().min(1).max(60)).optional(),
  quitCost: z.record(habitId, quitCostSchema).optional(),
  bells: z.record(habitId, z.literal(true)).optional(),
  folds: z.partialRecord(z.enum(TIME_SECTIONS), z.boolean()).optional(),
  /**
   * Session AJ (item 35; TIER 3 (stored format) and TIER 3 (auth/sync)): a habit's own clock time ("HH:MM"), set from the
   * Day Timeline's "Every day, on all my devices". Optional in this loose record, which syncs through the encrypted extras
   * sections, so the strict synced habit record keeps no clock time and stays exactly as it is; older builds keep the map
   * through a read-modify-write (frozen readers) and simply do not show it.
   */
  times: z.record(habitId, z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)).optional(),
  /**
   * Session AK (5.7; TIER 3 (stored format)): the person's own habit order, {habitId: position 0…10,000}, at most 400
   * entries (lib/habits-order/extras.ts writes it). Additive in this loose record and synced with it through the encrypted
   * extras sections, so the order is the same on every device; ids the journal no longer has are pruned on the next write.
   */
  order: z.record(habitId, z.number().int().min(0).max(10_000)).optional(),
  /**
   * Session AK (5.7): how the Habits page shows the list, "cards" (the default, so absent) or "compact". A display choice
   * kept on this device (a device field of the extras section, as `folds` is). A mode a later build adds reads as absent.
   */
  listMode: z.enum(HABIT_LIST_MODES).optional().catch(undefined),
}).refine(r => Object.keys(r.areas ?? {}).length <= 400 && Object.keys(r.quitCost ?? {}).length <= 400 && Object.keys(r.bells ?? {}).length <= 400 && Object.keys(r.times ?? {}).length <= 400 && Object.keys(r.order ?? {}).length <= 400, 'Too many habits remembered.');
export type HabitExtras = z.infer<typeof habitExtrasSchema>;
export const emptyHabitExtras = (): HabitExtras => ({version: 1});
export const HABIT_EXTRAS: DeviceRecordSpec<HabitExtras> = {key: HABIT_EXTRAS_KEY, schema: habitExtrasSchema, empty: emptyHabitExtras};
