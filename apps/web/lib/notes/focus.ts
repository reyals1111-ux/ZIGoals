import type {Note, Notes} from './schema';
import {dailiesOf, topicsOf} from './store';
import {focused} from './tags';

/**
 * Session AV lane 2 (review b4g B4G-4; LEDGER #306): the notes Notes' focus tag can show — topic and daily notes, not
 * archived ones or inbox captures — so the Tags fold counts exactly what choosing a tag lists. Pure.
 */
export const taggableNotes = (record: Notes): Note[] => record.notes.filter(n => n.kind !== 'inbox' && !n.archived);
/** The Notes list: the topic notes, and with a focus tag its topic notes, then its daily notes (newest first). */
export function focusList(record: Notes, focus: string | undefined): Note[] {
  const topics = topicsOf(record).filter(n => !n.archived);
  return focus ? [...focused(topics, focus), ...focused(dailiesOf(record).filter(n => !n.archived), focus)] : topics;
}
