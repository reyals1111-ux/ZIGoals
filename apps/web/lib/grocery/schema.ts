import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (task 4.6): the grocery list's own choices, device-only (`zigoals:grocery:v1`, loose and versioned):
 * - `ticks`: per week (its Monday) and item key, bought or not. The key is the item's name and measure (never the plans
 *   behind it), so a tick survives when the week's plans are planned again or the list is rebuilt.
 * - `pantry`: names the person said "I have this" to; they leave the list (every week) until put back.
 * - `added`: per week, items added by hand or from "often logged".
 * - `showFrequent`: whether often-logged foods are offered under the list (off by default).
 * Health's own grocery corrections (`daily.groceryEdits`) stay as they are and are still read. Not synced.
 */
export const GROCERY_KEY = 'zigoals:grocery:v1';
export const MAX_TICKS = 2000, MAX_PANTRY = 500, MAX_ADDED = 100;
const week = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const stamp = z.iso.datetime();
export const groceryAddedSchema = z.looseObject({key: z.string().min(1).max(200), name: z.string().trim().min(1).max(120), at: stamp});
export const groceryRecordSchema = z.looseObject({
  version: z.literal(1),
  ticks: z.record(z.string().min(1).max(320), z.looseObject({on: z.boolean(), at: stamp})).optional(),
  pantry: z.record(z.string().min(1).max(120), stamp).optional(),
  added: z.record(week, z.array(groceryAddedSchema).max(MAX_ADDED)).optional(),
  showFrequent: z.boolean().optional(),
}).refine(r => Object.keys(r.ticks ?? {}).length <= MAX_TICKS && Object.keys(r.pantry ?? {}).length <= MAX_PANTRY, 'Too many grocery choices remembered.');
export type GroceryRecord = z.infer<typeof groceryRecordSchema>;
export const emptyGroceryRecord = (): GroceryRecord => ({version: 1});
export const GROCERY_RECORD: DeviceRecordSpec<GroceryRecord> = {key: GROCERY_KEY, schema: groceryRecordSchema, empty: emptyGroceryRecord};

/** Lower case, accents and punctuation folded, single spaces: the name part of every key. */
export const groceryName = (name: string) => name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 120);
export const tickKey = (weekStart: string, itemKey: string) => `${weekStart}|${itemKey}`.slice(0, 320);

/** Marks an item bought or not for a week; past MAX_TICKS the oldest ticks go. */
export function setTick(r: GroceryRecord, weekStart: string, itemKey: string, on: boolean, at: string): GroceryRecord {
  week.parse(weekStart);
  const ticks = {...(r.ticks ?? {}), [tickKey(weekStart, itemKey)]: {on, at}};
  const keys = Object.keys(ticks).sort((a, b) => ticks[a]!.at.localeCompare(ticks[b]!.at));
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_TICKS))) delete ticks[k];
  return groceryRecordSchema.parse({...r, ticks});
}
export function setPantry(r: GroceryRecord, name: string, have: boolean, at: string): GroceryRecord {
  const key = groceryName(name); if (!key) return r;
  const pantry = {...(r.pantry ?? {})};
  if (have) { if (!pantry[key] && Object.keys(pantry).length >= MAX_PANTRY) throw new Error(`At most ${MAX_PANTRY} pantry items; put one back on the list first.`); pantry[key] = at; } else delete pantry[key];
  return groceryRecordSchema.parse({...r, pantry});
}
export function addGroceryItem(r: GroceryRecord, weekStart: string, name: string, at: string): GroceryRecord {
  week.parse(weekStart);
  const clean = name.trim().slice(0, 120), key = `added:${groceryName(clean)}`;
  if (!groceryName(clean)) throw new Error('Type the item’s name.');
  const list = r.added?.[weekStart] ?? [];
  if (list.some(i => i.key === key)) return r;
  if (list.length >= MAX_ADDED) throw new Error(`At most ${MAX_ADDED} added items a week.`);
  return groceryRecordSchema.parse({...r, added: {...(r.added ?? {}), [weekStart]: [...list, {key, name: clean, at}]}});
}
export function removeGroceryItem(r: GroceryRecord, weekStart: string, key: string): GroceryRecord {
  const list = (r.added?.[weekStart] ?? []).filter(i => i.key !== key), added = {...(r.added ?? {})};
  if (list.length) added[weekStart] = list; else delete added[weekStart];
  return groceryRecordSchema.parse({...r, added});
}
