import {describe, expect, test} from 'vitest';
import {emptyJournal} from './schema';
import {planJournalImport, readJourneyJson} from './import';

/**
 * Review b6n B6N-5 (Minor; LEDGER #410): a Journey entry whose time is outside the calendar (above 8.64e15 ms) is left
 * out and counted with its reason; the other entries are still offered, and a bad "modified" time is simply not kept.
 */
const good = {text: 'A fictional good day.', date_journal: Date.UTC(2026, 10, 3, 9), timezone: 'UTC'};
describe('B6N-5 a bad Journey date skips that entry only', () => {
  test('one entry outside the calendar: skipped and said; the good one planned', () => {
    const r = readJourneyJson({name: 'x.json', text: JSON.stringify([{...good, date_journal: 9e15}, good, {...good, text: 'Another fictional day.', date_modified: 9e15}])}, 'UTC');
    expect(r.skipped).toEqual([{name: 'x.json #1', reason: 'it has no date ZIGoals can read'}]);
    expect(r.entries.map(e => [e.date, e.updatedAt ?? null])).toEqual([['2026-11-03', null], ['2026-11-03', null]]);
  });
  test('the whole plan never fails on it', () => {
    const plan = planJournalImport(emptyJournal(), [{name: 'a.json', text: JSON.stringify({...good, date_journal: 8.7e15})}, {name: 'b.json', text: JSON.stringify(good)}], {today: '2026-11-22', zone: 'UTC'});
    expect(plan.entries).toHaveLength(1);
    expect(plan.skipped.map(s => s.reason)).toEqual(['it has no date ZIGoals can read']);
  });
});
