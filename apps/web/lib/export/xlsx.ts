import {buildStoredZip} from './zip';
import {CSV_FORMULA_START} from './csv-safe';

/**
 * Session AV lane 2, round 5 (money; Tiller's Foundation Template, LEDGER #389): a small .xlsx writer — Office Open XML
 * (SpreadsheetML) written by hand into a ZIP through the repository's own stored-ZIP writer (lib/export/zip.ts), no
 * package. Text cells are inline strings (never shared formulas), escaped for XML, and — by the CSV guard's own rule
 * (`CSV_FORMULA_START`, lib/export/csv-safe.ts) — a text that starts like a formula (= + - @ …) gets a leading apostrophe,
 * so it stays text even when the sheet is saved again as CSV. Only the formulas this writer puts in (`{formula}` cells,
 * built from cell references by the caller) are formulas. Numbers are written as numbers. Excel, Numbers, LibreOffice and
 * Google Sheets open the result. Pure.
 */
export type XlsxCell = string | number | null | {formula: string} | {number: number; format: 'money'};
export type XlsxSheet = {name: string; rows: readonly (readonly XlsxCell[])[]; widths?: readonly number[]};
/** Text safe inside XML: no control characters XML refuses, no lone surrogates, the five specials escaped. */
export function xmlText(text: string): string {
  return text.replace(/[\0-\x08\x0b\x0c\x0e-\x1f￾￿]/g, '').replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '�')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
/** The guard's rule for a text cell: a leading apostrophe before what a spreadsheet would run as a formula. */
export const safeText = (text: string) => CSV_FORMULA_START.test(text) ? `'${text}` : text;
/** "A", "B", … "Z", "AA" for a column index from 0. */
export function columnName(index: number): string {
  let n = index + 1, out = '';
  while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26); }
  return out;
}
export const cellRef = (column: number, row: number) => `${columnName(column)}${row + 1}`;
/** A sheet name Excel takes: at most 31 characters, none of : \ / ? * [ ], not empty, unique. */
export function sheetName(name: string, taken: ReadonlySet<string>): string {
  const base = (name.replace(/[:\\/?*[\]]/g, ' ').trim() || 'Sheet').slice(0, 31);
  let out = base, k = 2;
  while (taken.has(out.toLowerCase())) out = `${base.slice(0, 28)} ${k++}`;
  return out;
}
function cellXml(cell: XlsxCell, ref: string, header: boolean): string {
  if (cell === null || cell === '') return '';
  const style = header ? ' s="1"' : '';
  if (typeof cell === 'number') return Number.isFinite(cell) ? `<c r="${ref}"${style}><v>${cell}</v></c>` : '';
  if (typeof cell === 'string') return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xmlText(safeText(cell))}</t></is></c>`;
  if ('formula' in cell) return `<c r="${ref}" s="2"><f>${xmlText(cell.formula)}</f></c>`;
  return Number.isFinite(cell.number) ? `<c r="${ref}" s="2"><v>${cell.number}</v></c>` : '';
}
function sheetXml(sheet: XlsxSheet): string {
  const cols = sheet.widths?.length ? `<cols>${sheet.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const rows = sheet.rows.map((row, r) => `<row r="${r + 1}">${row.map((c, i) => cellXml(c, cellRef(i, r), r === 0)).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${rows}</sheetData></worksheet>`;
}
const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>';
/** The workbook's bytes: one worksheet per sheet, in order; the first row of each is its header (bold, frozen). */
export function buildXlsx(sheets: readonly XlsxSheet[], modified: Date): Uint8Array {
  if (!sheets.length) throw new Error('A workbook needs at least one sheet.');
  const taken = new Set<string>(), names = sheets.map(s => { const n = sheetName(s.name, taken); taken.add(n.toLowerCase()); return n; });
  const files: {name: string; data: string}[] = [
    {name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`},
    {name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
    {name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${names.map((n, i) => `<sheet name="${xmlText(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><calcPr calcId="0" fullCalcOnLoad="1"/></workbook>`},
    {name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {name: 'xl/styles.xml', data: STYLES},
    ...sheets.map((s, i) => ({name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s)})),
  ];
  return buildStoredZip(files.map(f => ({...f, modified})));
}
export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
