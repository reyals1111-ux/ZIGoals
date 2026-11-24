import {instantAt} from '../zone-time';
import {NOTE_REMIND, NOTE_REMINDERS_PER_NOTE, reminderKey, savedDay} from './reminder-anchors';
import {parseTaskLine} from '../tasks/parse';
import {noteName, type Note, type Notes} from './schema';

/**
 * Session AV lane 2 (tasks, LEDGER #31; Notion's "@remind" inside a page): a reminder written in a note's own text. A line
 * with "@remind", "!remind" or "⏰" and a day or a time after it — "@remind tomorrow 9:00 call the plumber", "⏰ friday
 * 18:00", "@herinner morgen 9:00" — is a reminder at that moment (a day alone is 09:00; a time alone is that day). The words
 * left after the moment say what it is about (else the note's name). Pure: `today` and the zone come in.
 *
 * Review b1 #1: relative words are read against the day the line was written, never against today — else "tomorrow"
 * slides forward every day and never goes off. That day is the note's `remindFrom` entry for the line's words (written by
 * updateNote when a save brings the line in, kept while the line stays the same), else the day of the note's last save
 * (a note no save of this build has touched: an older one, an import, a capture). Never later than today.
 */
export {NOTE_REMIND} from './reminder-anchors';
export const NOTE_REMIND_CLOCK = '09:00', MAX_NOTE_REMINDERS = 60;
export type NoteReminder = {note: Note; line: number; day: string; time: string; at: number; what: string; key: string};
/** The reminders in one note's text, in the order written. */
export function remindersInNote(note: Note, today: string, zone: string): NoteReminder[] {
  const out: NoteReminder[] = [], saved = savedDay(note, zone);
  note.body.split(/\r\n|\r|\n/).forEach((raw, line) => {
    const m = NOTE_REMIND.exec(raw);
    if (!m || out.length >= NOTE_REMINDERS_PER_NOTE) return;
    const written = note.remindFrom?.[reminderKey(m[1]!)] ?? saved, from = written && written <= today ? written : today;
    const read = parseTaskLine(m[1]!.trim(), from);
    if (!read.due && !read.time) return;
    const day = read.due ?? from, time = read.time ?? NOTE_REMIND_CLOCK;
    out.push({note, line, day, time, at: instantAt(day, time, zone), what: note.locked ? 'A reminder in a locked note' : read.title || noteName(note), key: `${note.id}:${line}:${day}T${time}`});
  });
  return out;
}
/** Every note reminder still ahead, or gone off within the last `pastMs` (12 hours by default), soonest first. */
export function noteReminders(record: Notes, today: string, zone: string, nowMs: number, {pastMs = 12 * 3_600_000}: {pastMs?: number} = {}): NoteReminder[] {
  const out: NoteReminder[] = [];
  for (const note of record.notes) for (const r of remindersInNote(note, today, zone)) if (r.at > nowMs - pastMs) out.push(r);
  return out.sort((a, b) => a.at - b.at).slice(0, MAX_NOTE_REMINDERS);
}
