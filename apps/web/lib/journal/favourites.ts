import {journalSchema, type Journal, type JournalEntry} from './schema';

/**
 * Session AV lane 2 (r4-mind; LEDGER #310, Journey's favourites): a star on an entry (the loose entry's optional `star`,
 * TIER 3 stored format), set and taken off by the person. Pure.
 */
export function starEntry(journal: Journal, id: string, on: boolean): Journal {
  if (!journal.entries.some(e => e.id === id)) throw new Error('This entry is no longer on this device.');
  return journalSchema.parse({...journal, entries: journal.entries.map(e => {
    if (e.id !== id) return e;
    if (on) return {...e, star: true as const};
    const {star: _s, ...rest} = e; void _s; return rest as JournalEntry;
  })});
}
export const starredCount = (entries: readonly Pick<JournalEntry, 'star'>[]) => entries.filter(e => e.star === true).length;

