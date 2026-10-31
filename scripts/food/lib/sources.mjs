// Session AK Part 1c: the three generic-food sources, each from its official file, into pack.mjs's food rows.
// Every mapping names the source's own code for the nutrient and the unit the build expects; a source file whose unit
// differs from that is refused rather than converted by a guess. Values are per 100 g edible portion in all three.
import {assertPlainXml, decodeXml, utf8} from './xml.mjs';
import {openXlsx} from './xlsx.mjs';
import {listZip, entryStream} from '../../../apps/web/lib/import/zip-stream.ts';
import {cleanName, decimal} from './pack.mjs';

/** @typedef {import('./pack.mjs').Food} Food @typedef {import('./pack.mjs').NutrientColumn} NutrientColumn */
/** @typedef {{foods:Food[],notes:string[]}} SourceRows */
// Conversion of a value in `from` to the column's unit.
const UNIT = {g: 1000, mg: 1, ug: 0.001};
/** Factor from a unit to a column's unit (mg or µg columns; kcal handled apart), or null. @param {string} from @param {NutrientColumn} column */
function factor(from, column) {
  const unit = from.toLowerCase().replace('µ', 'u').replace('μ', 'u');
  if (!(unit in UNIT)) return null;
  const to = column.endsWith('Ug') ? 'ug' : 'mg';
  return UNIT[/** @type {'g'|'mg'|'ug'} */(unit)] / UNIT[to];
}

