import {describe, expect, test} from 'vitest';
import {emptyJournal} from './schema';
import {csvDateOrder, planJournalImport, readCsvFile} from './import';

/**
 * Review b6n B6N-8 (Minor; LEDGER #410): a CSV's slash, dot or dash dates are never read in a guessed order without a
 * word. The order comes from the file (month-day-year when every date fits it and some cannot be day-month-year), and the
 * import plan says which order was used — and, when every date fits both, that they could be read two ways and how to
 * write them plainly.
 */
const TODAY = '2026-12-31';
describe('B6N-8 the order of a CSV’s dates, found from the file and said', () => {
  test('a US file (12/25/2026 cannot be day-month-year): read as month-day-year, and said', () => {
    const r = readCsvFile({name: 'us.csv', text: 'date,text\n11/03/2026,A fictional day.\n12/25/2026,A fictional holiday.'}, TODAY);
    expect(r.entries.map(e => e.date)).toEqual(['2026-11-03', '2026-12-25']);
    expect(r.notes).toEqual(['The dates in us.csv were read as month-day-year (12/25/2026 is 2026-12-25), as every one of them fits that order.']);
  });
  test('every date fits both: day-month-year, and the plan says they could be read two ways', () => {
    const r = readCsvFile({name: 'eu.csv', text: 'datum;tekst\n11/03/2026;Een fictieve dag.\n02.04.2026;Nog een.'}, TODAY);
    expect(r.entries.map(e => e.date)).toEqual(['2026-03-11', '2026-04-02']);
    expect(r.notes![0]).toMatch(/^Dates such as 11\/03\/2026 in eu\.csv can be read two ways; they were read as day-month-year \(11\/03\/2026 is 2026-03-11\)\./);
  });
  test('a file that writes days after 12 first: day-month-year, said; a row that fits neither is left out with its reason', () => {
    expect(csvDateOrder(['25/12/2026', '03/11/2026'], 'x.csv')).toEqual({order: 'dmy', note: 'The dates in x.csv were read as day-month-year, as the file writes them.'});
    const r = readCsvFile({name: 'mixed.csv', text: 'date,text\n25/12/2026,Fictional.\n12/25/2026,Fictional too.'}, TODAY);
    expect(r.entries.map(e => e.date)).toEqual(['2026-12-25']);
    expect(r.skipped).toEqual([{name: 'mixed.csv row 3', reason: 'its date cannot be read as day-month-year, as the file\'s other dates are (use 2026-11-03)'}]);
  });
  test('plain dates need no word; the plan carries the words of every file', () => {
    expect(readCsvFile({name: 'iso.csv', text: 'date,text\n2026-11-03,Fictional.'}, TODAY).notes).toBeUndefined();
    const plan = planJournalImport(emptyJournal(), [{name: 'us.csv', text: 'date,text\n12/25/2026,A fictional holiday.'}], {today: TODAY, zone: 'UTC'});
    expect(plan.notes).toEqual(['The dates in us.csv were read as month-day-year (12/25/2026 is 2026-12-25), as every one of them fits that order.']);
  });
});
