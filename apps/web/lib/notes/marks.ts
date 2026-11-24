import {HIGHLIGHT_EMOJI, type HighlightColour} from '../ai/safe-render';

/**
 * Session AV lane 2 (r3-notes; LEDGER #264, #267): the two buttons beside a note's text. "Tick box" starts the line the
 * caret is on with "- [ ] " (a line already a list item gets the box after its marker; one already a tick box is left
 * as it is); "Highlight" puts ==…== round the chosen words, with the colour's circle after the opening marks (none for
 * yellow, so it reads as Obsidian's plain highlight). Both say where the caret goes after. Pure.
 */
export type Edit = {text: string; start: number; end: number};
const LIST = /^(\s{0,3}(?:[-*+•]|\d{1,3}[.)])\s+)/;
export function insertTick(text: string, caret: number): Edit {
  // Session AV lane 2 (review B3C-11): at 0 the line starts at 0 (lastIndexOf from -1 would find a newline at 0).
  const at = Math.max(0, Math.min(caret, text.length)), from = at === 0 ? 0 : text.lastIndexOf('\n', at - 1) + 1, toNl = text.indexOf('\n', at), to = toNl < 0 ? text.length : toNl;
  const line = text.slice(from, to);
  if (/^\s{0,3}(?:[-*+•]|\d{1,3}[.)])\s+\[[ xX]\]/.test(line)) return {text, start: to, end: to};
  const list = LIST.exec(line), next = list ? `${list[1]}[ ] ${line.slice(list[1]!.length)}` : `- [ ] ${line}`;
  const end = from + next.length;
  return {text: text.slice(0, from) + next + text.slice(to), start: end, end};
}
export function wrapHighlight(text: string, start: number, end: number, colour: HighlightColour): Edit {
  const a = Math.max(0, Math.min(start, end, text.length)), b = Math.min(text.length, Math.max(start, end));
  let s = a, e = b;
  while (s < e && /\s/.test(text[s]!)) s++;
  while (e > s && /\s/.test(text[e - 1]!)) e--;
  const open = `==${colour === 'yellow' ? '' : HIGHLIGHT_EMOJI[colour]}`;
  if (s === e) { const words = 'highlighted words'; return {text: `${text.slice(0, s)}${open}${words}==${text.slice(e)}`, start: s + open.length, end: s + open.length + words.length}; }
  return {text: `${text.slice(0, s)}${open}${text.slice(s, e)}==${text.slice(e)}`, start: s + open.length, end: e + open.length};
}
