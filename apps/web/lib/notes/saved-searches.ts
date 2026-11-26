import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {searchNotes, snippetFor} from '../search/notes';
import {filterNotes, type PropFilter} from './props';
import {hasTag} from './tags';
import {MAX_TAG, NOTE_KINDS, isLockedHidden, noteName, type Note, type NoteKind} from './schema';

/**
 * Session AW (x3; LEDGER #441, Evernote's saved searches; TIER 3 (stored format), a new device-only key, loose and
 * versioned): a Notes search kept by name — its words, a tag, the kind of note (inbox, daily or topic), up to three of
 * the table's property filters, and whether it also searches the rest of the app — at most 12, listed in Notes → Notes
 * to open in one tap, renamed or removed there. Only the search is kept, never a note it finds, so opening it always
 * reads the notes as they are now. A locked note is found by its name only, as everywhere: its words, tags and
 * properties are never read for a search. In Export everything, the backup and both erases; never synced, as the notes.
 */
export const NOTE_SEARCHES_KEY = 'zigoals:note-searches:v1';
export const MAX_SAVED_SEARCHES = 12, SEARCH_NAME_MAX = 60, SEARCH_WORDS_MAX = 120, MAX_SEARCH_FILTERS = 3;
const FILTER_OPS = ['is', 'not', 'contains', 'atLeast', 'atMost', 'ticked', 'unticked', 'set', 'unset'] as const;
export const propFilterSchema = z.looseObject({name: z.string().trim().min(1).max(40), op: z.enum(FILTER_OPS), value: z.string().max(200).optional().catch(undefined)});
export const savedSearchSchema = z.looseObject({
  id: z.string().regex(/^ns-[A-Za-z0-9_-]{4,40}$/),
  name: z.string().trim().min(1).max(SEARCH_NAME_MAX),
  words: z.string().trim().max(SEARCH_WORDS_MAX).optional().catch(undefined),
  tag: z.string().trim().min(1).max(MAX_TAG).optional().catch(undefined),
  kind: z.enum(NOTE_KINDS).optional().catch(undefined),
  filters: z.preprocess(v => Array.isArray(v) ? v.filter(x => propFilterSchema.safeParse(x).success).slice(0, MAX_SEARCH_FILTERS) : undefined, z.array(propFilterSchema).max(MAX_SEARCH_FILTERS).optional()),
  wide: z.literal(true).optional().catch(undefined),
});
export type SavedSearch = z.infer<typeof savedSearchSchema>;
export const noteSearchesSchema = z.looseObject({
  version: z.literal(1),
  /** An item this build cannot read is dropped on read and the rest kept; a later build's fields are kept as they are. */
  searches: z.preprocess(v => Array.isArray(v) ? v.filter(x => savedSearchSchema.safeParse(x).success).slice(0, MAX_SAVED_SEARCHES) : [], z.array(savedSearchSchema).max(MAX_SAVED_SEARCHES)),
});
export type NoteSearches = z.infer<typeof noteSearchesSchema>;
export const emptyNoteSearches = (): NoteSearches => ({version: 1, searches: []});
export const NOTE_SEARCHES: DeviceRecordSpec<NoteSearches> = {key: NOTE_SEARCHES_KEY, schema: noteSearchesSchema, empty: emptyNoteSearches};

/** What the Notes search is set to now (the form's state). */
export type SearchState = {words: string; tag: string; kind: '' | NoteKind; filters: PropFilter[]; wide: boolean};
export const EMPTY_SEARCH: SearchState = {words: '', tag: '', kind: '', filters: [], wide: false};
const NO_VALUE: readonly PropFilter['op'][] = ['set', 'unset', 'ticked', 'unticked'];
/** The filters that say something (a filter that needs a value and has none is not applied, as the table does). */
export const liveFilters = (filters: readonly PropFilter[]) => filters.filter(f => NO_VALUE.includes(f.op) || (f.value ?? '').trim());
/** Whether the search narrows anything at all. */
export const searching = (s: SearchState) => !!(s.words.trim() || s.tag || s.kind || liveFilters(s.filters).length);
/** Whether the narrowing beyond the words is used (a tag, a kind, a filter): the wider search reads words only. */
export const narrowed = (s: SearchState) => !!(s.tag || s.kind || liveFilters(s.filters).length);

export type SearchHit = {note: Note; snippet: string};
/**
 * The notes a search finds now: the words as the Notes search reads them (a locked note never, as now), then the tag,
 * the kind and the property filters. With no words, every note passes the words; a locked note is then shown by its name
 * only and can pass only a kind (its tags and properties are not read).
 */
export function findNotes(notes: readonly Note[], s: SearchState, limit = 50): SearchHit[] {
  const filters = liveFilters(s.filters);
  const keep = (n: Note) => (!s.kind || n.kind === s.kind) && (!s.tag || hasTag(n, s.tag)) && (!filters.length || (!isLockedHidden(n) && filterNotes([n], filters).length === 1));
  if (s.words.trim()) return searchNotes(notes, s.words, notes.length).filter(h => keep(h.note)).slice(0, limit).map(h => ({note: h.note, snippet: h.snippet}));
  return notes.filter(keep).sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)).slice(0, limit)
    .map(n => ({note: n, snippet: isLockedHidden(n) ? 'Locked note: its words show after your PIN.' : snippetFor(n.body, '')}));
}

