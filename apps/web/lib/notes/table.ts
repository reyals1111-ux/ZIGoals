import {addLocalDays} from '../local-date';
import {parseLinks} from './links';
import {noteName, type Note} from './schema';
import {noteTags} from './tags';

/**
 * Session AV lane 2 (notes; LEDGER #29 "a table or gallery of notes", #30 "a chart from your own lists: notes per tag"):
 * the rows a sortable table of notes shows (name, tags, words, links, changed, made), and the counts its chart draws —
 * notes per tag and notes changed per week. Derived each time; nothing stored. Pure.
 */
export type NoteRow = {id: string; name: string; tags: string[]; words: number; links: number; changed: string; made: string; pinned: boolean; example: boolean; photo: boolean};
export type SortKey = 'name' | 'tags' | 'words' | 'links' | 'changed' | 'made';
export const SORT_LABELS: Record<SortKey, string> = {name: 'Note', tags: 'Tags', words: 'Words', links: 'Links', changed: 'Changed', made: 'Made'};
const words = (text: string) => text.split(/\s+/u).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
/**
 * Session AV lane 2 (r4-notes; LEDGER #311, Bear's info panel): a note's words (the table's count, the Showcase label
 * left out), its characters, and the minutes it takes to read — an estimate at 230 words a minute, at least one.
 */
export const countWords = (body: string) => words(body.replace(/\(SHOWCASE DATA\)/g, ''));
export const countCharacters = (body: string) => [...body.replace(/\s*\(SHOWCASE DATA\)\s*$/, '')].length;
export const READ_WORDS_A_MINUTE = 230;
export const readMinutes = (words: number) => Math.max(1, Math.round(words / READ_WORDS_A_MINUTE));
export function noteRows(notes: readonly Note[]): NoteRow[] {
  // Session AV lane 2 (r4-notes; LEDGER #306): a note's tags include the #tags written in its words.
  return notes.map(n => ({id: n.id, name: noteName(n), tags: noteTags(n), words: words(n.body.replace(/\(SHOWCASE DATA\)/g, '')), links: new Set(parseLinks(n.body).map(l => l.target.toLowerCase())).size,
    changed: (n.updatedAt ?? n.createdAt).slice(0, 10), made: n.createdAt.slice(0, 10), pinned: !!n.pinned, example: !!n.example, photo: !!n.photoId}));
}
/** Rows sorted by a column; ties by name. Text columns A→Z first, numbers and days the most first. */
export function sortRows(rows: readonly NoteRow[], key: SortKey, dir: 'ascending' | 'descending'): NoteRow[] {
  const sign = dir === 'ascending' ? 1 : -1;
  const cmp = (a: NoteRow, b: NoteRow) => {
    const by = key === 'name' ? a.name.localeCompare(b.name) : key === 'tags' ? (a.tags[0] ?? '￿').localeCompare(b.tags[0] ?? '￿') : key === 'words' || key === 'links' ? a[key] - b[key] : a[key].localeCompare(b[key]);
    return by * sign || a.name.localeCompare(b.name);
  };
  return [...rows].sort(cmp);
}
/** The direction a column starts in when first chosen. */
export const firstDirection = (key: SortKey): 'ascending' | 'descending' => key === 'name' || key === 'tags' ? 'ascending' : 'descending';
/** Notes per tag, the most used first (a tag compared without case); notes with no tag counted apart. */
export function notesPerTag(notes: readonly Pick<Note, 'tags' | 'body'>[]): {tags: {tag: string; count: number}[]; untagged: number} {
  const by = new Map<string, {tag: string; count: number}>();
  let untagged = 0;
  for (const n of notes) {
    const tags = noteTags(n);
    if (!tags.length) { untagged++; continue; }
    for (const t of tags) { const k = t.toLowerCase(), hit = by.get(k); if (hit) hit.count++; else by.set(k, {tag: t, count: 1}); }
  }
  return {tags: [...by.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)), untagged};
}
/** Notes written or changed in each of the last `weeks` weeks (Monday first), oldest first. */
export function notesPerWeek(notes: readonly Pick<Note, 'createdAt' | 'updatedAt'>[], today: string, weeks = 8): {start: string; count: number}[] {
  const monday = addLocalDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
  const starts = Array.from({length: weeks}, (_, i) => addLocalDays(monday, -7 * (weeks - 1 - i)));
  return starts.map((start, i) => { const end = starts[i + 1] ?? addLocalDays(monday, 7); return {start, count: notes.filter(n => { const d = (n.updatedAt ?? n.createdAt).slice(0, 10); return d >= start && d < end; }).length}; });
}
