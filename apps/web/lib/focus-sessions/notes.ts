import {FOCUS_NOTE_MAX, focusSessionsSchema, type FocusSessions} from './schema';
import {TASK_NOTES_MAX, tasksSchema, type Tasks} from '../tasks/schema';
import {readTasks, writeTasks} from '../tasks/device';

/**
 * Session AV lane 2 (r3-plan, LEDGER #260; Structured's notes in the Focus Timer): a note written while a focus run goes on
 * is kept on the run's latest saved block (one note per run; an earlier block of the run gives it up), and, on the person's
 * tap, added to the task's own notes. Pure.
 */
export const cleanNote = (text: string) => text.replace(/\r\n?/g, '\n').slice(0, FOCUS_NOTE_MAX);
/** The record with `note` on the last of `ids` (the run's blocks, oldest first) and on none of the others. */
export function withRunNote(record: FocusSessions, ids: readonly string[], note: string): FocusSessions {
  const last = ids.at(-1), text = cleanNote(note).trim(), mine = new Set(ids);
  if (!last) return record;
  return focusSessionsSchema.parse({...record, sessions: record.sessions.map(s => {
    if (!mine.has(s.id)) return s;
    const {note: _n, ...rest} = s; void _n;
    return s.id === last && text ? {...rest, note: text} : rest;
  })});
}
/** A note added under the task's own notes (a blank line between); refused when it would pass the notes' limit. */
export function appendTaskNote(record: Tasks, taskId: string, note: string, at = new Date()): Tasks {
  const task = record.tasks.find(t => t.id === taskId), text = note.trim();
  if (!task) throw new Error('That task is no longer on this device.');
  if (!text) return record;
  const notes = task.notes?.trim() ? `${task.notes.trimEnd()}\n\n${text}` : text;
  if (notes.length > TASK_NOTES_MAX) throw new Error(`The task's notes would pass ${TASK_NOTES_MAX.toLocaleString('en-GB')} characters. Shorten the note first.`);
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => t.id === taskId ? {...t, notes, updatedAt: at.toISOString()} : t)});
}
/**
 * Session AV lane 2 (r3-plan, review B3A-5): adds the note to the task through the tasks' own writer (open views refresh, an
 * unreadable record is refused). `undo` puts back only the notes, and only while they are still what this added.
 */
export function addNoteToTask(taskId: string, note: string, {at = new Date(), storage}: {at?: Date; storage?: Pick<Storage, 'getItem' | 'setItem'>} = {}): {undo: () => void} {
  const before = readTasks(storage)?.tasks.find(t => t.id === taskId)?.notes;
  const after = writeTasks(r => appendTaskNote(r, taskId, note, at), storage).tasks.find(t => t.id === taskId)?.notes;
  return {undo: () => { writeTasks(r => r.tasks.find(t => t.id === taskId)?.notes === after ? restoreTaskNotes(r, taskId, before) : r, storage); }};
}
/** Undo of `appendTaskNote`: the task's notes as they were (none when it had none). */
export function restoreTaskNotes(record: Tasks, taskId: string, notes: string | undefined): Tasks {
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => { if (t.id !== taskId) return t; const {notes: _n, ...rest} = t; void _n; return notes ? {...rest, notes} : rest; })});
}
