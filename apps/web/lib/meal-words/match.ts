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
/**
 * Session AV (q3 #25): dishes whose name holds "and" or "with" stay one item ("mac and cheese", not "mac" and "cheese").
 * Their joining word is held by a mark while the words are split, and put back after.
 */
const DISHES = /\b(mac(?:aroni)? and cheese|peanut butter and (?:jelly|jam)(?: sandwich)?|pb and j|fish and chips|bread and butter|sweet and sour(?: \w+)?|rice and beans|spaghetti and meatballs|salt and vinegar(?: \w+)?|chili con carne|patat met mayo|brood met kaas)\b/g;
const JOIN = '_'; // a word character, so the split's \band\b never sees the joined word
/** "a", "an", "the", "een", "de", "het" after a number ("half a sandwich", "2 of the cookies" is left to PORTION). */
const ARTICLE = /^(?:a|an|the|een|de|het)$/;
export function splitMealWords(words: string): WordsItem[] {
  const held = fold(words).replace(DISHES, dish => dish.replace(/ /g, JOIN));
  return held.split(/\s*(?:,|;|\+|&|\band\b|\bwith\b|\ben\b|\bmet\b|\bplus\b)\s*/).map(s => s.replaceAll(JOIN, ' ').trim()).filter(Boolean).slice(0, 12).map(text => {
    const tokens = text.split(/\s+/);
    let count: number | null = null, unit: WordsItem['unit'] = null, i = 0;
    const lead = /^(\d+(?:[.,]\d+)?)(g|gr|ml)?$/.exec(tokens[0] ?? '');
    if (lead) { count = Number(lead[1]!.replace(',', '.')); unit = lead[2] ? UNITS[lead[2]]! : null; i = 1; }
    else if (tokens[0] && NUMBER_WORDS[tokens[0]] !== undefined) { count = NUMBER_WORDS[tokens[0]]!; i = 1; }
    if (count !== null) while (tokens[i] && ARTICLE.test(tokens[i]!)) i++;
    if (tokens[i] && UNITS[tokens[i]!]) { unit = UNITS[tokens[i]!]!; i++; }
    const rest = tokens.slice(i).filter(t => !PORTION.test(t));
    return {text, food: rest.join(' ').trim(), count, unit};
  }).filter(item => item.food.length >= 2);
}
const singular = (w: string) => w.length > 3 && /(?:es|s|en)$/.test(w) ? w.replace(/(?:es|s|en)$/, '') : w;
const wordsOf = (s: string) => fold(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean).map(singular);
/**
 * The person's own food for an item: the same name first, then one whose name holds every word of the item as a whole
 * word (singular or plural: "eggs" is "Egg"; "eggplant" is never "Egg", nor "egg" "Eggplant").
 */
export function matchOwnFood(item: WordsItem, foods: readonly HealthFood[]): HealthFood | null {
  return ownMatch(item, foods)?.food ?? null;
}
/** Session AV (q3 #25): the own food and whether it is the same name (only that one starts ticked). */
export function ownMatch(item: WordsItem, foods: readonly HealthFood[]): {food: HealthFood; exact: boolean} | null {
  const want = wordsOf(item.food);
  if (!want.length) return null;
  const named = foods.map(f => ({f, words: wordsOf(f.name)}));
  const same = named.find(n => n.words.join(' ') === want.join(' '));
  if (same) return {food: same.f, exact: true};
  const all = named.filter(n => want.every(w => n.words.includes(w))).sort((a, b) => a.words.length - b.words.length || a.f.name.localeCompare(b.f.name));
  return all[0] ? {food: all[0].f, exact: false} : null;
}
/**
 * Session AV (q3 #25): a usual portion in grams for a count of a library food ("2 eggs" is 2 × 50 g), from the item's own
 * words; null when no usual portion is known (the person then types the grams). Rough household portions, said as such.
 */
const PORTION_GRAMS: [RegExp, number][] = [
  [/\beggs?\b|\bei\b|\beieren\b/, 50], [/\btoast\b|\bslice\b|\bboterham|\bsneetje/, 35], [/\bbread\b|\bbrood\b/, 35], [/\bbanana|\bbanaan|\bbananen/, 120],
  [/\bapple|\bappel/, 150], [/\borange|\bsinaasappel/, 130], [/\bpear\b|\bpears\b|\bpeer\b|\bperen\b/, 170], [/\bkiwi/, 75], [/\bmandarin|\bclementine/, 70],
  [/\bsandwich|\bbroodje/, 150], [/\bcroissant/, 60], [/\bbagel/, 100], [/\bmuffin/, 70], [/\bcookie|\bbiscuit|\bkoekje/, 12], [/\bcracker|\bbeschuit/, 10],
  [/\bpotato|\baardappel/, 150], [/\btomato|\btomaat|\btomaten/, 100], [/\bcarrot|\bwortel/, 60], [/\bonion|\bui\b|\buien\b/, 110],
  [/\byogh?urt\b|\byoghurt|\bkwark/, 125], [/\bpancake|\bpannenkoek/, 75], [/\bpizza/, 300], [/\bsausage|\bworst/, 60], [/\bchicken breast|\bkipfilet/, 150],
];
export function portionGrams(item: WordsItem): number | null {
  if (item.count === null || item.unit !== null) return null;
  const hit = PORTION_GRAMS.find(([re]) => re.test(item.food));
  return hit ? Math.round(item.count * hit[1]) : null;
}
/**
 * Session AV (q3 #25): the library's names for an item, best first, for a picker of 3 to 5: names that hold the item's
 * words as whole words before ones that only start with them ("toast" is not first "Toasted ham and cheese sandwich"),
 * the plain food ("raw", "plain", "boiled", "whole") before a product made of it ("nectar", "juice", "sandwich",
 * "prepacked", "dried", "powder"), the common animal before a rarer one ("duck", "quail"), then the shorter name.
 */
