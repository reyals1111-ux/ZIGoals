import {describe, expect, test} from 'vitest';
import {addDream, dreamNights, dreamsBook, dreamsOf, withDreamsBook} from './dreams';
import {emptyJournal, journalSchema, type Journal} from './schema';

/** Session AV lane 2 (r3-notes; LEDGER #278, Stoic's dream journal): a dream from the sleep log, in a Dreams journal. */
const entry = (id: string, date: string) => ({id, date, text: `A fictional dream ${id}.`, createdAt: `${date}T07:00:00.000Z`});
describe('dreams', () => {
  test('the first dream makes the Dreams journal; the next one uses it', () => {
    const one = addDream(emptyJournal(), entry('d1', '2026-11-21'), '2026-11-21', 'j-dreams01');
    expect(one.made).toBe(true);
    expect(one.journal.journals).toEqual([{id: 'j-dreams01', name: 'Dreams', theme: 'cyan'}]);
    expect(one.journal.entries[0]).toMatchObject({id: 'd1', journal: 'j-dreams01', night: '2026-11-21'});
    const two = addDream(journalSchema.parse(one.journal), entry('d2', '2026-11-22'), '2026-11-22', 'j-other0001');
    expect(two.made).toBe(false);
    expect(two.journal.journals).toHaveLength(1);
    expect(two.journal.entries[1]).toMatchObject({journal: 'j-dreams01', night: '2026-11-22'});
  });
  test('a journal already called Dromen is used; with ten journals and none for dreams, the main Journal', () => {
    const nl: Journal = {...emptyJournal(), journals: [{id: 'j-dromen01', name: 'Dromen', theme: 'teal'}]};
    expect(dreamsBook(nl)?.id).toBe('j-dromen01');
    expect(withDreamsBook(nl).book).toBe('j-dromen01');
    const full: Journal = {...emptyJournal(), journals: Array.from({length: 10}, (_, i) => ({id: `j-book${i}000`, name: `Book ${i}`, theme: 'violet' as const}))};
    const out = addDream(full, entry('d1', '2026-11-21'), '2026-11-21');
    expect(out.made).toBe(false);
    expect(out.journal.entries[0]!.journal).toBeUndefined();
    expect(out.journal.entries[0]!.night).toBe('2026-11-21');
  });
  test('a night’s dreams, and the nights with dreams', () => {
    let j = addDream(emptyJournal(), entry('d1', '2026-11-21'), '2026-11-21', 'j-dreams01').journal;
    j = addDream(j, entry('d2', '2026-11-21'), '2026-11-21').journal;
    j = addDream(j, entry('d3', '2026-11-22'), '2026-11-22').journal;
    expect(dreamsOf(j.entries, '2026-11-21').map(e => e.id)).toEqual(['d1', 'd2']);
    expect(dreamNights(j.entries)).toEqual([{night: '2026-11-22', count: 1}, {night: '2026-11-21', count: 2}]);
    expect(journalSchema.parse(j).entries.map(e => e.night)).toEqual(['2026-11-21', '2026-11-21', '2026-11-22']);
  });
});
