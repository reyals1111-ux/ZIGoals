import {noteName, type Note, type Notes} from './schema';
import type {NotesUndo} from './store';
import {updateNoteKeepingVersion} from './versions';
import {FENCE_OPEN, closesFence} from '../markdown-fence';

/**
 * Session AV lane 2 (r3-notes; LEDGER #264, Obsidian's tick boxes): "- [ ] words" lines in a note are tick boxes. Ticking
 * one in the reading view writes "- [x]" into that line of the note's own text (the words it replaces kept as an earlier
 * version, with Undo), and "Open tick boxes" gathers the unticked ones across every note, each linking back to its note.
 * They stay lines of the note, never tasks. Nothing new is stored: the tick lives in the text. Pure.
 */
export const TICK_LINE = /^(\s{0,3}(?:[-*+•]|\d{1,3}[.)])\s+)\[( |x|X)\](\s+)(\S.*)$/;
export type TickLine = {line: number; checked: boolean; text: string};
/**
 * Every tick-box line of a text (outside fenced code), with its 0-based line, as the reading view numbers them.
 * Session AV lane 2 (review B3C-9): fenced code by the reading view's own rule (lib/markdown-fence.ts), so a "- [ ]"
 * inside a four-backtick block is code here too, and a box after the block is found.
 */
export function tickLines(body: string): TickLine[] {
  const out: TickLine[] = [];
  let fence: string | null = null;
  body.replace(/\r\n?/g, '\n').split('\n').forEach((l, line) => {
    if (fence) { if (closesFence(fence, l)) fence = null; return; }
    const f = FENCE_OPEN.exec(l);
    if (f) { fence = f[1]!; return; }
    const m = TICK_LINE.exec(l);
    if (m) out.push({line, checked: m[2] !== ' ', text: m[4]!.trim()});
  });
  return out;
}
/** The text with the tick box on `line` ticked or unticked; throws when that line is no longer a tick box. */
export function setTick(body: string, line: number, checked: boolean): string {
  const lines = body.replace(/\r\n?/g, '\n').split('\n'), m = lines[line] === undefined ? null : TICK_LINE.exec(lines[line]!);
  if (!m) throw new Error('That tick box has changed. Open the note to see it.');
  lines[line] = `${m[1]}[${checked ? 'x' : ' '}]${m[3]}${m[4]}`;
  return lines.join('\n');
}
/** Ticks or unticks one tick box of a note: the words it replaces are kept as an earlier version; Undo puts the note back. */
export function tickNote(record: Notes, noteId: string, line: number, checked: boolean, now: string): {record: Notes; undo: NotesUndo} {
  const note = record.notes.find(n => n.id === noteId);
  if (!note) throw new Error('This note is no longer on this device.');
  const body = setTick(note.body, line, checked);
  return {record: updateNoteKeepingVersion(record, noteId, {body}, now), undo: {before: [note], created: [], said: checked ? 'The tick box is open again.' : 'The tick box is ticked again.'}};
}
export type OpenTick = {noteId: string; name: string; kind: Note['kind']; day?: string; line: number; text: string; example: boolean};
/** The unticked tick boxes of every note: the most recently changed note first, then in the note's own order. */
export function openTicks(notes: readonly Note[]): OpenTick[] {
  return [...notes].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
    .flatMap(n => tickLines(n.body).filter(t => !t.checked).map(t => ({noteId: n.id, name: n.kind === 'daily' && n.day ? n.day : noteName(n), kind: n.kind, ...(n.day ? {day: n.day} : {}), line: t.line, text: t.text, example: !!n.example})));
}
/** How many tick boxes a note has, and how many are ticked ("2 of 5 ticked"). */
export function tickCount(body: string): {done: number; total: number} {
  const all = tickLines(body);
  return {done: all.filter(t => t.checked).length, total: all.length};
}
