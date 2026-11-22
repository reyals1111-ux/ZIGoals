import {JOURNAL_TEMPLATES, templateById, type JournalTemplate, type PromptLang} from '../journal-prompts/templates';
import {asJournalTemplate} from '../journal-prompts/own';
import type {Journal, JournalEntry} from './schema';
import {isSealed, unsealed} from './letters';
import {localDate} from '../local-date';

/**
 * Session AV lane 2 (r3-notes; LEDGER #265, Grid Diary's "what you wrote under one prompt across days", Stoic's Journey
 * search by prompt): every entry that began from one template, and what was written under each of its headings, oldest
 * first. An entry keeps the template it began from (`template`); its headings are read in English and Dutch (and an own
 * template's own words), so an entry written in either language is split the same way. Derived; nothing stored. Pure.
 */
export type PromptUse = {id: string; title: string; count: number; own: boolean};
const templateOf = (journal: Pick<Journal, 'templates'>, id: string): JournalTemplate | null => {
  const own = (journal.templates ?? []).find(t => t.id === id);
  return own ? asJournalTemplate(own) : templateById(id);
};
/** The templates entries began from, the most used first, each with its title in `lang`. */
export function promptsUsed(journal: Pick<Journal, 'entries' | 'templates'>, lang: PromptLang = 'en'): PromptUse[] {
  const counts = new Map<string, number>();
  for (const e of journal.entries) if (e.template) counts.set(e.template, (counts.get(e.template) ?? 0) + 1);
  return [...counts].flatMap(([id, count]) => { const t = templateOf(journal, id); return t ? [{id, title: t.title[lang], count, own: !JOURNAL_TEMPLATES.some(x => x.id === id)}] : []; })
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
}
const fold = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
/**
 * Which heading a line is, with the words after it on the same line: a heading on its own line, or a heading that ends in
 * a mark (":", "?", ",", "…") with words after it on the same line ("A good thing today: …", "Dear future me, I hope …").
 * A heading that ends in a letter or digit counts only on its own line, so an ordinary sentence that starts with the same
 * word is not taken for it. The one rule the grid and Every answer to a prompt share (review B3C-1). Pure.
 */
export function headingOf(line: string, headings: readonly (readonly string[])[]): {at: number; rest: string} | null {
  const l = fold(line);
  if (!l) return null;
  for (const [at, alts] of headings.entries()) for (const h of alts) {
    const f = fold(h);
    if (!f) continue;
    if (l === f) return {at, rest: ''};
    if (/[^\p{L}\p{N}]$/u.test(f) && l.startsWith(`${f} `)) return {at, rest: line.trim().replace(/\s+/g, ' ').slice(f.length).trim()};
  }
  return null;
}
/** An entry's text split at a template's headings: each heading's index with the words under it (empty when none). */
export function splitAtHeadings(text: string, headings: readonly (readonly string[])[]): {at: number; words: string}[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n'), out: {at: number; words: string[]}[] = [];
  const which = (line: string) => headingOf(line, headings);
  let current: {at: number; words: string[]} | null = null;
  for (const line of lines) {
    const hit = line.trim() ? which(line) : null;
    if (hit && !out.some(o => o.at === hit.at)) { current = {at: hit.at, words: hit.rest ? [hit.rest] : []}; out.push(current); continue; }
    if (current) current.words.push(line);
  }
  return out.map(o => ({at: o.at, words: o.words.join('\n').trim()}));
}
export type PromptAnswers = {template: JournalTemplate; lang: PromptLang; entries: number; headings: {heading: string; answers: {entryId: string; date: string; words: string}[]}[]; unsplit: JournalEntry[];
  /** Session AV lane 2 (review B3C-3): the letters from this template still folded away: their day to open, never their words. */ sealed: string[]};
/**
 * Every answer to one template's headings, oldest first; entries whose headings were changed are listed whole in `unsplit`.
 * A letter still folded away (`isSealed`) gives no words: only its opening day, in `sealed` (review B3C-3).
 */
export function answersTo(journal: Pick<Journal, 'entries' | 'templates'>, templateId: string, lang: PromptLang = 'en', today: string = localDate()): PromptAnswers | null {
  const t = templateOf(journal, templateId);
  if (!t) return null;
  const alts = t.headings.en.map((h, i) => [h, t.headings.nl[i] ?? h]);
  const all = journal.entries.filter(e => e.template === templateId).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const entries = unsealed(all, today), sealed = all.filter(e => isSealed(e, today)).map(e => e.opensOn!).sort();
  const headings = t.headings[lang].map(heading => ({heading, answers: [] as {entryId: string; date: string; words: string}[]})), unsplit: JournalEntry[] = [];
  for (const e of entries) {
    const parts = splitAtHeadings(e.text, alts);
    if (!parts.length) { unsplit.push(e); continue; }
    for (const p of parts) if (p.words) headings[p.at]!.answers.push({entryId: e.id, date: e.date, words: p.words});
  }
  return {template: t, lang, entries: entries.length, headings, unsplit, sealed};
}
