import {remindersInNote, type NoteReminder} from '../notes/reminders';
import type {Notes} from '../notes/schema';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #224; Google Keep's reminders saved to Google Tasks): the reminders written in notes
 * ("@remind tomorrow 9:00 call the plumber") listed where tasks are — Tasks → Today, Tasks → Upcoming and the Agenda's
 * days — each linking back to its note. They stay note lines: nothing is copied or stored, and changing the line changes
 * them. Reads lib/notes/reminders.ts (`remindersInNote`) only. Pure: `today`, the zone and the clock come in.
 */
export const NOTE_REMINDERS_LISTED = 60;
export type ListedNoteReminder = NoteReminder & {gone: boolean};
/** The note reminders on the days `from`–`to`, soonest first, each marked when it has gone off (`gone`). */
export function noteRemindersBetween(record: Notes, from: string, to: string, today: string, zone: string, nowMs: number): ListedNoteReminder[] {
  const out: ListedNoteReminder[] = [];
  for (const note of record.notes) for (const r of remindersInNote(note, today, zone)) if (r.day >= from && r.day <= to) out.push({...r, gone: r.at <= nowMs});
  return out.sort((a, b) => a.at - b.at).slice(0, NOTE_REMINDERS_LISTED);
}
/** The same, by day (days in order; only days that have one). */
export function noteRemindersByDay(list: readonly ListedNoteReminder[]): {day: string; items: ListedNoteReminder[]}[] {
  const byDay = new Map<string, ListedNoteReminder[]>();
  for (const r of list) byDay.set(r.day, [...(byDay.get(r.day) ?? []), r]);
  return [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([day, items]) => ({day, items}));
}
/** Where a note reminder opens: its note on the Notes page. */
export const noteHref = (noteId: string) => `/app/notes?note=${encodeURIComponent(noteId)}`;
