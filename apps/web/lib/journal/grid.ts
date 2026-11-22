import type {JournalTemplate, PromptLang} from '../journal-prompts/templates';
import {headingOf, splitAtHeadings} from './prompt-answers';

/**
 * Session AV lane 2 (r3-notes; LEDGER #266, Grid Diary's grid and Mandala): a templated entry written as a grid of cards,
 * one box per heading. The entry is still saved as text with headings (each heading on its line, the words under it, a
 * blank line between), so the export, Every answer to a prompt and older builds read it as before. Words written before
 * the first heading are kept above the grid. Pure.
 */
export type Grid = {prefix: string; cells: string[]};
/** The boxes of a text for a template's headings (in either language); a heading not found is an empty box. */
export function gridOf(text: string, t: JournalTemplate): Grid {
  const alts = t.headings.en.map((h, i) => [h, t.headings.nl[i] ?? h]), lines = text.replace(/\r\n?/g, '\n').split('\n');
  // Session AV lane 2 (review B3C-1): the first heading by the same rule `splitAtHeadings` uses, so every line before it is
  // kept above the grid and every line from it on falls in a box; no line is left out when the grid is written back.
  const first = lines.findIndex(l => headingOf(l, alts) !== null);
  const prefix = first < 0 ? text.trim() : lines.slice(0, first).join('\n').trim();
  const cells = t.headings.en.map(() => '');
  if (first >= 0) for (const p of splitAtHeadings(lines.slice(first).join('\n'), alts)) cells[p.at] = p.words;
  return {prefix, cells};
}
/** The text a grid is saved as: the words above it, then each heading with its words. */
export function gridText(grid: Grid, t: JournalTemplate, lang: PromptLang): string {
  // The same shape as templateText: an untouched grid is exactly the template's headings, so it is never saved empty.
  const body = t.headings[lang].map((h, i) => { const w = (grid.cells[i] ?? '').trim(); return `${h}\n${w ? `${w}\n` : ''}`; }).join('\n');
  return grid.prefix.trim() ? `${grid.prefix.trim()}\n\n${body}` : body;
}
/**
 * Where each box of the Mandala sits on the 3 × 3 grid (row, column; 1-based): the centre first, then the eight around
 * it clockwise from the top left — the order they are written and read in.
 */
export const MANDALA_PLACES: readonly [number, number][] = [[2, 2], [1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [2, 1]];
