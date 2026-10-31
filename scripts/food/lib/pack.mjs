// Session AK Part 1c: the compact per-source JSON the app loads (apps/web/public/food-generic/<source>-v1.json).
//
// {schemaVersion:1, source, name, licence, licenceUrl, attribution, notice, link, datasetVersion, columns:[…], foods:[[…]]}
//
// Each food is one array in `columns` order: id (string), nameEn (string), aliases (string[]: French or Finnish names),
// then the nutrients per 100 g edible portion, each in the unit its column names (kcal, mg or µg). Unknown is null, never
// 0: a missing value, a trace, a value given as "less than" and a value in a unit the build does not expect are unknown.
// Trailing unknowns are left off a row (the app pads it). Precision: kcal whole; the gram nutrients (protein, carbs,
// fat, fibre, sugars, saturated fat, omega-3) whole mg after rounding to 3 significant figures; every other value
// 3 significant figures.
export const SCHEMA_VERSION = 1;
export const NUTRIENT_COLUMNS = /** @type {const} */ (['kcal', 'proteinMg', 'carbsMg', 'fatMg', 'fiberMg', 'sugarMg', 'satFatMg', 'sodiumMg', 'potassiumMg', 'calciumMg', 'ironMg', 'magnesiumMg', 'zincMg', 'vitAUg', 'vitCMg', 'vitDUg', 'vitEMg', 'vitKUg', 'b1Mg', 'b2Mg', 'b3Mg', 'b6Mg', 'b12Ug', 'folateUg', 'omega3Mg']);
export const COLUMNS = ['id', 'nameEn', 'aliases', ...NUTRIENT_COLUMNS];
/** @typedef {typeof NUTRIENT_COLUMNS[number]} NutrientColumn */
/** @typedef {{id:string,nameEn:string,aliases:string[],values:Partial<Record<NutrientColumn,number|null>>}} Food */
const WHOLE_MG = new Set(['proteinMg', 'carbsMg', 'fatMg', 'fiberMg', 'sugarMg', 'satFatMg', 'omega3Mg']);
// The most 100 g can hold, per column (in the column's unit); anything above is a data error and becomes unknown.
const MAX = {kcal: 1000, ...Object.fromEntries([...WHOLE_MG].map(c => [c, 100_000])), sodiumMg: 100_000, potassiumMg: 100_000, calciumMg: 100_000, ironMg: 100_000, magnesiumMg: 100_000, zincMg: 100_000, vitCMg: 100_000, vitEMg: 100_000, b1Mg: 100_000, b2Mg: 100_000, b3Mg: 100_000, b6Mg: 100_000, vitAUg: 100_000_000, vitDUg: 100_000_000, vitKUg: 100_000_000, b12Ug: 100_000_000, folateUg: 100_000_000};
/** 3 significant figures, as a plain number. @param {number} x */
export const sig3 = x => x === 0 ? 0 : Number(x.toPrecision(3));
/** A value in a column's unit, rounded by the column's rule, or null when unknown or implausible. @param {NutrientColumn} column @param {number|null|undefined} x */
export function rounded(column, x) {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > MAX[column]) return null;
  if (column === 'kcal') return Math.round(x);
  return WHOLE_MG.has(column) ? Math.round(sig3(x)) : sig3(x);
}
/** A name as shown: NFC, no control characters, single spaces, at most 160 characters. @param {unknown} s */
export const cleanName = s => typeof s === 'string' ? s.normalize('NFC').replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) : '';
/** Builds the JSON object for one source. Foods without an English name are left out (and counted).
 * @param {{source:string,name:string,licence:string,licenceUrl:string,attribution:string,notice:string,link:string,datasetVersion:string}} about
 * @param {Food[]} foods */
export function pack(about, foods) {
  const seen = new Set(), rows = [];
  let skipped = 0;
  for (const food of foods) {
    const id = String(food.id).trim(), nameEn = cleanName(food.nameEn);
    if (!id || !nameEn || seen.has(id)) { skipped++; continue; }
    seen.add(id);
    const aliases = [...new Set(food.aliases.map(cleanName).filter(a => a && a.toLowerCase() !== nameEn.toLowerCase()))];
    const row = [id, nameEn, aliases, ...NUTRIENT_COLUMNS.map(c => rounded(c, food.values[c]))];
    while (row.length > 3 && row[row.length - 1] === null) row.pop();
    rows.push(row);
  }
  return {json: {schemaVersion: SCHEMA_VERSION, ...about, columns: COLUMNS, foods: rows}, skipped};
}
/** One food per line, so a diff of a new dataset version stays readable; the rest on one line. @param {{foods:unknown[]}} json */
export function serialise(json) {
  // `{…,"foods":[]}` without its closing `]}`, then one food per line.
  const {foods, ...head} = json, start = JSON.stringify({...head, foods: []}).slice(0, -2);
  return start + '\n' + foods.map(f => JSON.stringify(f)).join(',\n') + '\n]}\n';
}
/** Parses a decimal written with a point or a comma; anything else (traces, "<", "-", "N", blanks) is null. @param {unknown} v */
export function decimal(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return /^\d+(?:[.,]\d+)?$/.test(t) ? Number(t.replace(',', '.')) : null;
}
