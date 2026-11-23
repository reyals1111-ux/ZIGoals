import {CELL_CHARS, TABLE_COLUMNS, TABLE_ROWS, tableCells} from '../ai/safe-render';

/**
 * Session AV lane 2 (r5-notes; LEDGER #363, Craft's table quick actions): the Markdown tables of a note as rows and
 * cells, changed and written back as Markdown — a cell's words, add a row or a column, remove one, move a row, and sort by
 * a column (numbers as numbers, words in the alphabet's order, empty cells last). Read with the same rules the reading
 * view draws them by (lib/ai/safe-render.ts: a header row, a delimiter row, then rows with a pipe; outside fenced code),
 * at most 20 columns and 100 rows. The text stays Markdown; nothing new is stored. Pure.
 *
 * Review b5i B5I-5 (Major): a change touches only what it changes. Each line keeps its own text (`src`): a row nobody
 * changed is written back byte for byte (also when rows move or sort), a changed cell is replaced in place inside its
 * line, and a column added or removed is spliced into each line, leaving every other cell as written. A table this
 * cannot edit without losing words (a row wider than its header, more than 20 columns, a cell over 500 characters) is
 * not edited: `blocked` says why in plain words.
 */
export type Align = 'left' | 'right' | 'center' | null;
export type NoteTable = {first: number; last: number; head: string[]; align: Align[]; rows: string[][];
  /** The lines as written: the header, the delimiter and each row (null for a row made here). */
  src: {head: string; delim: string; rows: (string | null)[]};
  /** Why this table is not edited here, or null. */
  blocked: string | null};
