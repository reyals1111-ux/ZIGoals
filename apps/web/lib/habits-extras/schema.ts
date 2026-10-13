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
export const quitCostSchema = z.looseObject({perDay: z.number().finite().min(0).max(100_000), currency: z.enum(['EUR', 'USD'])});
export type QuitCost = z.infer<typeof quitCostSchema>;
export const habitExtrasSchema = z.looseObject({
  version: z.literal(1),
  areas: z.record(habitId, z.string().min(1).max(60)).optional(),
  quitCost: z.record(habitId, quitCostSchema).optional(),
  bells: z.record(habitId, z.literal(true)).optional(),
  folds: z.partialRecord(z.enum(TIME_SECTIONS), z.boolean()).optional(),
}).refine(r => Object.keys(r.areas ?? {}).length <= 400 && Object.keys(r.quitCost ?? {}).length <= 400 && Object.keys(r.bells ?? {}).length <= 400, 'Too many habits remembered.');
export type HabitExtras = z.infer<typeof habitExtrasSchema>;
export const emptyHabitExtras = (): HabitExtras => ({version: 1});
export const HABIT_EXTRAS: DeviceRecordSpec<HabitExtras> = {key: HABIT_EXTRAS_KEY, schema: habitExtrasSchema, empty: emptyHabitExtras};
