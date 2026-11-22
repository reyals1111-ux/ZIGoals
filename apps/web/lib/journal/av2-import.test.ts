import {describe, expect, test} from 'vitest';
import {applyJournalImport, dayInLine, dayOneWords, htmlWords, planJournalImport, readDayOneJson, readTextFile, undoJournalImport} from './import';
import {journalExportFiles} from './export';
import {emptyJournal, journalSchema, type Journal} from './schema';
import {addBook, moveEntry} from './books';

/** Session AV lane 2 (journal; LEDGER #44, Day One's imports and the journal's own export), pure. */
const TODAY = '2026-11-23';
const dayOne = (entries: unknown[]) => JSON.stringify({metadata: {version: '1.0'}, entries});

describe('reading a Day One export', () => {
  test('its day in its own time zone, words without photo markers or escapes, tags, photos and audio by file', () => {
    const r = readDayOneJson({name: 'Travel.json', text: dayOne([
      {uuid: 'A1', creationDate: '2026-11-02T23:30:00Z', timeZone: 'Europe/Amsterdam', text: 'Fictional dinner in Lisbon\\.\n\n![](dayone-moment://ABC123)\n\nGood\\!', tags: ['travel', 'Food'], photos: [{md5: 'aa11', type: 'jpeg', identifier: 'ABC123'}], audios: [{md5: 'bb22', format: 'm4a', duration: 41.7}]},
      {uuid: 'A2', creationDate: 'not a date', text: 'x'},
      {uuid: 'A3', creationDate: '2026-11-04T10:00:00Z', text: ''},
    ])}, 'UTC');
    expect(r.book).toBe('Travel');
    expect(r.entries).toEqual([{date: '2026-11-03', text: 'Fictional dinner in Lisbon.\n\nGood!', createdAt: '2026-11-02T23:30:00.000Z', tags: ['travel', 'Food'], book: 'Travel', source: 'dayone', photos: ['photos/aa11.jpeg'], audio: [{file: 'audios/bb22.m4a', seconds: 42}]}]);
    expect(r.skipped.map(s => s.reason)).toEqual(['it has no date ZIGoals can read', 'it has no words, photo or audio']);
    expect(readDayOneJson({name: 'Journal.json', text: dayOne([])}).book).toBeNull();
    expect(readDayOneJson({name: 'x.json', text: '{nope'}).skipped[0]!.reason).toContain('not a JSON file');
    expect(dayOneWords('![](dayone-moment:/video/X)Done\\-ish')).toBe('Done-ish');
  });
});

describe('reading Markdown, text and HTML', () => {
  test('one entry per file, its day from front matter, the file name or the first line; tags from front matter', () => {
    expect(readTextFile({name: 'notes/2026-10-01 walk.md', text: 'A fictional walk.'}, TODAY).entries[0]).toMatchObject({date: '2026-10-01', text: 'A fictional walk.', source: 'markdown'});
    expect(readTextFile({name: 'any.md', text: '---\ndate: 2026-09-12\ntags: [calm, home]\n---\nQuiet day.'}, TODAY).entries[0]).toMatchObject({date: '2026-09-12', tags: ['calm', 'home'], text: 'Quiet day.'});
    expect(readTextFile({name: 'day.txt', text: '3 November 2025\nA fictional rainy day.'}, TODAY).entries[0]).toMatchObject({date: '2025-11-03', text: 'A fictional rainy day.', source: 'text'});
    expect(readTextFile({name: 'undated.txt', text: 'No day anywhere.'}, TODAY).entries[0]!.date).toBe(TODAY);
  });
  test('one entry per dated heading', () => {
    const r = readTextFile({name: 'diary.md', text: '# My diary\n\n## 2026-11-01\nFirst fictional day.\n\n## Monday, 2 November 2026\nSecond fictional day.\n'}, TODAY);
    expect(r.entries.map(e => [e.date, e.text])).toEqual([['2026-11-01', 'First fictional day.'], ['2026-11-02', 'Second fictional day.'], [TODAY, '# My diary']]);
  });
  test('an HTML page’s words; dates in lines', () => {
    expect(htmlWords('<html><head><style>p{}</style></head><body><h1>Tuesday 3 November 2026</h1><p>A fictional <b>bright</b> day &amp; a walk.</p><p>Second line.</p></body></html>')).toBe('Tuesday 3 November 2026\nA fictional bright day & a walk.\nSecond line.');
    const plan = planJournalImport(emptyJournal(), [{name: 'Entries/entry.html', text: '<body><div>Tuesday, 3 November 2026</div><p>A fictional bright day.</p></body>'}], {today: TODAY});
    expect(plan.entries.map(e => [e.date, e.text])).toEqual([['2026-11-03', 'A fictional bright day.']]);
    expect(dayInLine('November 3, 2026')).toBe('2026-11-03'); expect(dayInLine('3-11-2026')).toBe('2026-11-03'); expect(dayInLine('31 februari 2026')).toBeNull();
  });
});

