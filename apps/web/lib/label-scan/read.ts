import * as z from 'zod';
import {VITAMINS, type VitaminKey} from '../health-vitamins/schema';

/**
 * Session AK (COMPETITORS.md N1, item 3): a photo of a nutrition label, read by the person's own AI into a strict JSON
 * shape, then checked here before anything reaches a form. The model's reply is data: it is parsed with zod, every number
 * is bounded, and a label whose numbers cannot be true is refused (more than 100 g of nutrients in 100 g, sugars above
 * carbohydrates, saturated fat above fat, and the energy check: kcal against 4 × protein + 4 × carbohydrate + 9 × fat
 * within ±20 %, with fibre counted the EU way (2 kcal/g, carbohydrate without fibre) or the US way (carbohydrate with
 * fibre), whichever the label used). What passes becomes an editable draft; nothing is saved by this module.
 */
export const LABEL_BASES = ['per-100g', 'per-100ml', 'per-serving'] as const;
export type LabelBasis = typeof LABEL_BASES[number];
/** The JSON Schema the model is asked to follow (and, on Ollama, the wire's own structured output). */
export const LABEL_JSON_SCHEMA = {
  type: 'object',
  properties: {
    readable: {type: 'boolean', description: 'false when no nutrition label can be read in the photo'},
    basis: {type: ['string', 'null'], enum: [...LABEL_BASES, null], description: 'the column the values below come from'},
    serving_size: {type: ['object', 'null'], properties: {amount: {type: 'number'}, unit: {type: 'string', enum: ['g', 'ml']}}, required: ['amount', 'unit']},
    energy_kcal: {type: ['number', 'null']}, energy_kj: {type: ['number', 'null']},
    protein_g: {type: ['number', 'null']}, carbohydrate_g: {type: ['number', 'null']}, fat_g: {type: ['number', 'null']},
    fibre_g: {type: ['number', 'null']}, sugars_g: {type: ['number', 'null']}, saturated_fat_g: {type: ['number', 'null']},
    salt_g: {type: ['number', 'null']}, sodium_mg: {type: ['number', 'null']},
    vitamins_minerals: {type: 'array', maxItems: 30, items: {type: 'object', properties: {name: {type: 'string'}, amount: {type: 'number'}, unit: {type: 'string', enum: ['g', 'mg', 'µg', '%']}}, required: ['name', 'amount', 'unit']}},
  },
  required: ['readable', 'basis'],
} as const;

/** A number as the model wrote it: a JSON number, or a plain decimal string ("12,5" too); null and absent are unknown. */
const num = (max: number) => z.preprocess(v => typeof v === 'string' && /^\s*\d{1,6}(?:[.,]\d{1,4})?\s*$/.test(v) ? Number(v.trim().replace(',', '.')) : v, z.number().finite().min(0).max(max)).nullable().optional();
const UNITS: Record<string, 'g' | 'mg' | 'µg' | '%'> = {g: 'g', mg: 'mg', 'µg': 'µg', ug: 'µg', mcg: 'µg', 'μg': 'µg', '%': '%'};
export const labelReplySchema = z.object({
  readable: z.boolean().optional(),
  basis: z.enum(LABEL_BASES).nullable().optional(),
  serving_size: z.object({amount: z.preprocess(v => typeof v === 'string' ? Number(v.replace(',', '.')) : v, z.number().finite().positive().max(5000)), unit: z.enum(['g', 'ml'])}).nullable().optional(),
  energy_kcal: num(5000), energy_kj: num(21000),
  protein_g: num(1000), carbohydrate_g: num(1000), fat_g: num(1000), fibre_g: num(1000), sugars_g: num(1000), saturated_fat_g: num(1000),
  salt_g: num(1000), sodium_mg: num(400_000),
  vitamins_minerals: z.array(z.object({name: z.string().trim().min(1).max(60), amount: num(100_000).unwrap().unwrap(), unit: z.string().trim().max(12)})).max(30).optional(),
});
export type LabelReply = z.infer<typeof labelReplySchema>;

/** The first balanced JSON object in a reply (a fenced block or bare), or null. Strings and escapes are respected. */
export function extractJsonObject(text: string): unknown {
  const s = text.slice(0, 20_000);
  for (let start = s.indexOf('{'); start >= 0; start = s.indexOf('{', start + 1)) {
    let depth = 0, inString = false, escaped = false;
    for (let i = start; i < s.length; i++) {
      const c = s[i]!;
      if (inString) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') inString = false; continue; }
      if (c === '"') inString = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) { try { return JSON.parse(s.slice(start, i + 1)); } catch { break; } }
    }
  }
  return null;
}