const PLAIN = /^(?:raw|plain|fresh|whole|boiled|cooked|natural|average|flesh|semi|skimmed)$/;
const PRODUCT = /^(?:nectar|juice|drink|smoothie|sandwich|prepacked|powder|powdered|dried|dehydrated|canned|tinned|syrup|sauce|soup|flavoured|flavored|candied|crisps|chips|substitute|infant|baby|duck|goose|quail|ostrich|pudding|cake|tart|pie|ham|cheese|liqueur|jam|spread|biscuit|bread|split|irish|fu|yung|turnover|brandy|crumble|strudel|compote|puree|fritter|muffin|liquor|wine|vinegar)$/;
/** A part of the food rather than the food ("egg yolk", "chicken skin", "rice bran"). */
const PART = /^(?:yolk|fat|bran|starch|flour|crumb|breadcrumb|groat|germ|peel|zest)$/;
/** The words to look up in the library for an item: as written, its singular ("eggs" → "egg") and a plainer name for a few; the last is the one to rank by. */
const LIBRARY_WORDS: Record<string, string> = {toast: 'bread toasted', boterham: 'bread', boterhamm: 'bread', brood: 'bread', ei: 'egg', eier: 'egg', kaas: 'cheese', melk: 'milk', koffie: 'coffee', thee: 'tea', appel: 'apple', banaan: 'banana', banan: 'banana', yogurt: 'yoghurt', kwark: 'quark', havermout: 'porridge oats', rijst: 'rice', kip: 'chicken', 'mac and cheese': 'macaroni cheese', 'macaroni and cheese': 'macaroni cheese', 'fish and chips': 'fish chips', 'peanut butter and jelly sandwich': 'peanut butter sandwich', 'peanut butter and jam sandwich': 'peanut butter sandwich'};
export function libraryQueries(item: WordsItem): string[] {
  const words = wordsOf(item.food), single = words.join(' '), plainer = LIBRARY_WORDS[fold(item.food)] ?? (words.length === 1 ? LIBRARY_WORDS[words[0]!] : undefined);
  return [...new Set([item.food, single, ...(plainer ? [plainer] : [])])].filter(q => q.length >= 2);
}
export function rankLibraryNames(food: string, names: readonly string[]): number[] {
  const want = wordsOf(food).filter(w => !/^(?:and|with|of|a|an|the|en|met)$/.test(w));
  const score = (name: string) => {
    const words = wordsOf(name);
    const whole = want.filter(w => words.includes(w)).length, first = words[0] === want[0] ? 1 : 0;
    const begun = want.filter(w => !words.includes(w) && words.some(x => x.startsWith(w))).length; // "mac" in "macaroni": half a word
    const products = words.filter(w => PRODUCT.test(w) && !want.includes(w)).length, parts = words.filter(w => PART.test(w) && !want.includes(w)).length;
    const plain = (words.some(w => PLAIN.test(w)) ? 1 : 0) + (words.includes('raw') ? 1 : 0), joined = /\b(?:with|and|made)\b/i.test(name) && !/\b(?:with|and)\b/.test(fold(food)) ? 1 : 0;
    return (want.length - whole - begun / 2) * 4 + products * 3 + parts * 2 + joined - first * 2 - plain + Math.max(0, words.length - want.length) * 0.3;
  };
  return names.map((name, i) => ({i, s: score(name)})).sort((a, b) => a.s - b.s || a.i - b.i).map(x => x.i);
}
/** The amount an own food is logged with (thousandths of a serving): grams over its serving size, else the count. */
export function ownQuantityMilli(item: WordsItem, food: Pick<HealthFood, 'servingGrams' | 'servingMl'>): number {
  const serving = item.unit === 'g' ? food.servingGrams : item.unit === 'ml' ? food.servingMl ?? null : null;
  if (item.count !== null && item.unit && serving) return Math.max(1, Math.round(item.count / serving * 1000));
  return Math.max(1, Math.round((item.count ?? 1) * 1000));
}
