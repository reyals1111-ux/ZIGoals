/**
 * A reply as a tree, never as HTML (ADR-012, Part 6). The AI's text is untrusted: this parser knows paragraphs,
 * headings, lists, quotes, code (fenced and inline), bold, italic, https links and (Session V Part 10) GitHub-style
 * tables, and nothing else. Angle brackets are
 * text. A link is a link only with an https address; anything else stays as the words it came in. No images.
 */
import {FENCE_OPEN, closesFence} from '../markdown-fence';
export type Inline = {type: 'text'; text: string} | {type: 'strong'; children: Inline[]} | {type: 'em'; children: Inline[]} | {type: 'code'; text: string} | {type: 'link'; href: string; children: Inline[]};
export type Align = 'left' | 'center' | 'right' | null;
/** Session V Part 10: a GitHub-style table, its cells inline marks only; at most 20 columns and 100 rows (`cut` says how many more). */
export type Table = {type: 'table'; align: Align[]; head: Inline[][]; rows: Inline[][][]; cut: number};
export type Block = {type: 'paragraph'; children: Inline[]} | {type: 'heading'; level: 1 | 2 | 3; children: Inline[]} | {type: 'list'; ordered: boolean; items: Inline[][]} | {type: 'quote'; children: Inline[]} | {type: 'code'; text: string; language: string | null} | Table;
/**
 * Session AV lane 2 (r3-notes; LEDGER #264, #267, Obsidian's tick boxes and highlights): two marks for a note's OWN text
 * only, switched on by `{notes: true}` and never for ZIGi's or NOVA's replies (which call the parser without options and
 * get exactly the tree above): `==words==` drawn as a highlight in one of six named colours (a colour circle right after
 * the opening `==` picks it, 🟢 green and so on; none is yellow), and a list item that starts with `[ ]` or `[x]` drawn as
 * a tick box, with the line of the text it came from so ticking it can change that line.
 */
export const HIGHLIGHT_COLOURS = ['yellow', 'green', 'blue', 'purple', 'red', 'orange'] as const;
export type HighlightColour = (typeof HIGHLIGHT_COLOURS)[number];
/** The colour circle each highlight colour is written with after `==` (yellow, the plain `==…==`, may carry one too). */
export const HIGHLIGHT_EMOJI: Record<HighlightColour, string> = {yellow: '\u{1F7E1}', green: '\u{1F7E2}', blue: '\u{1F535}', purple: '\u{1F7E3}', red: '\u{1F534}', orange: '\u{1F7E0}'};
export type NoteInline = {type: 'text'; text: string} | {type: 'code'; text: string} | {type: 'link'; href: string; children: Inline[]} | {type: 'strong'; children: NoteInline[]} | {type: 'em'; children: NoteInline[]} | {type: 'mark'; colour: HighlightColour; children: NoteInline[]};
export type NoteBlock = {type: 'paragraph'; children: NoteInline[]} | {type: 'heading'; level: 1 | 2 | 3; children: NoteInline[]} | {type: 'quote'; children: NoteInline[]} | {type: 'code'; text: string; language: string | null}
  | {type: 'table'; align: Align[]; head: NoteInline[][]; rows: NoteInline[][][]; cut: number}
  | {type: 'list'; ordered: boolean; items: NoteInline[][]; /** Per item: null for a plain item, else whether its tick box is ticked; and the line (0-based) each item starts on. */ ticks?: (boolean | null)[]; lines?: number[]}
  /** Session AV lane 2 (r4-notes; LEDGER #307): a `![words](<photo id>)` line of its own — one of the note's own photos on this device, never an address. */
  | {type: 'photo'; id: string; alt: string}
  /** Session AV lane 2 (r4-notes; LEDGER #314): a `> [!TIP]` quote drawn as a callout, its word said, its paragraphs kept. */
  | {type: 'callout'; kind: CalloutKind; word: string; title: NoteInline[] | null; paragraphs: NoteInline[][]};
/**
 * Session AV lane 2 (r4-notes; LEDGER #314, Bear's and GitHub's callouts): the five kinds, each drawn with its word (never
 * colour alone). Obsidian's other markers fold into the nearest of the five and keep their own word ("> [!info]" is an
 * Info note); an unknown marker is a note with its own word.
 */
export const CALLOUT_KINDS = ['note', 'tip', 'important', 'warning', 'caution'] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];
const CALLOUT_OF: Record<string, CalloutKind> = {note: 'note', info: 'note', abstract: 'note', summary: 'note', tldr: 'note', todo: 'note', example: 'note', quote: 'note', cite: 'note',
  tip: 'tip', hint: 'tip', success: 'tip', check: 'tip', done: 'tip', important: 'important', question: 'important', help: 'important', faq: 'important',
  warning: 'warning', attention: 'warning', bug: 'warning', caution: 'caution', danger: 'caution', error: 'caution', failure: 'caution', fail: 'caution', missing: 'caution'};