/** Minerals the food form keeps beside the four (mg), and the vitamins it keeps (thousandths of their unit). */
export type LabelMinerals = Partial<Record<'potassiumMg' | 'calciumMg' | 'ironMg', number>>;
export type LabelRead = {
  basis: LabelBasis;
  serving: {amount: number; unit: 'g' | 'ml'} | null;
  /** All in the label's basis; null is not printed (unknown, never zero). */
  kcal: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null;
  fibreG: number | null; sugarsG: number | null; saturatedFatG: number | null;
  sodiumMg: number | null; sodiumFromSalt: boolean;
  minerals: LabelMinerals;
  vitamins: Partial<Record<VitaminKey, number>>;
  /** Listed on the label but not kept by the form (another vitamin, or a % of a daily value only). */
  notKept: string[];
  /** Calm notes for the draft ("energy worked out from kJ"). */
  notes: string[];
};
export type LabelOutcome = {ok: true; label: LabelRead} | {ok: false; problems: string[]};

const VITAMIN_NAMES: [RegExp, VitaminKey][] = [[/^vitamin a\b|^retinol/, 'aUg'], [/^vitamin c\b|^ascorbic/, 'cMg'], [/^vitamin d\b|^vitamin d[23]/, 'dUg'], [/^vitamin e\b/, 'eMg'], [/^vitamin k\b|^vitamin k[12]/, 'kUg'], [/^vitamin b-?12\b|^cobalamin/, 'b12Ug'], [/^folate|^folic acid|^vitamin b-?9\b/, 'folateUg']];
const MINERAL_NAMES: [RegExp, keyof LabelMinerals][] = [[/^potassium\b/, 'potassiumMg'], [/^calcium\b/, 'calciumMg'], [/^iron\b/, 'ironMg']];
/** Upper bounds per 100 g for a vitamin, in its own unit, past which the reading is refused (fortified foods included). */
const VITAMIN_MAX: Record<VitaminKey, number> = {aUg: 10_000, cMg: 5000, dUg: 500, eMg: 1000, kUg: 5000, b12Ug: 1000, folateUg: 10_000};
const toUnit = (amount: number, from: 'g' | 'mg' | 'µg', to: 'mg' | 'µg') => amount * ({g: 1e6, mg: 1e3, 'µg': 1}[from] / {mg: 1e3, 'µg': 1}[to]);
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** The energy check, fibre-aware: whether kcal fits 4/4/9 within ±20 % (and ±10 kcal for tiny values). */
export function atwaterFits(kcal: number, proteinG: number, carbsG: number, fatG: number, fibreG: number | null): boolean {
  const fibre = fibreG ?? 0;
  // US labels: carbohydrate includes fibre, which adds about nothing; EU labels: carbohydrate excludes fibre, at 2 kcal/g.
  const low = 4 * proteinG + 4 * Math.max(0, carbsG - fibre) + 9 * fatG, high = 4 * proteinG + 4 * carbsG + 9 * fatG + 2 * fibre;
  return kcal >= low * 0.8 - 10 && kcal <= high * 1.2 + 10;
}

