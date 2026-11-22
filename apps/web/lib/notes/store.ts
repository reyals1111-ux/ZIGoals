import {checklistZone, zonedDay} from '../checklist/zone';
import {anchorReminders} from './reminder-anchors';
import {MAX_BODY, MAX_NOTES, MAX_TITLE, MAX_TOTAL_CHARS, MAX_TRASH, MAX_TRASH_CHARS, noteName, notesSchema, shortNoteName, totalChars, type Note, type NoteSource, type NoteVersion, type Notes, type TrashedNote} from './schema';

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

/**
 * What Undo puts back: the notes as they were (by id) and the ids a change created; `versions` (review b1 #5): earlier
 * versions a change deleted, put back when their note is still here.
 */
export type NotesUndo = {before: Note[]; created: string[]; said: string; versions?: NoteVersion[]};
/** Applies an Undo: created notes go, earlier versions come back (a deleted note returns in its place by date). */
export function applyUndo(record: Notes, undo: NotesUndo): Notes {
  const created = new Set(undo.created), before = new Map(undo.before.map(n => [n.id, n]));
  const kept = record.notes.filter(n => !created.has(n.id)).map(n => before.get(n.id) ?? n);
  const missing = undo.before.filter(n => !kept.some(k => k.id === n.id));
  const notes = [...kept, ...missing].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), here = new Set(notes.map(n => n.id));
  const have = new Set((record.versions ?? []).map(v => v.id)), back = (undo.versions ?? []).filter(v => here.has(v.noteId) && !have.has(v.id));
  // Session AV lane 2 (r5-notes; LEDGER #360): a note put back is no longer in Recently deleted.
  return checked(untrashBack({...record, notes, ...(back.length ? {versions: [...(record.versions ?? []), ...back].sort((a, b) => a.savedAt.localeCompare(b.savedAt))} : {})}));
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
export type NotePatch = Partial<Pick<Note, 'title' | 'body' | 'tags' | 'pinned' | 'photoId' | 'props' | 'photos' | 'archived' | 'locked' | 'look'>>;
/**
 * Changes one note's words (a daily note keeps its day as its title). Review b1 #1: a save of the words also notes the
 * day each "@remind" line was written (`remindFrom`, lib/notes/reminder-anchors.ts), in the person's zone.
 */
export function updateNote(record: Notes, id: string, patch: NotePatch, now: string, zone: string = checklistZone()): Notes {
  const at = record.notes.findIndex(n => n.id === id);
  if (at < 0) throw new Error('This note is no longer on this device.');
  const old = record.notes[at]!;
  if (patch.body !== undefined && patch.body.length > MAX_BODY) throw new Error(`A note holds at most ${MAX_BODY.toLocaleString('en-US')} characters.`);
  const next: Note = {...old, ...patch, ...(patch.title !== undefined ? {title: old.kind === 'daily' ? old.title : clipTitle(patch.title)} : {}), updatedAt: now};
  if (patch.photoId === undefined && 'photoId' in patch) delete next.photoId;
  if ('props' in patch && !patch.props?.length) delete next.props; // Session AV lane 2 (r3-notes; LEDGER #270)
  // Session AV lane 2 (r4-notes; LEDGER #306, #307, #315): an empty list or a false choice leaves the note as older builds wrote it.
  if ('tags' in patch && !patch.tags?.length) delete next.tags;
  if ('photos' in patch && !patch.photos?.length) delete next.photos;
  if ('archived' in patch && !patch.archived) delete next.archived;
  if ('locked' in patch && !patch.locked) delete next.locked; // LEDGER #318
  if ('look' in patch && !patch.look?.cover && !patch.look?.colour) delete next.look; // Session AV lane 2 (r5-notes; LEDGER #367)
  if (patch.body !== undefined) {
    const remindFrom = anchorReminders(old, patch.body, zonedDay(new Date(now), zone), zone);
    if (remindFrom) next.remindFrom = remindFrom; else delete next.remindFrom;
  }
  return checked({...record, notes: record.notes.map((n, i) => i === at ? next : n)});
}
/**
 * Deletes a note; Undo puts it back. Session AV lane 2 (r5-notes; LEDGER #360): it waits in Recently deleted for 30 days
 * (lib/notes/trash.ts), with its photos and earlier versions, before it leaves for good.
 */