/**
 * Session AV lane 2 (r4-mind; LEDGER #308, Journey's formatting in an entry): `breaks` keeps the line breaks inside a
 * paragraph (a journal entry's "How the run went:" line stays its own line) instead of joining the lines with a space.
 * Honoured only with `notes: true`, which only Notes and the journal pass; ZIGi's and NOVA's replies never do.
 */
export type ParseOptions = {notes?: boolean; breaks?: boolean};
const MARK = /^==(?:(\u{1F7E1}|\u{1F7E2}|\u{1F535}|\u{1F7E3}|\u{1F534}|\u{1F7E0})\s?)?(?=\S)((?:[^=\n]|=(?!=))+?)(?<=\S)==/u;
const COLOUR_OF = new Map(Object.entries(HIGHLIGHT_EMOJI).map(([c, e]) => [e, c as HighlightColour]));
const TICK = /^\[( |x|X)\]\s+(.*)$/;
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
/** Inline marks: `code`, **strong**, *em* / _em_, [text](https://…) and bare https addresses (and, for notes, ==highlights==). */
export function parseInline(text: string): Inline[];
export function parseInline(text: string, options: ParseOptions): NoteInline[];
export function parseInline(text: string, options: ParseOptions = {}): NoteInline[] {
  const out: NoteInline[] = [], notes = options.notes === true;
  let buffer = '', i = 0;
  const flush = () => { if (buffer) { out.push({type: 'text', text: buffer}); buffer = ''; } };
  while (i < text.length) {
    const rest = text.slice(i);
    let match: RegExpMatchArray | null;
    if ((match = /^`([^`\n]+)`/.exec(rest))) { flush(); out.push({type: 'code', text: match[1]!}); i += match[0].length; continue; }
    if (notes && (match = MARK.exec(rest))) { flush(); out.push({type: 'mark', colour: match[1] ? COLOUR_OF.get(match[1])! : 'yellow', children: parseInline(match[2]!, options)}); i += match[0].length; continue; }
    if ((match = /^\*\*(?=\S)([^*\n]|\*(?!\*))+?(?<=\S)\*\*/.exec(rest))) { flush(); out.push({type: 'strong', children: parseInline(match[0].slice(2, -2), options)}); i += match[0].length; continue; }
    if ((match = /^(?:\*(?=\S)[^*\n]+?(?<=\S)\*|_(?=\S)[^_\n]+?(?<=\S)_(?![A-Za-z0-9]))/.exec(rest)) && (i === 0 || !/[A-Za-z0-9]/.test(text[i - 1]!))) { flush(); out.push({type: 'em', children: parseInline(match[0].slice(1, -1), options)}); i += match[0].length; continue; }
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
export function parseBlocks(text: string): Block[];
export function parseBlocks(text: string, options: ParseOptions): NoteBlock[];
export function parseBlocks(text: string, options: ParseOptions = {}): NoteBlock[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n'), blocks: NoteBlock[] = [], notes = options.notes === true;
  const inlineOf = (t: string) => parseInline(t, options);
  let i = 0;
  const paragraph: string[] = [];
  const breaks = notes && options.breaks === true;
  const flushParagraph = () => { if (paragraph.length) { blocks.push({type: 'paragraph', children: inlineOf(breaks ? paragraph.map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n') : paragraph.join(' ').replace(/\s+/g, ' ').trim())}); paragraph.length = 0; } };
  while (i < lines.length) {
    // Session AV lane 2 (review B3C-9): the fence rule lives in lib/markdown-fence.ts, shared with the notes' tick boxes.
    const line = lines[i]!, fence = FENCE_OPEN.exec(line);
    if (fence) {
      flushParagraph();
      const marker = fence[1]!, language = fence[2] || null, body: string[] = [];
      i++;
      while (i < lines.length && !closesFence(marker, lines[i]!)) { body.push(lines[i]!); i++; }
      i++; // the closing fence (or the end)
      blocks.push({type: 'code', text: body.join('\n'), language});
      continue;
    }
    if (!line.trim()) { flushParagraph(); i++; continue; }
    // A table: a header row with pipes, then a delimiter row with as many cells (Session V Part 10).
    const head = tableCells(line), align = i + 1 < lines.length ? delimiterRow(lines[i + 1]!) : null;
    if (head && align && align.length === head.length && head.length >= 1) {
      flushParagraph();
      const width = Math.min(head.length, TABLE_COLUMNS), rows: NoteInline[][][] = [];
      let cut = 0;
      i += 2;
      while (i < lines.length && lines[i]!.trim() && lines[i]!.includes('|')) {
        const cells = tableCells(lines[i]!)!;
        if (rows.length < TABLE_ROWS) rows.push(Array.from({length: width}, (_, c) => inlineOf(cells[c] ?? ''))); else cut++;
        i++;
      }
      blocks.push({type: 'table', align: align.slice(0, width), head: head.slice(0, width).map(c => inlineOf(c)), rows, cut});
      continue;
    }
    // Session AV lane 2 (r4-notes; LEDGER #307): notes only — a photo line names a photo id (letters, digits, - and _), so
    // no address can ever be fetched; the note's renderer draws it only when the note keeps that photo.
    const photo = notes ? /^\s*!\[([^\]\n]{0,120})\]\(([A-Za-z0-9_-]{1,80})\)\s*$/.exec(line) : null;
    if (photo) { flushParagraph(); blocks.push({type: 'photo', id: photo[2]!, alt: photo[1]!.trim()}); i++; continue; }
    const heading = /^\s{0,3}(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) { flushParagraph(); blocks.push({type: 'heading', level: heading[1]!.length as 1 | 2 | 3, children: inlineOf(heading[2]!)}); i++; continue; }
    const quote = /^\s{0,3}>\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph(); const parts = [quote[1]!]; i++; while (i < lines.length && /^\s{0,3}>\s?/.test(lines[i]!)) { parts.push(lines[i]!.replace(/^\s{0,3}>\s?/, '')); i++; }
      // Session AV lane 2 (r4-notes; LEDGER #314): notes only — a first line "[!TIP] a title" makes the quote a callout.
      const marker = notes ? /^\[!([A-Za-z]{1,20})\][+-]?(?:\s+(.*))?$/.exec(parts[0]!.trim()) : null;
      if (marker) {
        const name = marker[1]!.toLowerCase(), kind = CALLOUT_OF[name] ?? 'note', word = name === kind ? kind[0]!.toUpperCase() + kind.slice(1) : name[0]!.toUpperCase() + name.slice(1);
        const paragraphs: NoteInline[][] = [], run: string[] = [];
        const end = () => { if (run.length) { paragraphs.push(inlineOf(run.join(' ').replace(/\s+/g, ' ').trim())); run.length = 0; } };
        for (const p of parts.slice(1)) { if (p.trim()) run.push(p.trim()); else end(); }
        end();
        blocks.push({type: 'callout', kind, word, title: marker[2]?.trim() ? inlineOf(marker[2].trim()) : null, paragraphs});
        continue;
      }
      blocks.push({type: 'quote', children: inlineOf(parts.join(' ').trim())}); continue;
    }
    const bullet = /^\s{0,3}(?:[-*+•]|\d{1,3}[.)])\s+(.+)$/.exec(line);
    if (bullet) {
      flushParagraph();
      const ordered = /^\s{0,3}\d/.test(line), items: NoteInline[][] = [], ticks: (boolean | null)[] = [], at: number[] = [];
      while (i < lines.length) {
        const item = /^\s{0,3}(?:[-*+•]|\d{1,3}[.)])\s+(.+)$/.exec(lines[i]!);
        if (!item || /^\s{0,3}\d/.test(lines[i]!) !== ordered) break;
        at.push(i);
        const own = item[1]!.trim();
        let itemText = item[1]!; i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]!) && !/^\s{0,3}(?:[-*+•]|\d{1,3}[.)])\s+/.test(lines[i]!)) { itemText += ` ${lines[i]!.trim()}`; i++; }
        // Session AV lane 2 (review B3C-10): a tick box only with words after it on the item's own line, the line ticking
        // rewrites (lib/notes/ticks.ts TICK_LINE); "- [ ]" with its words on the next line stays a plain item.
        const tick = notes && TICK.test(own) ? TICK.exec(itemText.trim()) : null;
        ticks.push(tick ? tick[1] !== ' ' : null);
        items.push(inlineOf(tick ? tick[2]! : itemText.trim()));
      }
      blocks.push(notes && ticks.some(t => t !== null) ? {type: 'list', ordered, items, ticks, lines: at} : notes ? {type: 'list', ordered, items, lines: at} : {type: 'list', ordered, items});
      continue;
    }
    paragraph.push(line.trim()); i++;
  }
  flushParagraph();
  return blocks;
}
/** The plain words of a tree, for copying and for read-aloud. */
export function plainText(blocks: readonly (Block | NoteBlock)[]): string {
  const inline = (nodes: readonly NoteInline[]): string => nodes.map(n => n.type === 'text' || n.type === 'code' ? n.text : inline(n.children)).join('');
  return blocks.map(b => b.type === 'code' ? b.text : b.type === 'photo' ? `(${b.alt || 'photo'})` : b.type === 'callout' ? [`${b.word}${b.title ? `: ${inline(b.title)}` : ''}`, ...b.paragraphs.map(inline)].join('\n') : b.type === 'list' ? b.items.map((item, i) => `${b.ordered ? `${i + 1}.` : '•'} ${inline(item)}`).join('\n')
    : b.type === 'table' ? [b.head, ...b.rows].map(row => row.map(inline).join(' | ')).join('\n') + (b.cut ? `\n(${b.cut} more rows)` : '') : inline(b.children)).join('\n\n');
}
