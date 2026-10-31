import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (COMPETITORS.md N4, item 15): the food quality letter (Nutri-Score), off by default. Open Food Facts gives a
 * product's grade (a to e) beside its nutrition; with the setting on, a barcode food shows it as "Nutri-Score B" (a letter
 * and words, never a colour alone), its grade is remembered by barcode on this device, and the food library can list A
 * and B foods first. Generic foods (CIQUAL, CoFID, the Swiss database) and foods typed by hand never get a letter: no score
 * is invented.
 *
 * Device record `zigoals:food-display:v1` (loose, versioned):
 * {version: 1, nutriScore?: boolean, abFirst?: boolean, grades?: {barcode: 8–14 digits, grade: 'a'|'b'|'c'|'d'|'e'}[]}, at
 * most 500 grades, each barcode once, oldest first (the oldest leave first; a list, because an object would reorder
 * numeric keys). Absent is off. Turning the letter off forgets the grades.
 */
export const FOOD_DISPLAY_KEY = 'zigoals:food-display:v1';
export const NUTRI_GRADES = ['a', 'b', 'c', 'd', 'e'] as const;
export type NutriGrade = typeof NUTRI_GRADES[number];
export const MAX_GRADES = 500;
const barcode = z.string().regex(/^\d{8,14}$/);
export const foodDisplaySchema = z.looseObject({
  version: z.literal(1),
  nutriScore: z.boolean().optional(),
  abFirst: z.boolean().optional(),
  grades: z.array(z.looseObject({barcode, grade: z.enum(NUTRI_GRADES)})).max(MAX_GRADES).refine(g => new Set(g.map(x => x.barcode)).size === g.length, 'A barcode is listed twice.').optional(),
});
export type FoodDisplay = z.infer<typeof foodDisplaySchema>;
export const FOOD_DISPLAY: DeviceRecordSpec<FoodDisplay> = {key: FOOD_DISPLAY_KEY, schema: foodDisplaySchema, empty: () => ({version: 1})};

/** a–e from whatever a provider wrote ("B", " c "), or null for anything else ("unknown", "not-applicable", "e+"). */
export function nutriGrade(raw: unknown): NutriGrade | null {
  if (typeof raw !== 'string') return null;
  const g = raw.trim().toLowerCase();
  return (NUTRI_GRADES as readonly string[]).includes(g) ? g as NutriGrade : null;
}
export const showsNutriScore = (r: FoodDisplay | null | undefined) => r?.nutriScore === true;
const without = (r: FoodDisplay, ...keys: string[]): Record<string, unknown> => { const rest: Record<string, unknown> = {...r}; for (const k of keys) delete rest[k]; return rest; };
/** On shows letters from now on; off hides them, stops the A/B order and forgets every remembered grade. */
export function setNutriScore(r: FoodDisplay, on: boolean): FoodDisplay {
  return foodDisplaySchema.parse(on ? {...r, nutriScore: true} : without(r, 'nutriScore', 'abFirst', 'grades'));
}
export function setAbFirst(r: FoodDisplay, on: boolean): FoodDisplay {
  if (on && !showsNutriScore(r)) throw Error('Turn on the food quality letter first.');
  return foodDisplaySchema.parse(on ? {...r, abFirst: true} : without(r, 'abFirst'));
}
/** Remembers one barcode's grade (only while the letter is on); the newest goes last and the oldest leave past 500. */
export function rememberGrade(r: FoodDisplay, code: string, raw: unknown): FoodDisplay {
  const grade = nutriGrade(raw);
  if (!showsNutriScore(r) || !grade || !barcode.safeParse(code).success) return r;
  const list = r.grades ?? [];
  if (list.at(-1)?.barcode === code && list.at(-1)?.grade === grade) return r;
  return foodDisplaySchema.parse({...r, grades: [...list.filter(x => x.barcode !== code), {barcode: code, grade}].slice(-MAX_GRADES)});
}
/** A library food's grade: only a food saved from Open Food Facts (its barcode in the provenance), and only while on. */
export function gradeOfFood(r: FoodDisplay | null | undefined, food: {provenance?: {barcode: string}}): NutriGrade | null {
  if (!showsNutriScore(r) || !food.provenance) return null;
  return r!.grades?.find(x => x.barcode === food.provenance!.barcode)?.grade ?? null;
}
/** The grade per food id for a list, for the library's letters and its order. */
export function gradesFor(r: FoodDisplay | null | undefined, foods: readonly {id: string; provenance?: {barcode: string}}[]): Record<string, NutriGrade> {
  const out: Record<string, NutriGrade> = {};
  for (const f of foods) { const g = gradeOfFood(r, f); if (g) out[f.id] = g; }
  return out;
}
/** A and B foods first, everything else after in the order it had (a stable sort; no letter is not a low letter). */
export function abFirst<T extends {id: string}>(foods: readonly T[], grades: Readonly<Record<string, string>>): T[] {
  const rank = (f: T) => grades[f.id] === 'a' || grades[f.id] === 'b' ? 0 : 1;
  return foods.map((f, i) => ({f, i})).sort((x, y) => rank(x.f) - rank(y.f) || x.i - y.i).map(x => x.f);
}
