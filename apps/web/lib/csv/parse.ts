/**
 * An RFC 4180-style CSV reader for files people bring from other apps (Session P, PR 3, W3 and I1): comma, semicolon
 * or tab, quoted fields with the delimiter, line breaks and doubled quotes inside, CRLF, LF or CR line ends, a leading
 * byte-order mark. Pure: it reads text it is given and never fetches anything.
 */
export const MAX_CSV_BYTES = 2_000_000, MAX_CSV_ROWS = 20_000, MAX_CSV_COLUMNS = 64;
export type CsvDelimiter = ',' | ';' | '\t';
export type ParsedCsv = {header: string[]; rows: string[][]; delimiter: CsvDelimiter; warnings: string[]};
export const CSV_TOO_LARGE = 'This file is larger than 2 MB. Nothing was read.';
export const CSV_TOO_MANY_ROWS = 'This file has more than 20,000 rows.';
export const CSV_NO_HEADER = 'This file has no header row.';
const DELIMITERS: CsvDelimiter[] = [',', ';', '\t'];
/** Counts each candidate outside quotes on the first five records (a quoted line break stays inside its record); the one with the same count on every record wins, ties go to the comma. */
export function detectDelimiter(text: string): CsvDelimiter {
  const body = text.replace(/^\uFEFF/, ''), records: string[] = [];
  let current = '', quoted = false;
  for (let i = 0; i < body.length && records.length < 5; i++) {
    const ch = body[i]!;
    if (ch === '"') { quoted = !quoted; current += ch; continue; }
    if (!quoted && (ch === '\n' || ch === '\r')) { if (current.length) records.push(current); current = ''; if (ch === '\r' && body[i + 1] === '\n') i++; continue; }
    current += ch;
  }
  if (current.length && records.length < 5) records.push(current);
  if (!records.length) return ',';
  const counts = DELIMITERS.map(delimiter => records.map(record => { let n = 0, inQuotes = false; for (const ch of record) { if (ch === '"') inQuotes = !inQuotes; else if (ch === delimiter && !inQuotes) n++; } return n; }));
  const consistent = DELIMITERS.map((delimiter, i) => ({delimiter, count: counts[i]![0]!, same: counts[i]!.every(n => n === counts[i]![0])}));
  const best = consistent.filter(c => c.same && c.count > 0).sort((a, b) => b.count - a.count || DELIMITERS.indexOf(a.delimiter) - DELIMITERS.indexOf(b.delimiter))[0];
  return best?.delimiter ?? ',';
}
export function parseCsv(input: string, options: {delimiter?: CsvDelimiter} = {}): ParsedCsv {
  if (new TextEncoder().encode(input).length > MAX_CSV_BYTES) throw Error(CSV_TOO_LARGE);
  const text = input.replace(/^﻿/, ''), delimiter = options.delimiter ?? detectDelimiter(text), warnings: string[] = [], records: string[][] = [];
  let field = '', row: string[] = [], quoted = false, i = 0;
  const endField = () => { row.push(field); field = ''; }, endRow = () => { endField(); records.push(row); row = []; };
  while (i < text.length) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } quoted = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === '"') { if (field.length === 0) quoted = true; else { field += ch; const rowNumber = Math.max(1, records.length); if (!warnings.includes(`Row ${rowNumber} has a quote inside a value.`)) warnings.push(`Row ${rowNumber} has a quote inside a value.`); } i++; continue; }
    if (ch === delimiter) { endField(); i++; continue; }
    if (ch === '\r') { endRow(); i += text[i + 1] === '\n' ? 2 : 1; continue; }
    if (ch === '\n') { endRow(); i++; continue; }
    field += ch; i++;
  }
  if (field.length || row.length) endRow();
  if (quoted) warnings.push('The file ends inside a quoted value.');
  while (records.length && records[records.length - 1]!.every(cell => cell === '')) records.pop();
  const header = records.shift()?.map(cell => cell.trim()) ?? [];
  if (!header.length || header.every(cell => cell === '')) throw Error(CSV_NO_HEADER);
  if (header.length > MAX_CSV_COLUMNS) throw Error(`This file has more than ${MAX_CSV_COLUMNS} columns.`);
  if (records.length > MAX_CSV_ROWS) throw Error(CSV_TOO_MANY_ROWS);
  const rows = records.map((cells, index) => {
    if (cells.length < header.length) warnings.push(`Row ${index + 1} has fewer columns than the header.`);
    return [...cells.slice(0, header.length), ...Array.from({length: Math.max(0, header.length - cells.length)}, () => '')];
  });
  return {header, rows, delimiter, warnings};
}
