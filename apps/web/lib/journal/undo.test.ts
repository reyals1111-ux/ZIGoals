import {describe, expect, it} from 'vitest';
import {emptyJournal, journalSchema, removeJournalEntry, restoreJournalEntry, type Journal} from './schema';

/** Session AL (A7, PRIMITIVES 3e): the Journal's Remove moved to the one Undo toast; its restore puts the entry back. */
const entry = (id: string, createdAt: string) => ({id, date: createdAt.slice(0, 10), text: `Entry ${id}`, createdAt});
describe('Journal Undo restores the stored record', () => {
  it('the removed entry comes back in its place; one written since is kept; a second Undo does not double it', () => {
    const before: Journal = {...emptyJournal(), entries: [entry('a', '2026-11-01T08:00:00.000Z'), entry('b', '2026-11-02T08:00:00.000Z')]} as Journal;
    const removed = removeJournalEntry(before, 'a');
    expect(removed.entries.map(e => e.id)).toEqual(['b']);
    const latest = {...removed, entries: [...removed.entries, entry('c', '2026-11-03T08:00:00.000Z')]} as Journal;
    const back = restoreJournalEntry(latest, before.entries[0]!);
    expect(back.entries.map(e => e.id)).toEqual(['a', 'b', 'c']);
    expect(restoreJournalEntry(back, before.entries[0]!)).toBe(back);
    expect(restoreJournalEntry(removed, before.entries[0]!)).toEqual(before);
    expect(() => journalSchema.parse(back)).not.toThrow();
  });
});
