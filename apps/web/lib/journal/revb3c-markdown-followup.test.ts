import {describe, expect, test} from 'vitest';
import {entryMarkdown, followUpOfQuote, followUpQuote, journalExportFiles} from './export';
import {applyJournalImport, planJournalImport} from './import';
import {emptyJournal, journalSchema} from './schema';
import {parseFrontMatter} from '../notes/markdown';

/**
 * Session AV lane 2 (review B3C-5): the Markdown files carry ZIGi's follow-up as a quote block that Import takes back
 * off the words, so importing the files into the journal they came from doubles nothing, and into an empty journal the
 * follow-up comes back as the follow-up. Fictional entries.
 */
const j = journalSchema.parse({version: 1, shareWithAi: false, followUps: true, entries: [
  {id: 'e1', date: '2026-11-20', text: 'A fictional walk in the rain.', createdAt: '2026-11-20T20:00:00.000Z', followUp: {question: 'What did the rain change?', from: 'device', answer: 'Fictionally, my mood.\nAnd my plans.'}},
  {id: 'e2', date: '2026-11-21', text: 'A fictional quiet day.\n\n> A line I quoted myself.', createdAt: '2026-11-21T20:00:00.000Z', followUp: {question: 'What made it quiet?', from: 'device'}},
  {id: 'e3', date: '2026-11-22', text: 'A fictional entry without a question.\n\n> Its own quote at the end.', createdAt: '2026-11-22T20:00:00.000Z'}]});
const md = () => journalExportFiles(j, new Map(), {now: new Date('2026-11-22T22:00:00.000Z')}).filter(f => f.name.startsWith('Markdown/')).map(f => ({name: f.name, text: f.data as string}));

describe('the follow-up in a Markdown file', () => {
  test('written after the words as a quote block, every line marked, and said in the front matter', () => {
    const file = entryMarkdown(j, j.entries[0]!), {data, body} = parseFrontMatter(file);
    expect(data['follow-up']).toBe('quote');
    expect(body).toBe('A fictional walk in the rain.\n\n> What did the rain change?\n>\n> Fictionally, my mood.\n> And my plans.\n');
    expect(parseFrontMatter(entryMarkdown(j, j.entries[2]!)).data['follow-up']).toBeUndefined();
  });
  test('read back off the words: the question and the answer, the words as they were', () => {
    expect(followUpOfQuote(`A day.\n\n${followUpQuote({question: 'Why?', answer: 'Because.\n\nTwo lines.'})}\n`)).toEqual({text: 'A day.', followUp: {question: 'Why?', answer: 'Because.\n\nTwo lines.'}});
    expect(followUpOfQuote('A day without a quote.')).toBeNull();
  });
  test('into the journal they came from: every entry is already there, none doubles', () => {
    const plan = planJournalImport(j, md(), {today: '2026-11-23'});
    expect(plan.entries).toEqual([]);
    expect(plan.skipped.map(s => s.reason)).toEqual(['it is already in your journal', 'it is already in your journal', 'it is already in your journal']);
  });
  test('into an empty journal: the words as they were and the follow-up as the follow-up', () => {
    const plan = planJournalImport(emptyJournal(), md(), {today: '2026-11-23'});
    expect(plan.entries.map(e => ({text: e.text, followUp: e.followUp}))).toEqual([
      {text: 'A fictional walk in the rain.', followUp: {question: 'What did the rain change?', answer: 'Fictionally, my mood.\nAnd my plans.'}},
      {text: 'A fictional quiet day.\n\n> A line I quoted myself.', followUp: {question: 'What made it quiet?'}},
      {text: 'A fictional entry without a question.\n\n> Its own quote at the end.', followUp: undefined}]);
    const back = applyJournalImport(emptyJournal(), plan, new Map(), () => crypto.randomUUID()).journal;
    expect(back.entries.map(e => [e.text, e.followUp?.question, e.followUp?.answer])).toEqual(j.entries.map(e => [e.text, e.followUp?.question, e.followUp?.answer]));
    // And a second import of the same files doubles nothing.
    expect(planJournalImport(back, md(), {today: '2026-11-23'}).entries).toEqual([]);
  });
  test('an entry changed here since the export is still known by its day and creation time', () => {
    const changed = {...j, entries: j.entries.map(e => e.id === 'e1' ? {...e, text: 'A fictional walk, words changed.'} : e)};
    expect(planJournalImport(changed, md(), {today: '2026-11-23'}).entries).toEqual([]);
  });
  test('another app’s file ending in a quote keeps its quote as words', () => {
    const plan = planJournalImport(emptyJournal(), [{name: 'other.md', text: '---\ndate: 2026-11-03\nfollow-up: quote\n---\nA fictional day.\n\n> A quote.'}], {today: '2026-11-23'});
    expect(plan.entries[0]).toMatchObject({text: 'A fictional day.\n\n> A quote.'});
    expect(plan.entries[0]!.followUp).toBeUndefined();
  });
});
