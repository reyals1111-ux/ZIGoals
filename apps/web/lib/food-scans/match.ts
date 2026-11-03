import {normalizeBarcode} from '../food-lookup';
import {additionalNutrients, type HealthData, type HealthFood, type Nutrition} from '../health';
import {VITAMIN_KEYS, type Vitamins} from '../health-vitamins/schema';
import {EXTRA_KEYS, type NutrientExtraValues} from '../health-vitamins/extras';
import type {FoodScans} from './schema';

/**
 * Session AK (task 4.1): the barcode flow's pure parts.
 * - `libraryFoodFor`: the person's own food for a barcode, before anything is sent: a food saved from Open Food Facts
 *   carries the barcode in its provenance; a food logged from another source is linked through the scan history. The
 *   newest edit wins. No request is made when one is found.
 * - `quantityMilliFor`: the amount on the match card (grams or millilitres, servings, or units of a given weight) as the
 *   diary's quantity in thousandths of a serving.
 * - `sourceExtras`: what a source gives beyond the four reviewed fields (fibre, sugars, saturated fat, sodium, potassium,
 *   calcium, iron; vitamins; magnesium, zinc, B1, B2, B3, B6, omega-3), per 100 g or 100 mL like the label. Unknown stays
 *   absent, never 0.
 * - `missingFoodDraft`: the "add it yourself" form for a barcode no database knows: the barcode in the name, every
 *   nutrient empty (unknown).
 */
const sameCode = (a: string, b: string) => { try { return normalizeBarcode(a) === normalizeBarcode(b); } catch { return false; } };
export function libraryFoodFor(data: Pick<HealthData, 'foods'>, code: string, scans?: FoodScans): HealthFood | null {
  let barcode: string; try { barcode = normalizeBarcode(code); } catch { return null; }
  const linked = new Set((scans?.scans ?? []).filter(s => s.foodId && sameCode(s.barcode, barcode)).map(s => s.foodId!));
  const hits = data.foods.filter(f => (f.provenance?.barcode && sameCode(f.provenance.barcode, barcode)) || linked.has(f.id));
  return hits.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))[0] ?? null;
}

export type QuantityMode = 'amount' | 'servings' | 'units';
/**
 * `serving` is the food's serving in grams or millilitres (100 for a label read per 100 g); `unit` the weight of one piece
 * in the same measure. Throws a plain sentence when an input is not a positive number or the result is out of range.
 */
export function quantityMilliFor(mode: QuantityMode, amountText: string, serving: number, unitText = ''): number {
  const read = (text: string, what: string) => { const t = text.trim().replace(',', '.'); const n = Number(t); if (!t || !/^\d+(\.\d+)?$/.test(t) || !Number.isFinite(n) || n <= 0) throw new Error(`Enter ${what} as a number above 0.`); return n; };
  if (!Number.isFinite(serving) || serving <= 0) throw new Error('This food has no serving measure. Use servings.');
  const amount = read(amountText, mode === 'amount' ? 'the amount' : mode === 'servings' ? 'the servings' : 'the number of units');
  const measure = mode === 'amount' ? amount : mode === 'units' ? amount * read(unitText, 'the weight of one unit') : null;
  const q = Math.round(measure === null ? amount * 1000 : measure / serving * 1000);
  if (q < 1 || q > 1_000_000) throw new Error('That amount is outside what a diary entry can hold.');
  return q;
}

type SourceProduct = {source: string; nutrients: Record<string, number | null | undefined>; vitamins?: Vitamins; more?: Partial<Record<string, number>>};
export type SourceExtras = {nutrients: Partial<Nutrition>; vitamins: Vitamins; extras: NutrientExtraValues; sodiumFromSalt: boolean};
const whole = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined;
export function sourceExtras(product: SourceProduct): SourceExtras {
  const nutrients: Partial<Nutrition> = {};
  let sodiumFromSalt = false;
  if (product.source !== 'Open Food Facts') {
    for (const [key] of additionalNutrients) { const v = whole(product.nutrients[key]); if (v !== undefined) nutrients[key] = v; }
    // The Swiss database gives salt; sodium is salt ÷ 2.5 (the EU label rule), said on the card.
    const salt = whole(product.nutrients.saltMg);
    if (nutrients.sodiumMg === undefined && salt !== undefined) { nutrients.sodiumMg = Math.round(salt / 2.5); sodiumFromSalt = true; }
  }
  const vitamins: Vitamins = {};
  for (const k of VITAMIN_KEYS) { const v = whole(product.vitamins?.[k]); if (v !== undefined) vitamins[k] = v; }
  const extras: NutrientExtraValues = {};
  // The offline library gives these in mg (fractions allowed); the record keeps thousandths of a mg.
  for (const k of EXTRA_KEYS) { const v = product.more?.[k]; if (typeof v === 'number' && Number.isFinite(v) && v >= 0) extras[k] = Math.round(v * 1000); }
  return {nutrients, vitamins, extras, sodiumFromSalt};
}
export const hasSourceExtras = (x: SourceExtras) => Object.keys(x.nutrients).length + Object.keys(x.vitamins).length + Object.keys(x.extras).length > 0;

/** The "add it yourself" draft: a name that carries the barcode, no brand, 100 g serving, every nutrient unknown. */
export function missingFoodDraft(code: string): {name: string; brand: string; notes: string; servingGrams: number; nutrients: Nutrition} {
  let barcode = code.trim(); try { barcode = normalizeBarcode(code); } catch { /* shown as typed */ }
  return {name: `Product ${barcode}`.slice(0, 120), brand: '', notes: `Barcode ${barcode}`, servingGrams: 100, nutrients: {kcal: null, proteinMg: null, carbsMg: null, fatMg: null}};
}
