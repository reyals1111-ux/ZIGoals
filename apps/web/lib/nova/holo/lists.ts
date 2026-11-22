import {noteName, type Note, type Notes} from '../../notes/schema';
import {inboxOf} from '../../notes/store';
import {openTasks, taskCounts, tasksOnDay} from '../../tasks/engine';
import type {Task, Tasks} from '../../tasks/schema';
import {isOutOfPlay} from '../../tasks/focus';
import {calendarDay, formatDate, formatTime} from '../../visual-format';

/**
 * Session AL Part 11 (lane L8): the Tasks and Notes panels' figures, from their own engines.
 * - Tasks: the counters the left panel and the Tasks page count (lib/tasks/engine.ts taskCounts: overdue, due today,
 *   open) and today's queue as the Agenda's day view has it (tasksOnDay: due today and the overdue ones carried over),
 *   the open ones first.
 * - Notes: the newest captures (every kind, newest first by creation) and how many wait in the inbox.
 */
export type TasksHud = {overdue: number; today: number; open: number; queue: Task[]; total: number};
export function tasksHud(record: Tasks, today: string, doneDay: (iso: string) => string, queue = 4, nowClock?: string): TasksHud {
  const c = taskCounts(record, today, nowClock); // Release review AL (RR-8): late today counts as overdue, as on Tasks
  // Session AV lane 2 (r6-plan, review B6M-10): the queue leaves out what the counts leave out (a project on hold, a task waiting its turn).
  const day = tasksOnDay(record, today, today, doneDay).filter(t => !t.doneAt && !isOutOfPlay(record, t, today));
  const rest = day.length < queue ? openTasks(record, today).filter(t => !day.some(d => d.id === t.id) && !t.due && !isOutOfPlay(record, t, today)).slice(0, queue - day.length) : [];
  return {...c, queue: [...day, ...rest].slice(0, queue), total: record.tasks.length};
}
export type NoteLine = {id: string; name: string; /** The name a widget row shows (`noteRowName`). */ label: string; at: string; kind: string};
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
/**
 * Session AM-2: a note's name in a widget row. A daily note is titled with its day ("2026-11-11", lib/notes/schema.ts):
 * it reads as that date in the app's own format (as the Notes page heads it), never as raw ISO; so does any other title
 * that is only a day. Every other note keeps `noteName`: its title, else its first line, else "Untitled note".
 */
export function noteRowName(note: Pick<Note, 'title' | 'body' | 'kind' | 'day'>, date: (day: string) => string = day => formatDate(day, {weekday: true})): string {
  if (note.kind === 'daily' && note.day && ISO_DAY.test(note.day)) return date(note.day);
  const name = noteName(note);
  return ISO_DAY.test(name) ? date(name) : name;
}
/** When a note was captured, for a widget row: the time for one captured today, else its date (the app's formats; never raw ISO). */
export function noteRowWhen(at: string, today: string): string {
  return calendarDay(at) === today ? formatTime(at) : formatDate(at, {year: at.slice(0, 4) !== today.slice(0, 4)});
}
export function recentNotes(record: Notes, count = 3): {recent: NoteLine[]; inbox: number; total: number} {
  const recent = [...record.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, count).map(n => ({id: n.id, name: noteName(n), label: noteRowName(n), at: n.createdAt, kind: n.kind}));
  return {recent, inbox: inboxOf(record).length, total: record.notes.length};
}
/**
 * Session AM-2 round 2: what the "Notes inbox" panel lists. Its figure counts the inbox, so while notes wait there the
 * rows ARE the inbox (newest first) and `more` is the inbox's notes beyond these rows: the figure, the rows and "+N more"
 * count one thing (the line said "+7 more" under "2 in your inbox": it counted every other note on the device). With an
 * empty inbox the rows are the newest notes of any kind, and `more` counts the notes beyond them.
 */
export function notesPanel(record: Notes, count = 3): {rows: NoteLine[]; of: 'inbox' | 'notes'; inbox: number; total: number; more: number} {
  const inbox = inboxOf(record), line = (n: Note): NoteLine => ({id: n.id, name: noteName(n), label: noteRowName(n), at: n.createdAt, kind: n.kind});
  if (inbox.length) { const rows = inbox.slice(0, Math.max(0, count)).map(line); return {rows, of: 'inbox', inbox: inbox.length, total: record.notes.length, more: inbox.length - rows.length}; }
  const rows = recentNotes(record, count).recent;
  return {rows, of: 'notes', inbox: 0, total: record.notes.length, more: record.notes.length - rows.length};
}
