import {describe, expect, test} from 'vitest';
import {entryMarkdown, journalExportFiles} from './export';
import {applyJournalImport, planJournalImport} from './import';
import {emptyJournal, journalSchema} from './schema';
import {parseFrontMatter} from '../notes/markdown';

/**
 * Session AV lane 2 (r3-notes; LEDGER #272, Grid Diary's Markdown export): one .md file per entry, its day, journal and
 * tags in front matter and its photos named beside it; the round-3 fields (period, night, opensOn) travel in both the
 * JSON and the Markdown and read back.
 */
const j = journalSchema.parse({version: 1, shareWithAi: false, followUps: true, journals: [{id: 'j-dreams', name: 'Dreams', theme: 'violet'}], entries: [
  {id: 'e1', date: '2026-11-21', text: 'A fictional dream about the sea.', createdAt: '2026-11-21T07:00:00.000Z', journal: 'j-dreams', night: '2026-11-21', tags: ['sea'], photos: ['m-photo0001']},
  {id: 'e2', date: '2026-11-22', text: 'What went well this week:\nFictional runs.', createdAt: '2026-11-22T20:00:00.000Z', template: 'week-look-back', period: '2026-W47'},
  {id: 'e3', date: '2026-11-22', text: 'Dear future me, a fictional letter.', createdAt: '2026-11-22T21:00:00.000Z', opensOn: '2027-11-22'}]});
const files = journalExportFiles(j, new Map([['m-photo0001', {data: new Uint8Array([1]), type: 'image/webp'}]]), {now: new Date('2026-11-22T22:00:00.000Z')});
describe('the journal as Markdown files', () => {
  test('one file per entry in Markdown/, named by day and first words', () => {
    expect(files.map(f => f.name)).toEqual(['journal.json', 'README.txt', 'photos/m-photo0001.webp', 'Markdown/2026-11-21 A fictional dream about the sea.md', 'Markdown/2026-11-22 What went well this week.md', 'Markdown/2026-11-22 Dear future me, a fictional letter.md']);
    expect(files[1]!.data).toContain('Markdown/ holds each entry as its own .md file');
  });
  test('front matter: day, journal, tags, period, night, opening day; the words as written; the photo beside it', () => {
    const md = files[3]!.data as string, {data, body} = parseFrontMatter(md);
    expect(data).toMatchObject({date: '2026-11-21', journal: 'Dreams', tags: ['sea'], night: '2026-11-21', app: 'ZIGoals', 'zigoals-id': 'e1'});
    expect(body).toBe('A fictional dream about the sea.\n\n![Photo](../photos/m-photo0001.webp)\n');
    expect(parseFrontMatter(files[4]!.data as string).data).toMatchObject({template: 'week-look-back', period: '2026-W47', journal: 'Journal'});
    expect(parseFrontMatter(entryMarkdown(j, j.entries[2]!)).data['opens-on']).toBe('2027-11-22');
  });
  test('the Markdown files alone import back with their journal, template and round-3 fields', () => {
    const plan = planJournalImport(emptyJournal(), files.filter(f => f.name.startsWith('Markdown/')).map(f => ({name: f.name, text: f.data as string})), {today: '2026-11-23'});
    expect(plan.entries.map(e => ({date: e.date, text: e.text, book: e.book, template: e.template, extra: e.extra, createdAt: e.createdAt}))).toEqual([
      {date: '2026-11-21', text: 'A fictional dream about the sea.', book: 'Dreams', template: undefined, extra: {night: '2026-11-21'}, createdAt: '2026-11-21T07:00:00.000Z'},
      {date: '2026-11-22', text: 'What went well this week:\nFictional runs.', book: undefined, template: 'week-look-back', extra: {period: '2026-W47'}, createdAt: '2026-11-22T20:00:00.000Z'},
      {date: '2026-11-22', text: 'Dear future me, a fictional letter.', book: undefined, template: undefined, extra: {opensOn: '2027-11-22'}, createdAt: '2026-11-22T21:00:00.000Z'}]);
    const back = applyJournalImport(emptyJournal(), plan, new Map(), () => 'x').journal;
    expect(back.entries.map(e => [e.night, e.period, e.opensOn])).toEqual([['2026-11-21', undefined, undefined], [undefined, '2026-W47', undefined], [undefined, undefined, '2027-11-22']]);
  });
  test('journal.json carries them too', () => {
    const plan = planJournalImport(emptyJournal(), [{name: 'journal.json', text: files[0]!.data as string}], {today: '2026-11-23', zone: 'UTC'});
    expect(plan.entries.map(e => e.extra)).toEqual([{night: '2026-11-21'}, {period: '2026-W47'}, {opensOn: '2027-11-22'}]);
  });
  test('another app’s Markdown front matter is read as before (no ZIGoals fields)', () => {
    const plan = planJournalImport(emptyJournal(), [{name: 'note.md', text: '---\ndate: 2026-11-03\njournal: Mine\nperiod: 2026-11\n---\nA fictional day.'}], {today: '2026-11-23'});
    expect(plan.entries[0]).toMatchObject({date: '2026-11-03', text: 'A fictional day.'});
    expect(plan.entries[0]!.extra).toBeUndefined(); expect(plan.entries[0]!.book).toBeUndefined();
  });
});
