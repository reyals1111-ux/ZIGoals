import {templateById, type PromptLang} from '../journal-prompts/templates';
import type {JournalEntry} from './schema';

/**
 * Session AV (owner follow-up 1, F-GOOD-THINGS; Day One, Finch): "Three good things" in one go — up to three short lines
 * saved as ONE ordinary journal entry that begins from the existing template (`template: 'three-good-things'`, its
 * headings in English or Dutch), and how many good things this month's such entries hold. Nothing new is stored: the
 * entry is a journal entry like any other (export, erase, backup, the journal's own reads). Pure.
 */
export const GOOD_THINGS_ID = 'three-good-things';
export const GOOD_THING_MAX = 200;
const headings = (lang: PromptLang) => templateById(GOOD_THINGS_ID)!.headings[lang];

/** The entry text: the written things in order, each after the next heading (empty fields left out); '' when none is written. */
export function goodThingsText(items: readonly string[], lang: PromptLang = 'en'): string {
  const heads = headings(lang);
  return items.map(item => item.replace(/\s+/g, ' ').trim().slice(0, GOOD_THING_MAX)).filter(Boolean).slice(0, 3).map((item, i) => `${heads[i] ?? heads[heads.length - 1]} ${item}`).join('\n');
}
/** How many good things one entry holds: its lines that begin with a heading (either language) and say something after it. */
export function goodThingsIn(entry: Pick<JournalEntry, 'text' | 'template'>): number {
  if (entry.template !== GOOD_THINGS_ID) return 0;
  const heads = [...headings('en'), ...headings('nl')];
  return entry.text.split('\n').filter(line => heads.some(h => line.startsWith(h) && line.slice(h.length).trim().length > 0)).length;
}
/** The good things kept in a month ('2026-11'), and on how many days. */
export function goodThingsInMonth(entries: readonly Pick<JournalEntry, 'text' | 'template' | 'date'>[], month: string): {things: number; days: number} {
  const days = new Set<string>(); let things = 0;
  for (const e of entries) { if (!e.date.startsWith(month)) continue; const n = goodThingsIn(e); if (n) { things += n; days.add(e.date); } }
  return {things, days: days.size};
}
