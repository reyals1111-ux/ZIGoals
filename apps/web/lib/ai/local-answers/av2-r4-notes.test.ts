import {describe, expect, test} from 'vitest';
import type {ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_R4_NOTES} from '../evals/as/cases-av2-r4-notes';
import {av2R4NotesAnswer} from './av2-r4-notes';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (r4-notes): NOVA's and ZIGi's on-device answers to round 4's notes features, in English and Dutch,
 * from the Showcase and a fresh profile; notes only under NOVA's Notes scope, never a locked note, never a note's words.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const nova = (q: string, s: ToolSources = showcaseAll()) => av2R4NotesAnswer(q, novaEnv(s));
const zigi = (q: string, s: ToolSources = showcaseAll()) => av2R4NotesAnswer(q, zigiEnv(s));
const stamp = `${DAY}T08:00:00.000Z`;
const withNotes = (notes: unknown[], extra: Record<string, unknown> = {}): ToolSources => { const s = showcaseAll(); s.nova = {...s.nova, notes: {version: 1, voice: false, notes, ...extra} as never}; return s; };

describe('every corpus question gets its own answer, in its language, from NOVA and ZIGi', () => {
  for (const c of AV2_R4_NOTES) test(c.id, () => {
    for (const [lang, questions] of [['en', c.en], ['nl', c.nl]] as const) for (const q of questions) for (const ask of [nova, zigi]) {
      const r = ask(q);
      expect(r, q).not.toBeNull();
      expect(r!.kind, q).toBe('answer');
      expect(text(r).length, q).toBeGreaterThan(20);
      if (lang === 'nl') expect(text(r), q).toMatch(/\b(?:je|jouw|er|nog|geen|staat|op|het|de|een|van|met|om|is)\b/);
    }
  });
  test('each question gets the answer of its own intent', () => {
    const first = (id: string) => text(nova(AV2_R4_NOTES.find(c => c.id === id)!.en[0]!));
    expect(first('av2r4-find-replace')).toMatch(/Find and replace/);
    expect(first('av2r4-fold')).toMatch(/Fold all/);
    expect(first('av2r4-callouts')).toMatch(/\[!TIP\]/);
    expect(first('av2r4-writing-view')).toMatch(/Write in full screen/);
    expect(first('av2r4-lock')).toMatch(/Lock this note/);
    expect(first('av2r4-save-note')).toMatch(/Save this note as/);
    expect(first('av2r4-journal-book')).toMatch(/E-book and Word/);
    expect(first('av2r4-imports')).toMatch(/\.enex/);
  });
  test('other questions are not these answers', () => {
    for (const q of ['what is my writing streak', 'which tasks are due today', 'log 500 ml water', 'which tick boxes are open in my notes', 'how is the bear market this year', 'how many words did I write in my journal', 'which tags do my notes have', 'welke tags hebben mijn notities']) expect(nova(q), q).toBeNull();
  });
});
describe('what the notes hold, under NOVA’s Notes scope', () => {
  const notes = [
    {id: 'a', kind: 'topic', title: 'Fictional standup', body: 'From the #work/meetings call. Fictional private words.', createdAt: stamp, photoId: 'p-1', photos: ['p-2']},
    {id: 'b', kind: 'topic', title: 'Fictional desk', body: 'A plant for the #work desk.', tags: ['home'], createdAt: stamp, archived: true},
    {id: 'c', kind: 'topic', title: 'Fictional diary', body: 'Secret fictional words #secret', createdAt: stamp, locked: true, photoId: 'p-9'}];
  test('tags nested with counts; the focus said; a locked note’s tags never', () => {
    const t = text(nova('which nested tags do my notes have', withNotes(notes, {focusTag: 'work'})));
    expect(t).toBe('Your notes use 2 tags, with 1 nested under them:\n• #home (1 note)\n• #work (2 notes)\n•   #work/meetings (1 note)\nNotes → Notes → Tags focuses Notes on one. Notes is focused on #work now.');
    expect(text(nova('welke geneste tags hebben mijn notities', withNotes(notes)))).toMatch(/^Je notities gebruiken 2 tags, met 1 eronder genest:\n• #home \(1 notitie\)/);
  });
  test('photos, words and archived notes: counts and names, never words', () => {
    expect(text(nova('which notes have photos', withNotes(notes)))).toBe('2 photos in 1 note: “Fictional standup” (2). A note holds up to eight; they stay on this device.');
    expect(text(nova('how many words are in my notes', withNotes(notes)))).toBe('Your notes hold 13 words in 2 notes, about 1 min to read (an estimate at 230 words a minute). The longest is “Fictional standup” (7 words). An open note’s Note info says its own.');
    expect(text(nova('which notes are archived', withNotes(notes)))).toBe('1 note is archived: “Fictional desk”. They are under Notes → Notes → Archived and still in Search.');
    for (const q of ['which nested tags do my notes have', 'which notes have photos', 'how many words are in my notes', 'which notes are archived']) expect(text(nova(q, withNotes(notes))), q).not.toMatch(/[Ss]ecret|diary|private words/);
  });
  test('empty notes teach where; ZIGi does not read notes', () => {
    expect(text(nova('what is my focus tag in notes', freshAll()))).toMatch(/^No note has a tag yet\./);
    expect(text(nova('which notes are archived', freshAll()))).toMatch(/^No note is archived\./);
    expect(text(zigi('which nested tags do my notes have', withNotes(notes)))).toMatch(/^ZIGi doesn’t read your notes\./);
  });
});
