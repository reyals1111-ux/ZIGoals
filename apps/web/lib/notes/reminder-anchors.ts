import {wallClock} from '../zone-time';
import type {Note} from './schema';

/**
 * Session AV lane 2 (review b1 #1): the day each "@remind" line of a note was written (the note's `remindFrom`), so the
 * line's relative words ("tomorrow", "friday", a time alone) keep the moment they meant. Small and free of the task-line
 * parser, so the notes store can write it on every save. lib/notes/reminders.ts reads it.
 */
export const NOTE_REMINDERS_PER_NOTE = 20;
export const NOTE_REMIND = /(?:^|\s)(?:@remind|!remind|@herinner|⏰)\s+(.+)$/iu;
/** The words after "@remind" on each reminder line of a text, as `remindFrom` keys them (case and spaces folded). */
export const reminderKey = (words: string) => words.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 200);
export function reminderKeys(body: string): string[] {
  const out: string[] = [];
  for (const raw of body.split(/\r\n|\r|\n/)) { const m = NOTE_REMIND.exec(raw); if (m && out.length < NOTE_REMINDERS_PER_NOTE) out.push(reminderKey(m[1]!)); }
  return out;
}
/** The day a note was last saved, in the zone ("YYYY-MM-DD"), or null when its stamp cannot be read. */
export function savedDay(note: Pick<Note, 'updatedAt' | 'createdAt'>, zone: string): string | null {
  const ms = Date.parse(note.updatedAt ?? note.createdAt);
  return Number.isFinite(ms) ? wallClock(ms, zone).date : null;
}
/**
 * The `remindFrom` a saved note keeps: each reminder line of `next` keeps the day it had in `old` (its own entry, else
 * the old note's last save when the old words held the same line), and a line new in this save takes `today`. Undefined
 * when the note holds no reminder line.
 */
export function anchorReminders(old: Pick<Note, 'body' | 'remindFrom' | 'updatedAt' | 'createdAt'> | null, nextBody: string, today: string, zone: string): Record<string, string> | undefined {
  const keys = reminderKeys(nextBody);
  if (!keys.length) return undefined;
  const before = new Set(old ? reminderKeys(old.body) : []), oldSaved = old ? savedDay(old, zone) : null, out: Record<string, string> = {};
  for (const k of keys) { const kept = before.has(k) ? old?.remindFrom?.[k] ?? oldSaved : null; out[k] = kept && kept <= today ? kept : today; }
  return out;
}
