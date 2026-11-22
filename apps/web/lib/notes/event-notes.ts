import {MAX_TITLE, type Note, type Notes} from './schema';
import {addTopic, checked, updateNote} from './store';
import {linkKey} from './links';

/**
 * Session AV lane 2 (r5-notes; LEDGER #364, Craft's notes for a calendar event): "Notes for this event" on an imported
 * event makes a topic note named after the event and its day, starting with a [[link]] to that day's daily note (so it
 * is listed under the day's note, among the notes that link there); a second tap opens the same note. The event it
 * belongs to is kept in a note property ("Event": the calendar, the event's id and its day, round 3's properties), so
 * nothing new is stored. A note in Recently deleted no longer counts (pressing again makes a new one). Pure.
 */
export const EVENT_PROP = 'Event';
/** The key of one day of an imported event, from its agenda item id (`event:<calendar>:<event>:<day>[:<part>]`). */
export const eventKeyOf = (itemId: string): string => itemId.replace(/^event:/, '').replace(/:\d+$/, '').slice(0, 500);
export const eventNoteOf = (record: Pick<Notes, 'notes'>, key: string): Note | null => record.notes.find(n => n.kind === 'topic' && n.props?.some(p => p.k === EVENT_PROP && p.t === 'text' && p.v === key)) ?? null;
/** The event's note, made when there is none: `{record, note, made}`. */
export function ensureEventNote(record: Notes, {key, title, day, now}: {key: string; title: string; day: string; now: string}): {record: Notes; note: Note; made: boolean} {
  const found = eventNoteOf(record, key);
  if (found) return {record, note: found, made: false};
  const words = title.replace(/[[\]|#\n]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Event';
  const base = `${words.slice(0, MAX_TITLE - 14)} · ${day}`, taken = new Set(record.notes.map(n => linkKey(n.title)));
  let name = base;
  for (let i = 2; taken.has(linkKey(name)) && i < 50; i++) name = `${base} (${i})`;
  const out = addTopic(record, {title: name, body: `[[${day}]]\n\n`, now});
  return {record: checked(updateNote(out.record, out.note.id, {props: [{k: EVENT_PROP, t: 'text', v: key}]}, now)), note: out.note, made: true};
}
