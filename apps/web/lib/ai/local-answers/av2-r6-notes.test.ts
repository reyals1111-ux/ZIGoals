import {describe, expect, test} from 'vitest';
import type {ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_R6_NOTES} from '../evals/as/cases-av2-r6-notes';
import {CORPUS} from '../evals/as/cases';
import {av2R6NotesAnswer} from './av2-r6-notes';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (r6-notes): NOVA's and ZIGi's on-device answers to round 6's notes and journal features, in English
 * and Dutch, from the Showcase and a fresh profile; notes only under NOVA's Notes scope, never a locked note or a note's
 * words; the journal only where it is shared, never a letter still folded away or an entry's words.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const nova = (q: string, s: ToolSources = showcaseAll()) => av2R6NotesAnswer(q, novaEnv(s));
const zigi = (q: string, s: ToolSources = showcaseAll()) => av2R6NotesAnswer(q, zigiEnv(s));
const stamp = `${DAY}T08:00:00.000Z`;
const withNotes = (notes: unknown[]): ToolSources => { const s = showcaseAll(); s.nova = {...s.nova, notes: {version: 1, voice: false, notes} as never}; return s; };
const withJournal = (entries: unknown[], extra: Record<string, unknown> = {}): ToolSources => { const s = showcaseAll(); s.journal = {version: 1, shareWithAi: false, followUps: true, entries, ...extra} as never; return s; };
const OWN = new Set(AV2_R6_NOTES.map(c => c.id));

