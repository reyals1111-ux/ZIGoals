// Session AK Part 1c: a minimal XLSX reader for the CoFID workbook, without a dependency. The ZIP container is read with the
// app's own reader (apps/web/lib/import/zip-stream.ts: central directory, deflate through DecompressionStream, CRC-32
// checked); the workbook, its relationships, the shared strings and one worksheet are read with the strict rules in
// xml.mjs (no DTD, no entity declarations). Only cell values are read: shared strings, inline strings, plain strings,
// numbers and booleans. Formulas give their cached value. Styles, dates and merged cells are ignored.
import {listZip, entryText} from '../../../apps/web/lib/import/zip-stream.ts';
import {assertPlainXml, attr, decodeXml, noBom} from './xml.mjs';

export const XLSX_LIMITS = {file: 64 * 1024 * 1024, entry: 48 * 1024 * 1024, entries: 400, strings: 500_000, rows: 50_000, columns: 2_000};

/** Column letters to a zero-based index: A → 0, Z → 25, AA → 26. @param {string} letters */
export function columnIndex(letters) {
  if (!/^[A-Z]{1,3}$/.test(letters)) throw Error(`Bad cell reference ${letters}.`);
  let n = 0; for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1;
}
/** The text of a <si> or <is> element: every <t> inside it, in order (rich text runs joined). @param {string} inner */
const runText = inner => [...inner.matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>|<t(?:\s[^>]*)?\/>/g)].map(m => decodeXml(m[1] ?? '')).join('');

/** Opens a workbook from its bytes. @param {Uint8Array} bytes @param {Partial<typeof XLSX_LIMITS>} [limits] */
export async function openXlsx(bytes, limits = {}) {
  const L = {...XLSX_LIMITS, ...limits};
  if (bytes.byteLength > L.file) throw Error('The workbook is larger than the build reads.');
  const blob = new Blob([bytes]), entries = await listZip(blob);
  if (entries.length > L.entries) throw Error('The workbook has too many parts.');
  const byName = new Map(entries.map(e => [e.name, e]));
  /** One part as checked XML text. @param {string} name */
  const part = async name => {
    const entry = byName.get(name); if (!entry) throw Error(`The workbook has no ${name}.`);
    if (entry.uncompressed > L.entry) throw Error(`${name} is larger than the build reads.`);
    const text = noBom(await entryText(blob, entry, L.entry)); assertPlainXml(text, name); return text;
  };
  const workbook = await part('xl/workbook.xml'), rels = await part('xl/_rels/workbook.xml.rels');
  /** @type {Map<string,string>} */
  const targets = new Map();
  for (const m of rels.matchAll(/<Relationship\s([^>]*?)\/?>/g)) { const id = attr(m[1], 'Id'), target = attr(m[1], 'Target'); if (id && target) targets.set(id, target); }
  /** @type {Map<string,string>} sheet name → part path */
  const sheets = new Map();
  for (const m of workbook.matchAll(/<sheet\s([^>]*?)\/?>/g)) {
    const name = attr(m[1], 'name'), id = attr(m[1], 'r:id'), target = id ? targets.get(id) : undefined;
    if (!name || !target) continue;
    const path = target.startsWith('/') ? target.slice(1) : 'xl/' + target;
    if (!/^xl\/worksheets\/[A-Za-z0-9_]+\.xml$/.test(path)) throw Error(`Unexpected worksheet path ${target}.`);
    sheets.set(name, path);
  }
  /** @type {string[]} */
  let strings = [];
  if (byName.has('xl/sharedStrings.xml')) {
    const text = await part('xl/sharedStrings.xml');
    strings = [...text.matchAll(/<si>([\s\S]*?)<\/si>|<si\/>/g)].map(m => runText(m[1] ?? ''));
    if (strings.length > L.strings) throw Error('The workbook has too many strings.');
  }
  return {
    sheetNames: () => [...sheets.keys()],
    /** Every row of a sheet as an array of cell values (string, number, boolean or null), with blank rows kept as []
     * up to the last row, so row numbers stay the sheet's own (row 1 is index 0). @param {string} name */
    async rows(name) {
      const path = sheets.get(name); if (!path) throw Error(`The workbook has no sheet "${name}".`);
      const text = await part(path), sheetData = /<sheetData>([\s\S]*)<\/sheetData>|<sheetData\/>/.exec(text)?.[1] ?? '';
      /** @type {(string|number|boolean|null)[][]} */
      const out = [];
      for (const row of sheetData.matchAll(/<row\s([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
        const r = Number(attr(row[1], 'r')); if (!Number.isSafeInteger(r) || r < 1 || r > L.rows) throw Error(`Bad or too many rows in ${name}.`);
        /** @type {(string|number|boolean|null)[]} */
        const cells = [];
        for (const cell of (row[2] ?? '').matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
          const ref = attr(cell[1], 'r') ?? '', type = attr(cell[1], 't') ?? 'n', inner = cell[2] ?? '';
          const col = columnIndex(/^([A-Z]+)\d+$/.exec(ref)?.[1] ?? '');
          if (col >= L.columns) throw Error(`Too many columns in ${name}.`);
          const v = /<v>([^<]*)<\/v>/.exec(inner)?.[1];
          let value = null;
          if (type === 's') { const i = Number(v); if (!Number.isSafeInteger(i) || i < 0 || i >= strings.length) throw Error(`Bad shared string in ${name}!${ref}.`); value = strings[i]; }
          else if (type === 'inlineStr') value = runText(/<is>([\s\S]*?)<\/is>/.exec(inner)?.[1] ?? '');
          else if (type === 'str' || type === 'e') value = v === undefined ? null : decodeXml(v);
          else if (type === 'b') value = v === '1';
          else if (v !== undefined) { const n = Number(v); value = Number.isFinite(n) ? n : null; }
          while (cells.length < col) cells.push(null);
          cells[col] = value;
        }
        while (out.length < r - 1) out.push([]);
        out[r - 1] = cells;
      }
      return out;
    },
  };
}
