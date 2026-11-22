import {setTick} from '../notes/ticks';
import {editEntry, type EntryUndo} from './versions';
import type {Journal} from './schema';

/**
 * Session AV lane 2 (r4-mind; LEDGER #308, Journey's formatting and checklists in an entry): an entry's Markdown — headings
 * (#), **bold**, *italics*, lists, > quotes, ==highlights== and "- [ ]" tick boxes — drawn as Notes draw theirs, with
 * round 3's notes-only marks (lib/ai/safe-render.ts `{notes: true}`), never for ZIGi's replies. The words stay as they
 * were written: nothing new is stored, so the export and older builds read the entry exactly as before. Pure.
 */

export {hasMarks} from './has-marks';

/** The marks the format bar writes. */
export type FormatMark = 'bold' | 'italic' | 'heading' | 'list' | 'quote';
export type Edit = {text: string; start: number; end: number};
const WRAP: Record<'bold' | 'italic', {mark: string; words: string}> = {bold: {mark: '**', words: 'bold words'}, italic: {mark: '*', words: 'words in italics'}};
const LINE: Record<'heading' | 'list' | 'quote', string> = {heading: '## ', list: '- ', quote: '> '};
const LINE_MARK = /^(?:#{1,3}\s+|[-*+•]\s+(?:\[[ xX]\]\s+)?|\d{1,3}[.)]\s+|>\s?)/;

/** Bold or italics round the chosen words (spaces at the edges stay outside); with nothing chosen, placeholder words to type over. */
export function wrapWords(text: string, start: number, end: number, mark: 'bold' | 'italic'): Edit {
  const a = Math.max(0, Math.min(start, end, text.length)), b = Math.min(text.length, Math.max(start, end));
  let s = a, e = b;
  while (s < e && /\s/.test(text[s]!)) s++;
  while (e > s && /\s/.test(text[e - 1]!)) e--;
  const {mark: m, words} = WRAP[mark];
  if (s === e) return {text: `${text.slice(0, s)}${m}${words}${m}${text.slice(e)}`, start: s + m.length, end: s + m.length + words.length};
  return {text: `${text.slice(0, s)}${m}${text.slice(s, e)}${m}${text.slice(e)}`, start: s + m.length, end: e + m.length};
}
/**
 * A heading, a list item or a quote at the start of each line the choice touches (the caret's line when nothing is
 * chosen). A line that already has the same mark loses it (pressing twice undoes it); another line mark is replaced.
 */
export function markLines(text: string, start: number, end: number, mark: 'heading' | 'list' | 'quote'): Edit {
  const a = Math.max(0, Math.min(start, end, text.length)), b = Math.min(text.length, Math.max(start, end));
  const from = text.lastIndexOf('\n', a - 1) + 1, nl = text.indexOf('\n', Math.max(b - (b > a && text[b - 1] === '\n' ? 1 : 0), a)), to = nl < 0 ? text.length : nl;
  const prefix = LINE[mark], lines = text.slice(from, to).split('\n');
  const has = (l: string) => mark === 'heading' ? /^#{1,3}\s+/.test(l) : mark === 'quote' ? /^>\s?/.test(l) : /^[-*+•]\s+(?!\[[ xX]\])/.test(l);
  const off = lines.filter(l => l.trim()).every(has);
  const next = lines.map(l => !l.trim() ? l : off ? l.replace(LINE_MARK, '') : `${prefix}${l.replace(LINE_MARK, '')}`).join('\n');
  return {text: text.slice(0, from) + next + text.slice(to), start: from + next.length, end: from + next.length};
}
/**
 * Ticks or unticks one tick box of an entry: the line becomes "- [x]" (or "- [ ]") in the entry's own words, and the
 * words it had are kept as an earlier version, as any change of an entry is (lib/journal/versions.ts), with Undo.
 */
export function tickEntry(journal: Journal, entryId: string, line: number, checked: boolean, now: string): {journal: Journal; undo: EntryUndo | null} {
  const entry = journal.entries.find(e => e.id === entryId);
  if (!entry) throw new Error('This entry is no longer on this device.');
  let text: string;
  try { text = setTick(entry.text, line, checked); } catch { throw new Error('That tick box has changed. Edit the entry to see it.'); }
  return editEntry(journal, entryId, text, now);
}
/** How many tick boxes an entry has and how many are ticked ("2 of 5 ticked"), outside code. */
export {tickCount} from '../notes/ticks';
