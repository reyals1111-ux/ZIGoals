import {MAX_PROPS, PROP_CHOICE_MAX, PROP_NAME_MAX, PROP_TEXT_MAX, notePropSchema, type Note, type NoteProp, type Notes, type PropType} from './schema';
import {updateNote, type NotesUndo} from './store';

/**
 * Session AV lane 2 (r3-notes; LEDGER #270, Obsidian's properties and Bases): a note's own properties — a name and a
 * typed value (text, a number, a day, a choice, a tick), up to ten — and the views over them: table columns with
 * filters, and a board grouped by a choice property. Kept from imported front matter and written back on export
 * (lib/notes/markdown.ts). Pure.
 */
export const PROP_WORDS: Record<PropType, string> = {text: 'Text', number: 'Number', date: 'Day', choice: 'Choice', tick: 'Tick'};
export const RESERVED_KEYS = new Set(['title', 'zigoals-id', 'type', 'day', 'created', 'updated', 'tags', 'source', 'photo', 'example', 'aliases', 'cssclasses', 'zigoals-stub', 'zigoals-props', 'date']);
export const propsOf = (note: Pick<Note, 'props'>): NoteProp[] => note.props ?? [];
export const propOf = (note: Pick<Note, 'props'>, name: string) => propsOf(note).find(p => p.k.toLowerCase() === name.trim().toLowerCase()) ?? null;
/** A property's name: trimmed, single spaces, within bounds; null when it cannot be one. */
export function propNameIssue(raw: string): string | null {
  const n = raw.trim().replace(/\s+/g, ' ');
  if (!n) return 'Give the property a name.';
  if (n.length > PROP_NAME_MAX) return `A name can be at most ${PROP_NAME_MAX} characters.`;
  if (RESERVED_KEYS.has(n.toLowerCase())) return `“${n}” is a name ZIGoals uses itself. Choose another.`;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(n)) return 'Use letters, numbers, spaces, - and _ in a name.';
  return null;
}
/** A value typed in a field, read as the type (null when it does not fit). */
export function readValue(t: PropType, raw: string | boolean): NoteProp['v'] | null {
  if (t === 'tick') return typeof raw === 'boolean' ? raw : /^(?:true|yes|ja|1)$/i.test(String(raw).trim());
  const s = String(raw).trim();
  if (t === 'number') { const n = Number(s.replace(',', '.')); return s && Number.isFinite(n) ? n : null; }
  if (t === 'date') { const d = new Date(`${s}T12:00:00Z`); return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : null; }
  if (t === 'choice') return s ? s.slice(0, PROP_CHOICE_MAX) : null;
  return String(raw).slice(0, PROP_TEXT_MAX);
}
/** Sets (adds or changes) one property of a note; Undo puts the note back. */
export function setProp(record: Notes, noteId: string, prop: {k: string; t: PropType; v: NoteProp['v']}, now: string): {record: Notes; undo: NotesUndo} {
  const note = record.notes.find(n => n.id === noteId);
  if (!note) throw new Error('This note is no longer on this device.');
  const issue = propNameIssue(prop.k); if (issue) throw new Error(issue);
  const parsed = notePropSchema.safeParse({k: prop.k.trim().replace(/\s+/g, ' '), t: prop.t, v: prop.v});
  if (!parsed.success) throw new Error('That value does not fit this property.');
  const list = propsOf(note), at = list.findIndex(p => p.k.toLowerCase() === parsed.data.k.toLowerCase());
  if (at < 0 && list.length >= MAX_PROPS) throw new Error(`A note keeps up to ${MAX_PROPS} properties.`);
  const props = at < 0 ? [...list, parsed.data] : list.map((p, i) => i === at ? parsed.data : p);
  return {record: updateNote(record, noteId, {props}, now), undo: {before: [note], created: [], said: 'The property is back as it was.'}};
}
export function removeProp(record: Notes, noteId: string, name: string, now: string): {record: Notes; undo: NotesUndo} {
  const note = record.notes.find(n => n.id === noteId);
  if (!note) throw new Error('This note is no longer on this device.');
  return {record: updateNote(record, noteId, {props: propsOf(note).filter(p => p.k.toLowerCase() !== name.toLowerCase())}, now), undo: {before: [note], created: [], said: `The property “${name}” is back.`}};
}
/** Every property name used across notes, the most used first, with the type most notes give it. */
export function propNames(notes: readonly Pick<Note, 'props'>[]): {name: string; type: PropType; count: number}[] {
  const by = new Map<string, {name: string; types: Map<PropType, number>; count: number}>();
  for (const n of notes) for (const p of propsOf(n)) { const k = p.k.toLowerCase(), hit = by.get(k) ?? {name: p.k, types: new Map(), count: 0}; hit.count++; hit.types.set(p.t, (hit.types.get(p.t) ?? 0) + 1); by.set(k, hit); }
  return [...by.values()].map(h => ({name: h.name, type: [...h.types].sort((a, b) => b[1] - a[1])[0]![0], count: h.count})).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
/** The values a choice property takes across notes, in the order they first appear. */
export function choiceValues(notes: readonly Pick<Note, 'props'>[], name: string): string[] {
  const out: string[] = [];
  for (const n of notes) { const p = propOf(n, name); if (p && p.t === 'choice' && !out.some(v => v.toLowerCase() === p.v.toLowerCase())) out.push(p.v); }
  return out;
}
/** A property's value as words, for a table cell and the board. */
export const valueWords = (p: NoteProp | null): string => !p ? '' : p.t === 'tick' ? (p.v ? 'Yes' : 'No') : String(p.v);
export type PropFilter = {name: string; op: 'is' | 'not' | 'contains' | 'atLeast' | 'atMost' | 'ticked' | 'unticked' | 'set' | 'unset'; value?: string};
export const FILTER_WORDS: Record<PropFilter['op'], string> = {is: 'is', not: 'is not', contains: 'contains', atLeast: 'is at least', atMost: 'is at most', ticked: 'is ticked', unticked: 'is not ticked', set: 'has a value', unset: 'has no value'};
/** Whether a note passes one filter. Numbers and days compare as numbers and days; words without case. */
export function passes(note: Pick<Note, 'props'>, f: PropFilter): boolean {
  const p = propOf(note, f.name), v = (f.value ?? '').trim().toLowerCase();
  switch (f.op) {
    case 'set': return !!p;
    case 'unset': return !p;
    case 'ticked': return !!p && p.t === 'tick' && p.v === true;
    case 'unticked': return !p || (p.t === 'tick' && p.v === false);
    case 'is': return !!p && valueWords(p).toLowerCase() === v;
    case 'not': return !p || valueWords(p).toLowerCase() !== v;
    case 'contains': return !!p && valueWords(p).toLowerCase().includes(v);
    case 'atLeast': case 'atMost': {
      if (!p || !v) return false;
      const cmp = p.t === 'number' ? p.v - Number(v.replace(',', '.')) : p.t === 'date' ? p.v.localeCompare(v) : valueWords(p).toLowerCase().localeCompare(v);
      return Number.isNaN(cmp) ? false : f.op === 'atLeast' ? cmp >= 0 : cmp <= 0;
    }
  }
}
export const filterNotes = <T extends Pick<Note, 'props'>>(notes: readonly T[], filters: readonly PropFilter[]): T[] => notes.filter(n => filters.every(f => passes(n, f)));
/** Compares two notes by a property (no value last); numbers and days by their order. */
export function byProp(name: string, dir: 'ascending' | 'descending') {
  const sign = dir === 'ascending' ? 1 : -1;
  return (a: Pick<Note, 'props'>, b: Pick<Note, 'props'>) => {
    const x = propOf(a, name), y = propOf(b, name);
    if (!x || !y) return x ? -1 : y ? 1 : 0;
    const c = x.t === 'number' && y.t === 'number' ? x.v - y.v : x.t === 'tick' && y.t === 'tick' ? Number(x.v) - Number(y.v) : valueWords(x).localeCompare(valueWords(y));
    return c * sign;
  };
}
/** The board's columns for a choice property: each value with its notes, then the notes with none. */
export function boardColumns<T extends Pick<Note, 'props'>>(notes: readonly T[], name: string): {value: string | null; notes: T[]}[] {
  const values = choiceValues(notes, name);
  return [...values.map(value => ({value, notes: notes.filter(n => { const p = propOf(n, name); return !!p && valueWords(p).toLowerCase() === value.toLowerCase(); })})), {value: null, notes: notes.filter(n => !propOf(n, name))}];
}

/* ---- Front matter (lib/notes/markdown.ts) ------------------------------------------------------------------------ */
/** Lines of YAML for the properties (readable in Obsidian), and `zigoals-props` holding them exactly, as JSON. */
export function propsFrontMatter(props: readonly NoteProp[]): string[] {
  if (!props.length) return [];
  const line = (p: NoteProp) => `${/^[A-Za-z][A-Za-z0-9_-]*$/.test(p.k) ? p.k : JSON.stringify(p.k)}: ${p.t === 'number' || p.t === 'tick' || p.t === 'date' ? String(p.v) : JSON.stringify(p.v)}`;
  return [...props.filter(p => !RESERVED_KEYS.has(p.k.toLowerCase())).map(line), `zigoals-props: ${JSON.stringify(JSON.stringify(props.map(p => ({k: p.k, t: p.t, v: p.v}))))}`];
}
/**
 * The properties of an imported file: ZIGoals' own `zigoals-props` exactly when it is there; else every other key of the
 * front matter that is not one ZIGoals uses itself, its type read from its value (true/false a tick, a number, a day,
 * else text; a list as text joined by commas). Up to ten.
 */
export function propsFromFrontMatter(data: Record<string, string | string[]>): NoteProp[] {
  const own = data['zigoals-props'];
  if (typeof own === 'string') { try { const list: unknown = JSON.parse(own); if (Array.isArray(list)) return list.filter(x => notePropSchema.safeParse(x).success).slice(0, MAX_PROPS) as NoteProp[]; } catch { /* read the keys instead */ } }
  const out: NoteProp[] = [];
  for (const [k, raw] of Object.entries(data)) {
    if (out.length >= MAX_PROPS || RESERVED_KEYS.has(k.toLowerCase()) || propNameIssue(k)) continue;
    const s = Array.isArray(raw) ? raw.join(', ') : raw;
    const prop: NoteProp = /^(?:true|false)$/i.test(s) ? {k, t: 'tick', v: /^true$/i.test(s)} : /^-?\d+(?:\.\d+)?$/.test(s) && Number.isFinite(Number(s)) ? {k, t: 'number', v: Number(s)} : /^\d{4}-\d{2}-\d{2}$/.test(s) ? {k, t: 'date', v: s} : {k, t: 'text', v: s.slice(0, PROP_TEXT_MAX)};
    if (notePropSchema.safeParse(prop).success) out.push(prop);
  }
  return out;
}
