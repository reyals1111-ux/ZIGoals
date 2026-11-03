import type {Nutrition} from '../health';
import type {Vitamins} from '../health-vitamins/schema';
import type {GenericSourceEntry} from './catalog';
import {GENERIC_COLUMNS, loadGenericLibrary, type GenericNutrientColumn, type GenericSourceFile, type LoadedGenericSource, type SourceLoaderOptions} from './load';

/**
 * Session AK (Part 1c): search in the offline generic-food library (CIQUAL, CoFID, Fineli), on this device only — the
 * typed words never leave it. Accent-insensitive token search over the English names and the aliases (French, Finnish).
 * Ranking: exact name > name starts with the words > every word starts a word of the name > every word inside the name;
 * at the same level an English name before an alias, then the shorter name. Foods with the same English name (after
 * normalising) are one result that shows every source. Values are per 100 g edible portion in the app's units:
 * `nutrients` fits the app's nutrition (whole kcal and mg, an unknown optional nutrient absent, an unknown energy or macro
 * null), `vitamins` the app's vitamin record (thousandths of the unit), `more` the other values in mg. Unknown is never 0.
 */
export type GenericMatch = 'exact' | 'prefix' | 'word-prefix' | 'substring';
const MATCHES: GenericMatch[] = ['exact', 'prefix', 'word-prefix', 'substring'];
export type GenericFoodMore = Partial<Record<'magnesiumMg' | 'zincMg' | 'b1Mg' | 'b2Mg' | 'b3Mg' | 'b6Mg' | 'omega3Mg', number>>;
export type GenericFoodEntry = {
  source: GenericSourceEntry['source']; sourceName: string; id: string; name: string; aliases: string[]; basis: 'per-100g';
  nutrients: Nutrition; vitamins: Vitamins; more: GenericFoodMore;
  attribution: string; licence: string; licenceUrl: string; link: string; notice: string; datasetVersion: string;
};
export type GenericFoodResult = {key: string; name: string; match: GenericMatch; matchedAlias: string | null; entries: GenericFoodEntry[]};

