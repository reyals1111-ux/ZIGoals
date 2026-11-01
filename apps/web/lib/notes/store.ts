import {MAX_BODY, MAX_NOTES, MAX_TITLE, MAX_TOTAL_CHARS, noteName, notesSchema, totalChars, type Note, type NoteSource, type Notes} from './schema';

/**
 * Session AK (B1, B2): the pure changes behind notes — capture to the inbox, a day's daily note, edit, delete and file,
 * each returning the next record and what Undo needs. Nothing here touches storage; every result is validated against
 * the schema and the caps (count, length, total size), and a change that would break one throws with a plain sentence
 * and changes nothing.
 */
export const NOTES_FULL = `Notes are full on this device (at most ${MAX_NOTES}). Delete or export some first.`;
export const NOTES_TOO_BIG = 'Notes would be too large to keep in this browser. Shorten or delete some notes first.';
export const newNoteId = () => `n-${(globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`).replace(/[^A-Za-z0-9_-]/g, '')}`.slice(0, 80);

/** Validates a whole record against the schema and the caps. */
export function checked(record: Notes): Notes {
  if (record.notes.length > MAX_NOTES) throw new Error(NOTES_FULL);
  if (totalChars(record.notes) > MAX_TOTAL_CHARS) throw new Error(NOTES_TOO_BIG);
  return notesSchema.parse(record);
}
const clipTitle = (s: string) => s.replace(/[\r\n]+/g, ' ').trim().slice(0, MAX_TITLE);

/** What Undo puts back: the notes as they were (by id) and the ids a change created. */
export type NotesUndo = {before: Note[]; created: string[]; said: string};
/** Applies an Undo: created notes go, earlier versions come back (a deleted note returns in its place by date). */
export function applyUndo(record: Notes, undo: NotesUndo): Notes {
  const created = new Set(undo.created), before = new Map(undo.before.map(n => [n.id, n]));
  const kept = record.notes.filter(n => !created.has(n.id)).map(n => before.get(n.id) ?? n);
  const missing = undo.before.filter(n => !kept.some(k => k.id === n.id));
  return checked({...record, notes: [...kept, ...missing].sort((a, b) => a.createdAt.localeCompare(b.createdAt))});
}

export type CaptureInput = {text?: string; source?: NoteSource; photoId?: string; day: string; now: string; id?: string; title?: string; example?: boolean};
/** A new inbox note from typed or spoken words, a photo, or NOVA. Words or a photo are needed. */
export function captureInto(record: Notes, input: CaptureInput): {record: Notes; note: Note} {
  const text = (input.text ?? '').replace(/\r\n?/g, '\n').trim();
  if (!text && !input.photoId) throw new Error('Write or say a few words, or add a photo, first.');
  if (text.length > MAX_BODY) throw new Error(`A note holds at most ${MAX_BODY.toLocaleString('en-US')} characters.`);
  const note: Note = {id: input.id ?? newNoteId(), kind: 'inbox', title: clipTitle(input.title ?? ''), body: text, day: input.day, source: input.source ?? (input.photoId && !text ? 'photo' : 'text'),
    ...(input.photoId ? {photoId: input.photoId} : {}), ...(input.example ? {example: true} : {}), createdAt: input.now};
  return {record: checked({...record, notes: [...record.notes, note]}), note};
}

export const dailyNoteOf = (record: Notes, day: string) => record.notes.find(n => n.kind === 'daily' && n.day === day) ?? null;
/** The day's daily note, made (empty) when there is none yet. */
export function ensureDaily(record: Notes, day: string, now: string): {record: Notes; note: Note; created: boolean} {
  const found = dailyNoteOf(record, day);
  if (found) return {record, note: found, created: false};
  const note: Note = {id: newNoteId(), kind: 'daily', title: day, body: '', day, createdAt: now};
  return {record: checked({...record, notes: [...record.notes, note]}), note, created: true};
}
/** A new topic note. */
export function addTopic(record: Notes, {title, body = '', now, id}: {title: string; body?: string; now: string; id?: string}): {record: Notes; note: Note} {
  const name = clipTitle(title);
  if (!name) throw new Error('Give the note a title.');
  const note: Note = {id: id ?? newNoteId(), kind: 'topic', title: name, body: body.slice(0, MAX_BODY), createdAt: now};
  return {record: checked({...record, notes: [...record.notes, note]}), note};
}
export type NotePatch = Partial<Pick<Note, 'title' | 'body' | 'tags' | 'pinned' | 'photoId'>>;
/** Changes one note's words (a daily note keeps its day as its title). */
export function updateNote(record: Notes, id: string, patch: NotePatch, now: string): Notes {
  const at = record.notes.findIndex(n => n.id === id);
  if (at < 0) throw new Error('This note is no longer on this device.');
  const old = record.notes[at]!;
  if (patch.body !== undefined && patch.body.length > MAX_BODY) throw new Error(`A note holds at most ${MAX_BODY.toLocaleString('en-US')} characters.`);
  const next: Note = {...old, ...patch, ...(patch.title !== undefined ? {title: old.kind === 'daily' ? old.title : clipTitle(patch.title)} : {}), updatedAt: now};
  if (patch.photoId === undefined && 'photoId' in patch) delete next.photoId;
  return checked({...record, notes: record.notes.map((n, i) => i === at ? next : n)});
}
/** Deletes a note; Undo puts it back. */
export function removeNote(record: Notes, id: string): {record: Notes; undo: NotesUndo} {
  const note = record.notes.find(n => n.id === id);
  if (!note) throw new Error('This note is no longer on this device.');
  return {record: checked({...record, notes: record.notes.filter(n => n.id !== id)}), undo: {before: [note], created: [], said: `“${noteName(note)}” is back.`}};
}

/** Where an inbox note can go. */
export type FileTarget = {kind: 'daily'; day: string} | {kind: 'note'; id: string} | {kind: 'goal'; name: string} | {kind: 'habit'; name: string} | {kind: 'topic'; title: string};
/**
 * Files an inbox note. Into a daily or topic note: its words are added at the end and the capture goes (its photo moves
 * with it when the note has none; when it already has one, the capture stays as its own note, linked from there, so no
 * photo is lost). To a goal or habit: it becomes a topic note that starts with a [[link]] to it, so it shows among that
 * goal's or habit's backlinks. As a new topic: it gets the title given.
 */
export function fileNote(record: Notes, id: string, target: FileTarget, now: string): {record: Notes; undo: NotesUndo; into: string} {
  const note = record.notes.find(n => n.id === id);
  if (!note) throw new Error('This note is no longer on this device.');
  const name = noteName(note);
  if (target.kind === 'goal' || target.kind === 'habit' || target.kind === 'topic') {
    const title = target.kind === 'topic' ? clipTitle(target.title) : clipTitle(note.title || name);
    if (!title) throw new Error('Give the note a title.');
    const link = target.kind === 'topic' ? '' : `[[${target.name}]]`;
    const body = link && !note.body.includes(link) ? `${link}\n\n${note.body}`.trim() : note.body;
    const next: Note = {...note, kind: 'topic', title, body: body.slice(0, MAX_BODY), updatedAt: now};
    return {record: checked({...record, notes: record.notes.map(n => n.id === id ? next : n)}), undo: {before: [note], created: [], said: 'The note is back in your inbox.'}, into: id};
  }
  let base = record, created: string[] = [], targetNote: Note | null;
  if (target.kind === 'daily') { const d = ensureDaily(record, target.day, now); base = d.record; targetNote = d.note; if (d.created) created = [d.note.id]; }
  else targetNote = record.notes.find(n => n.id === target.id && n.kind !== 'inbox') ?? null;
  if (!targetNote) throw new Error('That note is no longer on this device.');
  if (targetNote.id === id) throw new Error('A note cannot be filed into itself.');
  const keepOwn = !!note.photoId && !!targetNote.photoId;
  const addition = keepOwn ? `[[${clipTitle(note.title || name)}]]` : note.body;
  const body = [targetNote.body.trimEnd(), addition].filter(Boolean).join('\n\n');
  if (body.length > MAX_BODY) throw new Error(`“${noteName(targetNote)}” would hold more than ${MAX_BODY.toLocaleString('en-US')} characters. File it elsewhere.`);
  const merged: Note = {...targetNote, body, ...(!keepOwn && note.photoId ? {photoId: note.photoId} : {}), updatedAt: now};
  const notes = base.notes.map(n => n.id === merged.id ? merged : n).flatMap(n => n.id !== id ? [n] : keepOwn ? [{...n, kind: 'topic' as const, title: clipTitle(n.title || name), updatedAt: now}] : []);
  return {record: checked({...base, notes}), undo: {before: created.length ? [note] : [note, targetNote], created, said: 'The note is back in your inbox.'}, into: merged.id};
}

/** The inbox, newest first. */
export const inboxOf = (record: Notes) => record.notes.filter(n => n.kind === 'inbox').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
/** Daily notes, newest day first. */
export const dailiesOf = (record: Notes) => record.notes.filter(n => n.kind === 'daily').sort((a, b) => (b.day ?? '').localeCompare(a.day ?? ''));
/** Topic notes: pinned first, then the most recently changed. */
export const topicsOf = (record: Notes) => record.notes.filter(n => n.kind === 'topic').sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
