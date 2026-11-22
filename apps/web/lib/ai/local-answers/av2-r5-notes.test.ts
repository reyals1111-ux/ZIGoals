import {describe, expect, test} from 'vitest';
import type {ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_R5_NOTES} from '../evals/as/cases-av2-r5-notes';
import {CORPUS} from '../evals/as/cases';
import {av2R5NotesAnswer} from './av2-r5-notes';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (r5-notes): NOVA's and ZIGi's on-device answers to round 5's notes features, in English and Dutch,
 * from the Showcase and a fresh profile; notes only under NOVA's Notes scope, never a locked note, never a note's words
 * (a card is counted, never quoted).
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const nova = (q: string, s: ToolSources = showcaseAll()) => av2R5NotesAnswer(q, novaEnv(s));
const zigi = (q: string, s: ToolSources = showcaseAll()) => av2R5NotesAnswer(q, zigiEnv(s));
const stamp = `${DAY}T08:00:00.000Z`;
const withNotes = (notes: unknown[], extra: Record<string, unknown> = {}): ToolSources => { const s = showcaseAll(); s.nova = {...s.nova, notes: {version: 1, voice: false, notes, ...extra} as never}; return s; };

describe('every corpus question gets its own answer, in its language, from NOVA and ZIGi', () => {
  for (const c of AV2_R5_NOTES) test(c.id, () => {
    for (const [lang, questions] of [['en', c.en], ['nl', c.nl]] as const) for (const q of questions) for (const ask of [nova, zigi]) {
      const r = ask(q);
      expect(r, q).not.toBeNull();
      expect(r!.kind, q).toBe('answer');
      expect(text(r).length, q).toBeGreaterThan(20);
      if (lang === 'nl') expect(text(r), q).toMatch(/\b(?:je|jouw|er|nog|geen|staat|op|het|de|een|van|met|om|is)\b/);
    }
  });
  test('each question gets the answer of its own intent', () => {
    const first = (id: string, lang: 'en' | 'nl' = 'en') => { const c = AV2_R5_NOTES.find(x => x.id === id)!; return [...c[lang]].map(q => text(nova(q))); };
    const all = (id: string, re: RegExp) => { for (const t of [...first(id), ...first(id, 'nl')]) expect(t, id).toMatch(re); };
    all('av2r5-trash', /Recently deleted/);
    all('av2r5-several', /Select/);
    all('av2r5-unlinked', /Mentioned without a link/);
    all('av2r5-embed', /!\[\[/);
    all('av2r5-tag-templates', /Templates for tags|template|sjabloon/);
    all('av2r5-tables', /Change a table/);
    all('av2r5-event-note', /Notes for this event/);
    all('av2r5-daily-range', /Daily notes from/);
    all('av2r5-look', /Look/);
    all('av2r5-cards', /Review cards/);
    all('av2r5-task-files', /Add a file/);
  });
  test('other questions are not these answers', () => {
    for (const q of ['which notes are archived', 'how do I lock a note', 'which tasks are due today', 'can I add a photo to a task', 'how many photos are on my tasks', 'which tags do my notes have', 'welke tags hebben mijn notities', 'how do I find and replace in a note', 'what did I write in my journal yesterday', 'log 500 ml water']) expect(nova(q), q).toBeNull();
  });
  test('no question of today’s corpus is answered here (wiring it first moves nothing)', () => {
    const taken: string[] = [], n = novaEnv(showcaseAll()), z = zigiEnv(showcaseAll());
    // Session AV lane 2 (the lead added AV2_R5_NOTES to CORPUS, deliberate): its own intents are its to answer; every other
    // intent of the corpus must still be left alone.
    const own = new Set(AV2_R5_NOTES.map(c => c.id));
    for (const c of CORPUS.filter(x => !own.has(x.id))) for (const q of [...c.en, ...c.nl]) if (av2R5NotesAnswer(q, n) || av2R5NotesAnswer(q, z)) taken.push(`${c.id}: ${q}`);
    expect(taken).toEqual([]);
  }, 120_000);
});
describe('what the notes hold, under NOVA’s Notes scope', () => {
  const notes = [
    {id: 'a', kind: 'topic', title: 'Fictional Spanish', body: '- hola :: hello\n- gracias :: thank you', createdAt: stamp},
    {id: 'c', kind: 'topic', title: 'Fictional diary', body: 'secret q :: secret a', createdAt: stamp, locked: true}];
  const trash = [{id: 't1', kind: 'topic', title: 'Fictional old list', body: 'Gone words.', createdAt: stamp, deletedAt: stamp}, {id: 't2', kind: 'topic', title: 'Fictional hidden', body: 'x', locked: true, createdAt: stamp, deletedAt: stamp}];
  test('Recently deleted: counted, named when not locked, never its words', () => {
    const t = text(nova('which notes are in recently deleted', withNotes(notes, {trash})));
    expect(t).toBe('2 notes wait in Recently deleted: “Fictional old list”. Each stays 30 days from when it was deleted; Notes → Notes → Recently deleted → Restore brings one back, and Empty now removes them for good.');
    expect(t).not.toMatch(/Gone words|hidden/);
    expect(text(nova('welke notities zijn verwijderd', withNotes(notes, {trash})))).toMatch(/^2 notities wachten in Recently deleted/);
    expect(text(nova('which notes are in recently deleted', freshAll()))).toMatch(/^Recently deleted is empty\./);
  });
  test('cards counted by note, never quoted; a locked note’s cards never', () => {
    const t = text(nova('how many flashcards do I have in my notes', withNotes(notes)));
    expect(t).toBe('2 cards in your notes: “Fictional Spanish” (2). Notes → Notes → Review cards shows the ones due today, one at a time; no streak, stop whenever you like.');
    expect(t).not.toMatch(/hola|hello|secret|diary/);
  });
  test('templates for tags listed; ZIGi does not read notes', () => {
    expect(text(nova('which tags have a template', withNotes(notes, {tagTemplates: [{tag: 'meeting', body: 'secret words'}]})))).toBe('1 tag has a template: #meeting. A new, still empty note given one of them starts from its words; New #meeting note makes one at once.');
    expect(text(zigi('which tags have a template', withNotes(notes)))).toMatch(/^ZIGi doesn’t read your notes\./);
  });
});
