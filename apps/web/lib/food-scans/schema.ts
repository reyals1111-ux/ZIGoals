import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {HEALTH_MEALS} from '../health';

/**
 * Session AK (task 4.1): the person's barcode scan history, device-only (`zigoals:food-scans:v1`, loose and versioned).
 * One row per barcode: the product's name and where it came from, when it was last scanned, how often, and, once it was
 * logged, the library food it became with the last amount and meal, so "Recent scans" can log it again in one tap. At most
 * 100 rows; the oldest go first. Nothing here is sent anywhere; it is in Export everything and the account erase (wired by
 * the lead), never synced.
 */
export const FOOD_SCANS_KEY = 'zigoals:food-scans:v1';
export const MAX_SCANS = 100;
const barcode = z.string().regex(/^\d{8,14}$/);
const foodId = z.string().regex(/^health_[a-z0-9-]{8,80}$/);
export const SCAN_SOURCES = ['Open Food Facts', 'USDA FoodData Central', 'My library', 'Added by me'] as const;
export type ScanSource = (typeof SCAN_SOURCES)[number];
export const foodScanSchema = z.looseObject({
  barcode,
  name: z.string().trim().min(1).max(120),
  /** Where the answer came from; a later build may name another source, so any short text is kept. */
  source: z.string().min(1).max(60),
  at: z.iso.datetime(),
  count: z.number().int().min(1).max(1_000_000),
  foodId: foodId.optional(),
  quantityMilli: z.number().int().min(1).max(1_000_000).optional(),
  meal: z.enum(HEALTH_MEALS).optional(),
});
export type FoodScan = z.infer<typeof foodScanSchema>;
export const foodScansSchema = z.looseObject({version: z.literal(1), scans: z.array(foodScanSchema).max(MAX_SCANS).optional()})
  .refine(r => new Set((r.scans ?? []).map(s => s.barcode)).size === (r.scans ?? []).length, 'A barcode is listed twice.');
export type FoodScans = z.infer<typeof foodScansSchema>;
export const emptyFoodScans = (): FoodScans => ({version: 1});
export const FOOD_SCANS: DeviceRecordSpec<FoodScans> = {key: FOOD_SCANS_KEY, schema: foodScansSchema, empty: emptyFoodScans};

/** The newest first. */
export const recentScans = (r: FoodScans, limit = 10): FoodScan[] => [...(r.scans ?? [])].sort((a, b) => b.at.localeCompare(a.at) || a.barcode.localeCompare(b.barcode)).slice(0, limit);
export const scanOf = (r: FoodScans, code: string): FoodScan | undefined => (r.scans ?? []).find(s => s.barcode === code);

/**
 * Records one scan: a known barcode moves to the top with its count raised (`count: false` keeps the count, for the log
 * that follows a lookup), its name and source refreshed, and the logged food, amount and meal kept when given. A new
 * barcode past 100 drops the oldest row.
 */
export function recordScan(r: FoodScans, scan: {barcode: string; name: string; source: string; at: string; foodId?: string; quantityMilli?: number; meal?: FoodScan['meal']}, options: {count?: boolean} = {}): FoodScans {
  const old = scanOf(r, scan.barcode);
  const row: FoodScan = {...(old ?? {}), barcode: scan.barcode, name: scan.name.trim().slice(0, 120) || old?.name || 'Unnamed product', source: scan.source.slice(0, 60), at: scan.at,
    count: (old?.count ?? 0) + (options.count === false && old ? 0 : 1),
    ...(scan.foodId ? {foodId: scan.foodId} : {}), ...(scan.quantityMilli ? {quantityMilli: scan.quantityMilli} : {}), ...(scan.meal ? {meal: scan.meal} : {})};
  const rest = (r.scans ?? []).filter(s => s.barcode !== scan.barcode).sort((a, b) => b.at.localeCompare(a.at));
  return foodScansSchema.parse({...r, scans: [row, ...rest].slice(0, MAX_SCANS)});
}
export const removeScan = (r: FoodScans, code: string): FoodScans => foodScansSchema.parse({...r, scans: (r.scans ?? []).filter(s => s.barcode !== code)});
export const clearScans = (r: FoodScans): FoodScans => foodScansSchema.parse({...r, scans: []});
