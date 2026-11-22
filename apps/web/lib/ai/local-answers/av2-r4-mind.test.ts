import {describe, expect, test} from 'vitest';
import type {ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {CORPUS} from '../evals/as/cases';
import {AV2_R4_MIND} from '../evals/as/cases-av2-r4-mind';
import {av2R4MindAnswer} from './av2-r4-mind';
import type {LocalReply} from './engine';
import {addLocalDays} from '../../local-date';

/**
 * Session AV lane 2 (r4-mind): NOVA's and ZIGi's on-device answers to round 4's journal and mind features, in English and
 * Dutch, from the Showcase and a fresh profile; the journal only where shared, habits under their switch, feelings under
 * Health's gate; never an entry's words, never advice; and no question of the existing corpus is claimed, so wiring it
 * first in engine.ts moves nothing.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const nova = (q: string, s: ToolSources = showcaseAll()) => av2R4MindAnswer(q, novaEnv(s));
const zigi = (q: string, s: ToolSources = showcaseAll()) => av2R4MindAnswer(q, zigiEnv(s));
const AT = `${DAY}T08:00:00.000Z`, H = '11111111-1111-4111-8111-111111111111';
const withJournal = (entries: unknown[]): ToolSources => { const s = showcaseAll(); return {...s, journal: {...s.journal!, entries: entries as never}}; };
const withExtras = (extras: Record<string, unknown>): ToolSources => { const s = showcaseAll(); return {...s, ak: {...s.ak, habitExtras: {version: 1, ...extras}} as never}; };

describe('every corpus question gets its own answer, in its language, from NOVA and ZIGi', () => {
  for (const c of AV2_R4_MIND) test(c.id, () => {
    for (const [lang, questions] of [['en', c.en], ['nl', c.nl]] as const) for (const q of questions) for (const ask of [nova, zigi]) {
      const r = ask(q);
      expect(r, q).not.toBeNull();
      expect(r!.kind, q).toBe('answer');
      expect(text(r).length, q).toBeGreaterThan(20);
      for (const n of c.never ?? []) expect(text(r), q).not.toContain(n);
      if (lang === 'nl') expect(text(r), q).toMatch(/\b(?:je|jouw|er|nog|geen|staat|op|het|de|een|van|met|om|is|tot)\b/);
    }
    for (const q of [...c.en, ...c.nl]) expect(av2R4MindAnswer(q, novaEnv(freshAll())), q).not.toBeNull();
  });
  test('no question of the existing corpus is claimed', () => {
    // Session AV lane 2 (the lead added AV2_R4_MIND to CORPUS, deliberate): round 4 mind's own intents are its to answer;
    // every other intent of the corpus must still be left alone.
    const own = new Set(AV2_R4_MIND.map(c => c.id));
    const env = novaEnv(showcaseAll()), claimed = CORPUS.filter(c => !own.has(c.id)).flatMap(c => [...c.en, ...c.nl].filter(q => av2R4MindAnswer(q, env) !== null).map(q => `${c.id}: ${q}`));
    expect(claimed).toEqual([]);
  }, 60_000);
});
describe('the journal (LEDGER #308, #309, #310, #317)', () => {
  test('open tick boxes by day; favourites by day; never the words', () => {
    const s = withJournal([
      {id: 'a', date: addLocalDays(DAY, -1), text: 'Fictional packing:\n- [ ] passport\n- [x] tickets', createdAt: AT, star: true},
      {id: 'b', date: addLocalDays(DAY, -7), text: 'A fictional secret walk.', createdAt: AT},
    ]);
    expect(text(nova('which tick boxes are open in my journal', s))).toBe('1 open tick box in your journal, in the entries of Mon, Nov 16. Tick one with a tap in the list; the words it had are kept under Earlier versions.');
    expect(text(nova('which journal entries are my favourites', s))).toBe('1 favourite entry: Mon, Nov 16. Favourites above the Journal’s list shows them.');
    expect(text(nova('welke dagboekstukken zijn favoriet', s))).toMatch(/^1 favoriet stuk: ma 16 nov\./);
    const back = text(nova('what did I write a week ago', s));
    expect(back).toBe('On this day: a week ago (Tue, Nov 10). Open the Journal to read them; I don’t repeat your words here.');
    expect(back).not.toContain('secret');
    expect(text(nova('how many photos can a journal entry have', s))).toContain('Up to 12 photos an entry');
  });
  test('the journal closed to NOVA: its refusal', () => {
    const s = showcaseAll(); s.journal = null;
    expect(nova('which journal entries are my favourites', s)?.kind).toBe('refusal');
  });
});
describe('habits (LEDGER #323, #327)', () => {
  test('lines with their counts; sizes and the step on offer', () => {
    const habits = showcaseAll().habits.habits, first = habits[0]!;
    const s = withExtras({identities: [{id: 'id-mover01', text: 'I am someone who moves', habits: [first.id]}], stepUp: {[first.id]: {small: 'Two fictional minutes', now: 'small', card: true}}});
    const who = text(nova('show who I am becoming', s));
    expect(who).toMatch(/^Who you are becoming, counted from your own habits \(never a score\):\n• I am someone who moves — /);
    expect(text(nova('toon wie ik wil worden', s))).toMatch(/• I am someone who moves — (?:\d+ keer deze maand · \d+ keer deze week)$/);
    expect(text(nova('which habits are ready to step up', s))).toMatch(new RegExp(`^Now: ${first.title.replace(/[()]/g, '\\$&')}: Two fictional minutes\\.`));
    expect(text(nova('which habits are ready to step up', withExtras({stepUp: {[H]: {small: 'x'}}})))).toContain('No habit has a small version yet');
  });
});
describe('feelings (LEDGER #324, #325, #326), under Health’s gate', () => {
  test('a word’s meaning; choices, not advice; where it was felt, as counts', () => {
    expect(text(nova('what does restless mean'))).toBe('“restless”: can’t settle; the body wants to move. It is in high energy, unpleasant.');
    expect(text(nova('what can I do when I feel stressed'))).toBe('For “stressed”, the feeling words offer, if you like: Breathe for a minute, Check a thought and Step outside for a few minutes. Pick one or none; it is your choice, not advice.');
    const s = showcaseAll(); s.energy = {version: 1, days: {}, words: {[DAY]: {energy: 'high', pleasantness: 'unpleasant', word: 'tense', at: AT, body: [{area: 'shoulders', feel: 'tight'}]}}} as never;
    expect(text(nova('where do I feel stress in my body', s))).toBe('Where you noted your feelings, the last 90 days (counts only, no meaning read into them):\n• High energy, unpleasant: shoulders (1×), tight');
    expect(nova('where do I feel stress in my body', s, )?.kind).toBe('answer');
    expect(av2R4MindAnswer('where do I feel stress in my body', novaEnv(s, undefined, false))?.kind).toBe('refusal');
  });
  test('other questions are not these answers', () => {
    for (const q of ['what is my writing streak', 'which tasks are due today', 'log 500 ml water', 'what does my budget look like', 'which tick boxes are open in my notes', 'how many photos are in my journal']) expect(nova(q), q).toBeNull();
  });
});
