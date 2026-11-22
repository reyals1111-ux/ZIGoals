import {MAX_NOTE_PHOTOS_EACH, notePhotoIdsOf, type Note, type Notes} from './schema';
import {updateNote, type NotesUndo} from './store';
import {updateNoteKeepingVersion} from './versions';

/**
 * Session AV lane 2 (r4-notes; LEDGER #307, Bear's photos in a note): up to eight photos in a note. The first is the
 * note's `photoId` (as every build has read it, drawn under the words); each one after it is kept in `photos` and placed
 * in the words where it was added by a written `![photo](<id>)` line, which the reading view draws as the photo (only an
 * id this note keeps; never an address). Deleting a photo takes its line out too, and the next photo becomes the first.
 * The bytes stay in the notes' photo store (lib/notes/photos.ts). Pure.
 */
export const photoLine = (id: string) => `![photo](${id})`;
const LINE = /^\s*!\[[^\]\n]{0,120}\]\(([A-Za-z0-9_-]{1,80})\)\s*$/;
const FENCE = /^\s*(```+|~~~+)/;
/** Review b4g B4G-5: each photo line of a text (never inside fenced code), as [line, photo id]. */
function photoLines(lines: readonly string[]): [number, string][] {
  const out: [number, string][] = [];
  let fence: string | null = null;
  lines.forEach((l, i) => {
    const f = FENCE.exec(l);
    if (f) { if (!fence) fence = f[1]![0]!; else if (l.trim().startsWith(fence)) fence = null; return; }
    const m = fence ? null : LINE.exec(l);
    if (m) out.push([i, m[1]!]);
  });
  return out;
}
/** The photo ids a text places with a line of their own, in order. */
export function placedPhotoIds(body: string): string[] {
  return [...new Set(photoLines(body.split('\n')).map(([, id]) => id))];
}
/**
 * Review b4g B4G-5, B4G-6: the text without this photo's own lines (and one blank line beside each); every other
 * character stays as it was — code, indentation and blank lines elsewhere included.
 */
export function withoutPhotoLines(body: string, photoId: string): string {
  const lines = body.split('\n'), drop = new Set<number>();
  for (const [i, id] of photoLines(lines)) {
    if (id !== photoId) continue;
    drop.add(i);
    if (lines[i + 1] !== undefined && !lines[i + 1]!.trim() && !drop.has(i + 1)) drop.add(i + 1);
    else if (i > 0 && !lines[i - 1]!.trim() && !drop.has(i - 1)) drop.add(i - 1);
  }
  return drop.size ? lines.filter((_, i) => !drop.has(i)).join('\n') : body;
}
/** The note's photos not placed in its words (drawn under them): the first photo, and any whose line was removed. */
export const unplacedPhotoIds = (note: Pick<Note, 'photoId' | 'photos' | 'body'>): string[] => { const placed = new Set(placedPhotoIds(note.body)); return notePhotoIdsOf(note).filter(id => !placed.has(id)); };
export const photoRoom = (note: Pick<Note, 'photoId' | 'photos'>) => MAX_NOTE_PHOTOS_EACH - notePhotoIdsOf(note).length;
export const PHOTOS_FULL = `A note holds at most ${MAX_NOTE_PHOTOS_EACH} photos. Delete one first.`;
/** Puts a photo line on its own line at `at` (a caret) in the text, with blank lines around it. */
export function insertPhotoLine(body: string, at: number, id: string): string {
  const cut = Math.max(0, Math.min(at, body.length)), before = body.slice(0, cut).replace(/[ \t]+$/, ''), after = body.slice(cut).replace(/^[ \t]+/, '');
  return `${before}${before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''}${photoLine(id)}${after ? (after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n') : ''}${after}`;
}
/**
 * Adds a photo: the first becomes `photoId` (no line: it is drawn under the words, as before); a later one joins
 * `photos`, and with `place` its line is added at the end of the words (the editor places it at the caret instead).
 */
export function addNotePhoto(record: Notes, noteId: string, photoId: string, now: string, {place = true}: {place?: boolean} = {}): Notes {
  const note = record.notes.find(n => n.id === noteId);
  if (!note) throw new Error('This note is no longer on this device.');
  if (photoRoom(note) <= 0) throw new Error(PHOTOS_FULL);
  if (!note.photoId) return updateNote(record, noteId, {photoId}, now);
  return updateNote(record, noteId, {photos: [...(note.photos ?? []), photoId], ...(place ? {body: insertPhotoLine(note.body, note.body.length, photoId)} : {})}, now);
}
/**
 * Takes one photo out of the note: only its own lines go (review b4g B4G-5: the words it changes are kept as an earlier
 * version), and the next photo becomes the first. Undo puts the note back; the photo's bytes stay until the arrival
 * sweep finds no note naming it for 30 days (lib/notes/photos.ts), so Undo brings the photo back too.
 */
export function removeNotePhoto(record: Notes, noteId: string, photoId: string, now: string): {record: Notes; undo: NotesUndo} {
  const note = record.notes.find(n => n.id === noteId);
  if (!note) throw new Error('This note is no longer on this device.');
  const rest = notePhotoIdsOf(note).filter(id => id !== photoId), body = withoutPhotoLines(note.body, photoId);
  const patch = {photoId: rest[0], photos: rest.slice(1), ...(body !== note.body ? {body} : {})};
  const next = body !== note.body ? updateNoteKeepingVersion(record, noteId, patch, now) : updateNote(record, noteId, patch, now);
  return {record: next, undo: {before: [note], created: [], said: 'The photo is back in the note.'}};
}
