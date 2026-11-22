import {addToDeviceRecord} from '../device-record';
import {JOURNAL, type JournalEntry} from '../journal/schema';

/**
 * Review B6P-1 (Session AV lane 2, r6-body; LEDGER #414): "Save these words as a journal line" adds one entry to this
 * device's journal, on `day` (the Meditation view's day, which follows "My day ends at"). When the journal cannot be read
 * (a bad entry, a record from a newer version) nothing is written: 'unreadable', and the words stay on screen. The journal
 * keeps its last 5,000 entries, as its own page does. Throws, with nothing written, when storage refuses.
 */
export function saveGroundingLine(storage: Pick<Storage, 'getItem' | 'setItem'>, line: string, day: string, at = new Date(), id: string = crypto.randomUUID()): 'saved' | 'unreadable' {
  const entry: JournalEntry = {id, date: day, text: line, createdAt: at.toISOString()};
  return addToDeviceRecord(storage, JOURNAL, current => ({...current, entries: [...current.entries, entry].slice(-5000)})) ? 'saved' : 'unreadable';
}
