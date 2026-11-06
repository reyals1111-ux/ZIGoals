import {normalizeDecimalInput} from './decimal-input';

/**
 * Session AL third pass (GAP-048, C-MO-08): kitchen units for a logged amount, converted within one kind only. A weight
 * unit becomes grams, a volume unit millilitres, by fixed definitions (US customary cup and spoons, as on US nutrition
 * labels' household measures; the avoirdupois ounce). Weight never becomes volume or back: that needs the food's density,
 * which no serving here records ("density is not inferred").
 */
export type ServingUnit = 'servings' | 'grams' | 'ounces' | 'millilitres' | 'cups' | 'tablespoons' | 'teaspoons' | 'fluid-ounces';
export const SERVING_UNITS: readonly {id: ServingUnit; label: string; field: string; word: string; base: 'g' | 'ml' | null; per: number}[] = [
  {id: 'servings', label: 'Servings', field: 'Servings', word: 'servings', base: null, per: 1},
  {id: 'grams', label: 'Grams', field: 'Food weight (g)', word: 'g', base: 'g', per: 1},
  {id: 'ounces', label: 'Ounces (oz)', field: 'Food weight (oz)', word: 'oz', base: 'g', per: 28.349523125},
  {id: 'millilitres', label: 'Millilitres', field: 'Food volume (mL)', word: 'mL', base: 'ml', per: 1},
  {id: 'cups', label: 'US cups (236.6 mL)', field: 'Food volume (US cups)', word: 'US cups', base: 'ml', per: 236.5882365},
  {id: 'tablespoons', label: 'Tablespoons (14.8 mL)', field: 'Food volume (tbsp)', word: 'tbsp', base: 'ml', per: 14.78676478125},
  {id: 'teaspoons', label: 'Teaspoons (4.9 mL)', field: 'Food volume (tsp)', word: 'tsp', base: 'ml', per: 4.92892159375},
  {id: 'fluid-ounces', label: 'US fl oz (29.6 mL)', field: 'Food volume (US fl oz)', word: 'US fl oz', base: 'ml', per: 29.5735295625},
];
export const servingUnit = (id: string) => SERVING_UNITS.find(u => u.id === id) ?? SERVING_UNITS[0]!;
/** The units a food can be logged in: servings always; weight units with a serving weight; volume units with a serving volume. */
export function unitsFor(snapshot: {servingGrams: number | null; servingMl?: number} | null): typeof SERVING_UNITS {
  return SERVING_UNITS.filter(u => u.base === null || (u.base === 'g' ? snapshot?.servingGrams != null : snapshot?.servingMl !== undefined) || (!snapshot && u.base !== null));
}
/**
 * The typed amount in the unit's base (grams or millilitres) as a decimal string with at most three decimals, for
 * servingsFromMeasure; null for servings. Throws a plain sentence for a value that is not a positive number.
 */
export function toBaseAmount(raw: string, unit: ServingUnit): string | null {
  const u = servingUnit(unit);
  if (u.base === null) return null;
  const text = normalizeDecimalInput(raw.trim());
  if (!/^\d+(?:\.\d+)?$/.test(text) || Number(text) <= 0) throw Error(`Enter the amount as a number above 0, in ${u.word}.`);
  const base = Number(text) * u.per;
  return (Math.round(base * 1000) / 1000).toString();
}
/** "1 US cup = 236.6 mL" under the field, so the conversion is never hidden. */
export function conversionNote(raw: string, unit: ServingUnit): string | null {
  const u = servingUnit(unit);
  if (u.base === null || u.per === 1) return null;
  try { const base = toBaseAmount(raw, unit); if (base === null) return null; return `${raw.trim()} ${u.word} = ${Number(base).toLocaleString('en-US', {maximumFractionDigits: 1})} ${u.base === 'g' ? 'g' : 'mL'}`; }
  catch { return null; }
}
