import {CELL_CHARS, TABLE_COLUMNS, TABLE_ROWS, tableCells} from '../ai/safe-render';

/**
 * Session AV lane 2 (r5-notes; LEDGER #363, Craft's table quick actions): the Markdown tables of a note as rows and
 * cells, changed and written back as Markdown — a cell's words, add a row or a column, remove one, move a row, and sort by
 * a column (numbers as numbers, words in the alphabet's order, empty cells last). Read with the same rules the reading
 * view draws them by (lib/ai/safe-render.ts: a header row, a delimiter row, then rows with a pipe; outside fenced code),
 * at most 20 columns and 100 rows. The text stays Markdown; nothing new is stored. Pure.
 */
export type Align = 'left' | 'right' | 'center' | null;
export type NoteTable = {first: number; last: number; head: string[]; align: Align[]; rows: string[][]};
const DELIMITER = /^\s*:?-{1,}:?\s*$/;
const alignOf = (c: string): Align => { const t = c.trim(), l = t.startsWith(':'), r = t.endsWith(':'); return l && r ? 'center' : r ? 'right' : l ? 'left' : null; };
/** Every table in the text, in order, with the lines it spans (0-based, inclusive). */
export function findTables(text: string): NoteTable[] {
  const lines = text.split('\n'), out: NoteTable[] = [];
  let fence: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!, f = /^\s*(```|~~~)/.exec(line);
    if (f) { fence = fence === null ? f[1]! : fence === f[1] ? null : fence; continue; }
    if (fence !== null || !line.trim()) continue;
    const head = tableCells(line), delim = i + 1 < lines.length ? tableCells(lines[i + 1]!) : null;
    if (!head || !delim || delim.length !== head.length || !delim.every(c => DELIMITER.test(c))) continue;
    const width = Math.min(head.length, TABLE_COLUMNS), rows: string[][] = [];
    let j = i + 2;
    while (j < lines.length && lines[j]!.trim() && lines[j]!.includes('|')) { const cells = tableCells(lines[j]!)!; rows.push(Array.from({length: width}, (_, c) => cells[c] ?? '')); j++; }
    out.push({first: i, last: j - 1, head: head.slice(0, width), align: delim.slice(0, width).map(alignOf), rows});
    i = j - 1;
  }
  return out;
}
const cell = (s: string) => s.replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|').slice(0, CELL_CHARS).trim();
const dash = (a: Align) => a === 'center' ? ':---:' : a === 'right' ? '---:' : a === 'left' ? ':---' : '---';
/** The table as Markdown lines (every row as wide as the header). */
export function tableLines(t: Pick<NoteTable, 'head' | 'align' | 'rows'>): string[] {
  const row = (cells: readonly string[]) => `| ${t.head.map((_, c) => cell(cells[c] ?? '')).join(' | ')} |`;
  return [row(t.head.map((h, c) => h.trim() || `Column ${c + 1}`)), `| ${t.head.map((_, c) => dash(t.align[c] ?? null)).join(' | ')} |`, ...t.rows.map(row)];
}
/** The text with that table written back in its place. */
export function replaceTable(text: string, t: Pick<NoteTable, 'first' | 'last'>, next: Pick<NoteTable, 'head' | 'align' | 'rows'>): string {
  const lines = text.split('\n');
  return [...lines.slice(0, t.first), ...tableLines(next), ...lines.slice(t.last + 1)].join('\n');
}
export const TABLE_FULL_ROWS = `A table holds at most ${TABLE_ROWS} rows.`, TABLE_FULL_COLUMNS = `A table holds at most ${TABLE_COLUMNS} columns.`;
export function setCell(t: NoteTable, row: number, col: number, words: string): NoteTable {
  if (row < 0) return {...t, head: t.head.map((h, c) => c === col ? words : h)};
  return {...t, rows: t.rows.map((r, i) => i === row ? r.map((x, c) => c === col ? words : x) : r)};
}
export function addRow(t: NoteTable, at = t.rows.length): NoteTable {
  if (t.rows.length >= TABLE_ROWS) throw new Error(TABLE_FULL_ROWS);
  const rows = [...t.rows]; rows.splice(at, 0, t.head.map(() => ''));
  return {...t, rows};
}
export function addColumn(t: NoteTable, name: string): NoteTable {
  if (t.head.length >= TABLE_COLUMNS) throw new Error(TABLE_FULL_COLUMNS);
  return {...t, head: [...t.head, name.trim() || `Column ${t.head.length + 1}`], align: [...t.align, null], rows: t.rows.map(r => [...r, ''])};
}
export function removeRow(t: NoteTable, row: number): NoteTable { return {...t, rows: t.rows.filter((_, i) => i !== row)}; }
export function removeColumn(t: NoteTable, col: number): NoteTable {
  if (t.head.length <= 1) throw new Error('A table keeps one column at least. Delete its lines in the note to remove it.');
  const keep = (_: unknown, c: number) => c !== col;
  return {...t, head: t.head.filter(keep), align: t.align.filter(keep), rows: t.rows.map(r => r.filter(keep))};
}
export function moveRow(t: NoteTable, row: number, by: -1 | 1): NoteTable {
  const to = row + by;
  if (to < 0 || to >= t.rows.length) return t;
  const rows = [...t.rows]; [rows[row], rows[to]] = [rows[to]!, rows[row]!];
  return {...t, rows};
}
const number = (s: string): number | null => { const t = s.trim().replace(/[\s,€$£%]/g, ''); return t && /^[-+]?\d*\.?\d+(?:e[-+]?\d+)?$/i.test(t) ? Number(t) : null; };
/** Sorted by a column: numbers as numbers when every filled cell is one, else words (numbers inside them in order); empty cells last; ties keep their order. */
export function sortBy(t: NoteTable, col: number, dir: 'up' | 'down'): NoteTable {
  const filled = t.rows.map(r => (r[col] ?? '').trim()).filter(Boolean), numeric = filled.length > 0 && filled.every(v => number(v) !== null);
  const sign = dir === 'up' ? 1 : -1, cmp = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
  const rows = t.rows.map((r, i) => ({r, i})).sort((a, b) => {
    const x = (a.r[col] ?? '').trim(), y = (b.r[col] ?? '').trim();
    if (!x || !y) return !x && !y ? a.i - b.i : !x ? 1 : -1;
    return (numeric ? number(x)! - number(y)! : cmp.compare(x, y)) * sign || a.i - b.i;
  }).map(x => x.r);
  return {...t, rows};
}
/** A cheap test the editor runs on every keystroke: could the words hold a table? */
export const mayHoldTable = (text: string) => /\|[^\n]*\n\s*\|?\s*:?-+:?\s*\|/.test(text);