/** Checks a model reply (its text) and turns it into a label read, or names every reason it cannot be used. */
export function readLabelReply(replyText: string): LabelOutcome {
  const raw = extractJsonObject(replyText);
  if (raw === null) return {ok: false, problems: ['Your AI did not answer with the label’s numbers. Try again, or type them in.']};
  const parsed = labelReplySchema.safeParse(raw);
  if (!parsed.success) return {ok: false, problems: ['Your AI’s answer had numbers that cannot be on a label (negative, too large or not numbers). Try again, or type them in.']};
  const r = parsed.data;
  if (r.readable === false) return {ok: false, problems: ['Your AI could not find a nutrition label in this photo. Try a sharper photo of the table, straight on.']};
  if (!r.basis) return {ok: false, problems: ['Your AI could not tell whether the values are per 100 g, per 100 mL or per serving. Type them in, or try again.']};
  const notes: string[] = [], problems: string[] = [];
  const basis = r.basis, serving = r.serving_size ?? null;
  let kcal = r.energy_kcal ?? null;
  if (kcal === null && r.energy_kj != null) { kcal = Math.round(r.energy_kj / 4.184); notes.push('Calories worked out from kilojoules (÷ 4.184).'); }
  else if (kcal !== null && r.energy_kj != null && r.energy_kj > 0 && Math.abs(kcal * 4.184 - r.energy_kj) > Math.max(20, r.energy_kj * 0.1)) problems.push('The kilojoules and the kilocalories do not match each other.');
  const p = r.protein_g ?? null, c = r.carbohydrate_g ?? null, f = r.fat_g ?? null, fib = r.fibre_g ?? null, sug = r.sugars_g ?? null, sat = r.saturated_fat_g ?? null;
  // The mass the values describe: 100 g / 100 mL, or the serving.
  const mass = basis === 'per-serving' ? serving?.amount ?? null : 100;
  // A millilitre is not a gram: syrups and honey weigh up to about 1.5 g per mL, so a volume allows that much (no density is assumed for the draft).
  const density = (basis === 'per-100ml' || (basis === 'per-serving' && serving?.unit === 'ml')) ? 1.5 : 1;
  if (basis === 'per-serving' && !serving) notes.push('The serving size was not read: enter it before saving.');
  if (mass !== null) {
    // Fibre is left out: a US label's carbohydrate already includes it.
    const parts = [p, c, f].reduce<number>((t, v) => t + (v ?? 0), 0) + (r.salt_g ?? (r.sodium_mg != null ? r.sodium_mg * 2.5 / 1000 : 0));
    if (parts > mass * density * 1.02 + 0.5) problems.push(`The nutrients add up to more than the ${basis === 'per-serving' ? `serving of ${mass} ${serving!.unit === 'ml' ? 'mL' : 'g'}` : `100 ${basis === 'per-100ml' ? 'mL' : 'g'}`} they describe.`);
    if (kcal !== null && kcal > mass * density * 9 * 1.05 + 5) problems.push('The calories are more than any food of that weight can hold (9 kcal per gram is pure fat).');
  }
  if (sug !== null && c !== null && sug > c + 0.5) problems.push('The sugars are more than the carbohydrate they belong to.');
  if (sat !== null && f !== null && sat > f + 0.5) problems.push('The saturated fat is more than the fat it belongs to.');
  if (kcal !== null && p !== null && c !== null && f !== null) {
    if (!atwaterFits(kcal, p, c, f, fib)) problems.push('The calories do not match the protein, carbohydrate and fat (4, 4 and 9 kcal per gram, ±20 %).');
  } else if (kcal !== null) notes.push('The calories could not be checked against protein, carbohydrate and fat: some were not read.');
  let sodiumMg = r.sodium_mg ?? null, sodiumFromSalt = false;
  if (sodiumMg === null && r.salt_g != null) { sodiumMg = Math.round(r.salt_g * 400); sodiumFromSalt = true; notes.push('Sodium worked out from salt (÷ 2.5).'); }
  const vitamins: Partial<Record<VitaminKey, number>> = {}, minerals: LabelMinerals = {}, notKept: string[] = [];
  const perHundred = mass && mass > 0 ? 100 / mass : 1;
  for (const v of r.vitamins_minerals ?? []) {
    const name = v.name.toLowerCase().replace(/\s+/g, ' ').trim(), unit = UNITS[v.unit.toLowerCase()];
    if (!unit) { notKept.push(`${v.name} (${v.unit})`); continue; }
    const vit = VITAMIN_NAMES.find(([re]) => re.test(name))?.[1], min = MINERAL_NAMES.find(([re]) => re.test(name))?.[1];
    if ((vit || min) && unit === '%') { notKept.push(`${v.name} (only as % of a daily value)`); continue; }
    if (vit && unit !== '%') {
      const to = VITAMINS.find(([k]) => k === vit)![2] === 'mg' ? 'mg' as const : 'µg' as const, amount = r3(toUnit(v.amount, unit, to));
      if (amount * perHundred > VITAMIN_MAX[vit]) { problems.push(`${v.name} is far above what a food can hold.`); continue; }
      vitamins[vit] = amount; continue;
    }
    if (min && unit !== '%') {
      const amount = Math.round(toUnit(v.amount, unit, 'mg'));
      if (amount * perHundred > 50_000) { problems.push(`${v.name} is far above what a food can hold.`); continue; }
      minerals[min] = amount; continue;
    }
    if (/^sodium\b|^salt\b/.test(name)) continue;
    notKept.push(v.name);
  }
  if (problems.length) return {ok: false, problems};
  if ([kcal, p, c, f].every(v => v === null)) return {ok: false, problems: ['No calories, protein, carbohydrate or fat were read. Try a sharper photo of the table, or type them in.']};
  return {ok: true, label: {basis, serving, kcal: kcal === null ? null : Math.round(kcal), proteinG: p, carbsG: c, fatG: f, fibreG: fib, sugarsG: sug, saturatedFatG: sat, sodiumMg: sodiumMg === null ? null : Math.round(sodiumMg), sodiumFromSalt, minerals, vitamins, notKept, notes}};
}
