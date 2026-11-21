import type {HealthFood} from '../health';

/**
 * Session AV (owner follow-up 1, F-WORDS-MATCH; MyFitnessPal and Cronometer's spoken log, without a model): a meal
 * written in words ("2 eggs, toast and a coffee"; "twee boterhammen met kaas") read into items — each with a number and
 * a unit when the words give one — and each item matched to the person's own foods first (by name, then by every
 * word). The offline library is searched by the caller for what the person's foods do not have. Nothing is logged here:
 * the person checks each match and its amount. EN and NL. Pure.
 */
export type WordsItem = {text: string; food: string; count: number | null; unit: 'g' | 'ml' | null};
const NUMBER_WORDS: Record<string, number> = {a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5, een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, halve: 0.5};
const UNITS: Record<string, 'g' | 'ml'> = {g: 'g', gr: 'g', gram: 'g', grams: 'g', grammes: 'g', ml: 'ml', milliliter: 'ml', millilitre: 'ml', milliliters: 'ml'};
/** Words that name a portion, not a food ("a slice of toast", "een kop koffie"): dropped from the food's name. */
const PORTION = /^(?:slices?|pieces?|cups?|glass(?:es)?|bowls?|plates?|handfuls?|portions?|servings?|sneetjes?|plakjes?|stukjes?|stuks?|kopjes?|kop|glazen|glas|kommen|kom|bord(?:en)?|handjes?|porties?|of|van)$/;
const fold = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
export function splitMealWords(words: string): WordsItem[] {
  return fold(words).split(/\s*(?:,|;|\+|&|\band\b|\bwith\b|\ben\b|\bmet\b|\bplus\b)\s*/).map(s => s.trim()).filter(Boolean).slice(0, 12).map(text => {
    const tokens = text.split(/\s+/);
    let count: number | null = null, unit: WordsItem['unit'] = null, i = 0;
    const lead = /^(\d+(?:[.,]\d+)?)(g|gr|ml)?$/.exec(tokens[0] ?? '');
    if (lead) { count = Number(lead[1]!.replace(',', '.')); unit = lead[2] ? UNITS[lead[2]]! : null; i = 1; }
    else if (tokens[0] && NUMBER_WORDS[tokens[0]] !== undefined) { count = NUMBER_WORDS[tokens[0]]!; i = 1; }
    if (tokens[i] && UNITS[tokens[i]!]) { unit = UNITS[tokens[i]!]!; i++; }
    const rest = tokens.slice(i).filter(t => !PORTION.test(t));
    return {text, food: rest.join(' ').trim(), count, unit};
  }).filter(item => item.food.length >= 2);
}
const singular = (w: string) => w.length > 3 && /(?:es|s|en)$/.test(w) ? w.replace(/(?:es|s|en)$/, '') : w;
const wordsOf = (s: string) => fold(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean).map(singular);
/** The person's own food for an item: the same name first, then one whose name holds every word of the item. */
export function matchOwnFood(item: WordsItem, foods: readonly HealthFood[]): HealthFood | null {
  const want = wordsOf(item.food);
  if (!want.length) return null;
  const named = foods.map(f => ({f, words: wordsOf(f.name)}));
  const same = named.find(n => n.words.join(' ') === want.join(' '));
  if (same) return same.f;
  const all = named.filter(n => want.every(w => n.words.some(x => x.startsWith(w) || w.startsWith(x)))).sort((a, b) => a.words.length - b.words.length || a.f.name.localeCompare(b.f.name));
  return all[0]?.f ?? null;
}
/** The amount an own food is logged with (thousandths of a serving): grams over its serving size, else the count. */
export function ownQuantityMilli(item: WordsItem, food: Pick<HealthFood, 'servingGrams' | 'servingMl'>): number {
  const serving = item.unit === 'g' ? food.servingGrams : item.unit === 'ml' ? food.servingMl ?? null : null;
  if (item.count !== null && item.unit && serving) return Math.max(1, Math.round(item.count / serving * 1000));
  return Math.max(1, Math.round((item.count ?? 1) * 1000));
}