/** The search as kept (empty parts left out); a name is needed, at most 60 characters. */
export function toSaved(id: string, name: string, s: SearchState): SavedSearch {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) throw new Error('Give the search a name, for example Trip ideas.');
  if (clean.length > SEARCH_NAME_MAX) throw new Error(`A name has at most ${SEARCH_NAME_MAX} characters.`);
  if (!searching(s)) throw new Error('Type a few words, or choose a tag, a kind of note or a filter, first.');
  const words = s.words.trim().replace(/\s+/g, ' ').slice(0, SEARCH_WORDS_MAX), filters = liveFilters(s.filters).slice(0, MAX_SEARCH_FILTERS).map(f => NO_VALUE.includes(f.op) ? {name: f.name, op: f.op} : {name: f.name, op: f.op, value: (f.value ?? '').trim().slice(0, 200)});
  return savedSearchSchema.parse({id, name: clean, ...(words ? {words} : {}), ...(s.tag ? {tag: s.tag} : {}), ...(s.kind ? {kind: s.kind} : {}), ...(filters.length ? {filters} : {}), ...(s.wide && words && !narrowed(s) ? {wide: true} : {})});
}
/** The search a kept one opens with. */
export const fromSaved = (x: SavedSearch): SearchState => ({words: x.words ?? '', tag: x.tag ?? '', kind: x.kind ?? '', filters: (x.filters ?? []).map(f => ({name: f.name, op: f.op, ...(f.value !== undefined ? {value: f.value} : {})})), wide: x.wide === true});
/** Keeps a search; one with the same name (any case) is replaced in its place; the 13th is refused. */
export function keepSearch(record: NoteSearches, search: SavedSearch): NoteSearches {
  const same = record.searches.find(x => x.name.toLowerCase() === search.name.toLowerCase());
  if (same) return noteSearchesSchema.parse({...record, searches: record.searches.map(x => x.id === same.id ? {...search, id: same.id} : x)});
  if (record.searches.length >= MAX_SAVED_SEARCHES) throw new Error(`Up to ${MAX_SAVED_SEARCHES} saved searches. Remove one to keep this one.`);
  return noteSearchesSchema.parse({...record, searches: [...record.searches, search]});
}
/** A kept search renamed; a name another one has is refused. */
export function renameSearch(record: NoteSearches, id: string, name: string): NoteSearches {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) throw new Error('A saved search needs a name.');
  if (clean.length > SEARCH_NAME_MAX) throw new Error(`A name has at most ${SEARCH_NAME_MAX} characters.`);
  if (record.searches.some(x => x.id !== id && x.name.toLowerCase() === clean.toLowerCase())) throw new Error(`Another saved search is called “${clean}”.`);
  return noteSearchesSchema.parse({...record, searches: record.searches.map(x => x.id === id ? {...x, name: clean} : x)});
}
export const removeSearch = (record: NoteSearches, id: string): {record: NoteSearches; removed: SavedSearch | null; at: number} => {
  const at = record.searches.findIndex(x => x.id === id);
  return {record: {...record, searches: record.searches.filter(x => x.id !== id)}, removed: at >= 0 ? record.searches[at]! : null, at};
};
/** Undo of a removal: the search back in its place (once; a search of the same name since then stays). */
export function putBackSearch(record: NoteSearches, removed: SavedSearch, at: number): NoteSearches {
  if (record.searches.some(x => x.id === removed.id || x.name.toLowerCase() === removed.name.toLowerCase()) || record.searches.length >= MAX_SAVED_SEARCHES) return record;
  const list = [...record.searches]; list.splice(Math.max(0, Math.min(at, list.length)), 0, removed);
  return noteSearchesSchema.parse({...record, searches: list});
}
export const newSearchId = () => `ns-${(globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 20)}`;
const KIND_WORDS: Record<NoteKind, string> = {inbox: 'inbox captures', daily: 'daily notes', topic: 'topic notes'};
/** What a kept search looks for, in words ("“trip” · #travel · topic notes · Status is Planning"). */
export function searchWords(x: Pick<SavedSearch, 'words' | 'tag' | 'kind' | 'filters' | 'wide'>, filterWords: Record<PropFilter['op'], string>): string {
  return [x.words ? `“${x.words}”${x.wide ? ' everywhere' : ''}` : '', x.tag ? `#${x.tag}` : '', x.kind ? KIND_WORDS[x.kind] : '', ...(x.filters ?? []).map(f => `${f.name} ${filterWords[f.op]}${f.value ? ` ${f.value}` : ''}`)].filter(Boolean).join(' · ');
}
/** A note's name in a result line. */
export const hitName = (n: Note) => noteName(n);