describe('every corpus question gets its own answer, in its language, from NOVA and ZIGi', () => {
  for (const c of AV2_R6_NOTES) test(c.id, () => {
    for (const [lang, questions] of [['en', c.en], ['nl', c.nl]] as const) for (const q of questions) for (const ask of [nova, zigi]) {
      const r = ask(q);
      expect(r, q).not.toBeNull();
      expect(r!.kind, q).toBe('answer');
      expect(text(r).length, q).toBeGreaterThan(20);
      if (lang === 'nl') expect(text(r), q).toMatch(/\b(?:je|jouw|er|nog|geen|staat|op|het|de|een|van|met|om|is)\b/);
    }
  });
  test('each question gets the answer of its own intent', () => {
    const all = (id: string, re: RegExp) => { const c = AV2_R6_NOTES.find(x => x.id === id)!; for (const q of [...c.en, ...c.nl]) expect(text(nova(q)), `${id}: ${q}`).toMatch(re); };
    all('av2r6-tag-rename', /Rename or merge a tag/);
    all('av2r6-merge-notes', /Merge into…/);
    all('av2r6-read-back', /Read back|read back|teruggelezen/);
    all('av2r6-prop-sums', /Notes → Notes → Table/);
    all('av2r6-prop-many', /Set a property/);
    all('av2r6-word-goal', /word goal|Daily word goal|woorden per dag/);
    all('av2r6-people', /Who was there|entries|stukken/);
    all('av2r6-any-day', /On this day/);
    all('av2r6-photos', /Photos and voice notes/);
    all('av2r6-sky', /moon|maan/);
    all('av2r6-lock-away', /Lock again after a while away/);
    all('av2r6-imports', /Journey/);
  });
  test('other questions are not these answers', () => {
    for (const q of ['which notes are archived', 'how do I lock a note', 'which tags do my notes have', 'how do I tag several notes at once', 'how do I sort a table in a note', 'what did I write in my journal yesterday', 'what is the weather today', 'how many photos can an entry hold', 'what did I write a year ago', 'log 500 ml water', 'how do I import from day one', 'welke tags hebben mijn notities']) expect(nova(q), q).toBeNull();
  });
  test('no other question of today’s corpus is answered here (wiring it first moves nothing); its own intents are left out', () => {
    const taken: string[] = [], n = novaEnv(showcaseAll()), z = zigiEnv(showcaseAll());
    for (const c of CORPUS) if (!OWN.has(c.id)) for (const q of [...c.en, ...c.nl]) if (av2R6NotesAnswer(q, n) || av2R6NotesAnswer(q, z)) taken.push(`${c.id}: ${q}`);
    expect(taken).toEqual([]);
  }, 120_000);
});
describe('what the notes hold, under NOVA’s Notes scope', () => {
  const notes = [
    {id: 'a', kind: 'topic', title: 'Fictional Rome', body: 'x', props: [{k: 'Budget', t: 'number', v: 300}], createdAt: stamp},
    {id: 'b', kind: 'topic', title: 'Fictional Italy', body: 'y', props: [{k: 'Budget', t: 'number', v: 100}], createdAt: stamp},
    {id: 'l', kind: 'topic', title: 'Fictional secret', body: 'z', locked: true, props: [{k: 'Budget', t: 'number', v: 9000}], createdAt: stamp},
    {id: 'd1', kind: 'daily', title: '2026-11-10', day: '2026-11-10', body: 'A fictional day.', createdAt: stamp},
    {id: 'd2', kind: 'daily', title: '2026-11-12', day: '2026-11-12', body: 'Hidden.', locked: true, createdAt: stamp}];
  test('the sums of a number property: a locked note never counts', () => {
    expect(text(nova('what is the sum of a number property across my notes', withNotes(notes)))).toBe('Budget: 400 in all, 200 on average over 2 notes. Notes → Notes → Table shows these under each Number column for the notes shown (after its filters), and how many are ticked under a Tick column.');
    expect(text(nova('what is the sum of a number property across my notes', freshAll()))).toMatch(/^None of your notes has a Number property yet\./);
  });
  test('daily notes not read back: named by their day, a locked one left out; ZIGi does not read notes', () => {
    const t = text(nova('which daily notes have I not read back yet', withNotes(notes)));
    expect(t).toMatch(/^1 daily note of the last 30 days is not read back yet: /);
    expect(t).not.toMatch(/fictional day|Hidden/i);
    expect(text(zigi('which daily notes have I not read back yet', withNotes(notes)))).toMatch(/^ZIGi doesn’t read your notes\./);
  });
});
describe('what the journal holds, where it is shared', () => {
  const entries = [
    {id: 'a', date: DAY, text: 'one two three four five', createdAt: stamp, people: ['Fictional Anna']},
    {id: 'b', date: '2026-11-16', text: 'A fictional walk.', createdAt: stamp, people: ['Fictional Anna', 'Fictional Bram']},
    {id: 'l', date: '2026-11-15', text: 'A fictional letter.', createdAt: stamp, people: ['Fictional Secret'], opensOn: '2027-06-01'}];
  test('the word goal and today’s words; none set says how', () => {
    expect(text(nova('did I reach my word goal today', withJournal(entries, {wordGoal: 10})))).toBe('Your goal is 10 words a day; today holds 5 so far. The journal calendar marks each day you reached it, and nothing is said on a day you do not.');
    expect(text(nova('did I reach my word goal today', withJournal(entries, {wordGoal: 5})))).toMatch(/^Your goal is 5 words a day, and today holds 5: goal reached\./); // Review B6Q-17: was “they are written”
    expect(text(nova('what is my daily word goal', withJournal(entries)))).toMatch(/^You have no daily word goal\./);
  });
  test('who appears most, never a name from a letter still folded away', () => {
    const t = text(nova('who appears most in my journal entries', withJournal(entries)));
    expect(t).toBe('Most often in your entries: Fictional Anna (2 entries) and Fictional Bram (1 entry). A name under an entry lists every entry with that person.');
    expect(t).not.toMatch(/Secret/);
  });
  test('sunrise and the moon are worked out, never the weather', () => {
    expect(text(nova('what phase is the moon today'))).toMatch(/moon[^.]*(?:crescent|quarter|gibbous|Full moon|New moon), \d+% lit/);
    expect(nova('what is the weather today')).toBeNull();
  });
});
