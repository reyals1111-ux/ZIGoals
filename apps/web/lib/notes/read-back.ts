import {addLocalDays} from '../local-date';
import type {Note, Notes} from './schema';
import {checked, type NotesUndo} from './store';

/**
 * Session AV lane 2 (r6-notes; LEDGER #402, Capacities' daily notes read back): "Read back" on a daily note sets the day
 * it was read back (`readBack`), a quiet mark on its day in the "This day" strip and in Days; "Not read back yet" lists
 * the daily notes of the last 30 days (before today) that are not, oldest first. Never a count against the person, and
 * a locked daily note shows its mark only (its words never). Pure.
 */
export const READ_BACK_DAYS = 30;
/** The daily notes of the 30 days before today that hold words and are not read back, oldest first. */
export function notReadBack(record: Pick<Notes, 'notes'>, today: string, days = READ_BACK_DAYS): Note[] {
  const first = addLocalDays(today, -days);
  return record.notes.filter(n => n.kind === 'daily' && !!n.day && n.day >= first && n.day < today && !n.readBack && !n.archived && (n.locked || !!n.body.trim()))
    .sort((a, b) => a.day!.localeCompare(b.day!));
}
/** Marks a daily note read back today (or takes the mark off); Undo puts the note back. Reading is not a change of its words, so its "changed" time stays. */
export function setReadBack(record: Notes, id: string, on: boolean, today: string): {record: Notes; undo: NotesUndo} {
  const note = record.notes.find(n => n.id === id);
  if (!note) throw new Error('This note is no longer on this device.');
  if (note.kind !== 'daily') throw new Error('Only a daily note is read back.');
  const next: Note = {...note, readBack: today};
  if (!on) delete next.readBack;
  return {record: checked({...record, notes: record.notes.map(n => n.id === id ? next : n)}), undo: {before: [note], created: [], said: on ? 'The mark is off again.' : 'The note is marked read back again.'}};
}