const DELIMITER = /^\s*:?-{1,}:?\s*$/;
const alignOf = (c: string): Align => { const t = c.trim(), l = t.startsWith(':'), r = t.endsWith(':'); return l && r ? 'center' : r ? 'right' : l ? 'left' : null; };
/** Where each cell's own text sits in a row line: [start, end) between its pipes (the same split as `tableCells`). */
export function cellSpans(line: string): [number, number][] {
  let start = line.length - line.trimStart().length, end = line.trimEnd().length;
  if (line[start] === '|') start++;
  if (end > start && line[end - 1] === '|' && line[end - 2] !== '\\') end--;
  const out: [number, number][] = [];
  let from = start;
  for (let i = start; i < end; i++) {
    if (line[i] === '\\' && line[i + 1] === '|') { i++; continue; }
    if (line[i] === '|') { out.push([from, i]); from = i + 1; }
  }
  out.push([from, end]);
  return out;
}
const rawCells = (line: string) => cellSpans(line).map(([a, b]) => line.slice(a, b));
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
    const rows: string[][] = [], src: (string | null)[] = [];
    let j = i + 2, wide = false, long = rawCells(line).some(c => c.trim().length > CELL_CHARS);
    while (j < lines.length && lines[j]!.trim() && lines[j]!.includes('|')) {
      const cells = tableCells(lines[j]!)!, raw = rawCells(lines[j]!);
      if (cells.length > head.length) wide = true;
      if (raw.some(c => c.trim().length > CELL_CHARS)) long = true;
      rows.push(Array.from({length: head.length}, (_, c) => cells[c] ?? '')); src.push(lines[j]!); j++;
    }
    const blocked = head.length > TABLE_COLUMNS ? `This table has more than ${TABLE_COLUMNS} columns, so it is changed in its Markdown only (Edit the words).`
      : wide ? 'A row of this table has more cells than its header, so it is changed in its Markdown only; nothing would be lost there.'
      : long ? `A cell of this table holds more than ${CELL_CHARS} characters, so it is changed in its Markdown only.`
      : rows.length > TABLE_ROWS ? `This table has more than ${TABLE_ROWS} rows, so it is changed in its Markdown only.` : null;
    out.push({first: i, last: j - 1, head, align: delim.map(alignOf), rows, src: {head: line, delim: lines[i + 1]!, rows: src}, blocked});
    i = j - 1;
  }
  return out;
}
const esc = (s: string) => s.replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|').slice(0, CELL_CHARS).trim();
const dash = (a: Align) => a === 'center' ? ':---:' : a === 'right' ? '---:' : a === 'left' ? ':---' : '---';
const rowLine = (cells: readonly string[], width: number) => `| ${Array.from({length: width}, (_, c) => esc(cells[c] ?? '')).join(' | ')} |`;
/** The line with cell `col` holding `words`, every other character as it was (a missing cell is added at the end). */
export function withCell(line: string, col: number, words: string): string {
  let spans = cellSpans(line), text = line;
  while (spans.length <= col) { text = withColumn(text, ''); spans = cellSpans(text); }
  const [a, b] = spans[col]!, raw = text.slice(a, b), lead = raw.length - raw.trimStart().length, trail = raw.length - raw.trimEnd().length, w = esc(words);
  if (!raw.trim()) return w ? `${text.slice(0, a)} ${w} ${text.slice(b)}` : text;
  return `${text.slice(0, a + lead)}${w}${text.slice(b - trail)}`;
}
/** The line with one more cell at its end. */
export function withColumn(line: string, words: string): string {
  const spans = cellSpans(line), [, end] = spans[spans.length - 1]!, trimmed = line.trimEnd(), piped = end < trimmed.length;
  return piped ? `${line.slice(0, end)}| ${words} ${line.slice(end)}` : `${trimmed} | ${words}${line.slice(trimmed.length)}`;
}
/** The line without cell `col` (and one pipe beside it); a line with fewer cells is left as it is. */
export function withoutColumn(line: string, col: number): string {
  const spans = cellSpans(line);
  if (col >= spans.length || spans.length < 2) return line;
  const [a, b] = spans[col]!;
  return col > 0 ? `${line.slice(0, a - 1)}${line.slice(b)}` : `${line.slice(0, a)}${line.slice(spans[1]![0])}`;
}
/** The table as Markdown lines: each line as written unless it changed. */
export function tableLines(t: Pick<NoteTable, 'head' | 'align' | 'rows' | 'src'>): string[] {
  const w = t.head.length;
  return [t.src.head, t.src.delim, ...t.rows.map((r, i) => t.src.rows[i] ?? rowLine(r, w))];
}
/** The text with that table written back in its place. */
export function replaceTable(text: string, t: Pick<NoteTable, 'first' | 'last'>, next: Pick<NoteTable, 'head' | 'align' | 'rows' | 'src'>): string {
  const lines = text.split('\n');
  return [...lines.slice(0, t.first), ...tableLines(next), ...lines.slice(t.last + 1)].join('\n');
}
export const TABLE_FULL_ROWS = `A table holds at most ${TABLE_ROWS} rows.`, TABLE_FULL_COLUMNS = `A table holds at most ${TABLE_COLUMNS} columns.`;
const usable = (t: NoteTable) => { if (t.blocked) throw new Error(t.blocked); };
export function setCell(t: NoteTable, row: number, col: number, words: string): NoteTable {
  usable(t);
  if (row < 0) return {...t, head: t.head.map((h, c) => c === col ? words : h), src: {...t.src, head: withCell(t.src.head, col, words)}};
  const line = t.src.rows[row];
  return {...t, rows: t.rows.map((r, i) => i === row ? r.map((x, c) => c === col ? words : x) : r), src: {...t.src, rows: t.src.rows.map((l, i) => i === row && line != null ? withCell(line, col, words) : l)}};
}
export function addRow(t: NoteTable, at = t.rows.length): NoteTable {
  usable(t);
  if (t.rows.length >= TABLE_ROWS) throw new Error(TABLE_FULL_ROWS);
  const rows = [...t.rows], src = [...t.src.rows];
  rows.splice(at, 0, t.head.map(() => '')); src.splice(at, 0, null);
  return {...t, rows, src: {...t.src, rows: src}};
}
export function addColumn(t: NoteTable, name: string): NoteTable {
  usable(t);
  if (t.head.length >= TABLE_COLUMNS) throw new Error(TABLE_FULL_COLUMNS);
  const title = esc(name) || `Column ${t.head.length + 1}`;
  return {...t, head: [...t.head, title], align: [...t.align, null], rows: t.rows.map(r => [...r, '']),
    src: {head: withColumn(t.src.head, title), delim: withColumn(t.src.delim, dash(null)), rows: t.src.rows.map(l => l === null ? null : withColumn(l, ''))}};
}
export function removeRow(t: NoteTable, row: number): NoteTable { usable(t); return {...t, rows: t.rows.filter((_, i) => i !== row), src: {...t.src, rows: t.src.rows.filter((_, i) => i !== row)}}; }
export function removeColumn(t: NoteTable, col: number): NoteTable {
  usable(t);
  if (t.head.length <= 1) throw new Error('A table keeps one column at least. Delete its lines in the note to remove it.');
  const keep = (_: unknown, c: number) => c !== col;
  return {...t, head: t.head.filter(keep), align: t.align.filter(keep), rows: t.rows.map(r => r.filter(keep)),
    src: {head: withoutColumn(t.src.head, col), delim: withoutColumn(t.src.delim, col), rows: t.src.rows.map(l => l === null ? null : withoutColumn(l, col))}};
}
export function moveRow(t: NoteTable, row: number, by: -1 | 1): NoteTable {
  usable(t);
  const to = row + by;
  if (to < 0 || to >= t.rows.length) return t;
  const rows = [...t.rows], src = [...t.src.rows];
  [rows[row], rows[to]] = [rows[to]!, rows[row]!]; [src[row], src[to]] = [src[to]!, src[row]!];
  return {...t, rows, src: {...t.src, rows: src}};
}
const number = (s: string): number | null => { const t = s.trim().replace(/[\s,€$£%]/g, ''); return t && /^[-+]?\d*\.?\d+(?:e[-+]?\d+)?$/i.test(t) ? Number(t) : null; };
/** Sorted by a column: numbers as numbers when every filled cell is one, else words (numbers inside them in order); empty cells last; ties keep their order. */
export function sortBy(t: NoteTable, col: number, dir: 'up' | 'down'): NoteTable {
  usable(t);
  const filled = t.rows.map(r => (r[col] ?? '').trim()).filter(Boolean), numeric = filled.length > 0 && filled.every(v => number(v) !== null);
  const sign = dir === 'up' ? 1 : -1, cmp = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
  const order = t.rows.map((r, i) => ({r, i})).sort((a, b) => {
    const x = (a.r[col] ?? '').trim(), y = (b.r[col] ?? '').trim();
    if (!x || !y) return !x && !y ? a.i - b.i : !x ? 1 : -1;
    return (numeric ? number(x)! - number(y)! : cmp.compare(x, y)) * sign || a.i - b.i;
  });
  return {...t, rows: order.map(x => x.r), src: {...t.src, rows: order.map(x => t.src.rows[x.i] ?? null)}};
}
/** A cheap test the editor runs on every keystroke: could the words hold a table? */
export const mayHoldTable = (text: string) => /\|[^\n]*\n\s*\|?\s*:?-+:?\s*\|/.test(text);
