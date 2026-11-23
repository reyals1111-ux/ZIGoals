import {describe, expect, test} from 'vitest';
import {journalSchema} from './schema';
import {offeredPeople} from './people';

/**
 * Review b6n B6N-2 (Blocker, privacy; LEDGER #401): the names offered again under "Who was there" are counted over the
 * entries that are not letters still folded away, so a sealed letter's names never show before its day (even one read
 * early, or imported with its names); on its day they are offered like any other.
 */
const AT = '2026-11-20T09:00:00.000Z';
const journal = journalSchema.parse({version: 1, shareWithAi: false, followUps: true, entries: [
  {id: 'a', date: '2026-11-20', text: 'A fictional walk.', createdAt: AT, people: ['Fictional Anna']},
  {id: 'l', date: '2026-11-21', text: 'A fictional letter.', createdAt: AT, people: ['Fictional Secret', 'Fictional Anna'], opensOn: '2027-01-01'}]});
describe('B6N-2 the offered names', () => {
  test('never a name from a letter still folded away', () => {
    expect(offeredPeople(journal.entries, '2026-11-22')).toEqual(['Fictional Anna']);
  });
  test('on its day the letter’s names are offered too', () => {
    expect(offeredPeople(journal.entries, '2027-01-01')).toEqual(['Fictional Anna', 'Fictional Secret']);
  });
});
