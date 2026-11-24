import {describe, expect, test} from 'vitest';
import {answersTo, promptsUsed, splitAtHeadings} from './prompt-answers';
import {journalSchema} from './schema';
import {showcaseJournal} from './showcase';

/** Session AV lane 2 (r3-notes; LEDGER #265): every answer to one prompt, under each heading, oldest first. */
const at = (d: string) => `${d}T20:00:00.000Z`;
const journal = journalSchema.parse({version: 1, shareWithAi: false, followUps: true,
  templates: [{id: 'own-runs000001', title: 'Fictional run diary', headings: ['How the run went:', 'What I noticed:']}],
  entries: [
    {id: 'b', date: '2026-11-12', createdAt: at('2026-11-12'), template: 'gratitude', text: 'I am grateful for:\nFictional rain.\n\nSomeone I appreciate, and why:\nA fictional neighbour.'},
    {id: 'a', date: '2026-11-10', createdAt: at('2026-11-10'), template: 'gratitude', text: 'Ik ben dankbaar voor:\nFictieve zon.\n\nIemand die ik waardeer, en waarom:\n'},
    {id: 'c', date: '2026-11-14', createdAt: at('2026-11-14'), template: 'gratitude', text: 'Thankful today, written my own way.'},
    {id: 'd', date: '2026-11-15', createdAt: at('2026-11-15'), template: 'own-runs000001', text: 'How the run went: fictional 5 km\nWhat I noticed:\nGeese.'},
    {id: 'e', date: '2026-11-16', createdAt: at('2026-11-16'), text: 'No template.'},
  ]});
describe('every answer to one prompt', () => {
  test('the prompts used, the most used first, with their titles', () => {
    expect(promptsUsed(journal)).toEqual([{id: 'gratitude', title: 'Gratitude', count: 3, own: false}, {id: 'own-runs000001', title: 'Fictional run diary', count: 1, own: true}]);
    expect(promptsUsed(journal, 'nl')[0]!.title).toBe('Dankbaarheid');
  });
  test('answers under each heading, oldest first; Dutch headings read the same; an empty answer is left out', () => {
    const got = answersTo(journal, 'gratitude')!;
    expect(got.entries).toBe(3);
    expect(got.headings).toEqual([
      {heading: 'I am grateful for:', answers: [{entryId: 'a', date: '2026-11-10', words: 'Fictieve zon.'}, {entryId: 'b', date: '2026-11-12', words: 'Fictional rain.'}]},
      {heading: 'Someone I appreciate, and why:', answers: [{entryId: 'b', date: '2026-11-12', words: 'A fictional neighbour.'}]}]);
    expect(got.unsplit.map(e => e.id)).toEqual(['c']);
    expect(answersTo(journal, 'gratitude', 'nl')!.headings[0]!.heading).toBe('Ik ben dankbaar voor:');
  });
  test('a heading with its words on the same line, an own template, and an unknown one', () => {
    expect(answersTo(journal, 'own-runs000001')!.headings.map(h => h.answers.map(a => a.words))).toEqual([['fictional 5 km'], ['Geese.']]);
    expect(splitAtHeadings('A good thing today: tea\nAnother good thing: a walk', [['A good thing today:'], ['Another good thing:']])).toEqual([{at: 0, words: 'tea'}, {at: 1, words: 'a walk'}]);
    expect(answersTo(journal, 'no-such-template')).toBeNull();
  });
  test('the Showcase’s three good things entry splits under its headings', () => {
    const got = answersTo(showcaseJournal('2026-11-17'), 'three-good-things')!;
    expect(got.headings.map(h => h.answers.length)).toEqual([1, 1, 1]);
    expect(got.headings[0]!.answers[0]!.words).toBe('a quiet Sunday morning');
  });
});
