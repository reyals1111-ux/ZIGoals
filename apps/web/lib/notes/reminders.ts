import {instantAt} from '../zone-time';
import {parseTaskLine} from '../tasks/parse';
import {noteName, type Note, type Notes} from './schema';

/**
 * Session AV lane 2 (tasks, LEDGER #31; Notion's "@remind" inside a page): a reminder written in a note's own text. A line
 * with "@remind", "!remind" or "⏰" and a day or a time after it — "@remind tomorrow 9:00 call the plumber", "⏰ friday
 * 18:00", "@herinner morgen 9:00" — is a reminder at that moment (a day alone is 09:00; a time alone is today). The words
 * left after the moment say what it is about (else the note's name). Nothing is stored apart from the note's text: edit
 * or remove the line and the reminder changes with it. Pure: `today` and the zone come in.
 */
export const NOTE_REMIND = /(?:^|\s)(?:@remind|!remind|@herinner|⏰)\s+(.+)$/iu;
export const NOTE_REMIND_CLOCK = '09:00', MAX_NOTE_REMINDERS = 60;
export type NoteReminder = {note: Note; line: number; day: string; time: string; at: number; what: string; key: string};
/** The reminders in one note's text, in the order written. */
export function remindersInNote(note: Note, today: string, zone: string): NoteReminder[] {
  const out: NoteReminder[] = [];
  note.body.split(/\r\n|\r|\n/).forEach((raw, line) => {
    const m = NOTE_REMIND.exec(raw);
    if (!m || out.length >= 20) return;
    const read = parseTaskLine(m[1]!.trim(), today);
    if (!read.due && !read.time) return;
    const day = read.due ?? today, time = read.time ?? NOTE_REMIND_CLOCK;
    out.push({note, line, day, time, at: instantAt(day, time, zone), what: read.title || noteName(note), key: `${note.id}:${line}:${day}T${time}`});
  });
  return out;
}
/** Every note reminder still ahead, or gone off within the last `pastMs` (12 hours by default), soonest first. */
export function noteReminders(record: Notes, today: string, zone: string, nowMs: number, {pastMs = 12 * 3_600_000}: {pastMs?: number} = {}): NoteReminder[] {
  const out: NoteReminder[] = [];
  for (const note of record.notes) for (const r of remindersInNote(note, today, zone)) if (r.at > nowMs - pastMs) out.push(r);
  return out.sort((a, b) => a.at - b.at).slice(0, MAX_NOTE_REMINDERS);
}
