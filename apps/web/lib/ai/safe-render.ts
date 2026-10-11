/**
 * A reply as a tree, never as HTML (ADR-012, Part 6). The AI's text is untrusted: this parser knows paragraphs,
 * headings, lists, quotes, code (fenced and inline), bold, italic, https links and (Session V Part 10) GitHub-style
 * tables, and nothing else. Angle brackets are
 * text. A link is a link only with an https address; anything else stays as the words it came in. No images.
 */
export type Inline = {type: 'text'; text: string} | {type: 'strong'; children: Inline[]} | {type: 'em'; children: Inline[]} | {type: 'code'; text: string} | {type: 'link'; href: string; children: Inline[]};
export type Align = 'left' | 'center' | 'right' | null;
/** Session V Part 10: a GitHub-style table, its cells inline marks only; at most 20 columns and 100 rows (`cut` says how many more). */
export type Table = {type: 'table'; align: Align[]; head: Inline[][]; rows: Inline[][][]; cut: number};
export type Block = {type: 'paragraph'; children: Inline[]} | {type: 'heading'; level: 1 | 2 | 3; children: Inline[]} | {type: 'list'; ordered: boolean; items: Inline[][]} | {type: 'quote'; children: Inline[]} | {type: 'code'; text: string; language: string | null} | Table;
export const TABLE_COLUMNS = 20, TABLE_ROWS = 100, CELL_CHARS = 500;
/** A table row's cells: split on unescaped pipes, the outer pipes optional, each cell trimmed and capped. */
export function tableCells(line: string): string[] | null {
  if (!line.includes('|')) return null;
  let body = line.trim();
  if (body.startsWith('|')) body = body.slice(1);
  if (body.endsWith('|') && !body.endsWith('\\|')) body = body.slice(0, -1);
  const cells: string[] = [];
  let cell = '';
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '\\' && body[i + 1] === '|') { cell += '|'; i++; continue; }
    if (body[i] === '|') { cells.push(cell.trim().slice(0, CELL_CHARS)); cell = ''; continue; }
    cell += body[i];
  }
  cells.push(cell.trim().slice(0, CELL_CHARS));
  return cells;
}
const DELIMITER = /^\s*:?-{1,}:?\s*$/;
function delimiterRow(line: string): Align[] | null {
  const cells = tableCells(line);
  if (!cells || !cells.length || !cells.every(c => DELIMITER.test(c))) return null;
  return cells.map(c => { const t = c.trim(), left = t.startsWith(':'), right = t.endsWith(':'); return left && right ? 'center' : right ? 'right' : left ? 'left' : null; });
}
const HTTPS = /^https:\/\/[^\s<>"'`]+$/i;
const LINK_TEXT_MAX = 200;
export const safeHref = (href: string): string | null => { const trimmed = href.trim(); if (!HTTPS.test(trimmed)) return null; try { const url = new URL(trimmed); return url.protocol === 'https:' && url.username === '' && url.password === '' ? url.href : null; } catch { return null; } };
/** Inline marks: `code`, **strong**, *em* / _em_, [text](https://…) and bare https addresses. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let buffer = '', i = 0;
  const flush = () => { if (buffer) { out.push({type: 'text', text: buffer}); buffer = ''; } };
  while (i < text.length) {
    const rest = text.slice(i);
    let match: RegExpMatchArray | null;
    if ((match = /^`([^`\n]+)`/.exec(rest))) { flush(); out.push({type: 'code', text: match[1]!}); i += match[0].length; continue; }
    if ((match = /^\*\*(?=\S)([^*\n]|\*(?!\*))+?(?<=\S)\*\*/.exec(rest))) { flush(); out.push({type: 'strong', children: parseInline(match[0].slice(2, -2))}); i += match[0].length; continue; }
    if ((match = /^(?:\*(?=\S)[^*\n]+?(?<=\S)\*|_(?=\S)[^_\n]+?(?<=\S)_(?![A-Za-z0-9]))/.exec(rest)) && (i === 0 || !/[A-Za-z0-9]/.test(text[i - 1]!))) { flush(); out.push({type: 'em', children: parseInline(match[0].slice(1, -1))}); i += match[0].length; continue; }
    if ((match = /^\[([^\]\n]{1,200})\]\(([^)\s]+)\)/.exec(rest))) {
      const image = i > 0 && text[i - 1] === '!', href = image ? null : safeHref(match[2]!);
      flush();
      if (href) out.push({type: 'link', href, children: [{type: 'text', text: match[1]!.slice(0, LINK_TEXT_MAX)}]});
      else buffer += match[0]; // not https, or an image: the words stay words
      i += match[0].length; continue;
    }
    if ((match = /^https:\/\/[^\s<>"'`)\]]+/i.exec(rest)) && (i === 0 || /[\s(\[]/.test(text[i - 1]!))) {
      let raw = match[0]; const trailing = /[.,;:!?]+$/.exec(raw); if (trailing) raw = raw.slice(0, -trailing[0].length);
      const href = safeHref(raw);
      flush();
      if (href) { out.push({type: 'link', href, children: [{type: 'text', text: raw}]}); i += raw.length; continue; }
    }
    buffer += text[i]; i++;
  }
  flush();
  return out;
}
/** Blocks, one pass over the lines. Unknown constructs are paragraphs. */
export function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n'), blocks: Block[] = [];
  let i = 0;
  const paragraph: string[] = [];
  const flushParagraph = () => { if (paragraph.length) { blocks.push({type: 'paragraph', children: parseInline(paragraph.join(' ').replace(/\s+/g, ' ').trim())}); paragraph.length = 0; } };
  while (i < lines.length) {
    const line = lines[i]!, fence = /^\s*(```+|~~~+)\s*([A-Za-z0-9_+-]*)\s*$/.exec(line);
    if (fence) {
      flushParagraph();
      const marker = fence[1]!, language = fence[2] || null, body: string[] = [];
      i++;
      while (i < lines.length && !new RegExp(`^\\s*${marker[0]}{${marker.length},}\\s*$`).test(lines[i]!)) { body.push(lines[i]!); i++; }
      i++; // the closing fence (or the end)
      blocks.push({type: 'code', text: body.join('\n'), language});
      continue;
    }
    if (!line.trim()) { flushParagraph(); i++; continue; }
    // A table: a header row with pipes, then a delimiter row with as many cells (Session V Part 10).
    const head = tableCells(line), align = i + 1 < lines.length ? delimiterRow(lines[i + 1]!) : null;
    if (head && align && align.length === head.length && head.length >= 1) {
      flushParagraph();
      const width = Math.min(head.length, TABLE_COLUMNS), rows: Inline[][][] = [];
      let cut = 0;
      i += 2;
      while (i < lines.length && lines[i]!.trim() && lines[i]!.includes('|')) {
        const cells = tableCells(lines[i]!)!;
        if (rows.length < TABLE_ROWS) rows.push(Array.from({length: width}, (_, c) => parseInline(cells[c] ?? ''))); else cut++;
        i++;
      }
      blocks.push({type: 'table', align: align.slice(0, width), head: head.slice(0, width).map(parseInline), rows, cut});
      continue;
    }
    const heading = /^\s{0,3}(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) { flushParagraph(); blocks.push({type: 'heading', level: heading[1]!.length as 1 | 2 | 3, children: parseInline(heading[2]!)}); i++; continue; }
    const quote = /^\s{0,3}>\s?(.*)$/.exec(line);
    if (quote) { flushParagraph(); const parts = [quote[1]!]; i++; while (i < lines.length && /^\s{0,3}>\s?/.test(lines[i]!)) { parts.push(lines[i]!.replace(/^\s{0,3}>\s?/, '')); i++; } blocks.push({type: 'quote', children: parseInline(parts.join(' ').trim())}); continue; }
    const bullet = /^\s{0,3}(?:[-*+•]|\d{1,3}[.)])\s+(.+)$/.exec(line);
    if (bullet) {
      flushParagraph();
      const ordered = /^\s{0,3}\d/.test(line), items: Inline[][] = [];
      while (i < lines.length) {
        const item = /^\s{0,3}(?:[-*+•]|\d{1,3}[.)])\s+(.+)$/.exec(lines[i]!);
        if (!item || /^\s{0,3}\d/.test(lines[i]!) !== ordered) break;
        let itemText = item[1]!; i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]!) && !/^\s{0,3}(?:[-*+•]|\d{1,3}[.)])\s+/.test(lines[i]!)) { itemText += ` ${lines[i]!.trim()}`; i++; }
        items.push(parseInline(itemText.trim()));
      }
      blocks.push({type: 'list', ordered, items});
      continue;
    }
    paragraph.push(line.trim()); i++;
  }
  flushParagraph();
  return blocks;
}
/** The plain words of a tree, for copying and for read-aloud. */
export function plainText(blocks: readonly Block[]): string {
  const inline = (nodes: readonly Inline[]): string => nodes.map(n => n.type === 'text' || n.type === 'code' ? n.text : inline(n.children)).join('');
  return blocks.map(b => b.type === 'code' ? b.text : b.type === 'list' ? b.items.map((item, i) => `${b.ordered ? `${i + 1}.` : '•'} ${inline(item)}`).join('\n')
    : b.type === 'table' ? [b.head, ...b.rows].map(row => row.map(inline).join(' | ')).join('\n') + (b.cut ? `\n(${b.cut} more rows)` : '') : inline(b.children)).join('\n\n');
}