export function removeNote(record: Notes, id: string, now: string = new Date().toISOString()): {record: Notes; undo: NotesUndo} {
  const note = record.notes.find(n => n.id === id);
  if (!note) throw new Error('This note is no longer on this device.');
  return {record: checked(toTrash(record, [note], now)), undo: {before: [note], created: [], said: `“${shortNoteName(note)}” is back.`}};
}
/* ---- Session AV lane 2 (r5-notes; LEDGER #360): Recently deleted, the parts every change needs ------------------- */
/** The trash kept to its caps: the oldest leave first (for a record read from elsewhere; a delete never calls it, review b5i B5I-1). */
export function capTrash(trash: readonly TrashedNote[]): TrashedNote[] {
  const kept: TrashedNote[] = [];
  let chars = 0;
  for (const n of [...trash].sort((a, b) => a.deletedAt.localeCompare(b.deletedAt)).reverse()) { // newest first, ties as listed
    const size = n.title.length + n.body.length;
    if (kept.length >= MAX_TRASH || chars + size > MAX_TRASH_CHARS) continue;
    chars += size; kept.push(n);
  }
  return kept.reverse();
}
/** The ids of notes whose versions may stay (in the notes or in Recently deleted). */
export const keptNoteIds = (record: Pick<Notes, 'notes' | 'trash'>): Set<string> => new Set([...record.notes.map(n => n.id), ...(record.trash ?? []).map(n => n.id)]);
export const withTrash = (record: Notes, trash: TrashedNote[]): Notes => {
  const next: Notes = {...record};
  if (trash.length) next.trash = trash; else delete next.trash;
  const ids = keptNoteIds(next);
  if (next.versions?.some(v => !ids.has(v.noteId))) { const versions = next.versions.filter(v => ids.has(v.noteId)); if (versions.length) next.versions = versions; else delete next.versions; }
  return next;
};
/**
 * Review b5i B5I-1, B5I-2: whether these notes fit in Recently deleted beside what it holds; the sentence that says why
 * not, or null. A delete never makes room by dropping a note: it is refused, in words, before anything changes.
 */
export function trashRoom(record: Pick<Notes, 'trash'>, notes: readonly Pick<Note, 'id' | 'title' | 'body'>[]): string | null {
  const ids = new Set(notes.map(n => n.id)), kept = (record.trash ?? []).filter(n => !ids.has(n.id));
  const count = kept.length + notes.length, chars = [...kept, ...notes].reduce((s, n) => s + n.title.length + n.body.length, 0);
  if (count <= MAX_TRASH && chars <= MAX_TRASH_CHARS) return null;
  if (notes.length > MAX_TRASH) return `Recently deleted keeps at most ${MAX_TRASH} notes, so ${notes.length} cannot be deleted at once. Choose ${MAX_TRASH} or fewer; nothing was deleted.`;
  return `Recently deleted is full (at most ${MAX_TRASH} notes and ${MAX_TRASH_CHARS.toLocaleString('en-US')} characters), so nothing was deleted. Open Notes → Notes → Recently deleted and delete some there for good (or Empty now) first.`;
}
/**
 * Moves notes into Recently deleted (newest last); a note already there is replaced. Review b5i B5I-1, B5I-2: it never
 * drops a note to make room — when they would not fit, it throws `trashRoom`'s sentence and changes nothing, so an Undo
 * of a delete always gives back the trash exactly as it was.
 */
export function toTrash(record: Notes, notes: readonly Note[], now: string): Notes {
  const full = trashRoom(record, notes);
  if (full) throw new Error(full);
  const ids = new Set(notes.map(n => n.id));
  const added = notes.map(n => ({...n, deletedAt: now}) as TrashedNote);
  return {...record, notes: record.notes.filter(n => !ids.has(n.id)), trash: [...(record.trash ?? []).filter(n => !ids.has(n.id)), ...added]};
}
/** After an Undo: a note back in the notes is no longer in Recently deleted. */
export function untrashBack(record: Notes): Notes {
  if (!record.trash?.length) return record;
  const here = new Set(record.notes.map(n => n.id));
  return record.trash.some(n => here.has(n.id)) ? withTrash(record, record.trash.filter(n => !here.has(n.id))) : record;
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