describe('the plan, applying it, its Undo, and the round trip through the journal’s own export', () => {
  const existing = (): Journal => journalSchema.parse({...emptyJournal(), entries: [{id: 'own1', date: '2026-11-01', text: 'First fictional day.', createdAt: '2026-11-01T20:00:00.000Z'}]});
  test('an entry already in the journal, twice in the files, or still to come is left out and said', () => {
    const plan = planJournalImport(existing(), [{name: 'a.md', text: '## 2026-11-01\nFirst fictional day.\n## 2026-11-02\nSecond.\n'}, {name: 'b.md', text: '## 2026-11-02\nSecond.\n## 2026-12-25\nLater.\n'}], {today: TODAY});
    expect(plan.entries.map(e => e.date)).toEqual(['2026-11-02']);
    expect(plan.skipped.map(s => s.reason)).toEqual(['it is already in your journal', 'it is already in your journal', 'its day is still to come']);
    expect(planJournalImport(existing(), [{name: 'x.pdf', text: ''}], {today: TODAY}).skipped[0]!.reason).toContain('not a journal file');
  });
  test('applied with journals made and media ids kept, each entry marked imported; Undo takes them and the journals away', () => {
    const plan = planJournalImport(existing(), [{name: 'Travel.json', text: dayOne([{creationDate: '2026-11-05T09:00:00Z', text: 'Fictional train.', photos: [{md5: 'p1', type: 'jpeg'}]}])}], {today: TODAY, zone: 'UTC'});
    expect(plan.books).toEqual(['Travel']);
    let n = 0;
    const {journal, undo} = applyJournalImport(existing(), plan, new Map([['photos/p1.jpeg', 'm-kept000001']]), () => `imp${++n}`);
    expect(journal.journals!.map(b => b.name)).toEqual(['Travel']);
    expect(journal.entries.at(-1)).toMatchObject({id: 'imp1', date: '2026-11-05', text: 'Fictional train.', photos: ['m-kept000001'], imported: 'dayone', journal: journal.journals![0]!.id});
    expect(undo).toEqual({entries: ['imp1'], books: [journal.journals![0]!.id], media: ['m-kept000001']});
    expect(undoJournalImport(journal, undo)).toEqual({...existing(), journals: []});
  });
  test('the journal’s own export reads back as it left: days, words, tags, journals, questions and media names', () => {
    let j = journalSchema.parse({...emptyJournal(), entries: [
      {id: 'e1', date: '2026-11-02', text: 'A fictional late evening.', createdAt: '2026-11-02T23:30:00.000Z', tags: ['late'], photos: ['m-photo0001'], audio: [{id: 'm-audio0001', seconds: 12}], followUp: {question: 'What helped?', from: 'device', answer: 'Tea.'}},
      {id: 'e2', date: '2026-11-03', text: 'Second fictional day.', createdAt: '2026-11-03T08:00:00.000Z', template: 'gratitude'}]});
    j = moveEntry(addBook(j, {name: 'Fictional nights', theme: 'teal'}, 'j-nights01').journal, 'e1', 'j-nights01');
    const files = journalExportFiles(j, new Map([['m-photo0001', {data: new Uint8Array([1]), type: 'image/webp'}], ['m-audio0001', {data: new Uint8Array([2]), type: 'audio/webm'}]]), {now: new Date('2026-11-23T10:00:00.000Z')});
    expect(files.map(f => f.name)).toEqual(['journal.json', 'README.txt', 'photos/m-photo0001.webp', 'audios/m-audio0001.webm']);
    const plan = planJournalImport(emptyJournal(), [{name: 'journal.json', text: files[0]!.data as string}], {today: TODAY, zone: 'Pacific/Auckland'});
    expect(plan.books).toEqual(['Fictional nights']);
    expect(plan.entries).toEqual([
      {date: '2026-11-02', text: 'A fictional late evening.', createdAt: '2026-11-02T23:30:00.000Z', tags: ['late'], book: 'Fictional nights', followUp: {question: 'What helped?', answer: 'Tea.'}, source: 'dayone', photos: ['photos/m-photo0001.webp'], audio: [{file: 'audios/m-audio0001.webm', seconds: 12}]},
      {date: '2026-11-03', text: 'Second fictional day.', createdAt: '2026-11-03T08:00:00.000Z', template: 'gratitude', source: 'dayone', photos: [], audio: []}]);
    const back = applyJournalImport(emptyJournal(), plan, new Map([['photos/m-photo0001.webp', 'm-photo0001'], ['audios/m-audio0001.webm', 'm-audio0001']]), () => 'x').journal;
    expect(back.entries[0]).toMatchObject({date: '2026-11-02', photos: ['m-photo0001'], audio: [{id: 'm-audio0001', seconds: 12}], followUp: {question: 'What helped?', from: 'device', answer: 'Tea.'}, tags: ['late']});
    expect(back.journals!.map(b => b.name)).toEqual(['Fictional nights']);
  });
});
