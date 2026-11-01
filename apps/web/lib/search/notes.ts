import {noteHref} from '../notes/links';
import {noteName, type Note} from '../notes/schema';
import type {PaletteAction} from './actions';
import {normalize, type SearchItem} from './engine';

/**
 * Session AK (B1, B4): notes in the search palette. Each note is a search item (its name, its kind and the start of its
 * words), and four actions name what notes do: capture, today's note, the graph, Markdown export and import. A note opens
 * on the Notes page. `searchNotes` is the full-text search (every word of the query somewhere in the title or the words,
 * a short snippet around the first match), used by the Notes page and by `searchEverything` (./notes-everything.ts).
 */
export const NOTE_KEYWORD_CHARS = 1200;
const KIND_WORD = {inbox: 'Inbox', daily: 'Daily note', topic: 'Note'} as const;
/** The palette's items for these notes (the words are cut to their start so typing stays quick with many notes). */
export function noteSearchItems(notes: readonly Note[]): SearchItem[] {
  return notes.map(n => ({id: `note:${n.id}`, kind: 'note', title: n.kind === 'daily' && n.day ? `Daily note ${n.day}` : noteName(n), subtitle: n.example ? `${KIND_WORD[n.kind]} · Showcase example` : KIND_WORD[n.kind], href: noteHref(n.id), keywords: [n.body.slice(0, NOTE_KEYWORD_CHARS), ...(n.tags ?? [])]}));
}
export const NOTE_ACTIONS: readonly PaletteAction[] = [
  {id: 'action:capture-note', title: 'Capture a note', subtitle: 'Notes · type, speak or add a photo; file it later', keywords: ['note', 'capture', 'inbox', 'jot', 'write', 'idea', 'remember', 'memo', 'add'], href: '/app/notes?capture=1', effect: 'confirm'},
  {id: 'action:today-note', title: 'Open today’s note', subtitle: 'Notes · your daily note and what this day holds', keywords: ['daily note', 'today', 'note', 'day', 'diary', 'open'], href: '/app/notes?day=today', effect: 'opens'},
  {id: 'action:notes-graph', title: 'Open the notes graph', subtitle: 'Notes · your notes, goals and habits as a star system', keywords: ['graph', 'links', 'backlinks', 'map', 'notes', 'constellation', 'open'], href: '/app/notes?view=graph', effect: 'opens'},
  {id: 'action:notes-export', title: 'Export notes as Markdown', subtitle: 'Notes · a ZIP of .md files for Obsidian and other apps', keywords: ['export', 'markdown', 'obsidian', 'zip', 'md', 'import', 'notes', 'backup'], href: '/app/notes?view=files', effect: 'confirm'},
];

export type NoteHit = {note: Note; score: number; snippet: string};
const words = (s: string) => normalize(s).split(' ').filter(Boolean);
/** A short piece of the text around the first place a word matches (plain text, one line). */
export function snippetFor(text: string, query: string, width = 120): string {
  const flat = text.replace(/\s+/g, ' ').trim(), lower = flat.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const at = Math.min(...words(query).map(w => lower.indexOf(w)).filter(i => i >= 0), Infinity);
  if (!Number.isFinite(at)) return flat.slice(0, width) + (flat.length > width ? '…' : '');
  const start = Math.max(0, at - Math.floor(width / 3)), end = Math.min(flat.length, start + width);
  return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`;
}
/** Notes whose title or words hold every word of the query, best first: title matches above body matches, then newest. */
export function searchNotes(notes: readonly Note[], query: string, limit = 20): NoteHit[] {
  const q = words(query);
  if (!q.length) return [];
  const hits: NoteHit[] = [];
  for (const n of notes) {
    const title = normalize(n.kind === 'daily' && n.day ? `${n.day} ${noteName(n)}` : noteName(n)), body = normalize(`${n.body} ${(n.tags ?? []).join(' ')}`);
    let score = 0;
    for (const w of q) { if (title.split(' ').some(t => t.startsWith(w))) score += 6; else if (title.includes(w)) score += 4; else if (body.includes(w)) score += 1; else { score = -1; break; } }
    if (score >= 0) hits.push({note: n, score, snippet: snippetFor(n.body, query)});
  }
  return hits.sort((a, b) => b.score - a.score || (b.note.updatedAt ?? b.note.createdAt).localeCompare(a.note.updatedAt ?? a.note.createdAt)).slice(0, limit);
}
