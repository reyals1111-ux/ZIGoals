import {describe, expect, test} from 'vitest';
import {starEntry, starredCount} from './favourites';
import {moodChoices} from './mood-filter';
import {filterEntries} from './search';
import {journalSchema} from './schema';

/**
 * Session AV lane 2 (r4-mind; LEDGER #310, Journey's favourites, search by mood and sort): starring an entry and taking
 * the star off, the moods the list can show (each with its days that hold an entry), and the list's filter by favourite,
 * by those days and oldest first.
 */
const AT = '2026-11-20T09:00:00.000Z';
const journal = journalSchema.parse({version: 1, shareWithAi: false, followUps: true, entries: [
  {id: 'a', date: '2026-11-18', text: 'A fictional calm morning.', createdAt: '2026-11-18T09:00:00.000Z'},
  {id: 'b', date: '2026-11-19', text: 'A fictional busy day.', createdAt: '2026-11-19T09:00:00.000Z'},
  {id: 'c', date: '2026-11-20', text: 'A fictional walk.', createdAt: AT},
]});
const feelings = {words: {
  '2026-11-18': {energy: 'low', pleasantness: 'pleasant', word: 'calm', at: AT, more: [{energy: 'high', pleasantness: 'pleasant', word: 'curious'}]},
  '2026-11-19': {energy: 'high', pleasantness: 'unpleasant', word: 'stressed', at: AT},
  '2026-11-20': {energy: 'low', pleasantness: 'pleasant', word: 'calm', at: AT},
  '2026-10-01': {energy: 'low', pleasantness: 'pleasant', word: 'rested', at: AT}, // no entry that day: no choice
}};
const MOOD_WORDS = ['awful', 'bad', 'okay', 'good', 'great'];
describe('the star', () => {
  test('on and off; other entries untouched; a gone entry says so', () => {
    const on = starEntry(journal, 'b', true);
    expect(on.entries.map(e => e.star ?? null)).toEqual([null, true, null]);
    expect(starredCount(on.entries)).toBe(1);
    const off = starEntry(on, 'b', false);
    expect(off.entries[1]).toEqual(journal.entries[1]);
    expect(() => starEntry(journal, 'gone', true)).toThrow('no longer on this device');
  });
});
describe('the moods to choose from', () => {
  test('a mood 1–5 in the person’s words, pleasant and unpleasant, then each feeling word, the most used first; only days with an entry', () => {
    const c = moodChoices(journal.entries, {'2026-11-18': 4, '2026-11-20': 4, '2026-11-19': 2, '2026-11-01': 5}, feelings, MOOD_WORDS);
    expect(c.map(x => [x.label, x.days.length])).toEqual([['Mood 4 · good', 2], ['Mood 2 · bad', 1], ['Pleasant feelings', 2], ['Unpleasant feelings', 1], ['Feeling: calm', 2], ['Feeling: curious', 1], ['Feeling: stressed', 1]]);
    expect(c.find(x => x.value === 'word:curious')!.days).toEqual(['2026-11-18']);
  });
  test('nothing rated: no choices', () => {
    expect(moodChoices(journal.entries, {}, null, MOOD_WORDS)).toEqual([]);
  });
});
describe('the list', () => {
  test('favourites only, a mood’s days, and oldest first', () => {
    const j = starEntry(starEntry(journal, 'a', true), 'c', true), today = '2026-11-22';
    expect(filterEntries(j, {}, today).map(e => e.id)).toEqual(['c', 'b', 'a']);
    expect(filterEntries(j, {order: 'oldest'}, today).map(e => e.id)).toEqual(['a', 'b', 'c']);
    expect(filterEntries(j, {star: true}, today).map(e => e.id)).toEqual(['c', 'a']);
    expect(filterEntries(j, {days: new Set(['2026-11-19', '2026-11-20'])}, today).map(e => e.id)).toEqual(['c', 'b']);
    expect(filterEntries(j, {star: true, days: new Set(['2026-11-19', '2026-11-20']), order: 'oldest'}, today).map(e => e.id)).toEqual(['c']);
  });
});