/** Lower case, accents and punctuation removed, single spaces: "Crème Brûlée!" → "creme brulee". */
export function normaliseFoodText(text: string) {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
type Prepared = {row: GenericSourceFile['foods'][number]; names: {text: string; words: string[]; alias: boolean}[]; key: string};
const prepared = new WeakMap<GenericSourceFile, Prepared[]>();
function prepare(file: GenericSourceFile): Prepared[] {
  let rows = prepared.get(file);
  if (!rows) {
    rows = file.foods.map(row => {
      const names = [row[1], ...row[2]].map((name, i) => { const text = normaliseFoodText(name); return {text, words: text.split(' '), alias: i > 0}; }).filter(n => n.text);
      return {row, names, key: normaliseFoodText(row[1])};
    });
    prepared.set(file, rows);
  }
  return rows;
}
/** The best match of one food: its level (0 best) and whether an alias gave it, or null. */
function matchOf(food: Prepared, q: string, tokens: string[]) {
  let best: {level: number; alias: boolean; name: string} | null = null;
  for (const n of food.names) {
    const level = n.text === q ? 0 : n.text.startsWith(q) ? 1 : tokens.every(t => n.words.some(w => w.startsWith(t))) ? 2 : tokens.every(t => n.text.includes(t)) ? 3 : -1;
    if (level < 0) continue;
    if (!best || level < best.level || (level === best.level && best.alias && !n.alias)) best = {level, alias: n.alias, name: n.text};
  }
  return best;
}
const column = (c: GenericNutrientColumn) => GENERIC_COLUMNS.indexOf(c);
/** One food's values in the app's units. */
export function entryOf(file: GenericSourceFile, entry: GenericSourceEntry, row: GenericSourceFile['foods'][number]): GenericFoodEntry {
  const v = (c: GenericNutrientColumn) => { const x = row[column(c)]; return typeof x === 'number' ? x : null; };
  const whole = (c: GenericNutrientColumn) => { const x = v(c); return x === null ? null : Math.round(x); };
  const optional = <K extends string>(pairs: [K, number | null][]) => Object.fromEntries(pairs.filter((p): p is [K, number] => p[1] !== null)) as Partial<Record<K, number>>;
  const nutrients: Nutrition = {kcal: whole('kcal'), proteinMg: whole('proteinMg'), carbsMg: whole('carbsMg'), fatMg: whole('fatMg'),
    ...optional([['fiberMg', whole('fiberMg')], ['sugarMg', whole('sugarMg')], ['saturatedFatMg', whole('satFatMg')], ['sodiumMg', whole('sodiumMg')], ['potassiumMg', whole('potassiumMg')], ['calciumMg', whole('calciumMg')], ['ironMg', whole('ironMg')]])};
  const thousandths = (c: GenericNutrientColumn) => { const x = v(c); return x === null ? null : Math.round(x * 1000); };
  const vitamins: Vitamins = optional([['aUg', thousandths('vitAUg')], ['cMg', thousandths('vitCMg')], ['dUg', thousandths('vitDUg')], ['eMg', thousandths('vitEMg')], ['kUg', thousandths('vitKUg')], ['b12Ug', thousandths('b12Ug')], ['folateUg', thousandths('folateUg')]]);
  const more: GenericFoodMore = optional([['magnesiumMg', v('magnesiumMg')], ['zincMg', v('zincMg')], ['b1Mg', v('b1Mg')], ['b2Mg', v('b2Mg')], ['b3Mg', v('b3Mg')], ['b6Mg', v('b6Mg')], ['omega3Mg', v('omega3Mg')]]);
  return {source: entry.source, sourceName: entry.name, id: row[0], name: row[1], aliases: row[2], basis: 'per-100g', nutrients, vitamins, more,
    attribution: entry.attribution, licence: entry.licence, licenceUrl: entry.licenceUrl, link: entry.link, notice: entry.notice, datasetVersion: entry.datasetVersion};
}
/** Searches the loaded sources (in catalog order). Fewer than 2 letters or digits find nothing. */
export function searchGenericFoods(query: string, sources: LoadedGenericSource[], limit = 20): GenericFoodResult[] {
  const q = normaliseFoodText(query.slice(0, 60)), tokens = q.split(' ').filter(Boolean);
  if (q.replace(/ /g, '').length < 2) return [];
  const groups = new Map<string, {level: number; alias: boolean; matched: string; name: string; entries: GenericFoodEntry[]}>();
  for (const {entry, file} of sources) {
    for (const food of prepare(file)) {
      const m = matchOf(food, q, tokens); if (!m) continue;
      const group = groups.get(food.key), result = entryOf(file, entry, food.row);
      if (!group) { groups.set(food.key, {level: m.level, alias: m.alias, matched: m.name, name: food.row[1], entries: [result]}); continue; }
      group.entries.push(result);
      if (m.level < group.level || (m.level === group.level && group.alias && !m.alias)) Object.assign(group, {level: m.level, alias: m.alias, matched: m.name});
    }
  }
  return [...groups].sort(([ka, a], [kb, b]) => a.level - b.level || Number(a.alias) - Number(b.alias) || ka.length - kb.length || (ka < kb ? -1 : ka > kb ? 1 : 0)).slice(0, Math.max(0, limit))
    .map(([key, g]) => ({key, name: g.name, match: MATCHES[g.level]!, matchedAlias: g.alias ? g.entries.flatMap(e => e.aliases).find(a => normaliseFoodText(a) === g.matched) ?? null : null, entries: g.entries}));
}
/** Loads the library on first use (catalog, then each source) and searches it. `failed` names sources that could not load. */
export async function searchGenericLibrary(query: string, options: SourceLoaderOptions & {limit?: number} = {}) {
  const {sources, failed} = await loadGenericLibrary(options);
  return {results: searchGenericFoods(query, sources, options.limit), failed};
}
