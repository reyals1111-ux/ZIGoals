import {describe, expect, test} from 'vitest';
import {MAX_JOURNAL_ROWS, hasJournalIn, journalReport} from './report';
import {journalSchema} from './schema';

/** Session AV lane 2 (journal; LEDGER #177, Daylio's PDF export): the report's Journal section, pure. */
const j = journalSchema.parse({version: 1, shareWithAi: false, followUps: true, journals: [{id: 'j-runs0001', name: 'Fictional runs', theme: 'teal'}], entries: [
  {id: 'b', date: '2026-11-03', text: 'Second, as written.', createdAt: '2026-11-03T20:00:00.000Z', tags: ['work']},
  {id: 'a', date: '2026-11-02', text: 'First fictional day.', createdAt: '2026-11-02T20:00:00.000Z', journal: 'j-runs0001'},
  {id: 'c', date: '2026-10-01', text: 'Outside the dates.', createdAt: '2026-10-01T20:00:00.000Z'}]});
const energy = {days: {'2026-11-02': {energy: 4}}, words: {'2026-11-03': {energy: 'low', pleasantness: 'unpleasant', word: 'tired', at: '2026-11-03T20:00:00.000Z'}}};
describe('the Journal section of the report', () => {
  test('the entries in the dates, oldest first, as written, with journal, tags, the day’s feeling word and energy', () => {
    expect(journalReport(j, {from: '2026-11-01', to: '2026-11-30'}, energy)).toEqual({days: 2, more: 0, rows: [
      {date: '2026-11-02', text: 'First fictional day.', tags: [], journal: 'Fictional runs', feeling: null, energy: 4},
      {date: '2026-11-03', text: 'Second, as written.', tags: ['work'], journal: null, feeling: 'tired', energy: null}]});
    expect(hasJournalIn(j, {from: '2026-11-01', to: '2026-11-30'})).toBe(true);
    expect(hasJournalIn(j, {from: '2026-12-01', to: '2026-12-30'})).toBe(false);
    expect(journalReport(j, {from: '2026-12-01', to: '2026-12-31'}, null)).toEqual({rows: [], more: 0, days: 0});
  });
  test('at most 120 entries; the rest are counted', () => {
    const many = journalSchema.parse({...j, entries: Array.from({length: 130}, (_, i) => ({id: `e${i}`, date: '2026-11-05', text: `Entry ${i}`, createdAt: `2026-11-05T10:${String(i % 60).padStart(2, '0')}:00.000Z`}))});
    const r = journalReport(many, {from: '2026-11-01', to: '2026-11-30'}, null);
    expect(r.rows).toHaveLength(MAX_JOURNAL_ROWS); expect(r.more).toBe(10);
  });
});
