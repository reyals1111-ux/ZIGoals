import type {VitaminKey, Vitamins} from '../health-vitamins/schema';
import type {Nutrition} from '../health';
import type {LabelRead} from './read';

/**
 * Session AK (item 3): a checked label read as the drafts of the two forms that already exist. Both stay editable and say
 * "Read from your photo — check the numbers"; a value the label did not give stays empty (unknown, never zero).
 * - The food form ("New food"): the label's own basis (per serving, 100 g or 100 mL), its numbers as typed text.
 * - The barcode "Add it yourself" form, which keeps values per 100 g: a per-serving label in grams is scaled to 100 g;
 *   a label in millilitres is not converted (ZIGoals assumes no density), so it is sent to the food form instead.
 */
export const READ_FROM_PHOTO = 'Read from your photo — check the numbers';
const text = (v: number | null | undefined, digits = 3) => v === null || v === undefined ? '' : String(Math.round(v * 10 ** digits) / 10 ** digits);
const whole = (v: number | null | undefined) => v === null || v === undefined ? '' : String(Math.round(v));
const VITAMIN_KEYS: VitaminKey[] = ['aUg', 'cMg', 'dUg', 'eMg', 'kUg', 'b12Ug', 'folateUg'];

export type FoodFormDraft = {
  basis: 'serving' | '100g' | '100ml'; measureUnit: 'g' | 'ml'; weight: string;
  values: Record<'kcal' | 'proteinMg' | 'carbsMg' | 'fatMg', string>;
  /** The form's additional nutrients, in their field units (g for fibre, sugars and saturated fat; mg for the minerals). */
  extras: Record<'fiberMg' | 'sugarMg' | 'saturatedFatMg' | 'sodiumMg' | 'potassiumMg' | 'calciumMg' | 'ironMg', string>;
  vitamins: Partial<Record<VitaminKey, string>>;
  notes: string[];
};
export function foodFormDraft(label: LabelRead): FoodFormDraft {
  const s = label.serving;
  const basis = label.basis === 'per-100g' ? '100g' : label.basis === 'per-100ml' ? '100ml' : 'serving';
  const measureUnit = basis === '100g' ? 'g' : basis === '100ml' ? 'ml' : s?.unit ?? 'g';
  const weight = basis === 'serving' ? s ? text(s.amount) : '' : s && s.unit === measureUnit ? text(s.amount) : '100';
  const vitamins: Partial<Record<VitaminKey, string>> = {};
  for (const k of VITAMIN_KEYS) if (label.vitamins[k] !== undefined) vitamins[k] = text(label.vitamins[k]);
  const notes = [...label.notes];
  if (basis !== 'serving' && !(s && s.unit === measureUnit)) notes.push(`No serving size was read, so one serving is 100 ${measureUnit === 'g' ? 'g' : 'mL'}. Change it if your serving differs.`);
  if (label.notKept.length) notes.push(`Also on the label, not kept here: ${label.notKept.join(', ')}.`);
  return {
    basis, measureUnit, weight,
    values: {kcal: whole(label.kcal), proteinMg: text(label.proteinG), carbsMg: text(label.carbsG), fatMg: text(label.fatG)},
    extras: {fiberMg: text(label.fibreG), sugarMg: text(label.sugarsG), saturatedFatMg: text(label.saturatedFatG), sodiumMg: whole(label.sodiumMg), potassiumMg: whole(label.minerals.potassiumMg), calciumMg: whole(label.minerals.calciumMg), ironMg: whole(label.minerals.ironMg)},
    vitamins, notes,
  };
}

export type BarcodeDraft =
  | {ok: true; kcal: string; protein: string; carbs: string; fat: string; extra: Partial<Nutrition>; vitamins: Vitamins; notes: string[]}
  | {ok: false; reason: string};
/** The four per-100 g fields of "Add it yourself", plus what the label gives beyond them, in the stored units. */
export function barcodeDraft(label: LabelRead): BarcodeDraft {
  if (label.basis === 'per-100ml' || (label.basis === 'per-serving' && label.serving?.unit === 'ml')) return {ok: false, reason: 'This label is in millilitres. This form keeps grams and ZIGoals does not guess a density: add it under Foods & recipes → New food, which keeps millilitres.'};
  if (label.basis === 'per-serving' && !label.serving) return {ok: false, reason: 'This label is per serving and its serving size was not read. Type the values per 100 g, or try the photo again.'};
  const factor = label.basis === 'per-serving' ? 100 / label.serving!.amount : 1;
  const scaled = (v: number | null) => v === null ? null : v * factor;
  const mg = (g: number | null) => g === null ? undefined : Math.round(g * factor * 1000);
  const plain = (v: number | undefined | null) => v === null || v === undefined ? undefined : Math.round(v * factor);
  const extra: Partial<Nutrition> = Object.fromEntries(Object.entries({fiberMg: mg(label.fibreG), sugarMg: mg(label.sugarsG), saturatedFatMg: mg(label.saturatedFatG), sodiumMg: plain(label.sodiumMg), potassiumMg: plain(label.minerals.potassiumMg), calciumMg: plain(label.minerals.calciumMg), ironMg: plain(label.minerals.ironMg)}).filter(([, v]) => v !== undefined));
  const vitamins: Vitamins = {};
  for (const k of VITAMIN_KEYS) if (label.vitamins[k] !== undefined) vitamins[k] = Math.round(label.vitamins[k]! * factor * 1000);
  const notes = [...label.notes];
  if (factor !== 1) notes.push(`The label is per serving of ${text(label.serving!.amount)} g; the values are scaled to 100 g.`);
  if (label.notKept.length) notes.push(`Also on the label, not kept here: ${label.notKept.join(', ')}.`);
  const kcal = scaled(label.kcal);
  return {ok: true, kcal: whole(kcal), protein: text(scaled(label.proteinG)), carbs: text(scaled(label.carbsG)), fat: text(scaled(label.fatG)), extra, vitamins, notes};
}