// ── CIQUAL (ANSES): alim_*.xml (names), compo_*.xml (values), const_*.xml (constituent names with units) ─────────────
// const_code → column and the unit the constituent's English name must state.
/** @type {[string,NutrientColumn,string][]} */
export const CIQUAL_MAP = [
  ['328', 'kcal', 'kcal'], ['25000', 'proteinMg', 'g'], ['31000', 'carbsMg', 'g'], ['40000', 'fatMg', 'g'], ['34100', 'fiberMg', 'g'], ['32000', 'sugarMg', 'g'], ['40302', 'satFatMg', 'g'],
  ['10110', 'sodiumMg', 'mg'], ['10190', 'potassiumMg', 'mg'], ['10200', 'calciumMg', 'mg'], ['10260', 'ironMg', 'mg'], ['10120', 'magnesiumMg', 'mg'], ['10300', 'zincMg', 'mg'],
  ['51104', 'vitAUg', 'µg'], ['55100', 'vitCMg', 'mg'], ['52100', 'vitDUg', 'µg'], ['53100', 'vitEMg', 'mg'], ['54101', 'vitKUg', 'µg'],
  ['56100', 'b1Mg', 'mg'], ['56200', 'b2Mg', 'mg'], ['56310', 'b3Mg', 'mg'], ['56500', 'b6Mg', 'mg'], ['56600', 'b12Ug', 'µg'], ['56700', 'folateUg', 'µg'],
];
// Omega-3: CIQUAL has no total, so ALA + EPA + DHA, known only when all three are known.
export const CIQUAL_OMEGA3 = ['41833', '42053', '42263'];
// Vitamin E: "Vitamin E" (53100) where given, else "Alpha-tocopherol (vitamine E)" (71010), both mg; the 2025 table gives
// the second for far more foods.
export const CIQUAL_VITAMIN_E_ALPHA = '71010';
/** Fields of one record: `<tag> value </tag>` → value (decoded, trimmed); a self-closing or missing tag is absent. @param {string} body */
function fields(body) {
  /** @type {Record<string,string>} */
  const out = {};
  for (const m of body.matchAll(/<([A-Za-z_][\w]*)(?:\s[^>]*)?>([^<]*)<\/\1>/g)) out[/** @type {string} */(m[1])] = decodeXml(/** @type {string} */(m[2])).trim();
  return out;
}
/** Each <tag>…</tag> record's fields. @param {string} text @param {string} tag @param {string} name */
function records(text, tag, name) {
  assertPlainXml(text, name);
  return [...text.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map(m => fields(/** @type {string} */(m[1])));
}
/** The unit a CIQUAL constituent name states, such as "Protein (g/100g)" → g. The 2025 table spells vitamin A's as
 * "(µg/100mg)", a typo for 100 g (its values are retinol equivalents per 100 g), so only the part before the slash counts. @param {string} name */
const ciqualUnit = name => /\((kcal|kJ|g|mg|µg)\/\s*100\s*m?g\)/.exec(name)?.[1] ?? null;
/** CIQUAL's value: "-" missing, "traces", "< 0,5" and blanks are unknown (null); "12,3" is 12.3. @param {string|undefined} v */
export const ciqualValue = v => v === undefined ? null : decimal(v);
/** @param {{alim:Uint8Array,compo:Uint8Array,constituents:Uint8Array}} files @returns {SourceRows} */
export function readCiqual(files) {
  const constituents = new Map(records(utf8(files.constituents), 'CONST', 'const').map(r => [r.const_code ?? '', r.const_nom_eng ?? '']));
  for (const [code, column, unit] of CIQUAL_MAP) {
    const name = constituents.get(code);
    if (name === undefined) throw Error(`CIQUAL: constituent ${code} (${column}) is missing from the const file.`);
    if (ciqualUnit(name) !== unit) throw Error(`CIQUAL: constituent ${code} "${name}" is not in ${unit}.`);
  }
  for (const code of CIQUAL_OMEGA3) if (ciqualUnit(constituents.get(code) ?? '') !== 'g') throw Error(`CIQUAL: fatty acid ${code} is not in g.`);
  if (ciqualUnit(constituents.get(CIQUAL_VITAMIN_E_ALPHA) ?? '') !== 'mg') throw Error(`CIQUAL: constituent ${CIQUAL_VITAMIN_E_ALPHA} is not in mg.`);
  const wanted = new Map(CIQUAL_MAP.map(([code, column, unit]) => [code, {column, scale: unit === 'g' ? 1000 : 1}]));
  /** @type {Map<string,Map<string,number|null>>} */
  const values = new Map();
  for (const r of records(utf8(files.compo), 'COMPO', 'compo')) {
    const food = r.alim_code ?? '', code = r.const_code ?? '';
    if (!wanted.has(code) && !CIQUAL_OMEGA3.includes(code) && code !== CIQUAL_VITAMIN_E_ALPHA) continue;
    let row = values.get(food); if (!row) values.set(food, row = new Map());
    row.set(code, ciqualValue(r.teneur));
  }
  /** @type {Food[]} */
  const foods = [];
  for (const r of records(utf8(files.alim), 'ALIM', 'alim')) {
    const id = r.alim_code ?? '', row = values.get(id) ?? new Map();
    /** @type {Food['values']} */
    const out = {};
    for (const [code, {column, scale}] of wanted) { const v = row.get(code); out[column] = v === null || v === undefined ? null : v * scale; }
    out.vitEMg ??= row.get(CIQUAL_VITAMIN_E_ALPHA) ?? null;
    const fa = CIQUAL_OMEGA3.map(code => row.get(code));
    out.omega3Mg = fa.every(v => typeof v === 'number') ? /** @type {number[]} */(fa).reduce((a, b) => a + b, 0) * 1000 : null;
    foods.push({id, nameEn: r.alim_nom_eng ?? '', aliases: [r.alim_nom_fr ?? ''], values: out});
  }
  return {foods, notes: ['Energy: Regulation (EU) 1169/2011 kcal (const 328). Omega-3: ALA + EPA + DHA when all three are known. Vitamin E: 53100, else alpha-tocopherol 71010.', 'Traces, "less than" values and "-" are unknown.']};
}

// ── CoFID (PHE): the 2021 integrated dataset workbook ────────────────────────────────────────────────────────────────
// Sheet, column code (the workbook's second header row) → column, and the unit its first header row must state.
/** @type {[string,string,NutrientColumn,string][]} */
export const COFID_MAP = [
  ['1.3 Proximates', 'KCALS', 'kcal', 'kcal'], ['1.3 Proximates', 'PROT', 'proteinMg', 'g'], ['1.3 Proximates', 'CHO', 'carbsMg', 'g'], ['1.3 Proximates', 'FAT', 'fatMg', 'g'],
  ['1.3 Proximates', 'AOACFIB', 'fiberMg', 'g'], ['1.3 Proximates', 'TOTSUG', 'sugarMg', 'g'], ['1.3 Proximates', 'SATFOD', 'satFatMg', 'g'], ['1.3 Proximates', 'TOTn3PFOD', 'omega3Mg', 'g'],
  ['1.4 Inorganics', 'NA', 'sodiumMg', 'mg'], ['1.4 Inorganics', 'K', 'potassiumMg', 'mg'], ['1.4 Inorganics', 'CA', 'calciumMg', 'mg'], ['1.4 Inorganics', 'FE', 'ironMg', 'mg'], ['1.4 Inorganics', 'MG', 'magnesiumMg', 'mg'], ['1.4 Inorganics', 'ZN', 'zincMg', 'mg'],
  ['1.5 Vitamins', 'RETEQU', 'vitAUg', 'µg'], ['1.5 Vitamins', 'VITC', 'vitCMg', 'mg'], ['1.5 Vitamins', 'VITD', 'vitDUg', 'µg'], ['1.5 Vitamins', 'VITE', 'vitEMg', 'mg'], ['1.5 Vitamins', 'VITK1', 'vitKUg', 'µg'],
  ['1.5 Vitamins', 'THIA', 'b1Mg', 'mg'], ['1.5 Vitamins', 'RIBO', 'b2Mg', 'mg'], ['1.5 Vitamins', 'NIAC', 'b3Mg', 'mg'], ['1.5 Vitamins', 'VITB6', 'b6Mg', 'mg'], ['1.5 Vitamins', 'VITB12', 'b12Ug', 'µg'], ['1.5 Vitamins', 'FOLT', 'folateUg', 'µg'],
];
// Fibre: AOAC fibre where CoFID gives it, else unknown. CoFID's older non-starch polysaccharide (Englyst) figure measures
// less than AOAC and is not used as a stand-in.
const COFID_CODE = /^[0-9A-Z]{1,4}-[0-9A-Z]{1,5}$/;
/** @param {Uint8Array} workbook @returns {Promise<SourceRows>} */
export async function readCofid(workbook) {
  const wb = await openXlsx(workbook), sheets = [...new Set(COFID_MAP.map(([s]) => s))];
  /** @type {Map<string,{name:string,group:string,values:Food['values']}>} */
  const foods = new Map();
  for (const sheet of sheets) {
    const rows = await wb.rows(sheet), header = rows[0] ?? [], codes = rows[1] ?? [];
    if (String(header[1] ?? '').trim() !== 'Food Name' || String(header[3] ?? '').trim() !== 'Group') throw Error(`CoFID: "${sheet}" does not start with Food Code, Food Name, Description, Group.`);
    const columns = COFID_MAP.filter(([s]) => s === sheet).map(([, code, column, unit]) => {
      const at = codes.findIndex(c => c === code);
      if (at < 0) throw Error(`CoFID: "${sheet}" has no ${code} column.`);
      const label = String(header[at] ?? '');
      if (!label.endsWith(`(${unit})`)) throw Error(`CoFID: "${sheet}" ${code} "${label}" is not in ${unit}.`);
      return {at, column, scale: unit === 'g' ? 1000 : 1};
    });
    for (const row of rows.slice(3)) {
      const id = typeof row[0] === 'string' ? row[0].trim() : '';
      if (!COFID_CODE.test(id)) continue;
      let food = foods.get(id);
      if (!food) foods.set(id, food = {name: String(row[1] ?? ''), group: String(row[3] ?? '').trim(), values: {}});
      else if (food.name !== String(row[1] ?? '')) continue; // a repeated code naming another food: the first is kept
      for (const {at, column, scale} of columns) { const v = decimal(row[at]); food.values[column] ??= v === null ? null : v * scale; }
    }
  }
  // Alcoholic drinks (group Q…) are given per 100 ml, not per 100 g: left out rather than mislabelled.
  const kept = [...foods].filter(([, f]) => !f.group.startsWith('Q'));
  return {foods: kept.map(([id, f]) => ({id, nameEn: f.name, aliases: [], values: f.values})), notes: [`${foods.size - kept.length} alcoholic drinks (per 100 ml) left out.`, 'Fibre is AOAC fibre; "Tr" and "N" are unknown.']};
}

// ── Fineli (THL): the open-data zip of semicolon-separated CSV files ─────────────────────────────────────────────────
// EuroFIR component code → column. The unit comes from component.csv (COMPUNIT) and is converted, never assumed.
/** @type {[string,NutrientColumn][]} */
export const FINELI_MAP = [
  ['ENERC', 'kcal'], ['PROT', 'proteinMg'], ['CHOAVL', 'carbsMg'], ['FAT', 'fatMg'], ['FIBC', 'fiberMg'], ['SUGAR', 'sugarMg'], ['FASAT', 'satFatMg'],
  ['NA', 'sodiumMg'], ['K', 'potassiumMg'], ['CA', 'calciumMg'], ['FE', 'ironMg'], ['MG', 'magnesiumMg'], ['ZN', 'zincMg'],
  ['VITA', 'vitAUg'], ['VITC', 'vitCMg'], ['VITD', 'vitDUg'], ['VITE', 'vitEMg'], ['VITK', 'vitKUg'],
  ['THIA', 'b1Mg'], ['RIBF', 'b2Mg'], ['NIA', 'b3Mg'], ['VITPYRID', 'b6Mg'], ['VITB12', 'b12Ug'], ['FOL', 'folateUg'], ['FAPUN3', 'omega3Mg'],
];
/** Text of a CSV file: strict UTF-8, else Windows-1252 (Fineli's older files). @param {Uint8Array} bytes */
export function csvText(bytes) {
  try { return utf8(bytes); } catch { return new TextDecoder('windows-1252').decode(bytes); }
}
/** A small CSV reader: `;` (or `,` when the header has no `;`), double quotes with "" inside, CRLF or LF. @param {string} text */
export function parseCsv(text) {
  const first = text.slice(0, text.search(/\r?\n|$/)), sep = first.includes(';') ? ';' : ',';
  /** @type {string[][]} */
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += ch; continue; }
    if (ch === '"' && cell === '') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [head = [], ...body] = rows.filter(r => r.length > 1 || r[0] !== '');
  return body.map(r => Object.fromEntries(head.map((h, i) => [h.trim().toUpperCase(), (r[i] ?? '').trim()])));
}
/** The CSV files inside a Fineli zip, by lower-case base name. @param {Uint8Array} zip */
export async function fineliZipFiles(zip) {
  const blob = new Blob([zip]), out = new Map();
  for (const entry of await listZip(blob)) {
    const base = entry.name.split('/').pop()?.toLowerCase() ?? '';
    if (!base.endsWith('.csv') || entry.uncompressed > 64 * 1024 * 1024) continue;
    out.set(base, new Uint8Array(await new Response(await entryStream(blob, entry)).arrayBuffer()));
  }
  return out;
}
/** @param {Map<string,Uint8Array>} files by lower-case base name @returns {SourceRows} */
export function readFineli(files) {
  const need = /** @param {string} name */ name => { const f = files.get(name); if (!f) throw Error(`Fineli: ${name} is missing.`); return parseCsv(csvText(f)); };
  const units = new Map(need('component.csv').map(r => [r.EUFDNAME ?? '', (r.COMPUNIT ?? '').toLowerCase()]));
  /** @type {Map<string,{column:NutrientColumn,scale:number}>} */
  const wanted = new Map();
  for (const [code, column] of FINELI_MAP) {
    const unit = units.get(code);
    if (unit === undefined) throw Error(`Fineli: component ${code} (${column}) is missing from component.csv.`);
    const scale = column === 'kcal' ? (unit === 'kj' ? 1 / 4.184 : unit === 'kcal' ? 1 : null) : factor(unit, column);
    if (scale === null) throw Error(`Fineli: component ${code} is in "${unit}", which the build does not convert.`);
    wanted.set(code, {column, scale});
  }
  /** @type {Map<string,Food['values']>} */
  const values = new Map();
  for (const r of need('component_value.csv')) {
    const hit = wanted.get(r.EUFDNAME ?? ''); if (!hit) continue;
    const id = r.FOODID ?? '', v = decimal(r.BESTLOC);
    let row = values.get(id); if (!row) values.set(id, row = {});
    row[hit.column] ??= v === null ? null : v * hit.scale;
  }
  const names = /** @param {string} file */ file => files.has(file) ? new Map(need(file).map(r => [r.FOODID ?? '', cleanName(r.FOODNAME)])) : new Map();
  const english = names('foodname_en.csv'), finnish = files.has('foodname_fi.csv') ? names('foodname_fi.csv') : new Map(need('food.csv').map(r => [r.FOODID ?? '', cleanName(r.FOODNAME)]));
  const foods = need('food.csv').map(r => { const id = r.FOODID ?? ''; return {id, nameEn: english.get(id) ?? '', aliases: [finnish.get(id) ?? ''], values: values.get(id) ?? {}}; });
  return {foods, notes: ['Energy from ENERC (kJ ÷ 4.184 when given in kJ). Units from component.csv.']};
}
